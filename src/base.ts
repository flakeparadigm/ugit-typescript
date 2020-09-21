import fs from 'fs';
import path from 'path';
import {
    getObject,
    GIT_DIR,
    hashObject,
    ObjectType,
    OBJECT_TYPE_BLOB,
    OBJECT_TYPE_TREE,
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
function isIgnored(checkPath: string): boolean {
    const parts = checkPath.split(path.sep);
    const ignored = [
        GIT_DIR,
        '.git',
        'node_modules',
        'dist',
    ];

    return ignored.some((ignore) => parts.includes(ignore));
}

/**
 * Store a tree (directory) into the ugit Object Store
 *
 * @param repoDir path of the repo root
 * @param directory the directory to store
 */
export function writeTree(repoDir:string, directory: string): string {
    const entries: TreeEntry[] = [];

    fs.readdirSync(directory).forEach((name) => {
        const entryPath = path.join(directory, name);
        const entryStat = fs.statSync(entryPath);

        // filtered out ignroed files and symlinks
        if (
            isIgnored(name)
            || entryStat.isSymbolicLink()
        ) {
            return;
        }

        // handle the files & directories
        if (entryStat.isFile()) {
            const data = fs.readFileSync(entryPath);

            entries.push({
                name,
                objectId: hashObject(repoDir, data, OBJECT_TYPE_BLOB),
                type: OBJECT_TYPE_BLOB,
            });
        } else if (entryStat.isDirectory()) {
            entries.push({
                name,
                objectId: writeTree(repoDir, entryPath),
                type: OBJECT_TYPE_TREE,
            });
        }
    });

    // build and store the tree object
    const tree = entries.reduce(
        (agg: string, entry) => `${agg}${entry.type} ${entry.objectId} ${entry.name}\n`,
        '',
    );

    return hashObject(repoDir, Buffer.from(tree), OBJECT_TYPE_TREE);
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
 * Copy the files from the object store back to their original location
 *
 * @param repoPath path of the repo root
 * @param treeObjectId root object ID to restore from
 */
export function readTree(repoPath: string, treeObjectId: string): void {
    const tree = getTree(repoPath, treeObjectId, repoPath);

    Object.keys(tree).forEach((filePath) => {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(
            filePath,
            getObject(repoPath, tree[filePath], OBJECT_TYPE_BLOB),
        );
    });
}
