import yargs from 'yargs';
import InitCommand from './commands/init';
import HashObjectCommand from './commands/hashObject';
import CatFileCommand from './commands/catFile';
import WriteTreeCommand from './commands/writeTree';
import ReadTreeCommand from './commands/readTree';

// setup command args
yargs // eslint-disable-line
    .command(new InitCommand())
    .command(new HashObjectCommand())
    .command(new CatFileCommand())
    .command(new WriteTreeCommand())
    .command(new ReadTreeCommand())
    .demandCommand(1, 1, 'You must specify a command from above')
    .help()
    .argv;
