export type ObjectType = 'blob' | 'tree' | 'commit';

export type TreeEntry = {
    name: string,
    objectId: string,
    type: ObjectType,
};

export type TreeMap = { [path: string]: string; };
