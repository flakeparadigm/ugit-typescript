import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import UnexpectedTypeError from './errors/UnexpectedTypeError';
import Ref from './models/ref';

export const GIT_DIR = '.ugit';
const OBJECTS_DIR = 'objects';
export const REFS_DIR = 'refs';
export const TAGS_DIR = path.join(REFS_DIR, 'tags');
export const HEADS_DIR = path.join(REFS_DIR, 'heads');

export const OBJECT_TYPE_BLOB = 'blob';
export const OBJECT_TYPE_TREE = 'tree';
export const OBJECT_TYPE_COMMIT = 'commit';
export type ObjectType = 'blob' | 'tree' | 'commit';

export const REF_HEAD_NAME = 'HEAD';
const SYM_REF_HEADER = 'ref:';

/**
 * Initialize the ugit repository
 *
 * @param repoPath the root path of the ugit repo
 */
export function init(repoPath: string): void {
    const repoGitDir = path.join(repoPath, GIT_DIR);
    const repoObjectsDir = path.join(repoGitDir, OBJECTS_DIR);

    fs.mkdirSync(repoGitDir);
    fs.mkdirSync(repoObjectsDir);
}

/**
 * Save a file into the object store, file named by the hash of its contents
 *
 * @param repoPath the root path of the ugit repo
 * @param object a stream to read the file from
 * @param type the type of the object to store, see ObjectType enum
 */
export function hashObject(
    repoPath: string,
    data: Buffer,
    type: ObjectType = OBJECT_TYPE_BLOB,
): string {
    const repoObjectsDir = path.join(repoPath, GIT_DIR, OBJECTS_DIR);
    const hash = crypto.createHash('sha1');
    const object = Buffer.concat([
        Buffer.from(`${type}\0`),
        data,
    ]);

    hash.setEncoding('hex');
    hash.update(object);

    const objectId = hash.digest('hex').toString();
    const objectPath = path.join(repoObjectsDir, objectId);

    fs.writeFileSync(objectPath, object);
    return objectId;
}

/**
 * Return an object that is saved into the object store
 *
 * @param repoPath the root path of the ugit repo
 * @param objectId the ID of the object to fetch
 */
export function getObject(
    repoPath: string,
    objectId: string,
    expectedType: ObjectType | null = null,
): Buffer {
    const objectPath = path.join(repoPath, GIT_DIR, OBJECTS_DIR, objectId);
    const object = fs.readFileSync(objectPath);

    const firstNull = object.indexOf('\0');
    const type = object.slice(0, firstNull).toString() as ObjectType;
    const data = object.slice(firstNull + 1);

    if (expectedType && (type !== expectedType)) {
        throw new UnexpectedTypeError(
            `Loaded object's type (${type}) does not match expected type (${expectedType}).`,
        );
    }

    return data;
}

/**
 * Internal getRef function which handles both getting the lowest level ref
 * string, as well as the actual reference object
 *
 * @param repoPath path of the repo root
 * @param refStr the reference to get the information for
 * @param deref should symbolic references be completely dereferenced
 * @throws UnknownRefError when the requested references cannot be found
 */
function getRefInternal(
    repoPath: string,
    refStr: string,
    deref = true,
): [string, Ref] {
    const refPath = path.join(repoPath, GIT_DIR, refStr);
    let value: string|null;
    let symbolic = false;

    try {
        value = fs.readFileSync(refPath).toString().trim();
        symbolic = value.startsWith(SYM_REF_HEADER);

        if (symbolic) {
            value = value.split(':').slice(1).join(':').trim();
            if (deref) return getRefInternal(repoPath, value, deref);
        }
    } catch (err) {
        // Covert nonexistent file error to a custom type.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (err.code !== 'ENOENT') throw (err);
        value = null;
    }

    return [refStr, new Ref(value, symbolic)];
}

/**
 * Get the Object ID of the commit pointed to by the reference
 *
 * @param repoPath path of the repo root
 * @param refStr the reference to get the ID of
 * @param deref should symbolic references be completely dereferenced
 * @throws UnknownRefError when the requested references cannot be found
 */
export function getRef(repoPath: string, refStr: string, deref = true): Ref {
    return getRefInternal(repoPath, refStr, deref)[1];
}

/**
 * Update where a reference points to, creating it if it doesn't exist
 *
 * @param repoPath path of the repo root
 * @param ref the reference to update
 * @param objectId object ID to save as `HEAD`
 * @param deref should symbolic references be completely dereferenced
 */
export function updateRef(
    repoPath: string,
    refStr: string,
    destRef: Ref,
    deref = true,
): void {
    const ref = getRefInternal(repoPath, refStr, deref)[0] || refStr;
    const refPath = path.join(repoPath, GIT_DIR, ref);

    // add header to symbolic reference values before storing
    let { value: newValue } = destRef;
    if (!newValue) throw new Error('Unexpected empty ref value');
    if (destRef.symbolic) newValue = `${SYM_REF_HEADER} ${newValue}`;

    fs.mkdirSync(path.dirname(refPath), { recursive: true });
    fs.writeFileSync(refPath, Buffer.from(newValue));
}

/**
 * Iterate through all of the files in the given directory recursively,
 * yielding file paths relative to the given output base.
 *
 * @param dirPath starting directory
 * @param outputBase base path for all filenames to be relative to
 */
function* walkDirectory(dirPath: string, outputBase = ''): Generator<string> {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            // recurse into directories
            yield* walkDirectory(
                path.join(dirPath, entry.name),
                path.join(outputBase, entry.name),
            );
        } else {
            yield path.join(outputBase, entry.name);
        }
    }
}

/**
 * Iterate through all the refs stored by ugit
 *
 * @param repoPath path of the repo root
 * @param deref should symbolic references be completely dereferenced
 */
export function* iterRefs(
    repoPath: string,
    deref = true,
): Generator<[string, Ref]> {
    // always include HEAD
    yield [REF_HEAD_NAME, getRef(repoPath, REF_HEAD_NAME, deref)];

    for (
        const refName
        of walkDirectory(path.join(repoPath, GIT_DIR, REFS_DIR), REFS_DIR)
    ) {
        yield [refName, getRef(repoPath, refName, deref)];
    }
}
