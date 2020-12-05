import { Arguments, Argv, CommandModule } from 'yargs';
import coerceOid from '../util/coerceOid';
import { getMergeBase } from '../base';

type MergeBaseArgs = {
    commit1: string,
    commit2: string,
};

export default class MergeBaseCommand implements CommandModule<unknown, MergeBaseArgs> {
    public command = 'merge-base <commit1> <commit2>';

    public description = 'find the common ancestor between the two commits';

    public builder(yargs: Argv): Argv<MergeBaseArgs> {
        return yargs
            .positional('commit1', {
                type: 'string',
                coerce: coerceOid,
            })
            .positional('commit2', {
                type: 'string',
                coerce: coerceOid,
            }) as Argv<MergeBaseArgs>;
    }

    public handler(args: Arguments<MergeBaseArgs>): void {
        console.log(
            getMergeBase(process.cwd(), args.commit1, args.commit2),
        );
    }
}
