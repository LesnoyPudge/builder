import { invariant } from "@lesnoypudge/utils";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";



const argv = await yargs(hideBin(process.argv)).parse();
invariant(argv.configName, '--configName option is not provided');    


export const getArgs = () => {
    const configName = String(argv.configName);
    const verbose = !!argv.verbose;

    return {
        configName,
        verbose,
    }
}