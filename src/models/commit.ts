import { REF_HEAD_NAME, TAGS_DIR, HEADS_DIR } from '../const';
import { RefMap } from '../types';
import colors from '../util/colors';

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

    public print(cons: Console, refs: RefMap = {}): void {
        let refStrs = refs[this.objectId];
        if (refStrs) {
            refStrs = refStrs.map((ref) => {
                let color = colors.Bright;
                let cleanedRef = ref;

                if (ref.startsWith(REF_HEAD_NAME)) {
                    color += colors.fg.Cyan;
                } else if (ref.startsWith(HEADS_DIR)) {
                    color += colors.fg.Green;
                    cleanedRef = ref.substring(HEADS_DIR.length + 1);
                } else if (ref.startsWith(TAGS_DIR)) {
                    color += colors.fg.Yellow;
                    cleanedRef = `tag: ${ref.substring(TAGS_DIR.length + 1)}`;
                } else {
                    color = colors.Reset;
                }

                return color + cleanedRef + colors.Reset + colors.fg.Yellow;
            });
        }

        const refStr = refStrs ? ` (${refStrs.join(', ')})` : '';

        cons.log(`${colors.fg.Yellow}commit ${this.objectId}${refStr}${colors.Reset}`);
        cons.group();
        cons.log(this.message);
        cons.groupEnd();
    }
}
