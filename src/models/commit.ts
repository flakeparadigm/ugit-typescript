export const COMMIT_FIELD_TREE = 'tree';
export const COMMIT_FIELD_PARENT = 'parent';

export default class Commit {
    public readonly objectId: string;

    public readonly tree: string;

    public readonly parent: string|null;

    public readonly message: string;

    constructor(
        objectId: string,
        tree: string,
        parent: string|null,
        message: string,
    ) {
        this.objectId = objectId;
        this.tree = tree;
        this.parent = parent;
        this.message = message;
    }
}
