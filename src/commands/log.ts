import { Arguments, Argv, CommandModule } from 'yargs';
import { getCommit, iterCommitsAndParents } from '../base';

type LogArgs = {
    object: string,
};

export default class LogCommand implements CommandModule<unknown, LogArgs> {
    public command = 'log [<object>]';

    public description = 'show commit logs';

    public builder(yargs: Argv): Argv<LogArgs> {
        return yargs
            .positional('object', {
                default: '@',
                description: 'ref or hash of object to start the log from',
                type: 'string',
            }) as Argv<LogArgs>;
    }

    public handler(args: Arguments<LogArgs>): void {
        const repoPath = process.cwd();
        const objectIds = new Set([args.object]);

        for (const objectId of iterCommitsAndParents(repoPath, objectIds)) {
            const commit = getCommit(repoPath, objectId);

            console.log(`commit ${commit.objectId}`);
            console.group();
            console.log(commit.message);
            console.groupEnd();
            console.log('');
        }
    }
}
