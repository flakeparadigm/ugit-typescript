export const COMMIT_FIELD_TREE = 'tree';
export const COMMIT_FIELD_PARENT = 'parent';

export default class Commit {
    public tree: string;

    public parent: string|null;

    public message: string;

    constructor(tree: string, parent: string|null, message: string) {
        this.tree = tree;
        this.parent = parent;
        this.message = message;
    }
}
