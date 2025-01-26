#!/usr/bin/env node
import { builder } from './builder';
import { getArgs } from './utils';



void (async () => {
    const { configName, verbose } = await getArgs();

    await builder({
        configName,
        verbose,
        logTime: true,
    });
})();