import fs from 'fs';
import path from 'path';
import { Arguments, Argv, CommandModule } from 'yargs';
import { hashObject } from '../data';

type HashObjectArgs = {
    file: string
};

export default class implements CommandModule<unknown, HashObjectArgs> {
    public command = 'hash-object <file>';

    public description = 'add a file to the object store';

    public builder(yargs: Argv): Argv<HashObjectArgs> {
        return yargs
            .positional('file', {
                describe: 'path of the file to add to the object store',
                type: 'string',
            }) as Argv<HashObjectArgs>;
    }

    public handler(args: Arguments<HashObjectArgs>): void {
        const repoDir = process.cwd();
        const object = fs.readFileSync(path.join(repoDir, args.file));

        hashObject(repoDir, object);
    }
}
