const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
    saveFileDialog: (defaultName, content) => ipcRenderer.invoke('dialog:saveFile', { defaultName, content }),
    saveFileContent: (filePath, content) => ipcRenderer.invoke('local:writeFile', { filePath, content }),
    listProjects: () => ipcRenderer.invoke('local:listProjects'),
    readProjectFile: (fileName) => ipcRenderer.invoke('local:readFile', fileName),
    newProjectFile: (fileName, content) => ipcRenderer.invoke('local:newFile', { fileName, content }),
    deleteProjectFile: (fileName) => ipcRenderer.invoke('local:deleteFile', fileName),
    getProjectsDir: () => ipcRenderer.invoke('local:getProjectsDir'),
    onMenuAction: (callback) => ipcRenderer.on('menu:action', (event, action) => callback(action))
});
