import { spawn } from 'child_process';
import { CommandModule } from 'yargs';
import { getCommit, getCommitsAndParents } from '../base';
import { iterRefs } from '../data';

export default class KCommand implements CommandModule {
    public command = 'k';

    public description = 'visualization tool for ugit';

    public builder = {};

    public handler(): void {
        const repoPath = process.cwd();
        const objectIds: Set<string> = new Set();
        let dot = 'digraph commits {\n';

        // handle the named refs
        for (const [refName, objectId] of iterRefs(repoPath)) {
            dot += `"${refName}" [shape=note]\n`;

            if (objectId) {
                dot += `"${refName}" -> "${objectId}"\n`;
                objectIds.add(objectId);
            }
        }

        // handle the commit objects
        for (const objectId of getCommitsAndParents(repoPath, objectIds)) {
            const { parent } = getCommit(repoPath, objectId);

            dot += `"${objectId}" [shape=box style=filled label="${objectId.substr(0, 10)}"]\n`;
            if (parent) {
                dot += `"${objectId}" -> "${parent}"\n`;
            }
        }

        dot += '}';

        // process and display the Dot file
        const graphviz = spawn('dot', ['-Tpng'], { stdio: ['pipe', 'pipe', process.stderr] });
        const preview = spawn('open', ['-a', 'Preview.app', '-f'], { stdio: ['pipe', 'pipe', process.stderr] });
        const endGraphviz = () => graphviz.stdin.end();

        graphviz.stdout.pipe(preview.stdin);
        if (!graphviz.stdin.write(dot)) {
            graphviz.stdin.once('drain', endGraphviz);
        } else {
            endGraphviz();
        }
    }
}
