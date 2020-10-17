import { Arguments, Argv, CommandModule } from 'yargs';
import {
    getObject,
    ObjectType,
    OBJECT_TYPE_BLOB,
    OBJECT_TYPE_COMMIT,
    OBJECT_TYPE_TREE,
} from '../data';

const objectTypes: ReadonlyArray<ObjectType> = [
    OBJECT_TYPE_BLOB,
    OBJECT_TYPE_COMMIT,
    OBJECT_TYPE_TREE,
];

type CatFileArgs = {
    object: string,
    type: ObjectType | null,
};

export default class implements CommandModule<unknown, CatFileArgs> {
    public command = 'cat-file <object> [type]';

    public description = 'print an object from the object store';

    public builder(yargs: Argv): Argv<CatFileArgs> {
        return yargs
            .positional('object', {
                description: 'hash of the object to print',
                type: 'string',
            })
            .positional('type', {
                description: 'validate the retreived object to be this type',
                choices: objectTypes,
            }) as Argv<CatFileArgs>;
    }

    public handler(args: Arguments<CatFileArgs>): void {
        const repoDir = process.cwd();
        const data = getObject(repoDir, args.object, args.type);

        process.stdout.write(data);
    }
}
