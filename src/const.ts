import path from 'path';

export const GIT_DIR = '.ugit';
export const REFS_DIR = 'refs';
export const TAGS_DIR = path.join(REFS_DIR, 'tags');
export const HEADS_DIR = path.join(REFS_DIR, 'heads');

export const OBJECT_TYPE_BLOB = 'blob';
export const OBJECT_TYPE_TREE = 'tree';
export const OBJECT_TYPE_COMMIT = 'commit';

export const REF_HEAD_NAME = 'HEAD';
export const REF_HEAD_ALIAS = '@';
export const REF_MERGE_HEAD_NAME = 'MERGE_HEAD';
export const REF_BASE_NAME = 'BASE';

export const ACTION_MODIFIED = 'modified';
export const ACTION_NEWFILE = 'new file';
export const ACTION_DELETED = 'deleted';
