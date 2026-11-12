# Explorer 2 (macOS)

Explorateur de fichiers local pour **macOS** doté d'une analyse SMART des disques, d'un gestionnaire de tâches matériel (CPU, RAM, Disque, Réseau, GPU) et d'un moteur de transfert haute performance.

---

## 🌟 Fonctionnalités

### 1. Explorateur de fichiers & Navigation
- **Architecture Electron + FastAPI** : Processus principal fluide avec backend asynchrone Python haute performance.
- **Support natif macOS** :
  - Chemins d'accès macOS (`/`, `/Users/...`, `/Volumes/...`, `/Applications`).
  - Détection automatique de **Macintosh HD** et de tous les volumes externes / clés USB / partages SMB dans `/Volumes`.
  - Raccourcis clavier Mac : support de la touche `Cmd` (⌘) et `Ctrl` (`Cmd+C`, `Cmd+V`, `Cmd+X`, `Cmd+A`, `Cmd+T`, `Cmd+W`, `Cmd+N`, `Cmd+Backspace` pour la Corbeille).
  - Ouverture native des fichiers avec l'application par défaut macOS (`open`).
  - Corbeille native macOS (`send2trash` / macOS Trash).
  - Fil d'Ariane (Breadcrumb) adapté à l'arborescence Unix.

### 2. Analyse SMART des disques
- Détection des disques physiques (NVMe Apple Silicon, SSD, disques externes).
- Illustration pixel-art de chaque disque selon son type (NVMe, SSD, HDD, clé USB).
- Statut SMART vérifié (« Bon », « Attention »), calcul de santé, températures et estimation du TBW (téraoctets écrits).

### 3. Gestionnaire de tâches & Performances
- **CPU** : Détection du processeur Apple Silicon (ex: Apple M4), affichage des pourcentages globaux et par cœur, graphiques en temps réel.
- **Mémoire RAM** : Mesure de la mémoire unifiée LPDDR5 utilisée / disponible.
- **Disques** : Débits de lecture et d'écriture en temps réel pour chaque disque physique (`disk0`, etc.).
- **Réseau** : Débits d'envoi et de réception en temps réel.
- **GPU** : Détection du GPU Apple Silicon et de ses cœurs GPU.
- **Processus** : Liste triée par consommation CPU / Mémoire avec arrêt en 1 clic.

### 4. Partages réseau SMB
- Découverte via `smbutil` et montage natif macOS (`mount volume`).
- Déconnexion propre via `diskutil unmount`.

---

## 🚀 Lancement

### Lancement en un clic
```bash
./run.sh
```

Ou manuellement via npm :
```bash
npm start
```

### Lancement en mode Web (navigateur)
```bash
./.venv/bin/python main.py
```
Puis rendez-vous sur [http://127.0.0.1:8000](http://127.0.0.1:8000).

---

## 📦 Construction du package macOS (.dmg / .zip)

Pour générer l'application autonome macOS :
```bash
npm run dist:dmg
```
L'exécutable et l'image disque `.dmg` seront créés dans le dossier `dist/`.
