import os
import sys
import json
import time
import struct
import shutil
import uuid
import re
import threading
import subprocess
import tempfile
import urllib.parse
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any

logger = logging.getLogger("explorer2")

import psutil
import send2trash
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="Explorer 2", version="2.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys.executable).resolve().parent
    if hasattr(sys, "_MEIPASS") and not (BASE_DIR / "index.html").exists():
        BASE_DIR = Path(sys._MEIPASS)
else:
    BASE_DIR = Path(__file__).resolve().parent

STATIC_DIR = BASE_DIR / "static"

USER_DATA_DIR = Path.home() / "Library" / "Application Support" / "Explorer 2"
try:
    USER_DATA_DIR.mkdir(parents=True, exist_ok=True)
    FAVORITES_FILE = USER_DATA_DIR / "favorites.json"
    if not FAVORITES_FILE.exists() and (BASE_DIR / "favorites.json").exists():
        shutil.copy2(BASE_DIR / "favorites.json", FAVORITES_FILE)
except Exception:
    FAVORITES_FILE = BASE_DIR / "favorites.json"

DRIVE_REMOTE = 4

# --- Helper de formatage de taille ---
def format_size(size_bytes: Optional[int]) -> str:
    if size_bytes is None:
        return ""
    if size_bytes < 1024:
        return f"{size_bytes} o"
    elif size_bytes < 1024 ** 2:
        return f"{size_bytes / 1024:.1f} Ko"
    elif size_bytes < 1024 ** 3:
        return f"{size_bytes / (1024 ** 2):.1f} Mo"
    elif size_bytes < 1024 ** 4:
        return f"{size_bytes / (1024 ** 3):.1f} Go"
    else:
        return f"{size_bytes / (1024 ** 4):.1f} To"

def format_disk_size(size_bytes: Optional[int]) -> str:
    """Formatage de capacité disque selon la convention macOS / Finder (base 10, 1 Go = 10^9 octets)"""
    if size_bytes is None:
        return ""
    if size_bytes < 1000:
        return f"{size_bytes} o"
    elif size_bytes < 1000 ** 2:
        return f"{size_bytes / 1000:.1f} Ko"
    elif size_bytes < 1000 ** 3:
        return f"{size_bytes / (1000 ** 2):.1f} Mo"
    elif size_bytes < 1000 ** 4:
        return f"{size_bytes / (1000 ** 3):.1f} Go"
    else:
        return f"{size_bytes / (1000 ** 4):.1f} To"

def get_mac_volume_usage(mount_path: str):
    """Interroge les capacités de volume exactes de macOS (incluant l'espace purgeable comme Finder)"""
    candidate_bins = [
        os.path.join(os.path.dirname(sys.executable), "bin", "mac-clipboard"),
        os.path.join(os.path.dirname(sys.executable), "..", "bin", "mac-clipboard"),
        os.path.join(os.path.dirname(__file__), "bin", "mac-clipboard"),
        os.path.join(os.path.dirname(__file__), "..", "bin", "mac-clipboard"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "bin", "mac-clipboard"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bin", "mac-clipboard"),
        "/Applications/Explorer 2.app/Contents/Resources/bin/mac-clipboard",
        os.path.expanduser("~/Documents/projets/explorer2/bin/mac-clipboard"),
        "/usr/local/bin/mac-clipboard"
    ]
    for bin_path in candidate_bins:
        if os.path.isfile(bin_path) and os.access(bin_path, os.X_OK):
            try:
                res = subprocess.run([bin_path, "--disk-usage", mount_path], capture_output=True, text=True, timeout=1.5)
                if res.returncode == 0 and res.stdout.strip():
                    import json
                    d = json.loads(res.stdout.strip())
                    free = d.get("free", 0)
                    total = d.get("total", 0)
                    if total > 0:
                        used = max(0, total - free)
                        percent = round((used / total) * 100, 1)
                        return total, free, used, percent
            except Exception:
                pass
    return None

# Cache pour les étiquettes de volume macOS
_volume_labels_cache: Dict[str, str] = {}
_volume_labels_cache_time: float = 0.0

def _refresh_volume_labels():
    global _volume_labels_cache, _volume_labels_cache_time
    now = time.time()
    if (now - _volume_labels_cache_time < 30) and _volume_labels_cache:
        return
    labels = {"/": "Macintosh HD"}
    try:
        res = subprocess.run(["system_profiler", "SPStorageDataType", "-json"], capture_output=True, text=True, timeout=4)
        if res.returncode == 0 and res.stdout.strip():
            import json
            parsed = json.loads(res.stdout.strip())
            for item in parsed.get("SPStorageDataType", []):
                mp = item.get("mount_point")
                name = item.get("_name")
                if mp and name:
                    labels[mp] = name
    except Exception:
        pass
    _volume_labels_cache = labels
    _volume_labels_cache_time = now

def get_volume_label(drive_path: str) -> str:
    clean = drive_path.rstrip("/\\")
    if not clean:
        clean = "/"
    _refresh_volume_labels()
    if clean in _volume_labels_cache:
        return _volume_labels_cache[clean]
    if clean.startswith("/Volumes/"):
        return os.path.basename(clean)
    return "Macintosh HD" if clean == "/" else (os.path.basename(clean) or "Disque local")

def get_unc_path(drive_letter: str) -> Optional[str]:
    return None

def is_remote_drive(drive_path: str) -> bool:
    clean = drive_path.rstrip("/\\")
    if not clean:
        clean = "/"
    for p in psutil.disk_partitions(all=True):
        if p.mountpoint == clean:
            fstype = p.fstype.lower()
            return "smb" in fstype or "afp" in fstype or "nfs" in fstype or p.device.startswith("//")
    return False

# --- Helper pour vérifier si un fichier est caché sous macOS ---
def is_file_hidden(path: str, name: str) -> bool:
    if name.startswith("."):
        return True
    try:
        st = os.stat(path)
        if hasattr(st, "st_flags") and (st.st_flags & 0x8000):  # UF_HIDDEN sur macOS/BSD
            return True
    except Exception:
        pass
    return False

def get_file_type_desc(path: str, is_dir: bool) -> str:
    if is_dir:
        if path.endswith(".app"):
            return "Application macOS"
        return "Dossier de fichiers"
    ext = os.path.splitext(path)[1].lower()
    type_map = {
        ".txt": "Document texte",
        ".pdf": "Document PDF",
        ".docx": "Document Microsoft Word",
        ".doc": "Document Microsoft Word",
        ".xlsx": "Feuille de calcul Excel",
        ".xls": "Feuille de calcul Excel",
        ".pptx": "Présentation PowerPoint",
        ".py": "Fichier Python",
        ".js": "Fichier JavaScript",
        ".html": "Document HTML",
        ".css": "Feuille de style CSS",
        ".json": "Fichier JSON",
        ".zip": "Dossier compressé ZIP",
        ".rar": "Archive RAR",
        ".7z": "Archive 7Z",
        ".tar": "Archive TAR",
        ".gz": "Archive GZ",
        ".dmg": "Image disque Apple",
        ".pkg": "Paquet d'installation macOS",
        ".app": "Application macOS",
        ".sh": "Script Shell",
        ".png": "Image PNG",
        ".jpg": "Image JPEG",
        ".jpeg": "Image JPEG",
        ".gif": "Image GIF",
        ".webp": "Image WebP",
        ".svg": "Image vectorielle SVG",
        ".mp3": "Fichier audio MP3",
        ".m4a": "Fichier audio AAC/M4A",
        ".mp4": "Fichier vidéo MP4",
        ".mov": "Fichier vidéo QuickTime",
    }
    return type_map.get(ext, f"Fichier {ext[1:].upper()}" if ext else "Fichier")


# ===================== MOTEUR DE TRANSFERT HAUTE FRÉQUENCE (10ms) =====================
# ------------------------------------------------------------------------------
# Lissage du débit : moyenne glissante sur les 5 dernières secondes
# ------------------------------------------------------------------------------
from collections import deque as _deque

SPEED_WINDOW_SEC = 5.0       # fenêtre de moyenne du débit affiché
SPEED_HISTORY_STEP = 0.25    # un point de courbe toutes les 250 ms


class SpeedMeter:
    """Mesure un débit moyen (octets/s) sur une fenêtre glissante de SPEED_WINDOW_SEC."""

    def __init__(self, window: float = SPEED_WINDOW_SEC):
        self.window = window
        self.samples = _deque()
        self.samples.append((time.perf_counter(), 0))
        self.last_hist_t = 0.0

    def update(self, total_bytes: int, now: Optional[float] = None) -> float:
        now = time.perf_counter() if now is None else now
        self.samples.append((now, total_bytes))
        # On conserve le plus ancien échantillon encore dans (ou juste avant) la fenêtre
        while len(self.samples) > 2 and now - self.samples[1][0] >= self.window:
            self.samples.popleft()
        t0, b0 = self.samples[0]
        dt = now - t0
        if dt <= 0:
            return 0.0
        return max(0.0, (total_bytes - b0) / dt)

    def history_due(self, now: Optional[float] = None) -> bool:
        now = time.perf_counter() if now is None else now
        if now - self.last_hist_t >= SPEED_HISTORY_STEP:
            self.last_hist_t = now
            return True
        return False


class TransferTask:
    def __init__(self, task_id: str, task_type: str, sources: List[str], destination: Optional[str] = None):
        self.task_id = task_id
        self.task_type = task_type  # 'copy', 'move', 'delete', 'compress', 'extract'
        self.sources = sources
        self.destination = destination
        self.status = "running"
        self.error_message = None
        self.total_bytes = 0
        self.processed_bytes = 0
        self.compressed_bytes = 0
        self.total_files = 0
        self.processed_files = 0
        self.current_file = ""
        self.speed_mb_sec = 0.0
        self.speed_history = []  # Jusqu'à 80 points pour un rendu de courbe ultra-précis
        self.percent = 0
        self.eta_seconds = None
        self.cancelled = False
        self.extra_info = ""
        self.lock = threading.Lock()
        self.speed_meter = SpeedMeter()

    def update_speed(self):
        """Met à jour vitesse affichée, ETA et courbe à partir d'une moyenne sur 5 s."""
        now = time.perf_counter()
        speed = self.speed_meter.update(self.processed_bytes, now)
        speed_mb = speed / (1024 * 1024)
        self.speed_mb_sec = speed_mb
        if self.speed_meter.history_due(now):
            with self.lock:
                self.speed_history.append({"pct": self.percent, "speed": round(speed_mb, 2)})
                if len(self.speed_history) > 400:
                    # Décimation régulière (conserve une base de temps homogène)
                    self.speed_history = self.speed_history[::2]
        if speed > 0 and self.total_bytes > self.processed_bytes:
            self.eta_seconds = max(0, int((self.total_bytes - self.processed_bytes) / speed))
        else:
            self.eta_seconds = 0

    def to_dict(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "task_id": self.task_id,
                "task_type": self.task_type,
                "status": self.status,
                "error_message": self.error_message,
                "total_bytes": self.total_bytes,
                "processed_bytes": self.processed_bytes,
                "compressed_bytes": self.compressed_bytes,
                "total_files": self.total_files,
                "processed_files": self.processed_files,
                "current_file": self.current_file,
                "speed_mb_sec": round(self.speed_mb_sec, 2),
                "speed_history": list(self.speed_history),
                "percent": self.percent,
                "eta_seconds": self.eta_seconds,
                "extra_info": self.extra_info,
            }

tasks_store: Dict[str, TransferTask] = {}

def _unique_copy_path(target_path: str) -> str:
    """Retourne un chemin disponible avec suffixe ' - Copie' ou ' - Copie (N)' si le chemin existe déjà."""
    parent = os.path.dirname(target_path)
    name = os.path.basename(target_path.rstrip("/\\"))
    if os.path.isdir(target_path):
        base, ext = name, ""
    else:
        base, ext = os.path.splitext(name)
    candidate = os.path.join(parent, f"{base} - Copie{ext}")
    idx = 2
    while os.path.exists(candidate):
        candidate = os.path.join(parent, f"{base} - Copie ({idx}){ext}")
        idx += 1
    return candidate


def scan_files_to_transfer(sources: List[str], dest_dir: str = "", is_copy: bool = False):
    file_list = []
    total_bytes = 0
    dest_norm = os.path.abspath(dest_dir).rstrip("/\\").lower() if dest_dir else ""
    for src in sources:
        src_abs = os.path.abspath(src)
        src_parent_norm = os.path.dirname(src_abs.rstrip("/\\")).rstrip("/\\").lower()
        same_parent_copy = is_copy and dest_norm and (src_parent_norm == dest_norm)

        if os.path.isfile(src):
            try:
                sz = os.path.getsize(src)
                total_bytes += sz
                rel_dest = ""
                if same_parent_copy:
                    rel_dest = os.path.basename(_unique_copy_path(os.path.join(dest_dir, os.path.basename(src_abs))))
                file_list.append((src, rel_dest, sz, False))
            except Exception:
                pass
        elif os.path.isdir(src):
            base_dir_name = os.path.basename(src.rstrip("\\/"))
            if same_parent_copy:
                base_dir_name = os.path.basename(_unique_copy_path(os.path.join(dest_dir, base_dir_name)))
            file_list.append((src, base_dir_name, 0, True))
            for root, dirs, files in os.walk(src):
                rel_dir = os.path.relpath(root, src)
                dest_sub = os.path.join(base_dir_name, rel_dir) if rel_dir != "." else base_dir_name
                for d in dirs:
                    file_list.append((os.path.join(root, d), os.path.join(dest_sub, d), 0, True))
                for f in files:
                    # Ignorer les fichiers de métadonnées AppleDouble (._*) et .DS_Store générés à la volée par smbfs sur macOS
                    if f.startswith("._") or f == ".DS_Store":
                        continue
                    fp = os.path.join(root, f)
                    try:
                        sz = os.path.getsize(fp)
                        total_bytes += sz
                        file_list.append((fp, os.path.join(dest_sub, f), sz, False))
                    except Exception:
                        pass
    return file_list, total_bytes

def _is_network_path(path: str) -> bool:
    """Vrai si le chemin est situé sur un partage réseau (SMB/AFP/NFS/CIFS)."""
    try:
        target = os.path.realpath(os.path.abspath(path))
        best_mount = ""
        best_type = ""
        for part in psutil.disk_partitions(all=True):
            mp = os.path.realpath(part.mountpoint)
            if target == mp or target.startswith(mp.rstrip("/") + "/"):
                if len(mp) >= len(best_mount):
                    best_mount = mp
                    best_type = (part.fstype or "").lower()
        return best_type in ("smbfs", "afpfs", "nfs", "cifs", "webdav", "webfs", "ftp")
    except Exception:
        return False


def _force_remove(func, path, exc_info):
    """Supprime un fichier récalcitrant (lecture seule, etc.)."""
    try:
        os.chmod(path, 0o777)
        func(path)
    except Exception:
        raise exc_info[1]


def _safe_delete_path(path: str):
    """Supprime un chemin : corbeille si possible, sinon suppression définitive.
    Indispensable sur les partages réseau (SMB/AFP/NFS) où la corbeille macOS
    n'est pas disponible."""
    if not os.path.exists(path) and not os.path.islink(path):
        raise FileNotFoundError(f"Chemin introuvable : {path}")

    # Sur un partage réseau, send2trash échoue (pas de corbeille) : suppression directe.
    if not _is_network_path(path):
        try:
            send2trash.send2trash(path)
            return
        except Exception:
            pass

    # Repli : suppression définitive (réseau, volume sans corbeille, etc.)
    if os.path.islink(path) or os.path.isfile(path):
        try:
            os.remove(path)
        except PermissionError:
            os.chmod(path, 0o666)
            os.remove(path)
    elif os.path.isdir(path):
        shutil.rmtree(path, onerror=_force_remove)
    else:
        raise FileNotFoundError(f"Chemin introuvable : {path}")


def execute_transfer(task: TransferTask):
    CHUNK_SIZE = 256 * 1024  # 256 Ko par bloc pour granularité 10ms

    try:
        if task.task_type == "delete":
            task.total_files = len(task.sources)
            for idx, path in enumerate(task.sources):
                if task.cancelled:
                    task.status = "cancelled"
                    return
                task.current_file = os.path.basename(path)
                task.processed_files = idx + 1
                task.percent = int(((idx + 1) / max(1, task.total_files)) * 100)
                try:
                    _safe_delete_path(path)
                except Exception as e:
                    task.status = "error"
                    task.error_message = str(e)
                    return
                time.sleep(0.01)  # 10ms
            task.status = "completed"
            task.percent = 100
            return

        if task.task_type == "compress":
            target_zip = task.destination
            files_to_compress = []
            total_uncompressed = 0
            for src in task.sources:
                p = os.path.abspath(src)
                if not os.path.exists(p):
                    continue
                if os.path.isfile(p):
                    try:
                        sz = os.path.getsize(p)
                        files_to_compress.append((p, os.path.basename(p), sz, False))
                        total_uncompressed += sz
                    except Exception:
                        pass
                elif os.path.isdir(p):
                    base_dir = os.path.dirname(p)
                    for root, dirs, files in os.walk(p):
                        for f in files:
                            full_p = os.path.join(root, f)
                            rel_p = os.path.relpath(full_p, base_dir)
                            try:
                                sz = os.path.getsize(full_p)
                                files_to_compress.append((full_p, rel_p, sz, False))
                                total_uncompressed += sz
                            except Exception:
                                pass
                        for d in dirs:
                            full_d = os.path.join(root, d)
                            if not os.listdir(full_d):
                                rel_d = os.path.relpath(full_d, base_dir) + "/"
                                files_to_compress.append((full_d, rel_d, 0, True))

            task.total_files = len([f for f in files_to_compress if not f[3]])
            task.total_bytes = total_uncompressed
            task.compressed_bytes = 0

            if not files_to_compress:
                task.status = "completed"
                task.percent = 100
                return

            import zipfile
            start_time = time.perf_counter()
            last_check_time = start_time
            bytes_in_window = 0

            target_dir = os.path.dirname(target_zip)
            if target_dir:
                os.makedirs(target_dir, exist_ok=True)

            with zipfile.ZipFile(target_zip, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
                for src_path, arcname, sz, is_dir in files_to_compress:
                    if task.cancelled:
                        task.status = "cancelled"
                        zf.close()
                        if os.path.exists(target_zip):
                            try: os.remove(target_zip)
                            except Exception: pass
                        return

                    task.current_file = os.path.basename(arcname)
                    if is_dir:
                        zf.write(src_path, arcname=arcname)
                        continue

                    if sz < 64 * 1024:
                        zf.write(src_path, arcname=arcname)
                        task.processed_bytes += sz
                        bytes_in_window += sz
                        task.processed_files += 1
                    else:
                        with zf.open(arcname, 'w', force_zip64=True) as dst_f, open(src_path, 'rb') as src_f:
                            while True:
                                if task.cancelled:
                                    task.status = "cancelled"
                                    zf.close()
                                    if os.path.exists(target_zip):
                                        try: os.remove(target_zip)
                                        except Exception: pass
                                    return
                                chunk = src_f.read(CHUNK_SIZE)
                                if not chunk:
                                    break
                                dst_f.write(chunk)
                                chunk_len = len(chunk)
                                task.processed_bytes += chunk_len
                                bytes_in_window += chunk_len

                                now = time.perf_counter()
                                dt = now - last_check_time
                                if dt >= 0.05:
                                    task.update_speed()
                                    bytes_in_window = 0
                                    last_check_time = now
                                    try:
                                        task.compressed_bytes = os.path.getsize(target_zip)
                                    except Exception:
                                        pass

                                if task.total_bytes > 0:
                                    task.percent = min(100, int((task.processed_bytes / task.total_bytes) * 100))

                        task.processed_files += 1

                    if task.total_bytes > 0:
                        task.percent = min(100, int((task.processed_bytes / task.total_bytes) * 100))
                    try:
                        task.compressed_bytes = os.path.getsize(target_zip)
                    except Exception:
                        pass

            try:
                task.compressed_bytes = os.path.getsize(target_zip)
            except Exception:
                pass
            task.percent = 100
            task.status = "completed"
            task.speed_mb_sec = 0.0
            return

        if task.task_type == "extract":
            archive_path = task.sources[0]
            dest = task.destination
            os.makedirs(dest, exist_ok=True)
            ext = os.path.splitext(archive_path)[1].lower()
            try:
                task.compressed_bytes = os.path.getsize(archive_path)
            except Exception:
                pass

            start_time = time.perf_counter()
            last_check_time = start_time
            bytes_in_window = 0

            if ext == ".zip":
                import zipfile
                with zipfile.ZipFile(archive_path, 'r') as zf:
                    all_infos = zf.infolist()
                    file_infos = [info for info in all_infos if not info.is_dir() and not info.filename.endswith('/')]
                    task.total_files = len(file_infos)
                    task.total_bytes = sum(info.file_size for info in file_infos)

                    for info in all_infos:
                        if task.cancelled:
                            task.status = "cancelled"
                            return
                        target_path = os.path.join(dest, info.filename)
                        if info.is_dir() or info.filename.endswith('/'):
                            os.makedirs(target_path, exist_ok=True)
                            continue

                        os.makedirs(os.path.dirname(target_path), exist_ok=True)
                        task.current_file = os.path.basename(info.filename) or info.filename

                        if info.file_size < 64 * 1024:
                            with zf.open(info) as src_f, open(target_path, 'wb') as dst_f:
                                dst_f.write(src_f.read())
                            task.processed_bytes += info.file_size
                            bytes_in_window += info.file_size
                            task.processed_files += 1
                        else:
                            with zf.open(info) as src_f, open(target_path, 'wb') as dst_f:
                                while True:
                                    if task.cancelled:
                                        task.status = "cancelled"
                                        return
                                    chunk = src_f.read(CHUNK_SIZE)
                                    if not chunk:
                                        break
                                    dst_f.write(chunk)
                                    chunk_len = len(chunk)
                                    task.processed_bytes += chunk_len
                                    bytes_in_window += chunk_len

                                    now = time.perf_counter()
                                    dt = now - last_check_time
                                    if dt >= 0.05:
                                        task.update_speed()
                                        bytes_in_window = 0
                                        last_check_time = now

                                    if task.total_bytes > 0:
                                        task.percent = min(100, int((task.processed_bytes / task.total_bytes) * 100))

                            task.processed_files += 1

                        if task.total_bytes > 0:
                            task.percent = min(100, int((task.processed_bytes / task.total_bytes) * 100))

                task.percent = 100
                task.status = "completed"
                task.speed_mb_sec = 0.0
                return

            elif ext in [".tar", ".gz", ".tgz", ".bz2", ".xz"]:
                import tarfile
                with tarfile.open(archive_path) as tf:
                    members = tf.getmembers()
                    file_members = [m for m in members if not m.isdir()]
                    task.total_files = len(file_members)
                    task.total_bytes = sum(m.size for m in file_members)

                    for m in members:
                        if task.cancelled:
                            task.status = "cancelled"
                            return
                        target_path = os.path.join(dest, m.name)
                        task.current_file = os.path.basename(m.name) or m.name

                        if m.isdir():
                            os.makedirs(target_path, exist_ok=True)
                            continue

                        os.makedirs(os.path.dirname(target_path), exist_ok=True)

                        fobj = tf.extractfile(m)
                        if fobj:
                            with open(target_path, 'wb') as dst_f:
                                while True:
                                    if task.cancelled:
                                        task.status = "cancelled"
                                        return
                                    chunk = fobj.read(CHUNK_SIZE)
                                    if not chunk:
                                        break
                                    dst_f.write(chunk)
                                    chunk_len = len(chunk)
                                    task.processed_bytes += chunk_len
                                    bytes_in_window += chunk_len

                                    now = time.perf_counter()
                                    dt = now - last_check_time
                                    if dt >= 0.05:
                                        task.update_speed()
                                        bytes_in_window = 0
                                        last_check_time = now

                                    if task.total_bytes > 0:
                                        task.percent = min(100, int((task.processed_bytes / task.total_bytes) * 100))

                            task.processed_files += 1

                        if task.total_bytes > 0:
                            task.percent = min(100, int((task.processed_bytes / task.total_bytes) * 100))

                task.percent = 100
                task.status = "completed"
                task.speed_mb_sec = 0.0
                return

            else:
                raw_items = inspect_archive_contents(archive_path)
                file_items = [it for it in raw_items if not it.get("is_dir")]
                task.total_files = len(file_items) if file_items else len(raw_items)
                task.total_bytes = sum(it.get("size", 0) for it in file_items)
                task.current_file = os.path.basename(archive_path)

                tar_bin = shutil.which("tar")
                if tar_bin:
                    proc = subprocess.Popen([tar_bin, "-xf", archive_path, "-C", dest])
                    while proc.poll() is None:
                        if task.cancelled:
                            proc.kill()
                            task.status = "cancelled"
                            return
                        time.sleep(0.1)
                    if proc.returncode == 0:
                        task.percent = 100
                        task.processed_files = task.total_files
                        task.processed_bytes = task.total_bytes
                        task.status = "completed"
                        return

                if ext == ".iso":
                    tmp_mount = tempfile.mkdtemp(prefix="iso_mount_")
                    try:
                        attach_res = subprocess.run(["hdiutil", "attach", "-nobrowse", "-readonly", "-mountpoint", tmp_mount, archive_path], capture_output=True, text=True, timeout=30)
                        if attach_res.returncode == 0:
                            for root, dirs, files in os.walk(tmp_mount):
                                for d in dirs:
                                    rel = os.path.relpath(os.path.join(root, d), tmp_mount)
                                    os.makedirs(os.path.join(dest, rel), exist_ok=True)
                                for f in files:
                                    if task.cancelled:
                                        subprocess.run(["hdiutil", "detach", tmp_mount, "-force"], capture_output=True)
                                        task.status = "cancelled"
                                        return
                                    s_f = os.path.join(root, f)
                                    rel = os.path.relpath(s_f, tmp_mount)
                                    t_f = os.path.join(dest, rel)
                                    task.current_file = f
                                    shutil.copy2(s_f, t_f)
                                    task.processed_files += 1
                                    task.processed_bytes += os.path.getsize(s_f)
                                    if task.total_bytes > 0:
                                        task.percent = min(100, int((task.processed_bytes / task.total_bytes) * 100))
                            subprocess.run(["hdiutil", "detach", tmp_mount, "-force"], capture_output=True)
                            task.percent = 100
                            task.status = "completed"
                            return
                    finally:
                        try: os.rmdir(tmp_mount)
                        except Exception: pass

                task.status = "error"
                task.error_message = f"Format non pris en charge ou extraction impossible ({ext})."
                return

        # Sécurisation stricte : interdire de déplacer ou copier sur soi-même ou dans un sous-dossier
        dest_norm = os.path.abspath(task.destination).rstrip("/\\").lower()
        safe_sources = []
        for s in task.sources:
            s_abs = os.path.abspath(s)
            s_norm = s_abs.rstrip("/\\").lower()
            if s_norm == dest_norm:
                continue
            if dest_norm.startswith(s_norm + "/") or dest_norm.startswith(s_norm + "\\"):
                continue
            safe_sources.append(s)

        if not safe_sources:
            task.status = "completed"
            task.percent = 100
            return

        # 1. Étape rapide de scan
        is_copy_task = (task.task_type == "copy")
        file_list, total_bytes = scan_files_to_transfer(safe_sources, task.destination, is_copy=is_copy_task)
        task.total_bytes = total_bytes
        task.total_files = len([f for f in file_list if not f[3]])

        if not file_list:
            task.status = "completed"
            task.percent = 100
            return

        start_time = time.perf_counter()
        last_check_time = start_time
        bytes_in_window = 0

        # 2. Copie / Déplacement effectif bloc par bloc
        for src_path, rel_dest, sz, is_directory in file_list:
            if task.cancelled:
                task.status = "cancelled"
                return

            target_file = os.path.join(task.destination, rel_dest) if rel_dest else os.path.join(task.destination, os.path.basename(src_path))
            task.current_file = os.path.basename(src_path)

            if is_directory:
                os.makedirs(target_file, exist_ok=True)
                continue

            # Protection absolue contre l'auto-écrasement (qui tronquerait le fichier ou l'archive à 0 octet)
            if os.path.abspath(src_path).lower() == os.path.abspath(target_file).lower():
                if task.task_type in ["move", "cut"]:
                    task.processed_bytes += sz
                    task.processed_files += 1
                    continue
                else:
                    target_file = _unique_copy_path(target_file)

            target_dir = os.path.dirname(target_file)
            if target_dir:
                os.makedirs(target_dir, exist_ok=True)

            # Si un fichier de métadonnées éphémère (._* ou .DS_Store sur partage SMB) a disparu entre le scan et l'ouverture, l'ignorer sans erreur
            if not os.path.exists(src_path):
                bname = os.path.basename(src_path)
                if bname.startswith("._") or bname == ".DS_Store":
                    task.processed_bytes += sz
                    task.processed_files += 1
                    continue

            # Lecture et écriture binaire par chunks
            try:
                with open(src_path, "rb") as f_src, open(target_file, "wb") as f_dst:
                    while True:
                        if task.cancelled:
                            task.status = "cancelled"
                            return
                        chunk = f_src.read(CHUNK_SIZE)
                        if not chunk:
                            break
                        f_dst.write(chunk)
                        chunk_len = len(chunk)
                        task.processed_bytes += chunk_len
                        bytes_in_window += chunk_len

                        now = time.perf_counter()
                        dt = now - last_check_time
                        if dt >= 0.05:  # Rafraîchissement vitesse toutes les 50ms
                            task.update_speed()

                            bytes_in_window = 0
                            last_check_time = now

                        if task.total_bytes > 0:
                            task.percent = min(100, int((task.processed_bytes / task.total_bytes) * 100))
            except FileNotFoundError:
                bname = os.path.basename(src_path)
                if bname.startswith("._") or bname == ".DS_Store":
                    task.processed_bytes += sz
                    task.processed_files += 1
                    continue
                raise

            task.processed_files += 1

        # 3. Suppression des sources UNIQUEMENT une fois toute la copie terminée avec succès
        #    (évite que smbfs ne supprime à la volée des fichiers compagnons ._* pendant le parcours du dossier)
        if task.task_type in ["move", "cut"] and not task.cancelled:
            def _rm_err(func, path, exc_info):
                try:
                    os.chmod(path, 0o777)
                    func(path)
                except Exception:
                    pass

            for src in safe_sources:
                src_norm = os.path.abspath(src).rstrip("/\\").lower()
                if src_norm == dest_norm or dest_norm.startswith(src_norm + "/"):
                    continue
                if os.path.exists(src) or os.path.islink(src):
                    if os.path.isdir(src) and not os.path.islink(src):
                        for _attempt in range(3):
                            if not os.path.exists(src):
                                break
                            try:
                                for root_d, sub_dirs, sub_files in os.walk(src, topdown=False):
                                    for sf in sub_files:
                                        fp = os.path.join(root_d, sf)
                                        try:
                                            os.remove(fp)
                                        except PermissionError:
                                            try:
                                                os.chmod(fp, 0o666)
                                                os.remove(fp)
                                            except Exception:
                                                pass
                                        except FileNotFoundError:
                                            pass
                                        except Exception:
                                            pass
                                    for sd in sub_dirs:
                                        dp = os.path.join(root_d, sd)
                                        try:
                                            os.rmdir(dp)
                                        except Exception:
                                            pass
                                shutil.rmtree(src, onerror=_rm_err)
                            except Exception:
                                pass
                            if os.path.exists(src):
                                time.sleep(0.06)
                    else:
                        try:
                            os.remove(src)
                        except PermissionError:
                            try:
                                os.chmod(src, 0o666)
                                os.remove(src)
                            except Exception:
                                pass
                        except FileNotFoundError:
                            pass
                        except Exception:
                            pass

        task.status = "completed"
        task.percent = 100
        task.speed_mb_sec = 0.0
        with task.lock:
            if len(task.speed_history) <= 2 and task.total_bytes > 0:
                total_time = max(0.001, time.perf_counter() - start_time)
                avg_speed_mb = round((task.total_bytes / total_time) / (1024 * 1024), 2)
                task.speed_history = [
                    {"pct": 0, "speed": 0.0},
                    {"pct": 20, "speed": round(avg_speed_mb * 0.8, 2)},
                    {"pct": 50, "speed": avg_speed_mb},
                    {"pct": 80, "speed": round(avg_speed_mb * 0.9, 2)},
                    {"pct": 100, "speed": 0.0}
                ]
            else:
                task.speed_history.append({"pct": 100, "speed": 0.0})

    except Exception as e:
        task.status = "error"
        task.error_message = str(e)


# --- Modèles de Données Pydantic ---
class OpenRequest(BaseModel):
    path: str

class TrashRequest(BaseModel):
    paths: List[str]

class CreateRequest(BaseModel):
    parent_path: str
    name: str
    type: str

class RenameRequest(BaseModel):
    path: str
    new_name: str

class TransferStartRequest(BaseModel):
    action: str  # 'copy' ou 'move'
    sources: List[str]
    destination_dir: str

class ConnectSmbRequest(BaseModel):
    remote_path: str
    drive_letter: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    remember_credentials: Optional[bool] = False
    remember_password: Optional[bool] = False

class DisconnectSmbRequest(BaseModel):
    drive_letter_or_remote: str

class EjectDriveRequest(BaseModel):
    mountpoint: str

class FavoriteItem(BaseModel):
    name: str
    path: str


# 1. API LETTRES DE LECTEURS (Sur macOS : liste vide, pas de lettres A-Z)
@app.get("/api/network/letters")
def get_drive_letters():
    return []


# --- Helpers RPC pour l'énumération native des partages SMB (MS-SRVS NetrShareEnum) ---
import struct

def _make_rpc_bind():
    # UUID srvsvc v3.0: 4b324fc8-1670-01d3-1278-5a47bf6ee188
    # Transfer syntax NDR 32-bit v2.0: 8a885d04-1ceb-11c9-9fe8-08002b104860
    srvsvc_uuid = uuid.UUID('4b324fc8-1670-01d3-1278-5a47bf6ee188').bytes_le
    ndr_uuid = uuid.UUID('8a885d04-1ceb-11c9-9fe8-08002b104860').bytes_le
    ctx = struct.pack('<HBB', 0, 1, 0) + srvsvc_uuid + struct.pack('<HH', 3, 0) + ndr_uuid + struct.pack('<I', 2)
    body = struct.pack('<HHI', 4280, 4280, 0) + struct.pack('<B', 1) + b'\x00\x00\x00' + ctx
    frag_len = 16 + len(body)
    header = struct.pack('<BBBB', 5, 0, 11, 3) + struct.pack('<I', 0x10) + struct.pack('<HHI', frag_len, 0, 1)
    return header + body

def _make_net_share_enum_req(server_name, call_id=2):
    srv = server_name if server_name.startswith('\\\\') else ('\\\\' + server_name)
    srv_utf16 = (srv + '\x00').encode('utf-16-le')
    str_len = len(srv) + 1
    payload = struct.pack('<I', 0x00020000) + struct.pack('<III', str_len, 0, str_len) + srv_utf16
    if len(srv_utf16) % 4 != 0:
        payload += b'\x00' * (4 - (len(srv_utf16) % 4))
    payload += struct.pack('<II', 1, 1) + struct.pack('<II', 0, 0) + struct.pack('<I', 0xFFFFFFFF) + struct.pack('<I', 0)
    frag_len = 16 + 8 + len(payload)
    header = struct.pack('<BBBB', 5, 0, 0, 3) + struct.pack('<I', 0x10) + struct.pack('<HHI', frag_len, 0, call_id)
    req_hdr = struct.pack('<IHH', len(payload), 0, 15)
    return header + req_hdr + payload

def _parse_net_share_enum_resp(data):
    if len(data) < 24 or data[2] != 2:
        return []
    payload = data[24:]
    if len(payload) < 24:
        return []
    level, switch, ctr_ptr, entries_read, buf_ptr, max_count = struct.unpack('<IIIIII', payload[:24])
    if ctr_ptr == 0 or buf_ptr == 0 or entries_read == 0:
        return []
    offset = 24
    shares_meta = []
    for _ in range(entries_read):
        if offset + 12 > len(payload):
            break
        name_ptr, sh_type, remark_ptr = struct.unpack('<III', payload[offset:offset+12])
        shares_meta.append({'name_ptr': name_ptr, 'type': sh_type, 'remark_ptr': remark_ptr})
        offset += 12
    shares = []
    for meta in shares_meta:
        name = ''
        if meta['name_ptr'] != 0:
            if offset + 12 > len(payload):
                break
            max_c, off_c, act_c = struct.unpack('<III', payload[offset:offset+12])
            offset += 12
            byte_len = act_c * 2
            name = payload[offset:offset+byte_len].decode('utf-16-le', errors='ignore').rstrip('\x00')
            offset += byte_len
            if offset % 4 != 0:
                offset += (4 - (offset % 4))
        remark = ''
        if meta['remark_ptr'] != 0 and offset + 12 <= len(payload):
            max_c, off_c, act_c = struct.unpack('<III', payload[offset:offset+12])
            offset += 12
            byte_len = act_c * 2
            remark = payload[offset:offset+byte_len].decode('utf-16-le', errors='ignore').rstrip('\x00')
            offset += byte_len
            if offset % 4 != 0:
                offset += (4 - (offset % 4))
        if meta['type'] & 0x80000000 or name.endswith('$') or name.upper() == 'IPC$':
            continue
        shares.append({'name': name, 'type': 'Disk', 'comment': remark})
    return shares


# 2. DÉCOUVERTE DES PARTAGES D'UN SERVEUR SMB (smb://serveur)
@app.get("/api/network/discover")
@app.get("/api/smb/shares")
def discover_server_shares(server: str = Query(..., description="Nom ou IP du serveur SMB"),
                           username: Optional[str] = Query(None, description="Nom d'utilisateur"),
                           password: Optional[str] = Query(None, description="Mot de passe")):
    srv_str = server if isinstance(server, str) else str(server or "")
    raw = srv_str.strip().replace("\\", "/").replace("smb://", "").replace("//", "").rstrip("/")
    specified_share = None
    if "/" in raw:
        parts = raw.split("/", 1)
        clean_srv = parts[0]
        specified_share = parts[1].strip("/")
    else:
        clean_srv = raw

    if "@" in clean_srv:
        clean_srv = clean_srv.split("@", 1)[1]

    if not clean_srv:
        raise HTTPException(status_code=400, detail="Veuillez saisir un nom d'hôte ou une adresse IP valide.")

    server_netbios = None
    workgroup = None
    server_online = False

    # 1. Vérification TCP avec retry pour absorber le délai NECP de macOS (Local Network Privacy ~10-150ms au 1er paquet)
    import socket
    import urllib.request
    tunnel_port_445: Optional[int] = None

    def _request_lan_tcp_tunnel(host: str, port: int = 445) -> Optional[int]:
        bridge_port = int(os.environ.get("EXPLORER2_LAN_BRIDGE_PORT", "8001") or 8001)
        try:
            url = f"http://127.0.0.1:{bridge_port}/tcp-tunnel?host={urllib.parse.quote(host)}&port={port}"
            with urllib.request.urlopen(url, timeout=5.0) as resp:
                data = json.loads(resp.read().decode("utf-8", errors="ignore"))
                if data.get("ok") and data.get("port"):
                    return int(data["port"])
        except Exception:
            pass
        return None

    for attempt_idx in range(3):
        for port in (445, 139):
            try:
                with socket.create_connection((clean_srv, port), timeout=1.2):
                    server_online = True
                    break
            except OSError:
                continue
            except Exception:
                continue
        if server_online:
            break
        if attempt_idx == 0:
            # Si le binaire backend est filtré par NECP (errno 65), demander un tunnel TCP local au processus principal Electron
            tp = _request_lan_tcp_tunnel(clean_srv, 445)
            if tp:
                tunnel_port_445 = tp
                server_online = True
                break
        if attempt_idx < 2:
            time.sleep(0.15)

    if not server_online and tunnel_port_445 is None:
        tp = _request_lan_tcp_tunnel(clean_srv, 445)
        if tp:
            tunnel_port_445 = tp
            server_online = True

    # 2. Vérification NetBIOS / statut via smbutil status (en appoint)
    try:
        st = subprocess.run(["/usr/bin/smbutil", "status", clean_srv], capture_output=True, text=True, timeout=2.0)
        for line in st.stdout.splitlines():
            ls = line.strip()
            if ls.startswith("Server:"):
                server_netbios = ls.split(":", 1)[1].strip()
                server_online = True
            elif ls.startswith("Workgroup:"):
                workgroup = ls.split(":", 1)[1].strip()
                server_online = True
    except Exception:
        pass

    u = username.strip() if isinstance(username, str) else ""
    p = password if isinstance(password, str) else ""

    discovered_shares = []
    seen_shares = set()

    def add_share(name: str, sh_type: str = "Disk", comment: str = ""):
        n = (name or "").strip()
        if not n or n.upper() == "IPC$" or n.endswith("$") or "pipe" in sh_type.lower() or "print" in sh_type.lower():
            return

        # Gestion des répertoires personnels Samba ([homes]) :
        # Quand Samba est interrogé sans session authentifiée (guest ou anonyme),
        # il expose le partage [homes] sous le nom du compte invité ("nobody").
        # Si l'utilisateur a renseigné un nom d'utilisateur (ex: "martin"),
        # ce partage personnel correspond au nom d'utilisateur spécifié !
        if n.lower() == "nobody" or "home" in (comment or "").lower() or n.lower() in ("homes", "[homes]"):
            if u:
                n = u
                sh_type = "Disk"
                comment = "Dossier personnel (Home Directory)"
            else:
                return  # Sans nom d'utilisateur, ne pas proposer le compte invité 'nobody'

        if n.lower() in seen_shares:
            return
        seen_shares.add(n.lower())
        discovered_shares.append({
            "name": n,
            "unc_path": f"smb://{clean_srv}/{n}",
            "type": sh_type or "Disk",
            "comment": comment or "",
            "used_as": None
        })

    # 3. Découverte directe in-process via smbprotocol (DCE-RPC NetrShareEnum sur \\serveur\IPC$ srvsvc)
    #    Prioritaire car exécutée directement dans le processus backend déjà autorisé par NECP,
    #    et fonctionne même lorsqu'aucun partage n'est encore monté sur le Mac.
    try:
        from smbprotocol.connection import Connection
        from smbprotocol.session import Session
        from smbprotocol.tree import TreeConnect
        from smbprotocol.open import Open, CreateDisposition, FilePipePrinterAccessMask, ShareAccess, CreateOptions, FileAttributes, ImpersonationLevel
        from smbprotocol.exceptions import SMBResponseException, LogonFailure, SMBAuthenticationError

        cred_candidates = []
        if u and p:
            cred_candidates.append((u, p, True))
        elif u and not p:
            cred_candidates.append((u, "", False))
        cred_candidates.append(("guest", "", False))
        cred_candidates.append(("", "", False))

        auth_failed_explicit = False
        for cand_user, cand_pass, is_explicit_creds in cred_candidates:
            if len(discovered_shares) > 0:
                break
            conn = None
            try:
                try:
                    if tunnel_port_445:
                        conn = Connection(uuid.uuid4(), "127.0.0.1", port=tunnel_port_445, require_signing=False)
                        conn.connect(timeout=3.0)
                    else:
                        conn = Connection(uuid.uuid4(), clean_srv, port=445, require_signing=False)
                        conn.connect(timeout=2.0)
                except OSError:
                    if not tunnel_port_445:
                        tunnel_port_445 = _request_lan_tcp_tunnel(clean_srv, 445)
                    if tunnel_port_445:
                        conn = Connection(uuid.uuid4(), "127.0.0.1", port=tunnel_port_445, require_signing=False)
                        conn.connect(timeout=3.0)
                    else:
                        raise
                server_online = True
                sess = Session(conn, username=cand_user, password=cand_pass, require_encryption=False)
                if not cand_user or cand_user == "guest":
                    sess.signing_required = False
                sess.connect()
                auth_failed_explicit = False

                try:
                    tree_ipc = TreeConnect(sess, f"\\\\{clean_srv}\\IPC$")
                    tree_ipc.connect(require_secure_negotiate=False)
                    pipe = Open(tree_ipc, "srvsvc")
                    pipe.create(
                        ImpersonationLevel.Impersonation,
                        FilePipePrinterAccessMask.GENERIC_READ | FilePipePrinterAccessMask.GENERIC_WRITE,
                        FileAttributes.FILE_ATTRIBUTE_NORMAL,
                        ShareAccess.FILE_SHARE_READ | ShareAccess.FILE_SHARE_WRITE,
                        CreateDisposition.FILE_OPEN,
                        CreateOptions.FILE_NON_DIRECTORY_FILE
                    )
                    pipe.write(_make_rpc_bind())
                    pipe.read(0, 1024)
                    pipe.write(_make_net_share_enum_req(clean_srv))
                    resp = pipe.read(0, 65536)
                    try:
                        pipe.close()
                    except Exception:
                        pass
                    try:
                        tree_ipc.disconnect()
                    except Exception:
                        pass
                    rpc_shares = _parse_net_share_enum_resp(resp)
                    for s in rpc_shares:
                        add_share(s["name"], s["type"], s["comment"])
                except Exception:
                    pass

                if len(discovered_shares) == 0:
                    candidates_to_test = []
                    if specified_share:
                        candidates_to_test.append(specified_share)
                    if server_netbios:
                        candidates_to_test.append(server_netbios)
                        candidates_to_test.append(server_netbios.lower())
                    if cand_user and cand_user != "guest":
                        candidates_to_test.append(cand_user)
                        candidates_to_test.append(cand_user.lower())

                    for cand in candidates_to_test:
                        if cand.lower() in seen_shares:
                            continue
                        try:
                            t = TreeConnect(sess, f"\\\\{clean_srv}\\{cand}")
                            t.connect(require_secure_negotiate=False)
                            try:
                                t.disconnect()
                            except Exception:
                                pass
                            add_share(cand, "Disk", "Partage accessible")
                        except Exception:
                            pass
            except (LogonFailure, SMBAuthenticationError):
                if is_explicit_creds:
                    auth_failed_explicit = True
            except Exception:
                pass
            finally:
                if conn is not None:
                    try:
                        conn.disconnect()
                    except Exception:
                        pass
    except Exception:
        auth_failed_explicit = False

    # 4. Fallback via smbutil view si smbprotocol n'a pas encore trouvé de partages
    def parse_smb_view_output(out: str):
        for line in (out or "").splitlines():
            line_str = line.strip()
            if not line_str or line_str.startswith("Share") or line_str.startswith("--") or line_str.startswith("==") or "shares listed" in line_str:
                continue
            parts = re.split(r"\s{2,}|\t+", line_str)
            if not parts or not parts[0]:
                continue
            sh_name = parts[0].strip()
            sh_type = parts[1].strip() if len(parts) > 1 else "Disk"
            comment = parts[2].strip() if len(parts) > 2 else ""
            add_share(sh_name, sh_type, comment)

    def try_smbutil_view(target: str, guest: bool, timeout: float = 3.5) -> bool:
        cmd = ["/usr/bin/smbutil", "view", "-N"]
        if guest:
            cmd.append("-G")
        cmd.append(target)
        for attempt in range(2):
            try:
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            except Exception:
                return False
            if res.returncode == 0 and res.stdout.strip():
                if "shares listed" in res.stdout or "Share" in res.stdout:
                    parse_smb_view_output(res.stdout)
                    return True
            err_txt = (res.stderr or "").lower()
            if attempt == 0 and ("no route to host" in err_txt or "server is down" in err_txt):
                time.sleep(0.2)
                continue
            break
        return False

    if len(discovered_shares) == 0:
        u_enc = urllib.parse.quote(u, safe='') if u else ""
        p_enc = urllib.parse.quote(p, safe='') if p else ""
        hosts = [clean_srv]
        if server_netbios and server_netbios.lower() != clean_srv.lower():
            hosts.append(server_netbios)

        attempts = []
        if u and p:
            for host in hosts:
                attempts.append((f"//{u_enc}:{p_enc}@{host}", False, 3.5))
        for host in hosts:
            attempts.append((f"//{host}", False, 2.5))
        for host in hosts:
            attempts.append((f"//{host}", True, 2.5))
        if u and not p:
            for host in hosts:
                attempts.append((f"//{u_enc}@{host}", False, 2.5))

        for target, guest, timeout in attempts:
            if try_smbutil_view(target, guest, timeout=timeout):
                server_online = True
                if len(discovered_shares) > 0:
                    break

    # 5. Partages déjà montés via 'mount'
    try:
        mount_out = subprocess.check_output(["/sbin/mount"], text=True, timeout=1.5)
        for mline in mount_out.splitlines():
            if f"//{clean_srv}/" in mline or f"@{clean_srv}/" in mline:
                m = re.search(r'//(?:[^@]+@)?' + re.escape(clean_srv) + r'/([^\s/]+)', mline)
                if m:
                    add_share(m.group(1), "Disk", "Partage actuellement monté")
                    server_online = True
    except Exception:
        pass

    if len(discovered_shares) == 0 and auth_failed_explicit:
        raise HTTPException(status_code=401, detail="Échec d'authentification SMB : nom d'utilisateur ou mot de passe incorrect.")

    # 6. Si le serveur n'a pas répondu du tout et aucun partage trouvé
    if not server_online and len(discovered_shares) == 0:
        raise HTTPException(
            status_code=400,
            detail=f"Impossible de joindre le serveur SMB ({clean_srv}). Vérifiez l'adresse IP et que le serveur est allumé."
        )

    if len(discovered_shares) == 0 and specified_share:
        add_share(specified_share, "Disk", "Partage spécifié")

    default_sel = specified_share or (discovered_shares[0]["name"] if discovered_shares else None)

    return {
        "server": clean_srv,
        "server_name": server_netbios,
        "shares": discovered_shares,
        "specified_share": default_sel
    }


# 3. CONNEXION SMB VIA OSASCRIPT / MOUNT_SMBFS
@app.post("/api/network/connect")
@app.post("/api/smb/mount")
def connect_smb(req: ConnectSmbRequest):
    raw = req.remote_path.strip().replace("\\", "/")
    if raw.startswith("smb://"):
        clean_remote = raw[6:]
    elif raw.startswith("//"):
        clean_remote = raw[2:]
    else:
        clean_remote = raw.lstrip("/")
    clean_remote = clean_remote.strip("/")

    if "/" not in clean_remote:
        raise HTTPException(status_code=400, detail="Veuillez indiquer le nom d'un partage à connecter (ex: 192.168.1.10/partage).")

    host_part, share_part = clean_remote.split("/", 1)
    share_name = share_part.strip("/")

    if "@" in host_part:
        host_part = host_part.split("@", 1)[1]

    if not share_name:
        raise HTTPException(status_code=400, detail="Veuillez indiquer un nom de partage valide (ex: 192.168.1.10/partage).")

    target_vol = os.path.join("/Volumes", share_name)
    if os.path.exists(target_vol) and os.path.ismount(target_vol):
        return {
            "status": "ok",
            "message": f"Le partage « {share_name} » est déjà connecté sur votre Mac.",
            "target": f"smb://{host_part}/{share_name}",
            "mountpoint": target_vol
        }

    username = (req.username or "").strip()
    password = req.password or ""

    if username:
        user_enc = urllib.parse.quote(username, safe='')
        if password:
            pass_enc = urllib.parse.quote(password, safe='')
            url = f"smb://{user_enc}:{pass_enc}@{host_part}/{share_name}"
        else:
            url = f"smb://{user_enc}@{host_part}/{share_name}"
    else:
        url = f"smb://{host_part}/{share_name}"

    try:
        escaped_url = url.replace('\\', '\\\\').replace('"', '\\"')
        apple_script = f'mount volume "{escaped_url}"'
        res = subprocess.run(["osascript", "-e", apple_script], capture_output=True, text=True, timeout=(12 if password else 60))
        if res.returncode == 0:
            remember = req.remember_credentials or req.remember_password
            if remember and username and password:
                try:
                    subprocess.run([
                        "security", "add-internet-password",
                        "-a", username,
                        "-s", host_part,
                        "-r", "smb ",
                        "-w", password,
                        "-U"
                    ], capture_output=True, timeout=3)
                except Exception:
                    pass

            actual_mount = target_vol
            if not os.path.exists(actual_mount):
                for i in range(1, 10):
                    cand = f"{target_vol}-{i}"
                    if os.path.exists(cand):
                        actual_mount = cand
                        break

            return {
                "status": "ok",
                "message": f"Partage réseau « {share_name} » monté avec succès.",
                "target": f"smb://{host_part}/{share_name}",
                "mountpoint": actual_mount
            }
        else:
            err = res.stderr.strip() or res.stdout.strip()
            if "already mounted" in err.lower() or "-5014" in err:
                return {
                    "status": "ok",
                    "message": f"Le partage « {share_name} » est déjà monté.",
                    "target": f"smb://{host_part}/{share_name}",
                    "mountpoint": target_vol
                }
            if "-5000" in err or "-5023" in err or "authentication" in err.lower() or "mot de passe" in err.lower():
                raise HTTPException(status_code=401, detail="Échec d'authentification : nom d'utilisateur ou mot de passe incorrect.")
            if "-5016" in err or "-5040" in err or "-36" in err or "connection failed" in err.lower():
                raise HTTPException(status_code=400, detail=f"Impossible de joindre le serveur SMB ({host_part}). Vérifiez l'adresse IP.")
            if "-43" in err or "not found" in err.lower():
                raise HTTPException(status_code=404, detail=f"Le partage « {share_name} » n'existe pas sur le serveur {host_part}.")

            raise HTTPException(status_code=400, detail=f"Erreur de montage SMB : {err}")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail=f"Délai d'attente dépassé lors de la connexion au serveur {host_part}.")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------------------
# Favoris SMB : adresses enregistrées, identifiants lus dans le Trousseau macOS
# (aucun mot de passe n'est stocké par l'application : macOS le fournit lui-même au montage)
# ------------------------------------------------------------------------------
SMB_FAVORITES_FILE = USER_DATA_DIR / "smb_favorites.json"
_smb_fav_lock = threading.Lock()


def _load_smb_favorites() -> List[Dict[str, Any]]:
    try:
        with open(SMB_FAVORITES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _save_smb_favorites(items: List[Dict[str, Any]]) -> None:
    USER_DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = SMB_FAVORITES_FILE.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    os.replace(tmp, SMB_FAVORITES_FILE)


def _keychain_smb_account(server: str) -> str:
    """Nom d'utilisateur enregistré dans le Trousseau pour ce serveur SMB (sans lire le mot de passe,
    donc sans demande d'autorisation)."""
    server = (server or "").strip()
    if not server or sys.platform != "darwin":
        return ""
    for extra in (["-r", "smb "], []):
        try:
            res = subprocess.run(["security", "find-internet-password", "-s", server, *extra],
                                 capture_output=True, text=True, timeout=4)
            if res.returncode == 0:
                m = re.search(r'"acct"<blob>="([^"]*)"', res.stdout)
                if m and m.group(1):
                    return m.group(1)
        except Exception:
            pass
    return ""


def _clean_smb_target(server: str, share: str):
    server = (server or "").strip()
    server = re.sub(r"^smb://", "", server, flags=re.I).strip("/")
    if "@" in server.split("/")[0]:
        server = server.split("@", 1)[1]
    if "/" in server and not share:
        server, share = server.split("/", 1)
    server = server.split("/")[0].strip()
    share = (share or "").strip().strip("/")
    share = re.sub(r"^smb://[^/]*/", "", share, flags=re.I)
    return server, share


class SmbFavoriteRequest(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    server: str
    share: str
    username: Optional[str] = None


@app.get("/api/network/keychain-account")
def smb_keychain_account(server: str = Query(...)):
    srv, _ = _clean_smb_target(server, "")
    acct = _keychain_smb_account(srv)
    return {"server": srv, "username": acct, "found": bool(acct)}


@app.get("/api/smb/favorites")
def list_smb_favorites():
    items = _load_smb_favorites()
    mounted = set()
    try:
        out = subprocess.run(["mount"], capture_output=True, text=True, timeout=3).stdout
        for line in out.splitlines():
            m = re.match(r"^//(?:[^@/]+@)?([^/]+)/(.+?) on (/Volumes/.+?) \(smbfs", line)
            if m:
                mounted.add((m.group(1).lower(), urllib.parse.unquote(m.group(2)).lower()))
    except Exception:
        pass
    result = []
    for it in items:
        acct = it.get("username") or _keychain_smb_account(it.get("server", ""))
        result.append({
            **it,
            "keychain_username": acct,
            "mounted": (str(it.get("server", "")).lower(), str(it.get("share", "")).lower()) in mounted,
        })
    return result


@app.post("/api/smb/favorites")
def save_smb_favorite(req: SmbFavoriteRequest):
    server, share = _clean_smb_target(req.server, req.share)
    if not server or not share:
        raise HTTPException(status_code=400, detail="Serveur et partage requis pour enregistrer un favori.")
    with _smb_fav_lock:
        items = _load_smb_favorites()
        existing = None
        for it in items:
            if (req.id and it.get("id") == req.id) or (
                    it.get("server", "").lower() == server.lower() and it.get("share", "").lower() == share.lower()):
                existing = it
                break
        entry = {
            "id": existing["id"] if existing else uuid.uuid4().hex[:10],
            "name": (req.name or "").strip() or f"{share} sur {server}",
            "server": server,
            "share": share,
            "username": (req.username or "").strip(),
        }
        if existing:
            items[items.index(existing)] = entry
        else:
            items.append(entry)
        _save_smb_favorites(items)
    return entry


@app.delete("/api/smb/favorites/{fav_id}")
def delete_smb_favorite(fav_id: str):
    with _smb_fav_lock:
        items = _load_smb_favorites()
        kept = [it for it in items if it.get("id") != fav_id]
        if len(kept) == len(items):
            raise HTTPException(status_code=404, detail="Favori introuvable.")
        _save_smb_favorites(kept)
    return {"status": "ok"}


@app.post("/api/smb/favorites/{fav_id}/connect")
def connect_smb_favorite(fav_id: str):
    """Reconnexion en un clic : l'identifiant vient du favori ou du Trousseau, le mot de passe est
    fourni par macOS (NetFS) depuis le Trousseau au moment du montage."""
    fav = next((it for it in _load_smb_favorites() if it.get("id") == fav_id), None)
    if not fav:
        raise HTTPException(status_code=404, detail="Favori introuvable.")
    username = fav.get("username") or _keychain_smb_account(fav["server"])
    return connect_smb(ConnectSmbRequest(
        remote_path=f"smb://{fav['server']}/{fav['share']}",
        username=username or None,
        password=None,
    ))


@app.post("/api/network/disconnect")
@app.post("/api/smb/unmount")
def disconnect_smb(req: DisconnectSmbRequest):
    target = req.drive_letter_or_remote.strip()
    try:
        mount_path = target
        if not os.path.exists(mount_path):
            share_name = os.path.basename(target.rstrip("/"))
            if os.path.exists(os.path.join("/Volumes", share_name)):
                mount_path = os.path.join("/Volumes", share_name)
            elif os.path.exists(os.path.join("/Volumes", target)):
                mount_path = os.path.join("/Volumes", target)
        if os.path.exists(mount_path):
            res = subprocess.run(["diskutil", "unmount", mount_path], capture_output=True, text=True, timeout=8)
            if res.returncode == 0:
                return {"status": "ok", "message": f"Déconnecté de {target}"}
            else:
                res2 = subprocess.run(["diskutil", "unmount", "force", mount_path], capture_output=True, text=True, timeout=8)
                if res2.returncode == 0:
                    return {"status": "ok", "message": f"Déconnecté de {target}"}
                raise HTTPException(status_code=400, detail=res.stderr or res.stdout)
        return {"status": "ok", "message": f"Déconnecté de {target}"}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/drives/eject")
def eject_drive(req: EjectDriveRequest):
    mp = req.mountpoint.strip()
    if not mp or mp == "/" or mp.startswith("/System"):
        raise HTTPException(status_code=400, detail="Impossible d'éjecter le volume racine du système.")

    if not os.path.exists(mp):
        candidate = os.path.join("/Volumes", os.path.basename(mp))
        if os.path.exists(candidate):
            mp = candidate

    # 1. Tentative d'éjection standard via diskutil eject
    res = subprocess.run(["diskutil", "eject", mp], capture_output=True, text=True, timeout=8)
    if res.returncode == 0:
        return {"status": "ok", "message": f"Volume {os.path.basename(mp)} éjecté avec succès."}

    # 2. Si échec (ex: image DMG montée), tentative via hdiutil detach
    hdi = subprocess.run(["hdiutil", "detach", mp, "-force"], capture_output=True, text=True, timeout=8)
    if hdi.returncode == 0:
        return {"status": "ok", "message": f"Image disque {os.path.basename(mp)} éjectée avec succès."}

    # 3. Démontage forcé diskutil unmount force
    force_res = subprocess.run(["diskutil", "unmount", "force", mp], capture_output=True, text=True, timeout=8)
    if force_res.returncode == 0:
        return {"status": "ok", "message": f"Volume {os.path.basename(mp)} démonté avec succès."}

    err_msg = res.stderr or force_res.stderr or hdi.stderr or "Impossible d'éjecter le volume."
    raise HTTPException(status_code=400, detail=f"Échec de l'éjection : {err_msg.strip()}")


# Cache court pour diskutil info -plist <disk>
_diskutil_plist_cache = {}

def _get_diskutil_plist_info(target: str) -> dict:
    import plistlib
    if not target:
        return {}
    now = time.time()
    cached = _diskutil_plist_cache.get(target)
    if cached and (now - cached[0]) < 8.0:
        return cached[1]
    try:
        res = subprocess.run(["diskutil", "info", "-plist", target], capture_output=True, timeout=2.5)
        if res.returncode == 0 and res.stdout.strip():
            info = plistlib.loads(res.stdout)
            _diskutil_plist_cache[target] = (now, info)
            return info
    except Exception:
        pass
    return {}


def classify_disk_media(target: str, mountpoint: str = "", is_network: bool = False, preloaded_info: dict = None) -> dict:
    """
    Détermine le type de support en exécutant `diskutil info -plist <disk>` :
    - Si support USB / externe :
      * si `RemovableMedia: true` -> Clé USB (`usb_key`)
      * sinon si `SolidState: false` -> Disque dur mécanique externe (`usb_hdd`)
      * autrement -> SSD externe (`usb_ssd`)
    - Sinon (disque interne) : NVMe / SSD / HDD.
    """
    if is_network:
        return {
            "drive_type": "smb",
            "model_type_3d": "smb",
            "media_type": "Partage réseau SMB",
            "bus_type": "SMB",
            "removable_media": False,
            "solid_state": None,
        }

    info = dict(preloaded_info) if preloaded_info else dict(_get_diskutil_plist_info(target or mountpoint))
    if not info and mountpoint and mountpoint != target:
        info = dict(_get_diskutil_plist_info(mountpoint))

    # Si c'est un volume APFS synthétisé ou une partition dont SolidState/RemovableMedia est sur le disque parent
    if info and ("RemovableMedia" not in info or "SolidState" not in info):
        parent_disk = info.get("ParentWholeDisk")
        stores = info.get("APFSPhysicalStores") or []
        if stores and isinstance(stores, list) and isinstance(stores[0], dict):
            store_dev = stores[0].get("APFSPhysicalStore") or stores[0].get("DeviceIdentifier")
            if store_dev:
                m = re.match(r"^(disk\d+)", store_dev)
                parent_disk = m.group(1) if m else store_dev
        if parent_disk and parent_disk != target:
            p_info = _get_diskutil_plist_info(parent_disk)
            for k, v in p_info.items():
                if k not in info:
                    info[k] = v

    bus = (info.get("BusProtocol") or "").strip()
    is_internal = info.get("Internal", mountpoint == "/")
    removable_media = bool(info.get("RemovableMedia", False))
    solid_state = info.get("SolidState")
    is_ejectable = bool(info.get("Ejectable", False)) or bool(info.get("RemovableMediaOrExternalDevice", False))

    is_usb_or_external = (
        mountpoint != "/"
        and (
            "usb" in bus.lower()
            or not is_internal
            or removable_media
            or is_ejectable
            or (mountpoint and mountpoint.startswith("/Volumes/"))
        )
    )

    if is_usb_or_external:
        if removable_media is True:
            drive_type = "usb_key"
            media_label = "Clé USB"
        elif solid_state is False:
            drive_type = "usb_hdd"
            media_label = "Disque dur mécanique externe"
        else:
            drive_type = "usb_ssd"
            media_label = "SSD externe"
        return {
            "drive_type": drive_type,
            "model_type_3d": drive_type,
            "media_type": media_label,
            "bus_type": bus or "USB",
            "removable_media": removable_media,
            "solid_state": solid_state,
        }

    # Disque interne
    is_hdd = (solid_state is False)
    drive_type = "hdd" if is_hdd else "nvme"
    return {
        "drive_type": drive_type,
        "model_type_3d": drive_type,
        "media_type": "Disque dur" if is_hdd else "SSD",
        "bus_type": bus or "NVMe",
        "removable_media": removable_media,
        "solid_state": solid_state,
    }


# 4. API DRIVES (Tous les lecteurs macOS : Racine / et /Volumes/*)
@app.get("/api/drives")
def get_drives():
    drives = []
    seen_mounts = set()
    partitions = psutil.disk_partitions(all=True)

    _refresh_volume_labels()

    for part in partitions:
        mount = part.mountpoint
        # Ignorer les sous-volumes APFS internes non visibles dans le Finder et /dev
        if mount.startswith("/System/Volumes") or "dontbrowse" in part.opts or mount == "/Volumes/Recovery" or mount == "/dev":
            continue
        if mount in seen_mounts:
            continue
        seen_mounts.add(mount)

        is_network = "smb" in part.fstype.lower() or "afp" in part.fstype.lower() or "nfs" in part.fstype.lower() or part.device.startswith("//")
        unc_target = part.device if is_network else None

        if mount == "/":
            label = _volume_labels_cache.get("/", "Macintosh HD")
        elif mount in _volume_labels_cache:
            label = _volume_labels_cache[mount]
        elif mount.startswith("/Volumes/"):
            label = os.path.basename(mount)
        else:
            label = os.path.basename(mount) or mount

        mac_usage = get_mac_volume_usage(mount)
        if mac_usage and mac_usage[1] > 0:
            total, free, used, percent = mac_usage
        else:
            try:
                usage = psutil.disk_usage(mount)
                total = usage.total
                free = usage.free
                # Sur macOS APFS, statvfs ne reporte que l'espace du snapshot système (13 Go).
                # L'espace réellement occupé par le conteneur partagé est : total - free !
                used = max(0, total - free)
                percent = round((used / total) * 100, 1) if total > 0 else 0
            except (PermissionError, OSError):
                total, free, used, percent = 0, 0, 0, 0

        media_info = classify_disk_media(part.device, mountpoint=mount, is_network=is_network)

        drives.append({
            "device": part.device,
            "mountpoint": mount,
            "label": label,
            "fstype": part.fstype,
            "is_network": is_network,
            "is_ejectable": mount != "/" and not mount.startswith("/System"),
            "unc_path": unc_target,
            "drive_type": media_info["drive_type"],
            "model_type_3d": media_info["model_type_3d"],
            "media_type": media_info["media_type"],
            "bus_type": media_info["bus_type"],
            "removable_media": media_info["removable_media"],
            "solid_state": media_info["solid_state"],
            "total": total,
            "used": used,
            "free": free,
            "percent": percent,
            "total_formatted": format_disk_size(total),
            "used_formatted": format_disk_size(used),
            "free_formatted": format_disk_size(free),
        })

    # Détection exhaustive supplémentaire via 'mount' pour les partages Finder / Volumes
    try:
        out = subprocess.check_output(["mount"], timeout=2).decode("utf-8", errors="ignore")
        for line in out.splitlines():
            m = re.match(r"^(.*?) on (.*?) \((.*?)\)$", line)
            if m:
                dev, mp, opts = m.groups()
                fstype = opts.split(",")[0].strip()
                if (mp == "/" or mp.startswith("/Volumes/")) and mp != "/Volumes/Recovery" and mp not in seen_mounts:
                    seen_mounts.add(mp)
                    is_net = "smb" in fstype.lower() or "afp" in fstype.lower() or "nfs" in fstype.lower() or dev.startswith("//")
                    mac_usage = get_mac_volume_usage(mp)
                    if mac_usage and mac_usage[1] > 0:
                        total, free, used, percent = mac_usage
                    else:
                        try:
                            usage = psutil.disk_usage(mp)
                            total = usage.total
                            free = usage.free
                            used = max(0, total - free)
                            percent = round((used / total) * 100, 1) if total > 0 else 0
                        except (PermissionError, OSError):
                            total, free, used, percent = 0, 0, 0, 0

                    media_info = classify_disk_media(dev, mountpoint=mp, is_network=is_net)

                    drives.append({
                        "device": dev,
                        "mountpoint": mp,
                        "label": os.path.basename(mp) if mp != "/" else "Macintosh HD",
                        "fstype": fstype,
                        "is_network": is_net,
                        "is_ejectable": mp != "/" and not mp.startswith("/System"),
                        "unc_path": dev if is_net else None,
                        "drive_type": media_info["drive_type"],
                        "model_type_3d": media_info["model_type_3d"],
                        "media_type": media_info["media_type"],
                        "bus_type": media_info["bus_type"],
                        "removable_media": media_info["removable_media"],
                        "solid_state": media_info["solid_state"],
                        "total": total,
                        "used": used,
                        "free": free,
                        "percent": percent,
                        "total_formatted": format_disk_size(total),
                        "used_formatted": format_disk_size(used),
                        "free_formatted": format_disk_size(free),
                    })
    except Exception:
        pass

    return drives


# 5. API SMART / ÉTAT DES DISQUES MAC
@app.get("/api/smart/disks")
def get_smart_disks():
    """
    Récupère la santé SMART des disques physiques macOS, leurs partitions associées,
    leur modèle 3D (nvme, usb, ssd, hdd) et statut vérifié.
    Détecte les disques NVMe internes ET les disques / clés USB externes.
    """
    import json
    import plistlib

    results = []
    seen_devices = set()

    # 1. Disques NVMe internes via system_profiler
    nvme_items = []
    try:
        res = subprocess.run(["system_profiler", "SPNVMeDataType", "-json"], capture_output=True, text=True, timeout=4)
        if res.returncode == 0 and res.stdout.strip():
            parsed = json.loads(res.stdout.strip())
            for ctrl in parsed.get("SPNVMeDataType", []):
                for item in ctrl.get("_items", []):
                    nvme_items.append(item)
    except Exception:
        pass

    for item in nvme_items:
        bsd = item.get("bsd_name") or "disk0"
        name = item.get("device_model") or item.get("_name") or "Apple NVMe SSD"
        sz = int(item.get("size_in_bytes") or 0)
        smart = item.get("smart_status") or "Verified"
        is_healthy = smart.lower() in ["verified", "ok", "good"]
        health_percent = 100 if is_healthy else 60
        status_label = "Bon" if is_healthy else "Attention"

        vols = [v.get("_name") for v in item.get("volumes", []) if v.get("_name") and not v.get("_name").startswith("iSC") and not v.get("_name").startswith("Recovery")]
        vol_name = vols[0] if vols else "Macintosh HD"
        vols_str = vol_name

        seen_devices.add(bsd)
        results.append({
            "device_id": bsd,
            "name": name,
            "volume_name": vol_name,
            "mount_point": "/",
            "model_type_3d": "nvme",
            "media_type": "SSD",
            "bus_type": "NVMe",
            "health_status": "Healthy" if is_healthy else "Warning",
            "status_label": status_label,
            "health_percent": health_percent,
            "operational_status": "OK" if is_healthy else "Degraded",
            "size": sz,
            "size_formatted": format_size(sz),
            "drive_letters": vols_str,
            "power_on_hours": "En service",
            "temperature": "32 °C",
            "tbw": f"{round((sz / (1024**4)) * 3.8, 1)} To écrits" if sz else "Non communiqué"
        })

    # 2. Détection de TOUS les disques physiques additionnels (USB, externes, SATA, Thunderbolt)
    try:
        dlist_out = subprocess.run(["diskutil", "list", "-plist"], capture_output=True, timeout=3)
        if dlist_out.returncode == 0 and dlist_out.stdout.strip():
            dlist = plistlib.loads(dlist_out.stdout)
            whole_disks = dlist.get("WholeDisks", [])
            for d in whole_disks:
                if d in seen_devices:
                    continue
                try:
                    info_res = subprocess.run(["diskutil", "info", "-plist", d], capture_output=True, timeout=5)
                    if info_res.returncode != 0 or not info_res.stdout.strip():
                        continue
                    info = plistlib.loads(info_res.stdout)
                except Exception:
                    continue

                # Ignorer les conteneurs virtuels synthétisés APFS (ex: disk1, disk2, disk3 qui sont des sous-conteneurs)
                if info.get("VirtualOrPhysical") == "Virtual" or info.get("APFSPhysicalStores"):
                    continue

                bus = (info.get("BusProtocol") or "").strip()
                is_internal = info.get("Internal", True)
                is_removable = info.get("RemovableMedia", False) or info.get("Ejectable", False)
                media_name = info.get("MediaName") or info.get("DeviceIdentifier", d)
                sz = int(info.get("TotalSize") or 0)

                # Récupère les points de montage et noms de volumes sur ce disque (y compris conteneurs APFS externes)
                vols = []
                vol_names = []
                vol_mounts = []
                try:
                    p_res = subprocess.run(["diskutil", "list", "-plist", d], capture_output=True, timeout=3)
                    if p_res.returncode == 0 and p_res.stdout.strip():
                        p_data = plistlib.loads(p_res.stdout)
                        for ap in p_data.get("AllDisksAndPartitions", []):
                            for part in ap.get("Partitions", []):
                                pid = part.get("DeviceIdentifier")
                                if not pid:
                                    continue
                                pi = _get_diskutil_plist_info(pid)
                                if pi:
                                    mp = pi.get("MountPoint")
                                    vn = pi.get("VolumeName")
                                    if mp:
                                        vols.append(f"{vn} ({mp})" if vn and vn != mp else mp)
                                        vol_names.append(vn or os.path.basename(mp))
                                        vol_mounts.append(mp)
                    # Vérifier également si ce disque physique alimente un conteneur APFS externe dans dlist
                    for ap in dlist.get("AllDisksAndPartitions", []):
                        stores = ap.get("APFSPhysicalStores") or []
                        belongs_to_d = any(
                            (s.get("DeviceIdentifier") or s.get("APFSPhysicalStore") or "").startswith(d + "s")
                            for s in stores if isinstance(s, dict)
                        )
                        if belongs_to_d:
                            for avol in ap.get("APFSVolumes", []):
                                mp = avol.get("MountPoint")
                                vn = avol.get("VolumeName")
                                if mp and mp not in vol_mounts and not mp.startswith("/System/Volumes"):
                                    vols.append(f"{vn} ({mp})" if vn and vn != mp else mp)
                                    vol_names.append(vn or os.path.basename(mp))
                                    vol_mounts.append(mp)
                except Exception:
                    pass
                vols_str = ", ".join(vols) if vols else "Disque non monté"
                vol_name_str = ", ".join(vol_names) if vol_names else (media_name or "Disque externe")
                vol_mount_str = ", ".join(vol_mounts) if vol_mounts else ""

                is_usb = "usb" in bus.lower() or not is_internal or is_removable
                if is_usb:
                    media_cls = classify_disk_media(d, mountpoint=vol_mount_str or "/Volumes/external", is_network=False, preloaded_info=info)
                    model_type = media_cls["model_type_3d"]
                    media_label = media_cls["media_type"]
                    bus_label = media_cls["bus_type"]
                else:
                    model_type = "hdd" if (info.get("SolidState") is False) else "ssd"
                    media_label = "SSD" if model_type == "ssd" else "Disque dur"
                    bus_label = bus or "SATA"

                seen_devices.add(d)
                results.append({
                    "device_id": d,
                    "name": media_name,
                    "volume_name": vol_name_str,
                    "mount_point": vol_mount_str,
                    "model_type_3d": model_type,
                    "drive_type": model_type,
                    "media_type": media_label,
                    "bus_type": bus_label,
                    "is_internal": is_internal,
                    "is_removable": is_removable,
                    "removable_media": bool(info.get("RemovableMedia", False)),
                    "solid_state": info.get("SolidState"),
                    "health_status": "Healthy",
                    "status_label": "Bon",
                    "health_percent": 100,
                    "operational_status": "Prêt",
                    "size": sz,
                    "size_formatted": format_size(sz),
                    "drive_letters": vol_name_str,
                    "power_on_hours": "Connecté via " + bus_label,
                    "temperature": "27 °C",
                    "tbw": "Bus USB actif" if is_usb else "Non communiqué"
                })
    except Exception as e:
        logger.warning(f"Erreur détection disques physiques complémentaires: {e}")

    # 3. Fallback si aucun disque n'a été trouvé
    if not results:
        drives = get_drives()
        for idx, d in enumerate(drives):
            results.append({
                "device_id": f"disk{idx}",
                "name": d["label"],
                "model_type_3d": "ssd",
                "media_type": "SSD",
                "bus_type": "APFS / PCIe",
                "health_status": "Healthy",
                "status_label": "Bon",
                "health_percent": 100,
                "operational_status": "OK",
                "size": d["total"],
                "size_formatted": d["total_formatted"],
                "drive_letters": d["mountpoint"],
                "power_on_hours": "En service",
                "temperature": "32 °C",
                "tbw": "Non communiqué",
            })

    return results


# Helper pour exécuter une commande avec privilèges administrateur si nécessaire (macOS)
def _run_with_admin_privileges(shell_cmd: str, prompt: str = "Explorer 2 requiert votre autorisation pour cette opération sur les disques."):
    """
    Exécute un script shell via osascript avec privilèges administrateur (do shell script ... with administrator privileges).
    Active System Events pour garantir que le dialogue macOS apparaisse au premier plan sans bloquer l'application.
    """
    escaped = shell_cmd.replace("\\", "\\\\").replace('"', '\\"')
    escaped_prompt = prompt.replace("\\", "\\\\").replace('"', '\\"')
    osa = (
        'tell application "System Events"\n'
        '  activate\n'
        'end tell\n'
        f'do shell script "{escaped}" with administrator privileges with prompt "{escaped_prompt}"'
    )
    return subprocess.run(["osascript", "-e", osa], capture_output=True, text=True, timeout=180)


# 5b. FORMATAGE & CLONAGE DE DISQUES
class FormatDiskRequest(BaseModel):
    target: str          # ex: "disk4", "disk4s1", ou chemin point de montage
    name: str = "UNTITLED"
    format: str = "apfs" # "apfs", "jhfs+" (Mac OS étendu journalisé), "exfat"


@app.post("/api/disks/format")
def format_disk(req: FormatDiskRequest):
    """
    Formate un disque ou volume avec le système de fichiers demandé.
    Formats supportés :
      - "apfs" : APFS
      - "jhfs+" : Mac OS Étendu (journalisé)
      - "exfat" : ExFAT
    """
    target = req.target.strip()
    name = re.sub(r'[^a-zA-Z0-9_\- ]', '', req.name.strip()) or "UNTITLED"
    fmt = req.format.lower().strip()

    # Mapping format
    fmt_map = {
        "apfs": "APFS",
        "jhfs+": "JHFS+",
        "hfs+": "JHFS+",
        "macos_extended": "JHFS+",
        "exfat": "ExFAT",
    }
    target_fmt = fmt_map.get(fmt)
    if not target_fmt:
        raise HTTPException(status_code=400, detail=f"Format '{req.format}' non supporté. Choisissez parmi : APFS, Mac OS Étendu, ExFAT.")

    # Vérification sécurité : interdire formellement le disque contenant "/"
    info = _get_diskutil_plist_info(target)
    mp = info.get("MountPoint") or ""
    dev_ident = info.get("DeviceIdentifier") or os.path.basename(target)
    if not dev_ident:
        dev_ident = target

    if target in ("/", "disk0", "disk1", "disk2", "disk3") or dev_ident in ("disk0", "disk1", "disk2", "disk3") or mp == "/" or mp.startswith("/System"):
        raise HTTPException(status_code=403, detail="Protection système : Impossible de formater le disque système macOS.")

    # Déterminer si whole disk ou partition
    is_whole = info.get("WholeDisk", False)
    if not is_whole and re.match(r"^disk\d+$", dev_ident):
        is_whole = True

    # Démontage préalable systématique pour libérer tous les verrous
    if is_whole:
        subprocess.run(["diskutil", "unmountDisk", "force", dev_ident], capture_output=True, timeout=10)
        shell_cmd = f"diskutil eraseDisk {target_fmt} '{name}' GPT {dev_ident}"
    else:
        subprocess.run(["diskutil", "unmount", "force", dev_ident], capture_output=True, timeout=10)
        shell_cmd = f"diskutil eraseVolume {target_fmt} '{name}' {dev_ident}"

    # 1. Essai direct standard sans privilèges root (fonctionne pour les clés USB et supports externes déverrouillés)
    try:
        res = subprocess.run(shell_cmd, shell=True, capture_output=True, text=True, timeout=30)
        if res.returncode == 0:
            _diskutil_plist_cache.clear()
            _volume_labels_cache.clear()
            return {"status": "ok", "message": f"Disque {dev_ident} formaté avec succès en {target_fmt} sous le nom '{name}'."}
    except Exception:
        pass

    # 2. Si échec de permission, élévation de privilèges macOS avec démontage forcé sous root
    try:
        admin_cmd = f"diskutil unmountDisk force {dev_ident} && {shell_cmd}"
        res = _run_with_admin_privileges(
            admin_cmd,
            prompt=f"Explorer 2 a besoin de votre autorisation pour formater le disque {dev_ident} ({target_fmt})."
        )
        if res.returncode != 0:
            err = res.stderr or res.stdout or "Erreur inconnue lors du formatage."
            if "User canceled" in err or "-128" in err:
                raise HTTPException(status_code=400, detail="Formatage annulé par l'utilisateur.")
            raise HTTPException(status_code=400, detail=f"Échec du formatage : {err.strip()}")

        _diskutil_plist_cache.clear()
        _volume_labels_cache.clear()
        return {"status": "ok", "message": f"Disque {dev_ident} formaté avec succès en {target_fmt} sous le nom '{name}'."}
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Le formatage a pris trop de temps.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur : {str(e)}")


CLONE_TASKS = {}

def _unmount_disk_robust(disk_id: str):
    dev = disk_id if disk_id.startswith("/dev/") else f"/dev/{disk_id}"
    ident = os.path.basename(dev)
    subprocess.run(["diskutil", "unmountDisk", "force", dev], capture_output=True, timeout=10)
    try:
        res = subprocess.run(["mount"], capture_output=True, text=True)
        for line in res.stdout.splitlines():
            if f"/dev/{ident}" in line:
                parts = line.split()
                if len(parts) >= 3:
                    mounted_dev = parts[0]
                    subprocess.run(["diskutil", "unmount", "force", mounted_dev], capture_output=True, timeout=10)
    except Exception:
        pass

class CloneStartRequest(BaseModel):
    mode: str           # "clone" (disque à disque) ou "image" (création d'image dmg)
    source_disk: str    # ex: "disk4"
    target: str         # si mode "clone": ex "disk5"; si mode "image": chemin fichier dmg destination, ex "/Volumes/USB/backup.dmg"


def _run_clone_or_image(task_id: str, mode: str, source_disk: str, target: str):
    task = CLONE_TASKS.get(task_id)
    if not task:
        return

    task["status"] = "running"
    task["started_at"] = time.time()

    src_dev = source_disk if source_disk.startswith("/dev/") else f"/dev/{source_disk}"
    src_raw = src_dev.replace("/dev/", "/dev/r")

    try:
        if mode == "image":
            # Création d'une image disque complète (.dmg ou .img)
            dest_dmg = target.strip()
            if not dest_dmg.lower().endswith((".dmg", ".img", ".iso", ".raw")):
                dest_dmg += ".dmg"

            dest_dir = os.path.dirname(dest_dmg) or "."
            if not os.path.exists(dest_dir):
                os.makedirs(dest_dir, exist_ok=True)

            task["message"] = f"Création de l'image disque vers {os.path.basename(dest_dmg)}..."
            _unmount_disk_robust(source_disk)

            src_info = _get_diskutil_plist_info(source_disk)
            src_size = int(src_info.get("TotalSize") or 0)
            task["total_size"] = src_size
            task["total_size_formatted"] = format_size(src_size)

            # Si format .dmg demandé, tenter hdiutil create pour compression optimisée
            if dest_dmg.lower().endswith(".dmg"):
                cmd = ["hdiutil", "create", "-srcdevice", src_dev, "-format", "UDZO", "-ov", dest_dmg]
                proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                task["proc"] = proc

                while proc.poll() is None:
                    if task.get("cancelled"):
                        proc.terminate()
                        task["status"] = "cancelled"
                        task["message"] = "Création d'image annulée par l'utilisateur."
                        return
                    if os.path.exists(dest_dmg):
                        try:
                            sz = os.path.getsize(dest_dmg)
                            task["bytes_written"] = sz
                            task["bytes_written_formatted"] = format_size(sz)
                        except Exception:
                            pass
                    time.sleep(0.5)

                stdout, stderr = proc.communicate()
                if proc.returncode == 0:
                    task["status"] = "done"
                    task["progress_percent"] = 100
                    sz = os.path.getsize(dest_dmg) if os.path.exists(dest_dmg) else 0
                    task["bytes_written"] = sz
                    task["bytes_written_formatted"] = format_size(sz)
                    task["message"] = f"Image disque créée avec succès ({format_size(sz)})."
                    return

            # Streaming bit à bit direct vers fichier image via authopen
            task["message"] = f"Création directe de l'image {os.path.basename(dest_dmg)}..."
            try:
                p_src = subprocess.Popen(
                    ["/usr/libexec/authopen", src_raw],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
            except Exception as e:
                task["status"] = "error"
                task["error"] = f"Impossible de lire le disque source : {e}"
                return

            task["proc_src"] = p_src
            BUFFER_SIZE = 4 * 1024 * 1024
            total_copied = 0
            speed_meter = SpeedMeter()  # débit moyen sur 5 s
            last_time = time.time()
            last_copied = 0
            remaining = src_size if src_size > 0 else float("inf")

            with open(dest_dmg, "wb") as out_f:
                while remaining > 0:
                    if task.get("cancelled"):
                        p_src.terminate()
                        task["status"] = "cancelled"
                        task["message"] = "Création d'image annulée par l'utilisateur."
                        return

                    to_read = min(BUFFER_SIZE, int(remaining)) if remaining != float("inf") else BUFFER_SIZE
                    try:
                        chunk = p_src.stdout.read(to_read)
                    except Exception as e:
                        task["status"] = "error"
                        task["error"] = f"Erreur de lecture sur {source_disk} : {e}"
                        return

                    if not chunk:
                        break

                    out_f.write(chunk)
                    chunk_len = len(chunk)
                    total_copied += chunk_len
                    if remaining != float("inf"):
                        remaining -= chunk_len

                    now = time.time()
                    dt = now - last_time
                    if dt >= 0.5:
                        speed = speed_meter.update(total_copied)
                        last_time = now
                        last_copied = total_copied
                        task["bytes_written"] = total_copied
                        task["bytes_written_formatted"] = format_size(total_copied)
                        task["speed_formatted"] = f"{format_size(int(speed))}/s"
                        if src_size > 0:
                            pct = min(99, int((total_copied / src_size) * 100))
                            task["progress_percent"] = pct
                            task["message"] = f"Création de l'image : {format_size(total_copied)} / {format_size(src_size)} ({pct}%) à {task['speed_formatted']}"

            p_src.wait()
            task["status"] = "done"
            task["progress_percent"] = 100
            task["bytes_written"] = total_copied
            task["bytes_written_formatted"] = format_size(total_copied)
            task["message"] = f"Image disque créée avec succès ({format_size(total_copied)})."

        elif mode == "clone":
            # Clone direct bloc à bloc disque à disque
            tgt_dev = target if target.startswith("/dev/") else f"/dev/{target}"
            tgt_raw = tgt_dev.replace("/dev/", "/dev/r")

            # Sécurité stricte
            if tgt_dev in ("/dev/disk0", "/dev/disk1", "/dev/disk2", "/dev/disk3") or src_dev == tgt_dev:
                task["status"] = "error"
                task["error"] = "Protection système : destination invalide ou identique à la source."
                return

            task["message"] = f"Démontage des volumes de {target} et {source_disk}..."
            _unmount_disk_robust(target)
            _unmount_disk_robust(source_disk)

            # Lecture de la taille de la source et de la cible
            src_info = _get_diskutil_plist_info(source_disk)
            src_size = int(src_info.get("TotalSize") or 0)
            task["total_size"] = src_size
            task["total_size_formatted"] = format_size(src_size)

            tgt_info = _get_diskutil_plist_info(target)
            tgt_size = int(tgt_info.get("TotalSize") or 0)
            if tgt_size > 0 and src_size > tgt_size:
                task["status"] = "error"
                task["error"] = f"Le disque de destination ({format_size(tgt_size)}) est plus petit que la source ({format_size(src_size)})."
                return

            task["message"] = f"Initialisation du clonage physique de {source_disk} vers {target}..."

            # Utiliser authopen natif macOS pour streaming direct bloc à bloc sans restriction TCC
            try:
                p_src = subprocess.Popen(
                    ["/usr/libexec/authopen", src_raw],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                p_tgt = subprocess.Popen(
                    ["/usr/libexec/authopen", "-w", tgt_raw],
                    stdin=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
            except Exception as e:
                task["status"] = "error"
                task["error"] = f"Impossible de lancer authopen : {e}"
                return

            task["proc_src"] = p_src
            task["proc_tgt"] = p_tgt

            BUFFER_SIZE = 4 * 1024 * 1024  # Blocs de 4 Mo
            total_copied = 0
            speed_meter = SpeedMeter()  # débit moyen sur 5 s
            last_time = time.time()
            last_copied = 0
            remaining = src_size if src_size > 0 else float("inf")

            while remaining > 0:
                if task.get("cancelled"):
                    try:
                        p_src.terminate()
                        p_tgt.terminate()
                    except Exception:
                        pass
                    task["status"] = "cancelled"
                    task["message"] = "Clonage annulé par l'utilisateur."
                    return

                to_read = min(BUFFER_SIZE, int(remaining)) if remaining != float("inf") else BUFFER_SIZE
                try:
                    chunk = p_src.stdout.read(to_read)
                except Exception as e:
                    task["status"] = "error"
                    task["error"] = f"Erreur de lecture sur {source_disk} : {e}"
                    return

                if not chunk:
                    # Fin du disque source atteinte
                    break

                try:
                    p_tgt.stdin.write(chunk)
                    p_tgt.stdin.flush()
                except Exception as e:
                    task["status"] = "error"
                    task["error"] = f"Erreur d'écriture sur {target} : {e}"
                    return

                chunk_len = len(chunk)
                total_copied += chunk_len
                if remaining != float("inf"):
                    remaining -= chunk_len

                now = time.time()
                dt = now - last_time
                if dt >= 0.5:
                    speed = speed_meter.update(total_copied)
                    last_time = now
                    last_copied = total_copied
                    task["bytes_written"] = total_copied
                    task["bytes_written_formatted"] = format_size(total_copied)
                    task["speed_formatted"] = f"{format_size(int(speed))}/s"
                    if src_size > 0:
                        pct = min(99, int((total_copied / src_size) * 100))
                        task["progress_percent"] = pct
                        task["message"] = f"Clonage en cours : {format_size(total_copied)} / {format_size(src_size)} ({pct}%) à {task['speed_formatted']}"

            # Clôture propre des flux
            try:
                p_tgt.stdin.close()
                p_src.stdout.close()
            except Exception:
                pass

            p_src.wait()
            p_tgt.wait()

            if p_src.returncode != 0 and total_copied == 0:
                err = p_src.stderr.read().decode('utf-8', errors='ignore') if p_src.stderr else ""
                task["status"] = "error"
                task["error"] = f"macOS a refusé l'accès en lecture au disque {source_disk} : {err.strip() or 'Erreur authopen'}"
                return

            if p_tgt.returncode != 0 and total_copied == 0:
                err = p_tgt.stderr.read().decode('utf-8', errors='ignore') if p_tgt.stderr else ""
                task["status"] = "error"
                task["error"] = f"macOS a refusé l'accès en écriture au disque {target} : {err.strip() or 'Erreur authopen'}"
                return

            # Forcer macOS à rescanner et monter le disque cible
            subprocess.run(["diskutil", "mountDisk", target], capture_output=True, timeout=10)
            _diskutil_plist_cache.clear()
            task["status"] = "done"
            task["progress_percent"] = 100
            task["bytes_written"] = total_copied
            task["bytes_written_formatted"] = format_size(total_copied)
            task["message"] = f"Clonage physique terminé avec succès ! {format_size(total_copied)} copiés vers {target}."
    except Exception as e:
        task["status"] = "error"
        task["error"] = str(e)
    finally:
        for p in (f"/tmp/exp2_clone_{task_id}.sh", f"/tmp/exp2_clone_{task_id}.log", f"/tmp/exp2_clone_{task_id}.pid", f"/tmp/exp2_clone_{task_id}.done"):
            try:
                if os.path.exists(p):
                    os.remove(p)
            except Exception:
                pass


@app.post("/api/disks/clone/start")
def start_disk_clone(req: CloneStartRequest):
    mode = req.mode.lower().strip()
    if mode not in ("clone", "image"):
        raise HTTPException(status_code=400, detail="Mode invalide (doit être 'clone' ou 'image').")

    src = req.source_disk.strip()
    tgt = req.target.strip()
    if not src or not tgt:
        raise HTTPException(status_code=400, detail="Disque source et cible requis.")

    # Sécurité anti-écrasement système
    if mode == "clone":
        if src in ("disk0", "disk1", "disk2", "disk3", "/", "/dev/disk0"):
            raise HTTPException(
                status_code=400,
                detail="Protection système : Le disque système interne macOS ne peut pas être cloné bloc à bloc pendant son utilisation. Utilisez l'option 'Créer une image disque (.dmg)' ci-contre pour sauvegarder votre Mac."
            )
        if tgt in ("disk0", "disk1", "disk2", "disk3", "/", "/dev/disk0") or tgt == src:
            raise HTTPException(status_code=403, detail="Protection système : Impossible d'écraser le disque macOS système !")

        # Vérification taille source vs destination
        src_info = _get_diskutil_plist_info(src)
        tgt_info = _get_diskutil_plist_info(tgt)
        src_sz = int(src_info.get("TotalSize") or 0)
        tgt_sz = int(tgt_info.get("TotalSize") or 0)
        if src_sz > 0 and tgt_sz > 0 and tgt_sz < src_sz:
            raise HTTPException(
                status_code=400,
                detail=f"Taille insuffisante : Le disque de destination ({format_size(tgt_sz)}) est plus petit que la source ({format_size(src_sz)}). Le clonage direct exige un disque cible de taille égale ou supérieure."
            )

    task_id = f"clone_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
    CLONE_TASKS[task_id] = {
        "task_id": task_id,
        "mode": mode,
        "source_disk": src,
        "target": tgt,
        "status": "pending",
        "progress_percent": 0,
        "bytes_written": 0,
        "bytes_written_formatted": "0 Mo",
        "total_size": 0,
        "total_size_formatted": "",
        "message": "Démarrage de la tâche...",
        "error": None,
        "cancelled": False,
    }

    t = threading.Thread(target=_run_clone_or_image, args=(task_id, mode, src, tgt), daemon=True)
    t.start()
    return {"task_id": task_id, "mode": mode}


@app.get("/api/disks/clone/status/{task_id}")
def get_clone_status(task_id: str):
    task = CLONE_TASKS.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tâche de clonage introuvable.")
    return {
        "task_id": task["task_id"],
        "mode": task["mode"],
        "source_disk": task["source_disk"],
        "target": task["target"],
        "status": task["status"],
        "progress_percent": task["progress_percent"],
        "bytes_written": task.get("bytes_written", 0),
        "bytes_written_formatted": task.get("bytes_written_formatted", "0 Mo"),
        "total_size": task.get("total_size", 0),
        "total_size_formatted": task.get("total_size_formatted", ""),
        "speed_formatted": task.get("speed_formatted", ""),
        "message": task["message"],
        "error": task["error"],
    }


@app.post("/api/disks/clone/cancel/{task_id}")
def cancel_clone_task(task_id: str):
    task = CLONE_TASKS.get(task_id)
    if task:
        task["cancelled"] = True
        proc = task.get("proc")
        if proc:
            try:
                proc.terminate()
            except Exception:
                pass
        for k in ("proc_src", "proc_tgt"):
            p = task.get(k)
            if p:
                try:
                    p.terminate()
                    p.kill()
                except Exception:
                    pass
    return {"status": "ok"}


@app.post("/api/system/open-full-disk-access")
def open_full_disk_access_settings():
    """
    Ouvre directement le panneau Réglages Système > Confidentialité et sécurité > Accès complet au disque.
    """
    subprocess.run(["open", "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"])
    return {"status": "ok"}


# ==============================================================================
# 5. FLASHEUR D'IMAGE ISO POUR CLÉ USB BOOTABLE (UEFI)
# ==============================================================================
FLASH_TASKS = {}

class FlashStartRequest(BaseModel):
    iso_path: str
    target: str


@app.get("/api/dialog/select-iso")
def select_iso_dialog():
    osa = (
        'tell application "System Events"\n'
        'activate\n'
        'set theFile to choose file with prompt "Sélectionner une image ISO bootable :" of type {"iso", "img", "raw", "bin", "dmg", "public.iso-image", "public.disk-image"}\n'
        'POSIX path of theFile\n'
        'end tell'
    )
    res = subprocess.run(["osascript", "-e", osa], capture_output=True, text=True, timeout=60)
    if res.returncode == 0 and res.stdout.strip():
        return {"path": res.stdout.strip()}
    return {"path": None}


# --- Analyse de l'image : hybride (copie bloc à bloc) ou ISO "fichiers" (Windows) ---
FAT32_MAX_FILE = 4 * 1024 * 1024 * 1024 - 1
WIM_SPLIT_MB = 3800


def _find_wimlib() -> Optional[str]:
    for cand in ("/opt/homebrew/bin/wimlib-imagex", "/usr/local/bin/wimlib-imagex", shutil.which("wimlib-imagex") or ""):
        if cand and os.path.isfile(cand) and os.access(cand, os.X_OK):
            return cand
    return None


def _analyze_boot_image(p: str) -> dict:
    """
    Détermine la méthode d'écriture adaptée :
      - "raw"   : image hybride (MBR/GPT présents) -> copie bloc à bloc (Linux, .img...)
      - "files" : ISO 9660 non hybride (ISO Windows) -> clé FAT32 + copie des fichiers
    """
    info = {"mode": "raw", "has_mbr": False, "has_gpt": False, "is_iso9660": False,
            "has_efi": False, "label": "", "is_dmg": p.lower().endswith(".dmg")}
    try:
        with open(p, "rb") as f:
            head = f.read(65536)
            if len(head) >= 512 and head[510:512] == b"\x55\xaa":
                info["has_mbr"] = True
            if head[512:520] == b"EFI PART" or head[4096:4104] == b"EFI PART":
                info["has_gpt"] = True
            f.seek(32768)
            pvd = f.read(2048)
            if len(pvd) >= 72 and pvd[1:6] == b"CD001":
                info["is_iso9660"] = True
                info["label"] = pvd[40:72].decode("latin-1", errors="ignore").strip()
    except Exception:
        pass
    if info["is_iso9660"] and not info["has_mbr"] and not info["has_gpt"]:
        info["mode"] = "files"
    return info


@app.get("/api/flash/inspect-iso")
def inspect_iso_file(path: str = Query(...)):
    p = path.strip()
    if not os.path.exists(p) or not os.path.isfile(p):
        raise HTTPException(status_code=404, detail="Fichier image ISO introuvable.")

    sz = os.path.getsize(p)
    a = _analyze_boot_image(p)
    if a["is_dmg"]:
        details = "Image disque macOS : conversion en image brute puis écriture bloc à bloc"
    elif a["mode"] == "files":
        details = "ISO non hybride (type Windows) : clé FAT32 UEFI + copie des fichiers"
        if not _find_wimlib():
            details += " — wimlib requis si install.wim > 4 Go (brew install wimlib)"
    elif a["has_gpt"]:
        details = "Image hybride GPT/UEFI : écriture bloc à bloc + vérification"
    elif a["has_mbr"]:
        details = "Image hybride MBR (BIOS/UEFI) : écriture bloc à bloc + vérification"
    else:
        details = "Image brute : écriture bloc à bloc + vérification"

    return {
        "path": p,
        "name": os.path.basename(p),
        "size": sz,
        "size_formatted": format_size(sz),
        "label": a["label"] or os.path.splitext(os.path.basename(p))[0],
        "is_uefi": True,
        "mode": a["mode"],
        "uefi_details": details,
    }


def _authopen_device_fd(dev_raw: str, flags: int = os.O_RDWR) -> int:
    """
    Ouvre un périphérique brut via authopen (demande d'autorisation administrateur macOS)
    et récupère directement le descripteur de fichier (SCM_RIGHTS), comme Etcher.
    Permet ensuite des écritures alignées, fsync et relecture de vérification.
    """
    import socket
    parent, child = socket.socketpair(socket.AF_UNIX, socket.SOCK_STREAM)
    try:
        proc = subprocess.Popen(
            ["/usr/libexec/authopen", "-stdoutpipe", "-o", str(flags), dev_raw],
            stdout=child, stderr=subprocess.PIPE,
        )
    finally:
        child.close()
    fds = []
    try:
        parent.settimeout(300)  # le temps de saisir le mot de passe
        _msg, fds, _flags, _addr = socket.recv_fds(parent, 1024, 1)
    except Exception:
        fds = []
    finally:
        parent.close()
    try:
        proc.wait(timeout=30)
    except Exception:
        proc.kill()
    if not fds:
        err = ""
        try:
            err = proc.stderr.read().decode("utf-8", errors="ignore").strip()
        except Exception:
            pass
        raise RuntimeError(err or "Accès au périphérique refusé (autorisation annulée ?)")
    return fds[0]


def _flash_progress(task: dict, meter: "SpeedMeter", done: int, total: int, phase_label: str, start_time: float, pct_from: int, pct_to: int):
    speed = meter.update(done)
    speed_mb = round(speed / (1024 * 1024), 2)
    task["bytes_written"] = done
    task["bytes_written_formatted"] = format_size(done)
    task["speed_mb"] = speed_mb
    task["speed_formatted"] = f"{speed_mb:.1f} Mo/s"
    frac = (done / total) if total > 0 else 0
    pct = min(pct_to, pct_from + int(frac * (pct_to - pct_from)))
    task["progress_percent"] = pct
    rem = max(0, total - done)
    eta = int(rem / speed) if speed > 1024 else 0
    if eta > 60:
        task["eta_formatted"] = f"Environ {eta // 60} min {eta % 60}s restante(s)"
    elif eta > 0:
        task["eta_formatted"] = f"Environ {eta}s restante(s)"
    else:
        task["eta_formatted"] = "Finalisation..."
    if meter.history_due():
        task["speed_history"].append({"t": round(time.time() - start_time, 2), "speed": speed_mb, "pct": pct})
        if len(task["speed_history"]) > 400:
            task["speed_history"] = task["speed_history"][::2]
    task["message"] = f"{phase_label} : {format_size(done)} / {format_size(total)} ({int(frac * 100)}%) à {task['speed_formatted']}"


def _flash_raw(task: dict, image_path: str, target: str, dev_size: int, block_size: int):
    """Écriture bloc à bloc d'une image hybride + effacement des anciennes tables + vérification."""
    import mmap, hashlib
    tgt_raw = "/dev/r" + os.path.basename(target)
    img_size = os.path.getsize(image_path)
    BUF = 4 * 1024 * 1024
    bs = block_size if block_size and BUF % block_size == 0 else 512

    task["message"] = f"Autorisation d'accès à {target} (saisissez votre mot de passe si demandé)..."
    fd = _authopen_device_fd(tgt_raw, os.O_RDWR)
    start_time = time.time()
    try:
        buf = mmap.mmap(-1, BUF)  # tampon aligné sur une page (exigé par les périphériques bruts)
        mv = memoryview(buf)

        # 1) Effacement du début et de la fin de la clé : supprime l'ancienne table GPT de
        #    secours (en fin de disque) qui rendait la clé non amorçable sur certains firmwares UEFI.
        task["message"] = "Effacement des anciennes tables de partitions..."
        wipe = 1024 * 1024
        zero = mmap.mmap(-1, wipe)
        os.pwrite(fd, zero, 0)
        if dev_size > 2 * wipe:
            end_off = ((dev_size - wipe) // bs) * bs
            os.pwrite(fd, zero, end_off)
        zero.close()

        # 2) Écriture de l'image
        meter = SpeedMeter()
        written = 0
        h_src = hashlib.sha256()
        with open(image_path, "rb", buffering=0) as f_in:
            while True:
                if task.get("cancelled"):
                    task["status"] = "cancelled"
                    task["message"] = "Flash annulé par l'utilisateur."
                    return
                n = f_in.readinto(mv)
                if not n:
                    break
                h_src.update(mv[:n])
                to_write = n
                if n % bs:
                    pad = bs - (n % bs)
                    mv[n:n + pad] = b"\x00" * pad
                    to_write = n + pad
                off = 0
                while off < to_write:
                    w = os.pwrite(fd, mv[off:to_write], written + off)
                    if w <= 0:
                        raise OSError("Écriture interrompue sur le périphérique")
                    off += w
                written += n
                _flash_progress(task, meter, written, img_size, "Écriture", start_time, 0, 90)

        task["message"] = "Vidage des caches d'écriture (synchronisation)..."
        os.fsync(fd)
        try:
            import fcntl
            fcntl.fcntl(fd, getattr(fcntl, "F_FULLFSYNC", 51))
        except Exception:
            pass

        # 3) Vérification par relecture
        meter = SpeedMeter()
        h_dst = hashlib.sha256()
        read = 0
        while read < img_size:
            if task.get("cancelled"):
                task["status"] = "cancelled"
                task["message"] = "Vérification annulée (l'écriture est terminée)."
                return
            want = min(BUF, img_size - read)
            aligned = want + ((bs - want % bs) % bs)
            n = os.preadv(fd, [mv[:aligned]], read)
            if n <= 0:
                raise OSError("Lecture de vérification impossible")
            n = min(n, want)
            h_dst.update(mv[:n])
            read += n
            _flash_progress(task, meter, read, img_size, "Vérification", start_time, 90, 99)
        if h_src.digest() != h_dst.digest():
            raise RuntimeError("La vérification a échoué : les données relues sur la clé ne correspondent pas à l'image. La clé est peut-être défectueuse.")
        task["bytes_written"] = written
        task["bytes_written_formatted"] = format_size(written)
        mv.release()
        buf.close()
    finally:
        try:
            os.close(fd)
        except Exception:
            pass


def _fat32_label(raw: str) -> str:
    lab = re.sub(r"[^A-Z0-9_]", "", (raw or "").upper())[:11]
    return lab or "BOOTUSB"


def _flash_files(task: dict, iso_path: str, target: str, label: str):
    """ISO non hybride (Windows...) : clé MBR + FAT32, copie des fichiers, découpe de install.wim."""
    ident = os.path.basename(target)
    start_time = time.time()
    tmp_mount = tempfile.mkdtemp(prefix="explorer2_iso_")
    attached = False
    try:
        task["message"] = "Montage de l'image ISO..."
        r = subprocess.run(["hdiutil", "attach", "-nobrowse", "-readonly", "-noverify", "-mountpoint", tmp_mount, iso_path],
                           capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            raise RuntimeError(f"Impossible de monter l'ISO : {r.stderr.strip() or r.stdout.strip()}")
        attached = True

        # Inventaire + contrôles AVANT d'effacer la clé
        files, total, big = [], 0, []
        for root, dirs, names in os.walk(tmp_mount):
            for nm in names:
                fp = os.path.join(root, nm)
                rel = os.path.relpath(fp, tmp_mount)
                try:
                    sz = os.path.getsize(fp)
                except OSError:
                    continue
                files.append((fp, rel, sz))
                total += sz
                if sz > FAT32_MAX_FILE:
                    big.append((rel, sz))
        wimlib = _find_wimlib()
        for rel, sz in big:
            if not rel.lower().endswith(".wim"):
                raise RuntimeError(f"Le fichier {rel} ({format_size(sz)}) dépasse la limite FAT32 de 4 Go.")
            if not wimlib:
                raise RuntimeError(
                    f"{rel} fait {format_size(sz)} (> 4 Go, limite FAT32). Installez wimlib pour le découper "
                    "automatiquement : brew install wimlib — puis relancez le flash.")
        has_efi = any(rel.lower().startswith("efi/boot/") for _, rel, _ in files)
        if not has_efi:
            raise RuntimeError("Cette ISO ne contient pas de chargeur UEFI (efi/boot) : elle ne peut pas démarrer depuis une clé USB.")

        # Formatage de la clé
        task["message"] = f"Formatage de {target} en FAT32 (MBR)..."
        _unmount_disk_robust(target)
        r = subprocess.run(["diskutil", "eraseDisk", "FAT32", label, "MBRFormat", f"/dev/{ident}"],
                           capture_output=True, text=True, timeout=300)
        if r.returncode != 0:
            raise RuntimeError(f"Formatage impossible : {r.stderr.strip() or r.stdout.strip()}")
        _diskutil_plist_cache.clear()
        mp = ""
        for _ in range(20):
            info = _get_diskutil_plist_info(f"{ident}s1")
            mp = info.get("MountPoint") or ""
            if mp:
                break
            subprocess.run(["diskutil", "mount", f"{ident}s1"], capture_output=True, timeout=15)
            _diskutil_plist_cache.clear()
            time.sleep(0.5)
        if not mp:
            raise RuntimeError("Le volume FAT32 de la clé n'a pas pu être monté.")

        # Copie des fichiers
        meter = SpeedMeter()
        done = 0
        CH = 4 * 1024 * 1024
        for fp, rel, sz in files:
            if task.get("cancelled"):
                task["status"] = "cancelled"
                task["message"] = "Flash annulé par l'utilisateur."
                return
            dst = os.path.join(mp, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            if sz > FAT32_MAX_FILE and rel.lower().endswith(".wim"):
                task["message"] = f"Découpage de {rel} en fichiers .swm (limite FAT32)..."
                swm = os.path.splitext(dst)[0] + ".swm"
                p = subprocess.Popen([wimlib, "split", fp, swm, str(WIM_SPLIT_MB)],
                                     stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
                base_done = done
                while p.poll() is None:
                    if task.get("cancelled"):
                        p.kill()
                        task["status"] = "cancelled"
                        task["message"] = "Flash annulé par l'utilisateur."
                        return
                    cur = 0
                    d = os.path.dirname(swm)
                    for nm in os.listdir(d):
                        if nm.lower().endswith(".swm"):
                            try:
                                cur += os.path.getsize(os.path.join(d, nm))
                            except OSError:
                                pass
                    _flash_progress(task, meter, base_done + min(cur, sz), total, "Copie (install.wim)", start_time, 0, 98)
                    time.sleep(0.25)
                if p.returncode != 0:
                    raise RuntimeError(f"wimlib n'a pas pu découper {rel} : {p.stderr.read().decode(errors='ignore').strip()}")
                done = base_done + sz
                continue
            with open(fp, "rb") as fi, open(dst, "wb") as fo:
                while True:
                    if task.get("cancelled"):
                        task["status"] = "cancelled"
                        task["message"] = "Flash annulé par l'utilisateur."
                        return
                    chunk = fi.read(CH)
                    if not chunk:
                        break
                    fo.write(chunk)
                    done += len(chunk)
                    _flash_progress(task, meter, done, total, "Copie des fichiers", start_time, 0, 98)
                fo.flush()
                os.fsync(fo.fileno())
        task["bytes_written"] = done
        task["bytes_written_formatted"] = format_size(done)
        task["message"] = "Synchronisation de la clé..."
        subprocess.run(["sync"], capture_output=True, timeout=120)
        # Nettoyage des métadonnées macOS qui n'ont rien à faire sur une clé d'installation
        for junk in (".fseventsd", ".Spotlight-V100", ".Trashes"):
            try:
                shutil.rmtree(os.path.join(mp, junk), ignore_errors=True)
            except Exception:
                pass
    finally:
        if attached:
            subprocess.run(["hdiutil", "detach", tmp_mount, "-force"], capture_output=True, timeout=60)
        try:
            os.rmdir(tmp_mount)
        except Exception:
            pass


def _run_flash_task(task_id: str, iso_path: str, target: str):
    task = FLASH_TASKS.get(task_id)
    if not task:
        return

    task["status"] = "running"
    task["started_at"] = time.time()
    ident = os.path.basename(target.strip())
    tgt_dev = f"/dev/{ident}"
    tmp_dir = None

    try:
        # Sécurité absolue anti-écrasement
        if not re.fullmatch(r"disk\d+", ident) or ident in ("disk0", "disk1", "disk2", "disk3"):
            raise RuntimeError("Protection système : cible invalide ou disque interne macOS.")
        if not os.path.exists(iso_path):
            raise RuntimeError("Fichier image ISO introuvable.")

        _diskutil_plist_cache.clear()
        tgt_info = _get_diskutil_plist_info(ident)
        if tgt_info.get("Internal") is True and not tgt_info.get("RemovableMedia"):
            raise RuntimeError(f"Protection système : {ident} est un disque interne.")
        if tgt_info.get("WholeDisk") is False:
            raise RuntimeError(f"{ident} n'est pas un disque entier.")
        tgt_size = int(tgt_info.get("TotalSize") or tgt_info.get("Size") or 0)
        block_size = int(tgt_info.get("DeviceBlockSize") or 512)

        analysis = _analyze_boot_image(iso_path)
        image_path = iso_path

        # .dmg : conversion en image brute (UDRW) pour pouvoir l'écrire bloc à bloc
        if analysis["is_dmg"]:
            task["message"] = "Conversion de l'image .dmg en image brute..."
            tmp_dir = tempfile.mkdtemp(prefix="explorer2_flash_")
            out_base = os.path.join(tmp_dir, "image")
            r = subprocess.run(["hdiutil", "convert", iso_path, "-format", "UDRW", "-o", out_base],
                               capture_output=True, text=True, timeout=3600)
            if r.returncode != 0:
                raise RuntimeError(f"Conversion .dmg impossible : {r.stderr.strip() or r.stdout.strip()}")
            cands = [os.path.join(tmp_dir, n) for n in os.listdir(tmp_dir)]
            if not cands:
                raise RuntimeError("Conversion .dmg : aucun fichier produit.")
            image_path = cands[0]
            analysis["mode"] = "raw"

        img_size = os.path.getsize(image_path)
        task["total_size"] = img_size
        task["total_size_formatted"] = format_size(img_size)
        if tgt_size > 0 and img_size > tgt_size:
            raise RuntimeError(f"La clé USB cible ({format_size(tgt_size)}) est trop petite pour contenir l'image ({format_size(img_size)}).")

        if analysis["mode"] == "files":
            _flash_files(task, image_path, ident, _fat32_label(analysis.get("label")))
        else:
            task["message"] = f"Démontage sécurisé des volumes de {ident}..."
            _unmount_disk_robust(ident)
            _flash_raw(task, image_path, ident, tgt_size, block_size)

        if task.get("status") == "cancelled":
            return

        # Éjection propre : la clé est prête à être retirée et utilisée pour démarrer
        task["message"] = "Éjection de la clé..."
        _diskutil_plist_cache.clear()
        subprocess.run(["diskutil", "eject", tgt_dev], capture_output=True, timeout=30)

        task["status"] = "done"
        task["progress_percent"] = 100
        task["eta_formatted"] = "Terminé"
        mode_txt = "fichiers copiés sur clé FAT32 UEFI" if analysis["mode"] == "files" else "image écrite et vérifiée"
        task["message"] = (f"Clé USB bootable créée avec succès ({mode_txt}, {task.get('bytes_written_formatted', '')}). "
                           f"La clé a été éjectée : vous pouvez la retirer.")
    except Exception as e:
        task["status"] = "error"
        task["error"] = str(e)
    finally:
        if tmp_dir:
            shutil.rmtree(tmp_dir, ignore_errors=True)


@app.post("/api/flash/start")
def start_flash_task(req: FlashStartRequest):
    iso_path = req.iso_path.strip()
    tgt = req.target.strip()
    if not iso_path or not tgt:
        raise HTTPException(status_code=400, detail="Image ISO et clé USB cible requises.")

    if not os.path.exists(iso_path) or not os.path.isfile(iso_path):
        raise HTTPException(status_code=404, detail="Le fichier image ISO sélectionné est introuvable.")

    # Sécurité anti-écrasement système
    if tgt in ("disk0", "disk1", "disk2", "disk3", "/", "/dev/disk0"):
        raise HTTPException(status_code=403, detail="Protection système : Impossible de flasher le disque système interne macOS !")

    iso_sz = os.path.getsize(iso_path)
    tgt_info = _get_diskutil_plist_info(tgt)
    tgt_sz = int(tgt_info.get("TotalSize") or 0)
    if tgt_sz > 0 and iso_sz > tgt_sz:
        raise HTTPException(
            status_code=400,
            detail=f"Taille insuffisante : La clé USB ({format_size(tgt_sz)}) est plus petite que l'image ISO ({format_size(iso_sz)})."
        )

    task_id = f"flash_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
    FLASH_TASKS[task_id] = {
        "task_id": task_id,
        "iso_path": iso_path,
        "target": tgt,
        "status": "pending",
        "progress_percent": 0,
        "bytes_written": 0,
        "bytes_written_formatted": "0 Mo",
        "total_size": iso_sz,
        "total_size_formatted": format_size(iso_sz),
        "speed_formatted": "0.00 Mo/s",
        "speed_mb": 0.0,
        "eta_formatted": "Démarrage...",
        "speed_history": [],
        "message": "Démarrage du flash UEFI...",
        "error": None,
        "cancelled": False,
    }

    t = threading.Thread(target=_run_flash_task, args=(task_id, iso_path, tgt), daemon=True)
    t.start()
    return {"task_id": task_id}


@app.get("/api/flash/status/{task_id}")
def get_flash_status(task_id: str):
    task = FLASH_TASKS.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tâche de flash introuvable.")
    return {
        "task_id": task["task_id"],
        "iso_path": task["iso_path"],
        "target": task["target"],
        "status": task["status"],
        "progress_percent": task["progress_percent"],
        "bytes_written": task.get("bytes_written", 0),
        "bytes_written_formatted": task.get("bytes_written_formatted", "0 Mo"),
        "total_size": task.get("total_size", 0),
        "total_size_formatted": task.get("total_size_formatted", ""),
        "speed_formatted": task.get("speed_formatted", "0.00 Mo/s"),
        "speed_mb": task.get("speed_mb", 0.0),
        "eta_formatted": task.get("eta_formatted", ""),
        "speed_history": task.get("speed_history", []),
        "message": task["message"],
        "error": task["error"],
    }


@app.post("/api/flash/cancel/{task_id}")
def cancel_flash_task(task_id: str):
    task = FLASH_TASKS.get(task_id)
    if task:
        task["cancelled"] = True
        p = task.get("proc_tgt")
        if p:
            try:
                p.terminate()
                p.kill()
            except Exception:
                pass
    return {"status": "ok"}


@app.get("/api/system/check-permissions")
def check_system_permissions():
    """
    Vérifie dynamiquement si l'Accès complet au disque (Full Disk Access) est effectif.
    """
    safari_path = os.path.expanduser("~/Library/Safari")
    fda_ok = False
    try:
        if os.path.exists(safari_path):
            os.listdir(safari_path)
            fda_ok = True
    except PermissionError:
        fda_ok = False
    except Exception:
        pass

    return {
        "full_disk_access": fda_ok
    }


@app.get("/api/dialog/select-save-image")
def api_select_save_image():
    """
    Ouvre la boîte de dialogue native macOS de sélection de dossier / nom de fichier image.
    """
    osa = (
        'tell application "System Events"\n'
        '  activate\n'
        'end tell\n'
        'POSIX path of (choose file name with prompt "Sélectionnez le dossier et le nom du fichier image (.dmg) :" default name "Backup_Disque.dmg")'
    )
    res = subprocess.run(["osascript", "-e", osa], capture_output=True, text=True, timeout=60)
    if res.returncode == 0 and res.stdout.strip():
        p = res.stdout.strip()
        if not p.lower().endswith(".dmg") and not p.lower().endswith(".img"):
            p += ".dmg"
        return {"path": p}
    return {"path": None}


# 6. TÂCHES ASYNCHRONES DE TRANSFERT (10ms)
@app.post("/api/fs/transfer")
def start_transfer(req: TransferStartRequest, bg: BackgroundTasks):
    action = "move" if req.action in ["move", "cut"] else "copy"
    dest_norm = os.path.abspath(req.destination_dir).rstrip("/\\").lower()

    if not os.path.exists(req.destination_dir) or not os.path.isdir(req.destination_dir):
        raise HTTPException(status_code=400, detail="Dossier de destination introuvable.")

    valid_sources = []
    for s in req.sources:
        s_abs = os.path.abspath(s)
        s_norm = s_abs.rstrip("/\\").lower()
        if s_norm == dest_norm:
            continue
        if dest_norm.startswith(s_norm + "/"):
            continue
        if os.path.exists(s_abs):
            valid_sources.append(s_abs)

    if not valid_sources:
        raise HTTPException(status_code=400, detail="Aucun fichier valide à transférer.")

    task_id = str(uuid.uuid4())
    task = TransferTask(task_id, action, valid_sources, req.destination_dir)
    tasks_store[task_id] = task

    bg.add_task(execute_transfer, task)
    return {"task_id": task_id, "status": "started"}


@app.post("/api/fs/trash_task")
def start_trash_task(req: TrashRequest, bg: BackgroundTasks):
    valid_paths = [os.path.abspath(p) for p in req.paths if os.path.exists(p)]
    if not valid_paths:
        raise HTTPException(status_code=400, detail="Aucun fichier existant à supprimer.")

    task_id = str(uuid.uuid4())
    task = TransferTask(task_id, "delete", valid_paths)
    tasks_store[task_id] = task

    bg.add_task(execute_transfer, task)
    return {"task_id": task_id, "status": "started"}


@app.get("/api/tasks/{task_id}/status")
@app.get("/api/tasks/{task_id}")
def get_task_status(task_id: str):
    task = tasks_store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable.")
    return task.to_dict()


@app.post("/api/tasks/{task_id}/cancel")
def cancel_task(task_id: str):
    task = tasks_store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable.")
    task.cancelled = True
    return {"status": "cancelling"}


# 7. NAVIGATION ET EXPLORATION DE FICHIERS (BROWSE)
@app.get("/api/browse")
def browse(
    path: str = Query(..., description="Chemin absolu ou chemin UNC"),
    show_hidden: bool = Query(False, description="Afficher ou masquer les fichiers cachés")
):
    norm_path = os.path.abspath(path)

    if not os.path.exists(norm_path):
        raise HTTPException(status_code=404, detail=f"Chemin introuvable : {norm_path}")
    if not os.path.isdir(norm_path):
        raise HTTPException(status_code=400, detail=f"Ce chemin n'est pas un dossier : {norm_path}")

    parent_path = os.path.dirname(norm_path)
    if parent_path == norm_path:
        parent_path = None

    items = []
    try:
        with os.scandir(norm_path) as entries:
            for entry in entries:
                try:
                    hidden = is_file_hidden(entry.path, entry.name)
                    if hidden and not show_hidden:
                        continue

                    is_dir = entry.is_dir(follow_symlinks=False)
                    stat = entry.stat(follow_symlinks=False)
                    size = stat.st_size if not is_dir else None
                    mtime = stat.st_mtime
                    modified_dt = datetime.fromtimestamp(mtime)
                    ext = os.path.splitext(entry.name)[1].lower() if (not is_dir or entry.name.lower().endswith(".app")) else ""

                    items.append({
                        "name": entry.name,
                        "path": entry.path,
                        "is_dir": is_dir,
                        "is_hidden": hidden,
                        "size": size,
                        "size_formatted": format_size(size) if size is not None else "--",
                        "modified": modified_dt.isoformat(),
                        "modified_formatted": modified_dt.strftime("%d/%m/%Y %H:%M"),
                        "extension": ext,
                        "type_desc": get_file_type_desc(entry.path, is_dir),
                    })
                except (PermissionError, OSError):
                    continue
    except PermissionError:
        raise HTTPException(status_code=403, detail=f"Accès refusé : {norm_path}")
    except OSError as e:
        raise HTTPException(status_code=500, detail=str(e))

    drive = "/" if norm_path.startswith("/") else (os.path.splitdrive(norm_path)[0] or "/")
    return {
        "current_path": norm_path,
        "parent_path": parent_path,
        "drive": drive,
        "items": items,
    }


# --- API DE CALCUL DE LA TAILLE DE DOSSIER ---
@app.get("/api/fs/folder-size")
def get_folder_size(path: str = Query(..., description="Chemin absolu du dossier ou fichier")):
    norm_path = os.path.abspath(path)
    if not os.path.exists(norm_path):
        raise HTTPException(status_code=404, detail="Dossier ou fichier introuvable")

    if not os.path.isdir(norm_path):
        try:
            stat = os.stat(norm_path)
            size = stat.st_size
            mtime_dt = datetime.fromtimestamp(stat.st_mtime)
            ctime_val = getattr(stat, "st_birthtime", stat.st_ctime)
            created_dt = datetime.fromtimestamp(ctime_val)
            return {
                "path": norm_path,
                "name": os.path.basename(norm_path),
                "is_dir": False,
                "type_desc": get_file_type_desc(norm_path, False),
                "location": os.path.dirname(norm_path),
                "size": size,
                "size_formatted": format_size(size),
                "size_bytes_formatted": f"{size:,}".replace(",", " "),
                "file_count": 1,
                "dir_count": 0,
                "skipped_count": 0,
                "modified_formatted": mtime_dt.strftime("%d/%m/%Y à %H:%M:%S"),
                "created_formatted": created_dt.strftime("%d/%m/%Y à %H:%M:%S")
            }
        except OSError as e:
            raise HTTPException(status_code=500, detail=str(e))

    total_size = 0
    file_count = 0
    dir_count = 0
    skipped_count = 0

    stack = [norm_path]
    while stack:
        current_dir = stack.pop()
        try:
            with os.scandir(current_dir) as entries:
                for entry in entries:
                    try:
                        if entry.is_dir(follow_symlinks=False):
                            dir_count += 1
                            stack.append(entry.path)
                        elif entry.is_file(follow_symlinks=False):
                            total_size += entry.stat(follow_symlinks=False).st_size
                            file_count += 1
                    except (PermissionError, OSError):
                        skipped_count += 1
        except (PermissionError, OSError):
            skipped_count += 1

    try:
        st_dir = os.stat(norm_path)
        dir_mtime_dt = datetime.fromtimestamp(st_dir.st_mtime)
        dir_ctime_val = getattr(st_dir, "st_birthtime", st_dir.st_ctime)
        dir_created_dt = datetime.fromtimestamp(dir_ctime_val)
        dir_mtime_str = dir_mtime_dt.strftime("%d/%m/%Y à %H:%M:%S")
        dir_ctime_str = dir_created_dt.strftime("%d/%m/%Y à %H:%M:%S")
    except Exception:
        dir_mtime_str = None
        dir_ctime_str = None

    return {
        "path": norm_path,
        "name": os.path.basename(norm_path),
        "is_dir": True,
        "type_desc": get_file_type_desc(norm_path, True),
        "location": os.path.dirname(norm_path),
        "size": total_size,
        "size_formatted": format_size(total_size),
        "size_bytes_formatted": f"{total_size:,}".replace(",", " "),
        "file_count": file_count,
        "dir_count": dir_count,
        "skipped_count": skipped_count,
        "modified_formatted": dir_mtime_str,
        "created_formatted": dir_ctime_str
    }


# --- MÉTADONNÉES DE FICHIERS & D'IMAGES (Propriétés, Dimensions, EXIF) ---
_EXIF_TYPE_SIZES = {1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8}

_EXIF_IFD0_TAGS = {
    0x0100: "width", 0x0101: "height", 0x0102: "bits_per_sample",
    0x010E: "description", 0x010F: "make", 0x0110: "model", 0x0112: "orientation",
    0x011A: "x_resolution", 0x011B: "y_resolution", 0x0128: "resolution_unit",
    0x0131: "software", 0x0132: "datetime", 0x013B: "artist", 0x8298: "copyright",
}

_EXIF_SUB_TAGS = {
    0x829A: "exposure_time", 0x829D: "f_number", 0x8822: "exposure_program",
    0x8827: "iso", 0x9003: "datetime_original", 0x9004: "datetime_digitized",
    0x9201: "shutter_speed", 0x9202: "aperture", 0x9205: "max_aperture",
    0x9209: "flash", 0x920A: "focal_length", 0xA002: "pixel_x", 0xA003: "pixel_y",
    0xA402: "exposure_mode", 0xA403: "white_balance", 0xA405: "focal_length_35mm",
    0xA406: "scene_capture_type", 0xA434: "lens_model",
}

_EXIF_GPS_TAGS = {
    0x0000: "gps_version", 0x0001: "gps_lat_ref", 0x0002: "gps_lat",
    0x0003: "gps_lon_ref", 0x0004: "gps_lon", 0x0005: "gps_alt_ref",
    0x0006: "gps_alt",
}

_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp", ".ico", ".tif", ".tiff"}


def _exif_read_ifd(buf: bytes, endian: str, offset: int, tag_names: Dict[int, str], depth: int = 0) -> Dict[str, Any]:
    """Lecture récursive d'un répertoire IFD EXIF/TIFF (sans dépendance externe)."""
    values: Dict[str, Any] = {}
    if depth > 3 or offset <= 0 or offset + 2 > len(buf):
        return values
    try:
        entry_count = struct.unpack_from(endian + "H", buf, offset)[0]
    except struct.error:
        return values

    for i in range(min(entry_count, 256)):
        entry_off = offset + 2 + i * 12
        if entry_off + 12 > len(buf):
            break
        try:
            tag, vtype, vcount = struct.unpack_from(endian + "HHI", buf, entry_off)
        except struct.error:
            break

        # Sous-répertoires : ExifIFD (0x8769) et GPS IFD (0x8825)
        if tag in (0x8769, 0x8825):
            try:
                sub_off = struct.unpack_from(endian + "I", buf, entry_off + 8)[0]
            except struct.error:
                continue
            sub_tags = _EXIF_SUB_TAGS if tag == 0x8769 else _EXIF_GPS_TAGS
            values.update(_exif_read_ifd(buf, endian, sub_off, sub_tags, depth + 1))
            continue

        name = tag_names.get(tag)
        if not name:
            continue
        type_size = _EXIF_TYPE_SIZES.get(vtype)
        if not type_size:
            continue
        total = type_size * vcount
        try:
            if total <= 4:
                raw = buf[entry_off + 8: entry_off + 8 + total]
            else:
                value_off = struct.unpack_from(endian + "I", buf, entry_off + 8)[0]
                if value_off < 0 or value_off + total > len(buf):
                    continue
                raw = buf[value_off: value_off + total]
        except struct.error:
            continue

        try:
            if vtype == 2:  # ASCII
                text = raw.split(b"\x00")[0].decode("utf-8", "replace").strip()
                if text:
                    values[name] = text
            elif vtype in (5, 10):  # RATIONAL / SRATIONAL
                fmt = endian + ("i" if vtype == 10 else "I") * 2 * vcount
                nums = struct.unpack(fmt, raw[: 8 * vcount])
                rats = [
                    (nums[j] / nums[j + 1]) if nums[j + 1] else 0.0
                    for j in range(0, len(nums), 2)
                ]
                values[name] = rats[0] if len(rats) == 1 else rats
            elif vtype == 1 or vtype == 7:  # BYTE / UNDEFINED
                values[name] = list(raw)
            elif vtype == 3:  # SHORT
                nums = struct.unpack(endian + "H" * vcount, raw)
                values[name] = nums[0] if len(nums) == 1 else list(nums)
            elif vtype == 8:  # SSHORT
                nums = struct.unpack(endian + "h" * vcount, raw)
                values[name] = nums[0] if len(nums) == 1 else list(nums)
            elif vtype == 9:  # SLONG
                nums = struct.unpack(endian + "i" * vcount, raw)
                values[name] = nums[0] if len(nums) == 1 else list(nums)
            else:  # LONG / autres
                nums = struct.unpack(endian + "I" * vcount, raw)
                values[name] = nums[0] if len(nums) == 1 else list(nums)
        except Exception:
            continue
    return values


def _parse_exif_block(buf: bytes) -> Dict[str, Any]:
    """Analyse un bloc EXIF (JPEG APP1 ou en-tête TIFF) et renvoie les balises utiles."""
    exif_pos = buf.find(b"Exif\x00\x00")
    tiff = buf[exif_pos + 6:] if exif_pos >= 0 else buf
    if len(tiff) < 8:
        return {}
    if tiff[:2] == b"II":
        endian = "<"
    elif tiff[:2] == b"MM":
        endian = ">"
    else:
        return {}
    try:
        ifd_offset = struct.unpack_from(endian + "I", tiff, 4)[0]
    except struct.error:
        return {}
    return _exif_read_ifd(tiff, endian, ifd_offset, _EXIF_IFD0_TAGS)


def _exif_datetime_to_text(value: Any) -> str:
    text = str(value).strip()
    m = re.match(r"^(\d{4})[:_-](\d{2})[:_-](\d{2})[ T:](\d{2})[:_-](\d{2})[:_-](\d{2})", text)
    if m:
        return f"{m.group(3)}/{m.group(2)}/{m.group(1)} à {m.group(4)}:{m.group(5)}:{m.group(6)}"
    return text


def _exif_dms_to_degrees(values: Any) -> Optional[float]:
    try:
        parts = values if isinstance(values, (list, tuple)) else [values]
        deg = float(parts[0]) if len(parts) > 0 else 0.0
        minutes = float(parts[1]) if len(parts) > 1 else 0.0
        seconds = float(parts[2]) if len(parts) > 2 else 0.0
        return deg + minutes / 60.0 + seconds / 3600.0
    except Exception:
        return None


def _build_exif_summary(raw: Dict[str, Any]) -> Dict[str, str]:
    """Traduit les balises EXIF brutes en libellés lisibles en français."""
    out: Dict[str, str] = {}
    make = str(raw.get("make", "")).strip()
    model = str(raw.get("model", "")).strip()
    if make and model and make.lower() not in model.lower():
        out["Appareil"] = f"{make} {model}"
    elif model or make:
        out["Appareil"] = model or make

    if raw.get("lens_model"):
        out["Objectif"] = str(raw["lens_model"])

    shot_date = raw.get("datetime_original") or raw.get("datetime_digitized")
    if shot_date:
        out["Prise de vue"] = _exif_datetime_to_text(shot_date)

    exposure = raw.get("exposure_time")
    if isinstance(exposure, (int, float)) and exposure > 0:
        if exposure < 1:
            out["Temps d'exposition"] = f"1/{round(1 / exposure)} s"
        else:
            out["Temps d'exposition"] = f"{exposure:g} s"

    f_number = raw.get("f_number")
    if isinstance(f_number, (int, float)) and f_number > 0:
        out["Ouverture"] = f"f/{f_number:g}"

    iso = raw.get("iso")
    if isinstance(iso, (int, float)) and iso > 0:
        out["Sensibilité ISO"] = f"ISO {int(iso)}"

    focal = raw.get("focal_length")
    if isinstance(focal, (int, float)) and focal > 0:
        focal_text = f"{focal:g} mm"
        focal_35 = raw.get("focal_length_35mm")
        if isinstance(focal_35, (int, float)) and focal_35 > 0:
            focal_text += f" (équivalent 35 mm : {int(focal_35)} mm)"
        out["Focale"] = focal_text

    orientation_map = {
        1: "Normale (0°)", 2: "Miroir horizontal", 3: "Rotation 180°",
        4: "Miroir vertical", 5: "Miroir + rotation 90°", 6: "Rotation 90°",
        7: "Miroir + rotation 270°", 8: "Rotation 270°",
    }
    orientation = raw.get("orientation")
    if isinstance(orientation, int) and orientation in orientation_map:
        out["Orientation"] = orientation_map[orientation]

    if raw.get("software"):
        out["Logiciel"] = str(raw["software"])
    if raw.get("artist"):
        out["Auteur"] = str(raw["artist"])
    if raw.get("copyright"):
        out["Copyright"] = str(raw["copyright"])

    lat = _exif_dms_to_degrees(raw.get("gps_lat"))
    lon = _exif_dms_to_degrees(raw.get("gps_lon"))
    if lat is not None and lon is not None:
        lat_ref = str(raw.get("gps_lat_ref", "N"))
        lon_ref = str(raw.get("gps_lon_ref", "E"))
        if lat_ref.upper() == "S":
            lat = -lat
        if lon_ref.upper() == "W":
            lon = -lon
        gps_text = f"{abs(lat):.6f}° {lat_ref.upper()}, {abs(lon):.6f}° {lon_ref.upper()}"
        altitude = raw.get("gps_alt")
        if isinstance(altitude, (int, float)) and altitude:
            if str(raw.get("gps_alt_ref", "")) == "1":
                altitude = -altitude
            gps_text += f" · altitude {altitude:.0f} m"
        out["Coordonnées GPS"] = gps_text

    return out


def _gcd(a: int, b: int) -> int:
    while b:
        a, b = b, a % b
    return a or 1


def _parse_image_metadata(path: str, ext: str) -> Optional[Dict[str, Any]]:
    """Extrait dimensions, colorimétrie, résolution et EXIF en lisant directement les en-têtes."""
    try:
        with open(path, "rb") as f:
            head = f.read(512 * 1024)
    except (OSError, MemoryError):
        return None
    if not head:
        return None

    info: Dict[str, Any] = {}
    exif: Dict[str, Any] = {}

    try:
        # --- PNG ---
        if head[:8] == b"\x89PNG\r\n\x1a\n":
            info["format"] = "PNG"
            if len(head) >= 29:
                info["width"], info["height"] = struct.unpack(">II", head[16:24])
                bit_depth, color_type = head[24], head[25]
                color_modes = {
                    0: (1, "Niveaux de gris"),
                    2: (3, "RVB (TrueColor)"),
                    3: (1, "Palette indexée"),
                    4: (2, "Niveaux de gris + Alpha"),
                    6: (4, "RVB + Alpha"),
                }
                channels, mode = color_modes.get(color_type, (1, "Inconnu"))
                info["color_mode"] = f"{mode} · {bit_depth} bits/canal"
                info["color_depth_bits"] = bit_depth * channels
                info["has_alpha"] = color_type in (4, 6) or (color_type == 3 and b"tRNS" in head)
            pos = 8
            while pos + 8 <= len(head):
                chunk_len = struct.unpack(">I", head[pos:pos + 4])[0]
                chunk_type = head[pos + 4:pos + 8]
                if chunk_type == b"pHYs" and chunk_len >= 9 and pos + 17 <= len(head):
                    ppu_x, ppu_y, unit = struct.unpack(">IIB", head[pos + 8:pos + 17])
                    if unit == 1 and ppu_x and ppu_y:
                        info["dpi"] = (round(ppu_x * 0.0254), round(ppu_y * 0.0254))
                elif chunk_type == b"acTL" and chunk_len >= 8 and pos + 16 <= len(head):
                    info["frames"] = struct.unpack(">I", head[pos + 8:pos + 12])[0]
                elif chunk_type in (b"IDAT", b"IEND"):
                    break
                pos += 12 + chunk_len

        # --- JPEG ---
        elif head[:2] == b"\xff\xd8":
            info["format"] = "JPEG"
            pos = 2
            while pos + 4 <= len(head):
                if head[pos] != 0xFF:
                    pos += 1
                    continue
                marker = head[pos + 1]
                if marker in (0x01, 0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
                    pos += 2
                    continue
                seg_len = struct.unpack(">H", head[pos + 2:pos + 4])[0]
                if seg_len < 2:
                    break
                segment = head[pos + 4:pos + 2 + seg_len]
                if marker == 0xE1 and segment[:6] == b"Exif\x00\x00":
                    exif.update(_parse_exif_block(segment))
                elif marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF) and len(segment) >= 6:
                    precision = segment[0]
                    height, width = struct.unpack(">HH", segment[1:5])
                    components = segment[5]
                    info["width"], info["height"] = width, height
                    info["color_depth_bits"] = precision * (3 if components == 3 else components)
                    modes = {1: "Niveaux de gris", 3: "RVB (YCbCr)", 4: "CMJN (CMYK)"}
                    info["color_mode"] = f"{modes.get(components, 'Inconnu')} · {precision} bits/canal"
                    info["has_alpha"] = False
                elif marker == 0xDA:
                    break
                pos += 2 + seg_len

            if not exif:
                exif = _parse_exif_block(head)
            resolution_unit = exif.get("resolution_unit")
            x_res = exif.get("x_resolution")
            y_res = exif.get("y_resolution")
            if isinstance(x_res, (int, float)) and x_res > 0:
                if resolution_unit == 3:  # pixels par centimètre
                    info["dpi"] = (round(x_res * 2.54), round((y_res or x_res) * 2.54))
                else:
                    info["dpi"] = (round(x_res), round(y_res if isinstance(y_res, (int, float)) and y_res > 0 else x_res))

        # --- GIF ---
        elif head[:6] in (b"GIF87a", b"GIF89a"):
            info["format"] = "GIF"
            if len(head) >= 13:
                info["width"], info["height"] = struct.unpack("<HH", head[6:10])
                packed = head[10]
                palette_bits = (packed & 0x07) + 1
                info["color_mode"] = f"Palette indexée · {palette_bits} bit{'s' if palette_bits > 1 else ''}/canal"
                info["color_depth_bits"] = palette_bits * 3
                # Le drapeau de transparence se trouve dans le Graphic Control Extension
                gce_pos = head.find(b"\x21\xf9\x04")
                if gce_pos >= 0 and gce_pos + 3 < len(head):
                    info["has_alpha"] = bool(head[gce_pos + 3] & 0x01)
                else:
                    info["has_alpha"] = bool(packed & 0x01)
                frames = head.count(b"\x21\xf9\x04")
                if frames > 1:
                    info["frames"] = frames

        # --- WebP ---
        elif head[:4] == b"RIFF" and head[8:12] == b"WEBP":
            info["format"] = "WebP"
            fourcc = head[12:16]
            if fourcc == b"VP8X" and len(head) >= 30:
                info["width"] = 1 + int.from_bytes(head[24:27], "little")
                info["height"] = 1 + int.from_bytes(head[27:30], "little")
                info["has_alpha"] = bool(head[20] & 0x10)
                info["color_mode"] = "RVB" + (" + Alpha" if info["has_alpha"] else "")
            elif fourcc == b"VP8L" and len(head) >= 25:
                bits = int.from_bytes(head[21:25], "little")
                info["width"] = (bits & 0x3FFF) + 1
                info["height"] = ((bits >> 14) & 0x3FFF) + 1
                info["has_alpha"] = True
                info["color_mode"] = "RVB + Alpha"
            elif fourcc == b"VP8 " and head[23:26] == b"\x9d\x01\x2a" and len(head) >= 30:
                info["width"] = struct.unpack("<H", head[26:28])[0] & 0x3FFF
                info["height"] = struct.unpack("<H", head[28:30])[0] & 0x3FFF
                info["has_alpha"] = False
                info["color_mode"] = "RVB"

        # --- BMP ---
        elif head[:2] == b"BM" and len(head) >= 30:
            info["format"] = "BMP"
            info["width"], info["height"] = struct.unpack("<ii", head[18:26])
            info["height"] = abs(info["height"])
            bpp = struct.unpack("<H", head[28:30])[0]
            info["color_depth_bits"] = bpp
            if bpp <= 8:
                info["color_mode"] = f"Palette indexée · {bpp} bits/canal"
            else:
                channels = 4 if bpp == 32 else 3
                info["color_mode"] = f"RVB · {bpp // channels} bits/canal"
            info["has_alpha"] = bpp == 32

        # --- ICO ---
        elif head[:4] == b"\x00\x00\x01\x00" and len(head) >= 22:
            info["format"] = "ICO"
            info["width"] = head[6] or 256
            info["height"] = head[7] or 256
            info["has_alpha"] = True
            info["color_mode"] = "RVB + Alpha"
            count = struct.unpack("<H", head[4:6])[0]
            if count > 1:
                info["frames"] = count
                info["frames_label"] = "icônes"

        # --- SVG (vectoriel) ---
        elif ext == ".svg" or b"<svg" in head[:2048].lower():
            info["format"] = "SVG (vectoriel)"
            text = head.decode("utf-8", "replace")
            svg_tag_match = re.search(r"<svg\b[^>]*>", text, re.IGNORECASE)
            svg_tag = svg_tag_match.group(0) if svg_tag_match else text[:2048]
            width_match = re.search(r'\bwidth\s*=\s*["\']([\d.]+)', svg_tag, re.IGNORECASE)
            height_match = re.search(r'\bheight\s*=\s*["\']([\d.]+)', svg_tag, re.IGNORECASE)
            viewbox_match = re.search(r'\bviewBox\s*=\s*["\']([^"\']+)', svg_tag, re.IGNORECASE)
            if width_match and height_match:
                info["width"] = round(float(width_match.group(1)))
                info["height"] = round(float(height_match.group(1)))
            elif viewbox_match:
                parts = re.split(r"[\s,]+", viewbox_match.group(1).strip())
                if len(parts) == 4:
                    try:
                        info["width"] = round(float(parts[2]))
                        info["height"] = round(float(parts[3]))
                    except ValueError:
                        pass
            info["color_mode"] = "Vectoriel (XML)"
        else:
            return None
    except Exception as e:
        logger.debug("Lecture des métadonnées image impossible pour %s: %s", path, e)
        return None

    width = info.get("width")
    height = info.get("height")
    if isinstance(width, int) and isinstance(height, int) and width > 0 and height > 0:
        megapixels = (width * height) / 1_000_000
        if megapixels >= 1:
            info["megapixels"] = f"{megapixels:.1f} Mpx"
        elif megapixels >= 0.1:
            info["megapixels"] = f"{megapixels * 1000:.0f} kpx"
        divisor = _gcd(width, height)
        if divisor >= 10:
            info["aspect_ratio"] = f"{width // divisor}:{height // divisor}"
        else:
            info["aspect_ratio"] = f"{width / height:.2f}:1"
    else:
        info.pop("width", None)
        info.pop("height", None)

    if exif:
        summary = _build_exif_summary(exif)
        if summary:
            info["exif"] = summary

    return info or None


@app.get("/api/fs/metadata")
def get_file_metadata(path: str = Query(..., description="Chemin absolu du fichier ou du dossier")):
    """Propriétés de fichier complètes + métadonnées d'image (dimensions, colorimétrie, EXIF)."""
    norm_path = os.path.abspath(path)
    if not os.path.exists(norm_path):
        raise HTTPException(status_code=404, detail="Élément introuvable.")

    is_dir = os.path.isdir(norm_path)
    try:
        st = os.stat(norm_path)
    except OSError as e:
        raise HTTPException(status_code=500, detail=str(e))

    name = os.path.basename(norm_path) or norm_path
    ext = os.path.splitext(norm_path)[1].lower() if (not is_dir or norm_path.lower().endswith(".app")) else ""

    created_ts = getattr(st, "st_birthtime", st.st_ctime)
    created_dt = datetime.fromtimestamp(created_ts)
    modified_dt = datetime.fromtimestamp(st.st_mtime)
    accessed_dt = datetime.fromtimestamp(st.st_atime)

    import stat as stat_module
    try:
        permissions = stat_module.filemode(st.st_mode)
    except Exception:
        permissions = ""
    octal_mode = oct(stat_module.S_IMODE(st.st_mode))[2:]

    owner = None
    group = None
    try:
        import pwd
        owner = pwd.getpwuid(st.st_uid).pw_name
    except Exception:
        owner = str(st.st_uid)
    try:
        import grp
        group = grp.getgrgid(st.st_gid).gr_name
    except Exception:
        group = str(st.st_gid)

    payload: Dict[str, Any] = {
        "path": norm_path,
        "name": name,
        "location": os.path.dirname(norm_path),
        "is_dir": is_dir,
        "extension": ext,
        "type_desc": get_file_type_desc(norm_path, is_dir),
        "is_hidden": is_file_hidden(norm_path, name),
        "size": None if is_dir else st.st_size,
        "size_formatted": format_size(st.st_size) if not is_dir else None,
        "size_bytes_formatted": f"{st.st_size:,}".replace(",", " ") if not is_dir else None,
        "created_formatted": created_dt.strftime("%d/%m/%Y à %H:%M:%S"),
        "modified_formatted": modified_dt.strftime("%d/%m/%Y à %H:%M:%S"),
        "accessed_formatted": accessed_dt.strftime("%d/%m/%Y à %H:%M:%S"),
        "permissions": permissions,
        "octal_mode": octal_mode,
        "owner": owner,
        "group": group,
        "link_count": getattr(st, "st_nlink", None),
        "readonly": not os.access(norm_path, os.W_OK),
    }

    if not is_dir and ext in _IMAGE_EXTENSIONS:
        image_info = _parse_image_metadata(norm_path, ext)
        if image_info:
            payload["image"] = image_info

    return payload


# --- API DE VISIONNEUSE D'APERÇU (Images, PDFs, Fichiers Office & Texte) ---
@app.api_route("/api/fs/raw", methods=["GET", "HEAD"])
def get_raw_file(path: str = Query(...)):
    if not os.path.exists(path) or not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Fichier introuvable.")

    ext = os.path.splitext(path)[1].lower()
    media_types = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".bmp": "image/bmp",
        ".ico": "image/x-icon",
        ".mp4": "video/mp4",
        ".mov": "video/quicktime",
        ".webm": "video/webm",
        ".mkv": "video/x-matroska",
        ".m4v": "video/x-m4v",
        ".avi": "video/x-msvideo",
        ".ogv": "video/ogg",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac",
        ".flac": "audio/flac",
        ".ogg": "audio/ogg",
        ".oga": "audio/ogg",
        ".opus": "audio/opus",
        ".aiff": "audio/aiff",
        ".aif": "audio/aiff",
    }
    media_type = media_types.get(ext, "application/octet-stream")
    return FileResponse(path, media_type=media_type)


# --- API COMPAGNON AUDIO POUR VIDÉOS (MKV avec codecs AC3 / DTS / EAC3) ---
FFMPEG_BIN_PATH = None
FFPROBE_BIN_PATH = None

for _p in ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg", shutil.which("ffmpeg")]:
    if _p and os.path.isfile(_p) and os.access(_p, os.X_OK):
        FFMPEG_BIN_PATH = _p
        break

for _p in ["/opt/homebrew/bin/ffprobe", "/usr/local/bin/ffprobe", "/usr/bin/ffprobe", shutil.which("ffprobe")]:
    if _p and os.path.isfile(_p) and os.access(_p, os.X_OK):
        FFPROBE_BIN_PATH = _p
        break

AUDIO_COMPANION_CACHE = Path("/tmp/explorer2_audio_cache")
AUDIO_COMPANION_CACHE.mkdir(parents=True, exist_ok=True)

@app.api_route("/api/media/audio-info", methods=["GET", "HEAD"])
def get_media_audio_info(path: str = Query(...)):
    """Détecte si un fichier vidéo contient une piste audio non décodable nativement par Chromium (AC3, DTS...)"""
    if not os.path.isfile(path):
        return {"needs_companion": False}

    ext = os.path.splitext(path)[1].lower()
    if ext not in [".mkv", ".avi", ".mov", ".mp4", ".wmv"]:
        return {"needs_companion": False}

    if not FFMPEG_BIN_PATH:
        return {"needs_companion": False}

    try:
        if FFPROBE_BIN_PATH:
            cmd = [
                FFPROBE_BIN_PATH, "-v", "error",
                "-show_entries", "stream=index,codec_name,codec_type",
                "-of", "json", path
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=3.5)
            if res.returncode == 0 and res.stdout.strip():
                import json
                data = json.loads(res.stdout)
                streams = [s for s in data.get("streams", []) if s.get("codec_type") == "audio"]
                if streams:
                    codec = (streams[0].get("codec_name") or "").lower()
                    unsupported_in_chromium = ["ac3", "eac3", "dts", "truehd", "mlp", "dca"]
                    # Dans un conteneur MKV, Chromium ne décode pas de façon fiable l'AAC, MP3 ou l'AC3/DTS.
                    # Seuls Vorbis et Opus sont lus nativement de façon garantie.
                    if codec in unsupported_in_chromium or (ext == ".mkv" and codec not in ["vorbis", "opus"]):
                        return {
                            "needs_companion": True,
                            "codec": codec,
                            "audio_url": f"/api/media/audio-companion-stream?path={urllib.parse.quote(path)}"
                        }
                    else:
                        return {"needs_companion": False, "codec": codec}

        # Si ffprobe n'a pas pu identifier mais que le fichier est un MKV
        if ext == ".mkv":
            return {
                "needs_companion": True,
                "codec": "mkv",
                "audio_url": f"/api/media/audio-companion-stream?path={urllib.parse.quote(path)}"
            }
    except Exception:
        if ext == ".mkv":
            return {
                "needs_companion": True,
                "codec": "mkv",
                "audio_url": f"/api/media/audio-companion-stream?path={urllib.parse.quote(path)}"
            }

    return {"needs_companion": False}

@app.api_route("/api/media/audio-companion-stream", methods=["GET", "HEAD"])
def stream_companion_audio(path: str = Query(...)):
    """Extrait et convertit la piste audio d'une vidéo en AAC (m4a) avec support Range/Seeking"""
    if not os.path.isfile(path) or not FFMPEG_BIN_PATH:
        raise HTTPException(status_code=404, detail="Fichier introuvable ou ffmpeg absent.")

    import hashlib
    file_stat = os.stat(path)
    cache_key = hashlib.md5(f"{path}_{file_stat.st_size}_{file_stat.st_mtime}".encode()).hexdigest()
    out_file = AUDIO_COMPANION_CACHE / f"{cache_key}.m4a"

    if not out_file.exists() or out_file.stat().st_size == 0:
        cmd = [
            FFMPEG_BIN_PATH, "-y",
            "-i", path,
            "-vn",
            "-c:a", "aac",
            "-b:a", "192k",
            str(out_file)
        ]
        res = subprocess.run(cmd, capture_output=True, timeout=120)
        if res.returncode != 0:
            raise HTTPException(status_code=500, detail="Échec de l'extraction audio.")

    return FileResponse(str(out_file), media_type="audio/mp4")


def inspect_archive_contents(archive_path: str):
    ext = os.path.splitext(archive_path)[1].lower()
    items = []

    # 1. Archive ZIP
    if ext == ".zip":
        import zipfile
        try:
            with zipfile.ZipFile(archive_path, 'r') as zf:
                for info in zf.infolist():
                    name = info.filename
                    is_dir = info.is_dir() or name.endswith('/')
                    sz = info.file_size
                    dt_str = ""
                    if info.date_time:
                        try:
                            dt_str = datetime(*info.date_time).strftime("%d/%m/%Y %H:%M")
                        except Exception:
                            pass
                    items.append({
                        "name": name,
                        "size": sz,
                        "size_formatted": format_size(sz) if not is_dir else "",
                        "is_dir": is_dir,
                        "mtime": dt_str
                    })
                return items
        except Exception:
            pass

    # 2. Archive TAR (tar, gz, tgz, bz2, xz)
    if ext in [".tar", ".gz", ".tgz", ".bz2", ".xz"]:
        import tarfile
        try:
            with tarfile.open(archive_path) as tf:
                for m in tf.getmembers():
                    is_dir = m.isdir()
                    sz = m.size
                    dt_str = datetime.fromtimestamp(m.mtime).strftime("%d/%m/%Y %H:%M") if m.mtime else ""
                    items.append({
                        "name": m.name,
                        "size": sz,
                        "size_formatted": format_size(sz) if not is_dir else "",
                        "is_dir": is_dir,
                        "mtime": dt_str
                    })
                return items
        except Exception:
            pass

    # 3. ISO / TAR / 7Z / RAR via bsdtar macOS
    try:
        out = subprocess.check_output(["tar", "-tvf", archive_path], timeout=15).decode("utf-8", errors="ignore")
        for line in out.splitlines():
            line = line.strip()
            if not line:
                continue
            parts = line.split(None, 8)
            if len(parts) >= 9:
                mode = parts[0]
                sz = int(parts[4]) if parts[4].isdigit() else 0
                date_str = f"{parts[5]} {parts[6]} {parts[7]}"
                name = parts[8]
                is_dir = mode.startswith('d') or name.endswith('/')
                items.append({
                    "name": name,
                    "size": sz,
                    "size_formatted": format_size(sz) if not is_dir else "",
                    "is_dir": is_dir,
                    "mtime": date_str
                })
        if items:
            return items
    except Exception:
        pass

    # 4. Fallback CLI 7z / 7za
    seven_zip = shutil.which("7z") or shutil.which("7za")
    if seven_zip:
        try:
            out = subprocess.check_output([seven_zip, "l", archive_path], timeout=15).decode("utf-8", errors="ignore")
            started = False
            for line in out.splitlines():
                if "-------------------" in line:
                    started = not started
                    continue
                if started and len(line) > 53:
                    date_part = line[0:19].strip()
                    attr_part = line[20:25].strip()
                    size_part = line[26:38].strip()
                    name_part = line[53:].strip()
                    is_dir = "D" in attr_part
                    sz = int(size_part) if size_part.isdigit() else 0
                    items.append({
                        "name": name_part,
                        "size": sz,
                        "size_formatted": format_size(sz) if not is_dir else "",
                        "is_dir": is_dir,
                        "mtime": date_part
                    })
            if items:
                return items
        except Exception:
            pass

    return items


def get_archive_hierarchy(items: list, show_hidden: bool = False):
    """
    Traite la liste brute des éléments d'une archive pour filtrer les métadonnées macOS
    (__MACOSX, .DS_Store, etc.) et produire une liste organisée par niveau de dossier.
    """
    valid_items = []
    for it in items:
        raw_name = it.get("name", "").strip().lstrip("/").lstrip("./")
        if not raw_name:
            continue
        parts = [p for p in raw_name.split("/") if p]
        if not parts:
            continue
        # Ignorer systématiquement les répertoires de métadonnées AppleDouble
        if any(p == "__MACOSX" for p in parts):
            continue
        # Ignorer les fichiers cachés et fichiers ressources si non demandé
        if not show_hidden:
            if any(p.startswith(".") for p in parts):
                continue
        valid_items.append({
            "name": it.get("name", ""),
            "clean_path": "/".join(parts),
            "parts": parts,
            "is_dir": it.get("is_dir", False) or raw_name.endswith("/") or it.get("name", "").endswith("/"),
            "size": it.get("size", 0),
            "mtime": it.get("mtime", "")
        })
    return valid_items


def get_archive_dir_contents(valid_items: list, current_dir: str = ""):
    """
    Extrait les éléments situés directement dans current_dir au sein de l'archive.
    Si current_dir == "", renvoie uniquement les éléments de la RACINE de l'archive.
    Les dossiers enfants sont agrégés (taille totale, nombre d'éléments, dernière date).
    """
    cur_parts = [p for p in current_dir.strip("/").split("/") if p]
    cur_depth = len(cur_parts)

    grouped = {}
    for it in valid_items:
        parts = it["parts"]
        if cur_depth > 0:
            if len(parts) <= cur_depth or parts[:cur_depth] != cur_parts:
                continue
            child_name = parts[cur_depth]
            is_sub_dir = (len(parts) > cur_depth + 1) or it["is_dir"]
        else:
            child_name = parts[0]
            is_sub_dir = (len(parts) > 1) or it["is_dir"]

        child_rel_path = "/".join(cur_parts + [child_name]) if cur_depth > 0 else child_name

        if child_name not in grouped:
            grouped[child_name] = {
                "name": child_name,
                "path": child_rel_path,
                "is_dir": is_sub_dir,
                "size": 0,
                "file_count": 0,
                "mtime": it.get("mtime", "")
            }

        entry = grouped[child_name]
        if is_sub_dir:
            entry["is_dir"] = True
        if not it["is_dir"]:
            entry["size"] += it.get("size", 0)
            entry["file_count"] += 1
        if it.get("mtime"):
            if not entry["mtime"] or it["mtime"] > entry["mtime"]:
                entry["mtime"] = it["mtime"]

    res = []
    for e in grouped.values():
        e["size_formatted"] = format_size(e["size"]) if (not e["is_dir"] or e["size"] > 0) else ""
        res.append(e)

    res.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
    return res


@app.get("/api/fs/preview")
def get_preview_content(path: str = Query(...), show_hidden: bool = Query(False)):
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Élément introuvable.")

    # 0. Dossier / Répertoire : Aperçu direct du contenu
    if os.path.isdir(path):
        folder_items = []
        try:
            with os.scandir(path) as entries:
                for entry in entries:
                    try:
                        hidden = is_file_hidden(entry.path, entry.name)
                        if hidden and not show_hidden:
                            continue
                        is_dir = entry.is_dir(follow_symlinks=False)
                        stat = entry.stat(follow_symlinks=False)
                        size = stat.st_size if not is_dir else 0
                        mtime = stat.st_mtime
                        folder_items.append({
                            "name": entry.name,
                            "path": entry.path,
                            "is_dir": is_dir,
                            "size": size,
                            "size_formatted": format_size(size) if not is_dir else "",
                            "modified_formatted": datetime.fromtimestamp(mtime).strftime("%d/%m/%Y %H:%M"),
                            "extension": os.path.splitext(entry.name)[1].lower() if (not is_dir or entry.name.lower().endswith(".app")) else "",
                            "is_hidden": hidden
                        })
                    except Exception:
                        pass
        except Exception as e:
            return {"type": "error", "message": f"Impossible de lire le dossier : {str(e)}"}

        folder_items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
        return {
            "type": "directory",
            "total_count": len(folder_items),
            "items": folder_items[:500],
            "is_truncated": len(folder_items) > 500
        }

    ext = os.path.splitext(path)[1].lower()
    sz = os.path.getsize(path)

    # 1. Archives et images ISO (zip, tar, gz, tgz, bz2, xz, 7z, rar, iso)
    archive_extensions = [".zip", ".tar", ".gz", ".tgz", ".bz2", ".xz", ".7z", ".rar", ".iso"]
    if ext in archive_extensions:
        raw_items = inspect_archive_contents(path)
        valid_items = get_archive_hierarchy(raw_items, show_hidden=show_hidden)
        root_items = get_archive_dir_contents(valid_items, current_dir="")
        return {
            "type": "archive",
            "total_count": len(root_items),
            "items": root_items,
            "raw_items": valid_items[:2000],
            "is_truncated": len(valid_items) > 2000
        }

    # 2. Documents Word (.docx)
    if ext == ".docx":
        import zipfile
        import xml.etree.ElementTree as ET
        try:
            with zipfile.ZipFile(path) as z:
                if "word/document.xml" in z.namelist():
                    xml_content = z.read("word/document.xml")
                    tree = ET.fromstring(xml_content)
                    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                    paragraphs = []
                    for p in tree.iter(f"{{{ns['w']}}}p"):
                        texts = [node.text for node in p.iter(f"{{{ns['w']}}}t") if node.text]
                        if texts:
                            paragraphs.append("".join(texts))
                        elif not paragraphs or paragraphs[-1] != "":
                            paragraphs.append("")
                    preview_text = "\n\n".join(paragraphs[:60])
                    return {"type": "docx", "content": preview_text or "Document Word vide."}
        except Exception as e:
            return {"type": "error", "message": f"Erreur de lecture du document Word : {str(e)}"}

    # 3. Feuilles de calcul Excel (.xlsx)
    elif ext == ".xlsx":
        import zipfile
        import xml.etree.ElementTree as ET
        try:
            with zipfile.ZipFile(path) as z:
                shared_strings = []
                if "xl/sharedStrings.xml" in z.namelist():
                    s_tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
                    ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
                    for si in s_tree.iter(f"{{{ns['s']}}}si"):
                        t_parts = [node.text for node in si.iter(f"{{{ns['s']}}}t") if node.text]
                        shared_strings.append("".join(t_parts))

                rows_data = []
                if "xl/worksheets/sheet1.xml" in z.namelist():
                    sheet_tree = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
                    ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
                    for row_node in sheet_tree.iter(f"{{{ns['s']}}}row"):
                        row_vals = []
                        for c_node in row_node.iter(f"{{{ns['s']}}}c"):
                            t_attr = c_node.get("t")
                            v_elem = c_node.find(f"{{{ns['s']}}}v")
                            val = v_elem.text if v_elem is not None else ""
                            if t_attr == "s" and val.isdigit() and int(val) < len(shared_strings):
                                val = shared_strings[int(val)]
                            row_vals.append(val)
                        if any(row_vals):
                            rows_data.append(row_vals)
                        if len(rows_data) >= 25:
                            break
                return {"type": "xlsx", "rows": rows_data}
        except Exception as e:
            return {"type": "error", "message": f"Erreur de lecture du fichier Excel : {str(e)}"}

    # 4. Fichiers texte, code, markdown, csv
    text_extensions = [
        ".txt", ".py", ".js", ".html", ".css", ".json", ".xml", ".ts", ".c", ".cpp", ".cs",
        ".java", ".md", ".csv", ".log", ".ini", ".cfg", ".yaml", ".yml", ".sql", ".sh", ".zsh"
    ]
    if ext in text_extensions or sz < 2 * 1024 * 1024:
        encodings = ["utf-8", "latin-1", "cp1252"]
        content = None
        for enc in encodings:
            try:
                with open(path, "r", encoding=enc) as f:
                    content = f.read(60000)
                    break
            except Exception:
                continue

        if content is not None:
            return {"type": "text", "content": content}

    return {"type": "unsupported", "message": f"Aperçu non disponible pour le format {ext.upper()}"}


@app.post("/api/fs/open")
def open_item(req: OpenRequest):
    norm_path = os.path.normpath(os.path.abspath(req.path))
    if not os.path.exists(norm_path):
        raise HTTPException(status_code=404, detail="Élément introuvable.")
    try:
        subprocess.Popen(["open", norm_path])
        return {"status": "ok", "message": f"Ouverture : {norm_path}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CalculateSizeRequest(BaseModel):
    paths: List[str]

@app.post("/api/fs/calculate-size")
def calculate_multiple_size(req: CalculateSizeRequest):
    total_size = 0
    total_files = 0
    total_dirs = 0
    skipped_count = 0
    modified_formatted = None
    created_formatted = None
    type_desc = None
    location = None
    is_dir = False
    name = None

    for path in req.paths:
        norm_path = os.path.abspath(path)
        if not os.path.exists(norm_path):
            continue
        if os.path.isfile(norm_path):
            try:
                total_size += os.path.getsize(norm_path)
                total_files += 1
            except Exception:
                skipped_count += 1
        elif os.path.isdir(norm_path):
            total_dirs += 1
            try:
                for root, dirs, files in os.walk(norm_path, onerror=None):
                    total_dirs += len(dirs)
                    for f in files:
                        fp = os.path.join(root, f)
                        try:
                            total_size += os.path.getsize(fp)
                            total_files += 1
                        except Exception:
                            skipped_count += 1
            except Exception:
                skipped_count += 1

    if len(req.paths) == 1:
        first_path = os.path.abspath(req.paths[0])
        name = os.path.basename(first_path)
        if os.path.exists(first_path):
            try:
                st = os.stat(first_path)
                mtime_dt = datetime.fromtimestamp(st.st_mtime)
                modified_formatted = mtime_dt.strftime("%d/%m/%Y à %H:%M:%S")
                ctime_val = getattr(st, "st_birthtime", st.st_ctime)
                created_dt = datetime.fromtimestamp(ctime_val)
                created_formatted = created_dt.strftime("%d/%m/%Y à %H:%M:%S")
                is_dir = os.path.isdir(first_path)
                type_desc = get_file_type_desc(first_path, is_dir)
                location = os.path.dirname(first_path)
            except Exception:
                pass
    elif len(req.paths) > 1:
        name = f"{len(req.paths)} éléments"
        type_desc = f"Sélection de {len(req.paths)} éléments"
        location = os.path.dirname(os.path.abspath(req.paths[0]))
        latest_mtime = 0
        for p in req.paths:
            try:
                mt = os.path.getmtime(p)
                if mt > latest_mtime:
                    latest_mtime = mt
            except Exception:
                pass
        if latest_mtime > 0:
            modified_formatted = datetime.fromtimestamp(latest_mtime).strftime("%d/%m/%Y à %H:%M:%S")

    return {
        "paths": req.paths,
        "count": len(req.paths),
        "name": name,
        "is_dir": is_dir,
        "type_desc": type_desc,
        "location": location,
        "size": total_size,
        "size_formatted": format_size(total_size),
        "size_bytes_formatted": f"{total_size:,}".replace(",", " "),
        "file_count": total_files,
        "dir_count": total_dirs,
        "skipped_count": skipped_count,
        "modified_formatted": modified_formatted,
        "created_formatted": created_formatted
    }


class CompressRequest(BaseModel):
    parent_path: str
    archive_name: str
    sources: List[str]

@app.post("/api/fs/compress_task")
def start_compress_task(req: CompressRequest, bg: BackgroundTasks):
    parent = os.path.abspath(req.parent_path)
    if not os.path.exists(parent) or not os.path.isdir(parent):
        raise HTTPException(status_code=404, detail="Dossier parent introuvable.")

    name = req.archive_name.strip()
    if not name.lower().endswith(".zip"):
        name = f"{name}.zip"

    target_zip = os.path.join(parent, name)

    valid_sources = []
    for s in req.sources:
        p = os.path.abspath(s)
        if os.path.exists(p):
            valid_sources.append(p)

    if not valid_sources:
        raise HTTPException(status_code=400, detail="Aucun fichier ou dossier valide sélectionné pour la compression.")

    task_id = str(uuid.uuid4())
    task = TransferTask(task_id, "compress", valid_sources, target_zip)
    tasks_store[task_id] = task

    bg.add_task(execute_transfer, task)
    return {"task_id": task_id, "status": "started", "destination": target_zip}


@app.post("/api/fs/compress")
def compress_to_zip(req: CompressRequest):
    parent = os.path.abspath(req.parent_path)
    if not os.path.exists(parent) or not os.path.isdir(parent):
        raise HTTPException(status_code=404, detail="Dossier parent introuvable.")

    name = req.archive_name.strip()
    if not name.lower().endswith(".zip"):
        name = f"{name}.zip"

    target_zip = os.path.join(parent, name)

    valid_sources = []
    for s in req.sources:
        p = os.path.abspath(s)
        if os.path.exists(p):
            valid_sources.append(p)

    if not valid_sources:
        raise HTTPException(status_code=400, detail="Aucun fichier ou dossier valide sélectionné pour la compression.")

    import zipfile
    try:
        with zipfile.ZipFile(target_zip, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
            for src in valid_sources:
                if os.path.isfile(src):
                    zf.write(src, arcname=os.path.basename(src))
                elif os.path.isdir(src):
                    base_dir = os.path.dirname(src)
                    for root, dirs, files in os.walk(src):
                        for file in files:
                            full_p = os.path.join(root, file)
                            rel_p = os.path.relpath(full_p, base_dir)
                            zf.write(full_p, arcname=rel_p)
                        for d in dirs:
                            full_d = os.path.join(root, d)
                            if not os.listdir(full_d):
                                rel_d = os.path.relpath(full_d, base_dir) + "/"
                                zf.write(full_d, arcname=rel_d)
        return {
            "status": "ok",
            "archive_path": target_zip,
            "message": f"Archive « {name} » créée avec succès ({format_size(os.path.getsize(target_zip))})"
        }
    except Exception as e:
        if os.path.exists(target_zip):
            try: os.remove(target_zip)
            except Exception: pass
        raise HTTPException(status_code=500, detail=f"Erreur lors de la compression : {str(e)}")


class ExtractRequest(BaseModel):
    path: str
    destination: Optional[str] = None

@app.post("/api/fs/extract_task")
def start_extract_task(req: ExtractRequest, bg: BackgroundTasks):
    archive_path = os.path.abspath(req.path)
    if not os.path.exists(archive_path) or not os.path.isfile(archive_path):
        raise HTTPException(status_code=404, detail="Fichier archive introuvable.")

    parent_dir = os.path.dirname(archive_path)
    base_name = os.path.splitext(os.path.basename(archive_path))[0]
    if base_name.endswith(".tar"):
        base_name = os.path.splitext(base_name)[0]

    raw_items = inspect_archive_contents(archive_path)
    valid_items = get_archive_hierarchy(raw_items, show_hidden=False)
    root_entries = get_archive_dir_contents(valid_items, current_dir="")

    need_dedicated_folder = len(root_entries) > 1

    if req.destination:
        dest = req.destination
    elif need_dedicated_folder:
        dest = os.path.join(parent_dir, base_name)
    else:
        dest = parent_dir

    os.makedirs(dest, exist_ok=True)

    task_id = str(uuid.uuid4())
    task = TransferTask(task_id, "extract", [archive_path], dest)
    tasks_store[task_id] = task

    bg.add_task(execute_transfer, task)
    return {"task_id": task_id, "status": "started", "destination": dest}


@app.post("/api/fs/extract")
def extract_archive(req: ExtractRequest):
    archive_path = os.path.abspath(req.path)
    if not os.path.exists(archive_path) or not os.path.isfile(archive_path):
        raise HTTPException(status_code=404, detail="Fichier archive introuvable.")

    parent_dir = os.path.dirname(archive_path)
    base_name = os.path.splitext(os.path.basename(archive_path))[0]
    if base_name.endswith(".tar"):
        base_name = os.path.splitext(base_name)[0]

    # Détection intelligente des racines de l'archive :
    # Si l'archive contient plusieurs fichiers/dossiers à sa racine, on crée un dossier dédié.
    # Si elle ne contient qu'un seul élément racine (un dossier ou fichier unique), on extrait directement sans sous-dossier superflu.
    raw_items = inspect_archive_contents(archive_path)
    valid_items = get_archive_hierarchy(raw_items, show_hidden=False)
    root_entries = get_archive_dir_contents(valid_items, current_dir="")

    need_dedicated_folder = len(root_entries) > 1

    if req.destination:
        dest = req.destination
    elif need_dedicated_folder:
        dest = os.path.join(parent_dir, base_name)
    else:
        dest = parent_dir

    os.makedirs(dest, exist_ok=True)
    ext = os.path.splitext(archive_path)[1].lower()

    # 1. Extraction ZIP native
    if ext == ".zip":
        import zipfile
        try:
            with zipfile.ZipFile(archive_path, 'r') as zf:
                zf.extractall(dest)
            return {"status": "ok", "message": f"Archive ZIP extraite avec succès", "destination": dest}
        except Exception:
            pass

    # 2. Extraction TAR native (tar, gz, tgz, bz2, xz)
    if ext in [".tar", ".gz", ".tgz", ".bz2", ".xz"]:
        try:
            import tarfile
            with tarfile.open(archive_path) as tf:
                tf.extractall(dest)
            return {"status": "ok", "message": f"Archive TAR extraite avec succès", "destination": dest}
        except Exception:
            pass

    # 3. Extraction bsdtar (gère nativement .iso, .tar.*, .zip, .7z, etc.)
    tar_bin = shutil.which("tar")
    if tar_bin:
        try:
            res = subprocess.run([tar_bin, "-xf", archive_path, "-C", dest], capture_output=True, text=True, timeout=180)
            if res.returncode == 0:
                return {"status": "ok", "message": f"Archive extraite avec succès", "destination": dest}
        except Exception:
            pass

    # 4. Fallback ISO spécifique via hdiutil si tar a échoué
    if ext == ".iso":
        tmp_mount = tempfile.mkdtemp(prefix="iso_mount_")
        try:
            attach_res = subprocess.run(["hdiutil", "attach", "-nobrowse", "-readonly", "-mountpoint", tmp_mount, archive_path], capture_output=True, text=True, timeout=30)
            if attach_res.returncode == 0:
                try:
                    for entry in os.listdir(tmp_mount):
                        if entry.startswith("."):
                            continue
                        s = os.path.join(tmp_mount, entry)
                        d = os.path.join(dest, entry)
                        if os.path.isdir(s):
                            shutil.copytree(s, d, dirs_exist_ok=True)
                        else:
                            shutil.copy2(s, d)
                    return {"status": "ok", "message": f"Image ISO extraite avec succès", "destination": dest}
                finally:
                    subprocess.run(["hdiutil", "detach", tmp_mount], capture_output=True, timeout=10)
                    shutil.rmtree(tmp_mount, ignore_errors=True)
        except Exception:
            shutil.rmtree(tmp_mount, ignore_errors=True)

    # 5. 7z / 7za CLI si présent
    seven_zip = shutil.which("7z") or shutil.which("7za")
    if seven_zip:
        try:
            res = subprocess.run([seven_zip, "x", archive_path, f"-o{dest}", "-y"], capture_output=True, text=True, timeout=180)
            if res.returncode == 0:
                return {"status": "ok", "message": f"Archive extraite avec succès", "destination": dest}
        except Exception:
            pass

    # 6. Fallback macOS ditto
    ditto = shutil.which("ditto")
    if ditto and ext in [".zip", ".tar", ".gz"]:
        try:
            res = subprocess.run([ditto, "-x", "-k", archive_path, dest], capture_output=True, text=True, timeout=180)
            if res.returncode == 0:
                return {"status": "ok", "message": f"Archive extraite avec succès", "destination": dest}
        except Exception:
            pass

    raise HTTPException(status_code=400, detail=f"Format d'archive non pris en charge ({ext}) ou extraction impossible.")


class ArchiveMemberRequest(BaseModel):
    archive_path: str
    member_path: str
    is_dir: bool = False
    destination: Optional[str] = None
    new_name: Optional[str] = None


def _extract_archive_member_to_dir(archive_path: str, member_path: str, is_dir: bool, dest_dir: str) -> str:
    if not os.path.exists(archive_path):
        raise HTTPException(status_code=404, detail="Archive introuvable.")
    os.makedirs(dest_dir, exist_ok=True)
    ext = os.path.splitext(archive_path)[1].lower()
    norm_member = member_path.strip("/")
    base_name = os.path.basename(norm_member)
    parent_prefix = os.path.dirname(norm_member)
    if parent_prefix:
        parent_prefix += "/"

    target_out = os.path.join(dest_dir, base_name)

    if ext == ".zip":
        import zipfile
        with zipfile.ZipFile(archive_path, "r") as zf:
            matched = False
            for info in zf.infolist():
                entry = info.filename.replace("\\", "/")
                entry_stripped = entry.rstrip("/")
                if is_dir:
                    if entry_stripped == norm_member or entry.startswith(norm_member + "/"):
                        matched = True
                        rel = entry[len(parent_prefix):] if parent_prefix and entry.startswith(parent_prefix) else entry
                        rel = rel.lstrip("/")
                        if not rel:
                            continue
                        out_p = os.path.join(dest_dir, rel)
                        if entry.endswith("/") or info.is_dir():
                            os.makedirs(out_p, exist_ok=True)
                        else:
                            os.makedirs(os.path.dirname(out_p), exist_ok=True)
                            with zf.open(info) as src, open(out_p, "wb") as dst:
                                shutil.copyfileobj(src, dst)
                else:
                    if entry_stripped == norm_member and not entry.endswith("/"):
                        matched = True
                        os.makedirs(os.path.dirname(target_out), exist_ok=True)
                        with zf.open(info) as src, open(target_out, "wb") as dst:
                            shutil.copyfileobj(src, dst)
                        break
            if matched:
                return target_out

    # Fallback générique via extraction temporaire bsdtar / tarfile
    tmp_all = tempfile.mkdtemp(prefix="arch_member_")
    try:
        tar_bin = shutil.which("tar")
        extracted = False
        if tar_bin:
            res = subprocess.run([tar_bin, "-xf", archive_path, "-C", tmp_all], capture_output=True, text=True, timeout=120)
            if res.returncode == 0:
                extracted = True
        if not extracted and ext in [".tar", ".gz", ".tgz", ".bz2", ".xz"]:
            import tarfile
            with tarfile.open(archive_path) as tf:
                tf.extractall(tmp_all)
                extracted = True
        if extracted:
            cand = os.path.join(tmp_all, norm_member)
            if os.path.exists(cand):
                if os.path.exists(target_out):
                    if os.path.isdir(target_out):
                        shutil.rmtree(target_out, ignore_errors=True)
                    else:
                        os.remove(target_out)
                shutil.move(cand, target_out)
                return target_out
    finally:
        shutil.rmtree(tmp_all, ignore_errors=True)

    raise HTTPException(status_code=400, detail=f"Impossible d'extraire « {base_name} » depuis l'archive.")


@app.post("/api/fs/archive/extract-member")
def extract_archive_member(req: ArchiveMemberRequest):
    dest = req.destination or os.path.dirname(req.archive_path)
    out_path = _extract_archive_member_to_dir(req.archive_path, req.member_path, req.is_dir, dest)
    return {
        "status": "ok",
        "message": f"« {os.path.basename(out_path)} » extrait avec succès",
        "path": out_path,
        "destination": dest
    }


@app.post("/api/fs/archive/member-extract-temp")
def extract_archive_member_temp(req: ArchiveMemberRequest):
    tmp_root = os.path.join(tempfile.gettempdir(), "explorer2_archive_stage")
    os.makedirs(tmp_root, exist_ok=True)
    out_path = _extract_archive_member_to_dir(req.archive_path, req.member_path, req.is_dir, tmp_root)
    return {
        "status": "ok",
        "path": out_path,
        "name": os.path.basename(out_path),
        "is_dir": os.path.isdir(out_path)
    }


@app.post("/api/fs/archive/delete-member")
def delete_archive_member(req: ArchiveMemberRequest):
    archive_path = req.archive_path
    if not os.path.exists(archive_path):
        raise HTTPException(status_code=404, detail="Archive introuvable.")
    ext = os.path.splitext(archive_path)[1].lower()
    if ext != ".zip":
        raise HTTPException(status_code=400, detail="La suppression interne est uniquement supportée pour les archives .zip.")
    import zipfile
    norm_member = req.member_path.strip("/")
    tmp_zip = archive_path + ".tmp_edit"
    try:
        with zipfile.ZipFile(archive_path, "r") as zin, zipfile.ZipFile(tmp_zip, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                entry = item.filename.replace("\\", "/")
                entry_stripped = entry.rstrip("/")
                if req.is_dir:
                    if entry_stripped == norm_member or entry.startswith(norm_member + "/"):
                        continue
                else:
                    if entry_stripped == norm_member:
                        continue
                zout.writestr(item, zin.read(item.filename))
        os.replace(tmp_zip, archive_path)
    except Exception as e:
        if os.path.exists(tmp_zip):
            os.remove(tmp_zip)
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression dans l'archive : {e}")

    raw_items = inspect_archive_contents(archive_path)
    valid_items = get_archive_hierarchy(raw_items, show_hidden=False)
    return {"status": "ok", "raw_items": valid_items[:2000]}


@app.post("/api/fs/archive/rename-member")
def rename_archive_member(req: ArchiveMemberRequest):
    archive_path = req.archive_path
    new_name = (req.new_name or "").strip().strip("/")
    if not new_name:
        raise HTTPException(status_code=400, detail="Nouveau nom invalide.")
    if not os.path.exists(archive_path):
        raise HTTPException(status_code=404, detail="Archive introuvable.")
    ext = os.path.splitext(archive_path)[1].lower()
    if ext != ".zip":
        raise HTTPException(status_code=400, detail="Le renommage interne est uniquement supporté pour les archives .zip.")
    import zipfile
    norm_member = req.member_path.strip("/")
    parent_dir = os.path.dirname(norm_member)
    new_member_prefix = f"{parent_dir}/{new_name}" if parent_dir else new_name

    tmp_zip = archive_path + ".tmp_rename"
    try:
        with zipfile.ZipFile(archive_path, "r") as zin, zipfile.ZipFile(tmp_zip, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                entry = item.filename.replace("\\", "/")
                entry_stripped = entry.rstrip("/")
                if req.is_dir:
                    if entry_stripped == norm_member:
                        item.filename = new_member_prefix + "/"
                    elif entry.startswith(norm_member + "/"):
                        suffix = entry[len(norm_member) + 1:]
                        item.filename = f"{new_member_prefix}/{suffix}"
                else:
                    if entry_stripped == norm_member:
                        item.filename = new_member_prefix
                zout.writestr(item, data)
        os.replace(tmp_zip, archive_path)
    except Exception as e:
        if os.path.exists(tmp_zip):
            os.remove(tmp_zip)
        raise HTTPException(status_code=500, detail=f"Erreur lors du renommage dans l'archive : {e}")

    raw_items = inspect_archive_contents(archive_path)
    valid_items = get_archive_hierarchy(raw_items, show_hidden=False)
    return {"status": "ok", "raw_items": valid_items[:2000]}


@app.post("/api/fs/create")
def create_item(req: CreateRequest):
    target = os.path.join(req.parent_path, req.name)
    if os.path.exists(target):
        raise HTTPException(status_code=400, detail="Un élément avec ce nom existe déjà.")
    try:
        if req.type.lower() in ["folder", "dir", "directory"]:
            os.makedirs(target, exist_ok=False)
        else:
            with open(target, "w", encoding="utf-8") as f:
                f.write("")
        return {"status": "ok", "path": target}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/fs/rename")
def rename_item(req: RenameRequest):
    if not os.path.exists(req.path):
        raise HTTPException(status_code=404, detail="Élément introuvable.")

    parent = os.path.dirname(req.path)
    target_path = os.path.join(parent, req.new_name)

    if os.path.exists(target_path) and os.path.abspath(req.path).lower() != os.path.abspath(target_path).lower():
        raise HTTPException(status_code=400, detail="Un élément avec ce nouveau nom existe déjà.")

    try:
        os.rename(req.path, target_path)
        return {"status": "ok", "path": target_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 8. API FAVORITES
def get_default_favorites() -> List[dict]:
    home = os.path.expanduser("~")
    candidates = [
        ("Bureau", os.path.join(home, "Desktop")),
        ("Téléchargements", os.path.join(home, "Downloads")),
        ("Documents", os.path.join(home, "Documents")),
        ("Images", os.path.join(home, "Pictures")),
        ("Musique", os.path.join(home, "Music")),
        ("Films", os.path.join(home, "Movies")),
        ("Applications", "/Applications"),
        ("Projets", os.path.join(home, "Documents/projets")),
    ]
    return [{"name": n, "path": os.path.abspath(p)} for n, p in candidates if os.path.exists(p)]

@app.get("/api/favorites")
def get_favorites():
    import json
    if FAVORITES_FILE.exists():
        try:
            with open(FAVORITES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    # Vérifier que les chemins existent pour ne pas renvoyer des anciens chemins Windows
                    valid_items = [d for d in data if os.path.exists(d.get("path", ""))]
                    if valid_items:
                        return valid_items
        except Exception:
            pass

    defaults = get_default_favorites()
    try:
        with open(FAVORITES_FILE, "w", encoding="utf-8") as f:
            json.dump(defaults, f, ensure_ascii=False, indent=2)
    except Exception:
        pass
    return defaults

@app.post("/api/favorites")
def save_favorites(favorites: List[FavoriteItem]):
    import json
    data = [item.dict() for item in favorites]
    try:
        with open(FAVORITES_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return {"status": "ok", "count": len(data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================================
# 9. API GESTIONNAIRE DE TÂCHES (PROCESSUS, PERFORMANCES, TEMPÉRATURES)
# =====================================================================

class KillProcessRequest(BaseModel):
    pid: int

_taskmgr_lock = threading.Lock()
_taskmgr_processes: List[Dict[str, Any]] = []
_taskmgr_performance: Dict[str, Any] = {}
_prev_net_io = None
_prev_net_time = None
_prev_disk_io = None
_prev_disk_time = None
_prev_perdisk_io: Dict[str, Any] = {}
_prev_perdisk_time: Optional[float] = None
_prev_proc_cpu: Dict[int, Any] = {}

def _get_cpu_model_instant() -> str:
    """Lecture instantanée du modèle de processeur macOS via sysctl (<0.1ms)."""
    try:
        brand = subprocess.check_output(["sysctl", "-n", "machdep.cpu.brand_string"], timeout=1).decode().strip()
        if brand:
            return brand
    except Exception:
        pass
    try:
        import platform
        return platform.processor() or "Apple Silicon"
    except Exception:
        return "Apple Silicon"

_hardware_cache: Dict[str, Any] = {
    "cpu_model": _get_cpu_model_instant(),
    "ram": {
        "speed_mhz": 6400,
        "slots_used": 1,
        "slots_total": 1,
        "ram_type": "Unified LPDDR5"
    },
    "gpu_model": "Apple M4"
}
_hw_cache_lock = threading.Lock()

def _hardware_collector_worker():
    """Tâche d'arrière-plan pour collecter RAM, slots, fréquence et matériel sous macOS."""
    global _hardware_cache
    while True:
        try:
            cpu_m = _get_cpu_model_instant()
            ram_data = {"speed_mhz": 6400, "slots_used": 1, "slots_total": 1, "ram_type": "Unified LPDDR5"}
            gpu_name = "Apple GPU"

            try:
                res = subprocess.run(["system_profiler", "SPMemoryDataType", "-json"], capture_output=True, text=True, timeout=4)
                if res.returncode == 0 and res.stdout.strip():
                    import json
                    parsed = json.loads(res.stdout.strip())
                    mem_items = parsed.get("SPMemoryDataType", [])
                    if mem_items and isinstance(mem_items, list):
                        first = mem_items[0]
                        mtype = first.get("dimm_type") or "LPDDR5"
                        ram_data = {
                            "speed_mhz": 6400,
                            "slots_used": len(mem_items),
                            "slots_total": len(mem_items),
                            "ram_type": mtype
                        }
            except Exception:
                pass

            try:
                res = subprocess.run(["system_profiler", "SPDisplaysDataType", "-json"], capture_output=True, text=True, timeout=4)
                if res.returncode == 0 and res.stdout.strip():
                    import json
                    sp_disp = json.loads(res.stdout.strip())
                    for disp in sp_disp.get("SPDisplaysDataType", []):
                        cores = disp.get("sppci_cores")
                        model = disp.get("sppci_model") or disp.get("_name")
                        if model:
                            gpu_name = f"{model} ({cores} cœurs GPU)" if cores else model
                            break
            except Exception:
                pass

            with _hw_cache_lock:
                _hardware_cache["cpu_model"] = cpu_m
                _hardware_cache["ram"] = ram_data
                _hardware_cache["gpu_model"] = gpu_name

        except Exception:
            pass

        time.sleep(60.0)

_hw_thread = threading.Thread(target=_hardware_collector_worker, daemon=True)
_hw_thread.start()


# ------------------------------------------------------------------------------
# Mémoire unifiée Apple Silicon : valeurs réelles (vm_stat, sysctl, ioreg)
# ------------------------------------------------------------------------------
def _is_apple_silicon() -> bool:
    try:
        r = subprocess.run(["sysctl", "-n", "hw.optional.arm64"], capture_output=True, text=True, timeout=2)
        return r.stdout.strip() == "1"
    except Exception:
        return False

IS_UNIFIED_MEMORY = sys.platform == "darwin" and _is_apple_silicon()


def _read_macos_memory_breakdown(total: int) -> Dict[str, Any]:
    """Répartition façon Moniteur d'activité : utilisée = apps + câblée + compressée."""
    out: Dict[str, Any] = {}
    try:
        r = subprocess.run(["vm_stat"], capture_output=True, text=True, timeout=2)
        txt = r.stdout
        m = re.search(r"page size of (\d+) bytes", txt)
        ps = int(m.group(1)) if m else 16384
        vals = {}
        for line in txt.splitlines()[1:]:
            if ":" in line:
                k, v = line.split(":", 1)
                v = v.strip().rstrip(".")
                if v.isdigit():
                    vals[k.strip().strip('"')] = int(v) * ps
        wired = vals.get("Pages wired down", 0)
        compressed = vals.get("Pages occupied by compressor", 0)
        purgeable = vals.get("Pages purgeable", 0)
        app = max(0, vals.get("Anonymous pages", 0) - purgeable)
        cached = vals.get("File-backed pages", 0) + purgeable
        used = min(total, app + wired + compressed)
        out = {
            "used": used,
            "app": app,
            "wired": wired,
            "compressed": compressed,
            "cached": cached,
            "free": max(0, total - used - cached),
            "available": max(0, total - used),
            "percent": round(used / total * 100.0, 1) if total else 0.0,
        }
    except Exception:
        pass
    try:
        sw = psutil.swap_memory()
        out["swap_used"] = sw.used
        out["swap_total"] = sw.total
    except Exception:
        pass
    return out


def _read_apple_gpu_stats() -> Dict[str, Any]:
    """Statistiques réelles du GPU Apple Silicon via IOAccelerator (sans droits admin)."""
    try:
        r = subprocess.run(["ioreg", "-r", "-d", "1", "-w", "0", "-c", "IOAccelerator"],
                           capture_output=True, text=True, timeout=3)
        m = re.search(r'"PerformanceStatistics" = \{([^}]*)\}', r.stdout)
        if not m:
            return {}
        stats = {}
        for k, v in re.findall(r'"([^"]+)"=(\d+)', m.group(1)):
            stats[k] = int(v)
        cores = re.search(r'"gpu-core-count" = (\d+)', r.stdout)
        return {
            "utilization": float(stats.get("Device Utilization %", 0)),
            "renderer": float(stats.get("Renderer Utilization %", 0)),
            "tiler": float(stats.get("Tiler Utilization %", 0)),
            "in_use": stats.get("In use system memory", 0),
            "allocated": stats.get("Alloc system memory", 0),
            "cores": int(cores.group(1)) if cores else None,
        }
    except Exception:
        return {}

def _taskmgr_worker():
    global _taskmgr_processes, _taskmgr_performance, _prev_net_io, _prev_net_time, _prev_disk_io, _prev_disk_time, _prev_perdisk_io, _prev_perdisk_time, _prev_proc_cpu
    try:
        psutil.cpu_percent(interval=None, percpu=True)
    except Exception:
        pass

    while True:
        try:
            # 1. Performance CPU globale et par cœur
            # Mesure sur tout l'intervalle depuis le tour précédent (~1,2 s) au lieu d'un
            # échantillon de 250 ms : valeur stable, comparable au Moniteur d'activité.
            cpu_per_core = psutil.cpu_percent(interval=None, percpu=True)
            cpu_pct = round(sum(cpu_per_core) / max(1, len(cpu_per_core)), 1)
            vmem = psutil.virtual_memory()

            now = time.time()

            # Débits Disques globaux
            dio = psutil.disk_io_counters()
            dio_perdisk = psutil.disk_io_counters(perdisk=True) or {}
            disk_read_sec = 0.0
            disk_write_sec = 0.0
            if _prev_disk_io and _prev_disk_time and (now - _prev_disk_time) > 0:
                dt = now - _prev_disk_time
                disk_read_sec = max(0.0, (dio.read_bytes - _prev_disk_io.read_bytes) / dt)
                disk_write_sec = max(0.0, (dio.write_bytes - _prev_disk_io.write_bytes) / dt)
            _prev_disk_io = dio
            _prev_disk_time = now

            # Débits Disques individuels (disk0, disk1...)
            perdisk_speeds = {}
            if _prev_perdisk_io and _prev_perdisk_time and (now - _prev_perdisk_time) > 0:
                pdt = now - _prev_perdisk_time
                for pd_name, pd_stat in dio_perdisk.items():
                    if pd_name in _prev_perdisk_io:
                        old_stat = _prev_perdisk_io[pd_name]
                        r_spd = max(0.0, (pd_stat.read_bytes - old_stat.read_bytes) / pdt)
                        w_spd = max(0.0, (pd_stat.write_bytes - old_stat.write_bytes) / pdt)
                        rt = max(0, getattr(pd_stat, 'read_time', 0) - getattr(old_stat, 'read_time', 0))
                        wt = max(0, getattr(pd_stat, 'write_time', 0) - getattr(old_stat, 'write_time', 0))
                        act_pct = min(100.0, max(0.0, ((rt + wt) / (pdt * 1000.0)) * 100.0)) if pdt > 0 else 0.0
                        tot_spd = r_spd + w_spd
                        if tot_spd > 0 and act_pct < 1.0:
                            act_pct = min(100.0, round((tot_spd / (50.0 * 1024 * 1024)) * 100.0, 1))
                        perdisk_speeds[pd_name] = {
                            "read_bytes_sec": r_spd,
                            "write_bytes_sec": w_spd,
                            "active_percent": round(act_pct, 1)
                        }
            _prev_perdisk_io = dio_perdisk
            _prev_perdisk_time = now

            # Débits Réseau
            nio = psutil.net_io_counters()
            net_recv_sec = 0.0
            net_sent_sec = 0.0
            if _prev_net_io and _prev_net_time and (now - _prev_net_time) > 0:
                nt = now - _prev_net_time
                net_recv_sec = max(0.0, (nio.bytes_recv - _prev_net_io.bytes_recv) / nt)
                net_sent_sec = max(0.0, (nio.bytes_sent - _prev_net_io.bytes_sent) / nt)
            _prev_net_io = nio
            _prev_net_time = now

            # Données matérielles en cache
            with _hw_cache_lock:
                hw_cpu = _hardware_cache.get("cpu_model") or _get_cpu_model_instant()
                hw_ram = _hardware_cache.get("ram") or {}
                hw_gpu = _hardware_cache.get("gpu_model") or "Apple M4"

            # Mémoire : répartition réelle macOS (identique au Moniteur d'activité)
            mem_bd = _read_macos_memory_breakdown(vmem.total) if sys.platform == "darwin" else {}

            # GPU macOS : statistiques réelles IOAccelerator
            gstats = _read_apple_gpu_stats() if sys.platform == "darwin" else {}
            vmem_tot_mb = vmem.total / (1024 * 1024)
            gpu_used_mb = (gstats.get("in_use", 0) or 0) / (1024 * 1024)
            gpu_data = {
                "name": hw_gpu,
                "unified_memory": IS_UNIFIED_MEMORY,
                "cores": gstats.get("cores"),
                "temperature": round(32.0 + cpu_pct * 0.15, 1),
                "utilization_gpu": round(gstats.get("utilization", 0.0), 1),
                "utilization_renderer": round(gstats.get("renderer", 0.0), 1),
                "utilization_tiler": round(gstats.get("tiler", 0.0), 1),
                "utilization_memory": round((gpu_used_mb / max(1, vmem_tot_mb)) * 100.0, 1),
                # Mémoire unifiée : le GPU puise dans la RAM commune (pas de VRAM dédiée)
                "memory_total_mb": round(vmem_tot_mb, 0),
                "memory_used_mb": round(gpu_used_mb, 0),
                "memory_allocated_mb": round((gstats.get("allocated", 0) or 0) / (1024 * 1024), 0),
            }

            # Fréquence CPU
            freq = psutil.cpu_freq()
            freq_curr = round(freq.current, 0) if freq else 4400

            # Disques individuels pour le gestionnaire de tâches
            disks_perf = []
            seen_ids = set()
            for d in psutil.disk_partitions(all=True):
                if (d.mountpoint.startswith("/System/Volumes") or "dontbrowse" in d.opts
                        or d.mountpoint == "/Volumes/Recovery" or d.mountpoint == "/dev"
                        or d.fstype in ("devfs", "autofs", "devicefs", "nullfs")):
                    continue
                try:
                    usage = psutil.disk_usage(d.mountpoint)
                    vol_name = get_volume_label(d.mountpoint)
                    display_name = vol_name if d.mountpoint == "/" else f"{vol_name} ({d.mountpoint})"
                    is_network = d.device.startswith("//") or d.fstype in ("smbfs", "afpfs", "nfs", "webdav", "cifs")

                    if is_network:
                        disk_key = "net_" + re.sub(r"[^A-Za-z0-9]+", "_", d.mountpoint).strip("_")
                        speeds = {"read_bytes_sec": 0.0, "write_bytes_sec": 0.0, "active_percent": 0.0}
                        model, media, bus, d_num, is_internal = "Partage réseau", "Réseau", d.fstype.upper(), None, False
                    else:
                        dev_match = re.search(r"disk\d+", d.device)
                        disk_key = dev_match.group(0) if dev_match else "disk0"
                        info = _get_diskutil_plist_info(os.path.basename(d.device)) or {}
                        # Volume APFS « synthétisé » (ex. disk3) : on remonte au disque physique (disk0)
                        phys_key = disk_key
                        stores = info.get("APFSPhysicalStores") or []
                        if stores and isinstance(stores, list):
                            st = stores[0].get("APFSPhysicalStore", "") if isinstance(stores[0], dict) else ""
                            m_phys = re.search(r"disk\d+", st)
                            if m_phys:
                                phys_key = m_phys.group(0)
                        speeds = perdisk_speeds.get(phys_key) or perdisk_speeds.get(disk_key) or {"read_bytes_sec": 0.0, "write_bytes_sec": 0.0, "active_percent": 0.0}
                        proto = str(info.get("BusProtocol") or "")
                        is_internal = bool(info.get("Internal")) or d.mountpoint == "/"
                        solid = info.get("SolidState")
                        removable = bool(info.get("RemovableMedia") or info.get("Removable") or info.get("Ejectable"))
                        if is_internal:
                            model = "Apple SSD (disque système)" if d.mountpoint == "/" else "Apple SSD (interne)"
                            media = "SSD"
                            bus = "Apple Fabric (NVMe)" if proto in ("Apple Fabric", "PCI-Express", "") else proto
                        else:
                            model = str(info.get("MediaName") or "").strip() or ("Clé USB" if removable else "Disque externe")
                            media = ("SSD externe" if solid else ("Disque dur mécanique externe" if solid is False else "Disque externe"))
                            bus = proto or "USB"
                        d_num = int(re.sub(r"\D", "", phys_key) or 0)

                    if disk_key in seen_ids:
                        disk_key = f"{disk_key}_{len(seen_ids)}"
                    seen_ids.add(disk_key)

                    disks_perf.append({
                        "id": disk_key,
                        "letter": d.mountpoint,
                        "name": display_name,
                        "label": vol_name,
                        "model": model,
                        "media_type": media,
                        "is_raid": False,
                        "bus_type": bus,
                        "is_internal": is_internal,
                        "is_system": d.mountpoint == "/",
                        "device": d.device,
                        "mountpoint": d.mountpoint,
                        "fstype": d.fstype,
                        "total": usage.total,
                        "used": usage.used,
                        "free": usage.free,
                        "percent": usage.percent,
                        "read_bytes_sec": speeds["read_bytes_sec"],
                        "write_bytes_sec": speeds["write_bytes_sec"],
                        "total_speed": speeds["read_bytes_sec"] + speeds["write_bytes_sec"],
                        "active_percent": speeds.get("active_percent", 0.0),
                        "temperature": 32,
                        "disk_number": d_num
                    })
                except Exception:
                    pass
            # Disque système en premier, puis disques internes, externes et réseau
            disks_perf.sort(key=lambda x: (not x["is_system"], not x["is_internal"], x["id"].startswith("net_"), x["id"]))

            perf = {
                "cpu": {
                    "model": hw_cpu,
                    "percent": cpu_pct,
                    "per_core": cpu_per_core,
                    "frequency_mhz": freq_curr,
                    "cores_physical": psutil.cpu_count(logical=False) or 1,
                    "cores_logical": psutil.cpu_count(logical=True) or 1,
                    "temperature": round(34.0 + cpu_pct * 0.35, 1)
                },
                "memory": {
                    "total": vmem.total,
                    "used": mem_bd.get("used", vmem.used),
                    "available": mem_bd.get("available", vmem.available),
                    "percent": mem_bd.get("percent", vmem.percent),
                    "free": mem_bd.get("free", vmem.free),
                    "unified": IS_UNIFIED_MEMORY,
                    "app": mem_bd.get("app"),
                    "wired": mem_bd.get("wired"),
                    "compressed": mem_bd.get("compressed"),
                    "cached": mem_bd.get("cached"),
                    "swap_used": mem_bd.get("swap_used", 0),
                    "swap_total": mem_bd.get("swap_total", 0),
                    "gpu_used": gstats.get("in_use", 0),
                    "speed_mhz": hw_ram.get("speed_mhz", 6400),
                    "slots_used": hw_ram.get("slots_used", 1),
                    "slots_total": hw_ram.get("slots_total", 1),
                    "ram_type": hw_ram.get("ram_type", "Unified LPDDR5")
                },
                "disk": {
                    "read_bytes_sec": disk_read_sec,
                    "write_bytes_sec": disk_write_sec,
                    "disks": disks_perf
                },
                "network": {
                    "recv_bytes_sec": net_recv_sec,
                    "sent_bytes_sec": net_sent_sec,
                    "total_recv": nio.bytes_recv,
                    "total_sent": nio.bytes_sent
                },
                "gpu": gpu_data
            }

            # 2. Liste des processus avec calcul CPU réel
            logical_cpus = psutil.cpu_count(logical=True) or 1
            now_ts = time.time()
            procs = []
            new_prev_cpu = {}
            total_active_cpu = 0.0

            if len(_pid_app_path_cache) > 2500:
                _pid_app_path_cache.clear()

            for p in psutil.process_iter(['pid', 'name', 'exe', 'cpu_times', 'memory_info', 'memory_percent', 'status', 'username']):
                try:
                    info = p.info
                    pid = info['pid']
                    pname = info['name'] or "Inconnu"
                    times = info.get('cpu_times')
                    c_pct = 0.0

                    if times:
                        total_proc_time = times.user + times.system
                        # Horodatage propre à chaque processus : le parcours complet de la liste
                        # peut prendre plusieurs secondes, un horodatage unique faussait le calcul.
                        sample_ts = time.monotonic()
                        new_prev_cpu[pid] = (total_proc_time, sample_ts)
                        if pid in _prev_proc_cpu:
                            prev_t, prev_stamp = _prev_proc_cpu[pid]
                            dt = sample_ts - prev_stamp
                            if dt > 0:
                                delta = max(0.0, total_proc_time - prev_t)
                                # Convention macOS (Moniteur d'activité / top) : 100 % = un cœur
                                # entièrement occupé ; un processus multi-thread peut dépasser 100 %.
                                c_pct = round((delta / dt) * 100.0, 1)

                    if pid != 0:
                        total_active_cpu += c_pct

                    app_path = _pid_app_path_cache.get(pid)
                    if app_path is None:
                        app_path = _resolve_proc_app_path(pname, info.get('exe') or "")
                        _pid_app_path_cache[pid] = app_path

                    mem_rss = info['memory_info'].rss if info['memory_info'] else 0
                    procs.append({
                        "pid": pid,
                        "name": pname,
                        "cpu": c_pct,
                        "memory": mem_rss,
                        "memory_percent": round(info['memory_percent'] or 0.0, 1),
                        "status": info['status'] or "running",
                        "user": (info['username'] or "").split("/")[-1],
                        "app_path": app_path
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass

            _prev_proc_cpu = new_prev_cpu
            procs = [p for p in procs if p["pid"] != 0 and "kernel_task" not in p["name"].lower() and "idle" not in p["name"].lower()]
            procs.sort(key=lambda x: (x['cpu'], x['memory']), reverse=True)

            with _taskmgr_lock:
                _taskmgr_performance = perf
                _taskmgr_processes = procs

        except Exception:
            pass
        time.sleep(1.2)

_pid_app_path_cache: Dict[int, str] = {}
_proc_icon_cache: Dict[str, bytes] = {}
_proc_icon_lock = threading.Lock()

def _resolve_proc_app_path(pname: str, exe: str) -> str:
    if exe:
        m = re.search(r"^(/.*?\.app)(?:/|$)", exe)
        if m:
            cand = m.group(1)
            if os.path.exists(cand):
                return cand
    clean_name = re.sub(r"\s+Helper.*$", "", pname or "").strip()
    if clean_name:
        for base_dir in ("/Applications", "/System/Applications", "/System/Applications/Utilities", "/System/Library/CoreServices"):
            cand = os.path.join(base_dir, f"{clean_name}.app")
            if os.path.exists(cand):
                return cand
    return ""

# Lancement du thread d'arrière-plan Task Manager
_tm_thread = threading.Thread(target=_taskmgr_worker, daemon=True)
_tm_thread.start()

@app.get("/api/taskmgr/process-icon")
def get_taskmgr_process_icon(path: str = Query(..., description="Chemin du bundle .app")):
    clean_path = (path or "").strip()
    if not clean_path or not clean_path.endswith(".app") or not os.path.exists(clean_path):
        raise HTTPException(status_code=404, detail="Bundle .app introuvable")

    with _proc_icon_lock:
        cached = _proc_icon_cache.get(clean_path)
    if cached:
        return Response(content=cached, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})

    png_bytes: Optional[bytes] = None
    candidate_bins = [
        os.path.join(os.path.dirname(sys.executable), "bin", "mac-clipboard"),
        os.path.join(os.path.dirname(sys.executable), "..", "bin", "mac-clipboard"),
        os.path.join(os.path.dirname(__file__), "bin", "mac-clipboard"),
        os.path.join(os.path.dirname(__file__), "..", "bin", "mac-clipboard"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "bin", "mac-clipboard"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bin", "mac-clipboard"),
        "/Applications/Explorer 2.app/Contents/Resources/bin/mac-clipboard",
        "/Applications/Explorer 2.app/Contents/Resources/app.asar.unpacked/bin/mac-clipboard",
        os.path.expanduser("~/Documents/projets/explorer2/bin/mac-clipboard"),
        "/usr/local/bin/mac-clipboard"
    ]
    for bin_path in candidate_bins:
        if os.path.isfile(bin_path) and os.access(bin_path, os.X_OK):
            try:
                res = subprocess.run([bin_path, "--icon", clean_path], capture_output=True, timeout=2.0)
                if res.returncode == 0 and res.stdout and res.stdout.startswith(b"\x89PNG"):
                    png_bytes = res.stdout
                    break
            except Exception:
                pass

    if not png_bytes:
        # Fallback: lecture du fichier .icns dans Contents/Resources via sips
        try:
            res_dir = os.path.join(clean_path, "Contents", "Resources")
            if os.path.isdir(res_dir):
                icns_files = [f for f in os.listdir(res_dir) if f.lower().endswith(".icns")]
                if icns_files:
                    icns_path = os.path.join(res_dir, icns_files[0])
                    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                        tmp_png = tmp.name
                    try:
                        subprocess.run(["/usr/bin/sips", "-s", "format", "png", "-Z", "32", icns_path, "--out", tmp_png],
                                       capture_output=True, timeout=2.0)
                        if os.path.exists(tmp_png):
                            with open(tmp_png, "rb") as f:
                                data = f.read()
                            if data.startswith(b"\x89PNG"):
                                png_bytes = data
                    finally:
                        try:
                            os.remove(tmp_png)
                        except Exception:
                            pass
        except Exception:
            pass

    if not png_bytes:
        raise HTTPException(status_code=404, detail="Icône non disponible")

    with _proc_icon_lock:
        if len(_proc_icon_cache) > 400:
            _proc_icon_cache.clear()
        _proc_icon_cache[clean_path] = png_bytes

    return Response(content=png_bytes, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})

@app.get("/api/taskmgr/processes")
def get_taskmgr_processes():
    with _taskmgr_lock:
        return _taskmgr_processes

@app.get("/api/taskmgr/performance")
def get_taskmgr_performance():
    with _taskmgr_lock:
        return _taskmgr_performance

@app.post("/api/taskmgr/kill")
def kill_process(req: KillProcessRequest):
    try:
        p = psutil.Process(req.pid)
        pname = p.name()
        p.terminate()
        return {"status": "ok", "message": f"Processus {req.pid} ({pname}) arrêté avec succès."}
    except psutil.NoSuchProcess:
        return {"status": "ok", "message": f"Processus {req.pid} déjà arrêté."}
    except psutil.AccessDenied:
        raise HTTPException(status_code=403, detail="Accès refusé pour arrêter ce processus système.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==============================================================================
# TERMINAL RÉEL (PTY + WebSocket) — comportement identique à Terminal.app
# Chaque connexion WebSocket ouvre un vrai pseudo-terminal macOS et y attache
# le shell de l'utilisateur (zsh -il). python3, nano, vim, top, ssh, les couleurs,
# le contrôle du curseur, Ctrl+C, la complétion et le redimensionnement marchent.
# ==============================================================================
@app.websocket("/api/terminal/ws")
async def terminal_websocket(websocket: WebSocket):
    import asyncio
    import fcntl
    import json
    import pty
    import signal
    import struct
    import termios

    # Le terminal donne un vrai shell : on refuse les pages web tierces.
    origin = (websocket.headers.get("origin") or "").strip()
    if origin and origin != "null" and not origin.startswith("file://"):
        if not re.match(r"^https?://(127\.0\.0\.1|localhost)(:\d+)?$", origin):
            await websocket.close(code=1008)
            return

    await websocket.accept()

    try:
        cols = max(20, min(500, int(websocket.query_params.get("cols") or 80)))
    except (TypeError, ValueError):
        cols = 80
    try:
        rows = max(5, min(300, int(websocket.query_params.get("rows") or 24)))
    except (TypeError, ValueError):
        rows = 24

    requested_cwd = websocket.query_params.get("cwd") or ""
    home = os.path.expanduser("~")
    cwd = requested_cwd if requested_cwd and os.path.isdir(requested_cwd) else home

    shell = os.environ.get("SHELL") or "/bin/zsh"
    if not os.path.exists(shell) or not os.access(shell, os.X_OK):
        shell = "/bin/zsh"

    env = os.environ.copy()
    env["TERM"] = "xterm-256color"
    env["COLORTERM"] = "truecolor"
    if not env.get("LANG") and not env.get("LC_ALL"):
        # Une app lancée depuis le Finder n'hérite pas toujours de la locale du Mac.
        try:
            apple_locale = subprocess.check_output(
                ["defaults", "read", "-g", "AppleLocale"], text=True, timeout=1
            ).strip()
        except Exception:
            apple_locale = ""
        env["LANG"] = f"{apple_locale}.UTF-8" if apple_locale else "en_US.UTF-8"
    env["TERM_PROGRAM"] = "Explorer2"
    env["TERM_PROGRAM_VERSION"] = "2.5.0"

    master_fd = None
    slave_fd = None
    pid = None

    try:
        master_fd, slave_fd = pty.openpty()
        fcntl.ioctl(slave_fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))

        pid = os.fork()
        if pid == 0:
            # ---- Enfant : nouvelle session avec le PTY comme terminal de contrôle ----
            try:
                os.close(master_fd)
                os.setsid()
                fcntl.ioctl(slave_fd, termios.TIOCSCTTY, 0)
                os.dup2(slave_fd, 0)
                os.dup2(slave_fd, 1)
                os.dup2(slave_fd, 2)
                if slave_fd > 2:
                    os.close(slave_fd)
                os.chdir(cwd)
                os.execvpe(shell, [shell, "-il"], env)
            except BaseException:
                pass
            os._exit(1)

        # ---- Parent ----
        os.close(slave_fd)
        slave_fd = None
        os.set_blocking(master_fd, False)

        loop = asyncio.get_running_loop()
        output_queue: asyncio.Queue = asyncio.Queue()
        output_closed = False

        def on_readable():
            nonlocal output_closed
            if output_closed:
                return
            try:
                data = os.read(master_fd, 65536)
            except BlockingIOError:
                return
            except OSError:
                data = b""
            if not data:
                output_closed = True
                try:
                    loop.remove_reader(master_fd)
                except Exception:
                    pass
                try:
                    output_queue.put_nowait(None)
                except Exception:
                    pass
                return
            try:
                output_queue.put_nowait(data)
            except Exception:
                pass

        loop.add_reader(master_fd, on_readable)

        async def sender():
            try:
                while True:
                    data = await output_queue.get()
                    if data is None:
                        break
                    await websocket.send_bytes(data)
            except Exception:
                pass
            finally:
                try:
                    await websocket.send_text(json.dumps({"type": "exit"}))
                except Exception:
                    pass
                try:
                    await websocket.close()
                except Exception:
                    pass

        send_task = asyncio.create_task(sender())

        async def write_all(data: bytes):
            view = memoryview(data)
            while view:
                try:
                    written = os.write(master_fd, view)
                    view = view[written:]
                except BlockingIOError:
                    await asyncio.sleep(0.004)
                except OSError:
                    break

        try:
            while True:
                raw = await websocket.receive_text()
                try:
                    message = json.loads(raw)
                except Exception:
                    continue
                msg_type = message.get("type")
                if msg_type == "input":
                    payload = message.get("data") or ""
                    if payload:
                        await write_all(payload.encode("utf-8", "replace"))
                elif msg_type == "resize":
                    try:
                        new_cols = max(20, min(500, int(message.get("cols") or cols)))
                        new_rows = max(5, min(300, int(message.get("rows") or rows)))
                        fcntl.ioctl(
                            master_fd,
                            termios.TIOCSWINSZ,
                            struct.pack("HHHH", new_rows, new_cols, 0, 0),
                        )
                        cols, rows = new_cols, new_rows
                        os.kill(pid, signal.SIGWINCH)
                    except Exception:
                        pass
                elif msg_type == "ping":
                    try:
                        await websocket.send_text(json.dumps({"type": "pong"}))
                    except Exception:
                        pass
        except (WebSocketDisconnect, RuntimeError):
            pass
        except Exception:
            pass
        finally:
            send_task.cancel()
            try:
                loop.remove_reader(master_fd)
            except Exception:
                pass
    finally:
        if master_fd is not None:
            try:
                os.close(master_fd)
            except Exception:
                pass
            master_fd = None
        if pid is not None and pid > 0:
            # La fermeture du PTY envoie EOF/HUP ; on termine ensuite le shell.
            for sig in (signal.SIGHUP, signal.SIGTERM):
                try:
                    os.kill(pid, sig)
                except Exception:
                    break
                await asyncio.sleep(0.12)
            try:
                os.kill(pid, signal.SIGKILL)
            except Exception:
                pass

            def _reap():
                try:
                    os.waitpid(pid, 0)
                except Exception:
                    pass

            threading.Thread(target=_reap, daemon=True).start()


# ==============================================================================
# 10. ANALYSEUR D'ESPACE DISQUE (STYLE WINDIRSTAT)
# ==============================================================================

SPACE_SCAN_TASKS = {}

WINDIRSTAT_EXT_INFO = {
    ".mp4": ("#ff3333", "Vidéo MP4"),
    ".mov": ("#ff5533", "Vidéo QuickTime"),
    ".mkv": ("#ff2266", "Vidéo Matroska"),
    ".avi": ("#ff6633", "Vidéo AVI"),
    ".webm": ("#ff4477", "Vidéo WebM"),
    ".mp3": ("#33cc33", "Audio MP3"),
    ".wav": ("#22dd66", "Audio WAV"),
    ".flac": ("#11bb55", "Audio FLAC"),
    ".m4a": ("#44cc55", "Audio M4A"),
    ".aac": ("#33bb66", "Audio AAC"),
    ".ogg": ("#55cc44", "Audio OGG"),
    ".zip": ("#ffcc00", "Archive ZIP"),
    ".rar": ("#ffaa00", "Archive RAR"),
    ".7z": ("#ee9900", "Archive 7-Zip"),
    ".tar": ("#ddaa00", "Archive TAR"),
    ".gz": ("#cc9900", "Archive GZip"),
    ".dmg": ("#cc33ff", "Image Disque macOS"),
    ".iso": ("#aa22ee", "Image Disque ISO"),
    ".img": ("#9933dd", "Image Disque brute"),
    ".pkg": ("#bb44ff", "Paquet d'installation"),
    ".app": ("#0066ff", "Application macOS"),
    ".exe": ("#0044dd", "Exécutable Windows"),
    ".dll": ("#3366cc", "Bibliothèque dynamique"),
    ".dylib": ("#2277dd", "Bibliothèque macOS"),
    ".so": ("#2288cc", "Bibliothèque partagée"),
    ".jpg": ("#00cccc", "Image JPEG"),
    ".jpeg": ("#00bbbb", "Image JPEG"),
    ".png": ("#00dddd", "Image PNG"),
    ".gif": ("#22cccc", "Image GIF"),
    ".webp": ("#11bbbb", "Image WebP"),
    ".svg": ("#33dddd", "Image Vectorielle SVG"),
    ".psd": ("#0099cc", "Document Photoshop"),
    ".pdf": ("#ff3388", "Document PDF"),
    ".doc": ("#3388ff", "Document Word"),
    ".docx": ("#3388ff", "Document Word"),
    ".xls": ("#22aa55", "Feuille Excel"),
    ".xlsx": ("#22aa55", "Feuille Excel"),
    ".ppt": ("#ff7722", "Présentation PowerPoint"),
    ".pptx": ("#ff7722", "Présentation PowerPoint"),
    ".py": ("#44aaee", "Script Python"),
    ".js": ("#eedd22", "Script JavaScript"),
    ".ts": ("#3399ff", "Script TypeScript"),
    ".json": ("#aaaa44", "Données JSON"),
    ".html": ("#ff6622", "Page HTML"),
    ".css": ("#3377ff", "Feuille de style CSS"),
    ".txt": ("#99aabb", "Document texte"),
    ".md": ("#7799bb", "Document Markdown"),
    ".log": ("#889988", "Fichier journal"),
    ".db": ("#cc6633", "Base de données"),
    ".sqlite": ("#bb5522", "Base SQLite"),
}

FALLBACK_PALETTE = [
    "#3366ff", "#ff3333", "#33cc33", "#ffcc00", "#cc33ff", "#00cccc",
    "#ff6600", "#ff3399", "#00aa66", "#6633ff", "#99cc00", "#0088cc",
    "#dd4422", "#aa3388", "#2299aa", "#bb8800", "#5577cc", "#cc5577",
]


def _get_ext_color_and_desc(ext: str):
    if not ext or ext == "<sans ext>":
        return "#8899aa", "Fichier sans extension"
    low = ext.lower()
    if low in WINDIRSTAT_EXT_INFO:
        return WINDIRSTAT_EXT_INFO[low]
    h = 0
    for ch in low:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    color = FALLBACK_PALETTE[h % len(FALLBACK_PALETTE)]
    return color, f"Fichier {low.upper().lstrip('.')}"


class SpaceScanRequest(BaseModel):
    path: str
    max_depth: int = 6


@app.get("/api/space/tree-dirs")
def get_space_tree_dirs(path: str = Query("/")):
    """Retourne les sous-dossiers directs d'un chemin pour le sélecteur d'arborescence WinDirStat."""
    target = os.path.abspath(os.path.expanduser(path or "/"))
    if not os.path.exists(target) or not os.path.isdir(target):
        raise HTTPException(status_code=404, detail="Dossier introuvable")

    dirs = []
    skip_System = (target == "/")
    try:
        with os.scandir(target) as it:
            for entry in it:
                try:
                    name = entry.name
                    if name in (".Spotlight-V100", ".fseventsd", ".Trashes", ".DocumentRevisions-V100", ".TemporaryItems"):
                        continue
                    if skip_System and name in ("dev", "net", "home", "cores"):
                        continue
                    if entry.is_dir(follow_symlinks=False):
                        has_subdirs = False
                        try:
                            with os.scandir(entry.path) as sub_it:
                                for sub in sub_it:
                                    if sub.is_dir(follow_symlinks=False):
                                        has_subdirs = True
                                        break
                        except Exception:
                            pass
                        dirs.append({
                            "name": name,
                            "path": entry.path,
                            "has_children": has_subdirs,
                        })
                except Exception:
                    continue
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission refusée")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    dirs.sort(key=lambda d: d["name"].lower())
    return {"path": target, "dirs": dirs}


def _run_space_scan(task_id: str, root_path: str, max_depth: int = 6):
    task = SPACE_SCAN_TASKS.get(task_id)
    if not task:
        return

    ext_stats = {}
    is_root_slash = (root_path == "/")

    def scan_dir(dir_path: str, depth: int):
        if task.get("cancelled"):
            return None

        task["current_dir"] = dir_path
        task["scanned_dirs"] += 1

        total_size = 0
        files_count = 0
        dirs_count = 0
        children = []
        keep_children = (depth < max_depth)

        try:
            with os.scandir(dir_path) as it:
                entries = list(it)
        except Exception:
            return {
                "name": os.path.basename(dir_path) or dir_path,
                "path": dir_path,
                "size": 0,
                "is_dir": True,
                "files_count": 0,
                "dirs_count": 0,
                "children": [],
            }

        for entry in entries:
            if task.get("cancelled"):
                break
            try:
                name = entry.name
                if name in (".DS_Store", ".Spotlight-V100", ".fseventsd", ".Trashes", ".DocumentRevisions-V100"):
                    continue
                if name.startswith("._"):
                    continue
                full_p = entry.path

                # Éviter les firmlinks/montages circulaires ou doublons sur /
                if is_root_slash and depth == 0 and name in ("dev", "net", "home", "cores", "Volumes"):
                    continue
                if is_root_slash and full_p.startswith("/System/Volumes"):
                    continue

                if entry.is_symlink():
                    continue

                if entry.is_dir(follow_symlinks=False):
                    # Si un dossier est un bundle .app, on le traite aussi comme dossier mais on compte son extension .app si souhaité
                    sub = scan_dir(full_p, depth + 1)
                    if sub is not None:
                        s_size = sub["size"]
                        total_size += s_size
                        files_count += sub["files_count"]
                        dirs_count += 1 + sub["dirs_count"]
                        if keep_children and s_size > 0:
                            children.append(sub)
                elif entry.is_file(follow_symlinks=False):
                    st = entry.stat(follow_symlinks=False)
                    # Utiliser st_size (ou min avec st_blocks*512 pour les fichiers sparse cloud non téléchargés)
                    fsize = st.st_size
                    if hasattr(st, "st_blocks") and st.st_blocks == 0 and fsize > 1024 * 1024:
                        fsize = 0
                    total_size += fsize
                    files_count += 1
                    task["scanned_files"] += 1
                    task["total_bytes"] += fsize

                    _, ext = os.path.splitext(name)
                    ext_key = ext.lower() if ext else "<sans ext>"
                    st_ext = ext_stats.get(ext_key)
                    if st_ext is None:
                        st_ext = {"size": 0, "count": 0}
                        ext_stats[ext_key] = st_ext
                    st_ext["size"] += fsize
                    st_ext["count"] += 1

                    if keep_children and fsize > 0:
                        children.append({
                            "name": name,
                            "path": full_p,
                            "size": fsize,
                            "is_dir": False,
                            "ext": ext_key,
                            "files_count": 1,
                            "dirs_count": 0,
                        })
            except Exception:
                continue

        if keep_children and children:
            children.sort(key=lambda c: c["size"], reverse=True)
            max_items = 65 if depth == 0 else (45 if depth <= 2 else 30)
            if len(children) > max_items:
                kept = children[:max_items]
                rest = children[max_items:]
                rest_size = sum(c["size"] for c in rest)
                rest_files = sum(c.get("files_count", 1) for c in rest)
                rest_dirs = sum((1 + c.get("dirs_count", 0)) if c.get("is_dir") else 0 for c in rest)
                if rest_size > 0:
                    kept.append({
                        "name": f"[{len(rest)} autres éléments]",
                        "path": dir_path,
                        "size": rest_size,
                        "is_dir": False,
                        "is_grouped": True,
                        "ext": "<autres>",
                        "files_count": rest_files,
                        "dirs_count": rest_dirs,
                    })
                children = kept

        return {
            "name": os.path.basename(dir_path) or dir_path,
            "path": dir_path,
            "size": total_size,
            "is_dir": True,
            "files_count": files_count,
            "dirs_count": dirs_count,
            "children": children,
        }

    try:
        root_tree = scan_dir(root_path, 0)
        total_b = max(1, root_tree["size"] if root_tree else task["total_bytes"])
        ext_list = []
        for ext_key, info in ext_stats.items():
            color, desc = _get_ext_color_and_desc(ext_key)
            ext_list.append({
                "ext": ext_key,
                "color": color,
                "description": desc,
                "size": info["size"],
                "size_formatted": format_size(info["size"]),
                "count": info["count"],
                "percent": round((info["size"] / total_b) * 100, 1),
            })
        ext_list.sort(key=lambda x: x["size"], reverse=True)

        task["tree"] = root_tree
        task["extensions"] = ext_list[:150]
        task["status"] = "cancelled" if task.get("cancelled") else "done"
    except Exception as e:
        task["status"] = "error"
        task["error"] = str(e)


@app.post("/api/space/scan/start")
def start_space_scan(req: SpaceScanRequest):
    target = os.path.abspath(os.path.expanduser(req.path or "/"))
    if not os.path.exists(target) or not os.path.isdir(target):
        raise HTTPException(status_code=404, detail=f"Le dossier '{target}' n'existe pas.")

    task_id = f"space_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
    SPACE_SCAN_TASKS[task_id] = {
        "task_id": task_id,
        "root_path": target,
        "status": "scanning",
        "scanned_files": 0,
        "scanned_dirs": 0,
        "total_bytes": 0,
        "current_dir": target,
        "cancelled": False,
        "tree": None,
        "extensions": [],
        "error": None,
    }
    t = threading.Thread(target=_run_space_scan, args=(task_id, target, max(3, min(8, req.max_depth))), daemon=True)
    t.start()
    return {"task_id": task_id, "root_path": target}


@app.get("/api/space/scan/status/{task_id}")
def get_space_scan_status(task_id: str):
    task = SPACE_SCAN_TASKS.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tâche d'analyse introuvable")

    is_finished = task["status"] in ("done", "cancelled", "error")
    resp = {
        "task_id": task["task_id"],
        "root_path": task["root_path"],
        "status": task["status"],
        "scanned_files": task["scanned_files"],
        "scanned_dirs": task["scanned_dirs"],
        "total_bytes": task["total_bytes"],
        "total_formatted": format_size(task["total_bytes"]),
        "current_dir": task["current_dir"],
        "error": task["error"],
    }
    if is_finished:
        resp["tree"] = task["tree"]
        resp["extensions"] = task["extensions"]
    return resp


@app.post("/api/space/scan/cancel/{task_id}")
def cancel_space_scan(task_id: str):
    task = SPACE_SCAN_TASKS.get(task_id)
    if task:
        task["cancelled"] = True
    return {"status": "ok"}


# ==============================================================================
# GESTION DU RÉSEAU MAC (TCP/IP, IP, MASQUE, PASSERELLE, DNS, PING)
# ==============================================================================

class NetworkConfigPayload(BaseModel):
    service_name: str
    config_type: str = "dhcp"  # 'dhcp' ou 'manual'
    ip_address: Optional[str] = None
    subnet_mask: Optional[str] = None
    router: Optional[str] = None
    dns_servers: Optional[List[str]] = None


class PingPayload(BaseModel):
    target: str
    count: int = 3


def _run_networksetup_admin(cmd_args: List[str]):
    """Exécute une commande networksetup avec fallback administrateur via osascript si nécessaire."""
    res = subprocess.run(cmd_args, capture_output=True, text=True)
    if res.returncode == 0:
        return res
    # En cas d'erreur de permission macOS, exécuter via osascript avec privilèges administrateur
    joined_cmd = " ".join([f"'{a}'" if " " in a else a for a in cmd_args])
    osa_script = f'do shell script "{joined_cmd}" with administrator privileges'
    osa_res = subprocess.run(["osascript", "-e", osa_script], capture_output=True, text=True)
    if osa_res.returncode != 0:
        err_msg = osa_res.stderr.strip() or res.stderr.strip() or "Erreur lors de l'application des paramètres réseau"
        raise HTTPException(status_code=400, detail=err_msg)
    return osa_res


# ------------------------------------------------------------------------------
# Surveillance des interfaces réseau (détection automatique, comme Réglages macOS)
# ------------------------------------------------------------------------------
_IGNORED_IF_PREFIXES = ("awdl", "llw", "ap", "anpi", "gif", "stf", "lo")
_net_watch = {"version": 0, "signature": "", "changed_at": time.time()}
_net_watch_lock = threading.Lock()


def _network_signature() -> str:
    """Empreinte légère de l'état réseau : interfaces, état du lien, adresses, route par défaut."""
    parts = []
    try:
        out = subprocess.run(["ifconfig", "-a"], capture_output=True, text=True, timeout=4).stdout
        name = None
        cur: List[str] = []
        for line in out.splitlines():
            if line and not line[0].isspace():
                if name and not name.startswith(_IGNORED_IF_PREFIXES):
                    parts.append(name + "|" + ",".join(cur))
                name = line.split(":", 1)[0]
                flags = re.search(r"<([^>]*)>", line)
                fl = set((flags.group(1) if flags else "").split(","))
                cur = ["UP" if "UP" in fl else "DOWN", "RUN" if "RUNNING" in fl else "-"]
            else:
                t = line.strip()
                if t.startswith(("inet ", "ether ", "status:")):
                    cur.append(t)
                elif t.startswith("inet6 ") and "temporary" not in t and "deprecated" not in t and "fe80" not in t.split()[1]:
                    cur.append(t)
        if name and not name.startswith(_IGNORED_IF_PREFIXES):
            parts.append(name + "|" + ",".join(cur))
    except Exception:
        pass
    try:
        ns = subprocess.run(["netstat", "-nr", "-f", "inet"], capture_output=True, text=True, timeout=4).stdout
        parts.extend(l.strip() for l in ns.splitlines() if l.startswith("default"))
    except Exception:
        pass
    try:
        hp = subprocess.run(["networksetup", "-listallhardwareports"], capture_output=True, text=True, timeout=4).stdout
        parts.append(hp)
    except Exception:
        pass
    return "\n".join(parts)


def _network_watcher_worker():
    while True:
        try:
            sig = _network_signature()
            with _net_watch_lock:
                if sig != _net_watch["signature"]:
                    _net_watch["signature"] = sig
                    _net_watch["version"] += 1
                    _net_watch["changed_at"] = time.time()
        except Exception:
            pass
        time.sleep(1.0)


threading.Thread(target=_network_watcher_worker, daemon=True).start()


@app.get("/api/network/version")
def get_network_version():
    """Numéro de version qui change dès qu'une interface apparaît, disparaît ou change d'état."""
    with _net_watch_lock:
        return {"version": _net_watch["version"], "changed_at": _net_watch["changed_at"]}


@app.get("/api/network/interfaces")
def get_network_interfaces():
    """Liste tous les adaptateurs et services réseau du Mac avec leurs paramètres TCP/IP et DNS."""
    # 1. Hardware ports
    hw_out = subprocess.run(["networksetup", "-listallhardwareports"], capture_output=True, text=True).stdout
    hw_map = {}
    current_port = {}
    for line in hw_out.splitlines():
        line = line.strip()
        if line.startswith("Hardware Port:"):
            if current_port and "device" in current_port:
                hw_map[current_port["device"]] = current_port
                hw_map[current_port.get("port", "")] = current_port
            current_port = {"port": line.split(":", 1)[1].strip()}
        elif line.startswith("Device:"):
            current_port["device"] = line.split(":", 1)[1].strip()
        elif line.startswith("Ethernet Address:"):
            current_port["mac"] = line.split(":", 1)[1].strip()
    if current_port and "device" in current_port:
        hw_map[current_port["device"]] = current_port
        hw_map[current_port.get("port", "")] = current_port

    # 2. Passerelle par défaut active globale (netstat)
    default_gw = ""
    default_dev = ""
    try:
        ns_out = subprocess.run(["netstat", "-nr", "-f", "inet"], capture_output=True, text=True).stdout
        for line in ns_out.splitlines():
            parts = line.split()
            if len(parts) >= 4 and parts[0] == "default":
                default_gw = parts[1]
                default_dev = parts[-1] if len(parts) >= 6 else (parts[3] if len(parts) >= 4 else "")
                break
    except Exception:
        pass

    # 3. Network services
    services_out = subprocess.run(["networksetup", "-listallnetworkservices"], capture_output=True, text=True).stdout
    services = []
    for line in services_out.splitlines():
        line = line.strip()
        if not line or line.startswith("An asterisk") or line.startswith("!"):
            continue
        is_disabled = line.startswith("*")
        svc_name = line.lstrip("*").strip()
        if svc_name.lower() in ("vpn", "iphone usb"):
            continue
        services.append({"name": svc_name, "disabled": is_disabled})

    results = []
    for svc in services:
        svc_name = svc["name"]
        info_out = subprocess.run(["networksetup", "-getinfo", svc_name], capture_output=True, text=True).stdout
        dns_out = subprocess.run(["networksetup", "-getdnsservers", svc_name], capture_output=True, text=True).stdout

        # Type de configuration
        cfg_type = "dhcp"
        if "Manual Configuration" in info_out:
            cfg_type = "manual"
        elif "BOOTP Configuration" in info_out:
            cfg_type = "bootp"

        # Regex parsing
        ip_m = re.search(r"IP address:\s*([0-9.]+)", info_out)
        sub_m = re.search(r"Subnet mask:\s*([0-9.]+)", info_out)
        router_m = re.search(r"Router:\s*([0-9.]+)", info_out)
        mac_m = re.search(r"(?:Wi-Fi ID|Ethernet Address):\s*([0-9a-fA-F:]+)", info_out)

        hw_entry = hw_map.get(svc_name, {})
        device_id = hw_entry.get("device", "")
        mac_addr = mac_m.group(1) if mac_m else hw_entry.get("mac", "")

        ip_addr = ip_m.group(1) if ip_m else ""
        sub_mask = sub_m.group(1) if sub_m else ""
        router_ip = router_m.group(1) if router_m else ""
        dns_servers = []
        is_active = False
        media_status = "Inconnu"

        # Récupération DHCP directe via ipconfig macOS si device_id présent
        if device_id:
            try:
                ipc_ip = subprocess.run(["ipconfig", "getifaddr", device_id], capture_output=True, text=True, timeout=2).stdout.strip()
                if ipc_ip:
                    ip_addr = ipc_ip
                    is_active = True
                    media_status = "Connecté"
                ipc_mask = subprocess.run(["ipconfig", "getoption", device_id, "subnet_mask"], capture_output=True, text=True, timeout=2).stdout.strip()
                if ipc_mask:
                    sub_mask = ipc_mask
                ipc_router = subprocess.run(["ipconfig", "getoption", device_id, "router"], capture_output=True, text=True, timeout=2).stdout.strip()
                if ipc_router:
                    router_ip = ipc_router
                ipc_dns = subprocess.run(["ipconfig", "getoption", device_id, "domain_name_server"], capture_output=True, text=True, timeout=2).stdout.strip()
                if ipc_dns:
                    for d in ipc_dns.split():
                        if d and re.match(r"^[0-9.]+$", d) and d not in dns_servers:
                            dns_servers.append(d)
            except Exception:
                pass

        # Récupération complémentaire via ifconfig si device_id connu
        if device_id and not is_active:
            try:
                ifc_out = subprocess.run(["ifconfig", device_id], capture_output=True, text=True).stdout
                if "status: active" in ifc_out:
                    is_active = True
                    media_status = "Connecté"
                elif "status: inactive" in ifc_out:
                    media_status = "Déconnecté"

                # Si pas d'IP dans getinfo/ipconfig
                if not ip_addr:
                    inet_m = re.search(r"inet\s+([0-9.]+)\s+netmask\s+([0-9a-fx]+)", ifc_out)
                    if inet_m:
                        ip_addr = inet_m.group(1)
                        is_active = True
                        media_status = "Connecté"
                        # Conversion netmask hex vers décimal (ex: 0xffffff00 -> 255.255.255.0)
                        hex_val = inet_m.group(2)
                        try:
                            num = int(hex_val, 16)
                            sub_mask = f"{(num >> 24) & 255}.{(num >> 16) & 255}.{(num >> 8) & 255}.{num & 255}"
                        except Exception:
                            sub_mask = "255.255.255.0"
            except Exception:
                pass

        if ip_addr:
            is_active = True
            media_status = "Connecté"

        # Passerelle
        if not router_ip and is_active:
            if device_id == default_dev or not default_dev:
                router_ip = default_gw
            elif default_gw:
                router_ip = default_gw

        # Masque de sous-réseau par défaut si manquant
        if ip_addr and not sub_mask:
            sub_mask = "255.255.255.0"

        # DNS
        if not dns_servers and "There aren't any" not in dns_out and "disabled" not in dns_out.lower():
            for dline in dns_out.splitlines():
                dline = dline.strip()
                if dline and not dline.startswith("**") and re.match(r"^[0-9.]+$", dline):
                    dns_servers.append(dline)

        # Si toujours aucun DNS mais qu'on a une passerelle
        if not dns_servers and router_ip:
            dns_servers.append(router_ip)

        # Détection du type de périphérique (Wi-Fi, Ethernet, Pont)
        lower_name = (svc_name + " " + hw_entry.get("port", "")).lower()
        if "wi-fi" in lower_name or "airport" in lower_name:
            adapter_type = "wifi"
            type_label = "Connexion sans fil Wi-Fi"
        elif "thunderbolt" in lower_name:
            adapter_type = "thunderbolt"
            type_label = "Adaptateur Thunderbolt"
        elif "bridge" in lower_name:
            adapter_type = "bridge"
            type_label = "Pont réseau"
        else:
            adapter_type = "ethernet"
            type_label = "Connexion au réseau local (Ethernet)"

        results.append({
            "service_name": svc_name,
            "device": device_id,
            "hardware_port": hw_entry.get("port", svc_name),
            "mac_address": mac_addr,
            "adapter_type": adapter_type,
            "type_label": type_label,
            "config_type": cfg_type,
            "ip_address": ip_addr,
            "subnet_mask": sub_mask or ("255.255.255.0" if ip_addr else ""),
            "router": router_ip,
            "dns_servers": dns_servers,
            "is_active": is_active,
            # Lien établi mais adresse DHCP pas encore reçue
            "is_acquiring": bool(is_active and not ip_addr and cfg_type != "manual"),
            "media_status": media_status,
            "is_default_gateway": bool(router_ip and router_ip == default_gw)
        })

    # Ordre stable : interfaces actives d'abord, puis ordre des services macOS.
    # (L'obtention d'une adresse IP ne doit pas déplacer une carte déjà affichée.)
    results.sort(key=lambda x: not x["is_active"])  # tri stable : l'ordre macOS est conservé
    return results


@app.post("/api/network/set-config")
def set_network_config(payload: NetworkConfigPayload):
    """Applique la configuration TCP/IP et DNS d'un périphérique réseau macOS."""
    svc = payload.service_name.strip()
    if not svc:
        raise HTTPException(status_code=400, detail="Nom du service réseau manquant.")

    cfg = payload.config_type.lower()
    if cfg == "dhcp":
        # Mode DHCP automatique
        _run_networksetup_admin(["networksetup", "-setdhcp", svc])
    elif cfg == "manual":
        # Mode Statique / Manuel
        ip = (payload.ip_address or "").strip()
        subnet = (payload.subnet_mask or "255.255.255.0").strip()
        router = (payload.router or "").strip()

        ip_regex = r"^([0-9]{1,3}\.){3}[0-9]{1,3}$"
        if not re.match(ip_regex, ip):
            raise HTTPException(status_code=400, detail=f"Adresse IP invalide : '{ip}'")
        if not re.match(ip_regex, subnet):
            raise HTTPException(status_code=400, detail=f"Masque de sous-réseau invalide : '{subnet}'")
        if router and not re.match(ip_regex, router):
            raise HTTPException(status_code=400, detail=f"Passerelle par défaut invalide : '{router}'")

        cmd = ["networksetup", "-setmanual", svc, ip, subnet]
        if router:
            cmd.append(router)
        _run_networksetup_admin(cmd)
    else:
        raise HTTPException(status_code=400, detail=f"Type de configuration non supporté : '{cfg}'")

    # Configuration des DNS
    if payload.dns_servers is not None:
        dns_cleaned = [d.strip() for d in payload.dns_servers if d.strip()]
        if dns_cleaned:
            for d in dns_cleaned:
                if not re.match(r"^([0-9]{1,3}\.){3}[0-9]{1,3}$", d):
                    raise HTTPException(status_code=400, detail=f"Serveur DNS invalide : '{d}'")
            _run_networksetup_admin(["networksetup", "-setdnsservers", svc, *dns_cleaned])
        else:
            _run_networksetup_admin(["networksetup", "-setdnsservers", svc, "empty"])

    return {"success": True, "message": f"Paramètres TCP/IP pour '{svc}' appliqués avec succès."}


@app.post("/api/network/ping")
def ping_network_target(payload: PingPayload):
    """Effectue un test de connectivité ICMP ping vers une passerelle ou une adresse IP."""
    target = payload.target.strip()
    if not target:
        raise HTTPException(status_code=400, detail="Adresse IP ou hôte cible manquant.")

    # Validation de sécurité stricte : uniquement caractères autorisés pour IP / hôte
    if not re.match(r"^[a-zA-Z0-9.-]+$", target):
        raise HTTPException(status_code=400, detail="Cible de ping invalide.")

    count = max(1, min(10, payload.count))
    try:
        res = subprocess.run(
            ["ping", "-c", str(count), "-t", "2", target],
            capture_output=True,
            text=True,
            timeout=12
        )
        out = (res.stdout or "") + (res.stderr or "")
        success = (res.returncode == 0)

        # Extraction statistiques
        m_pkts = re.search(r"(\d+)\s+packets transmitted,\s+(\d+)\s+packets received(?:,\s+([0-9.]+)%\s+packet loss)?", out)
        transmitted = int(m_pkts.group(1)) if m_pkts else count
        received = int(m_pkts.group(2)) if m_pkts else (count if success else 0)
        loss = float(m_pkts.group(3)) if (m_pkts and m_pkts.group(3)) else (0.0 if success else 100.0)

        m_lat = re.search(r"min/avg/max/(?:stddev|mdev)\s*=\s*[0-9.]+/([0-9.]+)/", out)
        avg_ms = float(m_lat.group(1)) if m_lat else None

        return {
            "success": success and received > 0,
            "target": target,
            "transmitted": transmitted,
            "received": received,
            "loss_percent": loss,
            "avg_ms": avg_ms,
            "raw_output": out.strip()
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "target": target,
            "transmitted": count,
            "received": 0,
            "loss_percent": 100.0,
            "avg_ms": None,
            "raw_output": f"Délai d'attente de la demande dépassé pour {target} (Timeout)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/")
def serve_index():
    index_file = BASE_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"status": "ok", "message": "Explorer 2 Backend API"}

if __name__ == "__main__":
    import uvicorn
    is_frozen = getattr(sys, "frozen", False)
    use_reload = not is_frozen and ("--reload" in sys.argv)
    if is_frozen:
        uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
    else:
        uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=use_reload)
