#!/usr/bin/env node
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { replaceTscAliasPaths } from 'tsc-alias';
import type { ReplaceTscAliasPathsOptions } from "tsc-alias";
import { FolderTree, invariant } from "@lesnoypudge/utils";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';



const argv = await yargs(hideBin(process.argv)).parse();
invariant(argv.file, '--file option is not provided');

const getConfigAndFiles = async () => {
    const fileName = String(argv.file);
    const configFilePath = process.cwd() + `/${fileName}`;

    console.log(`using ${configFilePath} to build`);

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
        fileNames: parsedConfig.fileNames,
        configFilePath,
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
    if (relativePath.match(/\.[a-zA-Z0-9]+$/)) return false;
    
    return true;
}

const getJsExtension = (
    sourceFilePath: string,
    somePath: string
): string => {
    // if (!somePath.startsWith('.')) {
    //     const rootBasedPath = somePath;
    //     const pathFromRoot = path.join(process.cwd(), rootBasedPath)
    //     const pathToIndex = `${pathFromRoot}/index.js`;
    //     const pathToFile = `${pathFromRoot}.js`;
        
    //     if (rootBasedPath.startsWith('src')) {
    //         console.log({
    //             pathToIndex, 
    //             ex1: fs.existsSync(pathToIndex),
    //             pathToFile,
    //             ex2: fs.existsSync(pathToFile),
    //         })
    //     }

    //     if (fs.existsSync(pathToIndex)) return `${rootBasedPath}/index.js`;
    //     if (fs.existsSync(pathToFile)) return `${rootBasedPath}.js`;

    //     return rootBasedPath;
    // }
    
    const relativePath = somePath;
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

    if (fs.existsSync(indexFilePath)) return indexRelativeFilePath;
    if (fs.existsSync(jsFilePath)) return jsRelativeFilePath;

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

const transformFiles = async (
    options: ts.CompilerOptions,
    tscAliasOptions?: ReplaceTscAliasPathsOptions,
) => {
    if (options.baseUrl && options.paths) { 
        await replaceTscAliasPaths(tscAliasOptions);
    }

    if (options.outDir) {
        new FolderTree(options.outDir).traverse((fileOrFolder) => {
            if (fileOrFolder.type !== 'file') return;
            
            const file = fileOrFolder;
            if (!file.name.endsWith('.js')) return;
            
            const content = fs.readFileSync(file.path, 'utf8');
            const updatedContent = content.replace(
                /(from\s+['"])([^'"]+)(['"])/g,
                (match, leftQuote, somePath, rightQuote) => {
                    if (!isUnsolvedRelativePath(somePath)) return match;
                    
                    const newRelativePath = getJsExtension(
                        file.path,
                        somePath,
                    )

                    if (somePath === newRelativePath) {
                        // console.log({
                        //     somePath, 
                        //     newRelativePath,
                        //     filePath: file.path
                        // })
                        // const _path = path.resolve(
                        //     path.dirname(file.path), 
                        //     somePath
                        // );
                        // console.log(options.rootDir)
                        // // console.log(path.isAbsolute(somePath))
                        // console.log('exists?:', _path, fs.existsSync(_path))
                    }

                    return `${leftQuote}${newRelativePath}${rightQuote}`;
                },
            );

            fs.writeFileSync(file.path, updatedContent, 'utf8');
        })
    }
    
}

(async () => {
    const startTime = performance.now();
    const { 
        options, 
        fileNames,
        configFilePath,
    } = await getConfigAndFiles();
    
    const filesToTranspile = filterFiles(
        fileNames, 
        (options.exclude || []) as string[]
    );

    if (options.outDir) {
        fs.rmSync(options.outDir, {force: true, recursive: true});
    }

    transpileFiles(filesToTranspile, options);

    await transformFiles(options, {
        configFile: configFilePath,
    });

    const endTime = performance.now();
    const timeDiffSec = (endTime - startTime) / 1000;
    console.log(`builded in ${timeDiffSec.toFixed(2)} second(s)`);
})();