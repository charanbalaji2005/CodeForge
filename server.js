const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

const PROJECTS_DIR = path.join(os.homedir(), 'Documents', 'mcpc-projects');

function getProjectsDir() {
    if (!fs.existsSync(PROJECTS_DIR)) {
        try {
            fs.mkdirSync(PROJECTS_DIR, { recursive: true });
        } catch (e) {}
    }
    return PROJECTS_DIR;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// Generate a random session ID
function generateSessionId() {
    return Math.random().toString(36).substring(2, 12);
}

const LANGUAGE_CONFIGS = {
    c: {
        name: 'C',
        fileName: 'main.c',
        compileCmd: 'gcc -O2 main.c -o main',
        runCmd: './main'
    },
    cpp: {
        name: 'C++',
        fileName: 'main.cpp',
        compileCmd: 'g++ -std=c++20 -O2 main.cpp -o main',
        runCmd: './main'
    },
    python: {
        name: 'Python',
        fileName: 'main.py',
        runCmd: 'python3 main.py'
    },
    javascript: {
        name: 'JavaScript',
        fileName: 'main.js',
        runCmd: 'node main.js'
    },
    java: {
        name: 'Java',
        fileName: 'Main.java',
        compileCmd: 'if [ -f ../../../codeforge/backend/jdk/bin/javac ]; then ../../../codeforge/backend/jdk/bin/javac Main.java; else javac Main.java; fi',
        runCmd: 'if [ -f ../../../codeforge/backend/jdk/bin/java ]; then ../../../codeforge/backend/jdk/bin/java Main; else java Main; fi'
    },
    go: {
        name: 'Go',
        fileName: 'main.go',
        runCmd: 'go run main.go'
    },
    rust: {
        name: 'Rust',
        fileName: 'main.rs',
        compileCmd: 'rustc main.rs -o main',
        runCmd: './main'
    },
    mcpp: {
        name: 'MiniCPP (mcpc)',
        fileName: 'main.mcpp',
        compileCmd: '../../mcpc main.mcpp -o main',
        runCmd: './main'
    }
};

const TEMP_DIR = path.join(os.tmpdir(), 'mcpc-temp');

function toWslPath(winPath) {
    const cleanPath = path.resolve(winPath).replace(/\\/g, '/');
    const match = cleanPath.match(/^([a-zA-Z]):\/(.*)/);
    if (match) {
        const drive = match[1].toLowerCase();
        const rest = match[2];
        return `/mnt/${drive}/${rest}`;
    }
    return cleanPath;
}

function cleanUpSessionDir(dirPath) {
    try {
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            for (const file of files) {
                fs.unlinkSync(path.join(dirPath, file));
            }
            fs.rmdirSync(dirPath);
        }
    } catch (e) {
        console.error('Failed to clean up session directory:', dirPath, e);
    }
}

// Endpoint: get list of example files
app.get('/api/examples', (req, res) => {
    try {
        const examplesDir = path.join(__dirname, 'examples');
        const testsDir = path.join(__dirname, 'tests', 'programs');
        const list = [];

        if (fs.existsSync(examplesDir)) {
            const files = fs.readdirSync(examplesDir);
            files.forEach(file => {
                if (file.endsWith('.mcpp')) {
                    list.push({ name: file, type: 'examples' });
                }
            });
        }

        if (fs.existsSync(testsDir)) {
            const files = fs.readdirSync(testsDir);
            files.forEach(file => {
                if (file.endsWith('.mcpp')) {
                    list.push({ name: file, type: 'tests' });
                }
            });
        }

        res.json({ success: true, examples: list });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Endpoint: get individual example file content
app.get('/api/examples/:type/:name', (req, res) => {
    try {
        const { type, name } = req.params;
        let filePath;
        if (type === 'examples') {
            filePath = path.join(__dirname, 'examples', name);
        } else if (type === 'tests') {
            filePath = path.join(__dirname, 'tests', 'programs', name);
        } else {
            return res.status(400).json({ success: false, error: 'Invalid type' });
        }

        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            res.json({ success: true, name, content });
        } else {
            res.status(404).json({ success: false, error: 'File not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Endpoint: get list of local projects
app.get('/api/local/projects', (req, res) => {
    try {
        const dir = getProjectsDir();
        const files = fs.readdirSync(dir);
        const projectFiles = files
            .filter(file => !fs.statSync(path.join(dir, file)).isDirectory())
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
                return { name: file, lang, path: path.join(dir, file) };
            });
        res.json({ success: true, projectsDir: dir, files: projectFiles });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, files: [] });
    }
});

// Endpoint: read local project file
app.get('/api/local/read', (req, res) => {
    try {
        const name = req.query.name;
        if (!name) return res.status(400).json({ success: false, error: 'No filename provided' });
        const dir = getProjectsDir();
        const filePath = path.join(dir, path.basename(name));
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            res.json({ success: true, fileName: path.basename(name), content });
        } else {
            res.status(404).json({ success: false, error: 'File not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Endpoint: save local project file
app.post('/api/local/save', (req, res) => {
    try {
        const { name, content } = req.body;
        if (!name) return res.status(400).json({ success: false, error: 'No filename provided' });
        const dir = getProjectsDir();
        const filePath = path.join(dir, path.basename(name));
        fs.writeFileSync(filePath, content || '', 'utf8');
        res.json({ success: true, fileName: path.basename(name), filePath });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Endpoint: delete local project file
app.delete('/api/local/delete', (req, res) => {
    try {
        const name = req.query.name;
        if (!name) return res.status(400).json({ success: false, error: 'No filename provided' });
        const dir = getProjectsDir();
        const filePath = path.join(dir, path.basename(name));
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'File not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Endpoint: compile MiniCPP code to Assembly
app.post('/api/compile', (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ success: false, error: 'No code provided' });
    }

    const sessionId = generateSessionId();
    const sessionDir = path.join(TEMP_DIR, sessionId);

    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    fs.mkdirSync(sessionDir);

    const sourcePath = path.join(sessionDir, 'main.mcpp');
    const asmPath = path.join(sessionDir, 'main.s');

    fs.writeFileSync(sourcePath, code, 'utf8');

    const wslSessionDir = toWslPath(sessionDir);
    const wslCompilerPath = toWslPath(path.join(__dirname, 'build', 'mcpc'));
    const cmd = `wsl sh -c "cd '${wslSessionDir}' && '${wslCompilerPath}' main.mcpp -S -o main.s"`;

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            cleanUpSessionDir(sessionDir);
            return res.json({
                success: false,
                error: stderr || stdout || error.message
            });
        }

        try {
            if (fs.existsSync(asmPath)) {
                const asmContent = fs.readFileSync(asmPath, 'utf8');
                cleanUpSessionDir(sessionDir);
                return res.json({ success: true, assembly: asmContent });
            } else {
                cleanUpSessionDir(sessionDir);
                return res.json({ success: false, error: 'Assembly file was not generated.' });
            }
        } catch (err) {
            cleanUpSessionDir(sessionDir);
            return res.status(500).json({ success: false, error: err.message });
        }
    });
});

// Endpoint: compile and execute code (for multi-language sandbox)
app.post('/api/run', async (req, res) => {
    const { language = 'mcpp', code, stdin = '' } = req.body;
    if (!code) {
        return res.status(400).json({ success: false, error: 'No code provided' });
    }

    const config = LANGUAGE_CONFIGS[language.toLowerCase()];
    if (!config) {
        return res.status(400).json({ success: false, error: `Unsupported language: ${language}` });
    }

    const sessionId = generateSessionId();
    const sessionDir = path.join(TEMP_DIR, sessionId);

    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    fs.mkdirSync(sessionDir);

    const sourcePath = path.join(sessionDir, config.fileName);
    const stdinPath = path.join(sessionDir, 'input.txt');

    fs.writeFileSync(sourcePath, code, 'utf8');
    fs.writeFileSync(stdinPath, stdin || '', 'utf8');

    const wslSessionDir = toWslPath(sessionDir);

    let compileTime = 0;
    const compileStart = process.hrtime();

    try {
        // Phase 1: Compile if compileCmd is defined
        if (config.compileCmd) {
            let compileCmdText = config.compileCmd;
            if (language.toLowerCase() === 'mcpp') {
                const wslCompilerPath = toWslPath(path.join(__dirname, 'build', 'mcpc'));
                compileCmdText = `'${wslCompilerPath}' main.mcpp -S -o main.s`;
            } else if (language.toLowerCase() === 'java') {
                const jdkPath = path.join(__dirname, 'codeforge', 'backend', 'jdk');
                const wslJavac = toWslPath(path.join(jdkPath, 'bin', 'javac'));
                compileCmdText = `if [ -f '${wslJavac}' ]; then '${wslJavac}' Main.java; else javac Main.java; fi`;
            }
            const compileCmd = `wsl sh -c "cd '${wslSessionDir}' && ${compileCmdText}"`;
            await new Promise((resolve, reject) => {
                exec(compileCmd, (err, stdout, stderr) => {
                    if (err) {
                        reject({
                            message: 'Compilation Failed',
                            stdout,
                            stderr,
                            exitCode: err.code || 1
                        });
                    } else {
                        resolve();
                    }
                });
            });
            const compileDiff = process.hrtime(compileStart);
            compileTime = Math.round((compileDiff[0] * 1000) + (compileDiff[1] / 1000000));
        }

        // Phase 2: Execute code
        const execStart = process.hrtime();
        let runCmdText = config.runCmd;
        if (language.toLowerCase() === 'java') {
            const jdkPath = path.join(__dirname, 'codeforge', 'backend', 'jdk');
            const wslJava = toWslPath(path.join(jdkPath, 'bin', 'java'));
            runCmdText = `if [ -f '${wslJava}' ]; then '${wslJava}' Main; else java Main; fi`;
        }
        const runCmd = `wsl sh -c "cd '${wslSessionDir}' && ${runCmdText} < input.txt"`;

        const runResult = await new Promise((resolve) => {
            exec(runCmd, { timeout: 5000 }, (err, stdout, stderr) => {
                const execDiff = process.hrtime(execStart);
                const executionTime = Math.round((execDiff[0] * 1000) + (execDiff[1] / 1000000));
                const exitCode = err ? err.code || null : 0;
                const isTimedOut = err && err.killed;

                resolve({
                    success: exitCode === 0,
                    stdout,
                    stderr: isTimedOut ? 'Execution Timed Out (Limit: 5 seconds)' : stderr,
                    compileTime,
                    executionTime,
                    exitCode
                });
            });
        });

        cleanUpSessionDir(sessionDir);
        return res.json(runResult);

    } catch (err) {
        cleanUpSessionDir(sessionDir);
        return res.json({
            success: false,
            compileError: err.stderr || err.message || 'Unknown compilation error',
            stdout: err.stdout || '',
            stderr: err.stderr || err.message || 'Unknown compilation error',
            compileTime: 0,
            executionTime: 0,
            exitCode: err.exitCode || 1
        });
    }
});

const server = app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`[MCPC Server] Port ${PORT} is already in use (server is already active).`);
    } else {
        console.error('[MCPC Server Error]', err);
    }
});
