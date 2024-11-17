import ts from "typescript";
import { Transformer } from "../types.js";
import path from "node:path";
import { invariant } from "@lesnoypudge/utils";
import fs from "node:fs";



type Options = {
    configFilePath: string;
    compilerOptions: ts.CompilerOptions;
    filePathsToProcess: string[];
}

type ReplacerOptions = {
    textToModify: string;
    sourceFile: ts.SourceFile;
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
    const directPathTS = `${baseFilePath}.ts`;
    const directPathJS = `${baseFilePath}.js`;
    const indexPathTS = path.join(baseFilePath, 'index.ts');
    const indexPathJS = path.join(baseFilePath, 'index.js');

    if (
        compareList.includes(indexPathTS)
        || fs.existsSync(indexPathTS)
    ) {
        return deNormalize(`${path.normalize(text)}/index.js`); 
    }

    if (
        compareList.includes(directPathTS)
        || fs.existsSync(directPathTS)
    ) {
        return deNormalize(`${text}.js`);
    }
    
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

const createReplacer = ({
    configFilePath,
    compilerOptions,
    filePathsToProcess,
}: Options) => {
    const rootPath = path.resolve(
        path.dirname(configFilePath),
        compilerOptions.baseUrl ?? "",
    )

    return ({ sourceFile, textToModify }: ReplacerOptions) => {
        let text = textToModify;

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

        if (isEndsAsFile(text)) return text;

        const newText = lookForPathRelativeToRoot({
            compareList: filePathsToProcess,
            rootPath,
            text,
        });
        if (newText !== text) return newText;

        return lookForPathRelativeToRoot({
            compareList: filePathsToProcess,
            rootPath: path.dirname(sourceFile.fileName),
            text,
        });
    }
}

export const createImportResolverTransformer = (
    options: Options
): Transformer => {
    const replacer = createReplacer(options);

    return (context) => {
        return (sourceFile) => {
            const visitor = (node: ts.Node) => {
                const isImportOrExport = (
                    ts.isImportDeclaration(node)
                    || (
                        ts.isExportDeclaration(node)
                        && node.moduleSpecifier
                    )
                );

                if (!isImportOrExport) {
                    return ts.visitEachChild(node, visitor, context);
                }

                const moduleSpecifier = (
                    node.moduleSpecifier!
                        .getText()
                        .replace(/"|'/g, "")
                );

                const newPath = replacer({
                    sourceFile,
                    textToModify: moduleSpecifier,
                });
        
                const literal = ts.factory.createStringLiteral(
                    newPath
                );

                if (ts.isImportDeclaration(node)) {
                    return ts.factory.updateImportDeclaration(
                        node,
                        node.modifiers,
                        node.importClause,
                        literal,
                        node.attributes,
                    );
                }

                if (ts.isExportDeclaration(node)) {
                    return ts.factory.updateExportDeclaration(
                        node,
                        node.modifiers,
                        node.isTypeOnly,
                        node.exportClause,
                        literal,
                        node.attributes,
                    );
                }

                throw new Error("never");
            };
            
            return ts.visitNode(sourceFile, visitor).getSourceFile();
        }
    }
}