const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;
const PORT = process.env.PORT || 3000;

// Default local project directory: Documents/mcpc-projects
const PROJECTS_DIR = path.join(os.homedir(), 'Documents', 'mcpc-projects');

function ensureProjectsDir() {
    if (!fs.existsSync(PROJECTS_DIR)) {
        try {
            fs.mkdirSync(PROJECTS_DIR, { recursive: true });
            // Create a default welcome file
            const sampleFile = path.join(PROJECTS_DIR, 'hello.mcpp');
            if (!fs.existsSync(sampleFile)) {
                fs.writeFileSync(sampleFile, `// Welcome to MCPC MiniCPP Compiler Desktop!\n// All code files are saved locally in: ${PROJECTS_DIR}\n\n#include <iostream>\n\nint main() {\n    std::cout << "Hello from MCPC Desktop!" << std::endl;\n    return 0;\n}\n`, 'utf8');
            }
        } catch (err) {
            console.error('Failed to create projects directory:', err);
        }
    }
}

function createWindow() {
    ensureProjectsDir();

    mainWindow = new BrowserWindow({
        width: 1360,
        height: 860,
        minWidth: 900,
        minHeight: 600,
        title: 'MCPC — CodeForge Compiler Desktop',
        backgroundColor: '#0d1117',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
        }
    });

    const appUrl = `http://localhost:${PORT}`;

    // Load server URL after server is ready
    mainWindow.loadURL(appUrl).catch(() => {
        // Retry if server is still spinning up
        setTimeout(() => {
            mainWindow.loadURL(appUrl);
        }, 1000);
    });

    buildAppMenu();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function buildAppMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Code File',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => mainWindow && mainWindow.webContents.send('menu:action', 'new-file')
                },
                {
                    label: 'Open File...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => mainWindow && mainWindow.webContents.send('menu:action', 'open-file')
                },
                { type: 'separator' },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => mainWindow && mainWindow.webContents.send('menu:action', 'save-file')
                },
                {
                    label: 'Save As...',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => mainWindow && mainWindow.webContents.send('menu:action', 'save-as')
                },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'Run',
            submenu: [
                {
                    label: 'Run Code',
                    accelerator: 'F5',
                    click: () => mainWindow && mainWindow.webContents.send('menu:action', 'run-code')
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Local Projects Directory',
                    click: async () => {
                        ensureProjectsDir();
                        const { shell } = require('electron');
                        shell.openPath(PROJECTS_DIR);
                    }
                },
                {
                    label: 'About MCPC Compiler Desktop',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About MCPC Compiler',
                            message: 'MCPC — CodeForge Compiler Desktop',
                            detail: `Version 1.0.0\nLocal Code Storage: ${PROJECTS_DIR}\nSupports MiniCPP (mcpc), C++, C, Python, JavaScript, Java, Go, Rust.`
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Start backend server
function startBackendServer() {
    // Require server directly in main process if possible or fork
    try {
        require('./server.js');
    } catch (err) {
        console.error('Failed to start internal server:', err);
    }
}

// IPC Handlers for Local File Operations
ipcMain.handle('dialog:openFile', async () => {
    ensureProjectsDir();
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Open Code File',
        defaultPath: PROJECTS_DIR,
        properties: ['openFile'],
        filters: [
            { name: 'Code Files', extensions: ['mcpp', 'cpp', 'c', 'py', 'js', 'java', 'go', 'rs', 'txt'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true };
    }

    const filePath = result.filePaths[0];
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath);
        return { canceled: false, filePath, fileName, content };
    } catch (err) {
        return { canceled: true, error: err.message };
    }
});

ipcMain.handle('dialog:saveFile', async (event, { defaultName, content }) => {
    ensureProjectsDir();
    const defaultPath = path.join(PROJECTS_DIR, defaultName || 'main.mcpp');
    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Code File',
        defaultPath,
        filters: [
            { name: 'MiniCPP Source', extensions: ['mcpp'] },
            { name: 'C++ Source', extensions: ['cpp'] },
            { name: 'C Source', extensions: ['c'] },
            { name: 'Python Script', extensions: ['py'] },
            { name: 'JavaScript File', extensions: ['js'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled || !result.filePath) {
        return { canceled: true };
    }

    const filePath = result.filePath;
    try {
        fs.writeFileSync(filePath, content, 'utf8');
        const fileName = path.basename(filePath);
        return { canceled: false, filePath, fileName };
    } catch (err) {
        return { canceled: true, error: err.message };
    }
});

ipcMain.handle('local:writeFile', async (event, { filePath, content }) => {
    try {
        let targetPath = filePath;
        if (!path.isAbsolute(targetPath)) {
            ensureProjectsDir();
            targetPath = path.join(PROJECTS_DIR, targetPath);
        }
        fs.writeFileSync(targetPath, content, 'utf8');
        return { success: true, filePath: targetPath, fileName: path.basename(targetPath) };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('local:listProjects', async () => {
    ensureProjectsDir();
    try {
        const files = fs.readdirSync(PROJECTS_DIR);
        const projectFiles = files
            .filter(file => !fs.statSync(path.join(PROJECTS_DIR, file)).isDirectory())
            .map(file => {
                const ext = path.extname(file).toLowerCase();
                let lang = 'mcpp';
                if (ext === '.cpp') lang = 'cpp';
                else if (ext === '.c') lang = 'c';
                else if (ext === '.py') lang = 'python';
                else if (ext === '.js') lang = 'javascript';
                else if (ext === '.java') lang = 'java';
                else if (ext === '.go') lang = 'go';
                else if (ext === '.rs') lang = 'rust';
                return { name: file, lang, path: path.join(PROJECTS_DIR, file) };
            });
        return { success: true, projectsDir: PROJECTS_DIR, files: projectFiles };
    } catch (err) {
        return { success: false, error: err.message, files: [] };
    }
});

ipcMain.handle('local:readFile', async (event, fileNameOrPath) => {
    ensureProjectsDir();
    let targetPath = fileNameOrPath;
    if (!path.isAbsolute(targetPath)) {
        targetPath = path.join(PROJECTS_DIR, fileNameOrPath);
    }
    try {
        if (fs.existsSync(targetPath)) {
            const content = fs.readFileSync(targetPath, 'utf8');
            return { success: true, filePath: targetPath, fileName: path.basename(targetPath), content };
        } else {
            return { success: false, error: 'File not found' };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('local:newFile', async (event, { fileName, content }) => {
    ensureProjectsDir();
    const targetPath = path.join(PROJECTS_DIR, fileName || 'untitled.mcpp');
    try {
        fs.writeFileSync(targetPath, content || '', 'utf8');
        return { success: true, filePath: targetPath, fileName: path.basename(targetPath) };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('local:deleteFile', async (event, fileName) => {
    ensureProjectsDir();
    const targetPath = path.join(PROJECTS_DIR, fileName);
    try {
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
            return { success: true };
        }
        return { success: false, error: 'File not found' };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('local:getProjectsDir', async () => {
    ensureProjectsDir();
    return PROJECTS_DIR;
});

app.whenReady().then(() => {
    startBackendServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
