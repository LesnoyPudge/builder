import ts from 'typescript';
import path from 'node:path';



type Options = {
    configName: string;
    verbose: boolean;
}

type Return = Promise<{
    parsedConfig: ts.ParsedCommandLine;
    configFilePath: string;
}>;

export const parseConfig = async (
    options: Options
): Return => {
    const configFilePath = path.join(
        process.cwd(),
        `/${options.configName}`
    );

    if (options.verbose) {
        console.log(`using ${configFilePath} to build`);
    }

    const configFile = ts.readConfigFile(
        configFilePath, 
        ts.sys.readFile
    );
    
    if (configFile.error) {
        throw new Error(configFile.error.messageText.toString());
    }

    const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        path.dirname(configFilePath)
    );

    return { 
        parsedConfig,
        configFilePath,
    };
}