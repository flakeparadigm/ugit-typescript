import yargs from 'yargs';
import { getObjectId } from './base';

import InitCommand from './commands/init';
import CheckoutCommand from './commands/checkout';
import CommitCommand from './commands/commit';
import LogCommand from './commands/log';
import TagCommand from './commands/tag';

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

    // test & prototype commands
    .command(new HashObjectCommand())
    .command(new CatFileCommand())
    .command(new WriteTreeCommand())
    .command(new ReadTreeCommand())

    .coerce('object', (ref: string) => getObjectId(process.cwd(), ref))
    .demandCommand(1, 1, 'You must specify a command from above')
    .help()
    .argv;
