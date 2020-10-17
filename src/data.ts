import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import UnexpectedTypeError from './errors/UnexpectedTypeError';

export const GIT_DIR = '.ugit';
const OBJECTS_DIR = 'objects';
const HEAD_FILE = 'HEAD';

export const OBJECT_TYPE_BLOB = 'blob';
export const OBJECT_TYPE_TREE = 'tree';
export const OBJECT_TYPE_COMMIT = 'commit';
export type ObjectType = 'blob' | 'tree' | 'commit';

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
 * Get the Object ID of the current `HEAD` commit
 *
 * @param repoPath path of the repo root
 */
export function getHead(repoPath: string): string|null {
    const headPath = path.join(repoPath, GIT_DIR, HEAD_FILE);

    try {
        return fs.readFileSync(headPath).toString().trim();
    } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (err.code !== 'ENOENT') throw (err); // allow nonexistent HEAD file
    }

    return null;
}

/**
 * Set the Object ID for `HEAD`
 *
 * @param repoPath path of the repo root
 * @param objectId object ID to save as `HEAD`
 */
export function setHead(repoPath: string, objectId: string): void {
    const headPath = path.join(repoPath, GIT_DIR, HEAD_FILE);

    fs.writeFileSync(headPath, Buffer.from(objectId));
}
