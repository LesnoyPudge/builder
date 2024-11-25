import { invariant } from "@lesnoypudge/utils";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";



type Options = {
    projectRoot: string;
    filePath: string;
    data: string;
    compilerOptions: ts.CompilerOptions;
    fileNames: string[];
}

const deNormalize = (text: string) => {
    const shouldNotAddPrefix = (
        text.startsWith('..') 
        || text.startsWith('./')
        || path.isAbsolute(text)
    )
    const tmp = shouldNotAddPrefix ? text : `./${text}`;
    return tmp.replace(/\\/g, '/');
}

const isEndsAsFile = (filePath: string) => {
    return (
        filePath.endsWith('.ts')
        || filePath.endsWith('.js')
    )
}

const findAbsolutePath = ({
    compareList,
    rootPath,
    text,
}: {
    rootPath: string, 
    text: string,
    compareList: string[],
}) => {
    const baseFilePath = path.join(rootPath, text);
    const directPathJS = deNormalize(`${baseFilePath}.js`);
    const indexPathJS = deNormalize(path.join(baseFilePath, 'index.js'));
    
    if (
        compareList.includes(indexPathJS)
        || fs.existsSync(indexPathJS)
    ) {
        return indexPathJS; 
    }
    
    if (
        compareList.includes(directPathJS)
        || fs.existsSync(directPathJS)
    ) {
        return directPathJS;
    }

    return text;
}

const findAbsolutePath2 = ({
    compareList,
    rootPath,
    text,
    rootBuildDirname,
    fileDir,
}: {
    fileDir: string;
    rootPath: string, 
    text: string,
    compareList: string[],
    rootBuildDirname: string,
}) => {
    let textToModify = text;

    switch (true) {
        case textToModify.startsWith(`./${rootBuildDirname}`): {
            textToModify = path.join(rootPath, textToModify);
            break;
        }

        case textToModify.startsWith('..'): {
            textToModify = path.join(fileDir, textToModify)
            break;
        }
        
        default: {
            textToModify = path.join(fileDir, textToModify);
        }
    }

    const directAbsPath = deNormalize(`${textToModify}.js`);
    const indexAbsPath = deNormalize(path.join(textToModify, 'index.js'));

    if (
        compareList.includes(indexAbsPath)
        || fs.existsSync(indexAbsPath)
    ) {
        return indexAbsPath; 
    }
    
    if (
        compareList.includes(directAbsPath)
        || fs.existsSync(directAbsPath)
    ) {
        return directAbsPath;
    }

    return textToModify;
}

const findAbsolutePath3 = ({
    text,
    compareList,
    root,
}: {
    text: string;
    compareList: string[];
    root: string;
}) => {
    const almostAbsolutePath = path.resolve(
        root,
        text,
    );

    const directAbsPath = (
        almostAbsolutePath.endsWith('.js')
            ? almostAbsolutePath
            : deNormalize(`${almostAbsolutePath}.js`)
    );

    const indexAbsPath = (
        almostAbsolutePath.endsWith('.js')
            ? almostAbsolutePath
            : deNormalize(path.join(almostAbsolutePath, 'index.js'))
    );

    if (
        compareList.includes(indexAbsPath)
        || fs.existsSync(indexAbsPath)
    ) {
        return indexAbsPath; 
    }
    
    if (
        compareList.includes(directAbsPath)
        || fs.existsSync(directAbsPath)
    ) {
        return directAbsPath;
    }

    return text;
}

export const pathReplacer = ({
    compilerOptions,
    data,
    filePath,
    projectRoot,
    fileNames,
}: Options) => {
    let textToModify = data;
    invariant(compilerOptions.outDir);
    const rootBuildDirname = path.basename(compilerOptions.outDir);

    if (textToModify.startsWith('@') && !compilerOptions.paths) {
        return textToModify;
    }

    // path alias to relative
    if (textToModify.startsWith('@')) {
        const paths = compilerOptions.paths;
        invariant(paths);

        const pathNames = Object.keys(paths);
        const pathNamesWithWildcard = pathNames.filter((name) => {
            return name.endsWith('/*');
        })
        const pathNamesWithoutWildcard = pathNames.filter((name) => {
            return !name.endsWith('/*');
        })

        let aliasValue = paths[textToModify]?.[0];
        
        if (!aliasValue) {
            const namesWithOmittedWildcard = pathNamesWithWildcard.map((name) => {
                return name.slice(0, -1);
            });

            const possibleNames = namesWithOmittedWildcard.filter((name) => {
                return textToModify.startsWith(name);
            });

            if (possibleNames.length !== 0) {
                let possibleName = possibleNames[0]!;

                for (const name of possibleNames) {
                    if (name.length > possibleName.length) {
                        possibleName = name;
                    }
                }

                let newAliasValue = paths[`${possibleName}*`]?.[0];
                invariant(newAliasValue)

                newAliasValue = (
                    newAliasValue.endsWith('/*')
                        ? newAliasValue.slice(0, -2)
                        :  newAliasValue
                )

                const textWithoutAlias = textToModify.slice(
                    possibleName.length
                );

                aliasValue = deNormalize(path.join(
                    newAliasValue,
                    textWithoutAlias,
                ))
            }
        }

        // external module (@lesnoypudge)
        if (!aliasValue) return textToModify;

        if (aliasValue.endsWith('.ts')) {
            aliasValue = `${aliasValue.slice(0, -3)}.js`
        }

        if (aliasValue.startsWith('src')) {
            aliasValue = aliasValue.replace(
                'src',
                rootBuildDirname,
            )
        }

        if (aliasValue.startsWith('./src')) {
            aliasValue = aliasValue.replace(
                './src',
                `./${rootBuildDirname}`,
            )
        }

        const absoluteModulePath = findAbsolutePath3({
            compareList: fileNames,
            root: projectRoot,
            text: aliasValue,
        })

        if (!path.isAbsolute(absoluteModulePath)) {
            console.log({
                filePath,
                aliasValue,
                absoluteModulePath,
            });

            throw new Error(`cannot find absolute path for path alias ${aliasValue}`);
        }

        const modulePathRelativeToFilePath = deNormalize(path.relative(
            path.dirname(filePath),
            absoluteModulePath
        ))

        return modulePathRelativeToFilePath;
    }

    const isExternalModule = !(
        textToModify.startsWith('..')
        || textToModify.startsWith('./')
    );

    if (isExternalModule) return textToModify;

    if (textToModify.endsWith('.ts')) {
        textToModify = `${textToModify.slice(0, -3)}.js`
    }

    const moduleAbsolutePath = findAbsolutePath3({
        text: textToModify,
        compareList: fileNames,
        root: path.dirname(filePath),
    });

    const modulePathRelativeToFilePath = deNormalize(path.relative(
        path.dirname(filePath),
        moduleAbsolutePath,
    ))
    
    return modulePathRelativeToFilePath;
}