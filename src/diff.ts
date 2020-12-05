import fs from 'fs';
import { spawnSync } from 'child_process';
import { assert } from 'console';
import {
    Action, TreeDataMap, TreeMap,
} from './types';
import DefaultDict from './models/defaultDict';
import { getObject } from './data';
import TempFile from './util/tempFile';
import {
    ACTION_DELETED,
    ACTION_MODIFIED,
    ACTION_NEWFILE,
    OBJECT_TYPE_BLOB,
    REF_HEAD_NAME,
    REF_BASE_NAME,
    REF_MERGE_HEAD_NAME,
} from './const';

/**
 * Iterate through multiple trees, yielding a path and an array of the object
 * IDs for that path in each of the passed trees.
 *
 * @param trees all the trees to compare, passed as a separate parameter
 */
function* compareTrees(
    ...trees: TreeMap[]
): Generator<[string, (string|null)[]]> {
    const entries = new DefaultDict<(null|string)[]>(
        () => trees.map(() => null));

    trees.forEach((tree, i) => {
        for (const [objPath, oid] of Object.entries(tree)) {
            entries[objPath][i] = oid;
        }
    });

    for (const entry of Object.entries(entries)) {
        yield entry;
    }
}

/**
 * Copies a blob object from the object store into a temporary file, closing the
 * file after writing.
 *
 * @param repoPath path of the repo root
 * @param objectId ID of the object to copy
 */
function copyObjectToTemp(
    repoPath: string,
    objectId: string|null,
): TempFile {
    const tempFile = new TempFile();

    if (objectId) {
        fs.writeSync(
            tempFile.getFd(),
            getObject(repoPath, objectId, OBJECT_TYPE_BLOB),
        );
    }
    tempFile.close();

    return tempFile;
}

/**
 *
 * @param repoPath path of the repo root
 * @param objPath the path of the object relative to the repo root
 * @param fromOid the old object to compare to
 * @param toOid the new object to compare
 */
function diffBlobs(
    repoPath: string,
    objPath: string,
    fromOid: string|null,
    toOid: string|null,
): Buffer {
    const fromFile = copyObjectToTemp(repoPath, fromOid);
    const toFile = copyObjectToTemp(repoPath, toOid);

    const diff = spawnSync('diff', [
        '--unified', '--show-c-function',
        '--label', `a/${objPath}`, fromFile.filePath,
        '--label', `b/${objPath}`, toFile.filePath,
    ], { encoding: 'buffer' });

    return diff.stdout;
}

/**
 * Create a file-level diff of two trees.
 *
 * @param repoPath path of the repo root
 * @param fromTree the old tree to start from
 * @param toTree the new tree with the changes to inspect
 */
export function diffTrees(
    repoPath: string,
    fromTree: TreeMap,
    toTree: TreeMap,
): Buffer[] {
    const output: Buffer[] = [];

    for (const [objPath, [fromOid, toOid]] of compareTrees(fromTree, toTree)) {
        if (fromOid !== toOid) {
            output.push(diffBlobs(repoPath, objPath, fromOid, toOid));
        }
    }

    return output;
}

/**
 * Iterate through all of the files in the repo that have changed
 *
 * @param repoPath path of the repo root
 * @param fromTree the old tree to start from
 * @param toTree the new tree with the changes to inspect
 */
export function* iterChangedFiles(
    repoPath: string,
    fromTree: TreeMap,
    toTree: TreeMap,
): Generator<[string, Action]> {
    for (const [path, [fromOid, toOid]] of compareTrees(fromTree, toTree)) {
        if (fromOid !== toOid) {
            let action: Action = ACTION_MODIFIED;

            if (!fromOid) {
                action = ACTION_NEWFILE;
            } else if (!toOid) {
                action = ACTION_DELETED;
            }

            yield [path, action];
        }
    }
}

/**
 * Perform a 3-way merge of the passed tree
 *
 * @param repoPath path of the repo root
 * @param baseTree the tree to serve as the common ancestor
 * @param fromTree the HEAD tree
 * @param toTree the MERGE_HEAD tree
 */
export function mergeTrees(
    repoPath: string,
    baseTree: TreeMap,
    fromTree: TreeMap,
    toTree: TreeMap,
): TreeDataMap {
    const tree: TreeDataMap = {};

    for (
        const [objPath, [baseOid, fromOid, toOid]]
        of compareTrees(baseTree, fromTree, toTree)
    ) {
        tree[objPath] = mergeBlobs(repoPath, baseOid, fromOid, toOid);
    }

    return tree;
}

/**
 * Perform a 3-way merge of 3 different blobs in the object store
 *
 * @param repoPath path of the repo root
 * @param baseOid OID for the common ancestor
 * @param fromOid OID of the HEAD version of the object
 * @param toOid OID of the MERGE_HEAD version of the object
 */
function mergeBlobs(
    repoPath: string,
    baseOid: string | null,
    fromOid: string | null,
    toOid: string | null,
): Buffer {
    const baseFile = copyObjectToTemp(repoPath, baseOid);
    const fromFile = copyObjectToTemp(repoPath, fromOid);
    const toFile = copyObjectToTemp(repoPath, toOid);

    const diff = spawnSync('diff3', [
        '-m',
        '-L', REF_HEAD_NAME, fromFile.filePath,
        '-L', REF_BASE_NAME, baseFile.filePath,
        '-L', REF_MERGE_HEAD_NAME, toFile.filePath,
    ], { encoding: 'buffer' });

    assert(([0, 1] as (number|null)[]).includes(diff.status));

    return diff.stdout;
}
