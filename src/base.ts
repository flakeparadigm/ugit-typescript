import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
    GIT_DIR,
    HEADS_DIR,
    OBJECT_TYPE_BLOB,
    OBJECT_TYPE_COMMIT,
    OBJECT_TYPE_TREE,
    REFS_DIR,
    REF_HEAD_ALIAS,
    REF_HEAD_NAME,
    REF_MERGE_HEAD_NAME,
    TAGS_DIR,
} from './const';
import * as data from './data';
import { mergeTrees } from './diff';
import UnexpectedFilenameError from './errors/UnexpectedFilenameError';
import Commit, { COMMIT_FIELD_PARENT, COMMIT_FIELD_TREE } from './models/commit';
import Ref from './models/ref';
import {
    ObjectType,
    TreeEntry,
    TreeMap,
} from './types';

const DEFAULT_BRANCH = 'main';

/**
 * Determine if a path should be ignored from a tree
 *
 * @param checkPath the absolute path string to check
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
 * Initialize the ugit repository
 *
 * @param repoPath the root path of the ugit repo
 */
export function init(repoPath: string): void {
    data.init(repoPath);
    data.updateRef(
        repoPath,
        REF_HEAD_NAME,
        new Ref(path.join(HEADS_DIR, DEFAULT_BRANCH), true),
    );
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
            const objectData = fs.readFileSync(entryPath);

            entries.push({
                name: dirEntry.name,
                objectId: data.hashObject(
                    repoPath,
                    objectData,
                    OBJECT_TYPE_BLOB,
                ),
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

    return data.hashObject(repoPath, Buffer.from(tree), OBJECT_TYPE_TREE);
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
    const tree = data.getObject(repoPath, treeObjectId, OBJECT_TYPE_TREE)
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
export function getTree(
    repoPath: string,
    treeObjectId: string,
    basePath = '',
): TreeMap {
    const result: TreeMap = {};

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
            data.getObject(repoPath, tree[filePath], OBJECT_TYPE_BLOB),
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
    let commitData = `${COMMIT_FIELD_TREE} ${rootObjectId}\n`;

    // Write the Parent value
    const { value: HEAD } = data.getRef(repoPath, REF_HEAD_NAME);
    if (HEAD) commitData += `${COMMIT_FIELD_PARENT} ${HEAD}\n`;

    // Complete the merge if one is in progress
    const { value: MERGE_HEAD } = data.getRef(repoPath, REF_MERGE_HEAD_NAME);
    if (MERGE_HEAD) {
        commitData += `${COMMIT_FIELD_PARENT} ${MERGE_HEAD}\n`;
        data.deleteRef(repoPath, REF_MERGE_HEAD_NAME);
    }

    commitData += `\n${message}\n`;

    const commitObjectId = data.hashObject(
        repoPath,
        Buffer.from(commitData),
        OBJECT_TYPE_COMMIT,
    );

    data.updateRef(repoPath, REF_HEAD_NAME, new Ref(commitObjectId));
    return commitObjectId;
}

/**
 * Fetch the metadata of a particular commit
 *
 * @param repoPath path of the repo root
 * @param commitObjectId hash of the commit to read information for
 */
export function getCommit(repoPath: string, commitObjectId: string): Commit {
    const commitLines = data
        .getObject(repoPath, commitObjectId, OBJECT_TYPE_COMMIT)
        .toString()
        .split('\n');
    const parents: string[] = [];
    let tree = '';

    for (let curr = commitLines.shift(); curr; curr = commitLines.shift()) {
        const [key, value] = curr.split(' ', 2);

        switch (key) {
            case COMMIT_FIELD_TREE:
                tree = value;
                break;
            case COMMIT_FIELD_PARENT:
                parents.push(value);
                break;
            default:
                console.log(`Unexpected field in commit: ${key}=${value}`);
        }
    }

    return new Commit(commitObjectId, tree, parents, commitLines.join('\n'));
}

/**
 * Determine if a reference is indeed a branch that exists
 *
 * @param repoPath path of the repo root
 * @param branch the branch name to check for (not including `refs/heads`)
 */
function isBranch(repoPath: string, branch: string): boolean {
    return !!data.getRef(repoPath, path.join(HEADS_DIR, branch)).value;
}

/**
 * Checkout a given commit, updating the workspace to match
 *
 * @param repoPath path of the repo root
 * @param objectId hash of the commit to checkout
 */
export function checkout(repoPath: string, name: string): void {
    const objectId = getObjectId(repoPath, name);
    let headRef: Ref;

    readTree(repoPath, getCommit(repoPath, objectId).tree);

    if (isBranch(repoPath, name)) {
        headRef = new Ref(path.join(HEADS_DIR, name), true);
    } else {
        headRef = new Ref(objectId, false);
    }

    data.updateRef(repoPath, REF_HEAD_NAME, headRef, false);
}

/**
 * Resets HEAD to the specified commit, following symbolic refs, without
 * changing the files in the working directory
 *
 * @param repoPath path of the repo root
 * @param objectId hash of the commit to reset to
 */
export function reset(repoPath: string, objectId: string): void {
    data.updateRef(repoPath, REF_HEAD_NAME, new Ref(objectId, false));
}

/**
 * Create a new tag that points to the specified commit
 *
 * @param repoPath path of the repo root
 * @param name tag name to create
 * @param objectId hash of the commit the tag should point to
 */
export function createTag(repoPath: string, name: string, objectId: string): void {
    data.updateRef(repoPath, path.join(TAGS_DIR, name), new Ref(objectId));
}

/**
 * Create a new branch that points to the specified commit
 *
 * @param repoPath path of the repo root
 * @param name tag name to create
 * @param objectId hash of the commit the tag should point to
 */
export function createBranch(repoPath: string, name: string, objectId: string): void {
    data.updateRef(
        repoPath,
        path.join(HEADS_DIR, name),
        new Ref(objectId),
    );
}

/**
 * Get the Object ID referred to by the given reference
 *
 * @param repoPath path of the repo root
 * @param nameToTry reference to convert to an Object ID
 */
export function getObjectId(repoPath: string, name: string): string {
    // apply alias for 'HEAD'
    const nameToTry = name === REF_HEAD_ALIAS ? REF_HEAD_NAME : name;

    const refsToTry = [
        nameToTry,
        path.join(REFS_DIR, nameToTry),
        path.join(TAGS_DIR, nameToTry),
        path.join(HEADS_DIR, nameToTry),
    ];

    // check if is a known ref
    for (const tryRef of refsToTry) {
        if (data.getRef(repoPath, tryRef, false).value) {
            return data.getRef(repoPath, tryRef).value || ''; // sholdn't be null, but TS doesn't know
        }
    }

    // check if is valid hex string
    if (/^[0-9A-Fa-f]{40}$/.test(nameToTry)) {
        return nameToTry.toLowerCase();
    }

    throw new Error(`Unknown name: ${nameToTry}`);
}

/**
 * Iterate through all the commits in the history of the provided object IDs
 *
 * @param repoPath path of the repo root
 * @param objectIds a set of object IDs to iterate through
 */
export function* iterCommitsAndParents(
    repoPath: string,
    objectIds: Set<string>,
): Generator<string> {
    const oidArray: (string|undefined)[] = Array.from(objectIds);
    const visited = new Set();

    while (oidArray.length) {
        const objectId = oidArray.shift();

        if (objectId && !visited.has(objectId)) {
            visited.add(objectId);
            yield objectId;

            const { parents } = getCommit(repoPath, objectId);
            oidArray.unshift(parents.shift());
            oidArray.push(...parents);
        }
    }
}

/**
 * Return the name of the currently tracked branch, if any
 *
 * @param repoPath path of the repo root
 */
export function getBranchName(repoPath: string): string|null {
    const HEAD = data.getRef(repoPath, REF_HEAD_NAME, false);

    if (!HEAD.symbolic) return null;

    if (!HEAD.value?.startsWith(HEADS_DIR)) {
        throw new Error(`Extected HEAD to be a branch, instead got ${HEAD.value || 'NULL'}`);
    }

    return path.relative(HEADS_DIR, HEAD.value);
}

/**
 * Iterate through all the know branch names
 *
 * @param repoPath path of the repo root
 */
export function* iterBranchNames(repoPath: string): Generator<string> {
    for (
        const [refName]
        of data.iterRefs(repoPath, true, `${HEADS_DIR}${path.sep}`)
    ) {
        yield path.relative(HEADS_DIR, refName);
    }
}

/**
 * Create a tree object from the working tree, but without writing a tree into
 * the object store
 *
 * @param repoPath path of the repo root
 */
export function getWorkingTree(repoPath: string): TreeMap {
    const result: TreeMap = {};

    for (const relPath of data.walkDirectory(repoPath)) {
        const fullPath = path.join(repoPath, relPath);
        if (!isIgnored(repoPath, fullPath)) {
            result[relPath] = data.hashObject(
                repoPath,
                fs.readFileSync(fullPath),
            );
        }
    }

    return result;
}

/**
 * Copy the files resulting from a merge into the working directory
 *
 * @param repoPath path of the repo root
 * @param baseTree object ID of the common ancestor for 3-way merge
 * @param headTree object ID of the current HEAD tree
 * @param otherTree object ID of the tree to merge into HEAD
 */
function readTreeMerged(
    repoPath: string,
    baseTree: string,
    headTree: string,
    otherTree: string,
): void {
    emptyDirectory(repoPath, repoPath);

    const mergedTree = mergeTrees(
        repoPath,
        getTree(repoPath, baseTree),
        getTree(repoPath, headTree),
        getTree(repoPath, otherTree),
    );

    Object.keys(mergedTree).forEach((filePath) => {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, mergedTree[filePath]);
    });
}

/**
 * Merge some other commit into HEAD using 3-way merge or fast-forward
 *
 * @param repoPath path of the repo root
 * @param other the other commit to merge into the current one
 */
export function merge(repoPath: string, other: string): void {
    const HEAD = data.getRef(repoPath, REF_HEAD_NAME).value;
    assert(HEAD);
    const headCommit = getCommit(repoPath, HEAD);

    const mergeBase = getMergeBase(repoPath, other, HEAD);
    assert(mergeBase);
    const baseCommit = getCommit(repoPath, mergeBase);

    const otherCommit = getCommit(repoPath, other);

    console.log();

    // Handle fast-forward merges
    if (mergeBase === HEAD) {
        readTree(repoPath, otherCommit.tree);
        data.updateRef(repoPath, REF_HEAD_NAME, new Ref(other, false));
        console.log('Fast-forward merge, no need to commit');
        return;
    }

    data.updateRef(
        repoPath,
        REF_MERGE_HEAD_NAME,
        new Ref(otherCommit.objectId),
    );

    readTreeMerged(
        repoPath,
        baseCommit.tree,
        headCommit.tree,
        otherCommit.tree,
    );
    console.log('Merged in working tree');
    console.log('Please commit');
}

/**
 * Find the common ancestor of two commits
 *
 * @param repoPath path of the repo root
 * @param objectId1 object ID a commit
 * @param objectId2 object ID a commit
 */
export function getMergeBase(
    repoPath: string,
    objectId1: string,
    objectId2: string,
): string|null {
    const parents1 = Array.from(
        iterCommitsAndParents(repoPath, new Set([objectId1])),
    );

    for (
        const objectId
        of iterCommitsAndParents(repoPath, new Set([objectId2]))
    ) {
        if (parents1.includes(objectId)) return objectId;
    }

    return null;
}
