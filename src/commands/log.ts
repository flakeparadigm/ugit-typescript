import { Arguments, Argv, CommandModule } from 'yargs';
import { getCommit } from '../base';
import { getHead } from '../data';

type LogArgs = {
    object: string,
};

export default class LogCommand implements CommandModule<unknown, LogArgs> {
    public command = 'log [object]';

    public description = 'show commit logs';

    public builder(yargs: Argv): Argv<LogArgs> {
        return yargs
            .positional('object', {
                description: 'hash of object to start the log from',
                type: 'string',
            }) as Argv<LogArgs>;
    }

    public handler(args: Arguments<LogArgs>): void {
        const repoPath = process.cwd();
        let objectId = args.object || getHead(repoPath);

        while (objectId) {
            const commit = getCommit(repoPath, objectId);

            console.log(`commit ${objectId}`);
            console.group();
            console.log(commit.message);
            console.groupEnd();
            console.log('');

            objectId = commit.parent;
        }
    }
}
