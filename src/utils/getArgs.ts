import { invariant } from '@lesnoypudge/utils';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';



export const getArgs = async () => {
    const argv = await yargs(hideBin(process.argv)).parse();
    invariant(argv.configName, '--configName option is not provided');
    const configName = String(argv.configName);
    const verbose = !!argv.verbose;

    return {
        configName,
        verbose,
    };
};