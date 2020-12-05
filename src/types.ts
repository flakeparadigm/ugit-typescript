export type ObjectType = 'blob' | 'tree' | 'commit';
export type Action = 'modified' | 'new file' | 'deleted';

export type TreeEntry = {
    name: string,
    objectId: string,
    type: ObjectType,
};

export type TreeMap = { [path: string]: string; };
export type TreeDataMap = { [path: string]: Buffer; };
export type RefMap = { [oid: string]: string[] };
