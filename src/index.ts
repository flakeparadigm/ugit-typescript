import yargs from 'yargs';
import { getObjectId } from './base';

import InitCommand from './commands/init';
import CheckoutCommand from './commands/checkout';
import CommitCommand from './commands/commit';
import LogCommand from './commands/log';
import BranchCommand from './commands/branch';
import TagCommand from './commands/tag';
import KCommand from './commands/k';
import StatusCommand from './commands/status';
import ResetCommand from './commands/reset';

import HashObjectCommand from './commands/hashObject';
import CatFileCommand from './commands/catFile';
import WriteTreeCommand from './commands/writeTree';
import ReadTreeCommand from './commands/readTree';

// setup command args
yargs // eslint-disable-line

    // standard git commands
    .command(new InitCommand())
    .command(new CheckoutCommand())
    .command(new CommitCommand())
    .command(new LogCommand())
    .command(new TagCommand())
    .command(new BranchCommand())
    .command(new KCommand())
    .command(new StatusCommand())
    .command(new ResetCommand())

    // test & prototype commands
    .command(new HashObjectCommand())
    .command(new CatFileCommand())
    .command(new WriteTreeCommand())
    .command(new ReadTreeCommand())

    .wrap(yargs.terminalWidth())
    .coerce('object', (ref: string) => getObjectId(process.cwd(), ref))
    .coerce('commit', (ref: string) => getObjectId(process.cwd(), ref))
    .demandCommand(1, 1, 'You must specify a command from above')
    .help()
    .argv;
