import { CommandModule } from 'yargs';
import { init } from '../base';

export default class InitCommand implements CommandModule {
    public command = 'init';

    public description = 'create an empty uGit repository';

    public builder = {};

    public handler(): void {
        init(process.cwd());
    }
}
