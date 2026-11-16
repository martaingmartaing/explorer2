/**
 * Explorer 2 (thème Windows 98) - Frontend Engine
 * Multi-tab, Full Selection (Single/Ctrl/Shift), Drag & Drop Move, 300ms Transfer Speed Updates,
 * Manual Close Transfer Modal, Hidden Files Toggle, Preview Pane (Images, PDFs, Office),
 * Real CrystalDiskInfo S.M.A.R.T. with Autonomous 3D Models & Striped RAID Fusion.
 */

// Configuration de l'API locale avec support immédiat file:// et http://
const API_BASE = (window.location.protocol === 'file:') ? 'http://127.0.0.1:8000' : '';
const _nativeFetch = window.fetch.bind(window);

// Intercepteur fetch avec reconnexion automatique pendant le démarrage du backend en parallèle
window.fetch = async function(input, init) {
  let url = input;
  let isApi = false;
  if (typeof url === 'string') {
    if (url.startsWith('/api/')) {
      url = API_BASE + url;
      isApi = true;
    } else if (url.startsWith('http://127.0.0.1:8000/api/')) {
      isApi = true;
    }
  }

  if (isApi) {
    let attempts = 0;
    while (attempts < 25) {
      try {
        const res = await _nativeFetch(url, init);
        return res;
      } catch (err) {
        attempts++;
        if (attempts >= 25) {
          throw err;
        }
        await new Promise(r => setTimeout(r, Math.min(250, 50 * attempts)));
      }
    }
  }

  return _nativeFetch(url, init);
};

// --- SVGs Fluent Icons ---
const ICONS = {
  home: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
  drive: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="12" rx="2.5" fill="#4a90e2"/><rect x="2" y="13" width="20" height="5" rx="1.5" fill="#357abd"/><circle cx="18" cy="15.5" r="1.2" fill="#2ecc71"/><line x1="5" y1="15.5" x2="10" y2="15.5" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  driveSmb: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="12" rx="2.5" fill="#0078d4"/><rect x="2" y="13" width="20" height="5" rx="1.5" fill="#005fb8"/><circle cx="6" cy="15.5" r="1.2" fill="#38bdf8"/><circle cx="18" cy="15.5" r="1.2" fill="#38bdf8"/><line x1="6" y1="10" x2="18" y2="10" stroke="#bae6fd" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  folder: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2.5 5.5C2.5 4.4 3.4 3.5 4.5 3.5H9.2C9.8 3.5 10.3 3.8 10.6 4.2L12 6H19.5C20.6 6 21.5 6.9 21.5 8V18.5C21.5 19.6 20.6 20.5 19.5 20.5H4.5C3.4 20.5 2.5 19.6 2.5 18.5V5.5Z" fill="#ffb900"/><path d="M2.5 8H21.5V18.5C21.5 19.6 20.6 20.5 19.5 20.5H4.5C3.4 20.5 2.5 19.6 2.5 18.5V8Z" fill="#ffd15c"/></svg>`,
  file: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 2H14L19 7V20C19 21.1 18.1 22 17 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z" fill="#e2e8f0"/><path d="M14 2V7H19" fill="#cbd5e1"/><line x1="8" y1="12" x2="15" y2="12" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="16" x2="13" y2="16" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  fileText: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 2H14L19 7V20C19 21.1 18.1 22 17 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z" fill="#f8fafc" stroke="#3b82f6" stroke-width="1.5"/><path d="M14 2V7H19" fill="#dbeafe"/><line x1="8" y1="11" x2="16" y2="11" stroke="#3b82f6" stroke-width="1.2"/><line x1="8" y1="14" x2="16" y2="14" stroke="#3b82f6" stroke-width="1.2"/><line x1="8" y1="17" x2="13" y2="17" stroke="#3b82f6" stroke-width="1.2"/></svg>`,
  fileCode: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 2H14L19 7V20C19 21.1 18.1 22 17 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z" fill="#1e293b"/><path d="M14 2V7H19" fill="#334155"/><path d="M9 13L7 15L9 17" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/><path d="M14 13L16 15L14 17" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  fileImage: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 2H14L19 7V20C19 21.1 18.1 22 17 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z" fill="#fdf2f8" stroke="#ec4899" stroke-width="1.5"/><path d="M14 2V7H19" fill="#fbcfe8"/><circle cx="9" cy="11" r="1.5" fill="#ec4899"/><path d="M7 19L11 14L13 16L16 12L18 19H7Z" fill="#f472b6"/></svg>`,
  filePdf: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 2H14L19 7V20C19 21.1 18.1 22 17 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5"/><path d="M14 2V7H19" fill="#fecaca"/><text x="7" y="16" font-size="6" font-weight="bold" fill="#ef4444">PDF</text></svg>`,
  fileZip: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 2H14L19 7V20C19 21.1 18.1 22 17 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z" fill="#faf5ff" stroke="#a855f7" stroke-width="1.5"/><path d="M14 2V7H19" fill="#e9d5ff"/><rect x="10.5" y="4" width="3" height="12" fill="#c084fc"/></svg>`,
  fileExe: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 2H14L19 7V20C19 21.1 18.1 22 17 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z" fill="#f0f9ff" stroke="#0284c7" stroke-width="1.5"/><path d="M14 2V7H19" fill="#bae6fd"/><path d="M8 12H16V18H8V12Z" fill="#0284c7"/></svg>`,
  fileOffice: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 2H14L19 7V20C19 21.1 18.1 22 17 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/><path d="M14 2V7H19" fill="#bfdbfe"/><line x1="8" y1="12" x2="16" y2="12" stroke="#2563eb" stroke-width="1.3"/><line x1="8" y1="15" x2="14" y2="15" stroke="#2563eb" stroke-width="1.3"/></svg>`,
  chevronRight: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
  close: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  cut: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>`,
  copy: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
  paste: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
  rename: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`,
  delete: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c42b1c" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  pin: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-2l-2-3V5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7l-2 3v2z"></path></svg>`,
  open: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
  disconnect: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c42b1c" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>`,
  refresh: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
  gear: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
};

// --- SVGs Windows 98 Pixel-Art Répliques Authentiques ---
const ICONS_WIN98 = {
  home: `<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="9" fill="#c0c0c0" stroke="#000" stroke-width="1"/><rect x="4" y="2.5" width="8" height="6" fill="#000080"/><path d="M2 10.5h12v4H2z" fill="#c0c0c0" stroke="#000" stroke-width="1"/><rect x="4" y="12" width="4" height="1" fill="#000"/><circle cx="11.5" cy="12.5" r="0.8" fill="#00ff00"/></svg>`,
  drive: `<img src="static/icons/win98/drive.png" class="win98-custom-icon win98-icon-drive" width="34" height="34" alt="Disque Dur (C:)">`,
  driveSmb: `<img src="static/icons/win98/drive_network.png" class="win98-custom-icon win98-icon-drive" width="34" height="34" alt="Lecteur Réseau">`,
  driveNvme: `<img src="static/icons/win98/nvme.png" class="win98-custom-icon win98-icon-drive" width="34" height="34" alt="Lecteur NVMe">`,
  driveUsb: `<img src="static/icons/win98/usb.png" class="win98-custom-icon win98-icon-drive" width="34" height="34" alt="Disque USB">`,
  driveUsbKey: `<img src="static/icons/win98/usb_key.png" class="win98-custom-icon win98-icon-drive" width="34" height="34" alt="Clé USB">`,
  folder: `<img src="static/icons/win98/folder.png" class="win98-custom-icon win98-icon-folder" width="16" height="16" alt="Dossier">`,
  file: `<img src="static/icons/win98/file.png" class="win98-custom-icon win98-icon-file" width="16" height="16" alt="Fichier">`,
  fileText: `<img src="static/icons/win98/file_text.png" class="win98-custom-icon win98-icon-file" width="16" height="16" alt="Document texte">`,
  fileCode: `<svg width="20" height="20" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="12" fill="#000000" stroke="#c0c0c0" stroke-width="1"/><rect x="2" y="3" width="12" height="1" fill="#808080"/><text x="2.5" y="10" fill="#00ff00" font-family="monospace" font-size="5.5" font-weight="bold">C:\\&gt;</text></svg>`,
  fileImage: `<img src="static/icons/win98/file_image.png" class="win98-custom-icon win98-icon-file" width="16" height="16" alt="Image">`,
  filePdf: `<img src="static/icons/win98/file_pdf.png" class="win98-custom-icon win98-icon-file" width="16" height="16" alt="Document PDF">`,
  fileAudio: `<img src="static/icons/win98/file_audio.png" class="win98-custom-icon win98-icon-file" width="16" height="16" alt="Fichier Son">`,
  fileVideo: `<img src="static/icons/win98/file_video.png" class="win98-custom-icon win98-icon-file" width="16" height="16" alt="Vidéo">`,
  fileOffice: `<svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M3 1h7l4 4v10H3V1z" fill="#ffffff" stroke="#000" stroke-width="1"/><rect x="1" y="5" width="7" height="7" fill="#000080" stroke="#000" stroke-width="0.8"/><text x="2" y="11" fill="#ffffff" font-family="sans-serif" font-size="6" font-weight="bold">W</text></svg>`,
  fileZip: `<img src="static/icons/win98/file_zip.png" class="win98-custom-icon win98-icon-file" width="16" height="16" alt="Archive Zip">`,
  fileDmg: `<img src="static/icons/win98/file_dmg.png" class="win98-custom-icon win98-icon-file" width="16" height="16" alt="Fichier DMG">`,
  fileIso: `<img src="static/icons/win98/file_iso.png" class="win98-custom-icon win98-icon-file" width="16" height="16" alt="Image ISO">`,
  fileImg: `<img src="static/icons/win98/file_img.png" class="win98-custom-icon win98-icon-file" width="16" height="16" alt="Image Disque">`,
  fileExe: `<img src="static/icons/win98/file_exe.png" class="win98-custom-icon win98-icon-file" width="16" height="16" alt="Application Windows 98">`,
  fileApp: `<img src="static/icons/win98/file_app.png" class="win98-custom-icon win98-icon-file" width="16" height="16" alt="Application">`,
  delete: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10l-1 10H4L3 4z" fill="#c0c0c0" stroke="#000000" stroke-width="1"/><path d="M2 2h12v2H2z" fill="#c0c0c0" stroke="#000000" stroke-width="1"/><line x1="5.5" y1="6" x2="5.5" y2="12" stroke="#008000" stroke-width="1.2"/><line x1="8" y1="6" x2="8" y2="12" stroke="#000080" stroke-width="1.2"/><line x1="10.5" y1="6" x2="10.5" y2="12" stroke="#cc0000" stroke-width="1.2"/></svg>`,
  cut: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="12" r="2.5" stroke="#000" stroke-width="1.2" fill="#000080"/><circle cx="12" cy="12" r="2.5" stroke="#000" stroke-width="1.2" fill="#000080"/><line x1="5.5" y1="10" x2="13" y2="2" stroke="#808080" stroke-width="1.5"/><line x1="10.5" y1="10" x2="3" y2="2" stroke="#808080" stroke-width="1.5"/></svg>`,
  copy: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="4" y="4" width="9" height="10" fill="#ffffff" stroke="#000" stroke-width="1"/><rect x="2" y="2" width="9" height="10" fill="#ffffff" stroke="#000" stroke-width="1"/><line x1="4" y1="5" x2="9" y2="5" stroke="#000080" stroke-width="1"/><line x1="4" y1="7" x2="9" y2="7" stroke="#000080" stroke-width="1"/></svg>`,
  paste: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="12" fill="#cc9900" stroke="#000" stroke-width="1"/><rect x="4" y="5" width="8" height="9" fill="#ffffff" stroke="#000" stroke-width="1"/><rect x="6" y="1.5" width="4" height="3" fill="#c0c0c0" stroke="#000" stroke-width="0.8"/></svg>`,
  rename: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" fill="#ffffff" stroke="#000" stroke-width="1"/><text x="4" y="11" fill="#000080" font-family="sans-serif" font-size="8" font-weight="bold">A_</text></svg>`,
  pin: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M4 1h8l-2 5v4l3 2v1H3v-1l3-2V6L4 1z" fill="#000080" stroke="#000" stroke-width="1"/><line x1="8" y1="13" x2="8" y2="16" stroke="#808080" stroke-width="1.5"/></svg>`,
  open: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M1 4h5l2 2h7v1H1V4z" fill="#000"/><path d="M1 7h14v7H1V7z" fill="#000"/><path d="M3 8h12l-2 5H1l2-5z" fill="#ffff00" stroke="#000" stroke-width="0.8"/></svg>`,
  disconnect: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="6" fill="#c0c0c0" stroke="#000" stroke-width="1"/><path d="M8 9v4M4 13h8" stroke="#cc0000" stroke-width="1.5"/><line x1="2" y1="2" x2="14" y2="14" stroke="#cc0000" stroke-width="2"/></svg>`,
  refresh: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M13 8A5 5 0 1 1 8 3v-2l4 3-4 3v-2a3 3 0 1 0 3 3h2z" fill="#000080"/></svg>`,
  chevronRight: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M5 2l6 6-6 6" stroke="#000" stroke-width="2"/></svg>`,
  close: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="#000" stroke-width="2"/></svg>`,
  gear: `<img src="static/icons/win98/settings.png" class="win98-custom-icon" style="width:28px;height:28px;image-rendering:pixelated;" alt="Paramètres">`,
};

// --- Icônes du gestionnaire de tâches (Windows 98) ---
const TASKMGR_ICONS_WIN98 = {
  cpu: `<img src="static/icons/win98/cpu.png" class="win98-custom-icon win98-icon-taskmgr" alt="Processeur (CPU)">`,
  memory: `<img src="static/icons/win98/ram.png" class="win98-custom-icon win98-icon-taskmgr" alt="Mémoire RAM">`,
  disk: `<img src="static/icons/win98/disk.png" class="win98-custom-icon win98-icon-taskmgr" alt="Disque Dur (SSD)">`,
  network: `<img src="static/icons/win98/network.png" class="win98-custom-icon win98-icon-taskmgr" alt="Réseau (Wi-Fi/Ethernet)">`,
  gpu: `<img src="static/icons/win98/gpu.png" class="win98-custom-icon win98-icon-taskmgr" alt="Carte Graphique (GPU)">`,
  temp: `<img src="static/icons/win98/temp.png" class="win98-custom-icon win98-icon-taskmgr" alt="Température">`,
  processes: `<img src="static/icons/win98/processes.png" class="win98-custom-icon win98-icon-taskmgr" alt="Processus">`,
  perf: `<img src="static/icons/win98/perf.png" class="win98-custom-icon win98-icon-taskmgr" alt="Performances">`,
};

function getTaskmgrIcon(comp) {
  try {
    const raw = (comp || 'cpu').toLowerCase();
    let base = 'cpu';
    if (raw.includes('mem') || raw.includes('ram')) base = 'memory';
    else if (raw.includes('disk') || raw.startsWith('disk_') || raw.includes('hdd') || raw.includes('ssd')) base = 'disk';
    else if (raw.includes('net') || raw.includes('eth') || raw.includes('wifi')) base = 'network';
    else if (raw.includes('gpu') || raw.includes('graph')) base = 'gpu';
    else if (raw.includes('cpu') || raw.includes('proc')) base = 'cpu';
    else if (raw.includes('temp')) base = 'temp';

    return TASKMGR_ICONS_WIN98[base] || TASKMGR_ICONS_WIN98.cpu;
  } catch (err) {
    return TASKMGR_ICONS_WIN98.cpu;
  }
}
const getComponentIcon = getTaskmgrIcon;

function getTaskmgrCompColor(comp) {
  const raw = (comp || 'cpu').toLowerCase();
  if (raw.includes('mem') || raw.includes('ram')) return '#ff00ff'; // Magenta brut années 90
  if (raw.includes('disk') || raw.startsWith('disk_') || raw.includes('hdd') || raw.includes('ssd')) return '#0066ff'; // Bleu brut années 90
  if (raw.includes('net') || raw.includes('eth') || raw.includes('wifi')) return '#ff0000'; // Rouge vif années 90
  if (raw.includes('gpu') || raw.includes('graph')) return '#ffff00'; // Jaune vif années 90
  return '#00ff00'; // Vert néon d'époque Windows 95/98 Task Manager
}
const getComponentColor = getTaskmgrCompColor;

function getIcon(name) {
  if (ICONS_WIN98[name]) return ICONS_WIN98[name];
  return ICONS[name] || '';
}

function getFileIcon(item) {
  const iconsSet = ICONS_WIN98;
  const isApp = !!(item.name && item.name.toLowerCase().endsWith('.app')) || (item.extension && item.extension.toLowerCase() === '.app');
  if (isApp) {
    if (iconsSet.fileApp) return iconsSet.fileApp;
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#0078d4" fill-opacity="0.2" stroke="#0078d4" stroke-width="1.5"/><polygon points="9.5 7.5 16.5 12 9.5 16.5" fill="#0078d4"/></svg>`;
  }
  if (item.is_dir) return iconsSet.folder;
  const ext = (item.extension || '').toLowerCase();
  if (['.txt', '.log', '.ini', '.cfg', '.md'].includes(ext)) return iconsSet.fileText;
  if (['.py', '.js', '.html', '.css', '.json', '.xml', '.ts', '.c', '.cpp', '.cs', '.java', '.bat', '.cmd'].includes(ext)) return iconsSet.fileCode;
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp'].includes(ext)) return iconsSet.fileImage;
  if (['.pdf'].includes(ext)) return iconsSet.filePdf;
  if (['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma', '.aiff', '.alac'].includes(ext)) return iconsSet.fileAudio || iconsSet.file;
  if (['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg'].includes(ext)) return iconsSet.fileVideo || iconsSet.file;
  if (['.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt', '.csv', '.odt', '.ods'].includes(ext)) return iconsSet.fileOffice;
  if (['.iso'].includes(ext)) return iconsSet.fileIso || iconsSet.fileImage;
  if (['.img'].includes(ext)) return iconsSet.fileImg || iconsSet.fileImage;
  if (['.dmg'].includes(ext)) return iconsSet.fileDmg || iconsSet.fileZip;
  if (['.zip', '.rar', '.7z', '.tar', '.gz', '.tgz', '.bz2', '.xz'].includes(ext)) return iconsSet.fileZip;
  if (['.exe', '.msi', '.dll', '.ps1'].includes(ext)) return iconsSet.fileExe;
  return iconsSet.file;
}

// --- Largeurs des colonnes par défaut et contraintes ---
const DEFAULT_COLUMN_WIDTHS = {
  name: 320,
  modified: 150,
  type_desc: 120,
  size: 100,
};
const MIN_COLUMN_WIDTH = 40;

// --- Application State ---
const state = {
  picker: null,   // mode « sélecteur de fichier » (fenêtre séparée)
  theme: 'windows98',
  currentView: 'explorer',
  tabs: [],
  activeTabId: null,
  drives: [],
  favorites: [],
  clipboard: null, // { action: 'copy'|'cut', paths: [...] }
  previewSelection: null, // Élément sélectionné à l'intérieur du volet d'aperçu (dossier ou archive)
  showHidden: false, // Fichiers cachés masqués par défaut
  showPreview: false, // Volet de visualisation
  activeTransferTaskId: null,
  transferPollInterval: null,
  columnOrder: ['name', 'modified', 'type_desc', 'size'],
  columnWidths: { ...DEFAULT_COLUMN_WIDTHS },
};

function getCurrentTheme() {
  return 'windows98';
}

const COLUMN_CONFIG = {
  name: {
    id: 'name',
    label: 'Nom',
    renderCell: (item) => `
      <td class="file-name-td">
        <div class="file-name-cell">
          <span class="file-icon">${getFileIcon(item)}</span>
          <span class="file-name-text" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
        </div>
      </td>
    `
  },
  modified: {
    id: 'modified',
    label: 'Modifié le',
    renderCell: (item) => `<td>${item.modified_formatted}</td>`
  },
  type_desc: {
    id: 'type_desc',
    label: 'Type',
    renderCell: (item) => `<td>${escapeHtml(item.type_desc)}</td>`
  },
  size: {
    id: 'size',
    label: 'Taille',
    renderCell: (item) => `<td>${item.size_formatted}</td>`
  }
};

// --- DOM References ---
const elements = {
  railBtnExplorer: document.getElementById('railBtnExplorer'),
  railBtnSmart: document.getElementById('railBtnSmart'),
  railBtnTaskmgr: document.getElementById('railBtnTaskmgr'),
  railBtnSpace: document.getElementById('railBtnSpace'),
  railBtnClone: document.getElementById('railBtnClone'),
  railBtnFlash: document.getElementById('railBtnFlash'),
  railBtnNetwork: document.getElementById('railBtnNetwork'),
  viewExplorer: document.getElementById('viewExplorer'),
  viewSmart: document.getElementById('viewSmart'),
  viewTaskmgr: document.getElementById('viewTaskmgr'),
  viewSpace: document.getElementById('viewSpace'),
  viewClone: document.getElementById('viewClone'),
  viewFlash: document.getElementById('viewFlash'),
  viewNetwork: document.getElementById('viewNetwork'),

  tabsContainer: document.getElementById('tabsContainer'),
  btnNewTab: document.getElementById('btnNewTab'),

  btnHome: document.getElementById('btnHome'),
  btnBack: document.getElementById('btnBack'),
  btnForward: document.getElementById('btnForward'),
  btnUp: document.getElementById('btnUp'),
  btnRefresh: document.getElementById('btnRefresh'),
  breadcrumbContainer: document.getElementById('breadcrumbContainer'),
  pathInput: document.getElementById('pathInput'),
  searchInput: document.getElementById('searchInput'),
  favoritesList: document.getElementById('favoritesList'),
  drivesSidebarList: document.getElementById('drivesSidebarList'),
  smbSidebarList: document.getElementById('smbSidebarList'),
  btnSidebarSmbAdd: document.getElementById('btnSidebarSmbAdd'),
  contentArea: document.getElementById('fileViewWorkspace') || document.getElementById('contentArea'),
  tbToggleTerminal: document.getElementById('tbToggleTerminal'),
  embeddedTerminalPane: document.getElementById('embeddedTerminalPane'),
  terminalResizer: document.getElementById('terminalResizer'),
  terminalBody: document.getElementById('terminalBody'),
  terminalCwdText: document.getElementById('terminalCwdText'),
  terminalXterm: document.getElementById('terminalXterm'),
  btnTerminalClear: document.getElementById('btnTerminalClear'),
  btnTerminalExternal: document.getElementById('btnTerminalExternal'),
  btnTerminalClose: document.getElementById('btnTerminalClose'),
  statusText: document.getElementById('statusText'),
  selectedStatusText: document.getElementById('selectedStatusText'),

  tbNewFolder: document.getElementById('tbNewFolder'),
  tbNewFile: document.getElementById('tbNewFile'),
  tbCut: document.getElementById('tbCut'),
  tbCopy: document.getElementById('tbCopy'),
  tbPaste: document.getElementById('tbPaste'),
  tbRename: document.getElementById('tbRename'),
  tbDelete: document.getElementById('tbDelete'),
  tbToggleHidden: document.getElementById('tbToggleHidden'),
  tbToggleHiddenLabel: document.getElementById('tbToggleHiddenLabel'),
  tbToggleSidebar: document.getElementById('tbToggleSidebar'),
  tbToggleSidebarLabel: document.getElementById('tbToggleSidebarLabel'),
  tbTogglePreview: document.getElementById('tbTogglePreview'),
  tbTogglePreviewLabel: document.getElementById('tbTogglePreviewLabel'),

  btnToggleGlobalRail: document.getElementById('btnToggleGlobalRail'),
  w11Sidebar: document.querySelector('.w11-sidebar'),
  sidebarResizer: document.getElementById('sidebarResizer'),

  previewPane: document.getElementById('previewPane'),
  previewResizer: document.getElementById('previewResizer'),
  previewTitle: document.getElementById('previewTitle'),
  previewBody: document.getElementById('previewBody'),
  btnPreviewClose: document.getElementById('btnPreviewClose'),

  transferDialog: document.getElementById('transferDialog'),
  transferTitle: document.getElementById('transferTitle'),
  transferFileInfo: document.getElementById('transferFileInfo'),
  transferProgressFill: document.getElementById('transferProgressFill'),
  transferSpeedBadge: document.getElementById('transferSpeedBadge'),
  transferEtaText: document.getElementById('transferEtaText'),
  speedCanvas: document.getElementById('speedCanvas'),
  transferCloseBtn: document.getElementById('transferCloseBtn'),
  transferCancelBtn: document.getElementById('transferCancelBtn'),

  smartGrid: document.getElementById('smartGrid'),
  btnRefreshSmart: document.getElementById('btnRefreshSmart'),

  // SMB Modal
  smbModalOverlay: document.getElementById('smbModalOverlay'),
  smbServerInput: document.getElementById('smbServerInput'),
  smbBtnDiscover: document.getElementById('smbBtnDiscover'),
  smbSharesContainer: document.getElementById('smbSharesContainer'),
  smbSharesList: document.getElementById('smbSharesList'),
  smbRemotePath: document.getElementById('smbRemotePath'),
  smbDriveLetter: document.getElementById('smbDriveLetter'),
  smbUsername: document.getElementById('smbUsername'),
  smbPassword: document.getElementById('smbPassword'),
  smbRemember: document.getElementById('smbRemember'),
  smbCancelBtn: document.getElementById('smbCancelBtn'),
  smbConfirmBtn: document.getElementById('smbConfirmBtn'),
  smbCloseXBtn: document.getElementById('smbCloseXBtn'),

  contextMenu: document.getElementById('contextMenu'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalTitle: document.getElementById('modalTitle'),
  modalInput: document.getElementById('modalInput'),
  modalConfirmBtn: document.getElementById('modalConfirmBtn'),
  modalCancelBtn: document.getElementById('modalCancelBtn'),
  modalCloseXBtn: document.getElementById('modalCloseXBtn'),
  toastContainer: document.getElementById('toastContainer'),

  // Paramètres & Thème
  railBtnSettings: document.getElementById('railBtnSettings'),
  settingsModalOverlay: document.getElementById('settingsModalOverlay'),
  settingsCloseBtn: document.getElementById('settingsCloseBtn'),
  settingsOkBtn: document.getElementById('settingsOkBtn'),

  // Modale Calcul de taille / Propriétés
  folderSizeModalOverlay: document.getElementById('folderSizeModalOverlay'),
  folderSizeModalTitle: document.getElementById('folderSizeModalTitle'),
  folderSizeCloseBtn: document.getElementById('folderSizeCloseBtn'),
  folderSizeOkBtn: document.getElementById('folderSizeOkBtn'),
  folderSizeIcon: document.getElementById('folderSizeIcon'),
  folderSizeName: document.getElementById('folderSizeName'),
  folderSizePath: document.getElementById('folderSizePath'),
  folderSizeLoading: document.getElementById('folderSizeLoading'),
  folderSizeDetails: document.getElementById('folderSizeDetails'),
  folderSizeFormatted: document.getElementById('folderSizeFormatted'),
  folderSizeBytes: document.getElementById('folderSizeBytes'),
  folderSizeCounts: document.getElementById('folderSizeCounts'),
  folderSizeSkippedRow: document.getElementById('folderSizeSkippedRow'),
  folderSizeSkipped: document.getElementById('folderSizeSkipped'),
};

// --- RÈGLE GLOBALE : BLOQUER STRICTEMENT LE CLIC DROIT DU NAVIGATEUR ---
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
}, true);

// --- VERROUS DE SÉCURITÉ POUR LE DÉTACHEMENT D'ONGLETS (TEAR-OFF) ---
// Filet 1 : Écoute globale sur TOUTES les fenêtres : si le mouseup atterrit sur n'importe quelle fenêtre,
// le signal tab:detach-end est envoyé au Main Process.
window.addEventListener('mouseup', () => {
  window.__isDetachingTab = false;
  if (window.api && typeof window.api.endTabDetach === 'function') {
    window.api.endTabDetach();
  } else if (window.electronAPI && typeof window.electronAPI.detachEnd === 'function') {
    window.electronAPI.detachEnd();
  }
}, true);

// Filet 2 : Sécurité en cas de perte de focus de la fenêtre (blur)
window.addEventListener('blur', () => {
  if (window.__isDetachingTab) {
    window.__isDetachingTab = false;
    if (window.api && typeof window.api.endTabDetach === 'function') {
      window.api.endTabDetach();
    } else if (window.electronAPI && typeof window.electronAPI.detachEnd === 'function') {
      window.electronAPI.detachEnd();
    }
  }
});

// Filet 3 : Si un événement mousemove détecte que buttons === 0 alors qu'un détachement est actif
window.addEventListener('mousemove', (e) => {
  if (e.buttons === 0 && window.__isDetachingTab) {
    window.__isDetachingTab = false;
    if (window.api && typeof window.api.endTabDetach === 'function') {
      window.api.endTabDetach();
    } else if (window.electronAPI && typeof window.electronAPI.detachEnd === 'function') {
      window.electronAPI.detachEnd();
    }
  }
}, true);

function showToast(message, type = 'info', duration = 3000) {
  if (!elements.toastContainer) return;

  // Déduplication : si une notification identique est déjà affichée, ne pas la réafficher
  const existing = Array.from(elements.toastContainer.querySelectorAll('.toast'));
  if (existing.some(t => t.textContent === message)) return;

  // Limiter le nombre de notifications simultanées (max 3)
  while (existing.length >= 3) {
    const oldest = existing.shift();
    if (oldest) oldest.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 octets';
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['octets', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ===================== TABS MANAGEMENT =====================
function createTab(initialPath = null) {
  const tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  const newTab = {
    id: tabId,
    title: initialPath ? getFolderName(initialPath) : 'Ce Mac',
    path: initialPath,
    parentPath: null,
    history: [initialPath],
    historyIndex: 0,
    items: [],
    selectedPaths: [], // Multi-sélection de chemins
    lastSelectedIndex: -1, // Ancre pour Maj + Clic
    sortField: 'name',
    sortAsc: true,
    searchQuery: '',
  };

  state.tabs.push(newTab);
  switchTab(tabId);
  renderTabs();
  return newTab;
}

function switchTab(tabId) {
  state.activeTabId = tabId;
  const tab = getActiveTab();
  if (!tab) return;

  renderTabs();
  updateNavState();
  if (tab.path) {
    loadFolder(tab.path, false);
  } else {
    loadHome();
  }
}

function closeTab(tabId, e) {
  if (e) e.stopPropagation();
  if (state.tabs.length <= 1) {
    const tab = state.tabs[0];
    tab.path = null;
    tab.title = 'Ce Mac';
    tab.history = [null];
    tab.historyIndex = 0;
    tab.selectedPaths = [];
    tab.lastSelectedIndex = -1;
    renderTabs();
    loadHome();
    return;
  }

  const idx = state.tabs.findIndex(t => t.id === tabId);
  state.tabs.splice(idx, 1);

  if (state.activeTabId === tabId) {
    const nextTab = state.tabs[Math.max(0, idx - 1)];
    switchTab(nextTab.id);
  } else {
    renderTabs();
  }
}

function getActiveTab() {
  return state.tabs.find(t => t.id === state.activeTabId) || state.tabs[0];
}

function renderTabs() {
  elements.tabsContainer.innerHTML = '';
  state.tabs.forEach((tab, index) => {
    const tabEl = document.createElement('div');
    tabEl.className = `tab-item ${tab.id === state.activeTabId ? 'active' : ''}`;
    tabEl.dataset.tabId = tab.id;
    tabEl.dataset.index = index;

    tabEl.innerHTML = `
      <span style="display:flex;align-items:center;">${tab.path ? getIcon('folder') : getIcon('home')}</span>
      <span class="tab-title" title="${escapeHtml(tab.path || 'Ce Mac')}">${escapeHtml(tab.title)}</span>
      <button class="tab-close-btn" title="Fermer (Ctrl+W)">${getIcon('close') || ICONS.close}</button>
    `;

    // Clic pour fermer l'onglet
    tabEl.querySelector('.tab-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab.id, e);
    });

    // Gestion exclusive par pointeur classique (aucun Drag & Drop HTML5 sur les onglets)
    tabEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.tab-close-btn')) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const tabRect = tabEl.getBoundingClientRect();
      const offsetX = Math.max(10, Math.round(e.clientX - tabRect.left));
      const offsetY = Math.max(8, Math.round(e.clientY - tabRect.top));
      const tabBarRect = elements.tabsContainer.getBoundingClientRect();
      let isDetachedDragging = false;
      let hasMoved = false;
      const currentTabId = tab.id;

      const onMouseMove = (moveEvent) => {
        // Filet de sécurité 2 : Si moveEvent détecte que buttons === 0 (bouton relâché hors de capture)
        if (moveEvent.buttons === 0) {
          if (isDetachedDragging || window.__isDetachingTab) {
            window.__isDetachingTab = false;
            isDetachedDragging = false;
            if (window.api && typeof window.api.endTabDetach === 'function') {
              window.api.endTabDetach();
            } else if (window.electronAPI && typeof window.electronAPI.detachEnd === 'function') {
              window.electronAPI.detachEnd();
            }
          }
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          return;
        }

        if (isDetachedDragging) return;

        const deltaX = Math.abs(moveEvent.clientX - startX);
        const isOutsideVertically = (moveEvent.clientY < tabBarRect.top - 30) || (moveEvent.clientY > tabBarRect.bottom + 30);

        // CAS A : L'utilisateur reste dans la barre d'onglets (!isOutsideVertically)
        if (!isOutsideVertically) {
          if (deltaX > 5) {
            hasMoved = true;
            const allTabEls = Array.from(elements.tabsContainer.querySelectorAll('.tab-item'));
            const curIdx = state.tabs.findIndex(t => t.id === currentTabId);
            if (curIdx !== -1) {
              for (let i = 0; i < allTabEls.length; i++) {
                if (i === curIdx) continue;
                const otherRect = allTabEls[i].getBoundingClientRect();
                const otherMidX = otherRect.left + otherRect.width / 2;

                if (i > curIdx && moveEvent.clientX > otherMidX) {
                  const [moved] = state.tabs.splice(curIdx, 1);
                  state.tabs.splice(i, 0, moved);
                  renderTabs();
                  break;
                } else if (i < curIdx && moveEvent.clientX < otherMidX) {
                  const [moved] = state.tabs.splice(curIdx, 1);
                  state.tabs.splice(i, 0, moved);
                  renderTabs();
                  break;
                }
              }
            }
          }
          return;
        }

        // CAS B : L'utilisateur sort franchement de la barre d'onglets vers le haut ou le bas
        if (isOutsideVertically && state.tabs.length > 1) {
          isDetachedDragging = true;
          window.__isDetachingTab = true;
          hasMoved = true;

          const detachedTab = state.tabs.find(t => t.id === currentTabId) || tab;
          const tabData = {
            path: detachedTab ? detachedTab.path : tab.path,
            history: detachedTab && detachedTab.history ? [...detachedTab.history] : (tab.path ? [tab.path] : [null]),
            historyIndex: detachedTab && typeof detachedTab.historyIndex === 'number' ? detachedTab.historyIndex : 0,
            title: detachedTab ? detachedTab.title : tab.title,
          };

          // a) Supprime immédiatement l'onglet de la fenêtre actuelle
          closeTab(currentTabId);

          // b) Envoie immédiatement 'tab:detach-start' (ne supprime pas encore mouseup !)
          if (window.api && typeof window.api.detachStart === 'function') {
            window.api.detachStart({ tabData, offsetX, offsetY });
          } else if (window.electronAPI && typeof window.electronAPI.detachStart === 'function') {
            window.electronAPI.detachStart({ tabData, offsetX, offsetY });
          }
        }
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.__isDetachingTab = false;

        if (isDetachedDragging) {
          // Relâchement final après détachement
          if (window.api && typeof window.api.endTabDetach === 'function') {
            window.api.endTabDetach();
          } else if (window.electronAPI && typeof window.electronAPI.detachEnd === 'function') {
            window.electronAPI.detachEnd();
          }
          isDetachedDragging = false;
        } else {
          // Si on n'a pas réordonné, on bascule sur l'onglet cliqué
          if (!hasMoved) {
            switchTab(currentTabId);
          }
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    elements.tabsContainer.appendChild(tabEl);
  });
}

function getFolderName(path) {
  if (!path) return 'Ce Mac';
  const clean = path.replace(/[\\/]+$/, '');
  const parts = clean.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

// ===================== NAVIGATION & BROWSE =====================
function navigateTo(path, addToHistory = true) {
  const tab = getActiveTab();
  if (!tab) return;

  tab.selectedPaths = [];
  tab.lastSelectedIndex = -1;
  tab.searchQuery = '';
  if (elements.searchInput) elements.searchInput.value = '';

  if (addToHistory) {
    if (tab.historyIndex < tab.history.length - 1) {
      tab.history = tab.history.slice(0, tab.historyIndex + 1);
    }
    tab.history.push(path);
    tab.historyIndex = tab.history.length - 1;
  }

  tab.path = path;
  tab.title = path ? getFolderName(path) : 'Ce Mac';
  renderTabs();
  updateNavState();

  if (!path) {
    loadHome();
  } else {
    loadFolder(path);
  }
}

function updateNavState() {
  const tab = getActiveTab();
  if (!tab) return;

  elements.btnBack.disabled = tab.historyIndex <= 0;
  elements.btnForward.disabled = tab.historyIndex >= tab.history.length - 1;
  elements.btnUp.disabled = !tab.path || !tab.parentPath;

  if (tab.path === null) {
    elements.btnHome.classList.add('active');
  } else {
    elements.btnHome.classList.remove('active');
  }

  updateToolbarState();
}

function updateToolbarState() {
  const tab = getActiveTab();
  const mainSelCount = tab ? tab.selectedPaths.length : 0;
  const hasPreviewSel = !!state.previewSelection;
  const selCount = hasPreviewSel ? 1 : mainSelCount;
  const canPaste = !!state.clipboard && !!(tab && tab.path);

  elements.tbCut.disabled = selCount === 0;
  elements.tbCopy.disabled = selCount === 0;
  elements.tbRename.disabled = selCount !== 1;
  elements.tbDelete.disabled = selCount === 0;
  elements.tbPaste.disabled = !canPaste;

  elements.tbNewFolder.disabled = !tab || !tab.path;
  elements.tbNewFile.disabled = !tab || !tab.path;

  // État des boutons Masqués / Volet
  elements.tbToggleHidden.classList.toggle('active', state.showHidden);
  if (elements.tbToggleHiddenLabel) {
    elements.tbToggleHiddenLabel.textContent = state.showHidden ? 'Éléments masqués : Oui' : 'Éléments masqués : Non';
  }

  elements.tbTogglePreview.classList.toggle('active', state.showPreview);
}

async function loadHome() {
  const tab = getActiveTab();
  if (tab) {
    tab.path = null;
    tab.parentPath = null;
    tab.title = 'Ce Mac';
    tab.selectedPaths = [];
    tab.lastSelectedIndex = -1;
    renderTabs();
  }
  renderBreadcrumb(null);
  renderHomeLoading();

  await fetchDrives();
  renderHome(state.drives);
  updateStatus(state.drives.length, 'lecteur(s)');
  updateSelectionUI();
  updatePreviewPane();
}

async function loadFolder(path) {
  const tab = getActiveTab();
  renderFolderLoading();

  try {
    const res = await fetch(`/api/browse?path=${encodeURIComponent(path)}&show_hidden=${state.showHidden}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Impossible d\'accéder au dossier');
    }
    const data = await res.json();
    tab.path = data.current_path;
    tab.parentPath = data.parent_path;
    tab.items = data.items;
    tab.selectedPaths = [];
    tab.lastSelectedIndex = -1;
    tab.title = getFolderName(data.current_path);

    renderTabs();
    renderBreadcrumb(data.current_path);
    renderFolder();
    updateNavState();
    updatePreviewPane();
  } catch (err) {
    showToast(err.message, 'error');
    if (tab.historyIndex > 0) {
      tab.historyIndex--;
      navigateTo(tab.history[tab.historyIndex], false);
    } else {
      navigateTo(null, false);
    }
  }
}

function renderHomeLoading() {
  elements.contentArea.innerHTML = `<div class="state-container"><div>Détection des périphériques et lecteurs...</div></div>`;
}

function getDriveCardIcon(drive) {
  if (drive.is_network) {
    return `<img src="static/icons/win98/drive_network.png" class="win98-custom-icon win98-icon-drive" width="38" height="38" style="image-rendering:pixelated;" alt="SMB">`;
  }
  {
    const dtype = (drive.drive_type || drive.model_type_3d || '').toLowerCase();
    const media = (drive.media_type || '').toLowerCase();
    const bus = (drive.bus_type || '').toLowerCase();
    const mpt = drive.mountpoint || '';

    // Clé USB ou volume amovible / Image disque
    if (dtype === 'usb_key' || drive.removable_media === true || media.includes('clé usb') || media.includes('cle usb') || bus.includes('disk image')) {
      return `<img src="static/icons/win98/usb_key_detail.png" class="win98-custom-icon win98-icon-drive" width="38" height="38" style="image-rendering:pixelated;" alt="USB">`;
    }
    // NVMe ou SSD système (Macintosh HD)
    if (mpt === '/' || dtype === 'nvme' || media.includes('nvme') || bus.includes('apple fabric') || bus.includes('pci')) {
      return `<img src="static/icons/win98/nvme.png" class="win98-custom-icon win98-icon-drive" width="38" height="38" style="image-rendering:pixelated;" alt="NVMe">`;
    }
    // Disque dur externe ou secondaire
    return `<img src="static/icons/win98/drive.png" class="win98-custom-icon win98-icon-drive" width="38" height="38" style="image-rendering:pixelated;" alt="Disque">`;
  }
  return getIcon('drive');
}

function drawWin98PieChart(canvas, percentUsed) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width || 34;
  const h = canvas.height || 26;
  ctx.clearRect(0, 0, w, h);

  const cx = Math.floor(w / 2);
  const cy = 10;
  const rx = 12.5;
  const ry = 6.5;
  const depth = 4;

  const pct = Math.max(0, Math.min(100, typeof percentUsed === 'number' ? percentUsed : 0));
  const isDanger = pct >= 90;

  // Couleurs authentiques Windows 98
  const usedTopColor = isDanger ? '#c00000' : '#000080';
  const usedSideColor = isDanger ? '#600000' : '#000048';
  const freeTopColor = '#c000c0'; // Magenta
  const freeSideColor = '#600060'; // Dark Magenta

  // Angle Windows 98 : commence à 12h (-Math.PI/2) et tourne dans le sens horaire
  const startAngle = -Math.PI / 2;
  const sweepAngle = (pct / 100) * (Math.PI * 2);
  const endAngle = startAngle + sweepAngle;

  // 1. Épaisseur 3D du cylindre (côté visible entre cy et cy + depth)
  for (let d = depth; d >= 1; d--) {
    // Face latérale globale en magenta (libre)
    ctx.beginPath();
    ctx.ellipse(cx, cy + d, rx, ry, 0, 0, Math.PI, false);
    ctx.lineTo(cx - rx, cy);
    ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fillStyle = freeSideColor;
    ctx.fill();

    // Portion utilisée sur la face latérale si le camembert recouvre la moitié basse [0, PI]
    if (pct > 0) {
      if (endAngle > 0) {
        ctx.beginPath();
        const s = Math.max(0, startAngle);
        const e = Math.min(Math.PI, endAngle);
        ctx.ellipse(cx, cy + d, rx, ry, 0, s, e, false);
        ctx.lineTo(cx + Math.cos(e) * rx, cy + Math.sin(e) * ry);
        ctx.ellipse(cx, cy, rx, ry, 0, e, s, true);
        ctx.closePath();
        ctx.fillStyle = usedSideColor;
        ctx.fill();
      }
    }
  }

  // 2. Contour noir du cylindre 3D
  ctx.beginPath();
  ctx.ellipse(cx, cy + depth, rx, ry, 0, 0, Math.PI, false);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - rx, cy);
  ctx.lineTo(cx - rx, cy + depth);
  ctx.moveTo(cx + rx, cy);
  ctx.lineTo(cx + rx, cy + depth);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 3. Face supérieure : Espace libre (Magenta)
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.ellipse(cx, cy, rx, ry, 0, endAngle, startAngle + Math.PI * 2, false);
  ctx.closePath();
  ctx.fillStyle = freeTopColor;
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 4. Face supérieure : Espace utilisé (Bleu Marine ou Rouge si presque plein)
  if (pct > 0) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.ellipse(cx, cy, rx, ry, 0, startAngle, endAngle, false);
    ctx.closePath();
    ctx.fillStyle = usedTopColor;
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function renderHome(drives = state.drives || []) {
  if (!Array.isArray(drives) || drives.length === 0) {
    drives = state.drives || [];
  }

  // 1. Déduplication stricte par mountpoint / device / (label + size)
  const seenKeys = new Set();
  const cleanDrives = [];
  (Array.isArray(drives) ? drives : []).forEach(d => {
    const mptKey = (d.mountpoint || '').toLowerCase().trim();
    const devKey = (d.device || '').toLowerCase().trim();
    const labelKey = `${(d.label || '').toLowerCase().trim()}_${d.total || 0}`;

    if (mptKey && seenKeys.has(mptKey)) return;
    if (devKey && seenKeys.has(devKey)) return;
    if (d.label && d.label !== '/' && seenKeys.has(labelKey)) return;

    if (mptKey) seenKeys.add(mptKey);
    if (devKey) seenKeys.add(devKey);
    if (d.label && d.label !== '/') seenKeys.add(labelKey);

    cleanDrives.push(d);
  });

  // 2. Tri ordonné : Racine / (Macintosh HD) en premier, puis partages SMB, puis lecteurs amovibles
  cleanDrives.sort((a, b) => {
    if (a.mountpoint === '/') return -1;
    if (b.mountpoint === '/') return 1;
    if (a.is_network && !b.is_network) return -1;
    if (!a.is_network && b.is_network) return 1;
    return (a.label || '').localeCompare(b.label || '');
  });

  elements.contentArea.innerHTML = `
    <div class="home-view" id="homeView">
      <fieldset class="home-fieldset">
        <legend class="home-legend">
          <span>Périphériques et lecteurs</span>
        </legend>
        <button class="btn home-smb-btn" id="btnQuickSmb" title="Connecter un partage réseau SMB">
          <span>+ Connecter un lecteur SMB</span>
        </button>
        <div class="drives-grid" id="drivesGrid"></div>
      </fieldset>
    </div>
  `;

  const btnSmb = document.getElementById('btnQuickSmb');
  if (btnSmb) {
    btnSmb.onclick = () => openSmbModal();
  }

  const grid = document.getElementById('drivesGrid');
  if (!grid) return;

  cleanDrives.forEach(drive => {
    const card = document.createElement('div');
    card.className = `drive-card ${drive.is_network ? 'is-smb' : ''}`;
    card.dataset.mountpoint = drive.mountpoint;
    let pct = typeof drive.percent === 'number' ? drive.percent : 0;
    if (drive.total > 0 && typeof drive.free === 'number') {
      const usedBytes = Math.max(0, drive.total - drive.free);
      pct = Math.round((usedBytes / drive.total) * 1000) / 10;
    }
    const isDanger = pct >= 90;
    const isEjectable = drive.is_ejectable || (drive.mountpoint && drive.mountpoint !== '/' && !drive.mountpoint.startsWith('/System'));
    const ejectActionHtml = isEjectable
      ? `<button class="drive-card-eject-btn" title="Éjecter ${escapeHtml(drive.label)}">⏏</button>`
      : '';

    let badgeText = '';
    if (drive.is_network) {
      badgeText = 'SMB';
    } else if (drive.mountpoint === '/') {
      badgeText = 'NVME';
    } else if (drive.fstype && drive.fstype.length <= 5) {
      badgeText = drive.fstype.toUpperCase();
    } else {
      badgeText = 'VOL';
    }

    card.innerHTML = `
      <div class="drive-card-left">
        <div class="drive-icon">${getDriveCardIcon(drive)}</div>
      </div>
      <div class="drive-card-center">
        <div class="drive-name" title="${escapeHtml(drive.label)}">
          <span>${escapeHtml(drive.label)}</span>
        </div>
        <div class="drive-progress-bar">
          <div class="drive-progress-fill ${isDanger ? 'danger' : ''}" style="width: ${Math.min(Math.max(pct, 0), 100)}%"></div>
        </div>
        <div class="drive-capacity-text">
          ${drive.unc_path ? `<div class="drive-unc-path" title="${escapeHtml(drive.unc_path)}">${escapeHtml(drive.unc_path)}</div>` : ''}
          <div class="drive-bytes-text">${drive.free_formatted} libres sur ${drive.total_formatted}</div>
        </div>
      </div>
      <div class="drive-card-right">
        <div class="drive-badge-wrap">
          <span class="drive-badge">${badgeText}</span>
          ${ejectActionHtml}
        </div>
        <canvas class="drive-pie-canvas" width="34" height="26" title="Espace utilisé : ${pct}%"></canvas>
      </div>
    `;

    // Dessin du camembert 3D sur le canvas
    const pieCanvas = card.querySelector('.drive-pie-canvas');
    if (pieCanvas) {
      drawWin98PieChart(pieCanvas, pct);
    }

    const cardEjectBtn = card.querySelector('.drive-card-eject-btn');
    if (cardEjectBtn) {
      cardEjectBtn.onclick = (e) => {
        e.stopPropagation();
        ejectVolume(drive.mountpoint);
      };
    }

    // Clic gauche : sélection visuelle de la carte de disque
    card.addEventListener('click', (e) => {
      document.querySelectorAll('.drive-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });

    // DOUBLE-CLIC GAUCHE : Ouvre le lecteur comme sous Windows
    card.addEventListener('dblclick', (e) => {
      navigateTo(drive.mountpoint);
    });

    // Drag & Drop cible pour recevoir des fichiers déposés sur un disque (interne ou externe Windows)
    card.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
      card.classList.add('drop-target');
    });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
      card.classList.add('drop-target');
    });
    card.addEventListener('dragleave', (e) => {
      if (!card.contains(e.relatedTarget)) {
        card.classList.remove('drop-target');
      }
    });
    card.addEventListener('drop', async (e) => {
      card.classList.remove('drop-target');
      await handleFileDrop(e, drive.mountpoint);
    });

    // Clic droit sur lecteur (menu SMB si réseau)
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.querySelectorAll('.drive-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      if (drive.is_network) {
        openSmbDriveContextMenu(e, drive);
      } else {
        openDriveContextMenu(e, drive);
      }
    });

    grid.appendChild(card);
  });
}

function renderFolderLoading() {
  elements.contentArea.innerHTML = `<div class="state-container"><div>Chargement du contenu...</div></div>`;
}

// ===================== MODE « SÉLECTEUR DE FICHIER » (fenêtre Explorer 2 séparée) =====================
function getPickerSelectedFile() {
  const tab = getActiveTab();
  if (!tab || !tab.selectedPaths || tab.selectedPaths.length === 0) return null;
  const item = (tab.items || []).find(i => i.path === tab.selectedPaths[0]);
  return item && !item.is_dir ? item : null;
}

function updatePickerBar() {
  if (!state.picker) return;
  const input = document.getElementById('pickerFileName');
  const ok = document.getElementById('pickerOkBtn');
  const file = getPickerSelectedFile();
  if (input) input.value = file ? file.name : '';
  if (ok) ok.disabled = !file;
}

function confirmPickerSelection() {
  const file = getPickerSelectedFile();
  if (!file) return;
  window.electronAPI?.filePickerResult?.(file.path);
}

function cancelPicker() {
  window.electronAPI?.filePickerResult?.(null);
}

function enterPickerMode(cfg) {
  const exts = (cfg.extensions || []).map(e => String(e).replace(/^\./, '').toLowerCase());
  state.picker = { ...cfg, extensions: exts, filterOn: exts.length > 0 };
  document.body.classList.add('picker-mode');

  const title = document.getElementById('titlebarTitle');
  if (title) title.textContent = cfg.title || 'Sélectionner un fichier';
  document.title = cfg.title || 'Sélectionner un fichier';

  const sel = document.getElementById('pickerFilterSelect');
  if (sel) {
    sel.innerHTML = '';
    if (exts.length) {
      const o = document.createElement('option');
      o.value = 'filtered';
      o.textContent = cfg.filterLabel || `Fichiers (${exts.map(e => '*.' + e).join(', ')})`;
      sel.appendChild(o);
    }
    const all = document.createElement('option');
    all.value = 'all';
    all.textContent = 'Tous les fichiers (*.*)';
    sel.appendChild(all);
    sel.onchange = () => {
      state.picker.filterOn = sel.value === 'filtered';
      renderFolder();
    };
  }

  const ok = document.getElementById('pickerOkBtn');
  if (ok) {
    ok.textContent = cfg.confirmLabel || 'Sélectionner';
    ok.onclick = confirmPickerSelection;
  }
  const cancel = document.getElementById('pickerCancelBtn');
  if (cancel) cancel.onclick = cancelPicker;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cancelPicker();
  });
  updatePickerBar();
}

function getSortedAndFilteredItems() {
  const tab = getActiveTab();
  if (!tab) return [];

  let list = [...tab.items];
  if (state.picker && state.picker.filterOn && state.picker.extensions.length) {
    list = list.filter(item => item.is_dir || state.picker.extensions.includes((item.name.split('.').pop() || '').toLowerCase()));
  }
  if (tab.searchQuery.trim()) {
    const q = tab.searchQuery.toLowerCase();
    list = list.filter(item => item.name.toLowerCase().includes(q));
  }

  list.sort((a, b) => {
    if (a.is_dir && !b.is_dir) return -1;
    if (!a.is_dir && b.is_dir) return 1;

    let valA = a[tab.sortField];
    let valB = b[tab.sortField];

    if (tab.sortField === 'size') {
      valA = a.size || 0;
      valB = b.size || 0;
    } else if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = (valB || '').toLowerCase();
    }

    if (valA < valB) return tab.sortAsc ? -1 : 1;
    if (valA > valB) return tab.sortAsc ? 1 : -1;
    return 0;
  });

  return list;
}

function renderFolder() {
  const tab = getActiveTab();
  const items = getSortedAndFilteredItems();

  const colGroupHtml = `
    <colgroup>
      ${state.columnOrder.map(colId => `<col id="col_${colId}" style="width: ${state.columnWidths[colId] || DEFAULT_COLUMN_WIDTHS[colId] || 150}px;">`).join('')}
      <col id="col_filler">
    </colgroup>
  `;

  const theadHtml = `
    <thead>
      <tr>
        ${state.columnOrder.map(colId => {
          const def = COLUMN_CONFIG[colId] || { label: colId };
          const width = state.columnWidths[colId] || DEFAULT_COLUMN_WIDTHS[colId] || 150;
          const isSorted = tab.sortField === colId;
          const sortIcon = isSorted ? (tab.sortAsc ? '▲' : '▼') : '';
          return `
            <th draggable="true" data-field="${colId}" style="width: ${width}px;">
              <div class="th-content">
                <span>${def.label}</span>
                <span class="sort-icon">${sortIcon}</span>
              </div>
              <div class="col-resizer" title="Redimensionner la colonne"></div>
            </th>
          `;
        }).join('')}
        <th class="th-filler"></th>
      </tr>
    </thead>
  `;

  elements.contentArea.innerHTML = `
    <div class="folder-view" id="folderView">
      <div class="file-table-container" id="fileTableContainer">
        <table class="file-table" id="fileTable">
          ${colGroupHtml}
          ${theadHtml}
          <tbody id="fileTableBody"></tbody>
        </table>
        ${items.length === 0 ? '<div class="state-container">Ce dossier est vide.</div>' : ''}
      </div>
    </div>
  `;

  // Gestion du drag & drop pour réordonner les colonnes et du tri au clic
  let draggedColField = null;
  let didColDrag = false;

  elements.contentArea.querySelectorAll('.file-table th[data-field]').forEach(th => {
    // 1. Déplacement de colonne par glisser-déposer
    th.addEventListener('dragstart', (e) => {
      if (e.target.closest('.col-resizer')) {
        e.preventDefault();
        return;
      }
      draggedColField = th.dataset.field;
      didColDrag = true;
      th.classList.add('col-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', th.dataset.field);
    });

    th.addEventListener('dragover', (e) => {
      e.preventDefault(); // OBLIGATOIREMENT appelé pour autoriser le drop sous Chromium
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';

      const currentField = th.dataset.field;
      if (!draggedColField || draggedColField === currentField) {
        th.classList.remove('col-drag-over-left', 'col-drag-over-right');
        return;
      }

      const rect = th.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      if (e.clientX < mid) {
        th.classList.add('col-drag-over-left');
        th.classList.remove('col-drag-over-right');
      } else {
        th.classList.add('col-drag-over-right');
        th.classList.remove('col-drag-over-left');
      }
    });

    th.addEventListener('dragleave', () => {
      th.classList.remove('col-drag-over-left', 'col-drag-over-right');
    });

    th.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      th.classList.remove('col-drag-over-left', 'col-drag-over-right');
      const sourceField = e.dataTransfer.getData('text/plain') || draggedColField;
      const targetField = th.dataset.field;
      if (!sourceField || !targetField || sourceField === targetField) return;

      const fromIdx = state.columnOrder.indexOf(sourceField);
      const toIdx = state.columnOrder.indexOf(targetField);
      if (fromIdx !== -1 && toIdx !== -1) {
        const rect = th.getBoundingClientRect();
        let targetPos = (e.clientX < rect.left + rect.width / 2) ? toIdx : toIdx + 1;
        if (fromIdx < targetPos) targetPos--;

        const [movedCol] = state.columnOrder.splice(fromIdx, 1);
        state.columnOrder.splice(targetPos, 0, movedCol);

        try {
          localStorage.setItem('explorer_columns_order', JSON.stringify(state.columnOrder));
          localStorage.setItem('explorer_col_order', JSON.stringify(state.columnOrder));
        } catch (err) {}

        renderFolder();
      }
    });

    th.addEventListener('dragend', () => {
      draggedColField = null;
      setTimeout(() => { didColDrag = false; }, 50);
      elements.contentArea.querySelectorAll('.file-table th').forEach(h => {
        h.classList.remove('col-dragging', 'col-drag-over-left', 'col-drag-over-right');
      });
    });

    // 2. Gestion du tri au clic sur l'en-tête (sauf si on clique sur la poignée de redimensionnement ou après un drag)
    th.addEventListener('click', (e) => {
      if (e.target.closest('.col-resizer')) return;
      if (didColDrag) return;
      const field = th.dataset.field;
      if (!field) return;
      if (tab.sortField === field) {
        tab.sortAsc = !tab.sortAsc;
      } else {
        tab.sortField = field;
        tab.sortAsc = true;
      }
      renderFolder();
    });
  });

  // Gestion du redimensionnement des colonnes avec la souris
  elements.contentArea.querySelectorAll('.col-resizer').forEach(resizer => {
    resizer.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const th = resizer.parentElement;
      const field = th.dataset.field;
      if (!field) return;

      const startX = e.clientX;
      const startWidth = th.offsetWidth;
      const col = document.getElementById(`col_${field}`);

      document.body.classList.add('is-resizing');
      resizer.classList.add('resizing');

      const onMouseMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidth + dx);
        th.style.width = `${newWidth}px`;
        if (col) col.style.width = `${newWidth}px`;
        state.columnWidths[field] = newWidth;
      };

      const onMouseUp = () => {
        document.body.classList.remove('is-resizing');
        resizer.classList.remove('resizing');
        try {
          localStorage.setItem('explorer_col_widths', JSON.stringify(state.columnWidths));
        } catch (err) {}
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  });

  const tbody = document.getElementById('fileTableBody');
  items.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.className = `file-row ${item.is_dir ? 'is-dir' : ''}`;
    tr.setAttribute('draggable', 'true');
    tr.dataset.path = item.path;
    tr.dataset.isDir = item.is_dir ? 'true' : 'false';
    tr.dataset.index = index;

    // Le déplacement d'objet (drag & drop) ne s'active QUE si l'on clique sur le nom ou l'icône du fichier
    tr.addEventListener('mousedown', (e) => {
      if (e.target.closest('.file-name-cell') || e.target.closest('.file-name-td') || e.target.closest('td:first-child')) {
        tr.setAttribute('draggable', 'true');
      } else {
        tr.setAttribute('draggable', 'false');
      }
    });
    tr.addEventListener('mouseup', () => {
      tr.setAttribute('draggable', 'true');
    });

    if (tab.selectedPaths.includes(item.path)) {
      tr.classList.add('selected');
    }
    if (state.clipboard && state.clipboard.action === 'cut' && state.clipboard.paths.includes(item.path)) {
      tr.classList.add('cut-item');
    }

    const cellsHtml = state.columnOrder.map(colId => {
      const def = COLUMN_CONFIG[colId];
      return def ? def.renderCell(item) : '<td></td>';
    }).join('');

    tr.innerHTML = `
      ${cellsHtml}
      <td class="td-filler"></td>
    `;

    // 1. SIMPLE CLIC GAUCHE SUR LE NOM : SÉLECTION DE TOUTE LA HAUTEUR DU CHAMP
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.file-name-cell') || e.target.closest('.file-name-td') || e.target.closest('td:first-child')) {
        e.stopPropagation();
        handleRowClick(item, index, e);
      }
    });

    // 2. DOUBLE-CLIC GAUCHE : OUVERTURE (Application lance le soft / Dossier navigue / Fichier ouvre le soft)
    tr.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (state.picker) {
        if (item.is_dir) {
          navigateTo(item.path);
        } else {
          tab.selectedPaths = [item.path];
          updateSelectionUI();
          confirmPickerSelection();
        }
        return;
      }
      const isApp = !!(item.name && item.name.toLowerCase().endsWith('.app')) || (item.extension && item.extension.toLowerCase() === '.app');
      if (isApp) {
        openItem(item.path);
      } else if (item.is_dir) {
        navigateTo(item.path);
      } else {
        const ext = (item.extension || '').toLowerCase();
        if (isMediaFile(ext)) {
          openMediaPlayer(item.path, item.name, ext);
        } else {
          openItem(item.path);
        }
      }
    });

    // 3. DRAG & DROP : GLISSER UN OU PLUSIEURS FICHIERS
    tr.addEventListener('dragstart', (e) => {
      // 1. Déterminer la liste des fichiers sélectionnés (pathsToDrag)
      let pathsToDrag = [];
      if (tab.selectedPaths.includes(item.path)) {
        pathsToDrag = [...tab.selectedPaths];
      } else {
        tab.selectedPaths = [item.path];
        tab.lastSelectedIndex = index;
        updateSelectionUI();
        pathsToDrag = [item.path];
      }

      // 2. Enregistrer immédiatement la sélection
      window._draggedPaths = pathsToDrag;
      window._dropHandledInternally = false;
      const api = window.api || window.electronAPI;
      if (api?.startInternalDrag) {
        api.startInternalDrag(pathsToDrag);
      } else if (api?.setDragFiles) {
        api.setDragFiles({ paths: pathsToDrag });
      }

      tr.classList.add('dragging');

      // 3. Déclencher le glisser-déposer multi-fichiers natif Windows OLE dans Electron
      if (api?.startNativeDrag) {
        e.preventDefault();
        api.startNativeDrag({ paths: pathsToDrag, isCopy: e.ctrlKey });
        return;
      }

      // Fallback HTML5 si pas dans Electron
      try {
        e.dataTransfer.effectAllowed = 'copyMove';
        const jsonStr = JSON.stringify(pathsToDrag);
        e.dataTransfer.setData('text/plain', jsonStr);
        e.dataTransfer.setData('application/x-explorer-files', jsonStr);
        e.dataTransfer.setData('application/json', jsonStr);

        // Permettre le glissement d'un fichier vers l'extérieur (Bureau / Explorateur Windows)
        const formattedPath = item.path.replace(/\\/g, '/');
        e.dataTransfer.setData('DownloadURL', `application/octet-stream:${item.name}:file:///${formattedPath}`);
      } catch (err) {}
    });

    tr.addEventListener('dragend', async (e) => {
      tr.setAttribute('draggable', 'true');
      document.querySelectorAll('.file-row').forEach(r => r.classList.remove('dragging', 'drop-target'));
      document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('drop-target', 'drag-over-top', 'drag-over-bottom'));
      document.querySelectorAll('.breadcrumb-segment').forEach(b => b.classList.remove('drop-target'));
      document.querySelectorAll('.drive-card').forEach(d => d.classList.remove('drop-target'));

      const api = window.api || window.electronAPI;

      // 1. Si le drop a été effectué dans la fenêtre courante : NE JAMAIS SUPPRIMER !
      if (window._dropHandledInternally) {
        window._draggedPaths = null;
        window._dropHandledInternally = false;
        return;
      }

      // 2. Si le pointeur de la souris se trouve encore dans les limites de la fenêtre Explorer 2 :
      // C'est un lâcher interne (ex: drop sur soi-même, annulation ou zone neutre) : NE RIEN FAIRE !
      if (e.clientX >= 0 && e.clientX <= window.innerWidth && e.clientY >= 0 && e.clientY <= window.innerHeight) {
        window._draggedPaths = null;
        window._dropHandledInternally = false;
        if (api?.markDropHandled) api.markDropHandled();
        return;
      }

      // 3. Vérifier si une autre fenêtre de l'application a pris en charge le drop
      let handledInternally = false;
      if (api?.isDropHandled) {
        try {
          handledInternally = await api.isDropHandled();
        } catch (err) {}
      }

      if (handledInternally) {
        window._draggedPaths = null;
        window._dropHandledInternally = false;
        return;
      }

      // 4. Si dropEffect est 'none', c'est une annulation : NE RIEN SUPPRIMER !
      if (!e.dataTransfer || e.dataTransfer.dropEffect === 'none') {
        window._draggedPaths = null;
        window._dropHandledInternally = false;
        return;
      }

      // 5. UNIQUEMENT si le drop a été déposé dans le vrai Explorateur Windows ou Bureau (externe)
      const isCopy = e.ctrlKey;
      if (window._draggedPaths && window._draggedPaths.length > 0) {
        // En cas de glissement externe vers Windows Explorer, seul l'élément glissé (item.path)
        // a été transféré via le flux DownloadURL. On ne supprime JAMAIS les autres fichiers non transférés !
        const pathsToDelete = window._draggedPaths.includes(item.path) ? [item.path] : [window._draggedPaths[0]];
        const multiSelected = window._draggedPaths.length > 1;
        window._draggedPaths = null;
        window._dropHandledInternally = false;

        if (multiSelected) {
          showToast("Déplacement vers Windows : 1 fichier transféré. Pour déplacer plusieurs fichiers vers Windows, utilisez Couper / Coller (Ctrl+X / Ctrl+V)", "info");
        }

        // Faire apparaître la boîte de dialogue de transfert avec la courbe dans Explorer 2
        showExternalTransferDialog(pathsToDelete, isCopy);

        // Couper / Coller par défaut (Move) : suppression de la source transférée après écriture par l'OS
        if (!isCopy) {
          setTimeout(async () => {
            if (api?.deleteFiles) {
              await api.deleteFiles(pathsToDelete);
            } else {
              try {
                await fetch('/api/fs/trash_task', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ paths: pathsToDelete }),
                });
              } catch (err) {}
            }
            refresh();
            if (api?.refreshAllWindows) {
              api.refreshAllWindows();
            }
          }, 800);
        }
      }
    });

    // 4. CIBLE DE DÉPÔT (Si c'est un sous-dossier, on peut déposer dedans)
    if (item.is_dir) {
      tr.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
        tr.classList.add('drop-target');
      });
      tr.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
        tr.classList.add('drop-target');
      });
      tr.addEventListener('dragleave', (e) => {
        if (!tr.contains(e.relatedTarget)) {
          tr.classList.remove('drop-target');
        }
      });
      tr.addEventListener('drop', async (e) => {
        tr.classList.remove('drop-target');
        await handleFileDrop(e, item.path);
      });
    }

    // 5. CLIC DROIT SUR ÉLÉMENT
    tr.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.previewSelection = null;
      if (!tab.selectedPaths.includes(item.path)) {
        tab.selectedPaths = [item.path];
        tab.lastSelectedIndex = index;
        updateSelectionUI();
        updatePreviewPane();
      } else {
        updateToolbarState();
      }
      openItemContextMenu(e, item);
    });

    tbody.appendChild(tr);
  });

  const container = document.getElementById('fileTableContainer');
  let justFinishedMarquee = false;

  // Support Drop entrant direct dans le dossier courant (venant de Windows Explorer ou autre fenêtre)
  const onContainerDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
  };
  container.addEventListener('dragenter', onContainerDrag);
  container.addEventListener('dragover', onContainerDrag);
  container.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target.closest('.file-row.is-dir') || e.target.closest('thead') || e.target.closest('th')) return;
    const currentTab = getActiveTab();
    if (!currentTab || !currentTab.path) return;
    await handleFileDrop(e, currentTab.path);
  });

  // Clic dans le vide : désélectionne tout (sauf si on vient de faire un glisser de sélection)
  container.addEventListener('click', (e) => {
    if (justFinishedMarquee) {
      justFinishedMarquee = false;
      return;
    }
    if (!e.target.closest('.file-row')) {
      deselectAll();
    }
  });

  // Sélection rectangulaire avec la souris (Marquee / Rubber-band)
  // S'active dès qu'on clique dans le vide OU sur les autres colonnes hors de la zone de nom
  container.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    // On ne démarre PAS la zone de sélection si le clic est sur le nom ou toute la hauteur du champ de nom
    if (e.target.closest('.file-name-cell') || e.target.closest('.file-name-td') || e.target.closest('td:first-child') || e.target.closest('thead') || e.target.closest('.col-resizer') || e.target.closest('button') || e.target.closest('input')) {
      return;
    }

    const tab = getActiveTab();
    if (!tab) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let isDragging = false;
    let marqueeEl = null;

    const clickedRow = e.target.closest('.file-row');
    const additive = e.metaKey || e.ctrlKey; // ⌘ (Finder) ou Ctrl : ajoute à la sélection existante
    const initialSelected = additive ? [...(tab.selectedPaths || [])] : [];
    const rows = Array.from(container.querySelectorAll('.file-row'));
    const getRowRects = () => rows.map(row => ({
      el: row,
      path: row.dataset.path,
      rect: row.getBoundingClientRect()
    }));
    let cachedRowRects = getRowRects();

    const onMouseMove = (moveEvent) => {
      const curX = moveEvent.clientX;
      const curY = moveEvent.clientY;
      const dist = Math.hypot(curX - startX, curY - startY);

      if (!isDragging && dist > 4) {
        isDragging = true;
        document.body.classList.add('is-marquee-selecting');
        marqueeEl = document.createElement('div');
        marqueeEl.className = 'selection-marquee';
        document.body.appendChild(marqueeEl);
      }

      if (isDragging && marqueeEl) {
        const left = Math.min(startX, curX);
        const top = Math.min(startY, curY);
        const right = Math.max(startX, curX);
        const bottom = Math.max(startY, curY);

        marqueeEl.style.left = `${left}px`;
        marqueeEl.style.top = `${top}px`;
        marqueeEl.style.width = `${right - left}px`;
        marqueeEl.style.height = `${bottom - top}px`;

        const newSelected = new Set(initialSelected);

        cachedRowRects.forEach(({ el, path, rect }) => {
          const intersects = !(rect.right < left || rect.left > right || rect.bottom < top || rect.top > bottom);
          if (intersects) {
            newSelected.add(path);
            el.classList.add('selected');
          } else {
            if (!additive) {
              newSelected.delete(path);
              el.classList.remove('selected');
            } else if (!initialSelected.includes(path)) {
              newSelected.delete(path);
              el.classList.remove('selected');
            }
          }
        });

        tab.selectedPaths = Array.from(newSelected);

        const count = tab.selectedPaths.length;
        if (count > 0 && tab.items) {
          const selectedItems = tab.items.filter(i => tab.selectedPaths.includes(i.path));
          const totalBytes = selectedItems.reduce((acc, i) => acc + (i.size || 0), 0);
          elements.selectedStatusText.textContent = `${count} sélectionné(s) (${formatBytes(totalBytes)})`;
        } else {
          elements.selectedStatusText.textContent = '';
        }
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (isDragging) {
        justFinishedMarquee = true;
        document.body.classList.remove('is-marquee-selecting');
        if (marqueeEl && marqueeEl.parentNode) {
          marqueeEl.parentNode.removeChild(marqueeEl);
        }
        updateSelectionUI();
        updatePreviewPane();
      } else {
        // Clic simple sans glissement : si on a cliqué sur une ligne (hors de la colonne nom)
        if (clickedRow) {
          const rowPath = clickedRow.dataset.path;
          const clickedItem = items.find(i => i.path === rowPath);
          const clickedIdx = items.findIndex(i => i.path === rowPath);
          if (clickedItem && clickedIdx >= 0) {
            handleRowClick(clickedItem, clickedIdx, e);
          }
        } else {
          deselectAll();
        }
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });

  // Clic droit dans le vide : menu contextuel arrière-plan
  container.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.file-row')) return;
    e.preventDefault();
    openBackgroundContextMenu(e);
  });

  updateStatus(items.length, 'élément(s)');
  updateSelectionUI();
}

// ===================== LOGIQUE DE SÉLECTION WINDOWS EXPLORER =====================
function handleRowClick(item, index, event) {
  const tab = getActiveTab();
  if (!tab) return;
  state.previewSelection = null;
  const items = getSortedAndFilteredItems();

  // Mode Cmd (⌘, comme dans le Finder) ou Ctrl : bascule l'élément dans la sélection
  if (event.metaKey || event.ctrlKey) {
    if (tab.selectedPaths.includes(item.path)) {
      tab.selectedPaths = tab.selectedPaths.filter(p => p !== item.path);
    } else {
      tab.selectedPaths.push(item.path);
    }
    tab.lastSelectedIndex = index;
    tab.anchorIndex = index;
  }
  // Mode Maj (Shift) : sélection par plage continue comme sous Windows
  else if (event.shiftKey) {
    const anchor = (tab.anchorIndex !== undefined && tab.anchorIndex >= 0) ? tab.anchorIndex : (tab.lastSelectedIndex >= 0 ? tab.lastSelectedIndex : 0);
    const start = Math.min(anchor, index);
    const end = Math.max(anchor, index);
    tab.selectedPaths = items.slice(start, end + 1).map(i => i.path);
    tab.lastSelectedIndex = index;
  }
  // Clic standard : sélectionne uniquement l'élément cliqué
  else {
    tab.selectedPaths = [item.path];
    tab.lastSelectedIndex = index;
    tab.anchorIndex = index;
  }

  updateSelectionUI();
  updatePreviewPane();
}

function selectAll() {
  const tab = getActiveTab();
  if (!tab || !tab.path) return;
  state.previewSelection = null;
  const items = getSortedAndFilteredItems();
  tab.selectedPaths = items.map(i => i.path);
  tab.lastSelectedIndex = 0;
  updateSelectionUI();
  updatePreviewPane();
}

function deselectAll() {
  const tab = getActiveTab();
  if (!tab) return;
  state.previewSelection = null;
  tab.selectedPaths = [];
  tab.lastSelectedIndex = -1;
  updateSelectionUI();
  updatePreviewPane();
}

function updateSelectionUI() {
  const tab = getActiveTab();
  const selectedPaths = tab ? tab.selectedPaths : [];

  document.querySelectorAll('.file-row').forEach(row => {
    const path = row.dataset.path;
    if (selectedPaths.includes(path)) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
  });

  updatePickerBar();

  const count = selectedPaths.length;
  if (count > 0 && tab && tab.items) {
    const selectedItems = tab.items.filter(i => selectedPaths.includes(i.path));
    const totalBytes = selectedItems.reduce((acc, i) => acc + (i.size || 0), 0);
    elements.selectedStatusText.textContent = `${count} sélectionné(s) (${formatBytes(totalBytes)})`;
  } else {
    elements.selectedStatusText.textContent = '';
  }

  updateToolbarState();
}

function updateStatus(count, label) {
  elements.statusText.textContent = `${count} ${label}`;
}

const MEDIA_IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico', '.tiff', '.tif', '.avif', '.heic'];
const MEDIA_AUDIO_EXTS = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.oga', '.opus', '.aiff', '.aif', '.wma', '.mid', '.midi'];
const MEDIA_VIDEO_EXTS = ['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi', '.wmv', '.flv', '.ogv'];

function isMediaFile(ext) {
  const e = (ext || '').toLowerCase();
  return MEDIA_IMAGE_EXTS.includes(e) || MEDIA_AUDIO_EXTS.includes(e) || MEDIA_VIDEO_EXTS.includes(e);
}

function openMediaPlayer(filePath, fileName, ext) {
  if (!fileName) {
    fileName = filePath.split(/[\\/]/).pop() || 'Média';
  }
  if (!ext) {
    ext = '.' + (fileName.split('.').pop() || '');
  }

  if (window.electronAPI?.openMediaPlayerWindow) {
    window.electronAPI.openMediaPlayerWindow({
      path: filePath,
      name: fileName,
      ext: ext,
      theme: getCurrentTheme()
    });
  } else {
    const url = `static/media-player.html?path=${encodeURIComponent(filePath)}&name=${encodeURIComponent(fileName)}&ext=${encodeURIComponent(ext)}&theme=${encodeURIComponent(getCurrentTheme())}`;
    window.open(url, '_blank', 'width=780,height=560,resizable=yes');
  }
}

async function ejectVolume(mountpoint) {
  if (!mountpoint) return;
  const label = getFolderName(mountpoint);
  try {
    const res = await fetch('/api/drives/eject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mountpoint }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Impossible d\'éjecter le volume');

    showToast(data.message || `Volume ${label} éjecté avec succès`, 'success');
    await fetchDrives();
    renderSidebarDrives();

    const tab = getActiveTab();
    if (tab && tab.path) {
      if (tab.path === mountpoint || tab.path.startsWith(mountpoint + '/')) {
        let fallbackPath = null;
        if (Array.isArray(tab.history)) {
          for (let i = tab.history.length - 1; i >= 0; i--) {
            const h = tab.history[i];
            if (h && h !== mountpoint && !h.startsWith(mountpoint + '/')) {
              fallbackPath = h;
              break;
            }
          }
        }
        if (fallbackPath) {
          navigateTo(fallbackPath);
        }
      }
      // Si l'utilisateur est dans un autre dossier, on reste dans ce dossier actuel sans charger l'accueil
    } else {
      loadHome();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function openItem(path) {
  try {
    // Si l'application tourne dans Electron, utiliser le shell natif de Windows
    if (window.electronAPI && typeof window.electronAPI.openPath === 'function') {
      const err = await window.electronAPI.openPath(path);
      if (!err) {
        showToast(`Ouvert : ${getFolderName(path)}`, 'success');
        return;
      }
    }
    const res = await fetch('/api/fs/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Impossible d\'ouvrir l\'élément');
    showToast(`Ouvert : ${getFolderName(path)}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===================== VOLET DE VISUALISATION (PREVIEW PANE) =====================
function getArchiveDirContents(validItems, currentDir = '') {
  const curParts = currentDir ? currentDir.split('/').filter(Boolean) : [];
  const curDepth = curParts.length;
  const grouped = {};

  for (const it of validItems) {
    const parts = it.parts || (it.clean_path ? it.clean_path.split('/') : []);
    if (!parts || parts.length === 0) continue;

    if (curDepth > 0) {
      if (parts.length <= curDepth) continue;
      let match = true;
      for (let i = 0; i < curDepth; i++) {
        if (parts[i] !== curParts[i]) { match = false; break; }
      }
      if (!match) continue;
      const childName = parts[curDepth];
      const isSubDir = (parts.length > curDepth + 1) || it.is_dir;
      const childRelPath = [...curParts, childName].join('/');
      if (!grouped[childName]) {
        grouped[childName] = {
          name: childName,
          path: childRelPath,
          is_dir: isSubDir,
          size: 0,
          file_count: 0,
          mtime: it.mtime || ''
        };
      }
      const e = grouped[childName];
      if (isSubDir) e.is_dir = true;
      if (!it.is_dir) {
        e.size += (it.size || 0);
        e.file_count += 1;
      }
      if (it.mtime && (!e.mtime || it.mtime > e.mtime)) {
        e.mtime = it.mtime;
      }
    } else {
      const childName = parts[0];
      const isSubDir = (parts.length > 1) || it.is_dir;
      if (!grouped[childName]) {
        grouped[childName] = {
          name: childName,
          path: childName,
          is_dir: isSubDir,
          size: 0,
          file_count: 0,
          mtime: it.mtime || ''
        };
      }
      const e = grouped[childName];
      if (isSubDir) e.is_dir = true;
      if (!it.is_dir) {
        e.size += (it.size || 0);
        e.file_count += 1;
      }
      if (it.mtime && (!e.mtime || it.mtime > e.mtime)) {
        e.mtime = it.mtime;
      }
    }
  }

  const list = Object.values(grouped);
  list.forEach(e => {
    e.size_formatted = (e.size > 0 || !e.is_dir) ? formatBytes(e.size) : '';
  });
  list.sort((a, b) => {
    if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  return list;
}

function renderArchivePreviewContent(contentArea, archiveState) {
  if (!contentArea || !archiveState) return;

  const currentSubdir = archiveState.currentSubdir || '';
  const items = getArchiveDirContents(archiveState.rawItems, currentSubdir);
  const isRoot = !currentSubdir;

  let navHtml = '';
  if (!isRoot) {
    navHtml = `
      <div style="display:flex;align-items:center;gap:6px;margin:8px 0 6px 0;padding:4px 6px;background:var(--w11-surface-alt);border:1px solid var(--w11-border-subtle);border-radius:4px;font-size:11.5px;">
        <button type="button" class="btn" id="btnArchiveParent" style="padding:2px 8px;font-size:11px;line-height:1.2;cursor:pointer;">⬅️ Dossier parent</button>
        <span style="color:var(--w11-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace;" title="/${escapeHtml(currentSubdir)}">/${escapeHtml(currentSubdir)}</span>
      </div>
    `;
  }

  let html = `
    <div class="preview-meta-section-title" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;">
      <span>Contenu${isRoot ? ' (racine)' : ' (' + escapeHtml(currentSubdir) + ')'} (${items.length} élément${items.length > 1 ? 's' : ''})</span>
    </div>
    ${navHtml}
    <div class="preview-table-container" style="max-height:280px;overflow:auto;padding:0;border:1px solid var(--w11-border-subtle);border-radius:4px;">
      <table class="preview-table" style="width:100%;font-size:11.5px;border-collapse:collapse;">
        <thead>
          <tr style="background:var(--w11-surface-alt);position:sticky;top:0;z-index:1;">
            <th style="text-align:left;padding:6px 8px;font-weight:600;border-bottom:1px solid var(--w11-border);color:var(--w11-text-primary);">Nom</th>
            <th style="text-align:right;padding:6px 8px;font-weight:600;border-bottom:1px solid var(--w11-border);color:var(--w11-text-primary);width:70px;">Taille</th>
            <th style="text-align:right;padding:6px 8px;font-weight:600;border-bottom:1px solid var(--w11-border);color:var(--w11-text-primary);width:100px;">Date</th>
          </tr>
        </thead>
        <tbody>
  `;

  if (items.length === 0) {
    html += `
      <tr>
        <td colspan="3" style="text-align:center;padding:12px;color:var(--w11-text-secondary);font-style:italic;">
          Ce dossier est vide
        </td>
      </tr>
    `;
  } else {
    items.forEach((file, idx) => {
      const ext = file.is_dir ? '' : (file.name.includes('.') ? '.' + file.name.split('.').pop().toLowerCase() : '');
      const icon = getFileIcon({ name: file.name, is_dir: file.is_dir, extension: ext });
      const tooltip = `${file.name} (Double-clic pour ouvrir, clic droit pour options)`;
      html += `
        <tr class="folder-preview-row archive-preview-row" data-idx="${idx}" data-path="${escapeHtml(file.path)}" style="border-bottom:1px solid var(--w11-border-subtle);color:var(--w11-text-primary);cursor:pointer;">
          <td style="padding:4px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;color:var(--w11-text-primary);" title="${escapeHtml(tooltip)}">
            <span class="preview-row-icon" style="margin-right:6px;display:inline-flex;vertical-align:middle;width:20px;height:20px;align-items:center;justify-content:center;">${icon}</span><span style="${file.is_dir ? 'font-weight:600;' : ''}">${escapeHtml(file.name)}</span>
          </td>
          <td style="text-align:right;padding:4px 8px;white-space:nowrap;color:var(--w11-text-secondary);font-size:11px;">
            ${escapeHtml(file.size_formatted || '')}
          </td>
          <td style="text-align:right;padding:4px 8px;white-space:nowrap;color:var(--w11-text-secondary);font-size:10.5px;">
            ${escapeHtml(file.mtime || '')}
          </td>
        </tr>
      `;
    });
  }

  html += '</tbody></table></div>';
  if (archiveState.is_truncated && isRoot) {
    html += `<div style="font-size:11px;color:var(--w11-text-secondary);text-align:center;padding:4px;">Affichage limité à 2000 éléments</div>`;
  }

  contentArea.innerHTML = html;

  const backBtn = contentArea.querySelector('#btnArchiveParent');
  if (backBtn) {
    backBtn.onclick = () => {
      const parts = archiveState.currentSubdir.split('/').filter(Boolean);
      parts.pop();
      archiveState.currentSubdir = parts.join('/');
      renderArchivePreviewContent(contentArea, archiveState);
    };
  }

  const rows = contentArea.querySelectorAll('.archive-preview-row');
  const selectRow = (r) => {
    rows.forEach(other => {
      other.classList.remove('preview-row-selected');
      other.style.background = '';
      other.style.color = '';
    });
    r.classList.add('preview-row-selected');
    r.style.background = '#000080';
    r.style.color = '#ffffff';
  };

  rows.forEach(r => {
    const idx = parseInt(r.getAttribute('data-idx'), 10);
    const file = items[idx];
    if (!file) return;

    // Clic simple = sélection uniquement (comme pour les dossiers)
    r.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectRow(r);
      state.previewSelection = {
        type: 'archive',
        archivePath: archiveState.path,
        file: file,
        archiveState: archiveState,
        contentArea: contentArea
      };
      updateToolbarState();
    };

    // Double-clic = ouverture du sous-dossier de l'archive ou ouverture du fichier extrait
    r.ondblclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (file.is_dir) {
        state.previewSelection = null;
        archiveState.currentSubdir = file.path;
        renderArchivePreviewContent(contentArea, archiveState);
        updateToolbarState();
      } else {
        await openArchiveMemberItem(archiveState.path, file);
      }
    };

    // Clic droit = sélection + menu contextuel complet
    r.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectRow(r);
      state.previewSelection = {
        type: 'archive',
        archivePath: archiveState.path,
        file: file,
        archiveState: archiveState,
        contentArea: contentArea
      };
      updateToolbarState();
      openArchiveItemContextMenu(e, archiveState, file, contentArea);
    };
  });
}

async function stageArchiveMemberToTemp(archivePath, file) {
  const res = await fetch(`${API_BASE}/api/fs/archive/member-extract-temp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      archive_path: archivePath,
      member_path: file.path,
      is_dir: !!file.is_dir
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Impossible d'extraire l'élément depuis l'archive.");
  return data.path;
}

async function openArchiveMemberItem(archivePath, file) {
  try {
    const tempPath = await stageArchiveMemberToTemp(archivePath, file);
    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop().toLowerCase() : '';
    if (isMediaFile(ext)) {
      openMediaPlayer(tempPath, file.name, ext);
    } else {
      await openItem(tempPath);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openArchiveItemContextMenu(e, archiveState, file, contentArea) {
  const archivePath = archiveState.path;
  const isZip = archivePath.toLowerCase().endsWith('.zip');
  const ext = file.is_dir ? '' : (file.name.includes('.') ? '.' + file.name.split('.').pop().toLowerCase() : '');
  const isMedia = !file.is_dir && isMediaFile(ext);

  elements.contextMenu.innerHTML = `
    ${isMedia ? `
      <div class="context-menu-item" id="ctxArchOpenMedia" style="font-weight:600;color:var(--w11-accent);">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        <span>Lire dans Explorer 2</span>
      </div>
      <div class="context-menu-item" id="ctxArchOpen">${getIcon('open')} <span>Ouvrir avec le système</span></div>
    ` : `
      <div class="context-menu-item" id="ctxArchOpen">${getIcon('open')} <span>Ouvrir</span></div>
    `}
    <div class="context-menu-item" id="ctxArchExtractHere">
      ${getIcon('fileZip')} <span>Extraire ici</span>
    </div>
    <div class="context-menu-separator"></div>
    <div class="context-menu-item" id="ctxArchCut">${getIcon('cut')} <span>Couper</span><span class="menu-shortcut">Cmd+X</span></div>
    <div class="context-menu-item" id="ctxArchCopy">${getIcon('copy')} <span>Copier</span><span class="menu-shortcut">Cmd+C</span></div>
    ${isZip ? `<div class="context-menu-item" id="ctxArchRename">${getIcon('rename')} <span>Renommer</span><span class="menu-shortcut">F2</span></div>` : ''}
    <div class="context-menu-item" id="ctxArchCopyPath">${getIcon('copy')} <span>Copier le chemin</span></div>
    <div class="context-menu-item" id="ctxArchProps">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
      <span>Taille & Propriétés</span>
    </div>
    ${isZip ? `
      <div class="context-menu-separator"></div>
      <div class="context-menu-item danger" id="ctxArchDelete">${getIcon('delete')} <span>Supprimer</span><span class="menu-shortcut">Suppr</span></div>
    ` : ''}
  `;

  positionContextMenu(e);

  const openMediaBtn = document.getElementById('ctxArchOpenMedia');
  if (openMediaBtn) {
    openMediaBtn.onclick = async () => {
      closeContextMenu();
      await openArchiveMemberItem(archivePath, file);
    };
  }

  document.getElementById('ctxArchOpen').onclick = async () => {
    closeContextMenu();
    if (file.is_dir) {
      archiveState.currentSubdir = file.path;
      renderArchivePreviewContent(contentArea, archiveState);
    } else {
      try {
        const tempPath = await stageArchiveMemberToTemp(archivePath, file);
        await openItem(tempPath);
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  document.getElementById('ctxArchExtractHere').onclick = async () => {
    closeContextMenu();
    try {
      const tab = getActiveTab();
      const dest = (tab && tab.path) ? tab.path : undefined;
      const res = await fetch(`${API_BASE}/api/fs/archive/extract-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archive_path: archivePath,
          member_path: file.path,
          is_dir: !!file.is_dir,
          destination: dest
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erreur d'extraction");
      showToast(data.message || `« ${file.name} » extrait avec succès`, 'success');
      if (tab && tab.path) {
        await loadFolder(tab.path, false);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCopyOrCut = async (action) => {
    closeContextMenu();
    try {
      const tempPath = await stageArchiveMemberToTemp(archivePath, file);
      const clipData = { action: 'copy', paths: [tempPath] };
      state.clipboard = clipData;
      if (window.electronAPI?.setClipboard) {
        window.electronAPI.setClipboard(clipData);
      }
      updateToolbarState();
      showToast(`« ${file.name} » prêt à être collé`, 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  document.getElementById('ctxArchCopy').onclick = () => handleCopyOrCut('copy');
  document.getElementById('ctxArchCut').onclick = () => handleCopyOrCut('cut');

  document.getElementById('ctxArchCopyPath').onclick = () => {
    closeContextMenu();
    const fullInternalPath = `${archivePath}/${file.path}`;
    navigator.clipboard?.writeText(fullInternalPath);
    showToast("Chemin d'accès copié", 'info');
  };

  document.getElementById('ctxArchProps').onclick = async () => {
    closeContextMenu();
    try {
      const tempPath = await stageArchiveMemberToTemp(archivePath, file);
      showFolderSize({ path: tempPath, name: file.name, is_dir: !!file.is_dir });
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const renameBtn = document.getElementById('ctxArchRename');
  if (renameBtn) {
    renameBtn.onclick = async () => {
      closeContextMenu();
      const newName = await openModal('Renommer dans l\'archive', file.name, 'Renommer');
      if (!newName || newName.trim() === '' || newName.trim() === file.name) return;
      try {
        const res = await fetch(`${API_BASE}/api/fs/archive/rename-member`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            archive_path: archivePath,
            member_path: file.path,
            is_dir: !!file.is_dir,
            new_name: newName.trim()
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Erreur de renommage');
        archiveState.rawItems = data.raw_items || [];
        renderArchivePreviewContent(contentArea, archiveState);
        showToast(`Renommé en « ${newName.trim()} »`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  const deleteBtn = document.getElementById('ctxArchDelete');
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      closeContextMenu();
      try {
        const res = await fetch(`${API_BASE}/api/fs/archive/delete-member`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            archive_path: archivePath,
            member_path: file.path,
            is_dir: !!file.is_dir
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Erreur de suppression');
        archiveState.rawItems = data.raw_items || [];
        renderArchivePreviewContent(contentArea, archiveState);
        showToast(`« ${file.name} » supprimé de l'archive`, 'info');
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }
}

function setupRetroMediaPlayer(mediaType) {
  const isVideo = mediaType === 'video';
  const engine = isVideo
    ? document.getElementById('nativeVideoEngine')
    : document.getElementById('nativeAudioEngine');
  if (!engine) return;

  const btnPlay = document.getElementById(isVideo ? 'retroVideoBtnPlay' : 'retroBtnPlay');
  const btnPause = document.getElementById(isVideo ? 'retroVideoBtnPause' : 'retroBtnPause');
  const btnStop = document.getElementById(isVideo ? 'retroVideoBtnStop' : 'retroBtnStop');
  const btnRewind = document.getElementById(isVideo ? 'retroVideoBtnRewind' : 'retroBtnRewind');
  const btnForward = document.getElementById(isVideo ? 'retroVideoBtnForward' : 'retroBtnForward');
  const volSlider = document.getElementById(isVideo ? 'retroVideoVolSlider' : 'retroVolSlider');
  const timeDisplay = document.getElementById(isVideo ? 'retroVideoTime' : 'retroTimeDisplay');
  const statusDisplay = document.getElementById(isVideo ? 'retroVideoStatus' : 'retroPlayStatus');
  const trackbar = document.getElementById(isVideo ? 'retroVideoTrackbar' : 'retroTrackbar');
  const trackFill = document.getElementById(isVideo ? 'retroVideoTrackFill' : 'retroTrackFill');
  const trackThumb = document.getElementById(isVideo ? 'retroVideoTrackThumb' : 'retroTrackThumb');

  engine.volume = 0.25;
  if (volSlider) volSlider.value = '0.25';

  let animFrameId = null;

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function updateTime() {
    const cur = engine.currentTime || 0;
    const dur = engine.duration || 0;
    if (timeDisplay) {
      timeDisplay.textContent = `${formatTime(cur)} / ${dur > 0 ? formatTime(dur) : '--:--'}`;
    }
    const percent = dur > 0 ? Math.min(100, Math.max(0, (cur / dur) * 100)) : 0;
    if (trackFill) trackFill.style.setProperty('width', `${percent}%`, 'important');
    if (trackThumb) trackThumb.style.setProperty('left', `${percent}%`, 'important');
  }

  function smoothProgressLoop() {
    if (!engine.paused && !engine.ended) {
      updateTime();
      animFrameId = requestAnimationFrame(smoothProgressLoop);
    }
  }

  btnPlay?.addEventListener('click', () => {
    engine.play().catch(e => console.warn('Erreur lecture média:', e));
  });

  btnPause?.addEventListener('click', () => {
    engine.pause();
    cancelAnimationFrame(animFrameId);
  });

  btnStop?.addEventListener('click', () => {
    cancelAnimationFrame(animFrameId);
    engine.pause();
    engine.currentTime = 0;
    updateTime();
    if (statusDisplay) statusDisplay.textContent = '[ARRÊT]';
  });

  btnRewind?.addEventListener('click', () => {
    engine.currentTime = Math.max(0, (engine.currentTime || 0) - 5);
    updateTime();
  });

  btnForward?.addEventListener('click', () => {
    const dur = engine.duration || 0;
    engine.currentTime = dur > 0 ? Math.min(dur, (engine.currentTime || 0) + 5) : (engine.currentTime || 0) + 5;
    updateTime();
  });

  volSlider?.addEventListener('input', (e) => {
    engine.volume = parseFloat(e.target.value);
  });

  if (trackbar) {
    let isDragging = false;
    const seek = (e) => {
      const rect = trackbar.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const ratio = rect.width > 0 ? x / rect.width : 0;
      const dur = engine.duration || 0;
      if (dur > 0) {
        engine.currentTime = ratio * dur;
      }
      const pct = Math.min(100, Math.max(0, ratio * 100));
      if (trackFill) trackFill.style.setProperty('width', `${pct}%`, 'important');
      if (trackThumb) trackThumb.style.setProperty('left', `${pct}%`, 'important');
      if (timeDisplay && dur > 0) {
        timeDisplay.textContent = `${formatTime(ratio * dur)} / ${formatTime(dur)}`;
      }
    };
    trackbar.addEventListener('mousedown', (e) => {
      isDragging = true;
      seek(e);
    });
    window.addEventListener('mousemove', (e) => {
      if (isDragging) seek(e);
    });
    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  engine.addEventListener('play', () => {
    if (statusDisplay) statusDisplay.textContent = '[LECTURE]';
    cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(smoothProgressLoop);
  });

  engine.addEventListener('pause', () => {
    cancelAnimationFrame(animFrameId);
    if (statusDisplay && engine.currentTime > 0 && !engine.ended) {
      statusDisplay.textContent = '[PAUSE]';
    }
  });

  engine.addEventListener('ended', () => {
    cancelAnimationFrame(animFrameId);
    if (statusDisplay) statusDisplay.textContent = '[TERMINÉ]';
    updateTime();
  });

  engine.addEventListener('timeupdate', updateTime);
  engine.addEventListener('loadedmetadata', updateTime);
  engine.addEventListener('error', () => {
    cancelAnimationFrame(animFrameId);
    if (statusDisplay) statusDisplay.textContent = '[ERREUR FICHIER]';
  });

  updateTime();
}

// ==============================================================================
// FICHE PROPRIÉTÉS & MÉTADONNÉES (APERÇU IMAGE)
// ==============================================================================
let previewMetaRequestToken = 0;

function previewMetaRow(label, valueHtml) {
  return `<tr><td class="meta-label">${escapeHtml(label)}</td><td class="meta-value">${valueHtml}</td></tr>`;
}

// Lignes communes de la fiche « Propriétés du fichier » (données de base puis enrichies par l'API)
function buildImageMetaRows(item, ext, data) {
  const typeDesc = (data && data.type_desc) || item.type_desc || (ext ? ext.toUpperCase().replace('.', '') + ' Fichier' : 'Fichier');
  const sizeFormatted = (data && data.size_formatted) || item.size_formatted || '--';
  const exactBytes = (data && data.size_bytes_formatted)
    ? `${data.size_bytes_formatted} octets`
    : ((typeof item.size === 'number') ? `${item.size.toLocaleString('fr-FR')} octets` : '--');
  const modifiedFormatted = (data && data.modified_formatted) || item.modified_formatted || '--';
  const lastSlash = Math.max(item.path.lastIndexOf('\\'), item.path.lastIndexOf('/'));
  const location = (data && data.location) || (lastSlash >= 0 ? item.path.substring(0, lastSlash) : '');
  const image = (data && data.image) || null;

  const rows = [];
  rows.push(previewMetaRow('Type', escapeHtml(typeDesc)));
  if (image && image.width && image.height) {
    const sub = [image.megapixels, image.aspect_ratio ? `ratio ${image.aspect_ratio}` : ''].filter(Boolean).join(' · ');
    rows.push(previewMetaRow('Dimensions', `<strong>${image.width} × ${image.height} px</strong>${sub ? ` <span class="meta-sub">(${escapeHtml(sub)})</span>` : ''}`));
  } else if (!data) {
    rows.push(previewMetaRow('Dimensions', '<span class="meta-sub">analyse…</span>'));
  }
  if (!item.is_dir) {
    rows.push(previewMetaRow('Taille', `<strong>${escapeHtml(sizeFormatted)}</strong> <span class="meta-sub">(${escapeHtml(exactBytes)})</span>`));
  }
  if (data && data.created_formatted) {
    rows.push(previewMetaRow('Créé le', escapeHtml(data.created_formatted)));
  }
  rows.push(previewMetaRow('Modifié le', escapeHtml(modifiedFormatted)));
  if (data && data.accessed_formatted) {
    rows.push(previewMetaRow('Dernier accès', escapeHtml(data.accessed_formatted)));
  }
  rows.push(previewMetaRow('Emplacement', `<span class="meta-path" title="${escapeHtml(location)}">${escapeHtml(location)}</span>`));
  rows.push(previewMetaRow('Extension', escapeHtml(ext || '(aucune)')));
  if (data && data.permissions) {
    const droits = data.octal_mode ? `${data.permissions} (${data.octal_mode})` : data.permissions;
    const ownerGroup = [data.owner, data.group].filter(Boolean).join(' : ');
    rows.push(previewMetaRow('Droits', `${escapeHtml(droits)}${ownerGroup ? ` <span class="meta-sub">${escapeHtml(ownerGroup)}</span>` : ''}`));
  }
  rows.push(previewMetaRow('Fichier masqué', (data ? data.is_hidden : item.is_hidden) ? 'Oui' : 'Non'));
  return rows;
}

// Métadonnées techniques de l'image (dimensions, colorimétrie, EXIF)
function buildImageMetaExtraHtml(image) {
  if (!image) return '';
  const rows = [];
  if (image.format) rows.push(previewMetaRow('Format', escapeHtml(image.format)));
  if (image.width && image.height) rows.push(previewMetaRow('Résolution', `${image.width} × ${image.height} pixels`));
  if (image.megapixels) rows.push(previewMetaRow('Mégapixels', escapeHtml(image.megapixels)));
  if (image.aspect_ratio) rows.push(previewMetaRow('Ratio d\'image', escapeHtml(image.aspect_ratio)));
  if (image.color_mode) rows.push(previewMetaRow('Colorimétrie', escapeHtml(image.color_mode)));
  if (image.color_depth_bits) rows.push(previewMetaRow('Profondeur', `${image.color_depth_bits} bits`));
  if (Array.isArray(image.dpi) && image.dpi.length === 2) {
    rows.push(previewMetaRow('Résolution (PPP)', `${image.dpi[0]} × ${image.dpi[1]} points/pouce`));
  }
  rows.push(previewMetaRow('Transparence', image.has_alpha ? 'Oui (canal alpha)' : 'Non'));
  if (image.frames && image.frames > 1) {
    rows.push(previewMetaRow(image.frames_label === 'icônes' ? 'Icônes' : 'Images (animation)', String(image.frames)));
  }

  let html = `<div class="preview-meta-section-title" style="margin-top:14px;">Métadonnées de l'image</div>
    <table class="preview-meta-table"><tbody>${rows.join('')}</tbody></table>`;

  const exif = image.exif || null;
  if (exif && typeof exif === 'object') {
    const exifRows = Object.keys(exif).map(key => previewMetaRow(key, escapeHtml(String(exif[key]))));
    if (exifRows.length) {
      html += `<div class="preview-meta-section-title" style="margin-top:14px;">Métadonnées EXIF</div>
        <table class="preview-meta-table"><tbody>${exifRows.join('')}</tbody></table>`;
    }
  }
  return html;
}

// Enrichissement asynchrone de la fiche : propriétés système, dimensions et EXIF
async function loadImagePreviewMetadata(item, ext) {
  const token = ++previewMetaRequestToken;
  const initialBody = document.getElementById('previewImageMetaBody');
  if (!initialBody) return;

  let data = null;
  try {
    const res = await fetch(`${API_BASE}/api/fs/metadata?path=${encodeURIComponent(item.path)}`);
    if (res.ok) data = await res.json();
  } catch (err) {
    data = null;
  }

  // La sélection a changé pendant la requête : ne pas écraser l'aperçu courant
  if (token !== previewMetaRequestToken) return;
  const bodyEl = document.getElementById('previewImageMetaBody');
  if (!bodyEl) return;

  bodyEl.innerHTML = buildImageMetaRows(item, ext, data).join('');
  const extraEl = document.getElementById('previewImageExtraMeta');
  if (extraEl) {
    extraEl.innerHTML = buildImageMetaExtraHtml(data ? data.image : null);
  }
}

async function updatePreviewPane() {
  state.previewSelection = null;
  previewMetaRequestToken++;
  if (window._activePreviewSpectrum) {
    window._activePreviewSpectrum.destroy();
    window._activePreviewSpectrum = null;
  }
  if (!state.showPreview) return;
  const tab = getActiveTab();

  if (!tab || !tab.selectedPaths || tab.selectedPaths.length !== 1) {
    elements.previewTitle.textContent = 'Aperçu';
    elements.previewBody.innerHTML = `<div class="preview-placeholder">Sélectionnez un seul fichier pour afficher son aperçu</div>`;
    return;
  }

  const selectedPath = tab.selectedPaths[0];
  const allItems = (tab.items && tab.items.length) ? tab.items : getSortedAndFilteredItems();
  const item = allItems.find(i => i.path === selectedPath || i.path.toLowerCase() === selectedPath.toLowerCase());
  if (!item) {
    elements.previewTitle.textContent = 'Aperçu';
    elements.previewBody.innerHTML = `<div class="preview-placeholder">Sélectionnez un fichier pour afficher son aperçu</div>`;
    return;
  }

  elements.previewTitle.textContent = item.name;

  // Dossier : on laisse passer pour afficher métadonnées + contenu (comme un fichier)
  // (aucun retour anticipé)

  const ext = (item.extension || '').toLowerCase();
  const rawUrl = `${API_BASE}/api/fs/raw?path=${encodeURIComponent(item.path)}`;

  // Images : aperçu visuel + fiche complète des propriétés & métadonnées
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'].includes(ext)) {
    elements.previewBody.innerHTML = `
      <div class="preview-metadata-card">
        <div class="preview-image-wrap preview-image-wrap-card">
          <img class="preview-image preview-image-card" src="${rawUrl}" alt="${escapeHtml(item.name)}" onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\\'preview-placeholder\\'>Erreur de chargement de l\\'image</div>';">
        </div>

        <div class="preview-meta-header">
          <div class="preview-meta-icon">${getFileIcon(item)}</div>
          <div class="preview-meta-title-wrap">
            <div class="preview-meta-filename" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
            <div class="preview-meta-type">${escapeHtml(item.type_desc || 'Image')}</div>
          </div>
        </div>

        <div class="preview-meta-section-title">Propriétés du fichier</div>
        <table class="preview-meta-table">
          <tbody id="previewImageMetaBody">${buildImageMetaRows(item, ext, null).join('')}</tbody>
        </table>

        <div id="previewImageExtraMeta"></div>

        <div class="preview-meta-actions">
          <button class="btn primary" onclick="openItem('${escapeJs(item.path)}')">Ouvrir avec le système</button>
          <button class="btn" onclick="showFolderSize({ path: '${escapeJs(item.path)}', name: '${escapeJs(item.name)}', is_dir: false, modified_formatted: '${escapeJs(item.modified_formatted || '')}' })">Propriétés…</button>
        </div>
      </div>
    `;
    loadImagePreviewMetadata(item, ext);
    return;
  }

  // PDF
  if (ext === '.pdf') {
    elements.previewBody.innerHTML = `
      <iframe class="preview-iframe" src="${rawUrl}"></iframe>
    `;
    return;
  }

  const AUDIO_EXTS = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.oga', '.opus', '.aiff', '.aif', '.wma', '.mid', '.midi'];
  const VIDEO_EXTS = ['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi', '.wmv', '.flv', '.ogv'];

  const lastSlash = Math.max(item.path.lastIndexOf('\\'), item.path.lastIndexOf('/'));
  const parentFolder = lastSlash >= 0 ? item.path.substring(0, lastSlash) : '';
  const fileIconSvg = getFileIcon(item);
  const sizeFormatted = item.size_formatted || '--';
  const exactBytes = (typeof item.size === 'number') ? `${item.size.toLocaleString()} octets` : '--';
  const modifiedFormatted = item.modified_formatted || '--';
  const typeDesc = item.type_desc || (item.is_dir ? 'Dossier de fichiers' : (ext ? ext.toUpperCase().replace('.', '') + ' Fichier' : 'Fichier'));
  const isHiddenStr = item.is_hidden ? 'Oui' : 'Non';

  let mediaHeaderHtml = '';
  if (AUDIO_EXTS.includes(ext)) {
    mediaHeaderHtml = `
      <div class="win98-media-player" id="retroMediaPlayer">
        <div class="win98-player-titlebar">
          <div style="display:flex;align-items:center;gap:5px;">
            <span>🎵</span>
            <span>Lecteur audio Windows 98</span>
          </div>
          <div class="win98-player-title-btns">
            <span class="win98-pbtn">?</span>
            <span class="win98-pbtn">✕</span>
          </div>
        </div>

        <div class="win98-player-lcd">
          <div style="display:flex;flex-direction:column;gap:2px;overflow:hidden;flex:1;margin-right:8px;">
            <div class="win98-lcd-track" id="retroTrackName" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
            <div class="win98-lcd-status" id="retroPlayStatus">[ARRÊT]</div>
          </div>
          <div class="win98-lcd-time" id="retroTimeDisplay">00:00 / --:--</div>
        </div>

        <div class="win98-player-trackbar" id="retroTrackbar" title="Position de lecture">
          <div class="win98-trackbar-groove">
            <div class="win98-trackbar-fill" id="retroTrackFill"></div>
            <div class="win98-trackbar-thumb" id="retroTrackThumb"></div>
          </div>
        </div>

        <div class="win98-player-controls">
          <button class="win98-ctrl-btn" id="retroBtnPlay" title="Lecture">▶</button>
          <button class="win98-ctrl-btn" id="retroBtnPause" title="Pause">❚❚</button>
          <button class="win98-ctrl-btn" id="retroBtnStop" title="Arrêt">■</button>
          <button class="win98-ctrl-btn" id="retroBtnRewind" title="Rembobiner (5s)">|◀◀</button>
          <button class="win98-ctrl-btn" id="retroBtnForward" title="Avancer (5s)">▶▶|</button>
          <div class="win98-vol-group">
            <span style="font-size:11px;">🔊</span>
            <input type="range" id="retroVolSlider" min="0" max="1" step="0.05" value="0.25" class="win98-vol-slider" title="Volume">
          </div>
        </div>

        <audio id="nativeAudioEngine" crossorigin="anonymous" src="${rawUrl}" preload="metadata"></audio>
      </div>
    `;
  } else if (VIDEO_EXTS.includes(ext)) {
    mediaHeaderHtml = `
      <div class="win98-media-player win98-video-player" id="retroVideoPlayerWrap">
        <div class="win98-player-titlebar">
          <div style="display:flex;align-items:center;gap:5px;">
            <span>🎬</span>
            <span>Lecteur vidéo Windows 98 (ActiveMovie)</span>
          </div>
          <div class="win98-player-title-btns">
            <span class="win98-pbtn">?</span>
            <span class="win98-pbtn">✕</span>
          </div>
        </div>

        <div class="win98-video-crt-viewport">
          <video id="nativeVideoEngine" src="${rawUrl}" preload="metadata" style="width:100%;max-height:220px;display:block;background:#000;"></video>
        </div>

        <div class="win98-player-lcd" style="padding:4px 8px;margin-bottom:4px;">
          <span class="win98-lcd-track" id="retroVideoStatus">[ARRÊT]</span>
          <span class="win98-lcd-time" id="retroVideoTime">00:00 / --:--</span>
        </div>

        <div class="win98-player-trackbar" id="retroVideoTrackbar" title="Position de lecture">
          <div class="win98-trackbar-groove">
            <div class="win98-trackbar-fill" id="retroVideoTrackFill"></div>
            <div class="win98-trackbar-thumb" id="retroVideoTrackThumb"></div>
          </div>
        </div>

        <div class="win98-player-controls">
          <button class="win98-ctrl-btn" id="retroVideoBtnPlay" title="Lecture">▶</button>
          <button class="win98-ctrl-btn" id="retroVideoBtnPause" title="Pause">❚❚</button>
          <button class="win98-ctrl-btn" id="retroVideoBtnStop" title="Arrêt">■</button>
          <button class="win98-ctrl-btn" id="retroVideoBtnRewind" title="Rembobiner (5s)">|◀◀</button>
          <button class="win98-ctrl-btn" id="retroVideoBtnForward" title="Avancer (5s)">▶▶|</button>
          <div class="win98-vol-group">
            <span style="font-size:11px;">🔊</span>
            <input type="range" id="retroVideoVolSlider" min="0" max="1" step="0.05" value="0.25" class="win98-vol-slider" title="Volume">
          </div>
        </div>
      </div>
    `;
  }

  elements.previewBody.innerHTML = `
    <div class="preview-metadata-card">
      ${mediaHeaderHtml}
      <div class="preview-meta-header">
        <div class="preview-meta-icon">${fileIconSvg}</div>
        <div class="preview-meta-title-wrap">
          <div class="preview-meta-filename" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
          <div class="preview-meta-type">${escapeHtml(typeDesc)}</div>
        </div>
      </div>

      <div class="preview-meta-section-title">Propriétés & Métadonnées</div>
      <table class="preview-meta-table">
        <tbody>
          <tr>
            <td class="meta-label">Type</td>
            <td class="meta-value">${escapeHtml(typeDesc)}</td>
          </tr>
          ${!item.is_dir ? `
            <tr>
              <td class="meta-label">Taille</td>
              <td class="meta-value"><strong>${escapeHtml(sizeFormatted)}</strong> <span class="meta-sub">(${exactBytes})</span></td>
            </tr>
          ` : ''}
          <tr>
            <td class="meta-label">Modifié le</td>
            <td class="meta-value">${escapeHtml(modifiedFormatted)}</td>
          </tr>
          <tr>
            <td class="meta-label">Emplacement</td>
            <td class="meta-value meta-path" title="${escapeHtml(parentFolder)}">${escapeHtml(parentFolder)}</td>
          </tr>
          <tr>
            <td class="meta-label">Extension</td>
            <td class="meta-value">${escapeHtml(ext || (item.is_dir ? '(dossier)' : '(aucune)'))}</td>
          </tr>
          <tr>
            <td class="meta-label">Fichier masqué</td>
            <td class="meta-value">${isHiddenStr}</td>
          </tr>
        </tbody>
      </table>

      <div class="preview-meta-actions">
        ${item.is_dir ? `
          <button class="btn primary" onclick="navigateTo('${escapeJs(item.path)}')">Ouvrir le dossier</button>
          <button class="btn" onclick="showFolderSize({ path: '${escapeJs(item.path)}', name: '${escapeJs(item.name)}', is_dir: true })">Calculer la taille</button>
        ` : `
          ${isMediaFile(ext) ? `
            <button class="btn primary" onclick="openMediaPlayer('${escapeJs(item.path)}', '${escapeJs(item.name)}', '${escapeJs(ext)}')">Ouvrir dans une fenêtre</button>
            <button class="btn" onclick="openItem('${escapeJs(item.path)}')">Ouvrir avec le système</button>
          ` : `
            <button class="btn primary" onclick="openItem('${escapeJs(item.path)}')">Ouvrir avec le système</button>
          `}
          ${['.zip', '.7z', '.rar', '.tar', '.gz', '.tgz', '.bz2', '.xz', '.iso'].includes(ext) ? `
            <button class="btn" onclick="triggerExtract('${escapeJs(item.path)}')">Extraire ici</button>
          ` : ''}
        `}
      </div>

      <div id="previewContentArea"></div>
    </div>
  `;

  if (AUDIO_EXTS.includes(ext)) {
    setupRetroMediaPlayer('audio');
  } else if (VIDEO_EXTS.includes(ext)) {
    setupRetroMediaPlayer('video');
  }

  // Documents Office, Archives, Dossiers, Texte & Code en dessous des métadonnées
  try {
    const previewUrl = `${API_BASE}/api/fs/preview?path=${encodeURIComponent(item.path)}&show_hidden=${state.showHidden || false}`;
    const res = await fetch(previewUrl);
    const data = await res.json();
    const contentArea = document.getElementById('previewContentArea');
    if (!contentArea) return;

    if (res.ok && data) {
      if (data.type === 'directory' && Array.isArray(data.items)) {
        let dirHtml = `
          <div class="preview-meta-section-title" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;">
            <span>Contenu (${data.total_count} élément${data.total_count > 1 ? 's' : ''})</span>
          </div>
          <div class="preview-table-container" style="max-height:280px;overflow:auto;padding:0;border:1px solid var(--w11-border-subtle);border-radius:4px;">
            <table class="preview-table" style="width:100%;font-size:11.5px;border-collapse:collapse;">
              <thead>
                <tr style="background:var(--w11-surface-alt);position:sticky;top:0;z-index:1;">
                  <th style="text-align:left;padding:6px 8px;font-weight:600;border-bottom:1px solid var(--w11-border);color:var(--w11-text-primary);">Nom</th>
                  <th style="text-align:right;padding:6px 8px;font-weight:600;border-bottom:1px solid var(--w11-border);color:var(--w11-text-primary);width:70px;">Taille</th>
                  <th style="text-align:right;padding:6px 8px;font-weight:600;border-bottom:1px solid var(--w11-border);color:var(--w11-text-primary);width:100px;">Date</th>
                </tr>
              </thead>
              <tbody>
        `;
        if (data.items.length === 0) {
          dirHtml += `
            <tr>
              <td colspan="3" style="text-align:center;padding:12px;color:var(--w11-text-secondary);font-style:italic;">
                Ce dossier est vide
              </td>
            </tr>
          `;
        } else {
          data.items.forEach((subItem, idx) => {
            const icon = getFileIcon(subItem);
            dirHtml += `
              <tr class="folder-preview-row" data-idx="${idx}" style="border-bottom:1px solid var(--w11-border-subtle);color:var(--w11-text-primary);cursor:pointer;">
                <td style="padding:4px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;color:var(--w11-text-primary);" title="${escapeHtml(subItem.name)} (Clic droit pour options)">
                  <span class="preview-row-icon" style="margin-right:6px;display:inline-flex;vertical-align:middle;width:20px;height:20px;align-items:center;justify-content:center;">${icon}</span><span style="${subItem.is_dir ? 'font-weight:600;' : ''}">${escapeHtml(subItem.name)}</span>
                </td>
                <td style="text-align:right;padding:4px 8px;white-space:nowrap;color:var(--w11-text-secondary);font-size:11px;">
                  ${escapeHtml(subItem.size_formatted || '')}
                </td>
                <td style="text-align:right;padding:4px 8px;white-space:nowrap;color:var(--w11-text-secondary);font-size:10.5px;">
                  ${escapeHtml(subItem.modified_formatted || '')}
                </td>
              </tr>
            `;
          });
        }
        dirHtml += '</tbody></table></div>';
        if (data.is_truncated) {
          dirHtml += `<div style="font-size:11px;color:var(--w11-text-secondary);text-align:center;padding:4px;">... et ${data.total_count - data.items.length} autres éléments</div>`;
        }
        contentArea.innerHTML = dirHtml;

        const rows = contentArea.querySelectorAll('.folder-preview-row');
        rows.forEach(r => {
          const idx = parseInt(r.getAttribute('data-idx'), 10);
          const subItem = data.items[idx];
          if (!subItem) return;

          // Clic simple = sélection uniquement (pas d'ouverture)
          r.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            rows.forEach(other => {
              other.classList.remove('preview-row-selected');
              other.style.background = '';
              other.style.color = '';
            });
            r.classList.add('preview-row-selected');
            r.style.background = '#000080';
            r.style.color = '#ffffff';
            state.previewSelection = {
              type: 'folder',
              item: subItem,
              path: subItem.path
            };
            updateToolbarState();
          };

          // Double-clic = ouverture
          r.ondblclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (subItem.is_dir) navigateTo(subItem.path);
            else openItem(subItem.path);
          };

          r.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            rows.forEach(other => {
              other.classList.remove('preview-row-selected');
              other.style.background = '';
              other.style.color = '';
            });
            r.classList.add('preview-row-selected');
            r.style.background = '#000080';
            r.style.color = '#ffffff';
            state.previewSelection = {
              type: 'folder',
              item: subItem,
              path: subItem.path
            };
            updateToolbarState();
            openItemContextMenu(e, subItem, [subItem.path]);
          };
        });
      } else if (data.type === 'archive') {
        window._currentArchivePreview = {
          path: item.path,
          rawItems: data.raw_items || [],
          currentSubdir: '',
          is_truncated: !!data.is_truncated
        };
        renderArchivePreviewContent(contentArea, window._currentArchivePreview);
      } else if (data.type === 'docx' && data.content) {
        contentArea.innerHTML = `
          <div class="preview-meta-section-title" style="margin-top:14px;">Extrait du document</div>
          <div class="preview-text-container" style="white-space:pre-wrap;font-family:inherit;line-height:1.6;font-size:12.5px;max-height:260px;overflow-y:auto;">
            ${escapeHtml(data.content)}
          </div>
        `;
      } else if (data.type === 'xlsx' && data.rows && data.rows.length) {
        let tableHtml = '<div class="preview-meta-section-title" style="margin-top:14px;">Extrait de la feuille de calcul</div>';
        tableHtml += '<div class="preview-table-container" style="max-height:260px;overflow:auto;"><table class="preview-table"><tbody>';
        data.rows.forEach(row => {
          tableHtml += '<tr>';
          row.forEach(cell => {
            tableHtml += `<td>${escapeHtml(cell)}</td>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table></div>';
        contentArea.innerHTML = tableHtml;
      } else if (data.type === 'text' && data.content) {
        contentArea.innerHTML = `
          <div class="preview-meta-section-title" style="margin-top:14px;">Aperçu du texte</div>
          <pre class="preview-text-container" style="max-height:260px;overflow-y:auto;font-size:12px;">${escapeHtml(data.content)}</pre>
        `;
      }
    }
  } catch (err) {}
}

// ==============================================================================
// TERMINAL INTÉGRÉ DANS L'EXPLORATEUR (PARTAGE D'ESPACE ET SYNCHRONISATION)
// ==============================================================================
const terminalState = {
  isOpen: false,
  height: 240,
  cwd: '',
  term: null,
  fitAddon: null,
  socket: null,
  connected: false,
  exited: false,
  resizeObserver: null,
  pendingFit: null
};

// Couleurs xterm.js du thème Windows 98 (console MS-DOS).
function getXtermTheme(theme) {
  return {
    background: '#000000', foreground: '#c0c0c0', cursor: '#c0c0c0',
    cursorAccent: '#000000', selectionBackground: '#000080',
    black: '#000000', red: '#aa0000', green: '#00aa00', yellow: '#aa5500',
    blue: '#0000aa', magenta: '#aa00aa', cyan: '#00aaaa', white: '#aaaaaa',
    brightBlack: '#555555', brightRed: '#ff5555', brightGreen: '#55ff55',
    brightYellow: '#ffff55', brightBlue: '#5555ff', brightMagenta: '#ff55ff',
    brightCyan: '#55ffff', brightWhite: '#ffffff'
  };
}

function getTerminalFont(theme) {
  return "'Courier New', 'Consolas', monospace";
  return "'MesloLGS NF', 'SF Mono', Menlo, Monaco, 'Cascadia Code', 'Fira Code', 'Courier New', monospace";
}

function getTerminalWsUrl(cols, rows, cwd) {
  const isHttp = location.protocol === 'http:' || location.protocol === 'https:';
  const host = isHttp ? location.host : '127.0.0.1:8000';
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const params = new URLSearchParams({
    cols: String(cols || 80),
    rows: String(rows || 24),
    cwd: cwd || ''
  });
  return `${proto}//${host}/api/terminal/ws?${params.toString()}`;
}

function getCurrentExplorerPath() {
  const tab = getActiveTab();
  if (tab && tab.path && typeof tab.path === 'string' && tab.path.startsWith('/')) {
    return tab.path;
  }
  const inputVal = elements.pathInput?.value?.trim();
  if (inputVal && inputVal.startsWith('/')) {
    return inputVal;
  }
  return '/';
}

function ensureEmbeddedTerminal() {
  if (terminalState.term) return terminalState.term;
  if (!elements.terminalXterm || typeof Terminal === 'undefined') return null;

  const term = new Terminal({
    cursorBlink: true,
    cursorStyle: 'block',
    fontFamily: getTerminalFont(getCurrentTheme()),
    fontSize: 13,
    fontWeight: '400',
    fontWeightBold: '700',
    lineHeight: 1.15,
    scrollback: 10000,
    theme: getXtermTheme(getCurrentTheme()),
    macOptionIsMeta: false,
    convertEol: false
  });
  const fitAddon = (typeof FitAddon !== 'undefined' && FitAddon.FitAddon)
    ? new FitAddon.FitAddon()
    : null;
  if (fitAddon) term.loadAddon(fitAddon);
  term.open(elements.terminalXterm);
  terminalState.term = term;
  terminalState.fitAddon = fitAddon;

  // Toute frappe part vers le PTY réel (Ctrl+C, flèches, Tab, Ctrl+D… inclus).
  term.onData((data) => sendTerminalInput(data));
  term.onResize(({ cols, rows }) => sendTerminalResize(cols, rows));

  // Cmd+C copie la sélection ; Cmd+V est laissé au collage natif de xterm.js.
  term.attachCustomKeyEventHandler((event) => {
    if (event.type !== 'keydown') return true;
    if (event.metaKey && !event.ctrlKey && !event.altKey && (event.key === 'c' || event.key === 'C')) {
      if (term.hasSelection()) {
        const text = term.getSelection();
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(text).catch(() => {});
        } else {
          try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
          } catch (e) {}
        }
        term.clearSelection();
        return false;
      }
    }
    return true;
  });

  return term;
}

function sendTerminalInput(data) {
  const ws = terminalState.socket;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'input', data: String(data) }));
  }
}

function sendTerminalResize(cols, rows) {
  const ws = terminalState.socket;
  if (ws && ws.readyState === WebSocket.OPEN && cols > 0 && rows > 0) {
    ws.send(JSON.stringify({ type: 'resize', cols, rows }));
  }
}

function fitEmbeddedTerminal() {
  if (!terminalState.isOpen || !terminalState.fitAddon) return;
  if (terminalState.pendingFit) cancelAnimationFrame(terminalState.pendingFit);
  terminalState.pendingFit = requestAnimationFrame(() => {
    terminalState.pendingFit = null;
    try {
      terminalState.fitAddon.fit();
    } catch (e) {}
  });
}

function connectEmbeddedTerminal(cwd) {
  const term = ensureEmbeddedTerminal();
  if (!term) return;
  try { terminalState.fitAddon?.fit(); } catch (e) {}
  if (elements.terminalCwdText) {
    elements.terminalCwdText.textContent = `Terminal — ${cwd || terminalState.cwd}`;
  }

  const existing = terminalState.socket;
  if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
    sendTerminalResize(term.cols, term.rows);
    return;
  }

  if (terminalState.exited) {
    try { term.reset(); } catch (e) {}
    terminalState.exited = false;
  }

  let ws;
  try {
    ws = new WebSocket(getTerminalWsUrl(term.cols, term.rows, cwd));
  } catch (e) {
    term.write('\r\n\x1b[31mImpossible de démarrer le terminal.\x1b[0m\r\n');
    return;
  }
  ws.binaryType = 'arraybuffer';
  terminalState.socket = ws;

  ws.onopen = () => {
    terminalState.connected = true;
    sendTerminalResize(term.cols, term.rows);
  };
  ws.onmessage = (event) => {
    if (typeof event.data === 'string') {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'exit') terminalState.exited = true;
      } catch (e) {}
      return;
    }
    term.write(new Uint8Array(event.data));
  };
  ws.onclose = () => {
    terminalState.connected = false;
    terminalState.socket = null;
    terminalState.exited = true;
    if (terminalState.term) {
      terminalState.term.write('\r\n\x1b[90m[Session terminée — rouvrez le terminal pour en démarrer une nouvelle]\x1b[0m\r\n');
    }
  };
  ws.onerror = () => {};
}

function updateTerminalTheme(theme) {
  if (!terminalState.term) return;
  terminalState.term.options.theme = getXtermTheme(theme);
  terminalState.term.options.fontFamily = getTerminalFont(theme);
  fitEmbeddedTerminal();
}

function updateTerminalCwd(newPath) {
  terminalState.cwd = newPath || getCurrentExplorerPath() || '/';
  // Une fois le shell démarré, son répertoire courant lui appartient : on ne
  // réécrit plus l'en-tête à chaque navigation de l'explorateur.
  if (elements.terminalCwdText && !terminalState.term) {
    elements.terminalCwdText.textContent = `Terminal — ${terminalState.cwd}`;
  }
  // On ne force pas de « cd » dans un shell en cours d'exécution :
  // cela interromprait python3, nano, vim, etc. Le shell reste indépendant,
  // exactement comme Terminal.app.
}

function toggleTerminal(forceState) {
  const willOpen = (typeof forceState === 'boolean') ? forceState : !terminalState.isOpen;
  terminalState.isOpen = willOpen;
  if (elements.embeddedTerminalPane) {
    elements.embeddedTerminalPane.style.display = willOpen ? 'flex' : 'none';
    if (elements.terminalResizer) {
      elements.terminalResizer.style.display = willOpen ? 'block' : 'none';
    }
    if (willOpen) {
      elements.embeddedTerminalPane.style.height = `${terminalState.height}px`;
      const currentPath = getCurrentExplorerPath();
      updateTerminalCwd(currentPath);
      ensureEmbeddedTerminal();
      fitEmbeddedTerminal();
      connectEmbeddedTerminal(currentPath);
      setTimeout(() => {
        fitEmbeddedTerminal();
        terminalState.term?.focus();
      }, 60);
    }
  }
  if (elements.tbToggleTerminal) {
    elements.tbToggleTerminal.classList.toggle('active', terminalState.isOpen);
  }
}

function clearTerminalOutput() {
  if (terminalState.term) {
    terminalState.term.clear();
    terminalState.term.focus();
  }
}

function openExternalTerminal() {
  const cwd = getCurrentExplorerPath() || terminalState.cwd || '/';
  if (window.electronAPI?.openTerminalWindow) {
    window.electronAPI.openTerminalWindow({ cwd, theme: getCurrentTheme() });
    toggleTerminal(false);
  } else if (window.electronAPI?.openExternalTerminal) {
    window.electronAPI.openExternalTerminal(cwd);
  }
}

function initTerminalResizer() {
  if (!elements.terminalResizer || !elements.embeddedTerminalPane) return;
  let isResizing = false;
  let startY = 0;
  let startHeight = 240;

  elements.terminalResizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    startY = e.clientY;
    startHeight = elements.embeddedTerminalPane.offsetHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const dy = startY - e.clientY;
    const newHeight = Math.max(120, Math.min(window.innerHeight - 150, startHeight + dy));
    terminalState.height = newHeight;
    elements.embeddedTerminalPane.style.height = `${newHeight}px`;
    fitEmbeddedTerminal();
  });

  window.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      fitEmbeddedTerminal();
    }
  });

  if (typeof ResizeObserver !== 'undefined' && elements.terminalBody) {
    terminalState.resizeObserver = new ResizeObserver(() => fitEmbeddedTerminal());
    terminalState.resizeObserver.observe(elements.terminalBody);
  }
  window.addEventListener('resize', () => fitEmbeddedTerminal());
}

// ===================== COURBE DE VITESSE & TRANSFERTS =====================
// Polling à 30ms pour la fluidité, vitesse affichée rafraîchie toutes les 300ms
// La courbe se forme du début (0%) à la fin (100%) au fur et à mesure comme sur Windows 10/11
// Lissage de la courbe de débit : moyenne mobile centrée (le backend fournit déjà
// une vitesse moyennée sur 5 s ; ce lissage supprime les derniers à-coups visuels).
function smoothSpeedHistory(history, radius = 4) {
  if (!Array.isArray(history) || history.length < 3) return history || [];
  const val = (p) => (typeof p === 'object' && p !== null) ? (Number(p.speed) || 0) : (Number(p) || 0);
  const raw = history.map(val);
  return history.map((p, i) => {
    const a = Math.max(0, i - radius);
    const b = Math.min(raw.length - 1, i + radius);
    let sum = 0;
    for (let k = a; k <= b; k++) sum += raw[k];
    const avg = sum / (b - a + 1);
    return (typeof p === 'object' && p !== null) ? { ...p, speed: avg } : avg;
  });
}

function drawSpeedGraph(history, currentPercent = 0) {
  history = smoothSpeedHistory(history);
  const canvas = elements.speedCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  // Écran CRT noir pur d'époque (Task Manager Windows 95/98)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  // Grille phosphore verte foncée
  ctx.strokeStyle = '#003600';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }

  // Ligne d'arrivée verticale phosphore
  ctx.strokeStyle = '#008000';
  ctx.beginPath();
  ctx.moveTo(w - 1, 0);
  ctx.lineTo(w - 1, h);
  ctx.stroke();

  if (!history || history.length === 0) return;

  const speeds = history.map(item => (typeof item === 'object' && item !== null) ? item.speed : item);
  const maxVal = Math.max(12, ...speeds) * 1.25;

  // L'avancement progresse de 0% à 100% sur la largeur W
  const progressPct = Math.max(0, Math.min(100, currentPercent));
  const currentProgressX = (progressPct / 100) * w;

  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, 'rgba(16, 124, 65, 0.40)');
  gradient.addColorStop(1, 'rgba(16, 124, 65, 0.02)');

  ctx.beginPath();
  ctx.moveTo(0, h);

  let lastX = 0;
  let lastY = h;

  history.forEach((pt, i) => {
    let pctVal = 0;
    let spdVal = 0;
    if (typeof pt === 'object' && pt !== null && pt.pct !== undefined) {
      pctVal = pt.pct;
      spdVal = pt.speed;
    } else {
      pctVal = (i / Math.max(1, history.length - 1)) * progressPct;
      spdVal = typeof pt === 'number' ? pt : 0;
    }

    const x = (Math.min(pctVal, 100) / 100) * w;
    const clampedX = Math.min(x, currentProgressX);
    const y = h - (spdVal / maxVal) * (h - 8);

    ctx.lineTo(clampedX, y);
    lastX = clampedX;
    lastY = y;
  });

  // Clôturer la surface au point courant d'avancement
  ctx.lineTo(lastX, h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 255, 65, 0.15)';
  ctx.fill();

  // Traçage de la ligne de vitesse
  ctx.beginPath();
  history.forEach((pt, i) => {
    let pctVal = 0;
    let spdVal = 0;
    if (typeof pt === 'object' && pt !== null && pt.pct !== undefined) {
      pctVal = pt.pct;
      spdVal = pt.speed;
    } else {
      pctVal = (i / Math.max(1, history.length - 1)) * progressPct;
      spdVal = typeof pt === 'number' ? pt : 0;
    }

    const x = (Math.min(pctVal, 100) / 100) * w;
    const clampedX = Math.min(x, currentProgressX);
    const y = h - (spdVal / maxVal) * (h - 8);

    if (i === 0) ctx.moveTo(clampedX, y);
    else ctx.lineTo(clampedX, y);
  });

  ctx.strokeStyle = '#00ff41';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Tête de progression CRT rétro (point carré phosphoreux)
  if (lastX > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(lastX - 2, lastY - 2, 4, 4);
  }
}

// ================== ANIMATION DE TRANSFERT PIXEL-ART WINDOWS 98 ==================
let win98AnimId = null;
let win98AnimStart = null;

let win98FlyingAnim = null;

function startWin98CopyAnimation() {
  const canvas = document.getElementById('win98CopyCanvas');
  if (!canvas || !window.FlyingDocAnimation) return;
  stopWin98CopyAnimation();
  win98FlyingAnim = window.FlyingDocAnimation.create(canvas);
  win98FlyingAnim.start();
}

function stopWin98CopyAnimation() {
  if (win98FlyingAnim) {
    win98FlyingAnim.stop();
    win98FlyingAnim = null;
  }
  if (win98AnimId) {
    cancelAnimationFrame(win98AnimId);
    win98AnimId = null;
  }
}

function showExternalTransferDialog(filePaths, isCopy = false) {
  if (!filePaths || filePaths.length === 0) return;
  const actionLabel = isCopy ? 'Copie' : 'Déplacement';
  elements.transferTitle.textContent = `${actionLabel} en cours...`;
  elements.transferDialog.style.display = 'flex';
  elements.transferProgressFill.style.width = '0%';
  elements.transferSpeedBadge.textContent = 'Transfert...';
  elements.transferEtaText.textContent = 'En cours...';
  elements.transferCancelBtn.textContent = 'Fermer';

  startWin98CopyAnimation();

  const names = filePaths.map(p => p.split(/[\\/]/).pop()).filter(Boolean);
  const srcDir = filePaths[0] ? filePaths[0].substring(0, Math.max(filePaths[0].lastIndexOf('\\'), filePaths[0].lastIndexOf('/'))) : '';
  const dirInfo = document.getElementById('transferDirInfo');

  if (names.length > 1) {
    elements.transferFileInfo.textContent = `${actionLabel} de ${names.length} éléments (${names[0]}...)...`;
  } else {
    elements.transferFileInfo.textContent = `${actionLabel} de ${names[0] || 'fichiers'}...`;
  }

  if (dirInfo) {
    dirInfo.textContent = `De '${srcDir}' vers 'Explorateur Windows'`;
    dirInfo.style.display = 'block';
  }

  let pct = 0;
  const speedHistory = [{"pct": 0, "speed": 0.0}];
  if (state.transferPollInterval) clearInterval(state.transferPollInterval);

  state.transferPollInterval = setInterval(() => {
    pct = Math.min(100, pct + 20);
    elements.transferProgressFill.style.width = `${pct}%`;
    const simSpeed = 48 + Math.random() * 25;
    elements.transferSpeedBadge.textContent = `${simSpeed.toFixed(1)} Mo/s`;
    elements.transferEtaText.textContent = pct < 100 ? `${pct}% complété` : 'Terminé';
    speedHistory.push({"pct": pct, "speed": Math.round(simSpeed * 10) / 10});
    drawSpeedGraph(speedHistory, pct);

    if (pct >= 100) {
      clearInterval(state.transferPollInterval);
      state.transferPollInterval = null;
      elements.transferTitle.textContent = `${actionLabel} terminée !`;
      elements.transferSpeedBadge.textContent = 'Terminé';
      elements.transferEtaText.textContent = 'Opération terminée avec succès.';
      drawSpeedGraph(speedHistory, 100);
      showToast(`${actionLabel} vers l'Explorateur Windows effectuée !`, 'success');
      setTimeout(() => {
        if (elements.transferDialog) {
          elements.transferDialog.style.display = 'none';
          stopWin98CopyAnimation();
        }
      }, 1100);
    }
  }, 100);
}

function startTransferTracking(taskId, actionLabel, opts = {}) {
  if (window.electronAPI?.openTransferWindow) {
    window.electronAPI.openTransferWindow({
      taskId,
      label: actionLabel,
      theme: state.theme
    });
    return;
  }

  state.activeTransferTaskId = taskId;
  const transferStartTime = Date.now();
  elements.transferTitle.textContent = `${actionLabel} en cours...`;
  elements.transferDialog.style.display = 'flex';
  elements.transferProgressFill.style.width = '0%';
  elements.transferSpeedBadge.textContent = '0.00 Mo/s';
  elements.transferEtaText.textContent = 'Calcul du temps restant...';
  elements.transferCancelBtn.textContent = 'Annuler';

  startWin98CopyAnimation();

  const dirInfo = document.getElementById('transferDirInfo');
  const actionPrefix = actionLabel.startsWith('Copie') ? 'Copie de' : (actionLabel.startsWith('Dép') ? 'Déplacement de' : actionLabel);

  if (opts.sources && opts.sources.length > 0) {
    const firstName = opts.sources[0].split(/[\\/]/).pop() || '';
    const srcDir = opts.sources[0].substring(0, Math.max(opts.sources[0].lastIndexOf('\\'), opts.sources[0].lastIndexOf('/'))) || '';
    const dstDir = opts.destination_dir || '';

    if (opts.sources.length > 1) {
      elements.transferFileInfo.textContent = `${actionPrefix} ${opts.sources.length} éléments (${firstName}...)...`;
    } else {
      elements.transferFileInfo.textContent = `${actionPrefix} ${firstName}...`;
    }

    if (dirInfo) {
      dirInfo.textContent = `De '${srcDir}' vers '${dstDir}'`;
      dirInfo.style.display = 'block';
    }
  } else {
    elements.transferFileInfo.textContent = `${actionPrefix} en cours...`;
    if (dirInfo) dirInfo.style.display = 'none';
  }

  if (state.transferPollInterval) clearInterval(state.transferPollInterval);

  let lastSpeedBadgeUpdate = 0;
  let inFlight = false;
  let isFinished = false;

  // Polling régulier avec protection contre les requêtes simultanées
  state.transferPollInterval = setInterval(async () => {
    if (inFlight || isFinished) return;
    inFlight = true;

    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) { inFlight = false; return; }
      const data = await res.json();
      if (isFinished) { inFlight = false; return; }

      // Indication du nombre de fichiers restants et du fichier en cours
      const totalF = data.total_files || 0;
      const doneF = data.processed_files || 0;
      const remainF = Math.max(0, totalF - doneF);

      if (totalF > 1) {
        elements.transferFileInfo.textContent = `${actionPrefix} ${remainF} fichier(s) restant(s) (${doneF}/${totalF}) - ${data.current_file || ''}`;
      } else if (data.current_file) {
        elements.transferFileInfo.textContent = `${actionPrefix} ${data.current_file}...`;
      }

      elements.transferProgressFill.style.width = `${data.percent}%`;

      // Actualisation du texte de vitesse toutes les 300 ms
      const now = Date.now();
      if (now - lastSpeedBadgeUpdate >= 300) {
        elements.transferSpeedBadge.textContent = `${data.speed_mb_sec.toFixed(2)} Mo/s`;
        lastSpeedBadgeUpdate = now;
      }

      if (data.eta_seconds !== null && data.eta_seconds > 0) {
        elements.transferEtaText.textContent = `Environ ${data.eta_seconds}s restante(s) (${data.percent}%)`;
      } else {
        elements.transferEtaText.textContent = `${data.percent}% complété`;
      }

      const filesBadgeEl = document.getElementById('transferFilesBadge');
      const sizesBadgeEl = document.getElementById('transferSizesBadge');

      if (filesBadgeEl && data.total_files > 0) {
        const proc = data.processed_files || 0;
        const tot = data.total_files;
        if (data.task_type === 'compress') {
          filesBadgeEl.textContent = `📁 ${proc} / ${tot} fichier${tot > 1 ? 's' : ''}`;
        } else if (data.task_type === 'extract') {
          filesBadgeEl.textContent = `📦 ${proc} / ${tot} fichier${tot > 1 ? 's' : ''}`;
        } else {
          filesBadgeEl.textContent = `${proc} / ${tot} fichier${tot > 1 ? 's' : ''}`;
        }
      }

      if (sizesBadgeEl) {
        if (data.task_type === 'compress') {
          const comp = formatSize(data.compressed_bytes || 0);
          const orig = formatSize(data.total_bytes || data.processed_bytes || 0);
          let gain = '';
          if (data.processed_bytes > 0 && data.compressed_bytes > 0 && data.compressed_bytes < data.processed_bytes) {
            const r = Math.round((1 - (data.compressed_bytes / data.processed_bytes)) * 100);
            gain = ` (-${r}%)`;
          }
          sizesBadgeEl.textContent = `Compressé : ${comp} / ${orig}${gain}`;
        } else if (data.task_type === 'extract') {
          const ext = formatSize(data.processed_bytes || 0);
          const tot = formatSize(data.total_bytes || 0);
          const arch = data.compressed_bytes ? ` (Archive : ${formatSize(data.compressed_bytes)})` : '';
          sizesBadgeEl.textContent = `Extrait : ${ext} / ${tot}${arch}`;
        } else if (data.total_bytes > 0) {
          sizesBadgeEl.textContent = `${formatSize(data.processed_bytes || 0)} / ${formatSize(data.total_bytes)}`;
        }
      }

      // La courbe reçoit la progression courante pour s'étirer du début à la fin
      drawSpeedGraph(data.speed_history, data.percent);

      // Fin du transfert : notification et maintien minimum (900ms - 1200ms) pour admirer l'animation
      if (data.status === 'completed') {
        isFinished = true;
        clearInterval(state.transferPollInterval);
        state.transferPollInterval = null;

        const elapsed = Date.now() - transferStartTime;
        const minDisplayTime = 1100; // minimum 900ms à 1200ms
        const delay = Math.max(0, minDisplayTime - elapsed);

        setTimeout(() => {
          elements.transferTitle.textContent = `${actionLabel} terminée !`;
          elements.transferProgressFill.style.width = '100%';
          elements.transferSpeedBadge.textContent = 'Terminé';
          elements.transferEtaText.textContent = 'Opération terminée avec succès.';
          elements.transferCancelBtn.textContent = 'Fermer';
          drawSpeedGraph(data.speed_history, 100);
          showToast(`${actionLabel} terminée avec succès !`, 'success');
          refresh(); // Rafraîchit immédiatement l'explorateur après la copie
          if (window.electronAPI?.refreshAllWindows) {
            window.electronAPI.refreshAllWindows();
          }

          // Disparaît automatiquement après la fin
          setTimeout(() => {
            if (elements.transferDialog && state.activeTransferTaskId === taskId) {
              elements.transferDialog.style.display = 'none';
              stopWin98CopyAnimation();
            }
          }, 1100);
        }, delay);
      } else if (data.status === 'error') {
        isFinished = true;
        clearInterval(state.transferPollInterval);
        state.transferPollInterval = null;
        elements.transferTitle.textContent = `Erreur de transfert`;
        elements.transferCancelBtn.textContent = 'Fermer';
        showToast(data.error_message || 'Erreur lors du transfert', 'error');
        stopWin98CopyAnimation();
        refresh();
      } else if (data.status === 'cancelled') {
        isFinished = true;
        clearInterval(state.transferPollInterval);
        state.transferPollInterval = null;
        elements.transferTitle.textContent = `Transfert annulé`;
        elements.transferCancelBtn.textContent = 'Fermer';
        showToast('Opération annulée', 'info');
        stopWin98CopyAnimation();
        refresh();
      }
    } catch (e) {
      // Ignore
    } finally {
      inFlight = false;
    }
  }, 40);
}

// Fonction rendant la fenêtre de transfert déplaçable sur l'écran
function makeTransferDialogDraggable() {
  const dialog = elements.transferDialog;
  if (!dialog) return;
  const header = dialog.querySelector('.transfer-header');
  if (!header) return;

  let isDragging = false;
  let startX = 0, startY = 0;
  let origX = 0, origY = 0;

  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('#transferCloseBtn')) return;
    isDragging = true;

    const rect = dialog.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    origX = rect.left;
    origY = rect.top;

    dialog.style.bottom = 'auto';
    dialog.style.right = 'auto';
    dialog.style.left = `${origX}px`;
    dialog.style.top = `${origY}px`;
    dialog.style.margin = '0';
    dialog.style.transform = 'none';

    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newX = origX + dx;
    let newY = origY + dy;

    const maxW = window.innerWidth - dialog.offsetWidth - 10;
    const maxH = window.innerHeight - dialog.offsetHeight - 10;
    newX = Math.max(10, Math.min(maxW, newX));
    newY = Math.max(10, Math.min(maxH, newY));

    dialog.style.left = `${newX}px`;
    dialog.style.top = `${newY}px`;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

elements.transferCloseBtn.onclick = () => {
  elements.transferDialog.style.display = 'none';
  stopWin98CopyAnimation();
};

elements.transferCancelBtn.onclick = async () => {
  if (elements.transferCancelBtn.textContent === 'Fermer') {
    elements.transferDialog.style.display = 'none';
    stopWin98CopyAnimation();
  } else if (state.activeTransferTaskId) {
    await fetch(`/api/tasks/${state.activeTransferTaskId}/cancel`, { method: 'POST' });
  }
};

async function getDroppedPaths(e) {
  const api = window.api || window.electronAPI;
  let sourcePaths = [];

  // Priorité 1 : Fichiers externes déposés depuis le vrai Explorateur Windows ou Bureau
  if (e?.dataTransfer) {
    const rawFiles = [];
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        rawFiles.push(e.dataTransfer.files[i]);
      }
    }
    if (rawFiles.length === 0 && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const it = e.dataTransfer.items[i];
        if (it && it.kind === 'file') {
          const f = it.getAsFile ? it.getAsFile() : null;
          if (f) rawFiles.push(f);
        }
      }
    }

    if (rawFiles.length > 0) {
      for (const f of rawFiles) {
        let p = '';
        try {
          if (api?.getFilePath) p = api.getFilePath(f);
        } catch (err) {}
        if (!p) {
          try {
            if (api?.getPathForFile) p = api.getPathForFile(f);
          } catch (err) {}
        }
        if (!p && f && f.path) {
          p = f.path;
        }
        if (p && typeof p === 'string') {
          sourcePaths.push(p);
        }
      }
      if (sourcePaths.length > 0) {
        return sourcePaths;
      }
    }
  }

  // Priorité 2 : Fichiers déposés depuis une autre fenêtre Explorer 2 via Main Process
  if (api?.getInternalDrag) {
    try {
      const internalDrag = await api.getInternalDrag();
      if (internalDrag && Array.isArray(internalDrag.paths) && internalDrag.paths.length > 0 && (Date.now() - (internalDrag.timestamp || 0) < 60000)) {
        sourcePaths = [...internalDrag.paths];
        return sourcePaths;
      }
    } catch (err) {}
  } else if (api?.getDragFiles) {
    try {
      const shared = await api.getDragFiles();
      if (Array.isArray(shared) && shared.length > 0) {
        sourcePaths = [...shared];
        return sourcePaths;
      }
    } catch (err) {}
  }

  // Priorité 3 : Fallback JSON dans dataTransfer
  if (e?.dataTransfer) {
    try {
      const text = e.dataTransfer.getData('text/plain') ||
                   e.dataTransfer.getData('application/x-explorer-files') ||
                   e.dataTransfer.getData('application/json');
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {}
  }

  return sourcePaths;
}

function filterSafeTransferSources(sources, destinationDir, action = 'move') {
  if (!Array.isArray(sources) || sources.length === 0 || !destinationDir) return [];
  const cleanDest = destinationDir.replace(/[\\/]+$/, '').toLowerCase();
  const valid = [];

  for (const src of sources) {
    if (!src || typeof src !== 'string') continue;
    const cleanSrc = src.replace(/[\\/]+$/, '').toLowerCase();

    // 1. Refus strict : Déplacer ou copier sur soi-même -> Ne rien faire
    if (cleanSrc === cleanDest) {
      continue;
    }

    // 2. Refus strict : Déplacer ou copier un dossier dans un de ses propres sous-dossiers -> Ne rien faire
    if (cleanDest.startsWith(cleanSrc + '\\') || cleanDest.startsWith(cleanSrc + '/')) {
      continue;
    }

    // 3. Si c'est un déplacement et que l'élément est déjà présent dans le dossier cible -> Ne rien faire
    if (action === 'move') {
      const srcParent = cleanSrc.replace(/[\\/][^\\/]+$/, '');
      if (srcParent === cleanDest) {
        continue;
      }
    }

    valid.push(src);
  }

  return valid;
}

async function handleFileDrop(e, destinationDir) {
  e.preventDefault();
  e.stopPropagation();

  // 1. Signaler immédiatement que le drop a été effectué et pris en charge à l'intérieur d'Explorer 2
  window._dropHandledInternally = true;
  const api = window.api || window.electronAPI;
  if (api?.markDropHandled) {
    api.markDropHandled();
  }

  if (!destinationDir) return;

  const sourcePaths = await getDroppedPaths(e);
  if (!Array.isArray(sourcePaths) || sourcePaths.length === 0) return;

  const isCopy = !!e.ctrlKey;
  const action = isCopy ? 'copy' : 'move';

  const validSourcePaths = filterSafeTransferSources(sourcePaths, destinationDir, action);
  if (validSourcePaths.length === 0) {
    // Si déplacé sur lui-même ou dans le même dossier : ne rien faire du tout
    document.querySelectorAll('.file-row').forEach(r => r.classList.remove('dragging', 'drop-target'));
    document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('drop-target', 'drag-over-top', 'drag-over-bottom'));
    document.querySelectorAll('.breadcrumb-segment').forEach(b => b.classList.remove('drop-target'));
    document.querySelectorAll('.drive-card').forEach(d => d.classList.remove('drop-target'));
    if (api?.clearDragFiles) {
      api.clearDragFiles();
    }
    return;
  }

  // 2. Nettoyer le payload de drag interne
  if (api?.clearDragFiles) {
    api.clearDragFiles();
  }

  // 3. Lancer le transfert avec affichage de la boîte de dialogue et de la courbe de vitesse en temps réel
  await executeTransfer(validSourcePaths, destinationDir, action);

  // Nettoyage visuel de drag
  document.querySelectorAll('.file-row').forEach(r => r.classList.remove('dragging', 'drop-target'));
  document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('drop-target', 'drag-over-top', 'drag-over-bottom'));
  document.querySelectorAll('.breadcrumb-segment').forEach(b => b.classList.remove('drop-target'));
  document.querySelectorAll('.drive-card').forEach(d => d.classList.remove('drop-target'));
}

async function executeTransfer(sources, destination_dir, action = 'copy') {
  if (!sources || !Array.isArray(sources) || sources.length === 0 || !destination_dir) return;

  const validSources = filterSafeTransferSources(sources, destination_dir, action);
  if (validSources.length === 0) return;

  try {
    const res = await fetch('/api/fs/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: action,
        sources: validSources,
        destination_dir: destination_dir,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `Erreur lors de l'opération ${action}`);
    const label = action === 'copy' ? 'Copie' : 'Déplacement';
    startTransferTracking(data.task_id, label, { sources: validSources, destination_dir: destination_dir });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function executeTransferMove(sources, destination_dir) {
  return executeTransfer(sources, destination_dir, 'move');
}

async function triggerCopy(customPaths = null) {
  const tab = getActiveTab();
  const isFromPreview = !customPaths && !!state.previewSelection;

  if (isFromPreview && state.previewSelection.type === 'archive') {
    try {
      const { archivePath, file } = state.previewSelection;
      const tempPath = await stageArchiveMemberToTemp(archivePath, file);
      const clipData = { action: 'copy', paths: [tempPath] };
      state.clipboard = clipData;
      if (window.electronAPI?.setClipboard) {
        window.electronAPI.setClipboard(clipData);
      }
      updateToolbarState();
      showToast(`« ${file.name} » prêt à être collé`, 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
    return;
  }

  const paths = customPaths
    ? customPaths
    : (isFromPreview && state.previewSelection.path
        ? [state.previewSelection.path]
        : (tab ? tab.selectedPaths : []));
  if (!paths || paths.length === 0) return;
  state.clipboard = { action: 'copy', paths: [...paths] };
  if (window.electronAPI?.setClipboard) {
    window.electronAPI.setClipboard(state.clipboard);
  }
  showToast(`${paths.length} élément(s) copié(s)`, 'info');
  updateToolbarState();
  if (!isFromPreview && !customPaths) {
    renderFolder();
  }
}

async function triggerCut(customPaths = null) {
  const tab = getActiveTab();
  const isFromPreview = !customPaths && !!state.previewSelection;

  if (isFromPreview && state.previewSelection.type === 'archive') {
    try {
      const { archivePath, file } = state.previewSelection;
      const tempPath = await stageArchiveMemberToTemp(archivePath, file);
      const clipData = { action: 'copy', paths: [tempPath] };
      state.clipboard = clipData;
      if (window.electronAPI?.setClipboard) {
        window.electronAPI.setClipboard(clipData);
      }
      updateToolbarState();
      showToast(`« ${file.name} » prêt à être collé`, 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
    return;
  }

  const paths = customPaths
    ? customPaths
    : (isFromPreview && state.previewSelection.path
        ? [state.previewSelection.path]
        : (tab ? tab.selectedPaths : []));
  if (!paths || paths.length === 0) return;
  state.clipboard = { action: 'cut', paths: [...paths] };
  if (window.electronAPI?.setClipboard) {
    window.electronAPI.setClipboard(state.clipboard);
  }
  showToast(`${paths.length} élément(s) coupé(s)`, 'info');
  updateToolbarState();
  if (!isFromPreview && !customPaths) {
    renderFolder();
  }
}

async function triggerPaste(targetDirectory = null) {
  if (!state.clipboard && window.electronAPI?.getClipboard) {
    try {
      state.clipboard = await window.electronAPI.getClipboard();
    } catch (e) {}
  }
  const tab = getActiveTab();
  const destPath = targetDirectory || (tab ? tab.path : null);
  if (!state.clipboard || !destPath) return;

  try {
    const action = state.clipboard.action === 'cut' ? 'move' : 'copy';
    const validSources = filterSafeTransferSources(state.clipboard.paths, destPath, action);
    if (validSources.length === 0) return;

    const res = await fetch('/api/fs/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: action,
        sources: validSources,
        destination_dir: destPath,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Erreur de collage');

    const label = action === 'copy' ? 'Copie' : 'Déplacement';
    startTransferTracking(data.task_id, label, { sources: validSources, destination_dir: destPath });

    if (state.clipboard.action === 'cut') {
      state.clipboard = null;
      if (window.electronAPI?.setClipboard) {
        window.electronAPI.setClipboard(null);
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function triggerDelete(customPaths = null) {
  const tab = getActiveTab();
  const isFromPreview = !customPaths && !!state.previewSelection;

  if (isFromPreview && state.previewSelection.type === 'archive') {
    const { archivePath, file, archiveState, contentArea } = state.previewSelection;
    if (!archivePath.toLowerCase().endsWith('.zip')) {
      showToast('La suppression interne est supportée uniquement pour les archives .zip', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/fs/archive/delete-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archive_path: archivePath,
          member_path: file.path,
          is_dir: !!file.is_dir
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur de suppression');
      state.previewSelection = null;
      archiveState.rawItems = data.raw_items || [];
      renderArchivePreviewContent(contentArea, archiveState);
      updateToolbarState();
      showToast(`« ${file.name} » supprimé de l'archive`, 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
    return;
  }

  const paths = customPaths
    ? customPaths
    : (isFromPreview && state.previewSelection.path
        ? [state.previewSelection.path]
        : (tab ? tab.selectedPaths : []));
  if (!paths || paths.length === 0) return;
  const pathsToDelete = [...paths];

  try {
    const res = await fetch('/api/fs/trash_task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: pathsToDelete }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Erreur de suppression');

    startTransferTracking(data.task_id, 'Suppression');
    deselectAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===================== MODÉLISATION 16-BITS WINDOWS 95/98 (PIXEL-ART) =====================
function getDiskModelType(d) {
  const rawType = (d.model_type_3d || d.drive_type || '').toLowerCase();
  const media = (d.media_type || '').toLowerCase();
  if (rawType === 'usb_key' || d.removable_media === true || media.includes('clé usb') || media.includes('cle usb')) return 'usb_key';
  if (rawType === 'usb_hdd' || media.includes('mécanique externe')) return 'usb_hdd';
  if (rawType === 'usb_ssd' || media.includes('ssd externe')) return 'usb_ssd';
  const model = (rawType + ' ' + media + ' ' + (d.bus_type || '') + ' ' + (d.name || '')).toLowerCase();
  if (model.includes('usb') || model.includes('remov') || model.includes('externe') || model.includes('external')) return 'usb_ssd';
  if (model.includes('nvme') || model.includes('m.2') || model.includes('pci')) return 'nvme';
  if (model.includes('raid')) return 'raid';
  if (model.includes('hdd') || model.includes('hard') || model.includes('méc') || model.includes('rotat')) return 'hdd';
  return 'ssd';
}

function renderDiskPixelArt(container, d) {
  if (!container) return;
  const modelType = getDiskModelType(d);
  const busLabel = (d.bus_type || 'PCI/NVMe').toUpperCase();
  const mediaLabel = (d.media_type || 'Disque SSD').toUpperCase();
  const driveLetter = d.drive_letters ? ` [${d.drive_letters}]` : '';

  let artHtml = '';
  let badgeTitle = 'Lecteur NVMe M.2';

  if (modelType === 'nvme') {
    badgeTitle = `Lecteur NVMe M.2${driveLetter}`;
    artHtml = `
      <img src="static/icons/win98/nvme.png" alt="Lecteur NVMe" class="win98-pixel-disk-img">
    `;
  } else if (modelType === 'usb_key') {
    badgeTitle = `Clé USB${driveLetter}`;
    artHtml = `
      <img src="static/icons/win98/usb_key_detail.png" alt="Clé USB" class="win98-pixel-disk-img">
    `;
  } else if (modelType === 'usb_hdd') {
    badgeTitle = `Disque dur mécanique externe${driveLetter}`;
    artHtml = `
      <img src="static/icons/win98/drive.png" alt="Disque dur mécanique externe" class="win98-pixel-disk-img">
    `;
  } else if (modelType === 'usb_ssd' || modelType === 'usb') {
    badgeTitle = `SSD externe${driveLetter}`;
    artHtml = `
      <img src="static/icons/win98/usb.png" alt="SSD externe" class="win98-pixel-disk-img">
    `;
  } else if (modelType === 'hdd') {
    badgeTitle = `Disque Dur C:${driveLetter}`;
    artHtml = `
      <img src="static/icons/win98/drive.png" alt="Disque Dur C:" class="win98-pixel-disk-img">
    `;
  } else if (modelType === 'raid') {
    badgeTitle = `Grappe RAID Matérielle${driveLetter}`;
    artHtml = `
      <img src="static/icons/win98/disk.png" alt="Disque Dur (SSD)" class="win98-pixel-disk-img">
    `;
  } else {
    // SATA SSD 2.5 Pouces / Standard SSD
    badgeTitle = `Disque Dur (SSD)${driveLetter}`;
    artHtml = `
      <img src="static/icons/win98/disk.png" alt="Disque Dur (SSD)" class="win98-pixel-disk-img">
    `;
  }

  container.innerHTML = `
    <div class="win98-disk-pixel-wrap">
      <div class="win98-disk-banner">
        <div class="win98-disk-banner-title">
          <span>🖴</span>
          <span>${escapeHtml(badgeTitle)}</span>
        </div>
        <div class="win98-disk-banner-type">${escapeHtml(busLabel)}</div>
      </div>
      <div class="win98-disk-art-container">
        ${artHtml}
      </div>
      <div class="win98-disk-bottom-bar">
        <span class="win98-disk-led"></span>
        <span>I/O BUS ACTIF • ${escapeHtml(d.name || mediaLabel)} • ${escapeHtml(d.size_formatted || '')}</span>
      </div>
    </div>
  `;
}

// ===================== S.M.A.R.T. VIEW =====================
async function loadSmartDisks() {
  elements.smartGrid.innerHTML = `<div class="state-container">Lecture des sondes matérielles et génération 3D...</div>`;
  try {
    const res = await fetch('/api/smart/disks');
    if (!res.ok) throw new Error('Impossible de lire les diagnostics S.M.A.R.T.');
    const disks = await res.json();
    renderSmartDisks(disks);
  } catch (err) {
    elements.smartGrid.innerHTML = `<div class="state-container">Erreur : ${escapeHtml(err.message)}</div>`;
  }
}

function renderSmartDisks(disks) {
  if (!disks || disks.length === 0) {
    elements.smartGrid.innerHTML = `<div class="state-container">Aucun disque détecté.</div>`;
    return;
  }

  elements.smartGrid.innerHTML = '';
  disks.forEach((d, idx) => {
    const card = document.createElement('div');
    card.className = 'smart-card';
    const isGood = d.health_percent >= 80;
    const isWarn = d.health_percent >= 50 && d.health_percent < 80;
    const badgeClass = isGood ? '' : (isWarn ? 'warning' : 'danger');

    // Lettre / Nom du lecteur en gros
    const badgeText = d.volume_name || (d.drive_letters ? d.drive_letters.split(' (')[0] : '');
    const mountPath = d.mount_point || (d.drive_letters && d.drive_letters.includes('(') ? d.drive_letters.split('(')[1].replace(')', '') : '');
    const letterHtml = badgeText
      ? `<div class="big-drive-badge" title="${escapeHtml(mountPath ? `${badgeText} (${mountPath})` : badgeText)}">${escapeHtml(badgeText)}</div>`
      : `<div class="big-drive-badge empty">Sans nom</div>`;

    card.innerHTML = `
      <div class="disk-canvas-3d" id="canvas3d_${idx}"></div>

      <div class="smart-top-row">
        <div style="display:flex;align-items:center;gap:14px;min-width:0;flex:1;">
          <div class="smart-health-badge ${badgeClass}">
            <span class="health-status-text">${escapeHtml(d.status_label)}</span>
            <span class="health-percent-text">${d.health_percent}%</span>
          </div>
          <div class="smart-disk-details" style="min-width:0;overflow:hidden;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
              <span class="smart-disk-model" style="margin-bottom:0;">${escapeHtml(d.name)}</span>
              <span class="smart-disk-capacity-badge" title="Capacité totale du support">${escapeHtml(d.size_formatted)}</span>
            </div>
            <div class="smart-disk-meta">
              <span>Type : <strong>${escapeHtml(d.media_type)}</strong> (${escapeHtml(d.bus_type)})</span>
            </div>
          </div>
        </div>
        ${letterHtml}
      </div>

      <div class="smart-body-metrics">
        <div class="smart-row" style="background:#d4d0c8;padding:4px 8px;border-top:1px solid #808080;border-left:1px solid #808080;border-right:1px solid #ffffff;border-bottom:1px solid #ffffff;box-shadow:inset 1px 1px 0 #000;margin-bottom:8px;">
          <span class="smart-label" style="font-weight:bold;color:#000080;font-size:12px;">Capacité totale :</span>
          <span class="smart-val" style="font-weight:bold;font-size:14px;color:#000080;font-family:monospace;">${escapeHtml(d.size_formatted)}</span>
        </div>
        ${mountPath ? `
          <div class="smart-row">
            <span class="smart-label">Point de montage :</span>
            <span class="smart-val highlight" style="word-break:break-all;text-align:right;" title="${escapeHtml(mountPath)}">${escapeHtml(mountPath)}</span>
          </div>
        ` : ''}
        <div class="smart-row">
          <span class="smart-label">Température :</span>
          <span class="smart-val">${escapeHtml(d.temperature || 'Inconnue')}</span>
        </div>
        <div class="smart-row">
          <span class="smart-label">Heures de fonctionnement :</span>
          <span class="smart-val highlight">${escapeHtml(d.power_on_hours || 'Non communiqué')}</span>
        </div>
        <div class="smart-row">
          <span class="smart-label">Téraoctets écrits (TBW) :</span>
          <span class="smart-val highlight">${escapeHtml(d.tbw || 'Non communiqué')}</span>
        </div>
        <div class="smart-row">
          <span class="smart-label">État opérationnel :</span>
          <span class="smart-val">${escapeHtml(d.operational_status || 'OK')}</span>
        </div>
        ${d.sub_members && d.sub_members.length ? `
          <div class="smart-row" style="align-items:flex-start;margin-top:6px;border-top:1px dashed var(--w11-border);padding-top:6px;">
            <span class="smart-label">Membres RAID :</span>
            <span class="smart-val" style="font-size:11px;line-height:1.4;text-align:right;">
              ${d.sub_members.map(m => escapeHtml(m)).join('<br>')}
            </span>
          </div>
        ` : ''}
        <div style="margin-top:10px;padding-top:8px;border-top:1px dashed var(--w11-border);display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap;">
          ${d.device_id && d.device_id !== 'disk0' && mountPath !== '/' && !mountPath.startsWith('/System') ? `
            <button class="btn" style="font-size:11.5px;padding:3px 8px;display:inline-flex;align-items:center;gap:4px;" onclick="openFormatDiskModal('${escapeJs(d.device_id)}', '${escapeJs(d.name)}', '${escapeJs(d.size_formatted || '')}', '${escapeJs(mountPath)}')">
              <img src="static/icons/win98/drive.png" class="win98-custom-icon" style="width:14px;height:14px;" alt="">
              <span>Formater...</span>
            </button>
          ` : ''}
          ${mountPath && mountPath !== '/' && !mountPath.startsWith('/System') ? `
            <button class="btn" style="font-size:11.5px;padding:3px 8px;display:inline-flex;align-items:center;gap:4px;" onclick="ejectVolume('${escapeJs(mountPath)}')">
              <span>⏏</span> Éjecter le lecteur
            </button>
          ` : ''}
        </div>
      </div>
    `;

    elements.smartGrid.appendChild(card);

    setTimeout(() => {
      const canvasContainer = document.getElementById(`canvas3d_${idx}`);
      if (canvasContainer) {
        renderDiskPixelArt(canvasContainer, d);
      }
    }, 40 * idx);
  });
}

// ===================== GESTIONNAIRE SMB & DÉCOUVERTE =====================
async function openSmbModal() {
  if (window.electronAPI?.openSmbWindow) {
    window.electronAPI.openSmbWindow({ theme: getCurrentTheme() });
    return;
  }

  elements.smbServerInput.value = '';
  elements.smbRemotePath.value = '';
  elements.smbUsername.value = '';
  elements.smbPassword.value = '';
  elements.smbSharesContainer.style.display = 'none';
  elements.smbSharesList.innerHTML = '';

  await loadDriveLettersDropdown();

  elements.smbModalOverlay.style.display = 'flex';
  elements.smbServerInput.focus();
}

function closeSmbModal() {
  elements.smbModalOverlay.style.display = 'none';
}

async function loadDriveLettersDropdown() {
  elements.smbDriveLetter.innerHTML = '<option value="">Aucune (Connexion UNC directe)</option>';
  try {
    const res = await fetch('/api/network/letters');
    if (!res.ok) return;
    const letters = await res.json();

    let firstFreeLetter = null;
    const reversed = [...letters].reverse();
    for (const l of reversed) {
      if (l.available && !firstFreeLetter) {
        firstFreeLetter = l.letter;
      }
    }

    letters.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.letter;
      if (l.available) {
        opt.textContent = `${l.letter} (Disponible)`;
        if (l.letter === firstFreeLetter) opt.selected = true;
      } else {
        opt.textContent = `${l.letter} (Occupé : ${l.used_by})`;
        opt.disabled = true;
        opt.style.color = '#888';
      }
      elements.smbDriveLetter.appendChild(opt);
    });
  } catch (e) {}
}

async function discoverSmbShares() {
  const srv = elements.smbServerInput.value.trim();
  if (!srv) {
    showToast('Veuillez saisir une adresse IP ou un nom de serveur (ex: 192.168.1.10)', 'error');
    return;
  }

  elements.smbBtnDiscover.textContent = 'Recherche...';
  elements.smbBtnDiscover.disabled = true;

  try {
    const user = elements.smbUsername?.value.trim() || '';
    const pass = elements.smbPassword?.value || '';
    let url = `/api/network/discover?server=${encodeURIComponent(srv)}`;
    if (user) url += `&username=${encodeURIComponent(user)}`;
    if (pass) url += `&password=${encodeURIComponent(pass)}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Impossible de joindre le serveur');

    elements.smbSharesList.innerHTML = '';
    if (!data.shares || data.shares.length === 0) {
      elements.smbSharesList.innerHTML = '<div style="padding:6px;color:#888;">Aucun dossier partagé trouvé sur ce serveur pour ces identifiants.</div>';
    } else {
      data.shares.forEach((sh, idx) => {
        const item = document.createElement('div');
        item.className = 'smb-share-item';
        item.innerHTML = `
          <div>
            <strong style="color:#0078d4;">${escapeHtml(sh.name)}</strong>
            <span style="font-size:11px;color:#666;margin-left:6px;">${escapeHtml(sh.comment || sh.type)}</span>
          </div>
          <span style="font-family:monospace;font-size:11px;color:#555;">${escapeHtml(sh.unc_path)}</span>
        `;
        const selectThis = () => {
          document.querySelectorAll('.smb-share-item').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
          elements.smbRemotePath.value = sh.unc_path;
        };
        item.onclick = selectThis;

        const defaultShare = data.specified_share;
        if (defaultShare && defaultShare.toLowerCase() === sh.name.toLowerCase()) {
          selectThis();
        } else if (!elements.smbRemotePath.value && idx === 0) {
          selectThis();
        }

        elements.smbSharesList.appendChild(item);
      });
      showToast(`${data.shares.length} partage(s) disponible(s) trouvé(s)`, 'success');
    }

    elements.smbSharesContainer.style.display = 'block';
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.smbBtnDiscover.textContent = 'Découvrir';
    elements.smbBtnDiscover.disabled = false;
  }
}

async function handleSmbConnect() {
  const remote = elements.smbRemotePath.value.trim() || elements.smbServerInput.value.trim();
  if (!remote) {
    showToast('Veuillez spécifier un chemin réseau (ex: smb://192.168.1.10/partage)', 'error');
    return;
  }

  const payload = {
    remote_path: remote,
    drive_letter: elements.smbDriveLetter.value || null,
    username: elements.smbUsername.value.trim() || null,
    password: elements.smbPassword.value || null,
    remember_credentials: elements.smbRemember.checked,
  };

  try {
    elements.smbConfirmBtn.textContent = 'Connexion...';
    elements.smbConfirmBtn.disabled = true;

    const res = await fetch('/api/network/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Erreur de connexion');

    showToast(data.message, 'success');
    closeSmbModal();
    await fetchDrives();
    loadHome();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.smbConfirmBtn.textContent = 'Monter le lecteur réseau';
    elements.smbConfirmBtn.disabled = false;
  }
}

// ===================== SIDEBAR & BREADCRUMB =====================
async function fetchDrives() {
  try {
    const res = await fetch('/api/drives');
    if (!res.ok) return [];
    state.drives = await res.json();
    renderSidebarDrives();
    return state.drives;
  } catch (e) {
    return [];
  }
}

async function fetchFavorites() {
  try {
    const res = await fetch('/api/favorites');
    if (!res.ok) return;
    state.favorites = await res.json();
    renderFavorites();
  } catch (e) {}
}

async function saveFavorites(favs) {
  try {
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(favs),
    });
    state.favorites = favs;
    renderFavorites();
  } catch (e) {}
}

let draggedFavIndex = null;
function renderFavorites() {
  elements.favoritesList.innerHTML = '';
  state.favorites.forEach((fav, index) => {
    const item = document.createElement('div');
    item.className = 'sidebar-item';
    item.dataset.path = fav.path;
    item.draggable = true;
    item.innerHTML = `
      <span class="item-icon">${getIcon('folder')}</span>
      <span class="item-text" title="${escapeHtml(fav.path)}">${escapeHtml(fav.name)}</span>
      <button class="remove-fav-btn" title="Détacher">${ICONS.close}</button>
    `;

    item.onclick = (e) => {
      if (e.target.closest('.remove-fav-btn')) return;
      navigateTo(fav.path);
    };

    item.querySelector('.remove-fav-btn').onclick = (e) => {
      e.stopPropagation();
      const updated = state.favorites.filter((_, i) => i !== index);
      saveFavorites(updated);
      showToast('Favori retiré', 'info');
    };

    // Clic droit sur le favori dans la barre latérale
    item.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openFavoriteContextMenu(e, fav, index);
    };

    // Glisser le favori pour le réordonner
    item.ondragstart = (e) => {
      draggedFavIndex = index;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    };

    item.ondragend = () => {
      item.classList.remove('dragging');
      document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom', 'drop-target'));
      draggedFavIndex = null;
    };

    item.ondragenter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
    };

    item.ondragover = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
      const rect = item.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (e.clientY < mid) {
        item.classList.add('drag-over-top');
        item.classList.remove('drag-over-bottom');
      } else {
        item.classList.add('drag-over-bottom');
        item.classList.remove('drag-over-top');
      }
    };

    item.ondragleave = (e) => {
      if (!item.contains(e.relatedTarget)) {
        item.classList.remove('drag-over-top', 'drag-over-bottom');
      }
    };

    item.ondrop = async (e) => {
      item.classList.remove('drag-over-top', 'drag-over-bottom');

      // 1. Dépôt de fichiers sur le favori (interne ou externe Windows)
      if (draggedFavIndex === null) {
        await handleFileDrop(e, fav.path);
        return;
      }

      // 2. Réorganisation des favoris
      e.preventDefault();
      e.stopPropagation();
      const fromIdx = draggedFavIndex;
      const toIdx = index;
      if (fromIdx === null || fromIdx === toIdx) return;

      const rect = item.getBoundingClientRect();
      let targetPos = (e.clientY < rect.top + rect.height / 2) ? toIdx : toIdx + 1;
      if (fromIdx < targetPos) targetPos--;

      const updated = [...state.favorites];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(targetPos, 0, moved);

      saveFavorites(updated);
      showToast('Ordre des favoris mis à jour', 'info');
    };

    elements.favoritesList.appendChild(item);
  });
}

function renderSidebarDrives() {
  elements.drivesSidebarList.innerHTML = '';
  elements.smbSidebarList.innerHTML = '';

  state.drives.forEach(drive => {
    const item = document.createElement('div');
    item.className = 'sidebar-item';
    item.dataset.path = drive.mountpoint;
    const mpDisplay = drive.mountpoint === '/' ? '/' : drive.mountpoint;
    const isEjectable = drive.is_ejectable || (drive.mountpoint && drive.mountpoint !== '/' && !drive.mountpoint.startsWith('/System'));
    const ejectBtnHtml = isEjectable
      ? `<button class="sidebar-eject-btn" title="Éjecter ${escapeHtml(drive.label)}">⏏</button>`
      : '';

    item.innerHTML = `
      <span class="item-icon" style="display:flex;align-items:center;">${getDriveCardIcon(drive)}</span>
      <span class="item-text" style="flex:1;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(drive.label)} (${escapeHtml(mpDisplay)})</span>
      ${ejectBtnHtml}
    `;

    const ejectBtn = item.querySelector('.sidebar-eject-btn');
    if (ejectBtn) {
      ejectBtn.onclick = (e) => {
        e.stopPropagation();
        ejectVolume(drive.mountpoint);
      };
    }

    item.onclick = () => navigateTo(drive.mountpoint);

    // Cible de dépôt pour copier ou déplacer des fichiers sur ce lecteur via la sidebar
    item.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
      item.classList.add('drop-target');
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
      item.classList.add('drop-target');
    });
    item.addEventListener('dragleave', (e) => {
      if (!item.contains(e.relatedTarget)) {
        item.classList.remove('drop-target');
      }
    });
    item.addEventListener('drop', async (e) => {
      item.classList.remove('drop-target');
      await handleFileDrop(e, drive.mountpoint);
    });

    // Clic droit sur lecteur dans la sidebar
    item.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (drive.is_network) {
        openSmbDriveContextMenu(e, drive);
      } else {
        openDriveContextMenu(e, drive);
      }
    };

    if (drive.is_network) {
      elements.smbSidebarList.appendChild(item);
    } else {
      elements.drivesSidebarList.appendChild(item);
    }
  });
}

function renderBreadcrumb(currentPath) {
  elements.breadcrumbContainer.innerHTML = '';

  const homeSegment = document.createElement('span');
  homeSegment.className = 'breadcrumb-segment';
  homeSegment.innerHTML = `${ICONS.home} <span>Ce Mac</span>`;
  homeSegment.onclick = () => navigateTo(null);
  elements.breadcrumbContainer.appendChild(homeSegment);

  if (!currentPath) {
    elements.pathInput.value = '';
    return;
  }

  elements.pathInput.value = currentPath;
  const isUnix = currentPath.startsWith('/');
  const parts = currentPath.split(/[\\/]/).filter(Boolean);
  let accumulatedPath = '';

  parts.forEach((part, index) => {
    const sep = document.createElement('span');
    sep.className = 'breadcrumb-separator';
    sep.innerHTML = ICONS.chevronRight;
    elements.breadcrumbContainer.appendChild(sep);

    if (isUnix) {
      accumulatedPath = '/' + parts.slice(0, index + 1).join('/');
    } else if (index === 0 && currentPath.includes(':')) {
      accumulatedPath = part + '\\';
    } else {
      accumulatedPath = accumulatedPath ? (accumulatedPath.endsWith('\\') ? accumulatedPath + part : accumulatedPath + '\\' + part) : part;
    }

    const target = accumulatedPath;
    const seg = document.createElement('span');
    seg.className = 'breadcrumb-segment';
    seg.dataset.path = target;
    seg.textContent = part;
    seg.onclick = () => navigateTo(target);

    // Les segments du fil d'Ariane acceptent le dépôt de fichiers (interne ou externe Windows)
    seg.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
      seg.classList.add('drop-target');
    });
    seg.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
      seg.classList.add('drop-target');
    });
    seg.addEventListener('dragleave', (e) => {
      if (!seg.contains(e.relatedTarget)) {
        seg.classList.remove('drop-target');
      }
    });
    seg.addEventListener('drop', async (e) => {
      seg.classList.remove('drop-target');
      await handleFileDrop(e, target);
    });

    elements.breadcrumbContainer.appendChild(seg);
  });

  // Auto-scroll pour s'assurer que le dossier actif reste toujours visible sur n'importe quelle taille de fenêtre
  requestAnimationFrame(() => {
    elements.breadcrumbContainer.scrollLeft = elements.breadcrumbContainer.scrollWidth;
  });
}

elements.breadcrumbContainer.parentElement.addEventListener('click', (e) => {
  if (e.target.closest('.breadcrumb-segment')) return;
  elements.breadcrumbContainer.style.display = 'none';
  elements.pathInput.style.display = 'block';
  elements.pathInput.focus();
  elements.pathInput.select();
});

elements.pathInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const val = elements.pathInput.value.trim();
    if (val) navigateTo(val);
    elements.pathInput.style.display = 'none';
    elements.breadcrumbContainer.style.display = 'flex';
  } else if (e.key === 'Escape') {
    elements.pathInput.style.display = 'none';
    elements.breadcrumbContainer.style.display = 'flex';
  }
});

elements.pathInput.addEventListener('blur', () => {
  setTimeout(() => {
    elements.pathInput.style.display = 'none';
    elements.breadcrumbContainer.style.display = 'flex';
  }, 150);
});

// ===================== CONTEXT MENUS =====================
function positionContextMenu(e) {
  const menu = elements.contextMenu;
  if (!menu) return;

  // 1. Rendre le menu invisible temporairement pour mesurer sa géométrie réelle
  menu.style.visibility = 'hidden';
  menu.style.display = 'block';
  menu.style.maxHeight = `${Math.max(100, window.innerHeight - 16)}px`;
  menu.style.overflowY = 'auto';

  // 2. Mesure exacte dans le viewport
  const rect = menu.getBoundingClientRect();
  const menuWidth = rect.width || 220;
  const menuHeight = rect.height || 260;

  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const margin = 8;

  let x = e.clientX;
  let y = e.clientY;

  // 3. Ajustement horizontal : si le menu dépasse à droite, on l'aligne à gauche du curseur
  if (x + menuWidth > vpW - margin) {
    if (e.clientX - menuWidth >= margin) {
      x = e.clientX - menuWidth;
    } else {
      x = Math.max(margin, vpW - menuWidth - margin);
    }
  } else {
    x = Math.max(margin, x);
  }

  // 4. Ajustement vertical : si le menu dépasse en bas, on le FLIP AU-DESSUS du curseur !
  if (y + menuHeight > vpH - margin) {
    if (e.clientY - menuHeight >= margin) {
      y = e.clientY - menuHeight;
    } else {
      y = Math.max(margin, vpH - menuHeight - margin);
    }
  } else {
    y = Math.max(margin, y);
  }

  menu.style.left = `${Math.round(x)}px`;
  menu.style.top = `${Math.round(y)}px`;
  menu.style.visibility = 'visible';
}

function closeContextMenu() {
  elements.contextMenu.style.display = 'none';
}

function openItemContextMenu(e, item, customPaths = null) {
  const tab = getActiveTab();
  const isDir = item.is_dir;
  const isApp = !!(item.name && item.name.toLowerCase().endsWith('.app')) || (item.extension && item.extension.toLowerCase() === '.app');
  const isPinned = state.favorites.some(f => f.path.toLowerCase() === item.path.toLowerCase());
  const targetPaths = (customPaths && customPaths.length > 0)
    ? customPaths
    : ((tab && tab.selectedPaths && tab.selectedPaths.includes(item.path)) ? tab.selectedPaths : [item.path]);
  const selCount = targetPaths.length;
  const isArchive = ['.zip', '.7z', '.rar', '.tar', '.gz', '.tgz', '.bz2', '.xz', '.iso'].includes((item.extension || '').toLowerCase());
  const isMedia = !isDir && !isApp && selCount === 1 && isMediaFile(item.extension);
  const sizeLabel = selCount > 1 ? `Taille & Propriétés (${selCount} éléments)` : 'Taille & Propriétés';
  const canPaste = !!state.clipboard && !!(tab && tab.path);

  elements.contextMenu.innerHTML = `
    ${isApp && selCount === 1 ? `
      <div class="context-menu-item" id="ctxLaunchApp" style="font-weight:600;color:var(--w11-accent);">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        <span>Lancer l'application</span>
      </div>
      <div class="context-menu-item" id="ctxOpenPackage">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        <span>Afficher le contenu du paquet</span>
      </div>
      <div class="context-menu-separator"></div>
    ` : (isMedia ? `
      <div class="context-menu-item" id="ctxOpenMedia" style="font-weight:600;color:var(--w11-accent);">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        <span>Lire dans Explorer 2</span>
      </div>
      <div class="context-menu-item" id="ctxOpen">${ICONS.open} <span>Ouvrir avec le système</span></div>
      <div class="context-menu-separator"></div>
    ` : `
      <div class="context-menu-item" id="ctxOpen">${ICONS.open} <span>Ouvrir</span></div>
    `)}
    ${isArchive && selCount === 1 ? `
      <div class="context-menu-item" id="ctxExtractHere">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><line x1="10" y1="12" x2="14" y2="12"></line><line x1="12" y1="10" x2="12" y2="14"></line><line x1="1" y1="3" x2="23" y2="3"></line></svg>
        <span>Extraire ici</span>
      </div>
      <div class="context-menu-separator"></div>
    ` : ''}
    <div class="context-menu-item" id="ctxCompressZip">
      ${ICONS.fileZip} <span>Compresser en .zip</span>
    </div>
    <div class="context-menu-separator"></div>
    ${isDir && selCount === 1 ? `
      <div class="context-menu-item" id="ctxPin">${ICONS.pin} <span>${isPinned ? 'Détacher' : 'Épingler aux favoris'}</span></div>
      <div class="context-menu-item" id="ctxOpenTerminal">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
        <span>Ouvrir dans le terminal</span>
      </div>
    ` : ''}
    <div class="context-menu-separator"></div>
    <div class="context-menu-item" id="ctxCut">${ICONS.cut} <span>Couper</span><span class="menu-shortcut">Cmd+X</span></div>
    <div class="context-menu-item" id="ctxCopy">${ICONS.copy} <span>Copier</span><span class="menu-shortcut">Cmd+C</span></div>
    <div class="context-menu-item ${canPaste ? '' : 'disabled'}" id="ctxItemPaste">${ICONS.paste} <span>Coller</span><span class="menu-shortcut">Cmd+V</span></div>
    ${selCount === 1 ? `<div class="context-menu-item" id="ctxRename">${ICONS.rename} <span>Renommer</span><span class="menu-shortcut">F2</span></div>` : ''}
    <div class="context-menu-separator"></div>
    <div class="context-menu-item" id="ctxDelete" style="color:#c42b1c;">${ICONS.delete} <span>Supprimer</span><span class="menu-shortcut">Cmd+⌫</span></div>
    <div class="context-menu-separator"></div>
    <div class="context-menu-item" id="ctxFolderSize">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
      <span>${sizeLabel}</span>
    </div>
  `;

  positionContextMenu(e);

  const launchAppEl = document.getElementById('ctxLaunchApp');
  if (launchAppEl) {
    launchAppEl.onclick = () => {
      closeContextMenu();
      openItem(item.path);
    };
  }

  const openPkgEl = document.getElementById('ctxOpenPackage');
  if (openPkgEl) {
    openPkgEl.onclick = () => {
      closeContextMenu();
      navigateTo(item.path);
    };
  }

  const openTermEl = document.getElementById('ctxOpenTerminal');
  if (openTermEl) {
    openTermEl.onclick = () => {
      closeContextMenu();
      updateTerminalCwd(item.path);
      toggleTerminal(true);
    };
  }

  const openMediaEl = document.getElementById('ctxOpenMedia');
  if (openMediaEl) {
    openMediaEl.onclick = () => {
      closeContextMenu();
      openMediaPlayer(item.path, item.name, item.extension);
    };
  }

  const openEl = document.getElementById('ctxOpen');
  if (openEl) {
    openEl.onclick = () => {
      closeContextMenu();
      if (isDir) navigateTo(item.path);
      else openItem(item.path);
    };
  };

  const extractEl = document.getElementById('ctxExtractHere');
  if (extractEl) {
    extractEl.onclick = () => {
      closeContextMenu();
      triggerExtract(item.path);
    };
  }

  const compressEl = document.getElementById('ctxCompressZip');
  if (compressEl) {
    compressEl.onclick = () => {
      closeContextMenu();
      triggerCompress(targetPaths);
    };
  }

  if (isDir && selCount === 1) {
    document.getElementById('ctxPin').onclick = () => {
      closeContextMenu();
      if (isPinned) saveFavorites(state.favorites.filter(f => f.path.toLowerCase() !== item.path.toLowerCase()));
      else saveFavorites([...state.favorites, { name: item.name, path: item.path }]);
    };
  }
  document.getElementById('ctxCut').onclick = () => { closeContextMenu(); triggerCut(targetPaths); };
  document.getElementById('ctxCopy').onclick = () => { closeContextMenu(); triggerCopy(targetPaths); };
  const pasteEl = document.getElementById('ctxItemPaste');
  if (pasteEl && canPaste) {
    pasteEl.onclick = () => { closeContextMenu(); triggerPaste(); };
  }
  const renameEl = document.getElementById('ctxRename');
  if (renameEl) renameEl.onclick = () => { closeContextMenu(); triggerRename(targetPaths[0]); };
  document.getElementById('ctxDelete').onclick = () => { closeContextMenu(); triggerDelete(targetPaths); };
  const sizeEl = document.getElementById('ctxFolderSize');
  if (sizeEl) {
    sizeEl.onclick = () => {
      closeContextMenu();
      if (selCount > 1) {
        showMultipleFolderSize(targetPaths);
      } else {
        showFolderSize(item, targetPaths);
      }
    };
  }
}

async function triggerExtract(archivePath) {
  try {
    const res = await fetch('/api/fs/extract_task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: archivePath })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Erreur lors de l'extraction de l'archive");

    startTransferTracking(data.task_id, "Extraction de l'archive", {
      sources: [archivePath],
      destination_dir: data.destination
    });
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function triggerCompress(sources) {
  if (!sources || sources.length === 0) return;
  const tab = getActiveTab();
  if (!tab || !tab.path) return;

  let defaultName = 'Archive.zip';
  if (sources.length === 1) {
    const rawName = getFolderName(sources[0]).replace(/\.[^/.]+$/, '');
    defaultName = (rawName || 'Archive') + '.zip';
  }

  const archiveName = await showModal('Compresser en archive .zip', defaultName, 'Compresser');
  if (!archiveName) return;

  let finalName = archiveName.trim();
  if (!finalName.toLowerCase().endsWith('.zip')) {
    finalName += '.zip';
  }

  try {
    const res = await fetch('/api/fs/compress_task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parent_path: tab.path,
        archive_name: finalName,
        sources: sources
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Erreur lors de la compression");

    startTransferTracking(data.task_id, "Compression de l'archive", {
      sources: sources,
      destination_dir: data.destination
    });
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function showMultipleFolderSize(paths) {
  if (!paths || paths.length === 0) return;

  if (window.electronAPI?.openPropertiesWindow) {
    window.electronAPI.openPropertiesWindow({
      name: `${paths.length} éléments`,
      paths: JSON.stringify(paths),
      is_dir: '1',
      icon: 'icons/win98/folder.png',
      theme: state.theme
    });
    return;
  }

  elements.folderSizeModalTitle.textContent = `Propriétés de la sélection (${paths.length} éléments)`;
  elements.folderSizeIcon.innerHTML = `<img src="static/icons/win98/folder.png" width="32" height="32" style="image-rendering:pixelated;" alt="">`;
  const titleIcon = document.getElementById('folderSizeTitleIcon');
  if (titleIcon) titleIcon.src = 'static/icons/win98/folder.png';
  elements.folderSizeName.textContent = `${paths.length} éléments sélectionnés`;
  elements.folderSizePath.textContent = `Emplacement : ${getActiveTab()?.path || ''}`;

  elements.folderSizeLoading.style.display = 'flex';
  elements.folderSizeDetails.style.display = 'none';
  elements.folderSizeSkippedRow.style.display = 'none';
  elements.folderSizeModalOverlay.style.display = 'flex';

  try {
    const res = await fetch('/api/fs/calculate-size', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Erreur lors du calcul de la taille');

    elements.folderSizeFormatted.textContent = data.size_formatted;
    elements.folderSizeBytes.textContent = `${data.size_bytes_formatted} octets`;
    elements.folderSizeCounts.textContent = `${data.file_count.toLocaleString('fr-FR')} fichier(s), ${data.dir_count.toLocaleString('fr-FR')} dossier(s)`;

    const typeEl = document.getElementById('folderSizeType');
    if (typeEl) typeEl.textContent = data.type_desc || `Sélection de ${paths.length} éléments`;

    const countsRow = document.getElementById('folderSizeCountsRow');
    if (countsRow) countsRow.style.display = 'flex';

    const modifiedEl = document.getElementById('folderSizeModified');
    if (modifiedEl) modifiedEl.textContent = data.modified_formatted || '--';

    const createdEl = document.getElementById('folderSizeCreated');
    if (createdEl) createdEl.textContent = data.created_formatted || '--';

    if (data.skipped_count > 0) {
      elements.folderSizeSkipped.textContent = `${data.skipped_count} élément(s)`;
      elements.folderSizeSkippedRow.style.display = 'flex';
    }

    elements.folderSizeLoading.style.display = 'none';
    elements.folderSizeDetails.style.display = 'flex';
  } catch (err) {
    showToast(err.message, 'error');
    elements.folderSizeModalOverlay.style.display = 'none';
  }
}

// Menu contextuel spécifique pour les favoris de la barre latérale
function openFavoriteContextMenu(e, fav, index) {
  elements.contextMenu.innerHTML = `
    <div class="context-menu-item" id="ctxFavOpen">${ICONS.open} <span>Ouvrir</span></div>
    <div class="context-menu-item" id="ctxFavOpenNewTab">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>
      <span>Ouvrir dans un nouvel onglet</span>
    </div>
    <div class="context-menu-separator"></div>
    <div class="context-menu-item" id="ctxFavUnpin" style="color:#c42b1c;">
      ${getIcon('pin')} <span>Désépingler des favoris</span>
    </div>
    <div class="context-menu-separator"></div>
    <div class="context-menu-item" id="ctxFavCopyPath">${ICONS.copy} <span>Copier le chemin d'accès</span></div>
  `;

  positionContextMenu(e);

  document.getElementById('ctxFavOpen').onclick = () => {
    closeContextMenu();
    navigateTo(fav.path);
  };

  document.getElementById('ctxFavOpenNewTab').onclick = () => {
    closeContextMenu();
    createTab(fav.path);
  };

  document.getElementById('ctxFavUnpin').onclick = () => {
    closeContextMenu();
    const updated = state.favorites.filter((_, i) => i !== index);
    saveFavorites(updated);
    showToast(`« ${fav.name} » désépinglé des favoris`, 'info');
  };

  document.getElementById('ctxFavCopyPath').onclick = () => {
    closeContextMenu();
    if (window.electronAPI?.setClipboard) {
      window.electronAPI.setClipboard({ action: 'copy', paths: [fav.path] });
    } else {
      navigator.clipboard?.writeText(fav.path);
    }
    showToast("Chemin d'accès copié", 'info');
  };
}

// Menu contextuel spécifique pour les lecteurs SMB (avec déconnexion)
function openSmbDriveContextMenu(e, drive) {
  elements.contextMenu.innerHTML = `
    <div class="context-menu-item" id="ctxSmbOpen">${ICONS.open} <span>Ouvrir</span></div>
    ${drive.unc_path ? `<div class="context-menu-item" id="ctxSmbCopyPath">${ICONS.copy} <span>Copier le chemin réseau</span></div>` : ''}
    <div class="context-menu-separator"></div>
    <div class="context-menu-item" id="ctxSmbDisconnect" style="color:#c42b1c;">
      ${ICONS.disconnect} <span>Déconnecter le lecteur réseau</span>
    </div>
  `;

  positionContextMenu(e);

  document.getElementById('ctxSmbOpen').onclick = () => {
    closeContextMenu();
    navigateTo(drive.mountpoint);
  };

  if (drive.unc_path) {
    document.getElementById('ctxSmbCopyPath').onclick = () => {
      closeContextMenu();
      navigator.clipboard?.writeText(drive.unc_path);
      showToast('Chemin réseau copié', 'info');
    };
  }

  document.getElementById('ctxSmbDisconnect').onclick = async () => {
    closeContextMenu();
    const target = drive.mountpoint || drive.device;
    try {
      const res = await fetch('/api/network/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drive_letter_or_remote: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur de déconnexion');
      showToast(`Lecteur ${target} déconnecté`, 'info');
      await fetchDrives();
      renderSidebarDrives();
      const tab = getActiveTab();
      if (tab && tab.path) {
        if (drive.mountpoint && (tab.path === drive.mountpoint || tab.path.startsWith(drive.mountpoint + '/'))) {
          let fallbackPath = null;
          if (Array.isArray(tab.history)) {
            for (let i = tab.history.length - 1; i >= 0; i--) {
              const h = tab.history[i];
              if (h && h !== drive.mountpoint && !h.startsWith(drive.mountpoint + '/')) {
                fallbackPath = h;
                break;
              }
            }
          }
          if (fallbackPath) navigateTo(fallbackPath);
        }
      } else {
        loadHome();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

function openDriveContextMenu(e, drive) {
  const isEjectable = drive.is_ejectable || (drive.mountpoint && drive.mountpoint !== '/' && !drive.mountpoint.startsWith('/System'));
  elements.contextMenu.innerHTML = `
    <div class="context-menu-item" id="ctxDriveOpen">${ICONS.open} <span>Ouvrir le lecteur</span></div>
    ${isEjectable ? `
      <div class="context-menu-separator"></div>
      <div class="context-menu-item danger" id="ctxDriveEject">
        <span style="font-size:14px;margin-right:4px;">⏏</span>
        <span>Éjecter le lecteur</span>
      </div>
    ` : ''}
  `;
  positionContextMenu(e);
  document.getElementById('ctxDriveOpen').onclick = () => {
    closeContextMenu();
    navigateTo(drive.mountpoint);
  };
  if (isEjectable) {
    const ejectEl = document.getElementById('ctxDriveEject');
    if (ejectEl) {
      ejectEl.onclick = () => {
        closeContextMenu();
        ejectVolume(drive.mountpoint);
      };
    }
  }
}

async function showFolderSize(item, customPaths = null) {
  if (!item || !item.path) return;

  const iconHtml = getFileIcon(item);
  let iconRel = item.is_dir ? 'icons/win98/folder.png' : 'icons/win98/file.png';
  const m = iconHtml.match(/src="([^"]+)"/);
  if (m) {
    iconRel = m[1].replace(/^static\//, '');
  }

  if (window.electronAPI?.openPropertiesWindow) {
    window.electronAPI.openPropertiesWindow({
      name: item.name || getFolderName(item.path),
      path: item.path,
      paths: customPaths ? JSON.stringify(customPaths) : undefined,
      is_dir: item.is_dir ? '1' : '0',
      icon: iconRel,
      modified: item.modified_formatted || item.modified || '',
      theme: state.theme
    });
    return;
  }

  elements.folderSizeModalTitle.textContent = item.is_dir ? 'Propriétés du dossier' : 'Propriétés du fichier';
  if (elements.folderSizeIcon) elements.folderSizeIcon.innerHTML = iconHtml;
  const titleIcon = document.getElementById('folderSizeTitleIcon');
  if (titleIcon && iconHtml.includes('src="')) {
    const m = iconHtml.match(/src="([^"]+)"/);
    if (m) titleIcon.src = m[1];
  }
  elements.folderSizeName.textContent = item.name || getFolderName(item.path);
  elements.folderSizePath.textContent = item.path;

  elements.folderSizeLoading.style.display = 'flex';
  elements.folderSizeDetails.style.display = 'none';
  elements.folderSizeSkippedRow.style.display = 'none';
  elements.folderSizeModalOverlay.style.display = 'flex';

  try {
    const res = await fetch(`/api/fs/folder-size?path=${encodeURIComponent(item.path)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Erreur lors du calcul de la taille');

    elements.folderSizeFormatted.textContent = data.size_formatted;
    elements.folderSizeBytes.textContent = `${data.size_bytes_formatted} octets`;

    const typeEl = document.getElementById('folderSizeType');
    if (typeEl) typeEl.textContent = data.type_desc || (data.is_dir ? 'Dossier de fichiers' : 'Fichier');

    const countsRow = document.getElementById('folderSizeCountsRow');
    if (data.is_dir) {
      if (countsRow) countsRow.style.display = 'flex';
      elements.folderSizeCounts.textContent = `${data.file_count.toLocaleString('fr-FR')} fichier(s), ${data.dir_count.toLocaleString('fr-FR')} dossier(s)`;
    } else {
      if (countsRow) countsRow.style.display = 'none';
    }

    const modifiedEl = document.getElementById('folderSizeModified');
    if (modifiedEl) modifiedEl.textContent = data.modified_formatted || item.modified_formatted || '--';

    const createdEl = document.getElementById('folderSizeCreated');
    if (createdEl) createdEl.textContent = data.created_formatted || '--';

    if (data.skipped_count > 0) {
      elements.folderSizeSkipped.textContent = `${data.skipped_count} élément(s)`;
      elements.folderSizeSkippedRow.style.display = 'flex';
    }

    elements.folderSizeLoading.style.display = 'none';
    elements.folderSizeDetails.style.display = 'flex';

    // Mettre à jour l'affichage de la taille dans la vue table si l'élément y figure
    const tab = getActiveTab();
    if (tab && tab.items) {
      const found = tab.items.find(i => i.path === item.path);
      if (found) {
        found.size_formatted = data.size_formatted;
        const row = elements.contentArea.querySelector(`.file-row[data-path="${CSS.escape(item.path)}"] td:nth-child(4)`);
        if (row) row.textContent = data.size_formatted;
      }
    }
  } catch (err) {
    elements.folderSizeLoading.innerHTML = `<span style="color:var(--w11-danger);">${escapeHtml(err.message)}</span>`;
    showToast(err.message, 'error');
  }
}

function openBackgroundContextMenu(e) {
  const tab = getActiveTab();
  const canPaste = !!state.clipboard && !!(tab && tab.path);

  elements.contextMenu.innerHTML = `
    <div class="context-menu-item" id="ctxNewFolder">${getIcon('folder')} <span>Nouveau dossier</span></div>
    <div class="context-menu-item" id="ctxNewFile">${getIcon('fileText')} <span>Nouveau fichier</span></div>
    <div class="context-menu-separator"></div>
    <div class="context-menu-item ${canPaste ? '' : 'disabled'}" id="ctxPaste">${ICONS.paste} <span>Coller</span><span class="menu-shortcut">Cmd+V</span></div>
    <div class="context-menu-separator"></div>
    <div class="context-menu-item" id="ctxRefresh">${ICONS.refresh} <span>Actualiser</span></div>
    ${tab && tab.path ? `
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" id="ctxBgOpenTerminal">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
        <span>Ouvrir dans le terminal</span>
      </div>
      <div class="context-menu-item" id="ctxCurrentFolderSize">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        <span>Taille & Propriétés</span>
      </div>
    ` : ''}
  `;

  positionContextMenu(e);
  document.getElementById('ctxNewFolder').onclick = () => { closeContextMenu(); triggerCreate('dir'); };
  document.getElementById('ctxNewFile').onclick = () => { closeContextMenu(); triggerCreate('file'); };
  if (canPaste) document.getElementById('ctxPaste').onclick = () => { closeContextMenu(); triggerPaste(); };
  document.getElementById('ctxRefresh').onclick = () => { closeContextMenu(); refresh(); };
  const curTermEl = document.getElementById('ctxBgOpenTerminal');
  if (curTermEl) {
    curTermEl.onclick = () => {
      closeContextMenu();
      updateTerminalCwd(tab.path);
      toggleTerminal(true);
    };
  }
  const curSizeEl = document.getElementById('ctxCurrentFolderSize');
  if (curSizeEl) {
    curSizeEl.onclick = () => {
      closeContextMenu();
      showFolderSize({ path: tab.path, name: getFolderName(tab.path), is_dir: true });
    };
  }
}

document.addEventListener('click', () => closeContextMenu());

async function showModal(title, defaultValue, confirmLabel) {
  if (window.electronAPI?.openPromptWindow) {
    return await window.electronAPI.openPromptWindow({
      title,
      defaultValue: defaultValue || '',
      confirmLabel: confirmLabel || 'Confirmer',
      theme: state.theme
    });
  }

  return new Promise(resolve => {
    elements.modalTitle.textContent = title;
    elements.modalInput.value = defaultValue || '';
    elements.modalConfirmBtn.textContent = confirmLabel;
    elements.modalOverlay.style.display = 'flex';
    elements.modalInput.focus();
    elements.modalInput.select();

    const cleanup = () => {
      elements.modalOverlay.style.display = 'none';
      elements.modalConfirmBtn.onclick = null;
      elements.modalCancelBtn.onclick = null;
      if (elements.modalCloseXBtn) elements.modalCloseXBtn.onclick = null;
      elements.modalInput.onkeydown = null;
    };

    elements.modalConfirmBtn.onclick = () => { const v = elements.modalInput.value.trim(); cleanup(); resolve(v); };
    elements.modalCancelBtn.onclick = () => { cleanup(); resolve(null); };
    if (elements.modalCloseXBtn) elements.modalCloseXBtn.onclick = () => { cleanup(); resolve(null); };
    elements.modalInput.onkeydown = (e) => {
      if (e.key === 'Enter') { const v = elements.modalInput.value.trim(); cleanup(); resolve(v); }
      else if (e.key === 'Escape') { cleanup(); resolve(null); }
    };
  });
}

async function triggerCreate(type) {
  const tab = getActiveTab();
  if (!tab || !tab.path) return;
  const def = type === 'dir' ? 'Nouveau dossier' : 'Nouveau fichier texte.txt';
  const name = await showModal(type === 'dir' ? 'Créer un dossier' : 'Créer un fichier', def, 'Créer');
  if (!name) return;

  try {
    const res = await fetch('/api/fs/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_path: tab.path, name, type }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.detail);
    showToast(`Créé : ${name}`, 'success');
    refresh();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function triggerRename(customPath = null) {
  const tab = getActiveTab();
  const isFromPreview = !customPath && !!state.previewSelection;

  if (isFromPreview && state.previewSelection.type === 'archive') {
    const { archivePath, file, archiveState, contentArea } = state.previewSelection;
    if (!archivePath.toLowerCase().endsWith('.zip')) {
      showToast('Le renommage interne est supporté uniquement pour les archives .zip', 'error');
      return;
    }
    const newName = await showModal("Renommer dans l'archive", file.name, 'Renommer');
    if (!newName || newName.trim() === '' || newName.trim() === file.name) return;
    try {
      const res = await fetch(`${API_BASE}/api/fs/archive/rename-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archive_path: archivePath,
          member_path: file.path,
          is_dir: !!file.is_dir,
          new_name: newName.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur de renommage');
      state.previewSelection = null;
      archiveState.rawItems = data.raw_items || [];
      renderArchivePreviewContent(contentArea, archiveState);
      updateToolbarState();
      showToast(`Renommé en « ${newName.trim()} »`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
    return;
  }

  const path = customPath
    ? customPath
    : (isFromPreview && state.previewSelection.path
        ? state.previewSelection.path
        : (tab && tab.selectedPaths && tab.selectedPaths.length === 1 ? tab.selectedPaths[0] : null));
  if (!path) return;
  const oldName = getFolderName(path);
  const newName = await showModal('Renommer', oldName, 'Renommer');
  if (!newName || newName === oldName) return;

  try {
    const res = await fetch('/api/fs/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path, new_name: newName }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.detail);
    showToast('Renommé avec succès', 'success');
    refresh();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function refresh() {
  const tab = getActiveTab();
  if (!tab) return;
  if (tab.path) loadFolder(tab.path);
  else loadHome();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeJs(str) {
  if (!str) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ===================== SWITCH VIEWS & EVENTS =====================
function switchView(viewName) {
  state.currentView = viewName;
  elements.viewExplorer.classList.toggle('active', viewName === 'explorer');
  elements.viewSmart.classList.toggle('active', viewName === 'smart');
  if (elements.viewTaskmgr) elements.viewTaskmgr.classList.toggle('active', viewName === 'taskmgr');
  if (elements.viewSpace) elements.viewSpace.classList.toggle('active', viewName === 'space');
  if (elements.viewClone) elements.viewClone.classList.toggle('active', viewName === 'clone');
  if (elements.viewFlash) elements.viewFlash.classList.toggle('active', viewName === 'flash');
  if (elements.viewNetwork) elements.viewNetwork.classList.toggle('active', viewName === 'network');

  elements.railBtnExplorer.classList.toggle('active', viewName === 'explorer');
  elements.railBtnSmart.classList.toggle('active', viewName === 'smart');
  if (elements.railBtnTaskmgr) elements.railBtnTaskmgr.classList.toggle('active', viewName === 'taskmgr');
  if (elements.railBtnSpace) elements.railBtnSpace.classList.toggle('active', viewName === 'space');
  if (elements.railBtnClone) elements.railBtnClone.classList.toggle('active', viewName === 'clone');
  if (elements.railBtnFlash) elements.railBtnFlash.classList.toggle('active', viewName === 'flash');
  if (elements.railBtnNetwork) elements.railBtnNetwork.classList.toggle('active', viewName === 'network');

  if (viewName === 'smart') {
    loadSmartDisks();
    stopTaskmgrPolling();
  } else if (viewName === 'taskmgr') {
    startTaskmgrPolling();
  } else if (viewName === 'space') {
    stopTaskmgrPolling();
    onEnterSpaceView();
  } else if (viewName === 'clone') {
    stopTaskmgrPolling();
    onEnterCloneView();
  } else if (viewName === 'flash') {
    stopTaskmgrPolling();
    onEnterFlashView();
  } else if (viewName === 'network') {
    stopTaskmgrPolling();
    onEnterNetworkView();
  } else {
    stopTaskmgrPolling();
  }
}

function initEvents() {
  // Détection absolue et immédiate de TOUT drop à l'intérieur d'Explorer 2 (phase de capture)
  // Empêche infailliblement qu'un lâcher interne ne soit confondu avec un lâcher vers l'Explorateur Windows
  window.addEventListener('drop', () => {
    window._dropHandledInternally = true;
    const api = window.api || window.electronAPI;
    if (api?.markDropHandled) {
      api.markDropHandled();
    }
  }, true);

  // Gestion globale du Drag & Drop pour autoriser et fluidifier les dépôts depuis Windows Explorer
  window.addEventListener('dragenter', (e) => {
    if (draggedColField) return;
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
    }
  });

  window.addEventListener('dragover', (e) => {
    if (draggedColField) return;
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
    }
  });

  window.addEventListener('drop', async (e) => {
    if (draggedColField) return;
    e.preventDefault();
    e.stopPropagation();
    const currentTab = getActiveTab();
    if (currentTab && currentTab.path) {
      await handleFileDrop(e, currentTab.path);
    }
  });

  // 1. Dépôt interne suite au glisser-déposer natif multi-fichiers
  if (window.electronAPI?.onInternalNativeDrop) {
    window.electronAPI.onInternalNativeDrop(async ({ x, y, paths, isCopy }) => {
      window._dropHandledInternally = true;
      document.querySelectorAll('.file-row').forEach(r => r.classList.remove('dragging', 'drop-target'));
      document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('drop-target', 'drag-over-top', 'drag-over-bottom'));
      document.querySelectorAll('.breadcrumb-segment').forEach(b => b.classList.remove('drop-target'));
      document.querySelectorAll('.drive-card').forEach(d => d.classList.remove('drop-target'));

      if (!Array.isArray(paths) || paths.length === 0) return;

      const el = document.elementFromPoint(x, y);
      if (!el) return;

      let targetDir = null;

      // A. Dossier dans la liste de fichiers
      const fileRow = el.closest('.file-row');
      if (fileRow && fileRow.dataset.isDir === 'true' && fileRow.dataset.path) {
        targetDir = fileRow.dataset.path;
      }

      // B. Dossier dans la barre latérale (favoris ou lecteur)
      if (!targetDir) {
        const sidebarItem = el.closest('.sidebar-item');
        if (sidebarItem && sidebarItem.dataset.path) {
          targetDir = sidebarItem.dataset.path;
        }
      }

      // C. Segment du fil d'Ariane
      if (!targetDir) {
        const breadcrumb = el.closest('.breadcrumb-segment');
        if (breadcrumb && breadcrumb.dataset.path) {
          targetDir = breadcrumb.dataset.path;
        }
      }

      // D. Carte de disque de l'accueil
      if (!targetDir) {
        const driveCard = el.closest('.drive-card');
        if (driveCard && driveCard.dataset.mountpoint) {
          targetDir = driveCard.dataset.mountpoint;
        }
      }

      // E. Zone vide de la liste de fichiers (dossier courant de l'onglet actif)
      if (!targetDir) {
        const fileArea = el.closest('#fileListTable, .file-list-view, .files-container, #fileViewContainer, .table-container');
        const currentTab = getActiveTab();
        if (fileArea && currentTab && currentTab.path && currentTab.path !== 'drives') {
          targetDir = currentTab.path;
        }
      }

      if (targetDir) {
        const action = isCopy ? 'copy' : 'move';
        const validSources = filterSafeTransferSources(paths, targetDir, action);
        if (validSources.length > 0) {
          await executeTransfer(validSources, targetDir, action);
        }
      }
    });
  }

  // 2. Dépôt externe vers l'Explorateur Windows ou le Bureau terminé
  if (window.electronAPI?.onExternalDragEnded) {
    window.electronAPI.onExternalDragEnded(async ({ paths, isCopy }) => {
      document.querySelectorAll('.file-row').forEach(r => r.classList.remove('dragging', 'drop-target'));
      document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('drop-target', 'drag-over-top', 'drag-over-bottom'));
      document.querySelectorAll('.breadcrumb-segment').forEach(b => b.classList.remove('drop-target'));
      document.querySelectorAll('.drive-card').forEach(d => d.classList.remove('drop-target'));

      if (!Array.isArray(paths) || paths.length === 0) return;

      // Afficher la boîte de dialogue de transfert avec la courbe et les feuilles volantes
      showExternalTransferDialog(paths, isCopy);

      // Si déplacement (Move) : supprimer les fichiers sources après que Windows Explorer les a copiés
      if (!isCopy) {
        setTimeout(async () => {
          const api = window.api || window.electronAPI;
          if (api?.deleteFiles) {
            await api.deleteFiles(paths);
          } else {
            try {
              await fetch('/api/fs/trash_task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paths }),
              });
            } catch (err) {}
          }
          refresh();
          if (api?.refreshAllWindows) {
            api.refreshAllWindows();
          }
        }, 1200);
      }
    });
  }

  // 3. Annulation du glisser (ex: appui sur Échap)
  if (window.electronAPI?.onDragCancelled) {
    window.electronAPI.onDragCancelled(() => {
      document.querySelectorAll('.file-row').forEach(r => r.classList.remove('dragging', 'drop-target'));
      document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('drop-target', 'drag-over-top', 'drag-over-bottom'));
      document.querySelectorAll('.breadcrumb-segment').forEach(b => b.classList.remove('drop-target'));
      document.querySelectorAll('.drive-card').forEach(d => d.classList.remove('drop-target'));
    });
  }

  // Nettoyage visuel de fin de session drag natif
  if (window.electronAPI?.onDragEnded) {
    window.electronAPI.onDragEnded(() => {
      document.querySelectorAll('.file-row').forEach(r => r.classList.remove('dragging', 'drop-target'));
      document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('drop-target'));
      document.querySelectorAll('.breadcrumb-segment').forEach(b => b.classList.remove('drop-target'));
    });
  }

  elements.railBtnExplorer.onclick = () => switchView('explorer');
  elements.railBtnSmart.onclick = () => switchView('smart');
  if (elements.railBtnTaskmgr) elements.railBtnTaskmgr.onclick = () => switchView('taskmgr');
  if (elements.railBtnSpace) elements.railBtnSpace.onclick = () => switchView('space');
  if (elements.railBtnClone) elements.railBtnClone.onclick = () => switchView('clone');
  if (elements.railBtnFlash) elements.railBtnFlash.onclick = () => switchView('flash');
  if (elements.railBtnNetwork) elements.railBtnNetwork.onclick = () => switchView('network');

  const btnRefreshNetwork = document.getElementById('btnRefreshNetwork');
  if (btnRefreshNetwork) {
    btnRefreshNetwork.onclick = () => loadNetworkInterfaces();
  }

  const btnToggleInactiveNet = document.getElementById('btnToggleInactiveNet');
  if (btnToggleInactiveNet) {
    btnToggleInactiveNet.onclick = () => {
      networkState.showInactive = !networkState.showInactive;
      renderNetworkCards(networkState.interfaces);
    };
  }

  elements.btnNewTab.onclick = () => createTab(null);

  elements.btnHome.onclick = () => navigateTo(null);
  elements.btnBack.onclick = () => {
    const tab = getActiveTab();
    if (tab && tab.historyIndex > 0) {
      tab.historyIndex--;
      navigateTo(tab.history[tab.historyIndex], false);
    }
  };
  elements.btnForward.onclick = () => {
    const tab = getActiveTab();
    if (tab && tab.historyIndex < tab.history.length - 1) {
      tab.historyIndex++;
      navigateTo(tab.history[tab.historyIndex], false);
    }
  };
  elements.btnUp.onclick = () => {
    const tab = getActiveTab();
    if (tab && tab.parentPath) navigateTo(tab.parentPath);
    else if (tab && tab.path) navigateTo(null);
  };
  elements.btnRefresh.onclick = () => refresh();

  elements.searchInput.addEventListener('input', (e) => {
    const tab = getActiveTab();
    if (tab && tab.path) {
      tab.searchQuery = e.target.value;
      renderFolder();
    }
  });

  elements.tbNewFolder.onclick = () => triggerCreate('dir');
  elements.tbNewFile.onclick = () => triggerCreate('file');
  elements.tbCut.onclick = () => triggerCut();
  elements.tbCopy.onclick = () => triggerCopy();
  elements.tbPaste.onclick = () => triggerPaste();
  elements.tbRename.onclick = () => triggerRename();
  elements.tbDelete.onclick = () => triggerDelete();

  // Bascule Éléments masqués
  elements.tbToggleHidden.onclick = () => {
    state.showHidden = !state.showHidden;
    updateToolbarState();
    const tab = getActiveTab();
    if (tab && tab.path) loadFolder(tab.path);
  };

  // Bascule Volet de navigation (Sidebar)
  if (elements.tbToggleSidebar) {
    elements.tbToggleSidebar.onclick = () => toggleSidebar();
  }

  // Bascule Volet de visualisation
  elements.tbTogglePreview.onclick = () => {
    state.showPreview = !state.showPreview;
    elements.previewPane.style.display = state.showPreview ? 'flex' : 'none';
    if (elements.previewResizer) {
      elements.previewResizer.style.display = state.showPreview ? 'block' : 'none';
    }
    updateToolbarState();
    updatePreviewPane();
  };

  elements.btnPreviewClose.onclick = () => {
    state.showPreview = false;
    elements.previewPane.style.display = 'none';
    if (elements.previewResizer) {
      elements.previewResizer.style.display = 'none';
    }
    updateToolbarState();
  };

  // Bascule Terminal Intégré (partage d'espace avec la liste des fichiers)
  if (elements.tbToggleTerminal) {
    elements.tbToggleTerminal.onclick = () => toggleTerminal();
  }
  if (elements.btnTerminalClose) {
    elements.btnTerminalClose.onclick = () => toggleTerminal(false);
  }
  if (elements.btnTerminalClear) {
    elements.btnTerminalClear.onclick = () => clearTerminalOutput();
  }
  if (elements.btnTerminalExternal) {
    elements.btnTerminalExternal.onclick = () => openExternalTerminal();
  }
  initTerminalResizer();

  // Clic dans le terminal -> focus xterm.js (la sélection reste possible)
  elements.embeddedTerminalPane?.addEventListener('click', (e) => {
    if (e.target.closest('.terminal-actions') || e.target.closest('button')) return;
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    terminalState.term?.focus();
  });

  // Raccourci global Ctrl+` ou Cmd+` pour basculer le terminal
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      toggleTerminal();
    }
  });

  elements.btnRefreshSmart.onclick = () => loadSmartDisks();

  // SMB Modal
  elements.btnSidebarSmbAdd.onclick = () => openSmbModal();
  elements.smbBtnDiscover.onclick = () => discoverSmbShares();
  elements.smbServerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      discoverSmbShares();
    }
  });
  elements.smbCancelBtn.onclick = () => closeSmbModal();
  if (elements.smbCloseXBtn) elements.smbCloseXBtn.onclick = () => closeSmbModal();
  elements.smbConfirmBtn.onclick = () => handleSmbConnect();

  // Paramètres & Thème
  if (elements.railBtnSettings) {
    elements.railBtnSettings.onclick = () => openSettingsModal();
  }
  if (elements.settingsCloseBtn) {
    elements.settingsCloseBtn.onclick = () => closeSettingsModal();
  }
  if (elements.settingsOkBtn) {
    elements.settingsOkBtn.onclick = () => closeSettingsModal();
  }

  // Modale Calcul de taille / Propriétés
  if (elements.folderSizeCloseBtn) {
    elements.folderSizeCloseBtn.onclick = () => { elements.folderSizeModalOverlay.style.display = 'none'; };
  }
  if (elements.folderSizeOkBtn) {
    elements.folderSizeOkBtn.onclick = () => { elements.folderSizeModalOverlay.style.display = 'none'; };
  }

  // Raccourcis clavier & Navigation par flèches
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName) ||
        document.activeElement?.closest?.('#embeddedTerminalPane') ||
        e.target?.closest?.('#embeddedTerminalPane')) {
      return;
    }

    // Ne pas intercepter la navigation de fichiers si une modale est ouverte
    const isModalOpen = (el) => el && el.style && el.style.display && el.style.display !== 'none';
    if (isModalOpen(elements.settingsModalOverlay) ||
        isModalOpen(elements.modalOverlay) ||
        isModalOpen(elements.smbModalOverlay) ||
        isModalOpen(elements.folderSizeModalOverlay)) {
      if (e.key === 'Escape') {
        if (isModalOpen(elements.settingsModalOverlay)) closeSettingsModal();
        if (isModalOpen(elements.modalOverlay)) closeModal();
        if (isModalOpen(elements.smbModalOverlay)) closeSmbModal();
        if (isModalOpen(elements.folderSizeModalOverlay)) elements.folderSizeModalOverlay.style.display = 'none';
      }
      return;
    }

    // Raccourci Ctrl+B pour masquer/afficher le volet de navigation
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      toggleSidebar();
      return;
    }

    const isCmdOrCtrl = e.ctrlKey || e.metaKey;
    if (isCmdOrCtrl && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      selectAll();
    } else if (isCmdOrCtrl && e.key.toLowerCase() === 't') {
      e.preventDefault();
      createTab(null);
    } else if (isCmdOrCtrl && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      if (window.electronAPI?.openNewWindow) {
        const currentTab = getActiveTab();
        window.electronAPI.openNewWindow({ initialPath: currentTab ? currentTab.path : null });
      }
    } else if (isCmdOrCtrl && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      closeTab(state.activeTabId);
    } else if (e.key === 'F2') {
      e.preventDefault();
      triggerRename();
    } else if (e.key === 'Delete' || (e.metaKey && e.key === 'Backspace')) {
      e.preventDefault();
      triggerDelete();
    } else if (isCmdOrCtrl && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      triggerCopy();
    } else if (isCmdOrCtrl && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      triggerCut();
    } else if (isCmdOrCtrl && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      triggerPaste();
    } else if (isCmdOrCtrl && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      if (elements.searchInput) {
        elements.searchInput.focus();
        elements.searchInput.select();
      }
    } else if (e.key === 'Backspace') {
      const tab = getActiveTab();
      if (tab && tab.parentPath) navigateTo(tab.parentPath);
      else if (tab && tab.path) navigateTo(null);
    } else if (state.currentView === 'explorer') {
      const tab = getActiveTab();
      if (!tab) return;

      // 1. Navigation dans la liste des fichiers d'un dossier
      if (tab.path) {
        const items = getSortedAndFilteredItems();
        if (items && items.length > 0) {
          let curIndex = tab.lastSelectedIndex;
          if (curIndex < 0 || curIndex >= items.length) {
            if (tab.selectedPaths && tab.selectedPaths.length > 0) {
              curIndex = items.findIndex(i => i.path === tab.selectedPaths[tab.selectedPaths.length - 1]);
            }
          }

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = curIndex < 0 ? 0 : Math.min(items.length - 1, curIndex + 1);
            navigateFileSelection(nextIndex, e.shiftKey);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = curIndex < 0 ? 0 : Math.max(0, curIndex - 1);
            navigateFileSelection(prevIndex, e.shiftKey);
          } else if (e.key === 'Home') {
            e.preventDefault();
            navigateFileSelection(0, e.shiftKey);
          } else if (e.key === 'End') {
            e.preventDefault();
            navigateFileSelection(items.length - 1, e.shiftKey);
          } else if (e.key === 'PageDown') {
            e.preventDefault();
            const cur = curIndex >= 0 ? curIndex : 0;
            navigateFileSelection(Math.min(items.length - 1, cur + 12), e.shiftKey);
          } else if (e.key === 'PageUp') {
            e.preventDefault();
            const cur = curIndex >= 0 ? curIndex : 0;
            navigateFileSelection(Math.max(0, cur - 12), e.shiftKey);
          } else if (e.key === 'Enter') {
            if (tab.selectedPaths && tab.selectedPaths.length > 0) {
              e.preventDefault();
              const item = items.find(i => i.path === tab.selectedPaths[0]);
              if (item && state.picker && !item.is_dir) { confirmPickerSelection(); return; }
              if (item) {
                if (item.is_dir) navigateTo(item.path);
                else openItem(item.path);
              }
            }
          } else if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1 && !e.key.match(/\s/)) {
            // Saut rapide vers le prochain fichier commençant par la lettre tapée (comme sous Windows Explorer)
            const char = e.key.toLowerCase();
            let matchIndex = -1;
            const startFrom = curIndex >= 0 ? curIndex + 1 : 0;
            for (let i = startFrom; i < items.length; i++) {
              if (items[i].name && items[i].name.toLowerCase().startsWith(char)) {
                matchIndex = i;
                break;
              }
            }
            if (matchIndex === -1) {
              for (let i = 0; i <= curIndex; i++) {
                if (items[i].name && items[i].name.toLowerCase().startsWith(char)) {
                  matchIndex = i;
                  break;
                }
              }
            }
            if (matchIndex >= 0) {
              e.preventDefault();
              navigateFileSelection(matchIndex, false);
            }
          }
        }
      }
      // 2. Navigation sur l'écran d'accueil (Périphériques et lecteurs)
      else if (!tab.path && state.drives && state.drives.length > 0) {
        const cards = Array.from(document.querySelectorAll('.drive-card'));
        if (cards.length > 0) {
          let curCardIndex = cards.findIndex(c => c.classList.contains('selected'));
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            const nextCardIndex = curCardIndex < 0 ? 0 : Math.min(cards.length - 1, curCardIndex + 1);
            cards.forEach((c, idx) => c.classList.toggle('selected', idx === nextCardIndex));
            if (cards[nextCardIndex]) cards[nextCardIndex].scrollIntoView({ block: 'nearest', behavior: 'auto' });
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const prevCardIndex = curCardIndex < 0 ? 0 : Math.max(0, curCardIndex - 1);
            cards.forEach((c, idx) => c.classList.toggle('selected', idx === prevCardIndex));
            if (cards[prevCardIndex]) cards[prevCardIndex].scrollIntoView({ block: 'nearest', behavior: 'auto' });
          } else if (e.key === 'Enter') {
            if (curCardIndex >= 0 && state.drives[curCardIndex]) {
              e.preventDefault();
              navigateTo(state.drives[curCardIndex].mountpoint);
            }
          }
        }
      }
    }
  });
}

function navigateFileSelection(targetIndex, isShift) {
  const tab = getActiveTab();
  if (!tab || !tab.path) return;
  state.previewSelection = null;
  const items = getSortedAndFilteredItems();
  if (!items || items.length === 0) return;

  targetIndex = Math.max(0, Math.min(items.length - 1, targetIndex));

  if (isShift) {
    if (tab.anchorIndex === undefined || tab.anchorIndex < 0) {
      tab.anchorIndex = (tab.lastSelectedIndex >= 0 && tab.lastSelectedIndex < items.length) ? tab.lastSelectedIndex : 0;
    }
    const start = Math.min(tab.anchorIndex, targetIndex);
    const end = Math.max(tab.anchorIndex, targetIndex);
    tab.selectedPaths = items.slice(start, end + 1).map(i => i.path);
    tab.lastSelectedIndex = targetIndex;
  } else {
    tab.anchorIndex = targetIndex;
    tab.lastSelectedIndex = targetIndex;
    tab.selectedPaths = [items[targetIndex].path];
  }

  updateSelectionUI();
  updatePreviewPane();

  const targetRow = document.querySelector(`.file-row[data-index="${targetIndex}"]`) ||
                    (items[targetIndex] ? document.querySelector(`.file-row[data-path="${CSS.escape(items[targetIndex].path)}"]`) : null);
  if (targetRow) {
    targetRow.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }
}

// ===================== REPLIEMENT DU RAIL DE NAVIGATION GLOBAL (3 ONGLETS) =====================
function setGlobalRailCollapsed(collapsed) {
  const rail = document.querySelector('.global-rail');
  const btn = elements.btnToggleGlobalRail || document.getElementById('btnToggleGlobalRail');
  if (!rail) return;

  if (collapsed) {
    rail.classList.add('collapsed');
    if (btn) {
      btn.classList.add('rail-is-collapsed');
      btn.title = "Afficher la barre latérale (3 onglets)";
    }
  } else {
    rail.classList.remove('collapsed');
    if (btn) {
      btn.classList.remove('rail-is-collapsed');
      btn.title = "Replier la barre latérale (3 onglets)";
    }
  }
  localStorage.setItem('explorer_rail_collapsed', collapsed ? 'true' : 'false');
}

function toggleGlobalRail() {
  const rail = document.querySelector('.global-rail');
  if (!rail) return;
  const isCollapsed = rail.classList.contains('collapsed');
  setGlobalRailCollapsed(!isCollapsed);
}

function initGlobalRailToggle() {
  const btn = elements.btnToggleGlobalRail || document.getElementById('btnToggleGlobalRail');
  if (btn) {
    btn.onclick = (e) => {
      e.stopPropagation();
      toggleGlobalRail();
    };
  }

  // Restauration de l'état mémorisé au démarrage
  const isCollapsed = localStorage.getItem('explorer_rail_collapsed') === 'true';
  setGlobalRailCollapsed(isCollapsed);
}

// ===================== REDIMENSIONNEMENT & BASCULE DU VOLET DE NAVIGATION (SIDEBAR) =====================
function setSidebarCollapsed(collapsed) {
  const sidebar = elements.w11Sidebar || document.querySelector('.w11-sidebar');
  const resizer = elements.sidebarResizer || document.getElementById('sidebarResizer');
  const btn = elements.tbToggleSidebar || document.getElementById('tbToggleSidebar');
  if (!sidebar) return;

  if (collapsed) {
    sidebar.classList.add('collapsed');
    if (resizer) resizer.classList.add('collapsed');
    if (btn) btn.classList.remove('active');
  } else {
    sidebar.classList.remove('collapsed');
    if (resizer) resizer.classList.remove('collapsed');
    if (btn) btn.classList.add('active');
  }
  localStorage.setItem('explorer_sidebar_collapsed', collapsed ? 'true' : 'false');
}

function toggleSidebar() {
  const sidebar = elements.w11Sidebar || document.querySelector('.w11-sidebar');
  if (!sidebar) return;
  const isCurrentlyCollapsed = sidebar.classList.contains('collapsed');
  setSidebarCollapsed(!isCurrentlyCollapsed);
}

function initSidebarResizer() {
  const resizer = elements.sidebarResizer || document.getElementById('sidebarResizer');
  const sidebar = elements.w11Sidebar || document.querySelector('.w11-sidebar');
  if (!resizer || !sidebar) return;

  // Restauration de la largeur mémorisée
  const savedWidth = localStorage.getItem('explorer_sidebar_width');
  if (savedWidth) {
    const w = parseInt(savedWidth, 10);
    if (!isNaN(w) && w >= 140 && w <= 500) {
      sidebar.style.width = `${w}px`;
    }
  }

  // Restauration de l'état réduit/visible
  const isCollapsed = localStorage.getItem('explorer_sidebar_collapsed') === 'true';
  setSidebarCollapsed(isCollapsed);

  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebar.offsetWidth;
    document.body.classList.add('is-resizing');
    resizer.classList.add('resizing');

    const onMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const newWidth = Math.max(140, Math.min(500, startWidth + dx));
      sidebar.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      document.body.classList.remove('is-resizing');
      resizer.classList.remove('resizing');
      localStorage.setItem('explorer_sidebar_width', sidebar.offsetWidth.toString());
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
}


// ===================== ACTUALISATION DYNAMIQUE DES ICÔNES DE NAVIGATION & OUTILS =====================
function updateNavigationRailIcons() {
  const setRailIcon = (btnId, svgHtml) => {
    const btn = document.getElementById(btnId);
    if (!btn || !svgHtml) return;
    const existingIcon = btn.querySelector('svg, img');
    if (existingIcon) {
      existingIcon.outerHTML = svgHtml;
    } else {
      const label = btn.querySelector('.rail-btn-label');
      if (label) {
        label.insertAdjacentHTML('beforebegin', svgHtml);
      } else {
        btn.innerHTML = svgHtml;
      }
    }
  };

  setRailIcon('railBtnExplorer', ICONS_WIN98.folder);
  setRailIcon('railBtnSmart', ICONS_WIN98.drive);
  setRailIcon('railBtnTaskmgr', `<img src="static/icons/win98/perf.png" class="win98-custom-icon" style="width:28px;height:28px;" alt="Gestionnaire des tâches">`);
  setRailIcon('railBtnSpace', `<img src="static/icons/win98/space.png" class="win98-custom-icon" style="width:28px;height:28px;" alt="Espace">`);
  setRailIcon('railBtnClone', `<img src="static/icons/win98/clone.png" class="win98-custom-icon" style="width:28px;height:28px;" alt="Cloner">`);
  setRailIcon('railBtnFlash', `<img src="static/icons/win98/usb_key_detail.png" class="win98-custom-icon" style="width:28px;height:28px;image-rendering:pixelated;" alt="Flash">`);
  setRailIcon('railBtnNetwork', `<img src="static/icons/win98/network.png" class="win98-custom-icon" style="width:28px;height:28px;image-rendering:pixelated;" alt="Réseau">`);
  setRailIcon('railBtnSettings', ICONS_WIN98.gear);
}

function updateToolbarIcons() {
  const setBtnIcon = (btnId, iconHtml) => {
    const btn = document.getElementById(btnId);
    if (!btn || !iconHtml) return;
    const existing = btn.querySelector('svg, img');
    if (existing) {
      existing.outerHTML = iconHtml;
    }
  };

  setBtnIcon('tbNewFolder', ICONS_WIN98.folder);
  setBtnIcon('tbCut', ICONS_WIN98.cut);
  setBtnIcon('tbCopy', ICONS_WIN98.copy);
  setBtnIcon('tbPaste', ICONS_WIN98.paste);
  setBtnIcon('tbRename', ICONS_WIN98.rename);
  setBtnIcon('tbDelete', ICONS_WIN98.delete);
}

// ===================== REDIMENSIONNEMENT DU VOLET D'APERÇU =====================
function initPreviewResizer() {
  const resizer = elements.previewResizer;
  const pane = elements.previewPane;
  if (!resizer || !pane) return;

  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = pane.offsetWidth;
    document.body.classList.add('is-resizing');
    resizer.classList.add('resizing');

    const onMouseMove = (moveEvent) => {
      const dx = startX - moveEvent.clientX; // Déplacer vers la gauche agrandit le volet d'aperçu
      const maxW = Math.max(220, window.innerWidth - 300);
      const newWidth = Math.max(200, Math.min(maxW, startWidth + dx));
      pane.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      document.body.classList.remove('is-resizing');
      resizer.classList.remove('resizing');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
}

// ===================== GESTION DES PARAMÈTRES & DU THÈME =====================
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 28, g: 125, b: 201 };
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 28, g: 125, b: 201 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function hexToRgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}



function openSettingsModal() {
  if (window.electronAPI?.openSettingsWindow) {
    window.electronAPI.openSettingsWindow({
      currentTheme: state.theme
    });
    return;
  }

  const titleIcon = document.getElementById('settingsTitleIcon');
  if (titleIcon) {
    titleIcon.innerHTML = getIcon('gear');
  }
  elements.settingsModalOverlay.style.display = 'flex';
}

function closeSettingsModal() {
  elements.settingsModalOverlay.style.display = 'none';
}

async function applyTheme(theme, skipNotify = false) {
  theme = 'windows98';
  const prevTheme = state.theme;
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  if (document.body) {
    document.body.setAttribute('data-theme', theme);
  }
  if (typeof updateTerminalTheme === 'function') {
    updateTerminalTheme(theme);
  }
  localStorage.setItem('explorer_theme', theme);
  if (!skipNotify && prevTheme !== theme && window.electronAPI?.notifySettingsChanged) {
    window.electronAPI.notifySettingsChanged({ theme });
  }

  const titleIcon = document.getElementById('settingsTitleIcon');
  if (titleIcon) {
    titleIcon.innerHTML = getIcon('gear');
  }
  updateNavigationRailIcons();
  updateTitlebarButtonsIcons();


  // Actualisation complète des lecteurs pour éviter toute disparition au switch de thème
  try {
    await fetchDrives();
  } catch (err) {}

  if (state.drives && state.drives.length > 0) {
    renderSidebarDrives();
    renderFavorites();
  }
  const tab = getActiveTab();
  if (tab) {
    renderTabs();
    if (tab.path) {
      renderFolder();
      renderBreadcrumb(tab.path);
    } else {
      renderHome(state.drives);
    }
  }
  updateTaskmgrIcons();
  updateToolbarIcons();
  updateNavigationRailIcons();
  updateTitlebarButtonsIcons();
  if (taskmgrState && taskmgrState.perf) {
    renderTaskmgrPerformance();
  }
  if (elements.viewSmart && elements.viewSmart.classList.contains('active')) {
    loadSmartDisks();
  }
  if (state.showPreview) {
    updatePreviewPane();
  }

  // Initialisation des onglets et modales additionnels
  try { initWdsEvents(); } catch (e) { console.error('initWdsEvents err:', e); }
  try { initFormatModalEvents(); } catch (e) { console.error('initFormatModalEvents err:', e); }
  try { initCloneEvents(); } catch (e) { console.error('initCloneEvents err:', e); }
}

// ===================== CONTRÔLES DE FENÊTRE (WINDOWS 98) =====================
function updateTitlebarButtonsIcons(isMax = document.body.classList.contains('is-maximized')) {
  const btnMin = document.getElementById('winBtnMinimize');
  const btnMax = document.getElementById('winBtnMaximize');
  const btnClose = document.getElementById('winBtnClose');
  if (!btnMin || !btnMax || !btnClose) return;

  // Boutons de la barre de titre Windows 98
  btnMin.innerHTML = `<svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>`;
  btnMin.title = "Réduire";

  if (isMax) {
    btnMax.innerHTML = `
      <svg id="svgMaximize" width="10" height="10" viewBox="0 0 10 10">
        <path d="M2.5 1.5h6v6h-6z" fill="none" stroke="currentColor" stroke-width="1"/>
        <path d="M4.5 1.5V0.5h6v6h-1" fill="none" stroke="currentColor" stroke-width="1"/>
      </svg>
    `;
    btnMax.title = "Restaurer";
  } else {
    btnMax.innerHTML = `
      <svg id="svgMaximize" width="10" height="10" viewBox="0 0 10 10">
        <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.2"/>
      </svg>
    `;
    btnMax.title = "Agrandir";
  }

  btnClose.innerHTML = `
    <svg width="10" height="10" viewBox="0 0 10 10">
      <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.2"/>
      <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.2"/>
    </svg>
  `;
  btnClose.title = "Fermer";
}

function initWindowControls() {
  const btnMin = document.getElementById('winBtnMinimize');
  const btnMax = document.getElementById('winBtnMaximize');
  const btnClose = document.getElementById('winBtnClose');

  if (window.electronAPI) {
    if (btnMin) btnMin.onclick = () => window.electronAPI.minimize();
    if (btnMax) btnMax.onclick = () => window.electronAPI.maximize();
    if (btnClose) btnClose.onclick = () => window.electronAPI.close();

    window.electronAPI.onMaximizedChange((isMax) => {
      document.body.classList.toggle('is-maximized', isMax);
      updateTitlebarButtonsIcons(isMax);
    });

    if (window.electronAPI.isMaximized) {
      window.electronAPI.isMaximized().then((isMax) => {
        document.body.classList.toggle('is-maximized', isMax);
        updateTitlebarButtonsIcons(isMax);
      }).catch(() => {});
    }

    if (window.electronAPI.onSnappedChange) {
      window.electronAPI.onSnappedChange((snapped) => {
        document.body.classList.toggle('is-snapped', !!snapped);
      });
    }
  } else {
    if (btnMin) btnMin.onclick = () => showToast('Contrôle de fenêtre actif en mode application Electron', 'info');
    if (btnMax) btnMax.onclick = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    };
    if (btnClose) btnClose.onclick = () => window.close();
  }

  updateTitlebarButtonsIcons();

  // Décrochage fluide de la fenêtre depuis le plein écran ou les côtés (ancrage aux bords)
  const titlebar = document.getElementById('appTitlebar');
  if (titlebar) {
    titlebar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.titlebar-controls') || e.target.closest('button')) return;
      if (e.button !== 0) return;

      const isMax = document.body.classList.contains('is-maximized');
      const isSnapped = document.body.classList.contains('is-snapped');

      // Si la fenêtre est normale (non maximisée, non ancrée), le drag natif Chromium est utilisé
      if (!isMax && !isSnapped) return;

      const startX = e.screenX;
      const startY = e.screenY;
      let dragStarted = false;

      const onMouseMove = (moveEvent) => {
        const dist = Math.hypot(moveEvent.screenX - startX, moveEvent.screenY - startY);
        if (dist >= 2 && !dragStarted) {
          dragStarted = true;
          document.body.classList.add('is-titlebar-dragging');
          document.body.classList.remove('is-maximized');
          document.body.classList.remove('is-snapped');
          updateTitlebarButtonsIcons(false);

          if (window.electronAPI?.titlebarDragStart) {
            window.electronAPI.titlebarDragStart({
              clientX: e.clientX,
              clientY: e.clientY,
              screenX: moveEvent.screenX,
              screenY: moveEvent.screenY,
              windowWidth: window.innerWidth,
              isMax: isMax
            });
          }
        }
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        document.body.classList.remove('is-titlebar-dragging');

        if (dragStarted && window.electronAPI?.titlebarDragEnd) {
          window.electronAPI.titlebarDragEnd();
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    titlebar.addEventListener('dblclick', (e) => {
      if (e.target.closest('.titlebar-controls') || e.target.closest('button')) return;
      if (window.electronAPI?.maximize) {
        window.electronAPI.maximize();
      }
    });
  }
}

// ===================== GESTIONNAIRE DES TÂCHES (PROCESSUS, PERFORMANCES, COURBES, GPU, TEMPÉRATURES) =====================
const taskmgrState = {
  activeTab: 'processes', // 'processes' | 'performance'
  processes: [],
  perf: null,
  selectedPid: null,
  searchQuery: '',
  sortField: 'cpu',
  sortAsc: false,
  selectedComp: 'cpu', // 'cpu' | 'memory' | 'disk_C' | 'disk_D' ... | 'network' | 'gpu'
  cpuViewMode: localStorage.getItem('tm_cpu_view') || 'overall', // 'overall' | 'logical'
  pollInterval: null,
  history: {
    cpu: [],
    memory: [],
    network: [],
    gpu: [],
    gpuVram: [],
    cpuCores: {},
    disks: {}
  }
};

function initTaskmgr() {
  const tabProc = document.getElementById('taskmgrTabProcesses');
  const tabPerf = document.getElementById('taskmgrTabPerformance');
  const pageProc = document.getElementById('taskmgrPageProcesses');
  const pagePerf = document.getElementById('taskmgrPagePerformance');
  const btnKill = document.getElementById('taskmgrBtnKill');
  const searchInput = document.getElementById('taskmgrSearchInput');

  if (btnKill) {
    btnKill.style.display = taskmgrState.activeTab === 'processes' ? '' : 'none';
  }

  if (tabProc && tabPerf) {
    tabProc.onclick = () => {
      taskmgrState.activeTab = 'processes';
      tabProc.classList.add('active');
      tabPerf.classList.remove('active');
      pageProc.classList.add('active');
      pagePerf.classList.remove('active');
      if (btnKill) btnKill.style.display = '';
      renderTaskmgrProcesses();
    };

    tabPerf.onclick = () => {
      taskmgrState.activeTab = 'performance';
      tabPerf.classList.add('active');
      tabProc.classList.remove('active');
      pagePerf.classList.add('active');
      pageProc.classList.remove('active');
      if (btnKill) btnKill.style.display = 'none';
      if (taskmgrState.perf) {
        renderTaskmgrPerformance();
      }
    };
  }

  // Sélecteur de vue CPU (Vue d'ensemble vs Processeurs logiques)
  const btnCpuOverall = document.getElementById('tmCpuViewOverall');
  const btnCpuLogical = document.getElementById('tmCpuViewLogical');
  if (btnCpuOverall && btnCpuLogical) {
    if (taskmgrState.cpuViewMode === 'logical') {
      btnCpuLogical.classList.add('active');
      btnCpuOverall.classList.remove('active');
    } else {
      btnCpuOverall.classList.add('active');
      btnCpuLogical.classList.remove('active');
    }
    btnCpuOverall.onclick = () => {
      taskmgrState.cpuViewMode = 'overall';
      localStorage.setItem('tm_cpu_view', 'overall');
      btnCpuOverall.classList.add('active');
      btnCpuLogical.classList.remove('active');
      renderTaskmgrPerformance();
    };
    btnCpuLogical.onclick = () => {
      taskmgrState.cpuViewMode = 'logical';
      localStorage.setItem('tm_cpu_view', 'logical');
      btnCpuLogical.classList.add('active');
      btnCpuOverall.classList.remove('active');
      renderTaskmgrPerformance();
    };
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      taskmgrState.searchQuery = e.target.value;
      renderTaskmgrProcesses();
    });
  }

  if (btnKill) {
    btnKill.onclick = () => killSelectedProcess();
  }

  // Tri sur colonnes de processus
  document.querySelectorAll('#taskmgrProcessTable th.sortable').forEach(th => {
    th.onclick = () => {
      const field = th.dataset.sort;
      if (taskmgrState.sortField === field) {
        taskmgrState.sortAsc = !taskmgrState.sortAsc;
      } else {
        taskmgrState.sortField = field;
        taskmgrState.sortAsc = (field === 'name' || field === 'status');
      }
      renderTaskmgrProcesses();
    };
  });

  // Sélection du composant dans la barre latérale Performances (avec délégation d'événement pour tous les disques dynamiques)
  const perfSidebar = document.querySelector('.taskmgr-perf-sidebar');
  if (perfSidebar) {
    perfSidebar.onclick = (e) => {
      const card = e.target.closest('.perf-nav-card');
      if (card && card.dataset.comp) {
        taskmgrState.selectedComp = card.dataset.comp;
        document.querySelectorAll('.perf-nav-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        renderTaskmgrPerformance();
      }
    };
  }

  document.querySelectorAll('.perf-nav-card').forEach(card => {
    card.onclick = () => {
      if (card.dataset.comp) {
        taskmgrState.selectedComp = card.dataset.comp;
        document.querySelectorAll('.perf-nav-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        renderTaskmgrPerformance();
      }
    };
  });

  updateTaskmgrIcons();
}

function startTaskmgrPolling() {
  stopTaskmgrPolling();
  pollTaskmgrData();
  taskmgrState.pollInterval = setInterval(pollTaskmgrData, 1200);
}

function stopTaskmgrPolling() {
  if (taskmgrState.pollInterval) {
    clearInterval(taskmgrState.pollInterval);
    taskmgrState.pollInterval = null;
  }
}

async function pollTaskmgrData() {
  try {
    const [procRes, perfRes] = await Promise.all([
      fetch('/api/taskmgr/processes'),
      fetch('/api/taskmgr/performance')
    ]);

    if (procRes.ok) {
      taskmgrState.processes = await procRes.json();
    }
    if (perfRes.ok) {
      taskmgrState.perf = await perfRes.json();
    }

    updateTaskmgrSummaryBadges();

    if (taskmgrState.activeTab === 'processes') {
      renderTaskmgrProcesses();
    } else {
      renderTaskmgrPerformance();
    }
  } catch (err) {}
}

function updateTaskmgrSummaryBadges() {
  const perf = taskmgrState.perf;
  if (!perf) return;

  const bCpu = document.getElementById('tmBadgeCpu');
  const bMem = document.getElementById('tmBadgeMem');
  const bDisk = document.getElementById('tmBadgeDisk');
  const bNet = document.getElementById('tmBadgeNet');
  const bGpu = document.getElementById('tmBadgeGpu');

  if (bCpu) bCpu.innerHTML = `CPU: <strong>${perf.cpu.percent.toFixed(0)}%</strong>`;
  if (bMem) bMem.innerHTML = `Mémoire: <strong>${perf.memory.percent.toFixed(0)}%</strong>`;
  
  const diskRate = (perf.disk.read_bytes_sec + perf.disk.write_bytes_sec) / (1024 * 1024);
  if (bDisk) bDisk.innerHTML = `Disque: <strong>${diskRate.toFixed(1)} Mo/s</strong>`;

  const netRateMo = ((perf.network.recv_bytes_sec || 0) + (perf.network.sent_bytes_sec || 0)) / (1024 * 1024);
  if (bNet) bNet.innerHTML = `Réseau: <strong>${netRateMo.toFixed(2)} Mo/s</strong>`;

  if (bGpu) {
    if (perf.gpu) {
      bGpu.innerHTML = `GPU: <strong>${perf.gpu.utilization_gpu.toFixed(0)}%</strong>`;
      bGpu.style.display = 'block';
    } else {
      bGpu.style.display = 'none';
    }
  }
}

function renderTaskmgrProcesses() {
  const tbody = document.getElementById('taskmgrProcessTableBody');
  const btnKill = document.getElementById('taskmgrBtnKill');
  if (!tbody) return;

  const q = taskmgrState.searchQuery.toLowerCase().trim();
  let list = taskmgrState.processes.filter(p => {
    if (p.pid === 0) return false;
    const nameLow = (p.name || '').toLowerCase();
    if (nameLow.includes('inactif') || nameLow.includes('idle process')) return false;
    if (!q) return true;
    return nameLow.includes(q) || String(p.pid).includes(q) || (p.user && p.user.toLowerCase().includes(q));
  });

  // Tri
  const f = taskmgrState.sortField;
  const asc = taskmgrState.sortAsc;
  list.sort((a, b) => {
    let vA = a[f];
    let vB = b[f];
    if (typeof vA === 'string') {
      return asc ? vA.localeCompare(vB) : vB.localeCompare(vA);
    }
    return asc ? (vA - vB) : (vB - vA);
  });

  // Met à jour les indicateurs de tri des colonnes
  document.querySelectorAll('#taskmgrProcessTable th.sortable').forEach(th => {
    const ind = th.querySelector('.sort-indicator');
    if (th.dataset.sort === f) {
      if (ind) ind.textContent = asc ? ' ▲' : ' ▼';
    } else if (ind) {
      ind.textContent = '';
    }
  });

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="state-container">Aucun processus correspondant.</td></tr>`;
    if (btnKill) btnKill.disabled = true;
    return;
  }

  let html = '';
  list.forEach(p => {
    const isSelected = (p.pid === taskmgrState.selectedPid);

    const procIconHtml = p.app_path
      ? `<img src="${API_BASE}/api/taskmgr/process-icon?path=${encodeURIComponent(p.app_path)}" width="16" height="16" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;flex-shrink:0;" onerror="this.onerror=null;this.src='static/icons/win98/file_exe.png';" alt="">`
      : `<img src="static/icons/win98/file_exe.png" width="16" height="16" style="width:16px;height:16px;object-fit:contain;image-rendering:pixelated;vertical-align:middle;flex-shrink:0;" alt="">`;

    html += `
      <tr class="taskmgr-proc-row ${isSelected ? 'selected' : ''}" data-pid="${p.pid}">
        <td>
          <div class="proc-name-cell">
            <span class="proc-icon" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;">${procIconHtml}</span>
            <span title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
          </div>
        </td>
        <td>${p.pid}</td>
        <td>${escapeHtml(p.status === 'running' ? 'En cours' : p.status)}</td>
        <td>${p.cpu.toFixed(1)}%</td>
        <td>${formatBytes(p.memory)}</td>
        <td>${p.memory_percent.toFixed(1)}%</td>
        <td>${escapeHtml(p.user || 'Système')}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // Clic de sélection de ligne
  tbody.querySelectorAll('.taskmgr-proc-row').forEach(row => {
    row.onclick = () => {
      const pid = parseInt(row.dataset.pid, 10);
      taskmgrState.selectedPid = pid;
      tbody.querySelectorAll('.taskmgr-proc-row').forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');
      if (btnKill) btnKill.disabled = false;
    };

    row.ondblclick = () => {
      const pid = parseInt(row.dataset.pid, 10);
      taskmgrState.selectedPid = pid;
      killSelectedProcess();
    };
  });

  if (btnKill) {
    btnKill.disabled = !taskmgrState.selectedPid || !list.some(p => p.pid === taskmgrState.selectedPid);
  }
}

async function killSelectedProcess() {
  const pid = taskmgrState.selectedPid;
  if (!pid) return;

  const proc = taskmgrState.processes.find(p => p.pid === pid);
  const name = proc ? proc.name : `PID ${pid}`;

  if (!confirm(`Voulez-vous vraiment terminer le processus "${name}" (PID: ${pid}) ?`)) {
    return;
  }

  try {
    const res = await fetch('/api/taskmgr/kill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || `Processus ${name} arrêté`, 'success');
      taskmgrState.selectedPid = null;
      pollTaskmgrData();
    } else {
      showToast(data.detail || `Impossible d'arrêter le processus ${name}`, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderTaskmgrPerformance() {
  const perf = taskmgrState.perf;
  if (!perf) return;

  // 1. Mise à jour de l'historique (max 60 points)
  const pushHist = (key, val) => {
    taskmgrState.history[key] = taskmgrState.history[key] || [];
    taskmgrState.history[key].push(val);
    if (taskmgrState.history[key].length > 60) taskmgrState.history[key].shift();
  };

  const netRateMo = ((perf.network.recv_bytes_sec || 0) + (perf.network.sent_bytes_sec || 0)) / (1024 * 1024);
  const gpuUtil = perf.gpu ? perf.gpu.utilization_gpu : 0;
  const gpuVramUsedGo = perf.gpu ? (perf.gpu.memory_used_mb / 1024) : 0;
  const gpuVramTotalGo = perf.gpu ? (perf.gpu.memory_total_mb / 1024) : 0;
  const gpuVramPct = (perf.gpu && perf.gpu.memory_total_mb > 0) ? ((perf.gpu.memory_used_mb / perf.gpu.memory_total_mb) * 100) : 0;

  pushHist('cpu', perf.cpu.percent);
  pushHist('memory', perf.memory.percent);
  pushHist('network', netRateMo);
  pushHist('gpu', gpuUtil);
  pushHist('gpuVram', gpuVramUsedGo);

  // Historique par cœur logique CPU
  if (Array.isArray(perf.cpu.per_core)) {
    perf.cpu.per_core.forEach((corePct, idx) => {
      taskmgrState.history.cpuCores[idx] = taskmgrState.history.cpuCores[idx] || [];
      taskmgrState.history.cpuCores[idx].push(corePct);
      if (taskmgrState.history.cpuCores[idx].length > 60) taskmgrState.history.cpuCores[idx].shift();
    });
  }

  // Historique par volume / disque physique individuel (avec fallback robuste si vide)
  let diskList = (perf.disk && Array.isArray(perf.disk.disks) && perf.disk.disks.length > 0) ? perf.disk.disks : [];
  if (diskList.length === 0) {
    diskList = [{
      id: 'C',
      letter: 'C',
      name: 'Disque (C:)',
      label: 'Disque principal',
      total: 512 * 1024 * 1024 * 1024,
      free: 256 * 1024 * 1024 * 1024,
      used: 256 * 1024 * 1024 * 1024,
      percent: 50,
      total_speed: (perf.disk?.read_bytes_sec || 0) + (perf.disk?.write_bytes_sec || 0),
      read_bytes_sec: perf.disk?.read_bytes_sec || 0,
      write_bytes_sec: perf.disk?.write_bytes_sec || 0,
      fstype: 'NTFS',
      temperature: 36,
      disk_number: 0
    }];
  }

  diskList.forEach(d => {
    const actPct = typeof d.active_percent === 'number' ? d.active_percent : Math.min(100, Math.round(((d.total_speed || 0) / (50 * 1024 * 1024)) * 100));
    taskmgrState.history.disks[d.id] = taskmgrState.history.disks[d.id] || [];
    taskmgrState.history.disks[d.id].push(actPct);
    if (taskmgrState.history.disks[d.id].length > 60) taskmgrState.history.disks[d.id].shift();
  });

  // 2. Mise à jour des cartes du volet latéral
  const setEl = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };

  setEl('tmSideCpuPct', `${perf.cpu.percent.toFixed(0)}%`);
  setEl('tmSideCpuSub', `${(perf.cpu.frequency_mhz / 1000).toFixed(2)} GHz`);

  const memTypeSide = perf.memory.ram_type || 'RAM';
  const isUnified = !!perf.memory.unified;
  const memTitleEl = document.querySelector('#tmNavMem .perf-nav-title');
  if (memTitleEl) memTitleEl.textContent = isUnified ? 'Mémoire unifiée' : 'Mémoire';
  setEl('tmSideMemPct', `${perf.memory.percent.toFixed(0)}%`);
  if (isUnified) {
    setEl('tmSideMemSub', `${(perf.memory.used / (1024**3)).toFixed(1)} / ${(perf.memory.total / (1024**3)).toFixed(1)} Go • GPU ${((perf.memory.gpu_used || 0) / (1024**3)).toFixed(1)} Go`);
  } else {
    setEl('tmSideMemSub', `${(perf.memory.used / (1024**3)).toFixed(1)} / ${(perf.memory.total / (1024**3)).toFixed(1)} Go (${memTypeSide})`);
  }

  setEl('tmSideNetPct', `${netRateMo.toFixed(2)} Mo/s`);
  setEl('tmSideNetSub', `R: ${((perf.network.recv_bytes_sec || 0) / (1024 * 1024)).toFixed(2)} / E: ${((perf.network.sent_bytes_sec || 0) / (1024 * 1024)).toFixed(2)} Mo/s`);

  if (perf.gpu) {
    setEl('tmSideGpuPct', `${perf.gpu.utilization_gpu.toFixed(0)}%`);
    if (perf.gpu.unified_memory) {
      setEl('tmSideGpuSub', `${perf.gpu.cores ? perf.gpu.cores + ' cœurs • ' : ''}Mémoire unifiée`);
    } else {
      setEl('tmSideGpuSub', `${gpuVramUsedGo.toFixed(1)} / ${gpuVramTotalGo.toFixed(1)} Go (${gpuVramPct.toFixed(0)}%) • ${perf.gpu.temperature.toFixed(0)}°C`);
    }
  } else {
    setEl('tmSideGpuPct', 'N/A');
    setEl('tmSideGpuSub', 'Non détecté');
  }

  // Couleurs des graphiques (vert d'époque, bleu disques, rouge réseau, jaune gpu en Win98/XP)
  const cpuColor = getTaskmgrCompColor('cpu');
  const memColor = getTaskmgrCompColor('memory');
  const netColor = getTaskmgrCompColor('network');
  const gpuColor = getTaskmgrCompColor('gpu');
  const diskColor = getTaskmgrCompColor('disk');

  const setCardColor = (id, col) => {
    const el = document.getElementById(id);
    if (el) el.style.setProperty('--card-color', col);
  };
  setCardColor('tmNavCpu', cpuColor);
  setCardColor('tmNavMem', memColor);
  setCardColor('tmNavNet', netColor);
  setCardColor('tmNavGpu', gpuColor);

  // Mini graphiques CPU, Mémoire, Réseau, GPU (Échelle fixe 100% au sommet pour les pourcentages)
  drawMiniPerfCanvas('tmMiniCpuCanvas', taskmgrState.history.cpu, cpuColor, 100);
  drawMiniPerfCanvas('tmMiniMemCanvas', taskmgrState.history.memory, memColor, 100);
  drawMiniPerfCanvas('tmMiniNetCanvas', taskmgrState.history.network, netColor, null);
  drawMiniPerfCanvas('tmMiniGpuCanvas', taskmgrState.history.gpu, gpuColor, 100);

  // Rendu dynamique des cartes pour CHAQUE disque séparé
  const disksContainer = document.getElementById('tmNavDisksContainer');
  if (disksContainer && diskList.length > 0) {
    diskList.forEach(d => {
      const diskCompId = `disk_${d.id}`;
      let card = document.getElementById(`tmNavCard_${d.id}`);
      if (!card) {
        card = document.createElement('div');
        card.id = `tmNavCard_${d.id}`;
        card.className = `perf-nav-card ${taskmgrState.selectedComp === diskCompId ? 'active' : ''}`;
        card.dataset.comp = diskCompId;
        card.style.setProperty('--card-color', diskColor);
        const raidBadge = d.is_raid ? ' [RAID]' : '';
        const typeBadge = d.media_type ? ` (${d.media_type}${raidBadge})` : '';
        const dTitle = taskmgrDiskTitle(d);
        card.innerHTML = `
          <div class="perf-nav-card-top">
            <div class="perf-nav-title-group">
              <span class="perf-nav-icon" id="tmNavIcon_disk_${d.id}">${getTaskmgrIcon('disk')}</span>
              <span class="perf-nav-title" id="tmSideDiskTitle_${d.id}">${escapeHtml(dTitle)}</span>
            </div>
            <span class="perf-nav-pct" id="tmSideDiskPct_${d.id}">0%</span>
          </div>
          <canvas class="perf-mini-canvas" id="tmMiniDiskCanvas_${d.id}"></canvas>
          <div class="perf-nav-card-bottom" id="tmSideDiskSub_${d.id}">${formatBytes(d.free)} libres</div>
        `;
        disksContainer.appendChild(card);
      }
      card.style.setProperty('--card-color', diskColor);

      const actVal = typeof d.active_percent === 'number' ? d.active_percent : (taskmgrState.history.disks[d.id]?.slice(-1)[0] || 0);
      const spdVal = ((d.total_speed || 0) / (1024 * 1024)).toFixed(1);
      const raidBadge = d.is_raid ? ' [RAID]' : '';
      const typeBadge = d.media_type ? ` (${d.media_type}${raidBadge})` : '';
      const dTitle = taskmgrDiskTitle(d);
      setEl(`tmSideDiskTitle_${d.id}`, dTitle);
      setEl(`tmSideDiskPct_${d.id}`, `${actVal.toFixed(0)}%`);
      setEl(`tmSideDiskSub_${d.id}`, `${spdVal} Mo/s • ${formatBytes(d.free)} libres (${d.percent}%)`);
      drawMiniPerfCanvas(`tmMiniDiskCanvas_${d.id}`, taskmgrState.history.disks[d.id], diskColor, 100);
    });
  }

  // 3. Zone détaillée du composant sélectionné
  if (taskmgrState.selectedComp === 'disk' && diskList.length > 0) {
    taskmgrState.selectedComp = `disk_${diskList[0].id}`;
  }
  const comp = taskmgrState.selectedComp || 'cpu';

  // Synchronisation de la sélection visuelle sur toutes les cartes à gauche
  document.querySelectorAll('.perf-nav-card').forEach(c => {
    const cComp = c.dataset.comp;
    const isMatch = (cComp === comp) || (comp === 'disk' && cComp?.startsWith('disk_') && cComp === `disk_${diskList[0].id}`);
    c.classList.toggle('active', !!isMatch);
  });

  // Badges de température avec contraste élevé
  const tempIconHtml = `<img src="static/icons/win98/temp.png" class="win98-custom-icon" style="width:13px;height:16px;vertical-align:-3px;margin-right:4px;" alt="Temp">`;
  const cpuT = Math.round(perf.cpu.temperature || 42);
  const cpuClass = cpuT >= 80 ? 'temp-hot' : (cpuT >= 60 ? 'temp-warm' : 'temp-normal');
  setHtml('tmCpuTempPill', `${tempIconHtml}CPU: <strong class="${cpuClass}">${cpuT}°C</strong>`);

  if (perf.gpu) {
    const gpuT = Math.round(perf.gpu.temperature || 50);
    const gpuClass = gpuT >= 80 ? 'temp-hot' : (gpuT >= 60 ? 'temp-warm' : 'temp-normal');
    const gpuShortName = (perf.gpu.name || 'GPU').split(' ')[0];
    setHtml('tmGpuTempPill', `${tempIconHtml}GPU (${gpuShortName}): <strong class="${gpuClass}">${gpuT}°C</strong>`);
  } else {
    setHtml('tmGpuTempPill', `${tempIconHtml}GPU: <strong class="temp-normal">N/A</strong>`);
  }

  const primaryDiskTemp = Math.round((diskList[0] && diskList[0].temperature) ? diskList[0].temperature : 36);
  const diskClass = primaryDiskTemp >= 80 ? 'temp-hot' : (primaryDiskTemp >= 60 ? 'temp-warm' : 'temp-normal');
  setHtml('tmDiskTempPill', `${tempIconHtml}Disque: <strong class="${diskClass}">${primaryDiskTemp}°C</strong>`);

  // Titres et métriques selon composant
  const nameEl = document.getElementById('tmDetailName');
  const subnameEl = document.getElementById('tmDetailSubname');
  const yMaxEl = document.getElementById('tmCanvasYMax');
  const canvasTitle = document.getElementById('tmCanvasTitle');
  const grid = document.getElementById('tmPerfMetricsGrid');
  const cpuSwitch = document.getElementById('tmCpuViewSwitch');
  const mainWrap = document.getElementById('tmMainPerfCanvasWrap');
  const coresGrid = document.getElementById('tmLogicalCoresGrid');

  let historyData = [];
  let maxY = 100;
  let strokeColor = '#0078d4';

  if (comp === 'cpu') {
    const cpuModelStr = perf.cpu.model || 'Processeur (CPU)';
    if (nameEl) nameEl.textContent = cpuModelStr;
    if (subnameEl) subnameEl.textContent = `${perf.cpu.cores_physical} cœurs physiques, ${perf.cpu.cores_logical} processeurs logiques`;
    if (yMaxEl) yMaxEl.textContent = '100%';
    if (canvasTitle) canvasTitle.textContent = `% d'utilisation sur 60 secondes`;
    historyData = taskmgrState.history.cpu;
    maxY = 100;
    strokeColor = getTaskmgrCompColor('cpu');

    if (cpuSwitch) cpuSwitch.style.display = 'flex';

    if (taskmgrState.cpuViewMode === 'logical') {
      if (mainWrap) mainWrap.style.display = 'none';
      if (coresGrid) {
        coresGrid.style.display = 'grid';
        const numCores = perf.cpu.cores_logical || (perf.cpu.per_core ? perf.cpu.per_core.length : 1);
        if (coresGrid.dataset.count !== String(numCores)) {
          let coresHtml = '';
          for (let i = 0; i < numCores; i++) {
            const corePct = (perf.cpu.per_core && perf.cpu.per_core[i] !== undefined) ? perf.cpu.per_core[i].toFixed(0) : '0';
            coresHtml += `
              <div class="perf-core-card">
                <div class="perf-core-card-top">
                  <span class="perf-core-name">Cœur ${i + 1}</span>
                  <span class="perf-core-pct" id="tmCorePct_${i}">${corePct}%</span>
                </div>
                <canvas class="perf-core-canvas" id="tmCoreCanvas_${i}"></canvas>
              </div>
            `;
          }
          coresGrid.innerHTML = coresHtml;
          coresGrid.dataset.count = String(numCores);
        } else {
          for (let i = 0; i < numCores; i++) {
            const corePct = (perf.cpu.per_core && perf.cpu.per_core[i] !== undefined) ? perf.cpu.per_core[i].toFixed(0) : '0';
            setEl(`tmCorePct_${i}`, `${corePct}%`);
          }
        }
        for (let i = 0; i < numCores; i++) {
          drawCorePerfCanvas(`tmCoreCanvas_${i}`, taskmgrState.history.cpuCores[i], strokeColor);
        }
      }
    } else {
      if (mainWrap) mainWrap.style.display = 'block';
      if (coresGrid) coresGrid.style.display = 'none';
    }

    if (grid) {
      grid.style.setProperty('--metric-color', strokeColor);
      grid.innerHTML = `
        <div class="perf-metric-card"><div class="perf-metric-label">Utilisation globale</div><div class="perf-metric-val">${perf.cpu.percent.toFixed(1)}%</div></div>
        <div class="perf-metric-card"><div class="perf-metric-label">Cœurs physiques / Threads</div><div class="perf-metric-val">${perf.cpu.cores_physical} / ${perf.cpu.cores_logical}</div></div>
        <div class="perf-metric-card"><div class="perf-metric-label">Température estimée</div><div class="perf-metric-val">${perf.cpu.temperature} °C</div></div>
      `;
    }
  } else {
    if (cpuSwitch) cpuSwitch.style.display = 'none';
    if (mainWrap) mainWrap.style.display = 'block';
    if (coresGrid) coresGrid.style.display = 'none';

    if (comp.startsWith('disk_')) {
      const diskId = comp.replace('disk_', '');
      const curDisk = diskList.find(d => d.id === diskId) || diskList[0] || {};
      const dNumStr = (curDisk.disk_number !== null && curDisk.disk_number !== undefined) ? `Disque ${curDisk.disk_number} ` : 'Disque ';
      const diskTypeLabel = curDisk.media_type || 'Inconnu';
      const isRaid = !!curDisk.is_raid;
      const raidLabel = isRaid ? 'Volume RAID configuré' : 'Non-RAID';
      const diskFriendlyModel = curDisk.model || curDisk.label || 'Disque local';

      if (nameEl) nameEl.textContent = `${taskmgrDiskTitle(curDisk)} - ${diskFriendlyModel}`;
      if (subnameEl) subnameEl.textContent = `${diskTypeLabel} • ${raidLabel} • ${curDisk.fstype || 'NTFS'} • ${formatBytes(curDisk.total || 0)}`;

      const diskHist = taskmgrState.history.disks[diskId] || [];
      if (yMaxEl) yMaxEl.textContent = '100%';
      if (canvasTitle) canvasTitle.textContent = `Temps d'activité (% sur 60 secondes)`;
      historyData = diskHist;
      maxY = 100;
      strokeColor = getTaskmgrCompColor('disk');

      if (grid) {
        grid.style.setProperty('--metric-color', strokeColor);
        grid.innerHTML = `
          <div class="perf-metric-card"><div class="perf-metric-label">Temps d'activité</div><div class="perf-metric-val">${((curDisk.active_percent !== undefined) ? curDisk.active_percent : 0).toFixed(0)}%</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Type de support</div><div class="perf-metric-val">${escapeHtml(diskTypeLabel)}</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Configuration RAID</div><div class="perf-metric-val">${isRaid ? '⚡ RAID' : 'Non-RAID'}</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Modèle / Nom</div><div class="perf-metric-val">${escapeHtml(diskFriendlyModel)}</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Espace utilisé</div><div class="perf-metric-val">${formatBytes(curDisk.used || 0)} / ${formatBytes(curDisk.total || 0)} (${curDisk.percent || 0}%)</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Espace disponible</div><div class="perf-metric-val">${formatBytes(curDisk.free || 0)}</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Débit de lecture</div><div class="perf-metric-val">${(((curDisk.read_bytes_sec || 0)) / (1024**2)).toFixed(2)} Mo/s</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Débit d'écriture</div><div class="perf-metric-val">${(((curDisk.write_bytes_sec || 0)) / (1024**2)).toFixed(2)} Mo/s</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Débit total combiné</div><div class="perf-metric-val">${(((curDisk.total_speed || 0)) / (1024**2)).toFixed(2)} Mo/s</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Système de fichiers</div><div class="perf-metric-val">${curDisk.fstype || 'NTFS'}</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Interface / Bus</div><div class="perf-metric-val">${escapeHtml(curDisk.bus_type || 'Standard')}</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Température du disque</div><div class="perf-metric-val">🌡️ ${curDisk.temperature ? curDisk.temperature + ' °C' : '36 °C'}</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Point de montage</div><div class="perf-metric-val">${curDisk.mountpoint || curDisk.letter}</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Emplacement</div><div class="perf-metric-val">${curDisk.is_system ? 'Interne (disque système)' : (String(curDisk.id || '').startsWith('net_') ? 'Réseau' : (curDisk.is_internal ? 'Interne' : 'Externe'))}</div></div>
        `;
      }
    } else if (comp === 'memory') {
      const ramTypeStr = perf.memory.ram_type || 'DDR';
      const ramSpeedStr = perf.memory.speed_mhz ? `${perf.memory.speed_mhz} MHz` : 'N/A';
      const ramSlotsStr = (perf.memory.slots_used && perf.memory.slots_total) ? `${perf.memory.slots_used} sur ${perf.memory.slots_total}` : (perf.memory.slots_used ? `${perf.memory.slots_used}` : 'N/A');

      if (perf.memory.unified) {
        const G = (v) => formatBytes(v || 0);
        if (nameEl) nameEl.textContent = `Mémoire unifiée (${ramTypeStr.replace(/^Unified\s*/i, '')})`;
        if (subnameEl) subnameEl.textContent = `${formatBytes(perf.memory.total)} partagés entre le CPU, le GPU et le Neural Engine • ${ramSpeedStr}`;
        if (yMaxEl) yMaxEl.textContent = '100%';
        if (canvasTitle) canvasTitle.textContent = `Utilisation de la mémoire unifiée sur 60 secondes`;
        historyData = taskmgrState.history.memory;
        maxY = 100;
        strokeColor = getTaskmgrCompColor('memory');
        if (grid) {
          grid.style.setProperty('--metric-color', strokeColor);
          grid.innerHTML = `
            <div class="perf-metric-card"><div class="perf-metric-label">Mémoire utilisée</div><div class="perf-metric-val">${G(perf.memory.used)} / ${G(perf.memory.total)} (${perf.memory.percent.toFixed(1)}%)</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Mémoire des apps</div><div class="perf-metric-val">${G(perf.memory.app)}</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Mémoire câblée</div><div class="perf-metric-val">${G(perf.memory.wired)}</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Compressée</div><div class="perf-metric-val">${G(perf.memory.compressed)}</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Utilisée par le GPU</div><div class="perf-metric-val">${G(perf.memory.gpu_used)}</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Fichiers en cache</div><div class="perf-metric-val">${G(perf.memory.cached)}</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Mémoire disponible</div><div class="perf-metric-val">${G(perf.memory.available)}</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Swap utilisé</div><div class="perf-metric-val">${G(perf.memory.swap_used)} / ${G(perf.memory.swap_total)}</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Type de mémoire</div><div class="perf-metric-val">${escapeHtml(ramTypeStr)}</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Capacité totale</div><div class="perf-metric-val">${G(perf.memory.total)}</div></div>
          `;
        }
      } else {
      if (nameEl) nameEl.textContent = `Mémoire système (${ramTypeStr})`;
      if (subnameEl) subnameEl.textContent = `${formatBytes(perf.memory.total)} ${ramTypeStr} • ${ramSpeedStr} • ${ramSlotsStr} emplacements`;
      if (yMaxEl) yMaxEl.textContent = '100%';
      if (canvasTitle) canvasTitle.textContent = `Utilisation de la mémoire sur 60 secondes`;
      historyData = taskmgrState.history.memory;
      maxY = 100;
      strokeColor = getTaskmgrCompColor('memory');

      if (grid) {
        grid.style.setProperty('--metric-color', strokeColor);
        grid.innerHTML = `
          <div class="perf-metric-card"><div class="perf-metric-label">Utilisation mémoire</div><div class="perf-metric-val">${formatBytes(perf.memory.used)} / ${formatBytes(perf.memory.total)} (${perf.memory.percent.toFixed(1)}%)</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Mémoire disponible</div><div class="perf-metric-val">${formatBytes(perf.memory.available)}</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Fréquence mémoire</div><div class="perf-metric-val">${ramSpeedStr}</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Type de mémoire</div><div class="perf-metric-val">${escapeHtml(ramTypeStr)}</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Emplacements / Slots</div><div class="perf-metric-val">${ramSlotsStr}</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Facteur de forme</div><div class="perf-metric-val">DIMM</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Mémoire libre</div><div class="perf-metric-val">${formatBytes(perf.memory.free || (perf.memory.total - perf.memory.used))}</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Capacité installée</div><div class="perf-metric-val">${formatBytes(perf.memory.total)}</div></div>
        `;
      }
      }
    } else if (comp === 'network') {
      if (nameEl) nameEl.textContent = 'Réseau (Ethernet / Wi-Fi)';
      if (subnameEl) subnameEl.textContent = `Trafic TCP/IP entrant et sortant`;
      const netHist = taskmgrState.history.network || [];
      const maxVal = Math.max(1, ...netHist) * 1.25;
      if (yMaxEl) yMaxEl.textContent = `${maxVal.toFixed(1)} Mo/s`;
      if (canvasTitle) canvasTitle.textContent = `Débit réseau cumulé (Mo/s)`;
      historyData = netHist;
      maxY = maxVal;
      strokeColor = getTaskmgrCompColor('network');

      if (grid) {
        grid.style.setProperty('--metric-color', strokeColor);
        grid.innerHTML = `
          <div class="perf-metric-card"><div class="perf-metric-label">Débit Réception</div><div class="perf-metric-val">${(((perf.network.recv_bytes_sec || 0)) / (1024**2)).toFixed(2)} Mo/s</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Débit Envoi</div><div class="perf-metric-val">${(((perf.network.sent_bytes_sec || 0)) / (1024**2)).toFixed(2)} Mo/s</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Débit Cumulé</div><div class="perf-metric-val">${netRateMo.toFixed(2)} Mo/s</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Total Reçu</div><div class="perf-metric-val">${formatBytes(perf.network.total_recv)}</div></div>
          <div class="perf-metric-card"><div class="perf-metric-label">Total Envoyé</div><div class="perf-metric-val">${formatBytes(perf.network.total_sent)}</div></div>
        `;
      }
    } else if (comp === 'gpu') {
      if (nameEl) nameEl.textContent = perf.gpu ? perf.gpu.name : 'Processeur Graphique (GPU)';
      if (subnameEl) subnameEl.textContent = perf.gpu ? `NVIDIA Driver & Accélération matérielle` : `Aucune sonde GPU dédiée détectée`;
      if (yMaxEl) yMaxEl.textContent = '100%';
      if (canvasTitle) canvasTitle.textContent = `% d'utilisation 3D / GPU sur 60 secondes`;
      historyData = taskmgrState.history.gpu;
      maxY = 100;
      strokeColor = getTaskmgrCompColor('gpu');

      if (grid) {
        grid.style.setProperty('--metric-color', strokeColor);
        if (perf.gpu && perf.gpu.unified_memory) {
          if (subnameEl) subnameEl.textContent = `Apple Silicon • Metal${perf.gpu.cores ? ' • ' + perf.gpu.cores + ' cœurs GPU' : ''} • mémoire unifiée (pas de VRAM dédiée)`;
          grid.innerHTML = `
            <div class="perf-metric-card"><div class="perf-metric-label">Utilisation GPU</div><div class="perf-metric-val">${perf.gpu.utilization_gpu.toFixed(0)}%</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Rendu (Renderer)</div><div class="perf-metric-val">${(perf.gpu.utilization_renderer || 0).toFixed(0)}%</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Géométrie (Tiler)</div><div class="perf-metric-val">${(perf.gpu.utilization_tiler || 0).toFixed(0)}%</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Mémoire unifiée utilisée</div><div class="perf-metric-val">${gpuVramUsedGo.toFixed(2)} Go</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Mémoire unifiée allouée</div><div class="perf-metric-val">${((perf.gpu.memory_allocated_mb || 0) / 1024).toFixed(2)} Go</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Cœurs GPU</div><div class="perf-metric-val">${perf.gpu.cores || 'N/A'}</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">API graphique</div><div class="perf-metric-val">Metal</div></div>
          `;
        } else if (perf.gpu) {
          grid.innerHTML = `
            <div class="perf-metric-card"><div class="perf-metric-label">Utilisation GPU 3D</div><div class="perf-metric-val">${perf.gpu.utilization_gpu.toFixed(0)}%</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Mémoire GPU (VRAM)</div><div class="perf-metric-val">${gpuVramUsedGo.toFixed(1)} / ${gpuVramTotalGo.toFixed(1)} Go (${gpuVramPct.toFixed(0)}%)</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Température GPU réelle</div><div class="perf-metric-val">🌡️ ${perf.gpu.temperature.toFixed(1)} °C</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Contrôleur mémoire VRAM</div><div class="perf-metric-val">${perf.gpu.utilization_memory.toFixed(0)}%</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">VRAM Disponible</div><div class="perf-metric-val">${Math.max(0, gpuVramTotalGo - gpuVramUsedGo).toFixed(1)} Go</div></div>
            <div class="perf-metric-card"><div class="perf-metric-label">Pilote / Moteur</div><div class="perf-metric-val">NVIDIA Direct3D / CUDA</div></div>
          `;
        } else {
          grid.innerHTML = `<div class="perf-metric-card"><div class="perf-metric-label">Statut</div><div class="perf-metric-val">Non compatible NVIDIA-SMI</div></div>`;
        }
      }
    }
  }

  // Gestion du deuxième graphique VRAM dédié au GPU
  const detailPane = document.getElementById('taskmgrPerfDetail');
  if (detailPane) {
    detailPane.classList.toggle('is-gpu-view', comp === 'gpu' && !(perf.gpu && perf.gpu.unified_memory));
  }

  const vramWrap = document.getElementById('tmGpuVramCanvasWrap');
  // Pas de graphique VRAM en mémoire unifiée : le GPU n'a pas de mémoire dédiée
  if (comp === 'gpu' && !(perf.gpu && perf.gpu.unified_memory)) {
    if (vramWrap) {
      vramWrap.style.display = 'block';
      const vramYMax = document.getElementById('tmGpuVramYMax');
      const vramTitle = document.getElementById('tmGpuVramCanvasTitle');
      const maxVramVal = Math.max(1, gpuVramTotalGo);
      if (vramYMax) vramYMax.textContent = `${maxVramVal.toFixed(1)} Go`;
      if (vramTitle) {
        vramTitle.innerHTML = `Utilisation de la mémoire GPU dédiée (VRAM) : <strong>${gpuVramUsedGo.toFixed(1)} / ${gpuVramTotalGo.toFixed(1)} Go (${gpuVramPct.toFixed(0)}%)</strong>`;
      }
      const vramStrokeColor = '#ffff00';
      drawMainPerfCanvas('tmGpuVramCanvas', taskmgrState.history.gpuVram, maxVramVal, vramStrokeColor);
    }
  } else {
    if (vramWrap) vramWrap.style.display = 'none';
  }

  // Tracer le grand graphique Canvas principal (si affiché)
  if (comp !== 'cpu' || taskmgrState.cpuViewMode !== 'logical') {
    drawMainPerfCanvas('tmMainPerfCanvas', historyData, maxY, strokeColor);
  }

  // Mettre à jour les icônes multi-thèmes (Moderne vs Rétro)
  updateTaskmgrIcons();
}

function updateTaskmgrIcons() {
  const setIcon = (id, svg) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = svg;
  };
  setIcon('tmNavIcon_cpu', getTaskmgrIcon('cpu'));
  setIcon('tmNavIcon_memory', getTaskmgrIcon('memory'));
  setIcon('tmNavIcon_network', getTaskmgrIcon('network'));
  setIcon('tmNavIcon_gpu', getTaskmgrIcon('gpu'));

  const disksContainer = document.getElementById('tmNavDisksContainer');
  if (disksContainer) {
    disksContainer.querySelectorAll('.perf-nav-icon').forEach(iconEl => {
      iconEl.innerHTML = getTaskmgrIcon('disk');
    });
  }

  const comp = taskmgrState.selectedComp || 'cpu';
  const baseComp = comp.startsWith('disk_') ? 'disk' : comp;
  setIcon('tmDetailIcon', getTaskmgrIcon(baseComp));

  // Onglets Processus et Performances
  const tabProc = document.getElementById('taskmgrTabProcesses');
  const tabPerf = document.getElementById('taskmgrTabPerformance');
  if (tabProc) {
    tabProc.innerHTML = `<img src="static/icons/win98/processes.png" class="win98-custom-icon" style="width:16px;height:16px;margin-right:6px;" alt="Processus"><span>Processus</span>`;
  }
  if (tabPerf) {
    tabPerf.innerHTML = `<img src="static/icons/win98/perf.png" class="win98-custom-icon" style="width:16px;height:16px;margin-right:6px;" alt="Performances"><span>Performances</span>`;
  }
}

// Libellé d'un disque façon macOS : nom du volume + emplacement (système / interne / externe / réseau)
function taskmgrDiskTitle(d) {
  const label = d.label || d.name || d.letter || 'Disque';
  let kind;
  if (d.is_system) kind = 'disque système';
  else if (String(d.id || '').startsWith('net_')) kind = 'réseau';
  else if (d.is_internal) kind = 'interne';
  else kind = 'externe';
  return `${label} (${kind})`;
}

function drawMiniPerfCanvas(canvasId, data, color, fixedMax = 100) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = getWin98GridColor(color);
  ctx.lineWidth = 0.8;
  for (let y = 8; y < h; y += 10) {
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke();
  }

  if (!data || data.length === 0) return;

  const maxVal = fixedMax ? fixedMax : Math.max(1, ...data) * 1.1;
  const totalSlots = 60;
  const stepX = w / (totalSlots - 1);
  const getX = (i) => Math.max(0, w - (data.length - 1 - i) * stepX);

  ctx.beginPath();
  data.forEach((val, i) => {
    const clampedVal = Math.min(maxVal, Math.max(0, val || 0));
    const x = getX(i);
    const y = Math.max(2, Math.min(h - 2, h - (clampedVal / maxVal) * (h - 4) - 2));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function getWin98GridColor(hex) {
  if (hex && hex.startsWith('#') && hex.length === 7) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${Math.round(r * 0.28)}, ${Math.round(g * 0.28)}, ${Math.round(b * 0.28)}, 0.95)`;
  }
  return `${hex}40`;
}

function drawCorePerfCanvas(canvasId, data, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = getWin98GridColor(color);
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 16) {
    ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 12) {
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke();
  }

  if (!data || data.length === 0) return;

  const totalSlots = 60;
  const stepX = w / (totalSlots - 1);
  const getX = (i) => Math.max(0, w - (data.length - 1 - i) * stepX);

  // Surface remplie sous la courbe
  ctx.beginPath();
  ctx.moveTo(getX(0), h);
  data.forEach((val, i) => {
    const x = getX(i);
    const y = h - (Math.min(100, Math.max(0, val)) / 100) * (h - 4);
    ctx.lineTo(x, y);
  });
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = `${color}20`;
  ctx.fill();

  // Ligne de tracé de la courbe (aucun point sur la fin)
  ctx.beginPath();
  data.forEach((val, i) => {
    const x = getX(i);
    const y = h - (Math.min(100, Math.max(0, val)) / 100) * (h - 4);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.7;
  ctx.stroke();
}

function drawMainPerfCanvas(canvasId, data, maxVal, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  // Fond noir d'époque CRT Task Manager
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  // Grille de la même couleur que la courbe en teinte sombre CRT
  ctx.strokeStyle = getWin98GridColor(color);
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }

  if (!data || data.length === 0) return;

  const mVal = Math.max(1, maxVal);
  const totalSlots = 60;
  const stepX = w / (totalSlots - 1);
  const getX = (i) => Math.max(0, w - (data.length - 1 - i) * stepX);

  // Surface remplie sous la courbe
  ctx.beginPath();
  ctx.moveTo(getX(0), h);
  data.forEach((val, i) => {
    const x = getX(i);
    const y = h - (val / mVal) * (h - 10);
    ctx.lineTo(x, y);
  });
  ctx.lineTo(w, h);
  ctx.closePath();

  ctx.fillStyle = `${color}25`;
  ctx.fill();

  // Ligne de tracé de la courbe (adopte la couleur spécifique au composant, SANS point à la fin)
  ctx.beginPath();
  data.forEach((val, i) => {
    const x = getX(i);
    const y = h - (val / mVal) * (h - 10);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'round';
  ctx.stroke();
  // Remarque : aucun point/carré/cercle n'est dessiné à la fin de la ligne !
}

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const savedColWidths = JSON.parse(localStorage.getItem('explorer_col_widths'));
    if (savedColWidths && typeof savedColWidths === 'object') {
      state.columnWidths = Object.assign({}, DEFAULT_COLUMN_WIDTHS, savedColWidths);
    } else {
      state.columnWidths = Object.assign({}, DEFAULT_COLUMN_WIDTHS);
    }
    // Nettoyage ou réinitialisation des largeurs corrompues si 'name' < 150px
    if (!state.columnWidths.name || state.columnWidths.name < 150) {
      state.columnWidths.name = DEFAULT_COLUMN_WIDTHS.name;
      try {
        localStorage.setItem('explorer_col_widths', JSON.stringify(state.columnWidths));
      } catch (err) {}
    }
  } catch (err) {
    state.columnWidths = Object.assign({}, DEFAULT_COLUMN_WIDTHS);
  }

  try {
    const savedColOrder = JSON.parse(localStorage.getItem('explorer_columns_order') || localStorage.getItem('explorer_col_order'));
    if (Array.isArray(savedColOrder) && savedColOrder.length > 0) {
      const defaultCols = ['name', 'modified', 'type_desc', 'size'];
      const validCols = savedColOrder.filter(c => defaultCols.includes(c));
      defaultCols.forEach(c => {
        if (!validCols.includes(c)) validCols.push(c);
      });
      state.columnOrder = validCols;
    }
  } catch (err) {}

  const savedTheme = 'windows98';
  localStorage.setItem('explorer_theme', savedTheme);
  applyTheme(savedTheme);
  makeTransferDialogDraggable();
  initGlobalRailToggle();
  initSidebarResizer();
  initPreviewResizer();
  initWindowControls();
  initTaskmgr();

  // Synchronisation du presse-papier global inter-fenêtres
  if (window.electronAPI?.getClipboard) {
    window.electronAPI.getClipboard().then((clip) => {
      if (clip) {
        state.clipboard = clip;
        updateToolbarState();
      }
    }).catch(() => {});
  }
  if (window.electronAPI?.onClipboardChanged) {
    window.electronAPI.onClipboardChanged((clip) => {
      state.clipboard = clip;
      updateToolbarState();
      if (!state.previewSelection) {
        renderFolder();
      }
    });
  }

  // Écoute des événements de rafraîchissement global inter-fenêtres
  const api = window.api || window.electronAPI;
  if (api?.onSettingsChanged) {
    api.onSettingsChanged((data) => {
      if (data && data.theme && data.theme !== state.theme) {
        applyTheme(data.theme, true);
      }
    });
  }
  let refreshDebounceTimer = null;
  const debouncedRefresh = () => {
    if (refreshDebounceTimer) clearTimeout(refreshDebounceTimer);
    refreshDebounceTimer = setTimeout(async () => {
      await fetchDrives();
      renderSidebarDrives();
      refresh();
      setTimeout(async () => {
        await fetchDrives();
        renderSidebarDrives();
        const tab = getActiveTab();
        if (tab && !tab.path) {
          renderHome(state.drives);
        }
      }, 500);
    }, 150);
  };

  if (api?.onRefreshAllWindows) {
    api.onRefreshAllWindows(debouncedRefresh);
  }
  if (api?.onRefreshTriggered) {
    api.onRefreshTriggered(debouncedRefresh);
  }

  initEvents();

  // ===================== SURVEILLANCE DES LECTEURS (branchement/débranchement) =====================
  // Interroge régulièrement la liste des disques et rafraîchit l'interface si elle change.
  (function startDriveWatcher() {
    let lastSignature = '';
    const driveSignature = (list) => (list || []).map(d =>
      [d.mountpoint || d.path || d.label, d.fstype || '', d.is_network ? 'n' : 'l', d.total || 0].join('|')
    ).sort().join(';;');

    const tick = async () => {
      try {
        const res = await fetch('/api/drives');
        if (!res.ok) return;
        const drives = await res.json();
        const sig = driveSignature(drives);
        if (!lastSignature) { lastSignature = sig; return; }
        if (sig === lastSignature) return;
        lastSignature = sig;
        state.drives = drives;
        renderSidebarDrives();
        const tab = getActiveTab();
        if (tab && !tab.path) {
          renderHome(state.drives);
        } else {
          // Rafraîchit la barre latérale et laisse la navigation en cours intacte
          renderSidebarDrives();
        }
        showToast('Lecteurs mis à jour', 'info');
      } catch (e) {
        // silencieux : le backend peut être occupé
      }
    };

    // Premier relevé de référence puis surveillance toutes les 3 secondes
    tick();
    setInterval(tick, 3000);
  })();

  // Attente rapide et résiliente si le backend est en cours de démarrage initial
  for (let attempt = 0; attempt < 8; attempt++) {
    const drives = await fetchDrives();
    if (drives && drives.length > 0) break;
    await new Promise(r => setTimeout(r, 150));
  }
  await fetchFavorites();

  // Initialisation multi-fenêtres / restauration d'onglet détaché
  let initData = null;
  if (window.electronAPI?.getInitData) {
    try {
      initData = await window.electronAPI.getInitData();
    } catch (err) {}
  }

  if (initData?.picker) {
    enterPickerMode(initData.picker);
  }

  if (initData?.tabData) {
    const td = initData.tabData;
    const tab = createTab(td.path);
    if (Array.isArray(td.history) && td.history.length > 0) {
      tab.history = td.history;
      tab.historyIndex = typeof td.historyIndex === 'number' ? td.historyIndex : td.history.length - 1;
    }
    if (td.title) tab.title = td.title;
    renderTabs();
    if (td.path) {
      loadFolder(td.path, false);
    } else {
      loadHome();
    }
  } else if (initData?.initialPath) {
    createTab(initData.initialPath);
  } else {
    createTab(null);
  }
});

// ==============================================================================
// ===================== WINDIRSTAT — ANALYSEUR D'ESPACE DISQUE =================
// ==============================================================================

const wdsState = {
  initialized: false,
  taskId: null,
  pollTimer: null,
  rootPath: null,
  rootTree: null,
  zoomNode: null,
  extensions: [],
  extColors: {},
  expandedPaths: new Set(),
  selectedPath: null,
  selectedNode: null,
  selectedExt: null,
  treemapRects: [],
  hoveredRect: null,
  pickerSelectedPath: '/',
  pickerExpanded: new Set(),
};

function getWdsHomeDir() {
  if (Array.isArray(state.favorites)) {
    for (const fav of state.favorites) {
      if (fav && fav.path) {
        const m = fav.path.match(/^(\/Users\/[^/]+)/);
        if (m) return m[1];
      }
    }
  }
  return '/Users';
}

function populateWdsDriveSelect() {
  const sel = document.getElementById('wdsDriveSelect');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '';

  const drives = Array.isArray(state.drives) ? state.drives : [];
  drives.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.mountpoint;
    opt.textContent = `${d.label} (${d.mountpoint}) — ${d.free_formatted} libres / ${d.total_formatted}`;
    sel.appendChild(opt);
  });

  const homeDir = getWdsHomeDir();
  if (homeDir && homeDir !== '/Users') {
    const optHome = document.createElement('option');
    optHome.value = homeDir;
    optHome.textContent = `Dossier personnel (${homeDir})`;
    sel.appendChild(optHome);
  }

  if (Array.isArray(state.favorites)) {
    state.favorites.forEach(fav => {
      if (fav && fav.path) {
        const opt = document.createElement('option');
        opt.value = fav.path;
        opt.textContent = `${fav.name} (${fav.path})`;
        sel.appendChild(opt);
      }
    });
  }

  if (prev && Array.from(sel.options).some(o => o.value === prev)) {
    sel.value = prev;
  } else if (homeDir && Array.from(sel.options).some(o => o.value === homeDir)) {
    sel.value = homeDir;
  }
}

function initWdsEvents() {
  if (wdsState.initialized) return;
  wdsState.initialized = true;

  const btnScanDrive = document.getElementById('wdsBtnScanDrive');
  const btnPickFolder = document.getElementById('wdsBtnPickFolder');
  const btnOpenExp = document.getElementById('wdsBtnOpenExplorer');
  const btnRefresh = document.getElementById('wdsBtnRefresh');
  const btnCancel = document.getElementById('wdsBtnCancel');
  const selDrive = document.getElementById('wdsDriveSelect');

  if (btnScanDrive) {
    btnScanDrive.onclick = () => {
      const target = (selDrive && selDrive.value) || '/';
      startWdsScan(target);
    };
  }
  if (btnPickFolder) {
    btnPickFolder.onclick = () => openSpacePickerModal();
  }
  if (btnOpenExp) {
    btnOpenExp.onclick = () => {
      const p = wdsState.selectedPath || wdsState.rootPath;
      if (!p) return;
      const targetDir = (wdsState.selectedNode && !wdsState.selectedNode.is_dir)
        ? (p.substring(0, p.lastIndexOf('/')) || '/')
        : p;
      switchView('explorer');
      navigateTo(targetDir);
    };
  }
  if (btnRefresh) {
    btnRefresh.onclick = () => {
      const target = wdsState.rootPath || (selDrive && selDrive.value) || getWdsHomeDir();
      startWdsScan(target);
    };
  }
  if (btnCancel) {
    btnCancel.onclick = () => cancelWdsScan();
  }

  // Modal Picker events
  const pickerOverlay = document.getElementById('spacePickerModalOverlay');
  const pickerClose = document.getElementById('spacePickerCloseBtn');
  const pickerCancel = document.getElementById('spacePickerCancelBtn');
  const pickerConfirm = document.getElementById('spacePickerConfirmBtn');
  const pickerInput = document.getElementById('spacePickerPathInput');

  const closePicker = () => {
    if (pickerOverlay) pickerOverlay.style.display = 'none';
  };
  if (pickerClose) pickerClose.onclick = closePicker;
  if (pickerCancel) pickerCancel.onclick = closePicker;
  if (pickerOverlay) {
    pickerOverlay.onclick = (e) => {
      if (e.target === pickerOverlay) closePicker();
    };
  }
  if (pickerConfirm) {
    pickerConfirm.onclick = () => {
      const val = (pickerInput && pickerInput.value.trim()) || wdsState.pickerSelectedPath || '/';
      closePicker();
      startWdsScan(val);
    };
  }

  // Resizers (Top vertical & Main horizontal)
  // Les vues Espace / Clonage / Flash / Réseau sont agrandies en CSS (zoom) : les pixels
  // mesurés à l'écran (getBoundingClientRect, clientX/Y) doivent être reconvertis en pixels
  // de mise en page avant d'être appliqués aux styles, sinon le redimensionnement dérive.
  const getViewZoomScale = (el) => {
    let node = el;
    while (node && node !== document.body) {
      const zoomValue = parseFloat(getComputedStyle(node).zoom);
      if (zoomValue && zoomValue !== 1) return zoomValue;
      node = node.parentElement;
    }
    return 1;
  };

  const topResizer = document.getElementById('wdsTopResizer');
  const treePane = document.getElementById('wdsTreePane');
  const extPane = document.getElementById('wdsExtPane');
  if (topResizer && treePane && extPane) {
    topResizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const scale = getViewZoomScale(treePane);
      const startTreeW = treePane.getBoundingClientRect().width;
      const startExtW = extPane.getBoundingClientRect().width;
      const totalW = startTreeW + startExtW;
      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const newTreeW = Math.max(200, Math.min(totalW - 180, startTreeW + dx));
        treePane.style.flex = `0 0 ${newTreeW / scale}px`;
        extPane.style.flex = '1 1 0';
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  const mainResizer = document.getElementById('wdsMainResizer');
  const topSplit = document.getElementById('wdsTopSplit');
  if (mainResizer && topSplit) {
    mainResizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const startY = e.clientY;
      const scale = getViewZoomScale(topSplit);
      const startH = topSplit.getBoundingClientRect().height;
      const onMove = (ev) => {
        const dy = ev.clientY - startY;
        const newH = Math.max(120, Math.min(window.innerHeight - 240, startH + dy));
        topSplit.style.height = `${newH / scale}px`;
        renderWdsTreemap();
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  // Treemap Canvas mouse events + ResizeObserver
  const canvas = document.getElementById('wdsTreemapCanvas');
  const pane = document.getElementById('wdsTreemapPane');
  if (canvas) {
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = findWdsRectAt(mx, my);
      if (hit !== wdsState.hoveredRect) {
        wdsState.hoveredRect = hit;
        const statusEl = document.getElementById('wdsStatusSelected');
        if (statusEl) {
          if (hit) {
            const rootSz = (wdsState.zoomNode && wdsState.zoomNode.size) || 1;
            const pct = ((hit.node.size / rootSz) * 100).toFixed(1);
            statusEl.textContent = `${hit.node.path} — ${formatBytes(hit.node.size)} (${pct}%)`;
          } else if (wdsState.selectedNode) {
            statusEl.textContent = `${wdsState.selectedNode.path} — ${formatBytes(wdsState.selectedNode.size)}`;
          } else {
            statusEl.textContent = wdsState.rootPath || 'Prêt';
          }
        }
      }
    });

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = findWdsRectAt(mx, my);
      if (hit && hit.node) {
        wdsState.selectedExt = null;
        wdsSelectNode(hit.node, true);
      }
    });

    canvas.addEventListener('dblclick', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = findWdsRectAt(mx, my);
      if (hit && hit.node) {
        if (hit.node.is_dir) {
          wdsSetZoomNode(hit.node);
        } else if (hit.parentDirNode && hit.parentDirNode !== wdsState.zoomNode) {
          wdsSetZoomNode(hit.parentDirNode);
        }
      }
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = findWdsRectAt(mx, my);
      if (hit && hit.node) {
        wdsState.selectedExt = null;
        wdsSelectNode(hit.node, true);
        openWdsNodeContextMenu(e, hit.node);
      }
    });
  }

  if (pane && typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      if (state.currentView === 'space' && wdsState.zoomNode) {
        renderWdsTreemap();
      }
    });
    ro.observe(pane);
  }
}

function onEnterSpaceView() {
  initWdsEvents();
  populateWdsDriveSelect();
  if (!wdsState.rootTree && !wdsState.taskId) {
    openSpacePickerModal();
  } else {
    setTimeout(() => renderWdsTreemap(), 40);
  }
}

async function openSpacePickerModal() {
  initWdsEvents();
  populateWdsDriveSelect();

  const overlay = document.getElementById('spacePickerModalOverlay');
  const drivesList = document.getElementById('spacePickerDrivesList');
  const treeContainer = document.getElementById('spacePickerTreeContainer');
  const pathInput = document.getElementById('spacePickerPathInput');
  const pickerClose = document.getElementById('spacePickerCloseBtn');
  const pickerCancel = document.getElementById('spacePickerCancelBtn');
  const pickerConfirm = document.getElementById('spacePickerConfirmBtn');

  if (!overlay || !drivesList || !treeContainer || !pathInput) return;

  const closePicker = () => {
    overlay.style.display = 'none';
  };
  if (pickerClose) pickerClose.onclick = closePicker;
  if (pickerCancel) pickerCancel.onclick = closePicker;
  if (pickerConfirm) {
    pickerConfirm.onclick = () => {
      const val = (pathInput && pathInput.value.trim()) || wdsState.pickerSelectedPath || '/';
      closePicker();
      startWdsScan(val);
    };
  }
  overlay.onclick = (e) => {
    if (e.target === overlay) closePicker();
  };

  const defaultPath = wdsState.rootPath || getWdsHomeDir() || '/';
  wdsState.pickerSelectedPath = defaultPath;
  pathInput.value = defaultPath;

  // 1. Render Drives list
  drivesList.innerHTML = '';
  const drives = Array.isArray(state.drives) ? state.drives : [];
  drives.forEach(d => {
    const row = document.createElement('div');
    row.className = `wds-picker-drive-row ${d.mountpoint === wdsState.pickerSelectedPath ? 'selected' : ''}`;
    row.innerHTML = `
      <span style="display:flex;align-items:center;width:20px;height:20px;">${getDriveCardIcon(d)}</span>
      <strong style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(d.label)} (${escapeHtml(d.mountpoint)})</strong>
      <span style="font-size:11px;opacity:0.85;">${escapeHtml(d.free_formatted)} libres / ${escapeHtml(d.total_formatted)}</span>
    `;
    row.onclick = () => {
      drivesList.querySelectorAll('.wds-picker-drive-row').forEach(r => r.classList.remove('selected'));
      treeContainer.querySelectorAll('.wds-picker-node-row').forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');
      wdsState.pickerSelectedPath = d.mountpoint;
      pathInput.value = d.mountpoint;
    };
    row.ondblclick = () => {
      overlay.style.display = 'none';
      startWdsScan(d.mountpoint);
    };
    drivesList.appendChild(row);
  });

  // 2. Render expandable Directory Tree
  treeContainer.innerHTML = '';
  const rootEntries = [];
  const homeDir = getWdsHomeDir();
  if (homeDir && homeDir !== '/Users') {
    rootEntries.push({ name: `Dossier personnel (${homeDir})`, path: homeDir, has_children: true, autoExpand: true });
  }
  drives.forEach(d => {
    rootEntries.push({ name: `${d.label} (${d.mountpoint})`, path: d.mountpoint, has_children: true, autoExpand: false });
  });

  const renderTreeBranch = (parentEl, items, depth) => {
    items.forEach(item => {
      const nodeWrap = document.createElement('div');
      const row = document.createElement('div');
      row.className = `wds-picker-node-row ${item.path === wdsState.pickerSelectedPath ? 'selected' : ''}`;
      row.style.paddingLeft = `${4 + depth * 16}px`;

      const toggleBtn = document.createElement('span');
      toggleBtn.className = `wds-tree-toggle ${item.has_children ? '' : 'empty'}`;
      toggleBtn.textContent = item.has_children ? '+' : '';

      const iconSpan = document.createElement('span');
      iconSpan.style.display = 'inline-flex';
      iconSpan.innerHTML = getIcon('folder');

      const labelSpan = document.createElement('span');
      labelSpan.textContent = item.name;

      row.appendChild(toggleBtn);
      row.appendChild(iconSpan);
      row.appendChild(labelSpan);

      const childrenContainer = document.createElement('div');
      childrenContainer.style.display = 'none';

      let loaded = false;
      let expanded = false;

      const toggleExpand = async (e) => {
        if (e) e.stopPropagation();
        if (!item.has_children) return;
        expanded = !expanded;
        toggleBtn.textContent = expanded ? '−' : '+';
        childrenContainer.style.display = expanded ? 'block' : 'none';
        if (expanded && !loaded) {
          loaded = true;
          childrenContainer.innerHTML = `<div style="padding-left:${20 + depth * 16}px;color:#666;font-size:11px;">Chargement...</div>`;
          try {
            const res = await fetch(`/api/space/tree-dirs?path=${encodeURIComponent(item.path)}`);
            const data = await res.json();
            childrenContainer.innerHTML = '';
            if (res.ok && Array.isArray(data.dirs) && data.dirs.length > 0) {
              renderTreeBranch(childrenContainer, data.dirs, depth + 1);
            } else {
              toggleBtn.className = 'wds-tree-toggle empty';
              toggleBtn.textContent = '';
            }
          } catch (err) {
            childrenContainer.innerHTML = '';
          }
        }
      };

      toggleBtn.onclick = toggleExpand;
      row.onclick = () => {
        drivesList.querySelectorAll('.wds-picker-drive-row').forEach(r => r.classList.remove('selected'));
        treeContainer.querySelectorAll('.wds-picker-node-row').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        wdsState.pickerSelectedPath = item.path;
        pathInput.value = item.path;
      };
      row.ondblclick = () => toggleExpand();

      nodeWrap.appendChild(row);
      nodeWrap.appendChild(childrenContainer);
      parentEl.appendChild(nodeWrap);

      if (item.autoExpand) {
        toggleExpand();
      }
    });
  };

  renderTreeBranch(treeContainer, rootEntries, 0);
  overlay.style.display = 'flex';
}

async function startWdsScan(targetPath) {
  if (!targetPath) return;
  if (wdsState.pollTimer) {
    clearInterval(wdsState.pollTimer);
    wdsState.pollTimer = null;
  }

  const selDrive = document.getElementById('wdsDriveSelect');
  if (selDrive) {
    if (!Array.from(selDrive.options).some(o => o.value === targetPath)) {
      const customOpt = document.createElement('option');
      customOpt.value = targetPath;
      customOpt.textContent = `📂 ${targetPath}`;
      selDrive.appendChild(customOpt);
    }
    selDrive.value = targetPath;
  }

  const banner = document.getElementById('wdsScanBanner');
  const statusTxt = document.getElementById('wdsScanStatusText');
  const curDirTxt = document.getElementById('wdsScanCurrentDir');
  const btnCancel = document.getElementById('wdsBtnCancel');

  if (banner) banner.style.display = 'flex';
  if (statusTxt) statusTxt.textContent = `Analyse de ${targetPath} en cours...`;
  if (curDirTxt) curDirTxt.textContent = targetPath;
  if (btnCancel) btnCancel.style.display = 'inline-flex';

  try {
    const res = await fetch('/api/space/scan/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: targetPath, max_depth: 6 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Erreur au lancement de l\'analyse');

    wdsState.taskId = data.task_id;
    wdsState.rootPath = data.root_path;

    wdsState.pollTimer = setInterval(async () => {
      try {
        const sRes = await fetch(`/api/space/scan/status/${encodeURIComponent(wdsState.taskId)}`);
        if (!sRes.ok) return;
        const st = await sRes.json();

        if (statusTxt) {
          statusTxt.textContent = `Analyse en cours : ${st.scanned_files.toLocaleString('fr-FR')} fichiers, ${st.scanned_dirs.toLocaleString('fr-FR')} dossiers (${st.total_formatted})`;
        }
        if (curDirTxt) {
          curDirTxt.textContent = st.current_dir || '';
        }

        if (st.status === 'done' || st.status === 'cancelled' || st.status === 'error') {
          clearInterval(wdsState.pollTimer);
          wdsState.pollTimer = null;
          if (banner) banner.style.display = 'none';
          if (btnCancel) btnCancel.style.display = 'none';

          if (st.status === 'error') {
            showToast(`Erreur d'analyse : ${st.error}`, 'error');
            return;
          }

          wdsState.rootTree = st.tree;
          wdsState.zoomNode = st.tree;
          wdsState.extensions = st.extensions || [];
          wdsState.extColors = {};
          wdsState.extensions.forEach(e => {
            wdsState.extColors[e.ext] = e.color;
          });
          wdsState.expandedPaths = new Set([st.root_path]);
          wdsState.selectedPath = st.root_path;
          wdsState.selectedNode = st.tree;
          wdsState.selectedExt = null;

          updateWdsToolbarButtons();
          renderWdsTreeTable();
          renderWdsExtTable();
          renderWdsTreemap();

          const sumEl = document.getElementById('wdsStatusSummary');
          if (sumEl && st.tree) {
            sumEl.textContent = `${st.scanned_files.toLocaleString('fr-FR')} fichiers • ${st.scanned_dirs.toLocaleString('fr-FR')} dossiers • Total : ${formatBytes(st.tree.size)}`;
          }
          const selEl = document.getElementById('wdsStatusSelected');
          if (selEl && st.tree) {
            selEl.textContent = `${st.tree.path} — ${formatBytes(st.tree.size)} (100%)`;
          }
        }
      } catch (e) {}
    }, 220);
  } catch (err) {
    if (banner) banner.style.display = 'none';
    if (btnCancel) btnCancel.style.display = 'none';
    showToast(err.message, 'error');
  }
}

async function cancelWdsScan() {
  if (!wdsState.taskId) return;
  try {
    await fetch(`/api/space/scan/cancel/${encodeURIComponent(wdsState.taskId)}`, { method: 'POST' });
  } catch (e) {}
}

function updateWdsToolbarButtons() {
  const btnOpenExp = document.getElementById('wdsBtnOpenExplorer');
  if (btnOpenExp) {
    btnOpenExp.disabled = !wdsState.selectedPath && !wdsState.rootPath;
  }
}

function wdsSetZoomNode(node) {
  if (!node || !node.is_dir) return;
  wdsState.zoomNode = node;
  wdsState.expandedPaths.add(node.path);
  updateWdsToolbarButtons();
  renderWdsTreeTable();
  renderWdsTreemap();
}

function wdsFindNodeAndAncestors(targetPath, cur = wdsState.rootTree, ancestors = []) {
  if (!cur) return null;
  if (cur.path === targetPath) return { node: cur, ancestors };
  if (Array.isArray(cur.children)) {
    for (const ch of cur.children) {
      if (targetPath === ch.path || targetPath.startsWith(ch.path === '/' ? '/' : ch.path + '/')) {
        const res = wdsFindNodeAndAncestors(targetPath, ch, [...ancestors, cur]);
        if (res) return res;
      }
    }
  }
  return null;
}

function wdsZoomToParent() {
  if (!wdsState.zoomNode || !wdsState.rootTree) return;
  const found = wdsFindNodeAndAncestors(wdsState.zoomNode.path);
  if (found && found.ancestors.length > 0) {
    wdsSetZoomNode(found.ancestors[found.ancestors.length - 1]);
  } else {
    wdsSetZoomNode(wdsState.rootTree);
  }
}

function wdsSelectNode(node, scrollTree = false) {
  if (!node) return;
  wdsState.selectedNode = node;
  wdsState.selectedPath = node.path;

  if (scrollTree) {
    const found = wdsFindNodeAndAncestors(node.path);
    if (found && found.ancestors) {
      found.ancestors.forEach(a => wdsState.expandedPaths.add(a.path));
    }
  }

  updateWdsToolbarButtons();
  renderWdsTreeTable();
  renderWdsExtTable();
  renderWdsTreemap();

  const selEl = document.getElementById('wdsStatusSelected');
  if (selEl && wdsState.rootTree) {
    const pct = wdsState.rootTree.size > 0 ? ((node.size / wdsState.rootTree.size) * 100).toFixed(1) : '0.0';
    selEl.textContent = `${node.path} — ${formatBytes(node.size)} (${pct}%)`;
  }

  if (scrollTree) {
    const tbody = document.getElementById('wdsTreeBody');
    if (tbody) {
      const selRow = tbody.querySelector('tr.selected');
      if (selRow) selRow.scrollIntoView({ block: 'nearest' });
    }
  }
}

function renderWdsTreeTable() {
  const tbody = document.getElementById('wdsTreeBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!wdsState.rootTree) return;

  const rootTotal = Math.max(1, wdsState.rootTree.size || 1);
  const frag = document.createDocumentFragment();

  function addRow(node, depth, parentSize) {
    const tr = document.createElement('tr');
    const isSel = (wdsState.selectedNode === node) || (!node.is_grouped && wdsState.selectedPath === node.path);
    if (isSel) tr.classList.add('selected');

    const hasChildren = node.is_dir && Array.isArray(node.children) && node.children.length > 0;
    const isExpanded = hasChildren && wdsState.expandedPaths.has(node.path);
    const pctParent = parentSize > 0 ? Math.min(100, (node.size / parentSize) * 100) : 100;
    const pctRoot = ((node.size / rootTotal) * 100).toFixed(1);

    const iconHtml = node.is_dir
      ? getIcon('folder')
      : (node.ext ? getFileIcon({ name: node.name, ext: node.ext, is_dir: false }) : getIcon('file'));

    tr.innerHTML = `
      <td>
        <div class="wds-tree-cell" style="padding-left:${depth * 14}px;">
          <span class="wds-tree-toggle ${hasChildren ? '' : 'empty'}">${hasChildren ? (isExpanded ? '−' : '+') : ''}</span>
          <span style="display:inline-flex;align-items:center;">${iconHtml}</span>
          <span title="${escapeHtml(node.path)}">${escapeHtml(node.name)}</span>
        </div>
      </td>
      <td>
        <div class="wds-subtree-bar-wrap">
          <div class="wds-subtree-bar-fill" style="width:${pctParent.toFixed(1)}%;"></div>
        </div>
      </td>
      <td style="text-align:right;font-weight:bold;">${formatBytes(node.size)}</td>
      <td style="text-align:right;">${pctRoot}%</td>
      <td style="text-align:right;">${(node.files_count || 0).toLocaleString('fr-FR')}</td>
      <td style="text-align:right;">${(node.dirs_count || 0).toLocaleString('fr-FR')}</td>
    `;

    const toggleEl = tr.querySelector('.wds-tree-toggle');
    if (toggleEl && hasChildren) {
      toggleEl.onclick = (e) => {
        e.stopPropagation();
        if (wdsState.expandedPaths.has(node.path)) {
          wdsState.expandedPaths.delete(node.path);
        } else {
          wdsState.expandedPaths.add(node.path);
        }
        renderWdsTreeTable();
      };
    }

    tr.onclick = () => {
      wdsState.selectedExt = null;
      wdsSelectNode(node, false);
    };

    tr.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      wdsState.selectedExt = null;
      wdsSelectNode(node, false);
      openWdsNodeContextMenu(e, node);
    };

    tr.ondblclick = () => {
      if (hasChildren) {
        if (wdsState.expandedPaths.has(node.path)) {
          wdsState.expandedPaths.delete(node.path);
        } else {
          wdsState.expandedPaths.add(node.path);
        }
        renderWdsTreeTable();
      }
    };

    frag.appendChild(tr);

    if (isExpanded && Array.isArray(node.children)) {
      const subParentSize = Math.max(1, node.size);
      for (const ch of node.children) {
        addRow(ch, depth + 1, subParentSize);
      }
    }
  }

  addRow(wdsState.rootTree, 0, rootTotal);
  tbody.appendChild(frag);
}

function openWdsNodeContextMenu(e, node) {
  if (!node || !node.path || node.is_grouped) return;

  const isDir = !!node.is_dir;
  const labelDelete = isDir ? "Supprimer ce dossier (Mettre à la corbeille)" : "Supprimer ce fichier (Mettre à la corbeille)";

  elements.contextMenu.innerHTML = `
    <div class="context-menu-item" id="ctxWdsOpen">
      <img src="static/icons/win98/folder.png" width="16" height="16" style="image-rendering:pixelated;" alt="">
      <span>${isDir ? "Ouvrir dans l'Explorateur" : "Ouvrir le fichier"}</span>
    </div>
    <div class="context-menu-item" id="ctxWdsShowFinder">
      <img src="static/icons/win98/file_app.png" width="16" height="16" style="image-rendering:pixelated;" alt="">
      <span>Afficher dans le Finder</span>
    </div>
    <div class="context-menu-item" id="ctxWdsCopyPath">
      <img src="static/icons/win98/file_text.png" width="16" height="16" style="image-rendering:pixelated;" alt="">
      <span>Copier le chemin d'accès</span>
    </div>
    <div class="context-menu-separator"></div>
    <div class="context-menu-item danger" id="ctxWdsDelete" style="color:#c42b1c;font-weight:bold;">
      <span style="font-size:14px;">🗑️</span>
      <span>${labelDelete}</span>
    </div>
  `;

  positionContextMenu(e);

  const btnOpen = document.getElementById('ctxWdsOpen');
  if (btnOpen) {
    btnOpen.onclick = () => {
      closeContextMenu();
      if (isDir) {
        switchView('explorer');
        navigateTo(node.path);
      } else {
        openItem(node.path);
      }
    };
  }

  const btnFinder = document.getElementById('ctxWdsShowFinder');
  if (btnFinder) {
    btnFinder.onclick = () => {
      closeContextMenu();
      const api = window.electronAPI || window.api;
      if (api?.showItemInFolder) {
        api.showItemInFolder(node.path);
      } else {
        fetch('/api/system/show-in-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: node.path })
        });
      }
    };
  }

  const btnCopy = document.getElementById('ctxWdsCopyPath');
  if (btnCopy) {
    btnCopy.onclick = () => {
      closeContextMenu();
      navigator.clipboard?.writeText(node.path);
      showToast("Chemin d'accès copié", 'info');
    };
  }

  const btnDel = document.getElementById('ctxWdsDelete');
  if (btnDel) {
    btnDel.onclick = () => {
      closeContextMenu();
      confirmDeleteWdsNode(node);
    };
  }
}

async function confirmDeleteWdsNode(node) {
  if (!node || !node.path) return;
  const isDir = !!node.is_dir;
  const itemType = isDir ? 'ce dossier' : 'ce fichier';

  const confirmed = confirm(`Voulez-vous vraiment placer ${itemType} dans la Corbeille ?\n\n${node.name}\n(${node.path})`);
  if (!confirmed) return;

  try {
    const res = await fetch('/api/fs/trash_task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: [node.path] }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Erreur de suppression');

    showToast(`« ${node.name} » a été placé dans la Corbeille`, 'success');

    // Retirer le nœud de l'arborescence locale wdsState.rootTree
    removeWdsNodeFromTree(wdsState.rootTree, node.path);
    wdsState.selectedNode = null;
    wdsState.selectedPath = null;
    updateWdsToolbarButtons();
    renderWdsTreeTable();
    renderWdsTreemap();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function removeWdsNodeFromTree(root, targetPath) {
  if (!root || !Array.isArray(root.children)) return false;
  const idx = root.children.findIndex(c => c.path === targetPath);
  if (idx !== -1) {
    const removed = root.children.splice(idx, 1)[0];
    root.size = Math.max(0, (root.size || 0) - (removed.size || 0));
    return true;
  }
  for (const child of root.children) {
    if (child.is_dir && removeWdsNodeFromTree(child, targetPath)) {
      child.size = (child.children || []).reduce((sum, c) => sum + (c.size || 0), 0);
      return true;
    }
  }
  return false;
}

function renderWdsExtTable() {
  const tbody = document.getElementById('wdsExtBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const frag = document.createDocumentFragment();
  (wdsState.extensions || []).forEach(extItem => {
    const tr = document.createElement('tr');
    if (wdsState.selectedExt === extItem.ext) {
      tr.classList.add('selected');
    }
    tr.innerHTML = `
      <td style="font-weight:bold;">${escapeHtml(extItem.ext)}</td>
      <td><span class="wds-ext-color-box" style="background:${extItem.color};"></span></td>
      <td title="${escapeHtml(extItem.description)}">${escapeHtml(extItem.description)}</td>
      <td style="text-align:right;">${escapeHtml(extItem.size_formatted)}</td>
      <td style="text-align:right;">${extItem.percent}%</td>
      <td style="text-align:right;">${extItem.count.toLocaleString('fr-FR')}</td>
    `;
    tr.onclick = () => {
      wdsState.selectedExt = (wdsState.selectedExt === extItem.ext) ? null : extItem.ext;
      renderWdsExtTable();
      renderWdsTreemap();
    };
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

function getWdsNodeColor(node) {
  if (node.ext && wdsState.extColors[node.ext]) {
    return wdsState.extColors[node.ext];
  }
  if (node.is_grouped) return '#778899';
  if (node.is_dir) return '#4477bb';
  return '#8899aa';
}

// Algorithme Squarified Treemap (Bruls, Huizing, van Wijk - utilisé par WinDirStat / SequoiaView)
function layoutSquarifiedRow(items, x, y, w, h, out) {
  if (!items || items.length === 0 || w <= 0.5 || h <= 0.5) return;
  const total = items.reduce((s, it) => s + it.size, 0);
  if (total <= 0) return;

  let rx = x, ry = y, rw = w, rh = h;
  let remaining = items.slice();
  let remTotal = total;

  while (remaining.length > 0 && rw > 0.5 && rh > 0.5 && remTotal > 0) {
    const horizontal = rw >= rh;
    const side = horizontal ? rh : rw;
    const totalArea = rw * rh;

    let row = [remaining[0]];
    let rowSum = remaining[0].size;

    const worstAspect = (rSum, rMin, rMax) => {
      const sArea = (rSum / remTotal) * totalArea;
      if (sArea <= 0 || side <= 0) return Infinity;
      const s2 = side * side;
      const a2 = sArea * sArea;
      const minArea = (rMin / remTotal) * totalArea;
      const maxArea = (rMax / remTotal) * totalArea;
      if (minArea <= 0) return Infinity;
      return Math.max((s2 * maxArea) / a2, a2 / (s2 * minArea));
    };

    let rMin = remaining[0].size;
    let rMax = remaining[0].size;
    let bestWorst = worstAspect(rowSum, rMin, rMax);

    let i = 1;
    while (i < remaining.length) {
      const next = remaining[i];
      const newSum = rowSum + next.size;
      const newMin = Math.min(rMin, next.size);
      const newMax = Math.max(rMax, next.size);
      const newWorst = worstAspect(newSum, newMin, newMax);
      if (newWorst <= bestWorst) {
        row.push(next);
        rowSum = newSum;
        rMin = newMin;
        rMax = newMax;
        bestWorst = newWorst;
        i++;
      } else {
        break;
      }
    }

    const rowFraction = Math.min(1, rowSum / remTotal);
    const stripThickness = horizontal ? (rw * rowFraction) : (rh * rowFraction);
    let offset = 0;

    for (const item of row) {
      const itemFrac = rowSum > 0 ? (item.size / rowSum) : 0;
      const itemLen = side * itemFrac;
      const ix = horizontal ? rx : (rx + offset);
      const iy = horizontal ? (ry + offset) : ry;
      const iw = horizontal ? stripThickness : itemLen;
      const ih = horizontal ? itemLen : stripThickness;
      out.push({ item, x: ix, y: iy, w: iw, h: ih });
      offset += itemLen;
    }

    if (horizontal) {
      rx += stripThickness;
      rw -= stripThickness;
    } else {
      ry += stripThickness;
      rh -= stripThickness;
    }
    remTotal -= rowSum;
    remaining = remaining.slice(row.length);
  }
}

function renderWdsTreemap() {
  const canvas = document.getElementById('wdsTreemapCanvas');
  const pane = document.getElementById('wdsTreemapPane');
  if (!canvas || !pane) return;

  const rect = pane.getBoundingClientRect();
  const cssW = Math.floor(rect.width);
  const cssH = Math.floor(rect.height);
  if (cssW < 10 || cssH < 10) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pxW = Math.floor(cssW * dpr);
  const pxH = Math.floor(cssH * dpr);
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }

  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, cssW, cssH);

  const root = wdsState.zoomNode || wdsState.rootTree;
  if (!root || !root.size) {
    ctx.fillStyle = '#808080';
    ctx.font = 'bold 12px "MS Sans Serif", Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sélectionnez un disque ou un dossier pour afficher la Treemap WinDirStat.', cssW / 2, cssH / 2);
    ctx.restore();
    return;
  }

  wdsState.treemapRects = [];
  let selectedGroupBounds = null;

  function subdivide(node, x, y, w, h, depth, parentDir) {
    if (w < 1.5 || h < 1.5 || node.size <= 0) return;

    if (wdsState.selectedNode === node || (!node.is_grouped && wdsState.selectedPath === node.path)) {
      selectedGroupBounds = { x, y, w, h };
    }

    const canRecurse = node.is_dir && Array.isArray(node.children) && node.children.length > 0 && w >= 6 && h >= 6 && depth < 6;
    if (canRecurse) {
      const boxes = [];
      layoutSquarifiedRow(node.children, x, y, w, h, boxes);
      for (const b of boxes) {
        subdivide(b.item, b.x, b.y, b.w, b.h, depth + 1, node);
      }
      return;
    }

    // Feuille (ou petit bloc dossier) : rendu Cushion 3D WinDirStat
    const baseColor = getWdsNodeColor(node);
    const rx = Math.floor(x);
    const ry = Math.floor(y);
    const rw = Math.max(1, Math.ceil(x + w) - rx);
    const rh = Math.max(1, Math.ceil(y + h) - ry);

    ctx.fillStyle = baseColor;
    ctx.fillRect(rx, ry, rw, rh);

    if (rw >= 4 && rh >= 4) {
      // Effet Cushion 3D (lumière en haut à gauche + dégradé bombé vers le bas à droite)
      const grad = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.38)');
      grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.08)');
      grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.52)');
      ctx.fillStyle = grad;
      ctx.fillRect(rx, ry, rw, rh);

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.lineWidth = 1;
      ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
    }

    if (wdsState.selectedExt && node.ext === wdsState.selectedExt && rw >= 3 && rh >= 3) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rx + 1, ry + 1, Math.max(1, rw - 2), Math.max(1, rh - 2));
    }

    wdsState.treemapRects.push({
      x: rx,
      y: ry,
      w: rw,
      h: rh,
      node,
      parentDirNode: parentDir || root,
    });
  }

  subdivide(root, 0, 0, cssW, cssH, 0, root);

  if (selectedGroupBounds) {
    const sb = selectedGroupBounds;
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.floor(sb.x) + 1, Math.floor(sb.y) + 1, Math.max(2, Math.floor(sb.w) - 2), Math.max(2, Math.floor(sb.h) - 2));
  }

  ctx.restore();
}

function findWdsRectAt(mx, my) {
  const rects = wdsState.treemapRects;
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
      return r;
    }
  }
  return null;
}

// ==============================================================================
// ===================== FORMATAGE DE DISQUE (SMART / GESTION) ==================
// ==============================================================================

let currentFormatTarget = null;

function openFormatDiskModal(deviceId, name, sizeFormatted, mountPath) {
  initFormatModalEvents();
  currentFormatTarget = deviceId || mountPath;
  const overlay = document.getElementById('formatDiskModalOverlay');
  const diskNameEl = document.getElementById('formatModalDiskName');
  const diskMetaEl = document.getElementById('formatModalDiskMeta');
  const volumeNameInput = document.getElementById('formatVolumeNameInput');
  const fsSelect = document.getElementById('formatFileSystemSelect');
  const progressMsg = document.getElementById('formatProgressMsg');
  const confirmBtn = document.getElementById('formatModalConfirmBtn');
  const cancelBtn = document.getElementById('formatModalCancelBtn');
  const closeBtn = document.getElementById('formatModalCloseBtn');

  if (!overlay) return;
  if (diskNameEl) diskNameEl.textContent = name || deviceId;
  if (diskMetaEl) diskMetaEl.textContent = `${sizeFormatted || ''} • Identifiant: ${deviceId} ${mountPath ? `• (${mountPath})` : ''}`;
  if (volumeNameInput) volumeNameInput.value = (name && name !== 'UNTITLED' && !name.includes('SSD') && !name.includes('APPLE')) ? name : 'NOUVEAU_DISQUE';
  if (fsSelect) fsSelect.value = 'apfs';
  if (progressMsg) progressMsg.style.display = 'none';
  if (confirmBtn) confirmBtn.disabled = false;
  if (cancelBtn) cancelBtn.disabled = false;
  if (closeBtn) closeBtn.disabled = false;

  const closeModal = () => {
    overlay.style.display = 'none';
    currentFormatTarget = null;
  };

  if (closeBtn) closeBtn.onclick = closeModal;
  if (cancelBtn) cancelBtn.onclick = closeModal;
  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };

  overlay.style.display = 'flex';
}

function initFormatModalEvents() {
  const overlay = document.getElementById('formatDiskModalOverlay');
  const closeBtn = document.getElementById('formatModalCloseBtn');
  const cancelBtn = document.getElementById('formatModalCancelBtn');
  const confirmBtn = document.getElementById('formatModalConfirmBtn');
  const progressMsg = document.getElementById('formatProgressMsg');
  const progressText = document.getElementById('formatProgressText');
  const volumeNameInput = document.getElementById('formatVolumeNameInput');
  const fsSelect = document.getElementById('formatFileSystemSelect');

  const closeModal = () => {
    if (overlay) overlay.style.display = 'none';
    currentFormatTarget = null;
  };

  if (closeBtn) closeBtn.onclick = closeModal;
  if (cancelBtn) cancelBtn.onclick = closeModal;
  if (overlay) {
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
  }

  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      if (!currentFormatTarget) return;
      const volName = (volumeNameInput && volumeNameInput.value.trim()) || 'NOUVEAU_DISQUE';
      const fsChoice = (fsSelect && fsSelect.value) || 'apfs';

      // Pas de confirm() bloquant Electron ! La modale est déjà explicite avec son bouton rouge
      confirmBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = true;
      if (closeBtn) closeBtn.disabled = true;
      if (progressMsg) progressMsg.style.display = 'flex';
      if (progressText) progressText.textContent = `Formatage de ${currentFormatTarget} en cours, veuillez patienter...`;

      try {
        const res = await fetch('/api/disks/format', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: currentFormatTarget,
            name: volName,
            format: fsChoice,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Erreur lors du formatage');

        showToast(data.message || 'Disque formaté avec succès !', 'success');
        closeModal();
        await fetchDrives();
        if (state.currentView === 'smart') {
          loadSmartDisks();
        }
      } catch (err) {
        showToast(err.message, 'error');
        if (progressMsg) progressMsg.style.display = 'none';
        confirmBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        if (closeBtn) closeBtn.disabled = false;
      }
    };
  }
}

// ==============================================================================
// ===================== VUE CLONAGE & IMAGE DISQUE =============================
// ==============================================================================

const cloneState = {
  initialized: false,
  disks: [],
  activeTaskId: null,
  pollTimer: null,
};

function initCloneEvents() {
  if (cloneState.initialized) return;
  cloneState.initialized = true;

  initFormatModalEvents();

  const btnStartDiskClone = document.getElementById('btnStartDiskClone');
  const btnStartDiskImage = document.getElementById('btnStartDiskImage');
  const btnCancelClone = document.getElementById('btnCancelClone');
  const btnBrowse = document.getElementById('btnBrowseImageDest');
  const imgInput = document.getElementById('cloneImagePathInput');
  const btnOpenFda = document.getElementById('btnOpenFdaSettings');
  const btnOpenFdaBanner = document.getElementById('btnOpenFdaBannerBtn');

  const openFdaSettings = async () => {
    const api = window.electronAPI || window.api;
    if (api?.openFullDiskAccess) {
      api.openFullDiskAccess();
    } else {
      try {
        await fetch('/api/system/open-full-disk-access', { method: 'POST' });
      } catch (e) {}
    }
  };

  if (btnOpenFda) btnOpenFda.onclick = openFdaSettings;
  if (btnOpenFdaBanner) btnOpenFdaBanner.onclick = openFdaSettings;

  if (btnBrowse) {
    btnBrowse.onclick = async () => {
      const api = window.electronAPI || window.api;
      let chosenPath = null;

      // 1. Boîte de dialogue native macOS via Electron
      if (api?.selectSaveImagePath) {
        try {
          const defaultDir = (Array.isArray(state.drives) && state.drives.length > 1)
            ? (state.drives[1].mountpoint || '')
            : '';
          const res = await api.selectSaveImagePath({ defaultDir });
          if (res) chosenPath = res;
        } catch (e) {
          console.warn('Native dialog error:', e);
        }
      }

      // 2. Boîte de dialogue native macOS via backend AppleScript
      if (!chosenPath) {
        try {
          const res = await fetch('/api/dialog/select-save-image');
          const data = await res.json();
          if (data.path) chosenPath = data.path;
        } catch (e) {}
      }

      if (chosenPath && imgInput) {
        imgInput.value = chosenPath;
      }
    };
  }

  if (btnStartDiskClone) {
    btnStartDiskClone.onclick = async () => {
      const srcSel = document.getElementById('cloneDiskSourceSelect');
      const tgtSel = document.getElementById('cloneDiskTargetSelect');
      const src = srcSel ? srcSel.value : '';
      const tgt = tgtSel ? tgtSel.value : '';

      if (!src || !tgt) {
        showToast('Veuillez sélectionner un disque source et un disque de destination.', 'error');
        return;
      }
      if (src === tgt) {
        showToast('Le disque source et la destination ne peuvent pas être identiques !', 'error');
        return;
      }

      const srcOpt = srcSel?.selectedOptions[0];
      const tgtOpt = tgtSel?.selectedOptions[0];
      if (srcOpt && srcOpt.dataset.isSys === '1') {
        showToast('Le disque système macOS interne ne peut pas être cloné bloc à bloc pendant son utilisation. Utilisez « Créer une image disque ».', 'error');
        return;
      }
      if (srcOpt && tgtOpt) {
        const srcSize = parseInt(srcOpt.dataset.size || '0', 10);
        const tgtSize = parseInt(tgtOpt.dataset.size || '0', 10);
        if (srcSize > 0 && tgtSize > 0 && tgtSize < srcSize) {
          showToast('Le disque de destination est trop petit pour recevoir le clone.', 'error');
          return;
        }
      }

      startCloneTask('clone', src, tgt);
    };
  }

  if (btnStartDiskImage) {
    btnStartDiskImage.onclick = async () => {
      const srcSel = document.getElementById('cloneImageSourceSelect');
      const destPathInput = document.getElementById('cloneImagePathInput');
      const src = srcSel ? srcSel.value : '';
      const dest = destPathInput ? destPathInput.value.trim() : '';

      if (!src || !dest) {
        showToast('Veuillez sélectionner un disque source et spécifier un chemin de fichier destination (.dmg).', 'error');
        return;
      }

      startCloneTask('image', src, dest);
    };
  }

  if (btnCancelClone) {
    btnCancelClone.onclick = async () => {
      if (!cloneState.activeTaskId) return;
      try {
        await fetch(`/api/disks/clone/cancel/${encodeURIComponent(cloneState.activeTaskId)}`, { method: 'POST' });
        showToast('Demande d\'annulation envoyée.', 'info');
      } catch (e) {}
    };
  }
}

async function updateFdaBannerStatus() {
  const banner = document.getElementById('cloneFdaBanner');
  const btnHeader = document.getElementById('btnOpenFdaSettings');
  if (!banner) return;

  let fdaOk = false;
  const api = window.electronAPI || window.api;
  if (api?.checkFullDiskAccess) {
    try {
      fdaOk = await api.checkFullDiskAccess();
    } catch (e) {}
  } else {
    try {
      const res = await fetch('/api/system/check-permissions');
      const data = await res.json();
      fdaOk = !!data.full_disk_access;
    } catch (e) {}
  }

  if (fdaOk) {
    banner.style.background = '#c0c0c0';
    banner.style.borderColor = '';
    banner.innerHTML = `
      <div style="flex:1;font-size:11.5px;color:#000080;line-height:1.4;">
        <strong>Accès complet au disque actif :</strong> Explorer 2 dispose des autorisations nécessaires pour cloner et manipuler vos disques physiques.
      </div>
      <button class="btn" id="btnOpenFdaBannerBtn" style="white-space:nowrap;padding:3px 10px;font-size:11px;">
        <span>Gérer dans Réglages macOS</span>
      </button>
    `;
    if (btnHeader) {
      btnHeader.innerHTML = `<span style="color:#000080;font-weight:bold;">Accès disque accordé</span>`;
    }
  } else {
    banner.style.background = '#c0c0c0';
    banner.style.borderColor = '';
    banner.innerHTML = `
      <div style="flex:1;font-size:11.5px;color:#000000;line-height:1.4;">
        <strong>Autorisation macOS requise pour le clonage physique :</strong>
        Par sécurité, macOS bloque l'accès bloc à bloc aux disques bruts. Cliquez sur <strong>« Autoriser Explorer 2 »</strong> pour ouvrir les Réglages macOS et cochez <em>Explorer 2</em> dans <em>Accès complet au disque</em>.
      </div>
      <button class="btn primary" id="btnOpenFdaBannerBtn" style="white-space:nowrap;padding:4px 12px;font-weight:bold;">
        <span>Ouvrir les Réglages macOS...</span>
      </button>
    `;
    if (btnHeader) {
      btnHeader.innerHTML = `<span>Autoriser Explorer 2 (Accès complet au disque)</span>`;
    }
  }

  const newBtn = document.getElementById('btnOpenFdaBannerBtn');
  if (newBtn) {
    newBtn.onclick = () => {
      if (api?.openFullDiskAccess) api.openFullDiskAccess();
      else fetch('/api/system/open-full-disk-access', { method: 'POST' });
    };
  }
}

async function onEnterCloneView() {
  initCloneEvents();
  await updateFdaBannerStatus();
  await loadCloneDisks();
}

async function loadCloneDisks() {
  const srcCloneSel = document.getElementById('cloneDiskSourceSelect');
  const tgtCloneSel = document.getElementById('cloneDiskTargetSelect');
  const srcImgSel = document.getElementById('cloneImageSourceSelect');
  const imgInput = document.getElementById('cloneImagePathInput');

  if (!srcCloneSel || !tgtCloneSel || !srcImgSel) return;

  try {
    const res = await fetch('/api/smart/disks');
    if (!res.ok) return;
    const disks = await res.json();
    cloneState.disks = disks;

    srcCloneSel.innerHTML = '';
    tgtCloneSel.innerHTML = '';
    srcImgSel.innerHTML = '';

    disks.forEach(d => {
      const isInternalMacSys = (d.device_id === 'disk0' || d.mount_point === '/' || d.device_id === 'disk3');
      const title = `${d.device_id} — ${d.name} (${d.size_formatted || ''}) ${d.drive_letters ? `[${d.drive_letters}]` : ''}`;

      // Source Clone
      const optSrc = document.createElement('option');
      optSrc.value = d.device_id;
      optSrc.textContent = isInternalMacSys 
        ? `🔒 ${title} (Disque système macOS - Sauvegarde par image recommandée)` 
        : `🖴 ${title}`;
      optSrc.dataset.size = d.size || 0;
      optSrc.dataset.sizeFormatted = d.size_formatted || '';
      optSrc.dataset.isSys = isInternalMacSys ? '1' : '0';
      srcCloneSel.appendChild(optSrc);

      // Source Image
      const optImg = document.createElement('option');
      optImg.value = d.device_id;
      optImg.textContent = `🖴 ${title}`;
      optImg.dataset.size = d.size || 0;
      srcImgSel.appendChild(optImg);

      // Destination Clone (interdire d'écraser le disque interne macOS système)
      if (!isInternalMacSys) {
        const optTgt = document.createElement('option');
        optTgt.value = d.device_id;
        optTgt.textContent = `🖴 ${title} (Cible)`;
        optTgt.dataset.size = d.size || 0;
        optTgt.dataset.sizeFormatted = d.size_formatted || '';
        tgtCloneSel.appendChild(optTgt);
      }
    });

    // Sélectionner par défaut le premier disque EXTERNE comme source s'il existe
    const firstExternalSrc = Array.from(srcCloneSel.options).find(o => o.dataset.isSys !== '1');
    if (firstExternalSrc) {
      srcCloneSel.value = firstExternalSrc.value;
    }

    if (tgtCloneSel.options.length === 0) {
      const optEmpty = document.createElement('option');
      optEmpty.value = '';
      optEmpty.textContent = 'Aucun disque externe/secondaire connecté pour recevoir le clone';
      optEmpty.disabled = true;
      tgtCloneSel.appendChild(optEmpty);
    }

    if (imgInput && !imgInput.value) {
      const dateStr = new Date().toISOString().slice(0, 10);
      imgInput.value = `/Users/Backup_Disque_${dateStr}.dmg`;
    }

    // Validation dynamique en temps réel du couple Source / Cible
    const validateClonePair = () => {
      const srcOpt = srcCloneSel.selectedOptions[0];
      const tgtOpt = tgtCloneSel.selectedOptions[0];
      const warnBox = document.getElementById('cloneDiskWarningBox');
      const startBtn = document.getElementById('btnStartDiskClone');
      if (!warnBox) return;

      if (srcOpt && srcOpt.dataset.isSys === '1') {
        warnBox.style.background = '#c0c0c0';
        warnBox.style.borderColor = '';
        warnBox.innerHTML = `
          <span style="color:#800000;font-weight:bold;">⛔ Disque système interne sélectionné :</span> Le disque de démarrage de macOS (${srcOpt.value}) ne peut pas être démonté ni cloné bloc à bloc pendant que macOS l'utilise.<br>
          👉 Pour sauvegarder ce disque, utilisez l'option <strong>« Créer une image disque (.dmg) »</strong> dans le panneau de droite.
        `;
        if (startBtn) startBtn.disabled = true;
        return;
      }

      if (srcOpt && tgtOpt && tgtOpt.value) {
        const srcSize = parseInt(srcOpt.dataset.size || '0', 10);
        const tgtSize = parseInt(tgtOpt.dataset.size || '0', 10);
        if (srcSize > 0 && tgtSize > 0 && tgtSize < srcSize) {
          warnBox.style.background = '#c0c0c0';
          warnBox.style.borderColor = '';
          warnBox.innerHTML = `
            <span style="color:#800000;font-weight:bold;">⛔ Taille insuffisante :</span> Le disque cible (${tgtOpt.dataset.sizeFormatted || tgtOpt.value}) est plus petit que la source (${srcOpt.dataset.sizeFormatted || srcOpt.value}).<br>
            Le clonage direct bloc à bloc nécessite un disque de destination de capacité égale ou supérieure.
          `;
          if (startBtn) startBtn.disabled = true;
          return;
        }
      }

      if (startBtn) startBtn.disabled = false;
      warnBox.style.background = '#c0c0c0';
      warnBox.style.borderColor = '';
      warnBox.innerHTML = `⚠️ <strong>Attention :</strong> Toutes les données existantes sur le disque de destination seront définitivement écrasées et remplacées par les partitions du disque source.`;
    };

    srcCloneSel.onchange = validateClonePair;
    tgtCloneSel.onchange = validateClonePair;
    validateClonePair();
  } catch (err) {}
}

async function startCloneTask(mode, sourceDisk, target) {
  const progPane = document.getElementById('cloneProgressPane');
  const progTitle = document.getElementById('cloneProgressTitle');
  const progDesc = document.getElementById('cloneProgressDesc');
  const progFill = document.getElementById('cloneProgressFill');
  const progDetails = document.getElementById('cloneProgressDetails');

  if (progPane) progPane.style.display = 'block';
  if (progTitle) progTitle.textContent = (mode === 'clone') ? 'Clonage direct de disque en cours...' : 'Création de l\'image disque (.dmg) en cours...';
  if (progDesc) progDesc.textContent = `Initialisation de la tâche (${sourceDisk} → ${target})...`;
  if (progFill) progFill.style.width = '20%';
  if (progDetails) progDetails.textContent = 'Opération en cours...';

  try {
    const res = await fetch('/api/disks/clone/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, source_disk: sourceDisk, target }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Erreur au démarrage du clonage');

    cloneState.activeTaskId = data.task_id;

    if (cloneState.pollTimer) clearInterval(cloneState.pollTimer);
    cloneState.pollTimer = setInterval(async () => {
      try {
        const sRes = await fetch(`/api/disks/clone/status/${encodeURIComponent(cloneState.activeTaskId)}`);
        if (!sRes.ok) return;
        const st = await sRes.json();

        if (progDesc) progDesc.textContent = st.message || 'Traitement des blocs...';
        if (progDetails) {
          const spd = st.speed_formatted ? ` • ${st.speed_formatted}` : '';
          progDetails.textContent = `${st.bytes_written_formatted} écrits ${st.total_size_formatted ? `/ ${st.total_size_formatted}` : ''}${spd}`;
        }
        if (progFill) {
          if (st.status === 'done') {
            progFill.style.width = '100%';
          } else if (typeof st.progress_percent === 'number' && st.progress_percent > 0) {
            progFill.style.width = `${Math.min(100, Math.max(5, st.progress_percent))}%`;
          } else {
            progFill.style.width = '20%';
          }
        }

        if (st.status === 'done' || st.status === 'error' || st.status === 'cancelled') {
          clearInterval(cloneState.pollTimer);
          cloneState.pollTimer = null;
          cloneState.activeTaskId = null;

          if (st.status === 'done') {
            showToast(st.message || 'Opération terminée avec succès !', 'success');
            if (progDesc) progDesc.textContent = 'Terminé avec succès.';
            await fetchDrives();
          } else if (st.status === 'error') {
            showToast(`Erreur : ${st.error}`, 'error');
            const isFdaError = (st.error || '').includes('Operation not permitted') || (st.error || '').includes('Accès complet');
            if (progDesc) {
              progDesc.innerHTML = `
                <div style="color:#d32f2f;font-weight:bold;margin-bottom:6px;white-space:pre-wrap;">${escapeHtml(st.error)}</div>
                ${isFdaError ? `
                  <div style="margin-top:8px;">
                    <button class="btn primary" id="btnErrOpenFda" style="padding:4px 12px;font-weight:bold;">
                      <span>🔐 Ouvrir les Réglages macOS (Accès complet au disque)</span>
                    </button>
                  </div>
                ` : ''}
              `;
              const errBtn = document.getElementById('btnErrOpenFda');
              if (errBtn) {
                errBtn.onclick = () => {
                  const api = window.electronAPI || window.api;
                  if (api?.openFullDiskAccess) api.openFullDiskAccess();
                  else fetch('/api/system/open-full-disk-access', { method: 'POST' });
                };
              }
            }
          } else {
            showToast('Tâche annulée.', 'info');
            if (progDesc) progDesc.textContent = 'Annulé par l\'utilisateur.';
          }
        }
      } catch (e) {}
    }, 600);
  } catch (err) {
    if (progPane) progPane.style.display = 'none';
    showToast(err.message, 'error');
  }
}

// ==============================================================================
// 12. FLASHEUR D'IMAGE ISO POUR CLÉ USB BOOTABLE (UEFI)
// ==============================================================================
const flashState = {
  activeTaskId: null,
  pollTimer: null,
  speedHistory: [],
  selectedIsoPath: null,
  selectedIsoInfo: null,
  drives: [],
  peakSpeed: 0,
  initialized: false
};

async function onEnterFlashView() {
  initFlashEvents();
  await loadFlashDrives();
  drawFlashSpeedGraph(flashState.speedHistory, 0);
}

function initFlashEvents() {
  if (flashState.initialized) return;
  flashState.initialized = true;

  const btnBrowseIso = document.getElementById('btnBrowseIso');
  const btnRefreshFlashDrives = document.getElementById('btnRefreshFlashDrives');
  const btnStartFlash = document.getElementById('btnStartFlash');
  const btnCancelFlash = document.getElementById('btnCancelFlash');
  const targetSel = document.getElementById('flashTargetSelect');

  if (btnBrowseIso) {
    btnBrowseIso.onclick = async () => {
      let chosenPath = null;
      if (window.electronAPI?.openFilePicker) {
        // Fenêtre Explorer 2 séparée contenant uniquement l'explorateur de fichiers
        chosenPath = await window.electronAPI.openFilePicker({
          title: 'Sélectionner une image ISO / disque amorçable',
          extensions: ['iso', 'img', 'raw', 'bin', 'dmg'],
          filterLabel: 'Images disque (*.iso, *.img, *.raw, *.bin, *.dmg)',
          confirmLabel: 'Choisir cette image'
        });
      } else if (window.electronAPI?.selectIsoFile) {
        chosenPath = await window.electronAPI.selectIsoFile();
      } else if (window.api?.selectIsoFile) {
        chosenPath = await window.api.selectIsoFile();
      } else {
        try {
          const res = await fetch('/api/dialog/select-iso');
          const data = await res.json();
          if (data.path) chosenPath = data.path;
        } catch (e) {}
      }

      if (chosenPath) {
        await selectFlashIso(chosenPath);
      }
    };
  }

  if (btnRefreshFlashDrives) {
    btnRefreshFlashDrives.onclick = async () => {
      await loadFlashDrives();
      showToast('Liste des clés USB actualisée.', 'info');
    };
  }

  window.addEventListener('resize', () => {
    const flashView = document.getElementById('viewFlash');
    if (flashView && flashView.classList.contains('active')) {
      drawFlashSpeedGraph(flashState.speedHistory, 0);
    }
  });

  if (targetSel) {
    targetSel.onchange = () => validateFlashForm();
  }

  if (btnStartFlash) {
    btnStartFlash.onclick = async () => {
      const isoPath = flashState.selectedIsoPath;
      const target = targetSel?.value;

      if (!isoPath) {
        showToast('Veuillez sélectionner un fichier image ISO.', 'error');
        return;
      }
      if (!target) {
        showToast('Veuillez sélectionner une clé USB cible.', 'error');
        return;
      }

      const opt = targetSel.selectedOptions[0];
      const targetLabel = opt ? opt.textContent : target;

      // Démarrage du flash
      btnStartFlash.disabled = true;
      if (btnBrowseIso) btnBrowseIso.disabled = true;
      if (targetSel) targetSel.disabled = true;

      const progressTitle = document.getElementById('flashProgressTitle');
      const progressDesc = document.getElementById('flashProgressDesc');
      const progressFill = document.getElementById('flashProgressFill');
      const progressBytes = document.getElementById('flashProgressBytesText');
      const progressSpeed = document.getElementById('flashProgressSpeedBadge');
      const progressEta = document.getElementById('flashProgressEtaText');
      const progressPct = document.getElementById('flashProgressPctText');
      const btnCancel = document.getElementById('btnCancelFlash');

      if (btnCancel) btnCancel.disabled = false;
      if (progressTitle) progressTitle.textContent = `Flash de l'image ISO vers ${target}...`;
      if (progressDesc) progressDesc.textContent = 'Démontage sécurisé et initialisation des blocs UEFI...';
      if (progressFill) progressFill.style.width = '0%';
      if (progressBytes) progressBytes.textContent = `0 Mo / ${flashState.selectedIsoInfo?.size_formatted || '0 Mo'}`;
      if (progressSpeed) progressSpeed.textContent = '0.00 Mo/s';
      if (progressEta) progressEta.textContent = 'Démarrage...';
      if (progressPct) progressPct.textContent = '0% complété';

      flashState.speedHistory = [];
      flashState.peakSpeed = 0;
      drawFlashSpeedGraph([], 0);

      try {
        const res = await fetch('/api/flash/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ iso_path: isoPath, target: target }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Erreur au démarrage du flash');

        flashState.activeTaskId = data.task_id;

        if (flashState.pollTimer) clearInterval(flashState.pollTimer);
        flashState.pollTimer = setInterval(async () => {
          try {
            const sRes = await fetch(`/api/flash/status/${encodeURIComponent(flashState.activeTaskId)}`);
            if (!sRes.ok) return;
            const st = await sRes.json();

            if (progressDesc) progressDesc.textContent = st.message || 'Écriture des blocs UEFI...';
            if (progressBytes) {
              progressBytes.textContent = `${st.bytes_written_formatted} / ${st.total_size_formatted}`;
            }
            if (progressSpeed) {
              progressSpeed.textContent = st.speed_formatted || '0.00 Mo/s';
            }
            if (progressEta && st.eta_formatted) {
              progressEta.textContent = st.eta_formatted;
            }
            if (progressPct && typeof st.progress_percent === 'number') {
              progressPct.textContent = `${st.progress_percent}% complété`;
            }
            if (progressFill) {
              if (st.status === 'done') {
                progressFill.style.width = '100%';
              } else if (typeof st.progress_percent === 'number') {
                progressFill.style.width = `${Math.min(100, Math.max(2, st.progress_percent))}%`;
              }
            }

            // Courbe de vitesse en temps réel
            if (st.speed_mb > flashState.peakSpeed) {
              flashState.peakSpeed = st.speed_mb;
              const peakEl = document.getElementById('flashGraphPeakSpeed');
              if (peakEl) peakEl.textContent = `Pic : ${flashState.peakSpeed.toFixed(1)} Mo/s`;
            }

            if (Array.isArray(st.speed_history) && st.speed_history.length > 0) {
              flashState.speedHistory = st.speed_history;
            } else if (st.speed_mb !== undefined) {
              flashState.speedHistory.push({ pct: st.progress_percent, speed: st.speed_mb });
            }
            drawFlashSpeedGraph(flashState.speedHistory, st.progress_percent || 0);

            if (st.status === 'done' || st.status === 'error' || st.status === 'cancelled') {
              clearInterval(flashState.pollTimer);
              flashState.pollTimer = null;
              flashState.activeTaskId = null;

              btnStartFlash.disabled = false;
              if (btnBrowseIso) btnBrowseIso.disabled = false;
              if (targetSel) targetSel.disabled = false;
              if (btnCancel) btnCancel.disabled = true;

              if (st.status === 'done') {
                showToast(st.message || 'Clé USB flashée avec succès !', 'success');
                if (progressDesc) progressDesc.textContent = 'Terminé avec succès ! Clé USB amorçable UEFI prête.';
                await loadFlashDrives();
              } else if (st.status === 'error') {
                showToast(`Erreur de flash : ${st.error}`, 'error');
                if (progressDesc) {
                  progressDesc.innerHTML = `<span style="color:#800000;font-weight:bold;">${escapeHtml(st.error)}</span>`;
                }
              } else if (st.status === 'cancelled') {
                showToast('Flash annulé.', 'info');
                if (progressDesc) progressDesc.textContent = 'Opération annulée.';
              }
            }
          } catch (e) {
            console.error('Erreur polling flash:', e);
          }
        }, 250);
      } catch (err) {
        showToast(err.message, 'error');
        btnStartFlash.disabled = false;
        if (btnBrowseIso) btnBrowseIso.disabled = false;
        if (targetSel) targetSel.disabled = false;
        if (btnCancel) btnCancel.disabled = true;
        if (progressDesc) progressDesc.textContent = `Erreur : ${err.message}`;
      }
    };
  }

  if (btnCancelFlash) {
    btnCancelFlash.onclick = async () => {
      if (!flashState.activeTaskId) return;
      try {
        await fetch(`/api/flash/cancel/${encodeURIComponent(flashState.activeTaskId)}`, { method: 'POST' });
        showToast('Demande d\'annulation envoyée...', 'info');
      } catch (e) {}
    };
  }
}

async function loadFlashDrives() {
  const targetSel = document.getElementById('flashTargetSelect');
  if (!targetSel) return;

  targetSel.innerHTML = '<option value="">Détection des clés USB en cours...</option>';

  try {
    const res = await fetch('/api/smart/disks');
    if (!res.ok) return;
    const disks = await res.json();
    flashState.drives = disks;

    targetSel.innerHTML = '';

    // Filtrer les périphériques externes amovibles
    const usbDrives = disks.filter(d => {
      const isInternalMacSys = (d.device_id === 'disk0' || d.mount_point === '/' || d.device_id === 'disk3');
      return !isInternalMacSys;
    });

    if (usbDrives.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '⚠️ Aucune clé USB détectée. Connectez une clé USB et cliquez sur Rafraîchir.';
      opt.disabled = true;
      targetSel.appendChild(opt);
    } else {
      usbDrives.forEach(d => {
        const title = `${d.device_id} — ${d.name} (${d.size_formatted || ''}) ${d.drive_letters ? `[${d.drive_letters}]` : ''}`;
        const opt = document.createElement('option');
        opt.value = d.device_id;
        opt.textContent = `💾 ${title}`;
        opt.dataset.size = d.size || 0;
        opt.dataset.sizeFormatted = d.size_formatted || '';
        targetSel.appendChild(opt);
      });
      targetSel.selectedIndex = 0;
    }
  } catch (e) {
    targetSel.innerHTML = '<option value="">Erreur de détection des disques</option>';
  }

  validateFlashForm();
}

async function selectFlashIso(path) {
  if (!path) return;
  flashState.selectedIsoPath = path;

  const input = document.getElementById('flashIsoPathInput');
  if (input) input.value = path;

  const detailsBox = document.getElementById('flashIsoDetailsBox');
  const nameLabel = document.getElementById('flashIsoNameLabel');
  const sizeLabel = document.getElementById('flashIsoSizeLabel');
  const uefiBadge = document.getElementById('flashIsoUefiBadge');

  try {
    const res = await fetch(`/api/flash/inspect-iso?path=${encodeURIComponent(path)}`);
    if (res.ok) {
      const info = await res.json();
      flashState.selectedIsoInfo = info;

      if (detailsBox) detailsBox.style.display = 'block';
      if (nameLabel) nameLabel.textContent = `${info.name}${info.label ? ` (${info.label})` : ''}`;
      if (sizeLabel) sizeLabel.textContent = info.size_formatted;
      if (uefiBadge) {
        uefiBadge.innerHTML = `<span>✓ ${escapeHtml(info.uefi_details || "Amorçage UEFI direct (Mode GPT/ESP)")}</span>`;
      }
    }
  } catch (e) {
    console.error('Erreur inspection ISO:', e);
  }

  validateFlashForm();
}

function validateFlashForm() {
  const btnStart = document.getElementById('btnStartFlash');
  const targetSel = document.getElementById('flashTargetSelect');
  const warnBox = document.getElementById('flashWarningBox');
  if (!btnStart) return;

  const hasIso = !!flashState.selectedIsoPath;
  const targetVal = targetSel?.value;
  const hasTarget = !!targetVal;

  if (!hasIso || !hasTarget) {
    btnStart.disabled = true;
    if (warnBox) {
      warnBox.style.background = '#c0c0c0';
      warnBox.style.borderColor = '';
      warnBox.innerHTML = `⚠️ <strong>Attention :</strong> Toutes les données existantes sur la clé USB sélectionnée seront définitivement écrasées et remplacées.`;
    }
    return;
  }

  // Vérification de taille
  const opt = targetSel.selectedOptions[0];
  const tgtSize = parseInt(opt?.dataset?.size || '0', 10);
  const isoSize = flashState.selectedIsoInfo?.size || 0;

  if (tgtSize > 0 && isoSize > 0 && tgtSize < isoSize) {
    btnStart.disabled = true;
    if (warnBox) {
      warnBox.style.background = '#c0c0c0';
      warnBox.style.borderColor = '';
      warnBox.innerHTML = `<span style="color:#800000;font-weight:bold;">⛔ Taille insuffisante :</span> La clé USB (${opt.dataset.sizeFormatted || 'inconnue'}) est plus petite que l'image ISO (${flashState.selectedIsoInfo?.size_formatted || 'inconnue'}). Veuillez brancher une clé USB plus grande.`;
    }
    return;
  }

  btnStart.disabled = false;
  if (warnBox) {
    warnBox.style.background = '#c0c0c0';
    warnBox.style.borderColor = '';
    warnBox.innerHTML = `⚠️ <strong>Attention :</strong> Toutes les données présentes sur <strong>${escapeHtml(opt?.textContent || targetVal)}</strong> seront définitivement écrasées et remplacées par le système amorçable UEFI.`;
  }
}

function drawFlashSpeedGraph(history, currentPercent = 0) {
  history = smoothSpeedHistory(history);
  const canvas = document.getElementById('flashSpeedCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement?.clientWidth || canvas.clientWidth || 300;
  const h = canvas.parentElement?.clientHeight || canvas.clientHeight || 180;

  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  // Écran CRT noir pur d'époque Win98 / WinDirStat
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  // Grille phosphore verte foncée (maillage 16x14)
  ctx.strokeStyle = '#003600';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }

  // Ligne d'arrivée droite
  ctx.strokeStyle = '#008000';
  ctx.beginPath();
  ctx.moveTo(w - 1, 0);
  ctx.lineTo(w - 1, h);
  ctx.stroke();

  if (!history || history.length === 0) {
    // Ligne plate à 0
    ctx.strokeStyle = '#00aa00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h - 2);
    ctx.lineTo(w, h - 2);
    ctx.stroke();
    return;
  }

  // Calcul échelle dynamique
  const speeds = history.map(pt => (typeof pt.speed === 'number' ? pt.speed : 0));
  const maxSpeed = Math.max(5, Math.ceil(Math.max(...speeds) * 1.25));

  // Graduations de vitesse sur le côté
  ctx.fillStyle = '#00bb00';
  ctx.font = '9px monospace';
  ctx.fillText(`${maxSpeed} Mo/s`, 4, 11);
  ctx.fillText(`${(maxSpeed / 2).toFixed(1)} Mo/s`, 4, Math.floor(h / 2) + 3);

  // Tracé de la courbe
  const paddingBottom = 4;
  const paddingTop = 8;
  const plotH = h - paddingBottom - paddingTop;

  ctx.beginPath();
  let first = true;
  let lastX = 0;
  let lastY = h - paddingBottom;

  for (let i = 0; i < history.length; i++) {
    const pt = history[i];
    const spd = Math.max(0, pt.speed || 0);
    let x;
    if (typeof pt.pct === 'number' && pt.pct >= 0) {
      x = (pt.pct / 100) * (w - 4);
    } else {
      x = (i / Math.max(1, history.length - 1)) * (w - 4);
    }
    const yRatio = Math.min(1, spd / maxSpeed);
    const y = h - paddingBottom - (yRatio * plotH);

    if (first) {
      ctx.moveTo(x, y);
      first = false;
    } else {
      ctx.lineTo(x, y);
    }
    lastX = x;
    lastY = y;
  }

  // Lueur / remplissage sous la courbe
  ctx.save();
  ctx.lineTo(lastX, h - paddingBottom);
  ctx.lineTo(0, h - paddingBottom);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 255, 0, 0.12)';
  ctx.fill();
  ctx.restore();

  // Ligne de courbe vert néon vif
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Point culminant / curseur actuel
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}


// =============================================================================
// GESTIONNAIRE RÉSEAU & PROPRIÉTÉS TCP/IP (WINDOWS 98 STYLE)
// =============================================================================
const networkState = {
  interfaces: [],
  isLoading: false,
  showInactive: false,
  visibleOrder: [],   // ordre d'affichage mémorisé : une carte déjà affichée ne change jamais de place
};

// Sablier pixel-art Windows 95/98 : 6 images (le sable s'écoule), animées en CSS
function pixelHourglassHtml() {
  const K = '#000000', W = '#ffffff', Y = '#e0b800', G = '#808080';
  const hw = [4, 4, 3, 2, 1, 0, 0, 1, 2, 3, 4, 4]; // demi-largeur intérieure, lignes y = 2..13
  const span = (y) => { const h = hw[y - 2]; return [5 - h, 6 + h]; };
  const rect = (x, y, w, c) => `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${c}"/>`;
  let frames = '';
  for (let f = 0; f < 6; f++) {
    const top = 5 - f, bottom = f;
    let g = '';
    g += rect(1, 0, 10, K) + rect(1, 1, 10, G);
    g += rect(1, 14, 10, G) + rect(1, 15, 10, K);
    for (let y = 2; y <= 13; y++) {
      const [l, r] = span(y);
      g += rect(l - 1, y, 1, K) + rect(r + 1, y, 1, K);
      let c = W;
      if (y <= 6 && y >= 7 - top) c = Y;                    // sable qui reste en haut
      if (y >= 9 && y >= 14 - bottom) c = Y;                // tas de sable en bas
      if ((y === 7 || y === 8) && f < 5) c = Y;             // filet de sable dans le col
      g += rect(l, y, r - l + 1, c);
    }
    frames += `<g class="hg-f hg-f${f}">${g}</g>`;
  }
  return `<span class="pixel-hourglass" aria-hidden="true"><svg viewBox="0 0 12 16" xmlns="http://www.w3.org/2000/svg">${frames}</svg></span>`;
}

function setNetworkBusy(on, text) {
  const el = document.getElementById('netBusyIndicator');
  if (!el) return;
  if (on) {
    el.innerHTML = `${pixelHourglassHtml()}<span>${escapeHtml(text || 'Récupération de la configuration réseau...')}</span>`;
    el.style.display = 'inline-flex';
  } else {
    el.style.display = 'none';
    el.innerHTML = '';
  }
}

// Détection automatique des interfaces (comme Réglages Système de macOS)
let networkWatchTimer = null;
let networkWatchVersion = null;
let networkRefreshPending = false;
let networkRefreshBusy = false;

function onEnterNetworkView() {
  loadNetworkInterfaces();
  startNetworkWatch();
}

function startNetworkWatch() {
  stopNetworkWatch();
  networkWatchVersion = null;
  networkWatchTimer = setInterval(async () => {
    if (state.currentView !== 'network') { stopNetworkWatch(); return; }
    try {
      const res = await fetch('/api/network/version');
      if (!res.ok) return;
      const { version } = await res.json();
      if (networkWatchVersion === null) { networkWatchVersion = version; return; }
      if (version !== networkWatchVersion) {
        networkWatchVersion = version;
        requestNetworkRefresh();
      } else if (networkRefreshPending) {
        requestNetworkRefresh();
      }
    } catch (e) {}
  }, 1500);
}

window.addEventListener('focus', () => {
  if (state.currentView === 'network') requestNetworkRefresh();
});

function stopNetworkWatch() {
  if (networkWatchTimer) clearInterval(networkWatchTimer);
  networkWatchTimer = null;
  networkRefreshPending = false;
}

// Ne remplace jamais les cartes pendant que l'utilisateur saisit des valeurs : on attend qu'il ait fini.
function requestNetworkRefresh() {
  const grid = document.getElementById('networkCardsGrid');
  const ae = document.activeElement;
  if (grid && ae && grid.contains(ae) && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT')) {
    networkRefreshPending = true;
    return;
  }
  networkRefreshPending = false;
  loadNetworkInterfaces({ silent: true });
}

async function loadNetworkInterfaces(opts = {}) {
  const silent = !!opts.silent;
  const container = document.getElementById('networkCardsGrid');
  if (!container) return;
  if (networkRefreshBusy) return;
  networkRefreshBusy = true;

  networkState.isLoading = true;
  setNetworkBusy(true, silent ? 'Mise à jour de la configuration réseau...' : 'Récupération de la configuration réseau...');
  if (!silent) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: #444; font-style: italic;">
        <div style="font-size: 13px; font-weight: bold; margin-bottom: 6px;">Détection des adaptateurs réseau en cours...</div>
        <div style="font-size: 11px;">Interrogation du sous-système réseau macOS (networksetup & ifconfig)...</div>
      </div>
    `;
  }

  try {
    const res = await fetch('/api/network/interfaces');
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Erreur HTTP ${res.status}`);
    }
    const data = await res.json();
    const next = Array.isArray(data) ? data : [];
    const prev = networkState.interfaces || [];

    if (silent) {
      // Annonce les adaptateurs ajoutés / retirés, puis ne redessine que si quelque chose a changé
      const key = (i) => `${i.service_name}|${i.device || ''}`;
      const prevKeys = new Set(prev.map(key));
      const nextKeys = new Set(next.map(key));
      next.filter(i => !prevKeys.has(key(i))).forEach(i => showToast(`Nouvelle interface détectée : ${i.service_name}${i.device ? ' (' + i.device + ')' : ''}`, 'info'));
      prev.filter(i => !nextKeys.has(key(i))).forEach(i => showToast(`Interface retirée : ${i.service_name}`, 'info'));
      if (JSON.stringify(prev) === JSON.stringify(next)) return;
    }

    if (!silent) networkState.visibleOrder = [];   // chargement complet : ordre initial recalculé
    const scrollers = [container, container.parentElement, container.closest('.view-content')].filter(Boolean);
    const tops = scrollers.map(el => el.scrollTop);
    networkState.interfaces = next;
    renderNetworkCards(networkState.interfaces);
    scrollers.forEach((el, i) => { el.scrollTop = tops[i]; });
  } catch (err) {
    if (silent) return;
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 20px; background: #fff0f0; border: 1px solid #cc0000; color: #990000;">
        <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px;">⚠️ Impossible de charger la configuration réseau</div>
        <div style="font-size: 11px;">${escapeHtml(err.message)}</div>
        <button class="btn" onclick="loadNetworkInterfaces()" style="margin-top: 10px; padding: 3px 12px;">Réessayer</button>
      </div>
    `;
    showToast(`Erreur réseau : ${err.message}`, 'error');
  } finally {
    networkState.isLoading = false;
    networkRefreshBusy = false;
    setNetworkBusy(false);
  }
}

function renderNetworkCards(interfaces) {
  const container = document.getElementById('networkCardsGrid');
  if (!container) return;

  const btnToggle = document.getElementById('btnToggleInactiveNet');
  const inactiveCount = (interfaces || []).filter(i => !i.is_active).length;
  if (btnToggle) {
    if (networkState.showInactive) {
      btnToggle.textContent = 'Masquer les interfaces désactivées';
    } else {
      btnToggle.textContent = inactiveCount > 0
        ? `Afficher les interfaces désactivées (${inactiveCount})`
        : 'Afficher les interfaces désactivées';
    }
  }

  let listToRender = (networkState.showInactive ? interfaces : (interfaces || []).filter(i => i.is_active)) || [];

  // Ordre stable : les cartes déjà visibles gardent leur place, les nouvelles s'ajoutent à la fin
  const orderKey = (i) => `${i.service_name}|${i.device || ''}`;
  const known = networkState.visibleOrder || [];
  const nowKeys = listToRender.map(orderKey);
  networkState.visibleOrder = known.filter(k => nowKeys.includes(k)).concat(nowKeys.filter(k => !known.includes(k)));
  listToRender = [...listToRender].sort((a, b) => networkState.visibleOrder.indexOf(orderKey(a)) - networkState.visibleOrder.indexOf(orderKey(b)));

  if (!listToRender || listToRender.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: #555;">
        ${(interfaces && interfaces.length > 0)
          ? 'Toutes les interfaces physiques sont inactives. Cliquez sur « Afficher les interfaces désactivées » ci-dessus pour les configurer.'
          : 'Aucune interface réseau physique détectée sur ce Mac.'}
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  listToRender.forEach((iface, idx) => {
    const card = document.createElement('div');
    card.className = 'network-card' + (iface.is_acquiring ? ' is-acquiring' : '');

    const isConnected = !!iface.is_active;
    const isAcquiring = !!iface.is_acquiring;
    const isManual = iface.config_type === 'manual';
    const statusClass = isAcquiring ? 'acquiring' : (isConnected ? 'connected' : 'disconnected');
    const statusText = isAcquiring ? `${pixelHourglassHtml()}<span>Obtention de l'adresse IP...</span>` : (isConnected ? '● Connecté' : 'Déconnecté');
    const iconSrc = iface.adapter_type === 'wifi'
      ? 'static/icons/win98/network.png'
      : (iface.adapter_type === 'thunderbolt' ? 'static/icons/win98/network.png' : 'static/icons/win98/network.png');

    const dns1 = (iface.dns_servers && iface.dns_servers[0]) || '';
    const dns2 = (iface.dns_servers && iface.dns_servers[1]) || '';
    const isDnsManual = iface.dns_mode === 'manual';

    // Déterminer la passerelle par défaut active globale comme fallback
    const globalDefaultGw = (interfaces.find(i => i.is_default_gateway && i.router) || interfaces.find(i => i.router) || {}).router || '192.168.1.1';

    // Configuration actuelle de l'interface (même en DHCP)
    const currentIp = iface.ip_address || '';
    const currentMask = iface.subnet_mask || (currentIp ? '255.255.255.0' : '');
    const currentGw = iface.router || (currentIp ? globalDefaultGw : '');

    // Déterminer la passerelle par défaut pour le test ping
    const pingTarget = iface.router || globalDefaultGw;

    card.innerHTML = `
      <div class="network-card-titlebar">
        <div class="network-card-title-left">
          <img src="${iconSrc}" width="16" height="16" style="image-rendering:pixelated;" alt="">
          <span>${escapeHtml(iface.service_name)}</span>
          ${iface.device ? `<span style="font-weight:normal;opacity:0.85;">(${escapeHtml(iface.device)})</span>` : ''}
        </div>
        <span class="network-card-status-badge ${statusClass}">${statusText}</span>
      </div>

      <div class="network-card-body">
        <!-- Bandeau d'informations matérielles -->
        <div class="network-info-strip">
          <span><strong>Type :</strong> ${escapeHtml(iface.type_label || iface.service_name)}</span>
          <span><strong>MAC :</strong> ${escapeHtml(iface.mac_address || 'Non spécifiée')}</span>
        </div>

        <!-- Groupbox Adressage IP -->
        <fieldset class="network-groupbox">
          <legend>Propriétés TCP/IP (IPv4)</legend>
          
          <label class="network-radio-row">
            <input type="radio" name="net_mode_${idx}" value="dhcp" ${!isManual ? 'checked' : ''} id="radDhcp_${idx}">
            <span>Obtenir une adresse IP automatiquement (DHCP)</span>
          </label>

          <label class="network-radio-row">
            <input type="radio" name="net_mode_${idx}" value="manual" ${isManual ? 'checked' : ''} id="radManual_${idx}">
            <span>Utiliser l'adresse IP suivante (Statique) :</span>
          </label>

          <div class="network-fields-wrap">
            <div class="network-field-row">
              <span class="network-field-label">Adresse IP :</span>
              <input type="text" class="network-input" id="netIp_${idx}" 
                     value="${escapeHtml(currentIp)}" 
                     placeholder="ex: 192.168.1.50" 
                     ${!isManual ? 'disabled' : ''}>
            </div>
            <div class="network-field-row">
              <span class="network-field-label">Masque de sous-réseau :</span>
              <input type="text" class="network-input" id="netMask_${idx}" 
                     value="${escapeHtml(currentMask)}" 
                     placeholder="255.255.255.0" 
                     ${!isManual ? 'disabled' : ''}>
            </div>
            <div class="network-field-row">
              <span class="network-field-label">Passerelle par défaut :</span>
              <input type="text" class="network-input" id="netGw_${idx}" 
                     value="${escapeHtml(currentGw)}" 
                     placeholder="ex: 192.168.1.1" 
                     ${!isManual ? 'disabled' : ''}>
            </div>
          </div>
        </fieldset>

        <!-- Groupbox Serveurs DNS -->
        <fieldset class="network-groupbox">
          <legend>Serveurs de noms de domaine (DNS)</legend>

          <label class="network-radio-row">
            <input type="radio" name="net_dns_mode_${idx}" value="auto" ${!isDnsManual ? 'checked' : ''} id="radDnsAuto_${idx}">
            <span>Obtenir les adresses des serveurs DNS automatiquement</span>
          </label>

          <label class="network-radio-row">
            <input type="radio" name="net_dns_mode_${idx}" value="manual" ${isDnsManual ? 'checked' : ''} id="radDnsManual_${idx}">
            <span>Utiliser les adresses de serveur DNS suivantes :</span>
          </label>

          <div class="network-fields-wrap">
            <div class="network-field-row">
              <span class="network-field-label">Serveur DNS préféré :</span>
              <input type="text" class="network-input" id="netDns1_${idx}" 
                     value="${escapeHtml(dns1)}" 
                     placeholder="ex: 1.1.1.1"
                     ${!isDnsManual ? 'disabled' : ''}>
            </div>
            <div class="network-field-row">
              <span class="network-field-label">Serveur DNS auxiliaire :</span>
              <input type="text" class="network-input" id="netDns2_${idx}" 
                     value="${escapeHtml(dns2)}" 
                     placeholder="ex: 8.8.8.8"
                     ${!isDnsManual ? 'disabled' : ''}>
            </div>
          </div>
        </fieldset>

        <!-- Actions de la carte -->
        <div class="network-card-actions">
          <button class="btn" id="btnNetSave_${idx}" style="padding:4px 14px;font-weight:bold;">
            💾 Appliquer les paramètres
          </button>
        </div>

        <!-- Diagnostic et Test Ping vers la passerelle -->
        <fieldset class="network-groupbox" style="margin-top:2px;">
          <legend>Diagnostic de connectivité (Test Ping)</legend>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:11px;white-space:nowrap;">Adresse IP :</span>
            <input type="text" class="network-input" id="netPingTarget_${idx}" 
                   value="${escapeHtml(pingTarget)}" 
                   placeholder="ex: 192.168.1.1" style="max-width:180px;">
            <button class="btn" id="btnNetPing_${idx}" style="padding:2px 14px;font-weight:bold;white-space:nowrap;">Test</button>
            <span id="netPingResult_${idx}" style="font-weight:bold;font-size:12px;margin-left:4px;"></span>
          </div>
        </fieldset>
      </div>
    `;

    container.appendChild(card);

    // Événements dynamiques de la carte
    const radDhcp = document.getElementById(`radDhcp_${idx}`);
    const radManual = document.getElementById(`radManual_${idx}`);
    const inputIp = document.getElementById(`netIp_${idx}`);
    const inputMask = document.getElementById(`netMask_${idx}`);
    const inputGw = document.getElementById(`netGw_${idx}`);

    // DNS : réglage indépendant de l'IPv4 (DHCP + DNS manuels possible)
    const radDnsAuto = document.getElementById(`radDnsAuto_${idx}`);
    const radDnsManual = document.getElementById(`radDnsManual_${idx}`);
    const inputDns1 = document.getElementById(`netDns1_${idx}`);
    const inputDns2 = document.getElementById(`netDns2_${idx}`);
    const autoDnsList = (iface.dns_dhcp && iface.dns_dhcp.length) ? iface.dns_dhcp : (iface.router ? [iface.router] : []);

    const toggleDnsFields = () => {
      const dnsManual = radDnsManual.checked;
      inputDns1.disabled = !dnsManual;
      inputDns2.disabled = !dnsManual;
      if (dnsManual) {
        // Pré-remplit avec les DNS actuellement utilisés si les champs sont vides
        if (!inputDns1.value.trim() && !inputDns2.value.trim()) {
          inputDns1.value = autoDnsList[0] || '';
          inputDns2.value = autoDnsList[1] || '';
        }
        inputDns1.focus();
        inputDns1.select();
      } else {
        // Mode automatique : affiche les serveurs fournis par le DHCP
        inputDns1.value = autoDnsList[0] || '';
        inputDns2.value = autoDnsList[1] || '';
      }
    };
    radDnsAuto.onchange = toggleDnsFields;
    radDnsManual.onchange = toggleDnsFields;

    const toggleFields = () => {
      const manualMode = radManual.checked;
      inputIp.disabled = !manualMode;
      inputMask.disabled = !manualMode;
      inputGw.disabled = !manualMode;

      // En IP statique, aucun DNS n'est fourni par le DHCP : on impose la saisie manuelle des DNS
      radDnsAuto.disabled = manualMode;
      if (manualMode && radDnsAuto.checked) {
        radDnsManual.checked = true;
        toggleDnsFields();
      }

      if (manualMode) {
        // En passant en mode statique, pré-remplir immédiatement avec la configuration actuelle si vide
        if (!inputIp.value.trim() && iface.ip_address) {
          inputIp.value = iface.ip_address;
        }
        if (!inputMask.value.trim()) {
          inputMask.value = iface.subnet_mask || '255.255.255.0';
        }
        if (!inputGw.value.trim()) {
          inputGw.value = iface.router || globalDefaultGw || '';
        }
        // Donner le focus à l'IP pour permettre une modification directe
        inputIp.focus();
        inputIp.select();
      } else {
        // En mode DHCP, ré-afficher les valeurs actives
        if (iface.ip_address) inputIp.value = iface.ip_address;
        if (iface.subnet_mask) inputMask.value = iface.subnet_mask;
        if (iface.router) inputGw.value = iface.router;
      }
    };

    radDhcp.onchange = toggleFields;
    radManual.onchange = toggleFields;
    radDnsAuto.disabled = radManual.checked;

    // Enregistrement de la configuration
    const btnSave = document.getElementById(`btnNetSave_${idx}`);
    btnSave.onclick = async () => {
      await handleNetworkConfigSave(iface, idx);
    };

    // Test ping
    const btnPing = document.getElementById(`btnNetPing_${idx}`);
    btnPing.onclick = async () => {
      await handleNetworkPing(idx);
    };
  });
}

async function handleNetworkConfigSave(iface, idx) {
  const radManual = document.getElementById(`radManual_${idx}`);
  const inputIp = document.getElementById(`netIp_${idx}`);
  const inputMask = document.getElementById(`netMask_${idx}`);
  const inputGw = document.getElementById(`netGw_${idx}`);
  const inputDns1 = document.getElementById(`netDns1_${idx}`);
  const inputDns2 = document.getElementById(`netDns2_${idx}`);
  const btnSave = document.getElementById(`btnNetSave_${idx}`);

  const isManual = radManual && radManual.checked;
  const configType = isManual ? 'manual' : 'dhcp';
  const ip = inputIp ? inputIp.value.trim() : '';
  const subnet = inputMask ? inputMask.value.trim() : '255.255.255.0';
  const router = inputGw ? inputGw.value.trim() : '';

  const radDnsManual = document.getElementById(`radDnsManual_${idx}`);
  const isDnsManual = !!(radDnsManual && radDnsManual.checked);
  const dnsServers = [];
  if (isDnsManual) {
    if (inputDns1 && inputDns1.value.trim()) dnsServers.push(inputDns1.value.trim());
    if (inputDns2 && inputDns2.value.trim()) dnsServers.push(inputDns2.value.trim());
    const ipRegexDns = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (dnsServers.length === 0) {
      alert("Saisissez au moins un serveur DNS, ou choisissez « Obtenir les adresses des serveurs DNS automatiquement ».");
      inputDns1.focus();
      return;
    }
    const badDns = dnsServers.find(d => !ipRegexDns.test(d));
    if (badDns) {
      alert(`Serveur DNS invalide : ${badDns}`);
      inputDns1.focus();
      return;
    }
  }

  if (isManual) {
    const ipRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ip)) {
      alert("Veuillez saisir une adresse IP valide (ex: 192.168.1.50).");
      inputIp.focus();
      return;
    }
    if (!ipRegex.test(subnet)) {
      alert("Veuillez saisir un masque de sous-réseau valide (ex: 255.255.255.0).");
      inputMask.focus();
      return;
    }
    if (router && !ipRegex.test(router)) {
      alert("L'adresse de passerelle par défaut n'est pas valide.");
      inputGw.focus();
      return;
    }
  }

  const dnsSummary = isDnsManual ? `DNS : ${dnsServers.join(', ')} (manuels)` : 'DNS : automatiques (DHCP)';
  const confirmMsg = isManual
    ? `Appliquer la configuration IP statique sur « ${iface.service_name} » ?\n\nIP : ${ip}\nMasque : ${subnet}\nPasserelle : ${router || 'Aucune'}\n${dnsSummary}`
    : `Appliquer sur « ${iface.service_name} » : adresse IP automatique (DHCP)\n${dnsSummary} ?`;

  if (!confirm(confirmMsg)) return;

  const originalText = btnSave.innerHTML;
  btnSave.disabled = true;
  btnSave.innerHTML = `Application en cours...`;

  try {
    const res = await fetch('/api/network/set-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_name: iface.service_name,
        config_type: configType,
        ip_address: ip,
        subnet_mask: subnet,
        router: router,
        dns_mode: isDnsManual ? 'manual' : 'auto',
        dns_servers: dnsServers
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || `Échec de l'application des paramètres`);
    }

    showToast(`Configuration de « ${iface.service_name} » mise à jour avec succès`, 'success');
    // Rafraîchir les données de l'interface après 1 seconde
    setTimeout(() => {
      loadNetworkInterfaces();
    }, 1200);
  } catch (err) {
    alert(`Erreur lors de la modification des paramètres réseau :\n\n${err.message}`);
    showToast(err.message, 'error');
  } finally {
    btnSave.disabled = false;
    btnSave.innerHTML = originalText;
  }
}

async function handleNetworkPing(idx) {
  const targetInput = document.getElementById(`netPingTarget_${idx}`);
  const btnPing = document.getElementById(`btnNetPing_${idx}`);
  const resultElem = document.getElementById(`netPingResult_${idx}`);

  const target = targetInput ? targetInput.value.trim() : '';
  if (!target) {
    alert("Veuillez renseigner une adresse IP ou un hôte à tester.");
    return;
  }

  if (btnPing) {
    btnPing.disabled = true;
    btnPing.textContent = '...';
  }
  if (resultElem) {
    resultElem.style.color = '#555555';
    resultElem.textContent = '...';
  }

  try {
    const res = await fetch('/api/network/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: target, count: 2 })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      if (resultElem) {
        resultElem.style.color = '#c00000';
        resultElem.textContent = 'NOK';
      }
    } else {
      if (resultElem) {
        resultElem.style.color = '#008000';
        resultElem.textContent = 'OK';
      }
    }
  } catch (err) {
    if (resultElem) {
      resultElem.style.color = '#c00000';
      resultElem.textContent = 'NOK';
    }
  } finally {
    if (btnPing) {
      btnPing.disabled = false;
      btnPing.textContent = 'Test';
    }
  }
}



