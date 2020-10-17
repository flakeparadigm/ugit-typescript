import { CommandModule } from 'yargs';
import { writeTree } from '../base';

export default class WriteTreeCommand implements CommandModule {
    public command = 'write-tree';

    public description = 'write the directory structure to the object store';

    public builder = {};

    public handler(): void {
        const objectId = writeTree(process.cwd(), process.cwd());

        console.log(`root ${objectId}`);
    }
}
