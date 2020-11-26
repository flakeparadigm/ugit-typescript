import { Arguments, Argv, CommandModule } from 'yargs';
import { reset } from '../base';

type ResetArgs = {
    commit: string,
};

export default class ResetCommand implements CommandModule<unknown, ResetArgs> {
    public command = 'reset <commit>';

    public description = 'move the current branch to the given commit';

    public builder(yargs: Argv): Argv<ResetArgs> {
        return yargs
            .positional('commit', {
                description: 'commit to move the branch to',
                type: 'string',
            }) as Argv<ResetArgs>;
    }

    public handler(args: Arguments<ResetArgs>): void {
        reset(process.cwd(), args.commit);
    }
}
