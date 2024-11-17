import { invariant } from "@lesnoypudge/utils";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";



type Options = {
    rootPath: string;
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

const lookForPathRelativeToRoot = ({
    compareList,
    rootPath,
    text,
}: {
    rootPath: string, 
    text: string,
    compareList: string[],
}) => {
    const baseFilePath = path.join(rootPath, text);
    // const directPathTS = `${baseFilePath}.ts`;
    const directPathJS = `${baseFilePath}.js`;
    // const indexPathTS = path.join(baseFilePath, 'index.ts');
    const indexPathJS = path.join(baseFilePath, 'index.js');

    // if (
    //     compareList.includes(indexPathTS)
    //     || fs.existsSync(indexPathTS)
    // ) {
    //     return deNormalize(`${path.normalize(text)}/index.js`); 
    // }

    // if (
    //     compareList.includes(directPathTS)
    //     || fs.existsSync(directPathTS)
    // ) {
    //     return deNormalize(`${text}.js`);
    // }
    
    if (
        compareList.includes(indexPathJS)
        || fs.existsSync(indexPathJS)
    ) {
        return deNormalize(`${path.normalize(text)}/index.js`); 
    }
    
    if (
        compareList.includes(directPathJS)
        || fs.existsSync(directPathJS)
    ) {
        return deNormalize(`${text}.js`);
    }

    return text;
}

export const pathReplacer = ({
    compilerOptions,
    data,
    filePath,
    rootPath,
    fileNames,
}: Options) => {
    let text = data;

    if (text.startsWith('@') && !compilerOptions.paths) {
        return text;
    }

    if (text.startsWith('@')) {
        const paths = compilerOptions.paths!;
        const aliasArr = paths[text];

        if (!aliasArr) return text;
        
        invariant(aliasArr[0]);
        text = aliasArr[0];
    }

    if (text.startsWith('./src')) {
        invariant(compilerOptions.outDir);
        text = text.replace(
            'src', 
            path.basename(compilerOptions.outDir)
        );
    }

    if (isEndsAsFile(text)) return text;

    const newText = lookForPathRelativeToRoot({
        compareList: fileNames,
        rootPath,
        text,
    });
    
    if (newText !== text) return newText;

    return lookForPathRelativeToRoot({
        compareList: fileNames,
        rootPath: path.dirname(filePath),
        text,
    });
}