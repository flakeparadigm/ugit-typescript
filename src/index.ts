import yargs from 'yargs';
import InitCommand from './commands/init';
import CheckoutCommand from './commands/checkout';
import CommitCommand from './commands/commit';
import LogCommand from './commands/log';
import HashObjectCommand from './commands/hashObject';
import CatFileCommand from './commands/catFile';
import WriteTreeCommand from './commands/writeTree';
import ReadTreeCommand from './commands/readTree';

// setup command args
yargs // eslint-disable-line
    .command(new InitCommand())
    .command(new CheckoutCommand())
    .command(new CommitCommand())
    .command(new LogCommand())
    .command(new HashObjectCommand())
    .command(new CatFileCommand())
    .command(new WriteTreeCommand())
    .command(new ReadTreeCommand())
    .demandCommand(1, 1, 'You must specify a command from above')
    .help()
    .argv;
