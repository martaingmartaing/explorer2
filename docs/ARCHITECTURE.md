# Explorer 2 — Documentation d'architecture

Document de passation : décrit **comment le code actuel fonctionne**, pas comment il devrait être réécrit. Il est destiné à servir de spécification pour une réimplémentation en **Rust** (Tauri ou egui) de la même application.

---

## 1. Ce qu'est l'application

Explorateur de fichiers macOS de type « Windows 98 / XP », avec 7 fonctionnalités principales réunies dans une seule fenêtre à barre latérale de navigation :

| Vue | Identifiant DOM | Rôle |
|---|---|---|
| Explorateur | `#viewExplorer` | Navigation fichiers, onglets, presse-papier, aperçu, terminal intégré |
| SMART | `#viewSmart` | Santé des disques physiques + illustration pixel-art |
| Gestionnaire de tâches | `#viewTaskmgr` | CPU/RAM/Disque/Réseau/GPU/Processus en temps réel |
| Espace (WinDirStat) | `#viewSpace` | Analyse d'espace disque + Treemap |
| Cloner | `#viewClone` | Clonage disque à bloc / image disque |
| Flash | `#viewFlash` | Écriture d'ISO sur clé USB |
| Réseau | `#viewNetwork` | Interfaces, IP/DNS, ping, partages SMB |

Aucune donnée ne quitte la machine : tout est local.

---

## 2. Architecture actuelle : trois couches

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Electron Main Process      electron-main.js (1 897 l.)   │
│    - 1 fenêtre principale + N fenêtres secondaires          │
│    - IPC (fenêtres, drag&drop natif, presse-papier, dialogs)│
│    - démarre et arrête le backend Python                    │
│    - pont TCP local 127.0.0.1:8001 (autorisation réseau LAN)│
└───────────────┬──────────────────────────────┬──────────────┘
                │ spawn                        │ IPC (preload.js)
                ▼                              ▼
┌───────────────────────────────┐  ┌──────────────────────────┐
│ 2. Backend FastAPI (Python)   │  │ 3. Renderer (HTML/CSS/JS)│
│    main.py (5 937 l.)         │◄─┤ index.html (1 215 l.)    │
│    HTTP 127.0.0.1:8000        │  │ static/app.js (11 512 l.)│
│    + WebSocket terminal       │  │ static/style.css (8 792) │
│    + threads de fond          │  │ chargée en file://       │
└───────────────────────────────┘  └──────────────────────────┘
```

**Point essentiel** : le renderer est chargé via `win.loadFile(index.html)` → protocole `file://`. Il ne peut donc pas faire d'appels relatifs à l'API ; [static/app.js](../static/app.js#L9) définit :

```js
const API_BASE = (window.location.protocol === 'file:') ? 'http://127.0.0.1:8000' : '';
```

D'où le `CORSMiddleware` en `allow_origins=["*"]` côté FastAPI (origine `file://` = `null`). En mode web (`python main.py` puis `http://127.0.0.1:8000`), `API_BASE` est vide et tout est same-origin.

---

## 3. Cycle de démarrage

1. `electron-main.js` : `app.requestSingleInstanceLock()` — **une seule instance** par machine.
2. Optimisations Chromium posées avant `whenReady()` : `enable-gpu-rasterization`, `enable-zero-copy`, `v8-cache-options=code`, `autoplay-policy=no-user-gesture-required`.
3. `ensureLanBridgeServer()` : mini serveur HTTP sur `127.0.0.1:8001` (fallback port aléatoire) exposant `/tcp-tunnel?host=&port=`. Raison : sur macOS, seul le binaire principal Electron possède le `LC_UUID` enregistré dans `nehelper` pour l'autorisation « Réseau local » (NECP). Ce pont permet au backend Python d'ouvrir des sockets TCP vers le LAN (SMB port 445). Le port est passé par la variable d'environnement `EXPLORER2_LAN_BRIDGE_PORT`.
4. `startPythonBackend()` choisit la cible dans cet ordre :
   - dev non packagé + `main.py` + `.venv/bin/python` → `python main.py`
   - binaire PyInstaller : `process.resourcesPath/backend/backend` (packagé) ou `backend-bin/backend/backend` (dev)
   - fallback `python3 main.py`
5. `createWindow()` : `loadFile(index.html)`, preload `preload.js`, puis affiche dès `ready-to-show`.
6. Arrêt : `stopPythonBackend()` envoie `SIGTERM` puis `SIGKILL` après 600 ms.

Le backend écoute **toujours le port 8000 fixe** (`uvicorn.run(app, host="127.0.0.1", port=8000)`). Conséquence pratique : si une instance de l'app tourne déjà, un second `npm start` réutilise ce backend (et les modifications de `main.py` ne sont pas prises en compte). Une implémentation Rust devrait plutôt choisir un port libre et le passer à l'UI.

---

## 4. Couche 1 — Electron Main + preload

### 4.1 Fenêtres

`openWindows: Set<BrowserWindow>` + `windowInitData: Map<webContents.id, {initialPath, tabData}>` : la fenêtre est créée **avant** de connaître ses données, et le renderer les récupère au démarrage via `getInitData()`.

Une fenêtre secondaire par usage, même factory (`loadFile` sur un HTML dédié) :

| Canal IPC | Fichier HTML | Usage |
|---|---|---|
| `window:open-new` | index.html | Nouvelle fenêtre explorateur |
| `window:open-prompt` | `static/prompt.html` | Saisie texte (nouveau dossier/fichier, renommage) — réponse par `window:prompt-result` |
| `window:open-transfer` | `static/transfer.html` | Fenêtre de progression de transfert |
| `window:open-properties` | `static/properties.html` | Propriétés d'un fichier |
| `window:open-smb` | `static/smb.html` | Connexion à un partage réseau |
| `window:open-settings` | `static/settings.html` | Paramètres |
| `window:open-media-player` | `static/media-player.html` | Lecteur audio/vidéo avec visualiseur |
| `window:open-terminal` | `static/terminal.html` | Terminal détaché |

### 4.2 Détachement d'onglet (tear-off)

Séquence coopérative renderer ↔ main, en trois temps :
`tab:detach-start` (début du glissement, le main suit la souris et affiche une fenêtre fantôme) → `tab:detach-end` (relâchement) → `tab:detach` (création réelle de la fenêtre avec `{path, history, historyIndex, title}`).
Le renderer verrouille ses propres événements (`tabDetachInProgress`) pour éviter les doubles détachements.

### 4.3 Presse-papier partagé

`sharedClipboard = { action: 'copy'|'cut', paths: [...] }` dans le main, exposé par `clipboard:set` / `clipboard:get` et diffusé par `clipboard:changed` : copier dans une fenêtre permet de coller dans une autre. Le presse-papier **système** macOS est un canal séparé, géré par un helper Objective-C compilé (`bin/mac-clipboard`, sources `bin/mac-clipboard.m`) pour écrire des `NSPasteboardItem` de type `public.file-url`.

### 4.4 Drag & drop natif

Le drag sortant démarre côté main (`drag:start-native` → `event.sender.startDrag({file, icon})`) car `dataTransfer` HTML ne permet pas de sortir une sélection multi-fichiers vers le Finder. Payload global `globalDragPayload.paths`, avec verrou `drag:mark-drop-handled` / `drag:is-drop-handled` pour qu'un drop interne ne soit pas traité deux fois.

### 4.5 Autres canaux notables

- Fenêtre : `window-minimize`, `window-maximize`, `window-close`, `window-is-maximized`, `window:titlebar-drag-start/end` (drag de titlebar personnalisée, avec gestion du snap), `window:refresh-all` (les fenêtres se rafraîchissent mutuellement après une opération fichier).
- Système : `open-path` (`open` macOS), `dialog:select-directory`, `dialog:select-iso`, `dialog:select-save-image`, `system:open-full-disk-access`, `system:check-full-disk-access`.
- Terminal local : `terminal:execute`, `terminal:write`, `terminal:kill`, `terminal:open-external`, flux par événement `terminal:stream`.
- Thème : `theme:set-window-glass` active/désactive le flou natif (`vibrancy`) de la fenêtre.

`preload.js` (140 lignes) expose tout sous **deux** noms identiques : `window.electronAPI` et `window.api` (rétro-compatibilité). Le code appelle indifféremment l'un ou l'autre.

---

## 5. Couche 2 — Backend FastAPI (`main.py`)

### 5.1 Conventions

- Un seul fichier, une seule `FastAPI()`. Aucune authentification : l'écoute est limitée à `127.0.0.1`.
- Endpoints **synchrones** (`def`, pas `async def`) sauf le WebSocket : FastAPI les exécute dans son threadpool, ce qui évite de bloquer la boucle sur des E/S disque.
- Les opérations longues sont lancées dans un `threading.Thread(daemon=True)` et exposées par un triplet `POST .../start` → `GET .../status/{task_id}` → `POST .../cancel/{task_id}`. **Le front interroge par polling**, il n'y a pas de push (sauf le terminal).
- Les tâches sont stockées dans des dictionnaires globaux protégés par un `threading.Lock` : `tasks_store`, `CLONE_TASKS`, `FLASH_TASKS`, `SPACE_SCAN_TASKS`.

### 5.2 Catalogue des endpoints

**Navigation / fichiers**

| Méthode | Route | Notes |
|---|---|---|
| GET | `/api/browse?path=&show_hidden=` | `scandir` non récursif. Renvoie `{current_path, parent_path, drive, items[]}` |
| GET | `/api/fs/metadata?path=` | Propriétés système + métadonnées image (PNG/JPEG/GIF/WebP/BMP/ICO/SVG) + EXIF, parsées à la main (aucune dépendance) |
| GET | `/api/fs/folder-size?path=` | Parcours itératif (pile) pour taille, nb fichiers/dossiers, éléments ignorés |
| POST | `/api/fs/calculate-size` | Taille cumulée de plusieurs chemins |
| GET | `/api/fs/preview?path=&show_hidden=` | Aperçu typé : `directory`, `archive`, `docx`, `xlsx`, `text`, `error`, `unsupported` |
| GET/HEAD | `/api/fs/raw?path=` | Flux binaire brut (images, vidéo, audio) avec `Range` |
| POST | `/api/fs/open` | `open` système |
| POST | `/api/fs/create` | Fichier/dossier |
| POST | `/api/fs/rename` | |
| POST | `/api/fs/compress_task` / `/api/fs/extract_task` | Tâches `zip`/`unzip` |
| POST | `/api/fs/archive/extract-member`, `/member-extract-temp`, `/delete-member`, `/rename-member` | Édition **à l'intérieur** d'une archive sans la décompresser entièrement |
| POST | `/api/fs/transfer` | Copie/déplacement par lots (voir §6.1) |
| POST | `/api/fs/trash_task` | Mise à la corbeille (`send2trash`) |
| GET | `/api/tasks/{id}/status`, `/api/tasks/{id}` | Progression d'une tâche de transfert |
| POST | `/api/tasks/{id}/cancel` | |

**Disques / SMART / clonage / flash**

| Méthode | Route | Notes |
|---|---|---|
| GET | `/api/drives` | Volumes montés + espace libre/total + type de bus (`diskutil info -plist`). L'espace vient du helper natif (voir §9.1) |
| GET | `/api/network/letters` | Stub de compatibilité, renvoie toujours `[]` |
| POST | `/api/drives/eject` | `diskutil eject` → `hdiutil detach` → `unmount force` |
| GET | `/api/smart/disks` | `system_profiler SPNVMeDataType` + `diskutil list -plist` |
| POST | `/api/disks/format` | `diskutil eraseDisk` / `eraseVolume` via `osascript ... with administrator privileges` |
| POST | `/api/disks/clone/start` · `GET .../status/{id}` · `POST .../cancel/{id}` | `dd` bloc à bloc, ou `hdiutil create` pour l'image |
| GET | `/api/dialog/select-iso`, `/api/dialog/select-save-image` | `osascript` `choose file` / `choose file name` |
| GET | `/api/flash/inspect-iso?path=` | Lit le secteur ISO 9660 pour valider/obtenir le libellé |
| POST | `/api/flash/start` · `GET .../status/{id}` · `POST .../cancel/{id}` | Écriture ISO → device |
| GET | `/api/system/check-permissions` | Accès complet au disque (test de lecture d'un chemin protégé) |
| POST | `/api/system/open-full-disk-access` | Ouvre Réglages Système |

**Réseau / SMB**

| Méthode | Route | Notes |
|---|---|---|
| GET | `/api/network/discover?server=` (alias `/api/smb/shares`) | Découverte des partages : envoi RPC `NetShareEnumAll` brut (MS-RPCE) via `smbprotocol`/`spnego`, avec repli sur `smbutil view -N` |
| POST | `/api/network/connect` (alias `/api/smb/mount`) | Montage via `osascript` `mount volume` |
| POST | `/api/network/disconnect` (alias `/api/smb/unmount`) | `diskutil unmount` puis `force` |
| GET | `/api/network/interfaces` | `networksetup -listallnetworkservices` + config IP/routeur/DNS + trafic |
| POST | `/api/network/set-config` | IP/masque/passerelle/DNS via `networksetup` (admin) |
| POST | `/api/network/ping` | `ping -c N` parsé (moyenne, perte) |

**Système / performances**

| Méthode | Route | Notes |
|---|---|---|
| GET | `/api/taskmgr/processes` | Cache alimenté en arrière-plan (`psutil`) |
| GET | `/api/taskmgr/performance` | CPU global + par cœur, RAM, disque, réseau, GPU, températures — **snapshot instantané d'un cache** |
| POST | `/api/taskmgr/kill` | |
| GET | `/api/taskmgr/process-icon?path=` | Extrait l'icône d'un bundle `.app` |
| WS | `/api/terminal/ws?cols=&rows=&cwd=` | Vrai PTY (voir §6.3) |

**Espace / divers**

| Méthode | Route | Notes |
|---|---|---|
| GET | `/api/space/tree-dirs?path=` | Arborescence de premier niveau pour l'explorateur de l'analyseur |
| POST | `/api/space/scan/start` · `GET .../status/{id}` · `POST .../cancel/{id}` | Analyse récursive, arbre + stats par extension, renvoyés **seulement à la fin** |
| GET/POST | `/api/favorites` | Favoris persistés |
| GET | `/api/media/audio-info`, `/api/media/audio-companion-stream` | Métadonnées audio et flux de la piste « companion » |

### 5.3 Threads de fond permanents

Lancés à l'import du module, en `daemon=True` :

- `_taskmgr_worker()` : boucle qui rafraîchit `_taskmgr_processes` / `_taskmgr_performance` (CPU par processus via `psutil`, débits disque et réseau par différence de compteurs entre deux mesures). Le endpoint ne fait que lire le cache sous verrou.
- `_hardware_collector_worker()` : toutes les 60 s, `system_profiler SPMemoryDataType` / `SPDisplaysDataType -json` pour modèle de GPU, cœurs GPU, type de RAM.

C'est un choix de conception important : **toute collecte coûteuse est faite hors requête**, les endpoints répondent en < 5 ms.

---

## 6. Flux fonctionnels détaillés

### 6.1 Transfert de fichiers (copie / déplacement)

1. `POST /api/fs/transfer` → `scan_files_to_transfer()` parcourt les sources et construit une liste plate `(src, dest_relatif, taille, is_dir)`, plus le total d'octets. Ignore `._*` et `.DS_Store` (pollution smbfs).
2. Création d'un `TransferTask` (compteurs, historique de vitesse limité à 80 points, ETA, verrou).
3. Thread `execute_transfer()` : copie par blocs avec callback de progression ; `_unique_copy_path()` génère « … - Copie », « … - Copie (2) » si la destination existe ; `_force_remove()` / `_safe_delete_path()` gèrent les permissions bloquantes.
4. Le front ouvre la fenêtre `transfer.html` et **polling** `GET /api/tasks/{id}/status` **toutes les 100 ms** : remplit la barre, le badge de vitesse et la courbe (`speedCanvas`). Le polling est protégé par un drapeau `inFlight` (pas de requêtes simultanées) et s'arrête sur `done`/`error`.

### 6.2 Analyse d'espace (WinDirStat)

`_run_space_scan()` : récursion `os.scandir`, exclusion des fichiers système macOS (`.Spotlight-V100`, `.fseventsd`, `._*`…), arrêt de la récursion à `max_depth` (3–8, défaut 6) mais **cumul des tailles au-delà**. Ignore les symlinks et évite les doublons de firmlinks sur `/`.
Résultat : `tree` (nœuds `{name, path, size, is_dir, files_count, dirs_count, children[]}`) + `extensions` triées par taille.

Côté UI, la Treemap est un **algorithme squarifié** dessiné sur `<canvas>` avec un effet « cushion » (dégradé linéaire + contour), et une file `treemapRects[]` pour retrouver la case survolée. Le statut est interrogé toutes les **220 ms** ; l'arbre complet n'arrive qu'au dernier `status`, ce qui évite de transférer des dizaines de Mo de JSON en cours d'analyse.

### Cadences de polling à respecter

| Vue | Intervalle |
|---|---|
| Transfert | 100 ms |
| Flash ISO | 250 ms |
| Clonage disque | 600 ms |
| Analyse d'espace | 220 ms (+ 1 200 ms pour le rafraîchissement des disques) |
| Gestionnaire de tâches | 1 200 ms |

### 6.3 Terminal intégré

Le WebSocket ouvre un **vrai PTY** : `pty.openpty()` → `os.fork()` → enfant : `setsid()`, `TIOCSCTTY`, `dup2` sur 0/1/2, `chdir(cwd)`, `execvpe($SHELL, [$SHELL, "-il"], env)`. Le parent fait du `select` non bloquant sur le master fd et envoie les octets bruts au client ; le client renvoie les frappes, et les messages de contrôle sont des objets JSON (`{"type":"exit"}`, `{"type":"pong"}`) pour ne pas polluer le flux.
Sécurité : l'origine doit être `file://`, `null` ou `http://127.0.0.1|localhost`, sinon `close(1008)`.
Le rendu utilise `xterm.js` (`static/vendor/xterm/`).

### 6.4 Aperçu (volet droit)

`updatePreviewPane()` :
- dossier → `GET /api/fs/preview` (max 500 entrées, indique `is_truncated`) ;
- archive → même endpoint, renvoie `{items, raw_items}` et permet la navigation interne ;
- image / vidéo / audio → `<img>`/`<video>`/`<audio>` sur `/api/fs/raw?path=`, plus `GET /api/fs/metadata` pour la fiche propriétés + EXIF ;
- texte / docx / xlsx → contenu déjà résumé côté serveur.

Chaque appel est gardé par un compteur de génération pour ignorer les réponses obsolètes quand l'utilisateur change vite de sélection.

### 6.5 Clonage de disque

`_run_clone_or_image(task_id, mode, source_disk, target)` :
- `mode == "image"` et cible `.dmg` → `hdiutil create -srcdevice … -format UDZO` ;
- sinon `dd if=/dev/rdiskN of=… bs=4m`, avec lecture de la sortie `stderr` pour calculer octets écrits / vitesse / pourcentage (le total vient de `diskutil info -plist`).
- Le disque cible est démonté (`diskutil unmountDisk force`) avant, remonté après ; refus si source = cible.
- L'élévation se fait par `osascript -e 'do shell script "…" with administrator privileges'`.

### 6.6 Flash d'ISO

`inspect_iso_file()` lit le secteur 16 de l'image (descripteur de volume ISO 9660) pour valider et récupérer le libellé. `_run_flash_task()` démonte la clé, écrit l'ISO sur le device brut, vide les caches (`sync`), remonte, avec la même progression par parsing de la sortie de `dd`.

### 6.7 Gestionnaire de tâches

Rendu rétro Windows 95/98 (graphiques pixel-art). Les courbes sont redessinées toutes les **1 200 ms** sur des `<canvas>`, avec un historique glissant conservé côté client.

### 6.8 SMART + illustration des disques

`/api/smart/disks` renvoie pour chaque disque : `device_id`, modèle, volume, `model_type_3d` ∈ `nvme | ssd | hdd | usb`, santé (`Healthy`/`Warning`), pourcentage, taille, heures, température, TBW.
Chaque disque est illustré en pixel-art selon son type (rendu canvas 2D).

---

## 7. Structures de données

### 7.1 Élément de dossier (`items[]` de `/api/browse`)

```json
{
  "name": "Rapport.pdf",
  "path": "/Users/martin/Rapport.pdf",
  "is_dir": false,
  "is_hidden": false,
  "size": 48213,
  "size_formatted": "47.1 Ko",
  "modified": "2026-10-30T21:01:12",
  "modified_formatted": "30/10/2026 21:01",
  "extension": ".pdf",
  "type_desc": "Document PDF"
}
```

### 7.2 Onglet (état front, non persisté)

```js
{
  id, title, path, parentPath,
  history: [chemin, …], historyIndex,
  items: [], selectedPaths: [], lastSelectedIndex,
  sortField, sortAsc,
  scrollTop
}
```

### 7.3 Tâche de transfert

`{ task_id, task_type, status, error_message, total_bytes, processed_bytes, compressed_bytes, total_files, processed_files, current_file, speed_mb_sec, speed_history[], percent, eta_seconds, extra_info }`

`status` ∈ `running | done | error | cancelled`.

### 7.4 État global du frontend

```js
const state = {
  theme: 'windows98',        // forcé : applyTheme() ignore toute autre valeur
  currentView: 'explorer',
  tabs: [], activeTabId: null,
  drives: [], favorites: [],
  clipboard: null,           // { action: 'copy'|'cut', paths: [] }
  previewSelection: null,    // élément sélectionné *dans* l'aperçu
  showHidden: false, showPreview: false,
  columnOrder: ['name','modified','type_desc','size'],
  columnWidths: {...}
};
```

Persistance UI (aucune donnée métier) dans `localStorage` :

| Clé | Contenu |
|---|---|
| `explorer_theme` | Thème (toujours `windows98`) |
| `explorer_col_order` / `explorer_columns_order` | Ordre des colonnes |
| `explorer_col_widths` | Largeurs de colonnes |
| `explorer_sidebar_width` / `explorer_sidebar_collapsed` | Barre latérale |
| `explorer_rail_collapsed` | Rail de navigation global |
| `aero_blur` / `aero_color` / `aero_opacity`, `explorer_aero_*` | Réglages du thème Aero (héritage) |
| `tm_cpu_view` | Mode d'affichage CPU du gestionnaire de tâches |

Note de parité : `size_formatted` utilise un **point** décimal (« 47.1 Ko »), produit par le formatage Python, alors que les dates sont en `JJ/MM/AAAA` et les compteurs formatés en `fr-FR` côté JS. Ce mélange est visible dans l'UI actuelle ; le corriger est une décision produit, pas un détail d'implémentation.

---

## 8. Frontend : structure et conventions

`static/app.js` est un fichier unique, non modulaire, organisé en **sections commentées** (`// ===== TITRE =====`) dans cet ordre :

1. Icônes SVG inline — 4 jeux complets : Fluent, Windows 98 pixel-art, Windows XP skeuomorphe, Aero Windows 7
2. Constantes de colonnes, `state`, `elements` (cache DOM par `getElementById`)
3. Gestion des onglets → navigation/browse → sélection → aperçu
4. Dialogues de transfert, animation pixel-art, courbe de vitesse
5. Illustration pixel-art des disques (canvas 2D)
6. Vue SMART → SMB → barre latérale → menus contextuels
7. Bascule de vues et raccourcis clavier → thème → gestionnaire de tâches
8. WinDirStat → formatage → vue clonage → flash → réseau

Conventions à conserver dans une réécriture :

- **Rendu par `innerHTML` de templates**, re-render complet de la liste à chaque changement (pas de DOM virtuel). Le tri et la sélection sont recalculés côté client à partir de `tab.items`.
- **Thème par attribut** : `document.documentElement.setAttribute('data-theme', …)` ; tout le CSS est écrit en sélecteurs `[data-theme="windows98"] …`. Le thème est actuellement **verrouillé sur `windows98`** (ligne 7575 de `app.js`).
- **Zoom** : les 4 vues agrandies (Espace, Cloner, Flash, Réseau) portent `zoom: 1.25`. Les séparateurs redimensionnables convertissent les pixels écran → pixels de mise en page avec `getViewZoomScale()` ; toute nouvelle mesure doit faire de même.
- Le clic droit navigateur est bloqué globalement ; les menus contextuels sont des `<div>` maison.
- Raccourcis : `Cmd/Ctrl+C/V/X/A`, `Cmd+T` (onglet), `Cmd+W`, `Cmd+N`, `Cmd+B` (barre latérale), `Cmd+Backspace` (corbeille), `F2` (renommer), `F5` (rafraîchir), `Ctrl+`` ` (terminal), `Alt+←/→/↑` (navigation), `Maj+Clic` (plage), `Ctrl+Clic` (multi-sélection).

---

## 9. Dépendances système macOS utilisées

| Commande | Usage |
|---|---|
| `diskutil list/info/unmount/eject/eraseDisk/eraseVolume` | Inventaire, démontage, éjection, formatage |
| `hdiutil attach/detach/create` | Montage d'images, création de `.dmg` |
| `system_profiler SPNVMeDataType/SPMemoryDataType/SPDisplaysDataType` | SMART, RAM, GPU |
| `dd` | Clonage bloc à bloc, écriture ISO |
| `osascript` (`do shell script … with administrator privileges`, `choose file`, `mount volume`) | Élévation, dialogs natifs, montage SMB |
| `networksetup` | Configuration IP / DNS |
| `smbutil status/view` | Découverte de partages (repli) |
| `ping` | Test de connectivité |
| `open` | Ouverture de fichier avec l'app par défaut |
| `defaults read -g AppleLocale` | Locale quand l'app est lancée depuis le Finder |
| `psutil`, `send2trash`, `smbprotocol`, `spnego` | Processus/disques, corbeille, RPC SMB |
| `bin/mac-clipboard` (Objective-C maison) | Presse-papier fichier **et** espace disque exact |
| `xterm.js` | Terminal |

### 9.1 Le helper natif `bin/mac-clipboard`

Compilé par `npm run build:helper` (`clang` sur `bin/mac-clipboard.m`, universel arm64 + x86_64, frameworks AppKit/Foundation). Il a **deux rôles**, et le second est facile à manquer :

- presse-papier : lecture/écriture de `NSPasteboard` avec `NSPasteboardTypeFileURL` (pour que le Finder, Mail, Telegram… reçoivent de vrais fichiers) ;
- `--disk-usage <montage>` : renvoie `{free, total}` en JSON via `NSURLVolumeAvailableCapacityForImportantUsageKey`, qui inclut l'espace **purgeable** exactement comme le Finder.

Ce second point est une contrainte de parité forte : `statfs`/`std::fs::metadata().avail()` renvoient une valeur plus faible que celle affichée par le Finder. Une version Rust doit interroger `NSURL` (crate `objc2` + `objc2-foundation`) ou conserver un helper équivalent.

### 9.2 Détection des fichiers cachés

`is_file_hidden()` retourne vrai si le nom commence par `.` **ou** si le flag BSD `UF_HIDDEN` (`0x8000`) est positionné dans `st_flags`. Les deux cas existent réellement sur macOS ; `std::fs::metadata` expose `st_flags` via `MetadataExt`.

---

## 10. Réécriture en Rust : recommandations

### 10.1 Découpage suggéré

Une seule application (pas de processus séparé, pas de HTTP loopback) : l'objectif de la réécriture est justement de supprimer la couche réseau interne.

```
crates/
  app/          # UI + état applicatif (Tauri commands ou egui App)
  fs/           # browse, metadata, folder-size, transferts, archives, preview
  sys/          # disques, SMART, processes, réseau, permissions macOS
  ops/          # tâches longues : clone, flash, scan d'espace, transfert
  preview/      # décodeurs d'en-têtes image + EXIF
```

- **UI** : Tauri 2 si l'on veut conserver le HTML/CSS existant (`static/` peut être réutilisé presque tel quel, en remplaçant `fetch('/api/…')` par `invoke('…')`). egui/iced si l'on veut du 100 % Rust — mais il faudra alors réécrire les 8 800 lignes de CSS et les 4 jeux d'icônes.
- **Async** : `tokio` + `spawn_blocking` pour les E/S disque, `rayon` pour les parcours récursifs.
- **Progression** : `tokio::sync::watch` ou événements Tauri (`app.emit("task://progress", …)`) remplacent le polling — c'est une amélioration attendue, pas une régression.
- **Annulation** : `tokio_util::sync::CancellationToken` par tâche.

### 10.2 Crates correspondantes

| Besoin actuel | Crate |
|---|---|
| `os.scandir` / `os.walk` | `walkdir`, `jwalk` (parallèle) |
| `os.stat` | `std::fs::metadata` + `std::os::unix::fs::MetadataExt` |
| `send2trash` | `trash` |
| `psutil` | `sysinfo` |
| Copie avec progression | `fs_extra` ou boucle `io::copy` avec callback |
| Zip / tar / 7z / rar | `zip`, `tar`, `sevenz-rust`, `unrar` |
| EXIF / dimensions images | `kamadak-exif`, `imagesize` (`image` seulement si redimensionnement nécessaire) |
| docx / xlsx | `zip` + `quick-xml` |
| WebSocket / PTY | `axum` (si serveur local) ou `portable-pty` (natif) |
| Découverte SMB | `smb` / `smbclient`, ou appel direct à `smbprotocol` via CLI |
| Tâches de fond périodiques | `tokio::time::interval` |

### 10.3 Pièges à anticiper

1. **Tri** : les dossiers passent toujours en premier, puis comparaison **de chaînes en minuscules** (opérateurs `<` / `>` de JS, donc ordre Unicode brut, pas de collation locale) ou numérique pour la taille. Pour un résultat identique en Rust : tri sur `is_dir` puis `name.to_lowercase()` — ne pas utiliser `localeCompare`/`icu_collator`, qui changerait l'ordre des accents.
2. **Deux conventions de taille** à reproduire fidèlement : `format_size()` en base **1024** (« 1,5 Ko / Mo / Go / To », une décimale) pour les fichiers, et `format_disk_size()` en base **1000** (« 1,5 Go ») pour les capacités de disque, à la manière du Finder.
3. **Volumes réseau** : détecter SMB/AFP (`statfs`/`getfsstat` avec `f_fstypename`) pour désactiver la récursion et éviter les gels.
4. **Fichiers AppleDouble** `._*` et `.DS_Store` : à exclure systématiquement des transferts et analyses.
5. **Élévation** : `osascript` + `with administrator privileges` fonctionne mais n'affiche pas le nom de l'app ; préférer `SMJobBless` / `AuthorizationExecuteWithPrivileges` ou un helper signé.
6. **Accès complet au disque (TCC)** : indispensable pour `/`, `~/Library`, disques externes. Sans lui, `read_dir` renvoie `PermissionDenied` — il faut un message explicite, pas une liste vide.
7. **`/System/Volumes` et firmlinks** : ne pas descendre dedans lors d'une analyse de `/`, sous peine de compter deux fois le système.
8. **Bundles `.app`** : ce sont des dossiers, mais l'UI les traite comme des fichiers (extension affichée, ouverture par `open`).
9. **Métadonnées image** : les DPI PNG viennent de `pHYs` (pixels/mètre), JPEG des tags EXIF `XResolution/YResolution/ResolutionUnit` — le code actuel le fait à la main, un parseur Rust doit reproduire ces conversions (ppm → dpi = ×0,0254).
10. **Port fixe** : ne pas reproduire. Choisir un port libre si une architecture client/serveur est conservée.

---

## 11. Checklist de parité fonctionnelle

Pour valider une réécriture Rust, ces comportements doivent être présents :

- [ ] Navigation avec historique par onglet, fil d'Ariane, saisie de chemin, tri par colonne
- [ ] Multi-sélection (`Maj`, `Ctrl`), copier/couper/coller entre fenêtres, glisser-déposer vers le Finder
- [ ] Création, renommage, suppression (corbeille), taille de dossier récursive
- [ ] Transferts avec progression, vitesse, ETA, annulation, renommage « - Copie (n) »
- [ ] Archives : navigation interne, extraction d'un membre, suppression/renommage dans l'archive
- [ ] Aperçu : texte, image (+ propriétés/EXIF), vidéo, audio, PDF, docx, xlsx, dossier, archive
- [ ] Terminal PTY intégré et détachable
- [ ] Disques : volumes, espace, éjection, formatage, SMART + illustration des disques
- [ ] Clonage bloc à bloc et image disque, avec progression
- [ ] Flash ISO avec inspection du libellé
- [ ] Analyse d'espace : arbre, stats par extension, Treemap interactive
- [ ] Gestionnaire de tâches : CPU, RAM, disque, réseau, GPU, processus, arrêt
- [ ] Réseau : interfaces, config IP/DNS, ping, découverte et montage SMB
- [ ] Favoris persistants, fichiers cachés, thème 98 complet
