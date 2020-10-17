import { Arguments, Argv, CommandModule } from 'yargs';
import { getCommit } from '../base';

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
        let objectId: string|null = args.object;

        while (objectId) {
            const commit = getCommit(process.cwd(), objectId);

            console.log(`commit ${objectId}`);
            console.group();
            console.log(commit.message);
            console.groupEnd();
            console.log('');

            objectId = commit.parent;
        }
    }
}
