#!/usr/bin/env node
import { invariant } from "@lesnoypudge/utils";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { builder } from "./builder.js";
import { getArgs } from "./components/index.js";



(async () => {
    const {configName, verbose} = getArgs();

    builder({
        configName,
        verbose,
        logTime: true,
    })
})();