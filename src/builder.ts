import fs from 'node:fs';
import { invariant } from "@lesnoypudge/utils";
import { 
    Timer,
    parseConfig,
    processJSFiles,
    processTSFiles,
} from "./components/index.js";
import path from 'node:path';


type Args = {
    configName: string;
    verbose: boolean;
    logTime?: boolean;
}

export const builder = async ({
    configName,
    verbose,
    logTime = false,
}: Args) => {
    const timer = new Timer();
    logTime && timer.start();

    const {
        configFilePath,
        parsedConfig,
    } = await parseConfig({ configName, verbose });
    
    verbose && console.log({
        compilerOptions: parsedConfig.options,
        filePathsToProcess: parsedConfig.fileNames,
        configFilePath,
    })

    invariant(
        parsedConfig.options.outDir,
        'outDir not specified in compilerOptions'
    )

    fs.rmSync(
        parsedConfig.options.outDir, 
        {force: true, recursive: true}
    );

    const { jsFilePathToDataMap } = processTSFiles({
        compilerOptions: parsedConfig.options,
        filePathsToProcess: parsedConfig.fileNames,
        beforeTransformers: [],
        afterTransformers: [],
    });

    verbose && console.log('post processTSFiles')

    await processJSFiles({
        jsMap: jsFilePathToDataMap,
        compilerOptions: parsedConfig.options,
        projectRoot: path.resolve(
            path.dirname(configFilePath),
            parsedConfig.options.baseUrl ?? "",
        )
    })

    verbose && console.log('post processJSFiles')

    logTime && timer.end();
    logTime && timer.log();
}