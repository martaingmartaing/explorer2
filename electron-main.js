// ==============================================================================
// 1. INSTRUMENTATION HAUTE PRÉCISION (PROFILING COLD START)
// ==============================================================================
const bootStart = performance.now();
console.time('[BOOT 1] Import initial -> app.whenReady');

// ==============================================================================
// 2. AUDIT DES IMPORTS : SEULS LES MODULES VITAUX SONT IMPORTÉS AU SOMMET
// ==============================================================================
const { app, BrowserWindow, ipcMain, nativeImage, screen } = require('electron');
const path = require('path');

// Protection globale anti-crash processus principal
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

// Registre multi-fenêtres et état global partagé
const openWindows = new Set();
const windowInitData = new Map(); // webContents.id -> { initialPath, tabData }
let sharedClipboard = null; // { action: 'copy'|'cut', paths: [...] }
let pythonProcess = null;
const BACKEND_PORT = 8000;

// Optimisations flags Chromium avant app.whenReady()
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('v8-cache-options', 'code'); // Active le cache de bytecode V8
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); // Autorise la lecture automatique sans clic préalable

// ==============================================================================
// 3. LAZY LOADING DES MODULES SYSTÈME & RÉSEAU (chargés uniquement si besoin)
// ==============================================================================
let _net = null;
function getNet() {
  if (!_net) _net = require('net');
  return _net;
}

let _fs = null;
function getFs() {
  if (!_fs) _fs = require('fs');
  return _fs;
}

let _cp = null;
function getChildProcess() {
  if (!_cp) _cp = require('child_process');
  return _cp;
}

// Vérification par socket TCP non bloquante (<1ms)
function isPortOpen(port = 8000, host = '127.0.0.1', timeoutMs = 25) {
  return new Promise((resolve) => {
    const net = getNet();
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

// Pont TCP local (loopback 127.0.0.1) porté par le binaire principal Electron (Contents/MacOS/Explorer 2)
// dont le Mach-O LC_UUID est enregistré dans nehelper pour l'autorisation Réseau local macOS (NECP).
let _lanBridgePort = 0;
let _lanBridgeServer = null;

function connectLanWithRetry(host, port, retries = 6, delayMs = 200) {
  const net = getNet();
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const tryOnce = () => {
      attempt++;
      const sock = new net.Socket();
      let settled = false;
      sock.setTimeout(1800);
      sock.once('connect', () => {
        if (settled) return;
        settled = true;
        sock.setTimeout(0);
        resolve(sock);
      });
      const onFail = (err) => {
        if (settled) return;
        settled = true;
        sock.destroy();
        if (attempt < retries) {
          setTimeout(tryOnce, delayMs);
        } else {
          reject(err || new Error('Timeout'));
        }
      };
      sock.once('timeout', () => onFail(new Error('ETIMEDOUT')));
      sock.once('error', (err) => onFail(err));
      sock.connect(port, host);
    };
    tryOnce();
  });
}

function ensureLanBridgeServer() {
  if (_lanBridgeServer) return Promise.resolve(_lanBridgePort);
  return new Promise((resolve) => {
    try {
      const http = require('http');
      const net = getNet();
      const srv = http.createServer(async (req, res) => {
        try {
          const u = new URL(req.url, 'http://127.0.0.1');
          if (u.pathname === '/tcp-tunnel') {
            const host = u.searchParams.get('host') || '';
            const port = parseInt(u.searchParams.get('port') || '445', 10);
            if (!host || !port) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'Missing host/port' }));
              return;
            }
            // Test initial connection from main Electron process
            const testSock = await connectLanWithRetry(host, port, 6, 200);
            testSock.destroy();

            // Create temporary localhost tunnel server
            const tunnelSrv = net.createServer((clientSock) => {
              connectLanWithRetry(host, port, 4, 150)
                .then((remoteSock) => {
                  clientSock.pipe(remoteSock);
                  remoteSock.pipe(clientSock);
                  clientSock.on('error', () => remoteSock.destroy());
                  remoteSock.on('error', () => clientSock.destroy());
                })
                .catch(() => {
                  clientSock.destroy();
                });
            });
            tunnelSrv.listen(0, '127.0.0.1', () => {
              const tPort = tunnelSrv.address().port;
              setTimeout(() => {
                try { tunnelSrv.close(); } catch (e) {}
              }, 25000);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true, port: tPort }));
            });
            tunnelSrv.on('error', (err) => {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            });
            return;
          }
          res.writeHead(404);
          res.end();
        } catch (err) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: err.message || String(err), code: err.code }));
        }
      });
      srv.listen(8001, '127.0.0.1', () => {
        _lanBridgeServer = srv;
        _lanBridgePort = srv.address().port;
        resolve(_lanBridgePort);
      });
      srv.on('error', () => {
        // Fallback port 0 if 8001 is busy
        srv.listen(0, '127.0.0.1', () => {
          _lanBridgeServer = srv;
          _lanBridgePort = srv.address().port;
          resolve(_lanBridgePort);
        });
      });
    } catch (e) {
      resolve(0);
    }
  });
}

// Lancement du backend Python en arrière-plan (Lazy Loading de spawn et fs)
async function startPythonBackend() {
  const fs = getFs();
  const { spawn } = getChildProcess();
  const bridgePort = await ensureLanBridgeServer();
  const childEnv = Object.assign({}, process.env, {
    EXPLORER2_LAN_BRIDGE_PORT: String(bridgePort || 8001)
  });

  const mainScript = path.join(__dirname, 'main.py');
  const venvPython = path.join(__dirname, '.venv', 'bin', 'python');

  // En mode développement, privilégier le script main.py (avec .venv ou python3) s'il existe
  if (!app.isPackaged && fs.existsSync(mainScript) && (fs.existsSync(venvPython) || !fs.existsSync(path.join(__dirname, 'backend-bin', 'backend', 'backend')))) {
    let pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python3';
    console.log('[BOOT] Lancement du backend Python dev:', pythonCmd, mainScript);
    pythonProcess = spawn(pythonCmd, [mainScript], {
      cwd: __dirname,
      detached: false,
      stdio: 'inherit',
      env: childEnv
    });

    pythonProcess.on('error', (err) => {
      console.error('[BOOT] Erreur lancement backend Python:', err);
    });
    return;
  }

  // 1. Détection du binaire autonome compilé (production / DMG / Resources ou backend-bin)
  const candidateBinaries = [
    process.resourcesPath ? path.join(process.resourcesPath, 'backend', 'backend') : null,
    process.resourcesPath ? path.join(process.resourcesPath, 'backend') : null,
    path.join(__dirname, 'backend-bin', 'backend', 'backend'),
  ].filter(Boolean);

  let binaryPath = null;
  for (const p of candidateBinaries) {
    if (fs.existsSync(p)) {
      binaryPath = p;
      break;
    }
  }

  if (binaryPath) {
    console.log('[BOOT] Lancement du backend autonome compilé:', binaryPath);
    try {
      fs.chmodSync(binaryPath, 0o755);
    } catch (e) {}

    pythonProcess = spawn(binaryPath, [], {
      cwd: path.dirname(binaryPath),
      detached: false,
      stdio: 'inherit',
      env: childEnv
    });

    pythonProcess.on('error', (err) => {
      console.error('[BOOT] Erreur lancement backend binaire:', err);
    });
    return;
  }

  // 2. Mode développement (script Python direct)
  let pythonCmd = 'python3';
  if (fs.existsSync(venvPython)) {
    pythonCmd = venvPython;
  }

  console.log('[BOOT] Lancement du backend Python dev:', pythonCmd, mainScript);
  pythonProcess = spawn(pythonCmd, [mainScript], {
    cwd: __dirname,
    detached: false,
    stdio: 'inherit',
    env: childEnv
  });

  pythonProcess.on('error', (err) => {
    console.error('Erreur lancement backend:', err);
  });
}

// Arrêt propre du backend (Lazy Loading de exec)
function stopPythonBackend() {
  if (pythonProcess && pythonProcess.pid) {
    try {
      pythonProcess.kill('SIGTERM');
      setTimeout(() => {
        if (pythonProcess && pythonProcess.pid) {
          try {
            pythonProcess.kill('SIGKILL');
          } catch (e) {}
        }
      }, 600);
    } catch (e) {
      console.error('Erreur arrêt backend:', e);
    }
    pythonProcess = null;
  }
}

// ==============================================================================
// 4. FACTORY & GESTION DU CYCLE DE VIE MULTI-FENÊTRES
// ==============================================================================
function setWindowSnapped(w, snapped) {
  if (!w || w.isDestroyed()) return;
  w._isSnapped = snapped || false;
  if (w.webContents && !w.webContents.isDestroyed()) {
    try {
      w.webContents.send('window-snapped-change', w._isSnapped);
    } catch (e) {}
  }
}

function createWindow({ initialPath = null, bounds = null, tabData = null, showInactive = false, picker = null, parent = null } = {}) {
  const tBeforeWindow = performance.now();

  const winOpts = {
    title: 'Explorer 2',
    width: (bounds && bounds.width) || (picker ? 980 : 1300),
    height: (bounds && bounds.height) || (picker ? 660 : 820),
    minWidth: picker ? 720 : 920,
    minHeight: picker ? 480 : 600,
    ...(picker && parent && !parent.isDestroyed() ? { parent } : {}),
    resizable: true,
    maximizable: true,
    icon: path.join(__dirname, 'icon.png'),
    transparent: true,
    frame: false, // Discord / Win11 frameless
    trafficLightPosition: { x: -1000, y: -1000 }, // Masquage absolu des pastilles macOS
    backgroundColor: '#00000000', // Permet la vraie transparence de l'application
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      webSecurity: false,
      plugins: true, // Lecteur PDF Chromium natif
      devTools: true
    }
  };

  if (bounds && typeof bounds.x === 'number' && typeof bounds.y === 'number') {
    winOpts.x = Math.max(0, Math.round(bounds.x));
    winOpts.y = Math.max(0, Math.round(bounds.y));
  }

  const win = new BrowserWindow(winOpts);
  if (process.platform === 'darwin') {
    try {
      if (typeof win.setWindowButtonVisibility === 'function') {
        win.setWindowButtonVisibility(false);
      }
    } catch (e) {}
  }
  const webContentsId = win.webContents ? win.webContents.id : null;
  openWindows.add(win);

  // Mémorisation des données d'initialisation pour cette fenêtre
  if (webContentsId) {
    const initData = {
      initialPath: initialPath || (tabData ? tabData.path : null),
      tabData: tabData,
      picker: picker
    };
    windowInitData.set(webContentsId, initData);
  }

  // Nettoyage impératif dès le début du cycle de fermeture pour prévenir les exceptions "Object has been destroyed"
  win.on('close', () => {
    if (activeDraggedWindow === win) {
      if (activeDragInterval) {
        clearInterval(activeDragInterval);
        activeDragInterval = null;
      }
      activeDraggedWindow = null;
    }
    openWindows.delete(win);
    if (webContentsId) windowInitData.delete(webContentsId);
  });

  win.on('closed', () => {
    openWindows.delete(win);
    if (webContentsId) windowInitData.delete(webContentsId);
  });

  win.once('ready-to-show', () => {
    if (process.platform === 'darwin') {
      try {
        if (typeof win.setWindowButtonVisibility === 'function') {
          win.setWindowButtonVisibility(false);
        }
      } catch (e) {}
    }
    if (showInactive) {
      win.showInactive();
    } else {
      win.show();
    }
  });

  win._normalBounds = {
    x: (bounds && bounds.x) || winOpts.x || 100,
    y: (bounds && bounds.y) || winOpts.y || 80,
    width: (bounds && bounds.width) || 1200,
    height: (bounds && bounds.height) || 750
  };
  win._isSnapped = false;

  const updateNormalBounds = () => {
    if (!win || win.isDestroyed()) return;
    if (!win.isMaximized() && !win._isSnapped) {
      try {
        const b = win.getBounds();
        const { screen } = require('electron');
        const display = screen.getDisplayMatching(b);
        const wa = display.workArea;
        const isHalf = Math.abs(b.width - Math.floor(wa.width / 2)) < 20 || Math.abs(b.width - Math.ceil(wa.width / 2)) < 20;
        if (!isHalf && b.height < wa.height - 30 && b.width < wa.width - 30) {
          win._normalBounds = b;
        }
      } catch (e) {}
    }
  };

  win.on('resize', updateNormalBounds);

  win.on('maximize', () => {
    setWindowSnapped(win, false);
    if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      try {
        win.webContents.send('window-maximized-change', true);
      } catch (e) {}
    }
  });

  win.on('unmaximize', () => {
    setWindowSnapped(win, false);
    if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      try {
        win.webContents.send('window-maximized-change', false);
      } catch (e) {}
    }
  });

  // Détection en cours de déplacement (si la fenêtre est détachée d'un côté)
  win.on('move', () => {
    if (win.isDestroyed()) return;
    if (win._isSnapped) {
      try {
        const { screen } = require('electron');
        const b = win.getBounds();
        const display = screen.getDisplayMatching(b);
        const workArea = display.workArea;

        const movedFromLeft = win._isSnapped === 'left' && (Math.abs(b.x - workArea.x) > 25 || Math.abs(b.y - workArea.y) > 25);
        const rightOrigin = workArea.x + Math.floor(workArea.width / 2);
        const movedFromRight = win._isSnapped === 'right' && (Math.abs(b.x - rightOrigin) > 25 || Math.abs(b.y - workArea.y) > 25);

        if (movedFromLeft || movedFromRight) {
          setWindowSnapped(win, false);
          const normalW = (win._normalBounds && win._normalBounds.width) || 1200;
          const normalH = (win._normalBounds && win._normalBounds.height) || 750;
          const cursor = screen.getCursorScreenPoint();
          const targetX = Math.round(cursor.x - (normalW / 2));
          const targetY = Math.max(workArea.y, Math.round(cursor.y - 15));
          win.setBounds({
            x: targetX,
            y: targetY,
            width: normalW,
            height: normalH
          });
        }
      } catch (e) {}
    }
  });

  // Ancrage de la fenêtre sur les bords de l'écran (sans panneau fantôme intrusif)
  win.on('moved', () => {
    if (win.isDestroyed()) return;
    try {
      const { screen } = require('electron');
      const cursor = screen.getCursorScreenPoint();
      const display = screen.getDisplayMatching(win.getBounds());
      const workArea = display.workArea;

      if (cursor.y <= workArea.y + 10) {
        setWindowSnapped(win, false);
        if (!win.isMaximized()) {
          win.maximize();
        }
      } else if (cursor.x <= workArea.x + 15) {
        const targetWidth = Math.floor(workArea.width / 2);
        const curBounds = win.getBounds();
        if (curBounds.x !== workArea.x || curBounds.y !== workArea.y || curBounds.width !== targetWidth || curBounds.height !== workArea.height) {
          setWindowSnapped(win, 'left');
          win.setBounds({
            x: workArea.x,
            y: workArea.y,
            width: targetWidth,
            height: workArea.height
          });
        }
      } else if (cursor.x >= workArea.x + workArea.width - 15) {
        const targetX = workArea.x + Math.floor(workArea.width / 2);
        const targetWidth = Math.ceil(workArea.width / 2);
        const curBounds = win.getBounds();
        if (curBounds.x !== targetX || curBounds.y !== workArea.y || curBounds.width !== targetWidth || curBounds.height !== workArea.height) {
          setWindowSnapped(win, 'right');
          win.setBounds({
            x: targetX,
            y: workArea.y,
            width: targetWidth,
            height: workArea.height
          });
        }
      } else {
        setWindowSnapped(win, false);
        updateNormalBounds();
      }
    } catch (e) {}
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  return win;
}

// ==============================================================================
// 5. INTÉGRATION MAC DOCK
// ==============================================================================
function setupMacDock() {
  if (process.platform === 'darwin' && app.dock) {
    try {
      const { Menu } = require('electron');
      const dockMenu = Menu.buildFromTemplate([
        {
          label: 'Nouvelle fenêtre',
          click() {
            createWindow({});
          }
        }
      ]);
      app.dock.setMenu(dockMenu);
    } catch (err) {
      console.warn('Erreur configuration Dock macOS:', err);
    }
  }
}

// ==============================================================================
// 6. HANDLERS IPC MULTI-FENÊTRES, DRAG-AND-DROP & PRESSE-PAPIER PARTAGÉ
// ==============================================================================

// Contrôles ciblant dynamiquement la fenêtre émettrice avec vérifications anti-crash
ipcMain.on('window-minimize', (event) => {
  if (!event.sender || event.sender.isDestroyed()) return;
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) win.minimize();
});

ipcMain.on('window-maximize', (event) => {
  if (!event.sender || event.sender.isDestroyed()) return;
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

ipcMain.on('window-close', (event) => {
  if (!event.sender || event.sender.isDestroyed()) return;
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    openWindows.delete(win);
    win.close();
  }
});

ipcMain.handle('window-is-maximized', (event) => {
  if (!event.sender || event.sender.isDestroyed()) return false;
  const win = BrowserWindow.fromWebContents(event.sender);
  return (win && !win.isDestroyed()) ? win.isMaximized() : false;
});

// Décrochage fluide de la fenêtre depuis le mode Plein écran ou Ancré
let activeTitlebarDragInterval = null;
let activeTitlebarWin = null;

function stopTitlebarDrag(win) {
  if (activeTitlebarDragInterval) {
    clearInterval(activeTitlebarDragInterval);
    activeTitlebarDragInterval = null;
  }
  const targetWin = win || activeTitlebarWin;
  activeTitlebarWin = null;
  if (!targetWin || targetWin.isDestroyed()) return;

  try {
    const { screen } = require('electron');
    const pos = screen.getCursorScreenPoint();
    const disp = screen.getDisplayMatching(targetWin.getBounds());
    const wa = disp.workArea;

    if (pos.y <= wa.y + 10) {
      setWindowSnapped(targetWin, false);
      targetWin.maximize();
    } else if (pos.x <= wa.x + 15) {
      const targetWidth = Math.floor(wa.width / 2);
      setWindowSnapped(targetWin, 'left');
      targetWin.setBounds({
        x: wa.x,
        y: wa.y,
        width: targetWidth,
        height: wa.height
      });
    } else if (pos.x >= wa.x + wa.width - 15) {
      const targetX = wa.x + Math.floor(wa.width / 2);
      const targetWidth = Math.ceil(wa.width / 2);
      setWindowSnapped(targetWin, 'right');
      targetWin.setBounds({
        x: targetX,
        y: wa.y,
        width: targetWidth,
        height: wa.height
      });
    } else {
      setWindowSnapped(targetWin, false);
      try { targetWin.unmaximize(); } catch (e) {}
      targetWin._normalBounds = targetWin.getBounds();
      if (!targetWin.isDestroyed() && targetWin.webContents && !targetWin.webContents.isDestroyed()) {
        targetWin.webContents.send('window-maximized-change', false);
        targetWin.webContents.send('window-snapped-change', false);
      }
    }
  } catch (e) {}
}

ipcMain.on('window:titlebar-drag-start', (event, data) => {
  if (!event.sender || event.sender.isDestroyed()) return;
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;

  const isMax = win.isMaximized() || !!data?.isMax;
  const isSnapped = !!win._isSnapped;
  const isFullScreen = win.isFullScreen();

  if (isMax || isSnapped || isFullScreen) {
    if (activeTitlebarDragInterval) {
      clearInterval(activeTitlebarDragInterval);
      activeTitlebarDragInterval = null;
    }
    activeTitlebarWin = win;

    const { screen } = require('electron');
    const display = screen.getDisplayMatching(win.getBounds());
    const workArea = display.workArea;

    const normalW = Math.min(workArea.width - 60, (win._normalBounds && win._normalBounds.width) || 1200);
    const normalH = Math.min(workArea.height - 60, (win._normalBounds && win._normalBounds.height) || 750);

    const ratio = Math.max(0.08, Math.min(0.92, (data.clientX || (normalW / 2)) / (data.windowWidth || normalW)));
    const offsetX = Math.round(normalW * ratio);
    const offsetY = Math.min(Math.max(10, data.clientY || 15), 30);

    if (isFullScreen) {
      try { win.setFullScreen(false); } catch (e) {}
    }
    try { win.unmaximize(); } catch (e) {}
    setWindowSnapped(win, false);

    if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      try {
        win.webContents.send('window-maximized-change', false);
        win.webContents.send('window-snapped-change', false);
      } catch (e) {}
    }

    const cursor = screen.getCursorScreenPoint();
    const newX = Math.round(cursor.x - offsetX);
    const newY = Math.max(workArea.y, Math.round(cursor.y - offsetY));

    win.setBounds({
      x: newX,
      y: newY,
      width: normalW,
      height: normalH
    });

    activeTitlebarDragInterval = setInterval(() => {
      if (!win || win.isDestroyed()) {
        if (activeTitlebarDragInterval) clearInterval(activeTitlebarDragInterval);
        activeTitlebarDragInterval = null;
        activeTitlebarWin = null;
        return;
      }

      const curPos = screen.getCursorScreenPoint();
      win.setPosition(Math.round(curPos.x - offsetX), Math.round(curPos.y - offsetY), false);
    }, 10);
  }
});

ipcMain.on('window:titlebar-drag-end', (event) => {
  if (!event.sender || event.sender.isDestroyed()) return;
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    stopTitlebarDrag(win);
  }
});


// Fenêtre Explorer 2 « sélecteur de fichier » : uniquement l'explorateur, renvoie le chemin choisi (ou null)
const pickerResolvers = new Map(); // webContents.id -> resolve
ipcMain.handle('window:open-file-picker', (event, opts = {}) => {
  return new Promise((resolve) => {
    const { app, BrowserWindow } = require('electron');
    const parent = BrowserWindow.fromWebContents(event.sender);
    let startPath = opts.startPath;
    if (!startPath) {
      try { startPath = app.getPath('downloads'); } catch (e) { startPath = null; }
    }
    const win = createWindow({
      initialPath: startPath,
      parent,
      picker: {
        title: opts.title || 'Sélectionner un fichier',
        extensions: Array.isArray(opts.extensions) ? opts.extensions : [],
        filterLabel: opts.filterLabel || '',
        confirmLabel: opts.confirmLabel || 'Sélectionner'
      }
    });
    const id = win.webContents.id;
    pickerResolvers.set(id, resolve);
    win.on('closed', () => {
      const r = pickerResolvers.get(id);
      if (r) { pickerResolvers.delete(id); r(null); }
    });
  });
});

ipcMain.on('window:file-picker-result', (event, chosenPath) => {
  const id = event.sender.id;
  const r = pickerResolvers.get(id);
  if (r) { pickerResolvers.delete(id); r(chosenPath || null); }
  const { BrowserWindow } = require('electron');
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) win.close();
});

// Demande d'ouverture d'une nouvelle fenêtre depuis un renderer (Ctrl+N ou menu)
ipcMain.handle('window:open-new', (_event, opts = {}) => {
  const win = createWindow(opts || {});
  return win ? win.id : null;
});

// ==============================================================================
// GESTION DES FENÊTRES DISTINCTES (POPUPS, TRANSFERT, PROPRIÉTÉS, SMB, PARAMÈTRES)
// ==============================================================================
let promptResolver = null;
let activeTransferWin = null;

ipcMain.handle('window:open-prompt', (event, opts = {}) => {
  return new Promise((resolve) => {
    promptResolver = resolve;
    const parentWin = BrowserWindow.fromWebContents(event.sender);
    const win = new BrowserWindow({
      title: opts.title || 'Saisie',
      width: 440,
      height: 190,
      parent: parentWin || undefined,
      modal: true,
      resizable: false,
      maximizable: false,
      minimizable: false,
      icon: path.join(__dirname, 'icon.png'),
      transparent: true,
      frame: false,
      trafficLightPosition: { x: -1000, y: -1000 },
      backgroundColor: '#00000000',
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        spellcheck: false,
        webSecurity: false
      }
    });

    if (process.platform === 'darwin') {
      try {
        if (typeof win.setWindowButtonVisibility === 'function') {
          win.setWindowButtonVisibility(false);
        }
      } catch (e) {}
    }

    win.loadFile(path.join(__dirname, 'static', 'prompt.html'), { query: opts });
    win.once('ready-to-show', () => win.show());

    win.on('closed', () => {
      if (promptResolver) {
        promptResolver(null);
        promptResolver = null;
      }
    });
  });
});

ipcMain.on('window:prompt-result', (event, val) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.close();
  }
  if (promptResolver) {
    promptResolver(val);
    promptResolver = null;
  }
});

ipcMain.handle('window:open-transfer', (event, opts = {}) => {
  if (activeTransferWin && !activeTransferWin.isDestroyed()) {
    activeTransferWin.focus();
    return activeTransferWin.id;
  }

  const win = new BrowserWindow({
    title: opts.label || 'Transfert de fichiers',
    width: 460,
    height: 380,
    resizable: false,
    maximizable: false,
    minimizable: true,
    icon: path.join(__dirname, 'icon.png'),
    transparent: true,
    frame: false,
    trafficLightPosition: { x: -1000, y: -1000 },
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      webSecurity: false
    }
  });

  if (process.platform === 'darwin') {
    try {
      if (typeof win.setWindowButtonVisibility === 'function') {
        win.setWindowButtonVisibility(false);
      }
    } catch (e) {}
  }

  activeTransferWin = win;
  win.loadFile(path.join(__dirname, 'static', 'transfer.html'), { query: opts });
  win.once('ready-to-show', () => win.show());

  win.on('closed', () => {
    if (activeTransferWin === win) activeTransferWin = null;
  });

  return win.id;
});

ipcMain.handle('window:open-properties', (event, opts = {}) => {
  const win = new BrowserWindow({
    title: opts.name ? `Propriétés de ${opts.name}` : 'Propriétés',
    width: 440,
    height: 420,
    resizable: false,
    maximizable: false,
    minimizable: true,
    icon: path.join(__dirname, 'icon.png'),
    transparent: true,
    frame: false,
    trafficLightPosition: { x: -1000, y: -1000 },
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      webSecurity: false
    }
  });

  if (process.platform === 'darwin') {
    try {
      if (typeof win.setWindowButtonVisibility === 'function') {
        win.setWindowButtonVisibility(false);
      }
    } catch (e) {}
  }

  win.loadFile(path.join(__dirname, 'static', 'properties.html'), { query: opts });
  win.once('ready-to-show', () => win.show());
  return win.id;
});

ipcMain.handle('window:open-smb', (event, opts = {}) => {
  const win = new BrowserWindow({
    title: 'Connecter un partage réseau SMB',
    width: 560,
    height: 720,
    minWidth: 480,
    minHeight: 560,
    resizable: true,
    maximizable: false,
    minimizable: true,
    icon: path.join(__dirname, 'icon.png'),
    transparent: true,
    frame: false,
    trafficLightPosition: { x: -1000, y: -1000 },
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      webSecurity: false
    }
  });

  if (process.platform === 'darwin') {
    try {
      if (typeof win.setWindowButtonVisibility === 'function') {
        win.setWindowButtonVisibility(false);
      }
    } catch (e) {}
  }


  openWindows.add(win);
  win.on('closed', () => {
    openWindows.delete(win);
  });

  const smbSearchParams = new URLSearchParams(opts).toString();
  win.loadFile(path.join(__dirname, 'static', 'smb.html'), { search: smbSearchParams });
  win.once('ready-to-show', () => win.show());
  return win.id;
});

ipcMain.handle('window:open-settings', (event, opts = {}) => {
  const win = new BrowserWindow({
    title: 'Paramètres',
    width: 440,
    height: 200,
    resizable: false,
    maximizable: false,
    minimizable: true,
    icon: path.join(__dirname, 'icon.png'),
    transparent: true,
    frame: false,
    trafficLightPosition: { x: -1000, y: -1000 },
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      webSecurity: false
    }
  });

  if (process.platform === 'darwin') {
    try {
      if (typeof win.setWindowButtonVisibility === 'function') {
        win.setWindowButtonVisibility(false);
      }
    } catch (e) {}
  }

  win.loadFile(path.join(__dirname, 'static', 'settings.html'), { query: opts });
  win.once('ready-to-show', () => win.show());
  return win.id;
});

ipcMain.handle('window:open-media-player', (event, opts = {}) => {
  const ext = (opts.ext || '').toLowerCase();
  const AUDIO_EXTS = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.oga', '.opus', '.aiff', '.aif', '.wma', '.mid', '.midi'];
  const VIDEO_EXTS = ['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi', '.wmv', '.flv', '.ogv'];
  const isAudio = AUDIO_EXTS.includes(ext);
  const isVideo = VIDEO_EXTS.includes(ext);

  let width = 800;
  let height = 620;
  let minWidth = 460;
  let minHeight = 320;

  if (isAudio) {
    width = 540;
    height = 310;
    minHeight = 270;
  } else if (isVideo) {
    width = 840;
    height = 580;
  }

  const win = new BrowserWindow({
    title: opts.name ? `Lecteur - ${opts.name}` : 'Lecteur multimédia',
    width: width,
    height: height,
    minWidth: minWidth,
    minHeight: minHeight,
    resizable: true,
    maximizable: true,
    minimizable: true,
    icon: path.join(__dirname, 'icon.png'),
    transparent: true,
    frame: false,
    trafficLightPosition: { x: -1000, y: -1000 },
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      webSecurity: false
    }
  });

  if (process.platform === 'darwin') {
    try {
      if (typeof win.setWindowButtonVisibility === 'function') {
        win.setWindowButtonVisibility(false);
      }
    } catch (e) {}
  }


  const wcId = win.webContents ? win.webContents.id : null;
  if (wcId) {
    windowInitData.set(wcId, opts);
  }

  openWindows.add(win);
  win.on('closed', () => {
    openWindows.delete(win);
    if (wcId) windowInitData.delete(wcId);
  });

  const searchParams = new URLSearchParams(opts).toString();
  win.loadFile(path.join(__dirname, 'static', 'media-player.html'), { search: searchParams });
  win.once('ready-to-show', () => win.show());
  return win.id;
});

ipcMain.handle('window:open-terminal', (event, opts = {}) => {
  const win = new BrowserWindow({
    title: opts.cwd ? `Terminal - ${opts.cwd}` : 'Terminal',
    width: 780,
    height: 520,
    minWidth: 460,
    minHeight: 300,
    resizable: true,
    maximizable: true,
    minimizable: true,
    icon: path.join(__dirname, 'icon.png'),
    transparent: true,
    frame: false,
    trafficLightPosition: { x: -1000, y: -1000 },
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      webSecurity: false
    }
  });

  if (process.platform === 'darwin') {
    try {
      if (typeof win.setWindowButtonVisibility === 'function') {
        win.setWindowButtonVisibility(false);
      }
    } catch (e) {}
  }


  const wcId = win.webContents ? win.webContents.id : null;
  if (wcId) {
    windowInitData.set(wcId, opts);
  }

  openWindows.add(win);
  win.on('closed', () => {
    openWindows.delete(win);
    if (wcId) windowInitData.delete(wcId);
  });

  const termSearchParams = new URLSearchParams({
    cwd: opts.cwd || '',
    theme: 'windows98'
  }).toString();

  win.loadFile(path.join(__dirname, 'static', 'terminal.html'), { search: termSearchParams });
  win.once('ready-to-show', () => win.show());
  return win.id;
});

ipcMain.on('settings:changed', (event, data) => {
  for (const win of openWindows) {
    if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      if (event && event.sender && win.webContents.id === event.sender.id) continue;
      win.webContents.send('settings:changed', data);
    }
  }
});

// Données d'initialisation pour la fenêtre (initialPath ou tabData détaché)
ipcMain.handle('window:get-init-data', (event) => {
  if (!event.sender || event.sender.isDestroyed()) return null;
  return windowInitData.get(event.sender.id) || null;
});

// ==============================================================================
// SUIVI CONTINU DU DÉTACHEMENT D'ONGLET (POLLING MAIN PROCESS 100FPS / 10MS)
// ==============================================================================
let activeDragInterval = null;
let activeDraggedWindow = null;

ipcMain.on('tab:detach-start', (_event, { tabData, offsetX = 50, offsetY = 15 }) => {
  // Verrou 3 : S'assurer qu'il ne peut y avoir qu'un seul dragInterval actif à la fois
  if (activeDragInterval) {
    clearInterval(activeDragInterval);
    activeDragInterval = null;
  }
  if (activeDraggedWindow && !activeDraggedWindow.isDestroyed()) {
    activeDraggedWindow = null;
  }

  const { screen } = require('electron');
  const cursor = screen.getCursorScreenPoint();
  const targetX = Math.round(cursor.x - (offsetX || 50));
  const targetY = Math.round(cursor.y - (offsetY || 15));

  // Verrou 2 : Création de la fenêtre sans vol de focus initial (showInactive)
  const newWin = createWindow({
    initialPath: tabData ? tabData.path : null,
    tabData: tabData,
    showInactive: true,
    bounds: {
      x: targetX,
      y: targetY,
      width: 1200,
      height: 750
    }
  });

  if (newWin && !newWin.isDestroyed()) {
    newWin.showInactive();
    activeDraggedWindow = newWin;

    // Suivi continu à 100fps (toutes les 10ms) de la position de la souris
    activeDragInterval = setInterval(() => {
      if (!newWin || newWin.isDestroyed()) {
        if (activeDragInterval) clearInterval(activeDragInterval);
        activeDragInterval = null;
        activeDraggedWindow = null;
        return;
      }

      const pos = screen.getCursorScreenPoint();
      newWin.setPosition(Math.round(pos.x - (offsetX || 50)), Math.round(pos.y - (offsetY || 15)), false);
    }, 10);
  }
});

ipcMain.on('tab:detach-end', () => {
  if (activeDragInterval) {
    clearInterval(activeDragInterval);
    activeDragInterval = null;
  }
  if (activeDraggedWindow && !activeDraggedWindow.isDestroyed()) {
    try {
      const { screen } = require('electron');
      const pos = screen.getCursorScreenPoint();
      const display = screen.getDisplayMatching(activeDraggedWindow.getBounds());
      const workArea = display.workArea;
      if (pos.y <= workArea.y + 10) {
        activeDraggedWindow.maximize();
      } else if (pos.x <= workArea.x + 15) {
        activeDraggedWindow.setBounds({
          x: workArea.x,
          y: workArea.y,
          width: Math.floor(workArea.width / 2),
          height: workArea.height
        });
      } else if (pos.x >= workArea.x + workArea.width - 15) {
        activeDraggedWindow.setBounds({
          x: workArea.x + Math.floor(workArea.width / 2),
          y: workArea.y,
          width: Math.ceil(workArea.width / 2),
          height: workArea.height
        });
      }
    } catch (e) {}
    activeDraggedWindow.focus();
    activeDraggedWindow = null;
  }
});

// Détachement d'onglet ponctuel (fallback / appel direct)
ipcMain.handle('tab:detach', (_event, { path: tabPath, history, historyIndex, title, offsetX = 50, offsetY = 15 }) => {
  const { screen } = require('electron');
  const cursor = screen.getCursorScreenPoint();
  const targetX = Math.round(cursor.x - (offsetX || 50));
  const targetY = Math.round(cursor.y - (offsetY || 15));

  const tabData = {
    path: tabPath,
    history: history || (tabPath ? [tabPath] : [null]),
    historyIndex: typeof historyIndex === 'number' ? historyIndex : 0,
    title: title
  };

  const newWin = createWindow({
    initialPath: tabPath || null,
    tabData: tabData,
    bounds: {
      x: targetX,
      y: targetY,
      width: 1200,
      height: 750
    }
  });

  if (newWin && !newWin.isDestroyed()) {
    newWin.show();
    newWin.focus();
  }

  return newWin ? newWin.id : null;
});

// Alias 'window:tear-off-tab'
ipcMain.handle('window:tear-off-tab', (_event, { tabData, screenX, screenY }) => {
  const { screen } = require('electron');
  const cursor = screen.getCursorScreenPoint();
  const targetX = (cursor && typeof cursor.x === 'number') ? Math.max(0, cursor.x - 200) : (screenX || 100);
  const targetY = (cursor && typeof cursor.y === 'number') ? Math.max(0, cursor.y - 40) : (screenY || 100);

  const newWin = createWindow({
    initialPath: tabData ? tabData.path : null,
    tabData: tabData,
    bounds: {
      x: targetX,
      y: targetY,
      width: 1200,
      height: 750
    }
  });

  if (newWin && !newWin.isDestroyed()) {
    newWin.show();
    newWin.focus();
  }
  return newWin ? newWin.id : null;
});

// ==============================================================================
// 6. ÉTAT GLOBAL DE DRAG & OPÉRATIONS FICHIERS (DÉPLACEMENT PAR DÉFAUT / COPIE)
// ==============================================================================
let globalDragPayload = { paths: [], sourceWindowId: null, timestamp: 0 };

// Glisser-déposer natif multi-fichiers (Windows OLE DoDragDrop via webContents.startDrag)
ipcMain.on('drag:start-native', (event, data) => {
  const paths = Array.isArray(data) ? data : (data?.paths || []);
  const initialCopy = !!data?.isCopy;
  const filePaths = paths.filter(p => typeof p === 'string' && p.trim().length > 0);
  if (!filePaths.length) return;

  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));

  globalDragPayload = {
    paths: filePaths,
    sourceWindowId: BrowserWindow.fromWebContents(event.sender)?.id || null,
    timestamp: Date.now()
  };

  try {
    event.sender.startDrag({
      files: filePaths,
      file: filePaths[0],
      icon: icon
    });
  } catch (err) {
    console.error('[startDrag Error]', err);
    return;
  }

  // Dès que startDrag se termine (le bouton de la souris a été relâché) :
  const cursor = screen.getCursorScreenPoint();
  const allWindows = BrowserWindow.getAllWindows();
  let targetWin = null;

  for (const win of allWindows) {
    if (win.isDestroyed() || !win.isVisible()) continue;
    const b = win.getBounds();
    if (cursor.x >= b.x && cursor.x <= b.x + b.width && cursor.y >= b.y && cursor.y <= b.y + b.height) {
      targetWin = win;
      break;
    }
  }

  const ctrlDown = initialCopy;

  if (targetWin) {
    // 1. DÉPÔT DANS UNE FENÊTRE DE L'APPLICATION EXPLORER 2
    dropHandledTimestamp = Date.now();
    const b = targetWin.getBounds();
    try {
      if (!targetWin.isDestroyed() && !targetWin.webContents.isDestroyed()) {
        targetWin.webContents.send('fs:internal-native-drop', {
          x: cursor.x - b.x,
          y: cursor.y - b.y,
          paths: filePaths,
          isCopy: ctrlDown
        });
      }
    } catch (e) {}
  } else {
    // 2. DÉPÔT VERS L'EXTÉRIEUR (EXPLORATEUR WINDOWS OU BUREAU)
    try {
      if (!event.sender.isDestroyed()) {
        event.sender.send('fs:external-drag-ended', {
          paths: filePaths,
          isCopy: ctrlDown
        });
      }
    } catch (e) {}
  }
});

// Fallback compatibilité
ipcMain.on('ondragstart', (event, files) => {
  const filePaths = Array.isArray(files) ? files : (files ? [files] : []);
  if (!filePaths.length) return;
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
  try {
    event.sender.startDrag({
      files: filePaths,
      file: filePaths[0],
      icon: icon
    });
  } catch (e) {}
});

ipcMain.on('drag:start-internal', (e, paths) => {
  const filePaths = Array.isArray(paths) ? paths : (paths ? [paths] : []);
  globalDragPayload = {
    paths: filePaths,
    sourceWindowId: BrowserWindow.fromWebContents(e.sender)?.id || null,
    timestamp: Date.now()
  };
});

ipcMain.handle('drag:get-internal', () => {
  return globalDragPayload;
});

// Compatibilité et fallbacks
ipcMain.handle('drag:get-files', () => globalDragPayload.paths);
ipcMain.handle('drag:get-items', () => globalDragPayload.paths);
ipcMain.on('drag:set-files', (e, data) => {
  const p = Array.isArray(data) ? data : (data?.paths || []);
  globalDragPayload = { paths: p, sourceWindowId: BrowserWindow.fromWebContents(e.sender)?.id || null, timestamp: Date.now() };
});
ipcMain.on('drag:set-items', (e, paths) => {
  const p = Array.isArray(paths) ? paths : (paths ? [paths] : []);
  globalDragPayload = { paths: p, sourceWindowId: BrowserWindow.fromWebContents(e.sender)?.id || null, timestamp: Date.now() };
});
ipcMain.on('drag:clear-files', () => { globalDragPayload.paths = []; });
ipcMain.on('drag:clear-items', () => { globalDragPayload.paths = []; });

let dropHandledTimestamp = 0;
ipcMain.on('drag:mark-drop-handled', () => {
  dropHandledTimestamp = Date.now();
});

ipcMain.handle('drag:is-drop-handled', () => {
  return (Date.now() - dropHandledTimestamp) < 3000;
});

// Suppression sécurisée des sources après un glisser-déposer externe vers l'Explorateur Windows
ipcMain.handle('fs:delete-files', async (_event, paths) => {
  // Sécurité anti-suppression accidentelle : si un drop interne a eu lieu, interdire toute suppression !
  if ((Date.now() - dropHandledTimestamp) < 3000) {
    console.warn('[fs:delete-files] Annulé : drop interne récent dans Explorer 2.');
    return { success: false, reason: 'internal-drop' };
  }
  if (!Array.isArray(paths) || paths.length === 0) return { success: false };
  const fs = getFs();
  for (const p of paths) {
    if (!p || typeof p !== 'string') continue;
    try {
      for (let attempt = 0; attempt < 15; attempt++) {
        try {
          if (!fs.existsSync(p)) break;
          const stat = fs.statSync(p);
          if (stat.isDirectory()) {
            await fs.promises.rm(p, { recursive: true, force: true });
          } else {
            await fs.promises.unlink(p);
          }
          break;
        } catch (err) {
          if (attempt === 14) throw err;
          await new Promise(res => setTimeout(res, 250));
        }
      }
    } catch (e) {
      console.error('[Delete Source After External Drop] Erreur:', e);
    }
  }

  for (const win of Array.from(openWindows)) {
    try {
      if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        win.webContents.send('fs:refresh-all-windows');
      } else {
        openWindows.delete(win);
      }
    } catch (e) {
      openWindows.delete(win);
    }
  }

  return { success: true };
});

// Handler unifié et robuste de déplacement ou copie de fichiers (Déplacement par défaut)
ipcMain.handle('fs:move-or-copy-files', async (_event, { sourcePaths, targetDir, isCopy }) => {
  if (!Array.isArray(sourcePaths) || sourcePaths.length === 0 || !targetDir) {
    return { success: false, error: 'Paramètres invalides' };
  }

  const fs = getFs();
  const path = require('path');
  const normalizedTargetDir = path.resolve(targetDir);

  for (const srcPath of sourcePaths) {
    if (!srcPath || typeof srcPath !== 'string') continue;
    try {
      const normalizedSrc = path.resolve(srcPath);
      const destPath = path.join(normalizedTargetDir, path.basename(normalizedSrc));
      const normSrcLower = normalizedSrc.toLowerCase();
      const normTargetLower = normalizedTargetDir.toLowerCase();
      const destLower = destPath.toLowerCase();

      // 1. Refus strict : La destination est le fichier/dossier lui-même
      if (normSrcLower === normTargetLower || destLower === normSrcLower) {
        console.warn(`[FS Transfert] Ignoré : tentative de déplacement sur lui-même (${normalizedSrc})`);
        continue;
      }

      // 2. Refus strict : La destination est un sous-dossier descendant du dossier source
      if (normTargetLower.startsWith(normSrcLower + path.sep)) {
        console.warn(`[FS Transfert] Ignoré : la cible est un sous-dossier de la source (${normalizedSrc} -> ${normalizedTargetDir})`);
        continue;
      }

      // 3. Refus strict : Si c'est un déplacement et que l'élément est déjà dans le dossier cible
      if (!isCopy && path.dirname(normalizedSrc).toLowerCase() === normTargetLower) {
        console.warn(`[FS Transfert] Ignoré : l'élément est déjà présent dans le dossier (${normalizedSrc})`);
        continue;
      }

      if (isCopy) {
        // En cas de copie dans le même dossier parent, créer un nom unique " - Copie"
        let finalDest = destPath;
        if (fs.existsSync(destPath)) {
          const ext = path.extname(destPath);
          const base = path.basename(destPath, ext);
          let counter = 1;
          finalDest = path.join(normalizedTargetDir, `${base} - Copie${ext}`);
          while (fs.existsSync(finalDest)) {
            counter++;
            finalDest = path.join(normalizedTargetDir, `${base} - Copie (${counter})${ext}`);
          }
        }
        await fs.promises.cp(normalizedSrc, finalDest, { recursive: true });
      } else {
        // COMPORTEMENT PAR DÉFAUT = DÉPLACER (Move)
        try {
          await fs.promises.rename(normalizedSrc, destPath);
        } catch (renameErr) {
          // Fallback sur EXDEV uniquement (déplacement inter-disques physiques sous Windows, ex: C: vers D:)
          if (renameErr.code === 'EXDEV') {
            await fs.promises.cp(normalizedSrc, destPath, { recursive: true });
            // Sécurité absolue : ne supprimer la source que si la destination existe et est distincte
            if (fs.existsSync(destPath) && destPath.toLowerCase() !== normalizedSrc.toLowerCase()) {
              await fs.promises.rm(normalizedSrc, { recursive: true, force: true });
            }
          } else {
            throw renameErr;
          }
        }
      }
    } catch (err) {
      console.error(`[FS Transfert] Erreur sur ${srcPath} -> ${targetDir}:`, err);
    }
  }

  // Vider le payload de drag après traitement
  globalDragPayload.paths = [];

  // Notification de rafraîchissement à TOUTES les fenêtres ouvertes
  for (const win of Array.from(openWindows)) {
    try {
      if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        win.webContents.send('fs:refresh-all-windows');
      } else {
        openWindows.delete(win);
      }
    } catch (e) {
      openWindows.delete(win);
    }
  }

  return { success: true };
});

// Rafraîchissement coordonné de toutes les fenêtres ouvertes après une opération de fichier
ipcMain.on('window:refresh-all', (event) => {
  for (const win of Array.from(openWindows)) {
    try {
      if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        if (event && event.sender && win.webContents.id === event.sender.id) continue;
        win.webContents.send('window:trigger-refresh');
      } else {
        openWindows.delete(win);
      }
    } catch (e) {
      openWindows.delete(win);
    }
  }
});

function getMacClipboardHelper() {
  const fs = getFs();
  const candidates = [
    process.resourcesPath ? path.join(process.resourcesPath, 'bin', 'mac-clipboard') : null,
    path.join(__dirname, 'bin', 'mac-clipboard'),
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Presse-papier global partagé inter-fenêtres + écriture système native (Fichiers réels pour Telegram, Finder, etc.)
ipcMain.handle('clipboard:set', (_event, data) => {
  sharedClipboard = data;
  if (data && Array.isArray(data.paths) && data.paths.length > 0) {
    const validPaths = data.paths.filter(p => typeof p === 'string' && p.trim().length > 0);
    if (validPaths.length > 0) {
      const helper = getMacClipboardHelper();
      if (helper) {
        try {
          const { execFile } = getChildProcess();
          execFile(helper, validPaths, (err) => {
            if (err) console.error('[Clipboard] Erreur mac-clipboard:', err);
          });
        } catch (e) {
          console.error('[Clipboard] Exception execFile:', e);
        }
      } else {
        // Fallback osascript si le helper binaire est temporairement indisponible
        try {
          const { execFile } = getChildProcess();
          const posixArgs = validPaths.map(p => `POSIX file "${p.replace(/"/g, '\\"')}"`).join(', ');
          execFile('osascript', ['-e', `set the clipboard to {${posixArgs}}`], (err) => {
            if (err) {
              const { clipboard } = require('electron');
              clipboard.writeText(validPaths.join('\n'));
            }
          });
        } catch (e) {
          try {
            const { clipboard } = require('electron');
            clipboard.writeText(validPaths.join('\n'));
          } catch (err2) {}
        }
      }
    }
  }

  // Notifier toutes les fenêtres actives en prévenant toute tentative d'interaction sur un objet détruit
  for (const win of Array.from(openWindows)) {
    try {
      if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        win.webContents.send('clipboard:changed', sharedClipboard);
      } else {
        openWindows.delete(win);
      }
    } catch (e) {
      openWindows.delete(win);
    }
  }
  return true;
});

ipcMain.handle('clipboard:get', () => {
  if (sharedClipboard && sharedClipboard.paths && sharedClipboard.paths.length > 0) {
    return sharedClipboard;
  }
  // Tenter de lire les fichiers externes déposés dans le presse-papier macOS (ex: copiés dans le Finder)
  const helper = getMacClipboardHelper();
  if (helper) {
    try {
      const { execFileSync } = getChildProcess();
      const output = execFileSync(helper, ['--read'], { encoding: 'utf-8', timeout: 500 }).trim();
      if (output) {
        const paths = output.split('\n').map(l => l.trim()).filter(Boolean);
        if (paths.length > 0) {
          return { action: 'copy', paths };
        }
      }
    } catch (e) {}
  }
  try {
    const { clipboard } = require('electron');
    const text = clipboard.readText();
    if (text) {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const fs = getFs();
      const existing = lines.filter(l => fs.existsSync(l));
      if (existing.length > 0) {
        return { action: 'copy', paths: existing };
      }
    }
  } catch (e) {}
  return sharedClipboard;
});

// Ouverture de chemin externe via le shell système
ipcMain.handle('open-path', async (_event, filePath) => {
  const { shell } = require('electron');
  return await shell.openPath(filePath);
});

// Sélecteur natif de sauvegarde d'image disque (.dmg)
ipcMain.handle('dialog:select-save-image', async (event, opts = {}) => {
  const { dialog, BrowserWindow, app } = require('electron');
  const path = require('path');
  const win = BrowserWindow.fromWebContents(event.sender);
  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultDir = opts.defaultDir || app.getPath('documents');
  const defaultPath = path.join(defaultDir, `Backup_Disque_${dateStr}.dmg`);

  const res = await dialog.showSaveDialog(win, {
    title: 'Choisir l\'emplacement et le nom de l\'image disque (.dmg)',
    defaultPath: defaultPath,
    buttonLabel: 'Enregistrer ici',
    showsTagField: false,
    filters: [
      { name: 'Image disque Apple (.dmg)', extensions: ['dmg'] },
      { name: 'Tous les fichiers', extensions: ['*'] }
    ],
    properties: ['createDirectory', 'showOverwriteConfirmation']
  });

  if (res.canceled || !res.filePath) {
    return null;
  }
  return res.filePath;
});

// Sélecteur natif de fichier image ISO / disque amorçable
ipcMain.handle('dialog:select-iso', async (event, opts = {}) => {
  const { dialog, BrowserWindow, app } = require('electron');
  const win = BrowserWindow.fromWebContents(event.sender);
  const defaultDir = opts.defaultDir || app.getPath('downloads') || app.getPath('documents');
  const res = await dialog.showOpenDialog(win, {
    title: opts.title || 'Sélectionner une image ISO / disque amorçable',
    defaultPath: defaultDir,
    buttonLabel: 'Choisir cette image',
    filters: [
      { name: 'Images Disque Bootables (*.iso, *.img, *.raw, *.bin, *.dmg)', extensions: ['iso', 'img', 'raw', 'bin', 'dmg'] },
      { name: 'Fichiers ISO (*.iso)', extensions: ['iso'] },
      { name: 'Tous les fichiers (*.*)', extensions: ['*'] }
    ],
    properties: ['openFile', 'treatPackageAsDirectory']
  });
  if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
    return null;
  }
  return res.filePaths[0];
});

// Sélecteur natif de dossier
ipcMain.handle('dialog:select-directory', async (event, opts = {}) => {
  const { dialog, BrowserWindow, app } = require('electron');
  const win = BrowserWindow.fromWebContents(event.sender);
  const res = await dialog.showOpenDialog(win, {
    title: opts.title || 'Sélectionner le dossier de destination',
    defaultPath: opts.defaultPath || app.getPath('documents'),
    buttonLabel: 'Choisir ce dossier',
    properties: ['openDirectory', 'createDirectory']
  });

  if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
    return null;
  }
  return res.filePaths[0];
});

// Ouverture des Réglages Système macOS pour l'Accès complet au disque
ipcMain.handle('system:open-full-disk-access', async () => {
  const { shell } = require('electron');
  return await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles');
});

// Vérification dynamique de l'Accès complet au disque (Full Disk Access)
ipcMain.handle('system:check-full-disk-access', async () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  try {
    const safariPath = path.join(os.homedir(), 'Library', 'Safari');
    fs.readdirSync(safariPath);
    return true;
  } catch (e) {
    return false;
  }
});

// Terminal intégré et exécution shell interactive
const activeTerminalProcesses = new Map();

ipcMain.handle('terminal:execute', async (event, { command, cwd }) => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { spawn } = require('child_process');
  const targetCwd = (cwd && fs.existsSync(cwd)) ? cwd : os.homedir();
  const trimmed = (command || '').trim();

  // Navigation cd
  if (trimmed === 'cd' || trimmed.startsWith('cd ')) {
    let arg = trimmed.substring(2).trim();
    if (!arg || arg === '~') arg = os.homedir();
    else if (arg.startsWith('~/')) arg = path.join(os.homedir(), arg.substring(2));
    const resolved = path.resolve(targetCwd, arg);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      return { stdout: '', stderr: '', exitCode: 0, newCwd: resolved };
    } else {
      return { stdout: '', stderr: `cd: aucun fichier ou dossier de ce type : ${arg}\n`, exitCode: 1, newCwd: targetCwd };
    }
  }

  const senderId = event.sender.id;
  if (activeTerminalProcesses.has(senderId)) {
    try {
      activeTerminalProcesses.get(senderId).kill('SIGKILL');
    } catch (e) {}
    activeTerminalProcesses.delete(senderId);
  }

  // Pour les commandes interactives comme 'python3' ou 'python' sans argument, passer en mode interactif -i
  let effectiveCmd = command;
  if (trimmed === 'python3' || trimmed === 'python') {
    effectiveCmd = `${trimmed} -i`;
  } else if (trimmed === 'node') {
    effectiveCmd = 'node -i';
  }

  return new Promise((resolve) => {
    let stdoutAcc = '';
    let stderrAcc = '';
    let isDone = false;

    const child = spawn('/bin/zsh', ['-c', effectiveCmd], {
      cwd: targetCwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        PYTHONUNBUFFERED: '1',
        FORCE_COLOR: '1'
      }
    });

    activeTerminalProcesses.set(senderId, child);

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdoutAcc += text;
      if (!event.sender.isDestroyed()) {
        event.sender.send('terminal:stream', { stream: 'stdout', text });
      }
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderrAcc += text;
      if (!event.sender.isDestroyed()) {
        event.sender.send('terminal:stream', { stream: 'stderr', text });
      }
    });

    const cleanup = (code) => {
      if (isDone) return;
      isDone = true;
      activeTerminalProcesses.delete(senderId);
      resolve({
        stdout: stdoutAcc,
        stderr: stderrAcc,
        exitCode: code || 0,
        newCwd: targetCwd
      });
    };

    child.on('close', (code) => cleanup(code));
    child.on('error', (err) => {
      stderrAcc += `\nErreur d'exécution: ${err.message}\n`;
      cleanup(1);
    });
  });
});

ipcMain.handle('terminal:write', (event, text) => {
  const child = activeTerminalProcesses.get(event.sender.id);
  if (child && child.stdin && !child.stdin.destroyed) {
    try {
      child.stdin.write(text + '\n');
      return true;
    } catch (e) {}
  }
  return false;
});

ipcMain.handle('terminal:kill', (event) => {
  const child = activeTerminalProcesses.get(event.sender.id);
  if (child) {
    try {
      child.kill('SIGINT');
      setTimeout(() => {
        try { child.kill('SIGKILL'); } catch (e) {}
      }, 400);
      return true;
    } catch (e) {}
  }
  return false;
});

ipcMain.handle('terminal:open-external', async (_event, cwd) => {
  const fs = require('fs');
  const os = require('os');
  const { spawn } = require('child_process');
  const targetCwd = (cwd && fs.existsSync(cwd)) ? cwd : os.homedir();
  spawn('open', ['-a', 'Terminal', targetCwd]);
  return true;
});

// ==============================================================================
// 7. SINGLE-INSTANCE LOCK & CYCLE DE DÉMARRAGE PRINCIPAL
// ==============================================================================
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Une autre instance est déjà active, on quitte et on laisse le handler second-instance agir
  app.quit();
} else {
  // Capture des relances et des clics sur la JumpList / Dock
  app.on('second-instance', (_event, commandLine) => {
    // Crée immédiatement une nouvelle fenêtre
    createWindow({});
  });

  app.whenReady().then(async () => {
    console.timeEnd('[BOOT 1] Import initial -> app.whenReady');
    console.log(`[BOOT] app.whenReady() atteint à ${(performance.now() - bootStart).toFixed(2)} ms`);

    setupMacDock();
    createWindow({});

    // Démarrage du pont TCP local et du backend Python en parallèle asynchrone (0ms d'impact sur le rendu initial)
    ensureLanBridgeServer().then(() => {
      isPortOpen(BACKEND_PORT, '127.0.0.1', 25).then((alreadyRunning) => {
        if (!alreadyRunning) {
          startPythonBackend();
        }
      });
    });

    app.on('activate', () => {
      for (const win of Array.from(openWindows)) {
        if (win.isDestroyed()) openWindows.delete(win);
      }
      if (openWindows.size === 0) {
        createWindow({});
      }
    });
  });
}

// L'application ne quitte que si TOUTES les fenêtres sont fermées
app.on('window-all-closed', () => {
  stopPythonBackend();
  app.quit();
});

app.on('will-quit', () => {
  stopPythonBackend();
});
