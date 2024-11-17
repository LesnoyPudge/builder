import { JSFileNameToDataMap } from "../types.js";
import { pathReplacer } from "../replacers/index.js";
import { T } from "@lesnoypudge/types-utils-base/namespace";
import fs from 'node:fs/promises';



type Options = {
    jsMap: JSFileNameToDataMap,
} & T.StrictOmit<
    Parameters<typeof pathReplacer>[0],
    'data' | 'filePath' | 'fileNames'
>;

const pathRegex = /(from\s+['"])([^'"]+)(['"])/g;

export const processJSFiles = async ({
    jsMap,
    ...replacerOption
}: Options) => {
    await Promise.all([
        ...jsMap.entries()
    ].map(async ([filePath, data]) => {
        const updatedData = data.replace(
            pathRegex,
            (match, leftQuote, pathToReplace, rightQuote) => {
                const newPath = pathReplacer({
                    ...replacerOption,
                    fileNames: [...jsMap.keys()],
                    filePath,
                    data: pathToReplace,
                })

                return `${leftQuote}${newPath}${rightQuote}`;
            },
        );

        return fs.writeFile(filePath, updatedData, 'utf8');
    }));
}