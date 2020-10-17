import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import UnexpectedTypeError from './errors/UnexpectedTypeError';

export const GIT_DIR = '.ugit';
const OBJECTS_DIR = 'objects';
export const REFS_DIR = 'refs';
export const TAGS_DIR = path.join(REFS_DIR, 'tags');
export const HEADS_DIR = path.join(REFS_DIR, 'heads');

export const OBJECT_TYPE_BLOB = 'blob';
export const OBJECT_TYPE_TREE = 'tree';
export const OBJECT_TYPE_COMMIT = 'commit';
export type ObjectType = 'blob' | 'tree' | 'commit';

export const REF_HEAD = 'HEAD';

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
 * Get the Object ID of the commit pointed to by the reference
 *
 * @param repoPath path of the repo root
 * @param ref the reference to get the ID of
 */
export function getRef(repoPath: string, ref: string): string|null {
    const refPath = path.join(repoPath, GIT_DIR, ref);

    try {
        return fs.readFileSync(refPath).toString().trim();
    } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (err.code !== 'ENOENT') throw (err); // fail gracefully for nonexistent ref
    }

    return null;
}

/**
 * Set the Object ID of the commit pointed to by the reference
 *
 * @param repoPath path of the repo root
 * @param ref the reference to update
 * @param objectId object ID to save as `HEAD`
 */
export function updateRef(repoPath: string, ref: string, objectId: string): void {
    const refPath = path.join(repoPath, GIT_DIR, ref);

    fs.mkdirSync(path.dirname(refPath), { recursive: true });
    fs.writeFileSync(refPath, Buffer.from(objectId));
}
