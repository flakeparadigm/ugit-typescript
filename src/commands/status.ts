import { CommandModule } from 'yargs';
import {
    getBranchName,
    getCommit,
    getObjectId,
    getTree,
    getWorkingTree,
} from '../base';
import { REF_HEAD_ALIAS } from '../const';
import { iterChangedFiles } from '../diff';

export default class StatusCommand implements CommandModule {
    public command = 'status';

    public description = 'show what the current branch is';

    public builder = {};

    public handler(): void {
        const repoPath = process.cwd();
        const branch = getBranchName(repoPath);
        const HEAD = getObjectId(repoPath, REF_HEAD_ALIAS);

        if (branch) {
            console.log(`On branch ${branch}`);
        } else {
            console.log(`HEAD detached at ${HEAD.substring(0, 10)}`);
        }

        console.log('\nChanges to be committed:');
        const headTree = getCommit(repoPath, HEAD).tree;

        for (
            const [path, action]
            of iterChangedFiles(
                repoPath,
                getTree(repoPath, headTree),
                getWorkingTree(repoPath),
            )
        ) {
            const formattedAction = `${action}:`.padEnd(12);
            console.log(`${formattedAction}${path}`);
        }
    }
}
