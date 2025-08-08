const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    connect: (payload) => ipcRenderer.invoke('connect', payload),
    disconnect: (payload) => ipcRenderer.invoke('disconnect', payload),
    sendKey: (payload) => ipcRenderer.invoke('send-key', payload),
    sendText: (payload) => ipcRenderer.invoke('send-text', payload),
    getToken: (payload) => ipcRenderer.invoke('get-token', payload),
    setToken: (payload) => ipcRenderer.invoke('set-token', payload),
    listApps: (payload) => ipcRenderer.invoke('list-apps', payload),
    launchApp: (payload) => ipcRenderer.invoke('launch-app', payload)
});