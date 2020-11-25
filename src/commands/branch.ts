import { Arguments, Argv, CommandModule } from 'yargs';
import { createBranch, getBranchName, iterBranchNames } from '../base';
import { REF_HEAD_ALIAS } from '../const';

type BranchArgs = {
    branchname: string,
    object: string,
};

export default class BranchCommand implements CommandModule<unknown, BranchArgs> {
    public command = 'branch [<branchname> [<object>]]';

    public description = 'list branches or create a new branch if specified';

    public builder(yargs: Argv): Argv<BranchArgs> {
        return yargs
            .positional('branchname', {
                description: 'name of the branch to create',
                type: 'string',
            })
            .positional('object', {
                default: REF_HEAD_ALIAS,
                description: 'ref or hash of commit to use as head of branch',
                type: 'string',
            }) as Argv<BranchArgs>;
    }

    public handler(args: Arguments<BranchArgs>): void {
        const repoPath = process.cwd();

        if (!args.branchname) {
            const current = getBranchName(repoPath);
            for (const branch of iterBranchNames(repoPath)) {
                console.log(`${branch === current ? '*' : ' '} ${branch}`);
            }
        } else {
            createBranch(repoPath, args.branchname, args.object);
        }
    }
}
