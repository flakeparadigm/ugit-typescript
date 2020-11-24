import { Arguments, Argv, CommandModule } from 'yargs';
import { checkout } from '../base';
import { REF_HEAD_NAME } from '../data';

type CheckoutArgs = {
    name: string,
};

export default class CheckoutCommand implements CommandModule<unknown, CheckoutArgs> {
    public command = 'checkout <name>';

    public description = 'switch HEAD to the given object, updaing the working directory';

    public builder(yargs: Argv): Argv<CheckoutArgs> {
        return yargs
            .positional('name', {
                description: 'ref or hash of commit/branch to switch to',
                type: 'string',
            }) as Argv<CheckoutArgs>;
    }

    public handler(args: Arguments<CheckoutArgs>): void {
        checkout(process.cwd(), args.name);
        console.log(`${REF_HEAD_NAME} set to ${args.name}`);
    }
}
