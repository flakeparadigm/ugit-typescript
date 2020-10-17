import { Arguments, Argv, CommandModule } from 'yargs';
import { readTree } from '../base';

type ReadTreeArgs = {
    tree: string,
};

export default class ReadTreeCommand implements CommandModule<unknown, ReadTreeArgs> {
    public command = 'read-tree <tree>';

    public description = 'read an entire directory structure from the object store';

    public builder(yargs: Argv): Argv<ReadTreeArgs> {
        return yargs
            .positional('tree', {
                description: 'hash of the tree to read',
                type: 'string',
            }) as Argv<ReadTreeArgs>;
    }

    public handler(args: Arguments<ReadTreeArgs>): void {
        readTree(process.cwd(), args.tree);
    }
}
