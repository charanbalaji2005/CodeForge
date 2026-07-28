// CodeForge Frontend Controller

// Pre-defined code templates for each language
const TEMPLATES = {
    mcpp: `// MiniCPP (mcpc) compiler demonstration
// Features heap classes, structs, pointer arithmetic and raw system calls

struct Point {
    int x;
    int y;
};

class Greeter {
    int timesCalled;
    Greeter() { timesCalled = 0; }
    void greet() {
        timesCalled = timesCalled + 1;
        print_str("Hello from your custom mcpc compiler!\\n");
    }
};

int main() {
    // 1. Class instantiation and methods
    Greeter g = new Greeter();
    g.greet();
    
    // 2. Struct aggregate allocations
    Point p;
    p.x = 6;
    p.y = 7;
    print_str("Point calculation (x * y): ");
    print_int(p.x * p.y);
    print_char(10); // newline
    
    return 0;
}
`,
    cpp: `#include <iostream>
#include <vector>
#include <string>

int main() {
    std::cout << "Hello, CodeForge C++ World!" << std::endl;
    
    std::vector<std::string> messages = {"Extensible", "High Performance", "Secure Sandbox"};
    std::cout << "Compiler features:" << std::endl;
    for (const auto& msg : messages) {
        std::cout << " - " << msg << std::endl;
    }
    
    int a = 15, b = 27;
    std::cout << "Calculated sum: " << a << " + " << b << " = " << (a + b) << std::endl;
    
    return 0;
}
`,
    c: `#include <stdio.h>

int main() {
    printf("Hello, CodeForge C World!\\n");
    
    int a = 15, b = 27;
    printf("Sum: %d + %d = %d\\n", a, b, a + b);
    
    return 0;
}
`,
    python: `# CodeForge Python execution
print("Hello, CodeForge Python World!")

user = {
    "platform": "CodeForge",
    "status": "Active"
}
print(f"Environment details: {user}")
`,
    javascript: `// CodeForge JavaScript runtime (Node.js)
console.log("Hello, CodeForge JavaScript World!");

const user = {
    platform: "CodeForge",
    year: new Date().getFullYear(),
    status: "Active"
};

console.log("Environment details:", JSON.stringify(user, null, 2));
`,
    java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, CodeForge Java World!");
        
        int a = 15;
        int b = 27;
        System.out.println("Result: " + a + " + " + b + " = " + (a + b));
    }
}
`,
    go: `package main

import (
	"fmt"
)

func main() {
	fmt.Println("Hello, CodeForge Go World!")
	
	a, b := 15, 27
	fmt.Printf("Sum of %d and %d is %d\\n", a, b, a+b)
}
`,
    rust: `fn main() {
    println!("Hello, CodeForge Rust World!");
    
    let numbers = vec![15, 27];
    let sum: i32 = numbers.iter().sum();
    
    println!("Sum of elements is: {}", sum);
}
`
};

const READABLE_LANGUAGES = {
    mcpp: 'MiniCPP', cpp: 'C++', c: 'C', python: 'Python', javascript: 'Node.js', java: 'Java', go: 'Go', rust: 'Rust'
};

const FILE_EXTENSIONS = {
    mcpp: 'mcpp', cpp: 'cpp', c: 'c', python: 'py', javascript: 'js', java: 'java', go: 'go', rust: 'rs'
};

let currentLanguage = 'mcpp';
let codeCache = JSON.parse(JSON.stringify(TEMPLATES)); // deep clone
let activeTab = 'console';
let activeSidebarPanel = 'explorer';
let currentFilePath = null;
let activeFileName = 'main.mcpp';

// Desktop API detection
const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);

// Elements
const languageSelect = document.getElementById('language-select');
const btnReset = document.getElementById('btn-reset');
const btnDownload = document.getElementById('btn-download');
const btnShare = document.getElementById('btn-share');
const btnRun = document.getElementById('btn-run');
const btnNew = document.getElementById('btn-new');
const btnOpen = document.getElementById('btn-open');
const btnSave = document.getElementById('btn-save');
const btnSidebarNew = document.getElementById('btn-sidebar-new');
const localProjectsList = document.getElementById('local-projects-list');
const activeFilename = document.getElementById('active-filename');
const explorerFilename = document.getElementById('explorer-filename');

const sidebarIconBtns = document.querySelectorAll('.sidebar-icon-btn');
const sidebarDrawer = document.getElementById('sidebar-drawer');
const drawerContents = document.querySelectorAll('.drawer-content');
const explorerMainFile = document.getElementById('explorer-main-file');
const explorerInputFile = document.getElementById('explorer-input-file');

const tabButtons = document.querySelectorAll('.tab-button');
const tabPanes = document.querySelectorAll('.tab-pane');
const consoleOutput = document.getElementById('console-output');
const stdinTextarea = document.getElementById('stdin-textarea');
const astViewerContent = document.getElementById('ast-viewer-content');

// Telemetry Elements
const metricExitCode = document.getElementById('metric-exitcode');
const metricCompileTime = document.getElementById('metric-compiletime');
const metricExecutionTime = document.getElementById('metric-executiontime');
const statusExecutionTime = document.getElementById('status-execution-time');
const statusLanguageLabel = document.getElementById('status-language-label');

// Monaco Editor Initialization
function getMonacoLanguage(lang) {
    if (lang === 'c' || lang === 'cpp') return 'cpp';
    if (lang === 'python') return 'python';
    if (lang === 'javascript') return 'javascript';
    if (lang === 'java') return 'java';
    if (lang === 'go') return 'go';
    if (lang === 'rust') return 'rust';
    return 'cpp'; // Default fallback for mcpp
}

require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });
require(['vs/editor/editor.main'], function () {
    window.editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: codeCache[currentLanguage],
        language: getMonacoLanguage(currentLanguage),
        theme: 'vs-dark',
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        minimap: { enabled: true },
        automaticLayout: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        formatOnPaste: true,
        padding: { top: 12 },
        scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6
        }
    });

    // Save changes to cache
    window.editor.onDidChangeModelContent(() => {
        codeCache[currentLanguage] = window.editor.getValue();
    });
});

// UI Event Listeners

// Sidebar Icon Toggles
sidebarIconBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const panel = btn.getAttribute('data-panel');
        
        if (activeSidebarPanel === panel && sidebarDrawer.classList.contains('expanded')) {
            // Collapse
            sidebarDrawer.classList.remove('expanded');
            sidebarDrawer.classList.add('collapsed');
            btn.classList.remove('active');
        } else {
            // Expand & Switch
            sidebarDrawer.classList.remove('collapsed');
            sidebarDrawer.classList.add('expanded');
            
            sidebarIconBtns.forEach(b => b.classList.remove('active'));
            drawerContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`drawer-${panel}`).classList.add('active');
            activeSidebarPanel = panel;
        }
    });
});

// Tab Panel Toggles
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        switchTab(tab);
    });
});

function switchTab(tabId) {
    tabButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    tabPanes.forEach(pane => {
        if (pane.id === `tab-${tabId}`) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });
    activeTab = tabId;
}

// Stdin and Main File explorer selectors
explorerMainFile.addEventListener('click', () => {
    explorerMainFile.classList.add('active');
    explorerInputFile.classList.remove('active');
    // Focus monaco
    if (window.editor) window.editor.focus();
});

explorerInputFile.addEventListener('click', () => {
    explorerInputFile.classList.add('active');
    explorerMainFile.classList.remove('active');
    // Open stdin tab
    switchTab('input');
    stdinTextarea.focus();
});

// Language Select
languageSelect.addEventListener('change', (e) => {
    const lang = e.target.value;
    switchLanguage(lang);
});

function switchLanguage(lang) {
    currentLanguage = lang;
    languageSelect.value = lang;
    
    // Update labels
    const ext = FILE_EXTENSIONS[lang];
    activeFilename.textContent = `main.${ext}`;
    explorerFilename.textContent = `main.${ext}`;
    statusLanguageLabel.textContent = `Lang: ${READABLE_LANGUAGES[lang]}`;
    
    // Update active preset button in templates drawer
    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update Monaco editor value and language
    if (window.editor) {
        window.editor.setValue(codeCache[lang]);
        monaco.editor.setModelLanguage(window.editor.getModel(), getMonacoLanguage(lang));
    }
}

// Drawer templates mapping
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        switchLanguage(lang);
    });
});

// Reset
btnReset.addEventListener('click', () => {
    if (confirm(`Reset main.${FILE_EXTENSIONS[currentLanguage]} template to default?`)) {
        codeCache[currentLanguage] = TEMPLATES[currentLanguage];
        if (window.editor) {
            window.editor.setValue(codeCache[currentLanguage]);
        }
    }
});

// Download
btnDownload.addEventListener('click', () => {
    const code = window.editor ? window.editor.getValue() : codeCache[currentLanguage];
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `main.${FILE_EXTENSIONS[currentLanguage]}`;
    link.click();
    URL.revokeObjectURL(url);
});

// Share
btnShare.addEventListener('click', () => {
    const code = window.editor ? window.editor.getValue() : codeCache[currentLanguage];
    navigator.clipboard.writeText(code).then(() => {
        alert("Source code copied to clipboard! Share it with your peers.");
    });
});

// Output helpers
function clearConsole() {
    consoleOutput.innerHTML = '';
}

function writeConsoleLine(text, className = '') {
    const line = document.createElement('div');
    line.className = `console-line ${className}`;
    line.textContent = text;
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Compile & Run execution
btnRun.addEventListener('click', async () => {
    if (!window.editor) return;

    const code = window.editor.getValue();
    const stdin = stdinTextarea.value;

    switchTab('console');
    clearConsole();

    // Show loading line (use plain CSS spinner, NOT lucide.createIcons which would spin ALL icons)
    const loadingLine = document.createElement('div');
    loadingLine.className = 'console-line loading';
    loadingLine.innerHTML = `<span class="spinner"></span> <span>Compiling and running code...</span>`;
    consoleOutput.appendChild(loadingLine);

    btnRun.disabled = true;

    // Reset telemetry metrics
    metricExitCode.textContent = 'Running...';
    metricExitCode.className = 'metric-value null';
    metricCompileTime.textContent = 'N/A';
    metricExecutionTime.textContent = 'N/A';
    statusExecutionTime.style.display = 'none';

    try {
        const response = await fetch('/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: currentLanguage,
                code,
                stdin
            })
        });
        const data = await response.json();
        
        loadingLine.remove();

        // Print header compilation notice
        writeConsoleLine(`[CodeForge] Running ${READABLE_LANGUAGES[currentLanguage].toUpperCase()} script...`, 'sys');

        if (data.compileTime !== undefined) {
            writeConsoleLine(`Compilation took: ${data.compileTime} ms`, 'sys');
        }

        // Print stdout & stderr
        if (data.stdout) {
            writeConsoleLine(data.stdout, 'stdout');
        }
        if (data.stderr) {
            writeConsoleLine(data.stderr, 'stderr');
        }

        const isSuccess = data.exitCode === 0;

        // Process exit message
        if (data.exitCode !== null) {
            writeConsoleLine(`\nProcess exited with code ${data.exitCode}`, isSuccess ? 'success' : 'stderr');
        } else {
            writeConsoleLine(`\nProcess execution finished.`, 'sys');
        }

        // Update Telemetry Metrics
        metricExitCode.textContent = data.exitCode !== null ? data.exitCode : 'Finished';
        metricExitCode.className = `metric-value ${isSuccess ? 'success' : 'fail'}`;
        metricCompileTime.textContent = data.compileTime !== undefined ? `${data.compileTime} ms` : 'N/A';
        metricExecutionTime.textContent = data.executionTime !== undefined ? `${data.executionTime} ms` : 'N/A';

        // Update Status bar
        if (data.executionTime !== undefined) {
            statusExecutionTime.textContent = `Execution time: ${data.executionTime}ms`;
            statusExecutionTime.style.display = 'inline';
        }

        // If MiniCPP and compiled successfully, let's fetch assembly and render to AST
        if (currentLanguage === 'mcpp') {
            updateASTViewer(code);
        } else {
            // Reset AST viewer for other languages
            astViewerContent.innerHTML = `<div class="console-line placeholder">AST analysis is only supported for MiniCPP (mcpc) compiler.</div>`;
        }

    } catch (err) {
        loadingLine.remove();
        writeConsoleLine(`Network Error: Make sure backend is running.\nDetails: ${err.message}`, 'stderr');
        
        metricExitCode.textContent = 'Error';
        metricExitCode.className = 'metric-value fail';
    } finally {
        btnRun.disabled = false;
    }
});

// Dynamic Visual AST & Code Structure Visualizer
function updateASTViewer(code) {
    if (!astViewerContent) return;
    const lines = (code || '').split('\n');
    const includes = lines.filter(l => l.trim().startsWith('#include')).map(l => l.trim());
    const structMatches = Array.from((code || '').matchAll(/struct\s+(\w+)/g)).map(m => m[1]);
    const classMatches = Array.from((code || '').matchAll(/class\s+(\w+)/g)).map(m => m[1]);
    const funcMatches = Array.from((code || '').matchAll(/(?:void|int|float|double|char|bool|auto|\w+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g))
        .map(m => ({ name: m[1], params: m[2] }))
        .filter(f => !['if', 'while', 'for', 'switch'].includes(f.name));

    let astHtml = `<div style="margin-bottom:8px; color:var(--text-muted); font-size:11px;">Target File: <strong style="color:var(--accent-blue);">${activeFileName || 'main.mcpp'}</strong></div>`;
    astHtml += `<span class="ast-node-type font-bold green-text">TranslationUnit</span>`;
    astHtml += `<div class="ast-node-children">`;

    if (includes.length > 0) {
        astHtml += `<div>├─ <span class="white-text font-bold">Includes</span> (${includes.length})</div>`;
        includes.forEach(inc => {
            astHtml += `<div class="pl-4">├─ <span class="blue-text">${inc}</span></div>`;
        });
    }

    if (structMatches.length > 0) {
        structMatches.forEach(s => {
            astHtml += `<div>├─ <span class="white-text font-bold">StructDecl</span> (${s})</div>`;
        });
    }

    if (classMatches.length > 0) {
        classMatches.forEach(c => {
            astHtml += `<div>├─ <span class="white-text font-bold">ClassDecl</span> (${c})</div>`;
        });
    }

    if (funcMatches.length > 0) {
        funcMatches.forEach(f => {
            astHtml += `<div>├─ <span class="white-text font-bold">FunctionDecl</span> (${f.name})</div>`;
            astHtml += `<div class="pl-4">├─ <span class="blue-text">Params</span>: ${f.params || 'none'}</div>`;
            astHtml += `<div class="pl-4">└─ <span class="white-text">CompoundStmt</span> (Scope)</div>`;
        });
    }

    if (includes.length === 0 && structMatches.length === 0 && classMatches.length === 0 && funcMatches.length === 0) {
        astHtml += `<div>└─ <span class="white-text">EmptyTranslationUnit</span> (No top-level functions/structs detected)</div>`;
    }

    astHtml += `</div>`;
    astViewerContent.innerHTML = astHtml;
}

// Fetch Examples and populate Explorer dynamically
async function fetchExamples() {
    try {
        const res = await fetch('/api/examples');
        const data = await res.json();
        if (data.success) {
            const examples = data.examples.filter(e => e.type === 'examples');
            const tests = data.examples.filter(e => e.type === 'tests');
            
            const listContainer = document.querySelector('.explorer-list');
            
            // Add a header for examples
            const examplesHeader = document.createElement('div');
            examplesHeader.className = 'drawer-header';
            examplesHeader.style.marginTop = '12px';
            examplesHeader.style.borderBottom = 'none';
            examplesHeader.style.padding = '4px 6px';
            examplesHeader.textContent = 'Examples';
            listContainer.appendChild(examplesHeader);

            examples.forEach(e => {
                const btn = document.createElement('button');
                btn.className = 'explorer-item';
                btn.innerHTML = `<i data-lucide="file-code"></i> <span>${e.name}</span>`;
                btn.addEventListener('click', () => {
                    loadExampleFile(e.type, e.name, btn);
                });
                listContainer.appendChild(btn);
            });

            // Add a header for tests
            const testsHeader = document.createElement('div');
            testsHeader.className = 'drawer-header';
            testsHeader.style.marginTop = '12px';
            testsHeader.style.borderBottom = 'none';
            testsHeader.style.padding = '4px 6px';
            testsHeader.textContent = 'Test Suite';
            listContainer.appendChild(testsHeader);

            tests.forEach(t => {
                const btn = document.createElement('button');
                btn.className = 'explorer-item';
                btn.innerHTML = `<i data-lucide="file-code"></i> <span>${t.name}</span>`;
                btn.addEventListener('click', () => {
                    loadExampleFile(t.type, t.name, btn);
                });
                listContainer.appendChild(btn);
            });

            lucide.createIcons();
        }
    } catch (err) {
        console.error('Failed to load examples', err);
    }
}

async function loadExampleFile(type, name, activeBtn) {
    try {
        const res = await fetch(`/api/examples/${type}/${name}`);
        const data = await res.json();
        if (data.success) {
            // De-activate current active explorer items
            document.querySelectorAll('.explorer-item').forEach(b => b.classList.remove('active'));
            activeBtn.classList.add('active');

            // Switch to mcpp language
            switchLanguage('mcpp');
            
            codeCache['mcpp'] = data.content;
            if (window.editor) {
                window.editor.setValue(data.content);
            }
            
            clearConsole();
            writeConsoleLine(`Loaded file: ${name}`, 'sys');
        }
    } catch (err) {
        writeConsoleLine(`Error loading example: ${err.message}`, 'stderr');
    }
}

// Local Projects and File Operations
async function fetchLocalProjects() {
    if (!localProjectsList) return;
    localProjectsList.innerHTML = '';

    try {
        let files = [];
        if (isElectron) {
            const res = await window.electronAPI.listProjects();
            if (res.success) files = res.files;
        } else {
            const res = await fetch('/api/local/projects');
            const data = await res.json();
            if (data.success) files = data.files;
        }

        if (files.length === 0) {
            localProjectsList.innerHTML = `<div class="console-line placeholder" style="padding:6px; font-size:11px;">No local files found.</div>`;
            return;
        }

        files.forEach(f => {
            const btn = document.createElement('button');
            btn.className = 'explorer-item';
            if (currentFilePath === f.path || activeFileName === f.name) {
                btn.classList.add('active');
            }
            btn.innerHTML = `
                <i data-lucide="file-code" class="${f.lang === 'mcpp' ? 'blue-icon' : ''}"></i>
                <span class="file-name-title" style="flex:1; text-align:left;">${f.name}</span>
                <button class="btn-delete-file" title="Delete file"><i data-lucide="trash-2"></i></button>
            `;
            btn.querySelector('.file-name-title').addEventListener('click', () => loadLocalFile(f.name, f.path));
            btn.querySelector('.btn-delete-file').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteLocalFile(f.name);
            });
            localProjectsList.appendChild(btn);
        });

        lucide.createIcons();
    } catch (err) {
        console.error('Failed to list local projects', err);
    }
}

async function loadLocalFile(fileName, filePath) {
    try {
        let content = '';
        if (isElectron) {
            const res = await window.electronAPI.readProjectFile(filePath || fileName);
            if (res.success) content = res.content;
            else return alert('Failed to read file: ' + res.error);
        } else {
            const res = await fetch(`/api/local/read?name=${encodeURIComponent(fileName)}`);
            const data = await res.json();
            if (data.success) content = data.content;
            else return alert('Failed to read file: ' + data.error);
        }

        currentFilePath = filePath || fileName;
        activeFileName = fileName;
        activeFilename.textContent = fileName;
        explorerFilename.textContent = fileName;

        const ext = fileName.split('.').pop().toLowerCase();
        let lang = 'mcpp';
        if (ext === 'cpp') lang = 'cpp';
        else if (ext === 'c') lang = 'c';
        else if (ext === 'py') lang = 'python';
        else if (ext === 'js') lang = 'javascript';
        else if (ext === 'java') lang = 'java';
        else if (ext === 'go') lang = 'go';
        else if (ext === 'rs') lang = 'rust';

        currentLanguage = lang;
        languageSelect.value = lang;
        codeCache[lang] = content;

        if (window.editor) {
            window.editor.setValue(content);
            monaco.editor.setModelLanguage(window.editor.getModel(), getMonacoLanguage(lang));
        }

        fetchLocalProjects();
        clearConsole();
        writeConsoleLine(`Opened local file: ${fileName}`, 'sys');
    } catch (err) {
        alert('Error loading file: ' + err.message);
    }
}

async function saveCurrentFile(saveAs = false) {
    if (!window.editor) return;
    const content = window.editor.getValue();

    if (isElectron) {
        if (!saveAs && currentFilePath) {
            const res = await window.electronAPI.saveFileContent(currentFilePath, content);
            if (res.success) {
                writeConsoleLine(`Saved locally: ${res.filePath}`, 'sys');
                fetchLocalProjects();
            } else {
                alert('Save failed: ' + res.error);
            }
        } else {
            const defaultName = activeFileName || `main.${FILE_EXTENSIONS[currentLanguage]}`;
            const res = await window.electronAPI.saveFileDialog(defaultName, content);
            if (!res.canceled && res.filePath) {
                currentFilePath = res.filePath;
                activeFileName = res.fileName;
                activeFilename.textContent = res.fileName;
                writeConsoleLine(`Saved file as: ${res.filePath}`, 'sys');
                fetchLocalProjects();
            }
        }
    } else {
        let fileName = activeFileName || `main.${FILE_EXTENSIONS[currentLanguage]}`;
        if (saveAs || !currentFilePath) {
            const inputName = prompt('Enter filename to save locally in Documents/mcpc-projects:', fileName);
            if (!inputName) return;
            fileName = inputName;
        }

        const res = await fetch('/api/local/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: fileName, content })
        });
        const data = await res.json();
        if (data.success) {
            currentFilePath = data.filePath;
            activeFileName = data.fileName;
            activeFilename.textContent = data.fileName;
            writeConsoleLine(`Saved locally to Documents/mcpc-projects/${data.fileName}`, 'sys');
            fetchLocalProjects();
        } else {
            alert('Save failed: ' + data.error);
        }
    }
}

async function createNewFile() {
    const fileName = prompt('Enter new file name (e.g. main.mcpp, solution.cpp, script.py):', `untitled.${FILE_EXTENSIONS[currentLanguage]}`);
    if (!fileName) return;

    const initialContent = TEMPLATES[currentLanguage] || '// New file\n';
    if (isElectron) {
        const res = await window.electronAPI.newProjectFile(fileName, initialContent);
        if (res.success) {
            loadLocalFile(res.fileName, res.filePath);
        } else {
            alert('Could not create file: ' + res.error);
        }
    } else {
        const res = await fetch('/api/local/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: fileName, content: initialContent })
        });
        const data = await res.json();
        if (data.success) {
            loadLocalFile(data.fileName, data.filePath);
        } else {
            alert('Could not create file: ' + data.error);
        }
    }
}

async function deleteLocalFile(fileName) {
    if (!confirm(`Delete ${fileName} from local storage?`)) return;

    if (isElectron) {
        const res = await window.electronAPI.deleteProjectFile(fileName);
        if (res.success) {
            writeConsoleLine(`Deleted local file: ${fileName}`, 'sys');
            fetchLocalProjects();
        } else {
            alert('Delete failed: ' + res.error);
        }
    } else {
        const res = await fetch(`/api/local/delete?name=${encodeURIComponent(fileName)}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            writeConsoleLine(`Deleted local file: ${fileName}`, 'sys');
            fetchLocalProjects();
        } else {
            alert('Delete failed: ' + data.error);
        }
    }
}

// Attach Desktop & Local Toolbar Listeners
if (btnNew) btnNew.addEventListener('click', () => createNewFile());
if (btnSidebarNew) btnSidebarNew.addEventListener('click', () => createNewFile());
if (btnDesktopDownload) {
    btnDesktopDownload.addEventListener('click', () => {
        alert("💻 MCPC Desktop App Installer Package:\n\nTo install & run the Desktop app on your laptop:\n1. Open terminal in mcpc folder\n2. Run: npm run desktop (or npx electron .)\n3. Run: npm run build:exe to package as standalone Windows installer (.exe)!");
    });
}
if (btnOpen) {
    btnOpen.addEventListener('click', () => {
        if (isElectron) {
            window.electronAPI.openFileDialog().then(res => {
                if (!res.canceled && res.content !== undefined) {
                    loadLocalFile(res.fileName, res.filePath);
                }
            });
        } else {
            fetchLocalProjects();
        }
    });
}
if (btnSave) btnSave.addEventListener('click', () => saveCurrentFile(false));

// Global Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            saveCurrentFile(e.shiftKey);
        } else if (e.key === 'o' || e.key === 'O') {
            e.preventDefault();
            if (isElectron) {
                window.electronAPI.openFileDialog().then(res => {
                    if (!res.canceled && res.content !== undefined) {
                        loadLocalFile(res.fileName, res.filePath);
                    }
                });
            } else {
                fetchLocalProjects();
            }
        } else if (e.key === 'n' || e.key === 'N') {
            e.preventDefault();
            createNewFile();
        }
    } else if (e.key === 'F5') {
        e.preventDefault();
        btnRun.click();
    }
});

// Native Electron Menu Actions Listener
if (isElectron && window.electronAPI.onMenuAction) {
    window.electronAPI.onMenuAction((action) => {
        if (action === 'new-file') createNewFile();
        else if (action === 'open-file') {
            window.electronAPI.openFileDialog().then(res => {
                if (!res.canceled && res.content !== undefined) {
                    loadLocalFile(res.fileName, res.filePath);
                }
            });
        }
        else if (action === 'save-file') saveCurrentFile(false);
        else if (action === 'save-as') saveCurrentFile(true);
        else if (action === 'run-code') btnRun.click();
    });
}

// Initial Setup
lucide.createIcons();
fetchExamples();
fetchLocalProjects();

