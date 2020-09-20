import { CommandModule } from 'yargs';
import { init } from '../data';

export default class implements CommandModule {
    public command = 'init';

    public description = 'init a ugit repo';

    public builder = {};

    public handler(): void {
        init(process.cwd());
    }
}
