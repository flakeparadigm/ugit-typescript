import { Arguments, Argv, CommandModule } from 'yargs';
import { createTag } from '../base';
import { REF_HEAD_ALIAS } from '../const';

type TagArgs = {
    tagname: string,
    object: string,
};

export default class TagCommand implements CommandModule<unknown, TagArgs> {
    public command = 'tag <tagname> [<object>]';

    public description = 'tag the specified object with a more useful name';

    public builder(yargs: Argv): Argv<TagArgs> {
        return yargs
            .positional('tagname', {
                description: 'name of the tag to create',
                type: 'string',
            })
            .positional('object', {
                default: REF_HEAD_ALIAS,
                description: 'ref or hash of commit to tag',
                type: 'string',
            }) as Argv<TagArgs>;
    }

    public handler(args: Arguments<TagArgs>): void {
        createTag(process.cwd(), args.tagname, args.object);
    }
}
