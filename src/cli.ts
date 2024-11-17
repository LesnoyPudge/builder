#!/usr/bin/env node
import { invariant } from "@lesnoypudge/utils";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { builder } from "./builder.ts";



(async () => {
    const argv = await yargs(hideBin(process.argv)).parse();
    invariant(argv.configName, '--configName option is not provided');    

    const configName = String(argv.configName);
    const verbose = !!argv.verbose;

    builder({
        configName,
        verbose,
        logTime: true,
    })
})();