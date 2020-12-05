import { spawn } from 'child_process';
import { Console } from 'console';
import { Arguments, Argv, CommandModule } from 'yargs';
import { getCommit, getTree } from '../base';
import { REF_HEAD_ALIAS } from '../const';
import { diffTrees } from '../diff';
import ReadableBufferArray from '../util/readableBuffer';

type ShowArgs = {
    object: string,
};

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
        const repoPath = process.cwd();
        const less = spawn('less', ['-r'], { stdio: ['pipe', process.stdout, process.stderr] });

        const commit = getCommit(repoPath, args.object);
        const parentTree = commit.parents[0]
            ? getCommit(repoPath, commit.parents[0]).tree
            : null;

        const readableDiff = new ReadableBufferArray(diffTrees(
            repoPath,
            parentTree ? getTree(repoPath, parentTree) : {},
            getTree(repoPath, commit.tree),
        ), {});

        commit.print(new Console(less.stdin), {});
        readableDiff.pipe(less.stdin);
    }
}
