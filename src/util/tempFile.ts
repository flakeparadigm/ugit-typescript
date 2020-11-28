import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

let tempDir: string|null = null;

/**
 * Returns the path of the temporary directory created for this process,
 * creating a new one if it doesn't exist yet. The directory will be cleaned
 * up when the Node process exits.
 */
function getTempDir(): string {
    if (tempDir) return tempDir;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugit'));

    const cleanupCb = () => {
        if (!tempDir) return;

        try {
            fs.rmdirSync(tempDir, { recursive: true });
        } catch (e) {
            console.error('error on cleanup', e);
        }
    };

    // cleanup temp files on quit
    process.on('exit', cleanupCb);
    process.on('SIGINT', cleanupCb);
    process.on('SIGUSR1', cleanupCb);
    process.on('SIGUSR2', cleanupCb);
    process.on('uncaughtException', cleanupCb);

    return tempDir;
}

/**
 * Creates a temporary file that can be used to read and write from using the
 * file descriptor of the open file.
 *
 * All temporary files created with this class will be cleaned up when the
 * process exits.
 */
export default class TempFile {
    public readonly filePath: string;

    private open = true;

    private fd: number;

    constructor() {
        this.filePath = path.join(getTempDir(), uuidv4());
        this.fd = fs.openSync(this.filePath, 'w+');
    }

    public getFd(): number {
        if (!this.open) throw new Error('Requested file is now open!');

        return this.fd;
    }

    public close(): void {
        this.open = false;
        fs.closeSync(this.fd);
    }
}
