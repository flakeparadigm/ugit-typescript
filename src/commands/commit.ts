import { Arguments, Argv, CommandModule } from 'yargs';
import { commit } from '../base';

type CommitArgs = {
    message: string,
};

export default class CommitCommand implements CommandModule<unknown, CommitArgs> {
    public command = 'commit [-m <msg>]';

    public description = 'record changes to the repository';

    public builder(yargs: Argv): Argv<CommitArgs> {
        return yargs
            .option('message', {
                alias: 'm',
                demandOption: true,
                description: 'use the given <msg> as the commit message.',
                type: 'string',
            }) as Argv<CommitArgs>;
    }

    public handler(args: Arguments<CommitArgs>): void {
        const commitObjectId = commit(process.cwd(), args.message);

        console.log(commitObjectId);
    }
}
