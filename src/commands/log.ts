import { spawn } from 'child_process';
import { Console } from 'console';
import { Arguments, Argv, CommandModule } from 'yargs';
import { getCommit, iterCommitsAndParents } from '../base';
import { REF_HEAD_ALIAS } from '../const';
import { iterRefs } from '../data';
import { RefMap } from '../types';

type LogArgs = {
    object: string,
};

export default class LogCommand implements CommandModule<unknown, LogArgs> {
    public command = 'log [<object>]';

    public description = 'show commit logs';

    public builder(yargs: Argv): Argv<LogArgs> {
        return yargs
            .positional('object', {
                default: REF_HEAD_ALIAS,
                description: 'ref or hash of object to start the log from',
                type: 'string',
            }) as Argv<LogArgs>;
    }

    public handler(args: Arguments<LogArgs>): void {
        const repoPath = process.cwd();
        const refs: RefMap = {};
        const objectIds = new Set([args.object]);
        const less = spawn('less', ['-r'], { stdio: ['pipe', process.stdout, process.stderr] });
        const lessConsole = new Console(less.stdin);

        // make a map of objectId -> refName[]
        for (const [refName, ref] of iterRefs(repoPath)) {
            if (ref.value) {
                if (!refs[ref.value]) refs[ref.value] = [];
                refs[ref.value].push(refName);
            }
        }

        // print out all the commits from the starting point
        for (const objectId of iterCommitsAndParents(repoPath, objectIds)) {
            const commit = getCommit(repoPath, objectId);

            commit.print(lessConsole, refs);
            lessConsole.log('');
        }

        less.stdin.end();
    }
}
