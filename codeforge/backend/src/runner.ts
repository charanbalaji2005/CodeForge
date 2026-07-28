import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface RunResult {
    success: boolean;
    stdout: string;
    stderr: string;
    compileTime?: number;
    executionTime: number;
    exitCode: number | null;
}

export interface LanguageConfig {
    name: string;
    fileName: string;
    compileCmd?: string;
    runCmd: string;
}

export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
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
        compileCmd: 'if [ -f ../../jdk/bin/javac ]; then ../../jdk/bin/javac Main.java; else javac Main.java; fi',
        runCmd: 'if [ -f ../../jdk/bin/java ]; then ../../jdk/bin/java Main; else java Main; fi'
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
        compileCmd: '../../../../build/mcpc main.mcpp -o main',
        runCmd: './main'
    }
};

const TEMP_DIR = path.join(__dirname, '..', 'temp');

// Helper to generate a random session ID
function generateSessionId(): string {
    return Math.random().toString(36).substring(2, 12);
}

export async function runCode(language: string, code: string, stdin: string): Promise<RunResult> {
    const config = LANGUAGE_CONFIGS[language.toLowerCase()];
    if (!config) {
        throw new Error(`Unsupported language: ${language}`);
    }

    const sessionId = generateSessionId();
    const sessionDir = path.join(TEMP_DIR, sessionId);
    
    // Create temp directory for this run
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    fs.mkdirSync(sessionDir);

    const sourcePath = path.join(sessionDir, config.fileName);
    const stdinPath = path.join(sessionDir, 'input.txt');

    // Write source code and stdin input file
    fs.writeFileSync(sourcePath, code, 'utf8');
    fs.writeFileSync(stdinPath, stdin || '', 'utf8');

    // WSL relative path conversion helper
    // We are on Windows, so we need to run commands via WSL in the session directory.
    // In WSL, our project is located under /mnt/c/...
    // Let's get the absolute path and translate backslash to forward slash for WSL.
    const projectRoot = path.join(__dirname, '..', '..', '..');
    const relativeSessionDir = path.relative(projectRoot, sessionDir).replace(/\\/g, '/');

    let compileTime = 0;
    
    try {
        // Phase 1: Compile if compileCmd is defined
        if (config.compileCmd) {
            const compileStart = process.hrtime();
            // Run compile command in WSL inside the session folder
            const compileCmd = `wsl sh -c "cd ${relativeSessionDir} && ${config.compileCmd}"`;
            
            await new Promise<void>((resolve, reject) => {
                exec(compileCmd, { cwd: projectRoot }, (err, stdout, stderr) => {
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
        // Pipe input.txt to the execution command inside WSL
        const runCmd = `wsl sh -c "cd ${relativeSessionDir} && ${config.runCmd} < input.txt"`;
        
        const runResult = await new Promise<RunResult>((resolve) => {
            // Set 5-second timeout for executing process
            exec(runCmd, { cwd: projectRoot, timeout: 5000 }, (err, stdout, stderr) => {
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

        // Cleanup temporary files
        cleanUpSessionDir(sessionDir);
        return runResult;

    } catch (err: any) {
        // Cleanup temporary files
        cleanUpSessionDir(sessionDir);
        
        return {
            success: false,
            stdout: err.stdout || '',
            stderr: err.stderr || err.message || 'Unknown compilation error',
            compileTime,
            executionTime: 0,
            exitCode: err.exitCode || 1
        };
    }
}

function cleanUpSessionDir(dirPath: string) {
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
