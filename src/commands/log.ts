import { CommandModule } from 'yargs';
import { getCommit } from '../base';
import { getHead } from '../data';

export default class LogCommand implements CommandModule {
    public command = 'log';

    public description = 'show commit logs';

    public builder = {};

    public handler(): void {
        const repoPath = process.cwd();
        let objectId = getHead(repoPath);

        while (objectId) {
            const commit = getCommit(repoPath, objectId);

            console.log(`commit ${objectId}`);
            console.group();
            console.log(commit.message);
            console.groupEnd();
            console.log('');

            objectId = commit.parent;
        }
    }
}
