import ts from "typescript";
import { JSFileNameToDataMap, Transformer } from "../types.js";



type Options = {
    compilerOptions: ts.CompilerOptions
    filePathsToProcess: string[];
    beforeTransformers?: Transformer[];
    afterTransformers?: Transformer[];
}

export const processTSFiles = ({
    compilerOptions,
    filePathsToProcess,
    beforeTransformers,
    afterTransformers,
}: Options) => {
    const jsFilePathToDataMap: JSFileNameToDataMap = new Map();
    const program = ts.createProgram(
        filePathsToProcess, 
        compilerOptions,
    );

    const emitResult = program.emit(
        undefined,
        async (fileName, text, mark) => {
            jsFilePathToDataMap.set(fileName, text);
            
            ts.sys.writeFile(fileName, text, mark);
        },
        undefined, 
        false,
        {
            before: beforeTransformers,
            after: afterTransformers,
        }
    );

    if (emitResult.emitSkipped) {
        throw new Error("Failed to emit");
    }

    return {
        jsFilePathToDataMap,
    };
}