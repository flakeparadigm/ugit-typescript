import { Arguments, Argv, CommandModule } from 'yargs';
import { createBranch } from '../base';
import { REF_HEAD_ALIAS } from '../const';

type BranchArgs = {
    branchname: string,
    object: string,
};

export default class BranchCommand implements CommandModule<unknown, BranchArgs> {
    public command = 'branch <branchname> [<object>]';

    public description = 'create a branch from the specified commit object';

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
        createBranch(process.cwd(), args.branchname, args.object);
    }
}
