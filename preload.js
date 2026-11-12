const { contextBridge, ipcRenderer, webUtils } = require('electron');

const api = {
  // Contrôles de la fenêtre courante
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  titlebarDragStart: (data) => ipcRenderer.send('window:titlebar-drag-start', data),
  titlebarDragEnd: () => ipcRenderer.send('window:titlebar-drag-end'),
  onMaximizedChange: (callback) => {
    ipcRenderer.on('window-maximized-change', (_event, isMax) => callback(isMax));
  },
  onSnappedChange: (callback) => {
    ipcRenderer.on('window-snapped-change', (_event, snapped) => callback(snapped));
  },

  // Architecture multi-fenêtres
  openNewWindow: (opts) => ipcRenderer.invoke('window:open-new', opts),
  getInitData: () => ipcRenderer.invoke('window:get-init-data'),

  // Suivi continu du détachement d'onglet sous la souris
  detachStart: (data) => ipcRenderer.send('tab:detach-start', data),
  detachEnd: () => ipcRenderer.send('tab:detach-end'),
  endTabDetach: () => ipcRenderer.send('tab:detach-end'),
  detachTab: (data) => ipcRenderer.invoke('tab:detach', data),
  tearOffTab: (data) => ipcRenderer.invoke('window:tear-off-tab', data),

  // Drag & drop standard et inter-fenêtres
  startNativeDrag: (data) => ipcRenderer.send('drag:start-native', data),
  onInternalNativeDrop: (callback) => {
    ipcRenderer.on('fs:internal-native-drop', (_event, data) => callback(data));
  },
  onExternalDragEnded: (callback) => {
    ipcRenderer.on('fs:external-drag-ended', (_event, data) => callback(data));
  },
  onDragCancelled: (callback) => {
    ipcRenderer.on('fs:drag-cancelled', () => callback());
  },
  startInternalDrag: (paths) => ipcRenderer.send('drag:start-internal', paths),
  getInternalDrag: () => ipcRenderer.invoke('drag:get-internal'),
  moveOrCopyFiles: (data) => ipcRenderer.invoke('fs:move-or-copy-files', data),
  markDropHandled: () => ipcRenderer.send('drag:mark-drop-handled'),
  isDropHandled: () => ipcRenderer.invoke('drag:is-drop-handled'),
  deleteFiles: (paths) => ipcRenderer.invoke('fs:delete-files', paths),
  onRefreshAllWindows: (callback) => {
    ipcRenderer.on('fs:refresh-all-windows', () => callback());
  },

  // Fallbacks et rétro-compatibilité
  startDrag: (files) => ipcRenderer.send('ondragstart', files),
  setDragFiles: (data) => ipcRenderer.send('drag:set-files', data),
  getDragFiles: () => ipcRenderer.invoke('drag:get-files'),
  clearDragFiles: () => ipcRenderer.send('drag:clear-files'),
  setDragItems: (paths) => ipcRenderer.send('drag:set-items', paths),
  getDragItems: () => ipcRenderer.invoke('drag:get-items'),
  clearDragItems: () => ipcRenderer.send('drag:clear-items'),
  onDragEnded: (callback) => {
    ipcRenderer.on('drag:ended', () => callback());
  },
  refreshAllWindows: () => ipcRenderer.send('window:refresh-all'),
  onRefreshTriggered: (callback) => {
    ipcRenderer.on('window:trigger-refresh', () => callback());
  },

  // Presse-papier synchronisé inter-fenêtres
  setClipboard: (data) => ipcRenderer.invoke('clipboard:set', data),
  getClipboard: () => ipcRenderer.invoke('clipboard:get'),
  onClipboardChanged: (callback) => {
    ipcRenderer.on('clipboard:changed', (_event, data) => callback(data));
  },

  // Utilitaires système
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),
  executeTerminal: (data) => ipcRenderer.invoke('terminal:execute', data),
  sendTerminalInput: (text) => ipcRenderer.invoke('terminal:write', text),
  killTerminalProcess: () => ipcRenderer.invoke('terminal:kill'),
  onTerminalStream: (cb) => {
    ipcRenderer.on('terminal:stream', (_event, data) => cb(data));
  },
  openExternalTerminal: (cwd) => ipcRenderer.invoke('terminal:open-external', cwd),
  getPathForFile: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function' && file) {
        const p = webUtils.getPathForFile(file);
        if (p) return p;
      }
    } catch (e) {}
    try {
      if (file && typeof file.path === 'string' && file.path) {
        return file.path;
      }
    } catch (e) {}
    return '';
  },
  getFilePath: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function' && file) {
        const p = webUtils.getPathForFile(file);
        if (p) return p;
      }
    } catch (e) {}
    try {
      if (file && typeof file.path === 'string' && file.path) {
        return file.path;
      }
    } catch (e) {}
    return '';
  },

  // Gestion des fenêtres distinctes (Popups, Transfert, Propriétés, SMB, Paramètres)
  openPromptWindow: (opts) => ipcRenderer.invoke('window:open-prompt', opts),
  sendPromptResult: (val) => ipcRenderer.send('window:prompt-result', val),
  openTransferWindow: (opts) => ipcRenderer.invoke('window:open-transfer', opts),
  notifyTransferDone: () => ipcRenderer.send('window:refresh-all'),
  openPropertiesWindow: (opts) => ipcRenderer.invoke('window:open-properties', opts),
  openSmbWindow: (opts) => ipcRenderer.invoke('window:open-smb', opts),
  notifyDrivesChanged: () => ipcRenderer.send('window:refresh-all'),
  openSettingsWindow: (opts) => ipcRenderer.invoke('window:open-settings', opts),
  openMediaPlayerWindow: (opts) => ipcRenderer.invoke('window:open-media-player', opts),
  openTerminalWindow: (opts) => ipcRenderer.invoke('window:open-terminal', opts),
  notifySettingsChanged: (data) => ipcRenderer.send('settings:changed', data),
  onSettingsChanged: (callback) => {
    ipcRenderer.on('settings:changed', (_event, data) => callback(data));
  },

  // Sélecteurs de fichiers / dossiers et autorisations
  selectSaveImagePath: (opts) => ipcRenderer.invoke('dialog:select-save-image', opts),
  selectIsoFile: (opts) => ipcRenderer.invoke('dialog:select-iso', opts),
  selectDirectory: (opts) => ipcRenderer.invoke('dialog:select-directory', opts),
  openFullDiskAccess: () => ipcRenderer.invoke('system:open-full-disk-access'),
  checkFullDiskAccess: () => ipcRenderer.invoke('system:check-full-disk-access'),

  isElectron: true,
};

contextBridge.exposeInMainWorld('electronAPI', api);
contextBridge.exposeInMainWorld('api', api);
