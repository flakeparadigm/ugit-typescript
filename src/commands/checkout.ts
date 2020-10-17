import { Arguments, Argv, CommandModule } from 'yargs';
import { checkout } from '../base';

type CheckoutArgs = {
    object: string,
};

export default class CheckoutCommand implements CommandModule<unknown, CheckoutArgs> {
    public command = 'checkout <object>';

    public description = 'switch HEAD to the given object, updaing the working directory';

    public builder(yargs: Argv): Argv<CheckoutArgs> {
        return yargs
            .positional('object', {
                description: 'hash of commit to switch to',
                type: 'string',
            }) as Argv<CheckoutArgs>;
    }

    public handler(args: Arguments<CheckoutArgs>): void {
        checkout(process.cwd(), args.object);
    }
}
