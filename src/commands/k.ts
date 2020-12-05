import { spawn } from 'child_process';
import { CommandModule } from 'yargs';
import { getCommit, iterCommitsAndParents } from '../base';
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
        for (const [refName, ref] of iterRefs(repoPath, false)) {
            dot += `"${refName}" [shape=note]\n`;

            if (ref.value) {
                dot += `"${refName}" -> "${ref.value}"\n`;
                if (!ref.symbolic) objectIds.add(ref.value);
            }
        }

        // handle the commit objects
        for (const objectId of iterCommitsAndParents(repoPath, objectIds)) {
            const { parents } = getCommit(repoPath, objectId);

            dot += `"${objectId}" [shape=box style=filled label="${objectId.substring(0, 10)}"]\n`;
            for (const parent of parents) {
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
