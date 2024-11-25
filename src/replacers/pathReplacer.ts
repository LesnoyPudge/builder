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

const replaceSlashes = (text: string) => {
    return text.replace(/\\/g, '/');
}

const deNormalize = (text: string) => {
    const shouldNotAddPrefix = (
        text.startsWith('..') 
        || text.startsWith('./')
        || path.isAbsolute(text)
    )

    return replaceSlashes(shouldNotAddPrefix ? text : `./${text}`);
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

const fixTsExt = (text: string): string => {
    if (text.endsWith('.ts')) {
        return `${text.slice(0, -3)}.js`
    }

    return text;
}

const fixAbsoluteSrc = (
    options: Options,
    text: string,
): string => {
    if (text.startsWith('src')) {
        const outDir = options.compilerOptions.outDir;
        invariant(outDir)

        return text.replace(
            'src',
            path.basename(outDir),
        )
    }

    return text;
}

const fixRelativeSrc = (
    options: Options,
    text: string,
): string => {
    if (text.startsWith('./src')) {
        const outDir = options.compilerOptions.outDir;
        invariant(outDir)

        return text.replace(
            './src',
            `./${path.basename(outDir)}`,
        )
    }

    return text;
}

const resolvePathRelativeToRootOrExternal = (
    options: Options,
    pathRelativeToRoot: string,
): string => {
    let textToModify = pathRelativeToRoot;

    // console.log(
    //     'resolvePathRelativeToRootOrExternal\n',
    //     textToModify,
    //     '\n\n',
    // )
    
    textToModify = fixTsExt(textToModify);
    textToModify = fixRelativeSrc(options, textToModify);
    textToModify = fixAbsoluteSrc(options, textToModify);

    const absoluteModulePath = findAbsolutePath3({
        compareList: options.fileNames,
        root: options.projectRoot,
        text: textToModify,
    })

    if (!path.isAbsolute(absoluteModulePath)) {
        return textToModify;
    }

    const modulePathRelativeToFilePath = deNormalize(path.relative(
        path.dirname(options.filePath),
        absoluteModulePath
    ))

    return modulePathRelativeToFilePath;
}

const resolvePathRelativeToCurrentFileOrExternal = (
    options: Options,
    pathRelativeToCurrentFile: string,
): string => {
    let textToModify = pathRelativeToCurrentFile;

    // console.log(
    //     'resolvePathRelativeToCurrentFileOrExternal\n',
    //     textToModify,
    //     '\n\n',
    // )
    
    textToModify = fixTsExt(textToModify);

    textToModify = fixRelativeSrc(options, textToModify);

    textToModify = fixAbsoluteSrc(options, textToModify);

    const absoluteModulePath = findAbsolutePath3({
        compareList: options.fileNames,
        root: path.dirname(options.filePath),
        text: textToModify,
    })

    if (!path.isAbsolute(absoluteModulePath)) {
        return textToModify;
    }

    const modulePathRelativeToFilePath = deNormalize(path.relative(
        path.dirname(options.filePath),
        absoluteModulePath
    ))

    return modulePathRelativeToFilePath;
}

const pathAliasToPathRelativeToRoot = (
    options: Options,
    pathAlias: string,
): string => {
    // console.log(
    //     'pathAliasToPathRelativeToRoot\n',
    //     pathAlias,
    //     '\n\n',
    // )

    const paths = options.compilerOptions.paths;
    invariant(paths);

    let aliasValue = paths[pathAlias]?.[0];
    if (aliasValue) return aliasValue;

    const pathNames = Object.keys(paths);
    const namesWithOmittedWildcard = pathNames.map((name) => {
        return name.endsWith('/*') ? name.slice(0, -1) : undefined;
    }).filter(Boolean);

    const possibleNames = namesWithOmittedWildcard.filter((name) => {
        return pathAlias.startsWith(name);
    });

    if (possibleNames.length === 0) return pathAlias;
    
    let possibleName = possibleNames[0]!;

    if (possibleNames.length > 1) {
        for (const name of possibleNames) {
            if (name.length > possibleName.length) {
                possibleName = name;
            }
        }
    }
    const newAliasValue = paths[`${possibleName}*`]?.[0];
    invariant(newAliasValue)

    const newNormalizedAliasValue = (
        newAliasValue.endsWith('/*')
            ? newAliasValue.slice(0, -2)
            :  newAliasValue
    )

    const textWithoutAlias = pathAlias.slice(
        possibleName.length
    );

    return replaceSlashes(path.join(
        newNormalizedAliasValue,
        textWithoutAlias,
    ))
}

let nodeModulesSet: Set<string>;

const getIsFromNodeModules = (
    options: Options,
    possiblyExternalPath: string,
): boolean => {
    if (!nodeModulesSet) {
        nodeModulesSet = new Set();

        fs.readdirSync(options.projectRoot).map((fileOrDir) => {
            const stats = fs.statSync(fileOrDir);
            return stats.isDirectory() ? fileOrDir : undefined
        }).filter(Boolean).forEach((dir) => {
            nodeModulesSet.add(dir);
        });
    }

    const firstPart = possiblyExternalPath.split('/')[0]!;
    
    return nodeModulesSet.has(firstPart);
}

export const pathReplacer = (options: Options) => {
    const {
        compilerOptions,
        data,
    } = options;
    
    let textToModify = data;
    invariant(compilerOptions.outDir);

    const isExternal = (
        textToModify.startsWith('@') 
        && !compilerOptions.paths
    );
    if (isExternal) {
        return textToModify;
    }

    const isPossiblePathAlias = (
        textToModify.startsWith('@') 
        && compilerOptions.paths
    )
    if (isPossiblePathAlias) {
        return resolvePathRelativeToRootOrExternal(
            options,
            pathAliasToPathRelativeToRoot(
                options,
                textToModify,
            )
        )
    }

    if (textToModify.startsWith('src')) {
        return resolvePathRelativeToRootOrExternal(
            options,
            textToModify,
        );
    }

    if (getIsFromNodeModules(
        options,
        textToModify,
    )) {
        return textToModify;
    }

    return resolvePathRelativeToCurrentFileOrExternal(
        options,
        textToModify,
    )
}