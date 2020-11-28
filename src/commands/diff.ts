import { spawn } from 'child_process';
import { Arguments, Argv, CommandModule } from 'yargs';
import { getCommit, getTree, getWorkingTree } from '../base';
import { REF_HEAD_ALIAS } from '../const';
import { diffTrees } from '../diff';
import ReadableBufferArray from '../util/readableBuffer';

type DiffArgs = {
    commit: string,
};

export default class DiffCommand implements CommandModule<unknown, DiffArgs> {
    public command = 'diff [<commit>]';

    public description = 'diff the details of a commit with the working directory';

    public builder(yargs: Argv): Argv<DiffArgs> {
        return yargs
            .positional('commit', {
                default: REF_HEAD_ALIAS,
                description: 'ref or hash of commit to compare the working directory to',
                type: 'string',
            }) as Argv<DiffArgs>;
    }

    public handler(args: Arguments<DiffArgs>): void {
        const repoPath = process.cwd();
        const less = spawn('less', ['-r'], { stdio: ['pipe', process.stdout, process.stderr] });

        const { tree } = getCommit(repoPath, args.commit);
        const readableDiff = new ReadableBufferArray(diffTrees(
            repoPath,
            getTree(repoPath, tree),
            getWorkingTree(repoPath),
        ), {});

        readableDiff.pipe(less.stdin);
    }
}
