import fs from 'fs';
import path from 'path';
import {
    getHead,
    getObject,
    GIT_DIR,
    hashObject,
    ObjectType,
    OBJECT_TYPE_BLOB,
    OBJECT_TYPE_COMMIT,
    OBJECT_TYPE_TREE,
    setHead,
} from './data';
import UnexpectedFilenameError from './errors/UnexpectedFilenameError';

type TreeEntry = {
    name: string,
    objectId: string,
    type: ObjectType,
};

/**
 * Determine if a path should be ignored from a tree
 *
 * @param checkPath the path string to check
 */
function isIgnored(repoPath: string, checkPath: string): boolean {
    const parts = path.relative(repoPath, checkPath).split(path.sep);
    const ignored = [
        GIT_DIR,
        '.git',
        'node_modules',
        'dist',
    ];

    return ignored.some((ignore) => parts.includes(ignore));
}

/**
 * Calls the provided callback for each file or directory found in the provided
 * search directory. It will automatically skip files ignored by ugit.
 *
 * @param repoPath absolute path of the ugit repository
 * @param directory absolute path of the directory to iterate over
 * @param callback the callback to call for each entry in the directory
 */
function forEachFile(
    repoPath: string,
    directory: string,
    callback: (dirEntry: fs.Dirent, entryPath: string) => void,
): void {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((dirEntry) => {
        const entryPath = path.join(directory, dirEntry.name);

        // filtered out ignored files and symlinks
        if (isIgnored(repoPath, entryPath) || dirEntry.isSymbolicLink()) return;

        callback(dirEntry, entryPath);
    });
}

/**
 * Store a tree (directory) into the ugit Object Store
 *
 * @param repoPath path of the repo root
 * @param directory the absolute path of the directory to store
 */
export function writeTree(repoPath: string, directory: string): string {
    const entries: TreeEntry[] = [];

    forEachFile(repoPath, directory, (dirEntry, entryPath) => {
        // handle the files & directories
        if (dirEntry.isFile()) {
            const data = fs.readFileSync(entryPath);

            entries.push({
                name: dirEntry.name,
                objectId: hashObject(repoPath, data, OBJECT_TYPE_BLOB),
                type: OBJECT_TYPE_BLOB,
            });
        } else if (dirEntry.isDirectory()) {
            entries.push({
                name: dirEntry.name,
                objectId: writeTree(repoPath, entryPath),
                type: OBJECT_TYPE_TREE,
            });
        }
    });

    // build and store the tree object
    const tree = entries.reduce(
        (agg: string, entry) => `${agg}${entry.type} ${entry.objectId} ${entry.name}\n`,
        '',
    );

    return hashObject(repoPath, Buffer.from(tree), OBJECT_TYPE_TREE);
}

/**
 * Create an array of all of the entries in the specified tree object
 *
 * @param repoPath path of the repo root
 * @param treeObjectId object ID of the tree to read from
 */
function getTreeEntries(
    repoPath: string,
    treeObjectId: string,
): TreeEntry[] {
    const tree = getObject(repoPath, treeObjectId, OBJECT_TYPE_TREE)
        .toString()
        .split('\n')
        .filter((entryStr) => entryStr.length > 0);

    return tree.map((entryStr): TreeEntry => {
        const [type, objectId, name] = entryStr.split(' ', 3);
        return { type: type as ObjectType, objectId, name };
    });
}

/**
 * Build an object maping file paths to blob object IDs
 *
 * @param repoPath path of the repo root
 * @param treeObjectId root object ID to build from
 * @param basePath the base path to use when describing the full file path
 */
function getTree(
    repoPath: string,
    treeObjectId: string,
    basePath: string,
) {
    const result: { [path: string]: string } = {};

    getTreeEntries(repoPath, treeObjectId).forEach(({ name, objectId, type }) => {
        if (
            name.includes(path.sep)
            || ['..', '.'].includes(name)
        ) {
            throw new UnexpectedFilenameError(
                `Unexpected file ${name} in tree ${treeObjectId}`,
            );
        }

        const objectPath = path.join(basePath, name);

        if (type === OBJECT_TYPE_BLOB) {
            result[objectPath] = objectId;
        } else if (type === OBJECT_TYPE_TREE) {
            Object.assign(result, getTree(repoPath, objectId, objectPath));
        }
    });

    return result;
}

/**
 * Remove all the files and directories from a given directory, ignoring any
 * files ugit is configured to ignore.
 *
 * NOTE: This function will still succeed if a directory cannot be removed
 * because it is not empty. This is to allow for handling of ignores.
 *
 * @param repoPath path of the repo root
 * @param directory absolute path of the director to empty
 */
function emptyDirectory(repoPath: string, directory: string): void {
    forEachFile(repoPath, directory, (dirEntry, entryPath) => {
        if (dirEntry.isFile()) {
            fs.unlinkSync(entryPath);
        } else if (dirEntry.isDirectory()) {
            emptyDirectory(repoPath, path.join(directory, dirEntry.name));

            try {
                fs.rmdirSync(entryPath);
            } catch (err) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if (err.code === 'ENOTEMPTY') return; // okay for our purposes

                throw (err);
            }
        }
    });
}

/**
 * Copy the files from the object store back to their original location
 *
 * @param repoPath path of the repo root
 * @param treeObjectId root object ID to restore from
 */
export function readTree(repoPath: string, treeObjectId: string): void {
    // clean out any old files first
    emptyDirectory(repoPath, repoPath);

    const tree = getTree(repoPath, treeObjectId, repoPath);

    Object.keys(tree).forEach((filePath) => {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(
            filePath,
            getObject(repoPath, tree[filePath], OBJECT_TYPE_BLOB),
        );
    });
}

/**
 * Create a commit based on the current state of the repo
 *
 * @param repoPath path of the repo root
 * @param message the message to store with this commit
 */
export function commit(repoPath: string, message: string): string {
    const rootObjectId = writeTree(repoPath, repoPath);
    const HEAD = getHead(repoPath);

    let commitData = `${OBJECT_TYPE_TREE} ${rootObjectId}\n`;
    if (HEAD) commitData += `parent ${HEAD}\n`;
    commitData += `\n${message}\n`;

    const commitObjectId = hashObject(
        repoPath,
        Buffer.from(commitData),
        OBJECT_TYPE_COMMIT,
    );

    setHead(repoPath, commitObjectId);
    return commitObjectId;
}