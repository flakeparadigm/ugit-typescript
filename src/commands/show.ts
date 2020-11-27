import { Arguments, Argv, CommandModule } from 'yargs';
import { getCommit } from '../base';
import { REF_HEAD_ALIAS } from '../const';
import Commit from '../models/commit';

type ShowArgs = {
    object: string,
};

export type RefMap = { [oid: string]: string[] };

export function printCommit(
    objectId: string,
    commit: Commit,
    refs: RefMap = {},
): void {
    const refStr = refs[objectId]
        ? ` (${refs[objectId].join(', ')})`
        : '';

    console.log(`commit ${commit.objectId}${refStr}`);
    console.group();
    console.log(commit.message);
    console.groupEnd();
}

export default class ShowCommand implements CommandModule<unknown, ShowArgs> {
    public command = 'show [<object>]';

    public description = 'show the details of an object or commit';

    public builder(yargs: Argv): Argv<ShowArgs> {
        return yargs
            .positional('object', {
                default: REF_HEAD_ALIAS,
                description: 'ref or hash of object or commit to start the log from',
                type: 'string',
            }) as Argv<ShowArgs>;
    }

    public handler(args: Arguments<ShowArgs>): void {
        if (!args.object) return;

        const commit = getCommit(process.cwd(), args.object);
        printCommit(args.object, commit);
    }
}
