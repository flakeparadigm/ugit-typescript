import { Arguments, Argv, CommandModule } from 'yargs';
import { merge } from '../base';

type MergeArgs = {
    commit: string,
};

export default class MergeCommand implements CommandModule<unknown, MergeArgs> {
    public command = 'merge <commit>';

    public description = 'move the current branch to the given commit';

    public builder(yargs: Argv): Argv<MergeArgs> {
        return yargs
            .positional('commit', {
                description: 'commit to merge into the current HEAD commit',
                type: 'string',
            }) as Argv<MergeArgs>;
    }

    public handler(args: Arguments<MergeArgs>): void {
        merge(process.cwd(), args.commit);
    }
}
