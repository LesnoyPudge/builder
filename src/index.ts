import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { replaceTscAliasPaths } from 'tsc-alias';
import { FolderTree } from "@lesnoypudge/utils";



function getConfigAndFiles() {
    const fileName = 'tsconfig.build.json'
    const configFilePath = process.cwd() + `/${fileName}`;
    const configFile = ts.readConfigFile(configFilePath, ts.sys.readFile);

    if (configFile.error) {
        throw new Error(configFile.error.messageText.toString());
    }

    const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        path.dirname(configFilePath)
    );

    return { 
        options: parsedConfig.options, 
        fileNames: parsedConfig.fileNames 
    };
}

const filterFiles = (
    fileNames: string[], 
    exclude: string[] | string
): string[] => {
    const excludedFiles = new Set<string>();

    (Array.isArray(exclude) ? exclude : [exclude]).forEach(pattern => {
        const matches = fs.globSync(pattern, { cwd: process.cwd() });
        matches.forEach(file => excludedFiles.add(path.resolve(file)));
    });

    return fileNames.filter(file => !excludedFiles.has(path.resolve(file)));
}

const isUnsolvedRelativePath = (relativePath: string) => {
    if (!relativePath.startsWith('./')) return false;
    if (relativePath.match(/\.[a-zA-Z0-9]+$/)) return false;
    
    return true;
}

const getJsExtension = (
    sourceFilePath: string,
    relativePath: string
): string => {
    const dirPath = path.dirname(sourceFilePath);
    const jsRelativeFilePath = `${relativePath}.js`;
    const jsFilePath = path.resolve(
        dirPath,
        jsRelativeFilePath
    );
    const indexRelativeFilePath = `${relativePath}/index.js`;
    const indexFilePath = path.resolve(
        dirPath,
        indexRelativeFilePath
    );

    if (fs.existsSync(jsFilePath)) return jsRelativeFilePath;
    if (fs.existsSync(indexFilePath)) return indexRelativeFilePath;

    return relativePath;
}

const transpileFiles = (
    fileNames: string[], 
    options: ts.CompilerOptions,
) => {
    const program = ts.createProgram(fileNames, options);

    const emitResult = program.emit(
        undefined, 
        undefined, 
        undefined, 
        false,
    );

    if (emitResult.emitSkipped) {
        throw new Error("Failed to emit transpiled files.");
    }

    return emitResult.emittedFiles;
}

const transformFiles = (
    options: ts.CompilerOptions,
) => {
    if (options.baseUrl && options.paths) {     
        replaceTscAliasPaths(options);
    }

    if (options.outDir) {
        new FolderTree(options.outDir).traverse((fileOrFolder) => {
            if (fileOrFolder.type !== 'file') return;
            
            const file = fileOrFolder;
            if (!file.name.endsWith('.js')) return;

            const content = fs.readFileSync(file.path, 'utf8');
            const updatedContent = content.replace(
                /(from\s+['"])(\.\/[^'"]+)(['"])/g,
                (match, leftQuote, relativePath, rightQuote) => {
                    if (!isUnsolvedRelativePath(relativePath)) return match;
                    
                    const newRelativePath = getJsExtension(
                        file.path,
                        relativePath,
                    )

                    return `${leftQuote}${newRelativePath}${rightQuote}`;
                },
            );

            fs.writeFileSync(file.path, updatedContent, 'utf8');
        })
    }
    
}

(() => {
    const { options, fileNames } = getConfigAndFiles();
    
    const filesToTranspile = filterFiles(
        fileNames, 
        (options.exclude || []) as string[]
    );

    if (options.outDir) {
        fs.rmSync(options.outDir, {force: true, recursive: true});
    }

    transpileFiles(filesToTranspile, options);

    transformFiles(options);
})();