import yargs from 'yargs';
import InitCommand from './commands/init';
import HashObjectCommand from './commands/hashObject';
import CatFileCommand from './commands/catFile';

// setup command args
yargs // eslint-disable-line
    .command(new InitCommand())
    .command(new HashObjectCommand())
    .command(new CatFileCommand())
    .demandCommand(1, 1, 'You must specify a command from above')
    .help()
    .argv;
