import fs from 'fs';
import { spawnSync } from 'child_process';
import { TreeMap } from './types';
import DefaultDict from './models/defaultDict';
import { getObject } from './data';
import TempFile from './util/tempFile';
import { OBJECT_TYPE_BLOB } from './const';

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
 * @param objPath
 * @param fromOid
 * @param toOid
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

export default diffTrees;
