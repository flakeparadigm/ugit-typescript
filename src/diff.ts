import { TreeMap } from './types';
import DefaultDict from './models/defaultDict';

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
        for (const [path, oid] of Object.entries(tree)) {
            entries[path][i] = oid;
        }
    });

    for (const entry of Object.entries(entries)) {
        yield entry;
    }
}

/**
 * Create a file-level diff of two trees.
 *
 * @param fromTree the old tree to start from
 * @param toTree the new tree with the changes to inspect
 */
export function diffTrees(fromTree: TreeMap, toTree: TreeMap): string {
    let output = '';

    for (const [path, [fromOid, toOid]] of compareTrees(fromTree, toTree)) {
        if (fromOid !== toOid) output += `changed: ${path}\n`;
    }

    return output;
}

export default diffTrees;
