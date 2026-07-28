import { ChildProcessWithoutNullStreams } from 'child_process';

export interface ProcessItem {
    process: ChildProcessWithoutNullStreams;
    sessionDir: string;
}

export class ProcessManager {
    private processes = new Map<string, ProcessItem>();

    public create(socketId: string, process: ChildProcessWithoutNullStreams, sessionDir: string): void {
        // Kill existing process for this socket if any
        this.kill(socketId);
        this.processes.set(socketId, { process, sessionDir });
    }

    public get(socketId: string): ProcessItem | undefined {
        return this.processes.get(socketId);
    }

    public kill(socketId: string): ProcessItem | null {
        const item = this.processes.get(socketId);
        if (item) {
            try {
                if (!item.process.killed) {
                    item.process.kill('SIGKILL');
                }
            } catch (_) {}
            this.processes.delete(socketId);
            return item;
        }
        return null;
    }
}
