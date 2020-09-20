import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import UnexpectedTypeError from './errors/UnexpectedTypeError';

const GIT_DIR = '.ugit';
const OBJECTS_DIR = 'objects';

export type ObjectType = 'blob';
export const OBJECT_TYPE_BLOB = 'blob';

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
): void {
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
        throw new UnexpectedTypeError('Loaded object does not match expected type.');
    }

    return data;
}
