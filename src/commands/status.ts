import { CommandModule } from 'yargs';
import { getBranchName, getObjectId } from '../base';
import { REF_HEAD_ALIAS } from '../const';

export default class StatusCommand implements CommandModule {
    public command = 'status';

    public description = 'show what the current branch is';

    public builder = {};

    public handler(): void {
        const repoPath = process.cwd();
        const branch = getBranchName(repoPath);

        if (branch) {
            console.log(`On branch ${branch}`);
        } else {
            const HEAD = getObjectId(repoPath, REF_HEAD_ALIAS).substring(0, 10);
            console.log(`HEAD detached at ${HEAD}`);
        }
    }
}
