import { JSFileNameToDataMap } from '../types.js';
import { pathReplacer } from '../replacers/index.js';
import { T } from '@lesnoypudge/types-utils-base/namespace';
import fs from 'node:fs/promises';
import { invariant } from '@lesnoypudge/utils';



type Options = {
    jsMap: JSFileNameToDataMap;
} & T.StrictOmit<
    Parameters<typeof pathReplacer>[0],
    'data' | 'filePath' | 'fileNames'
>;

const pathRegex = /(from\s+['"])([^'"]+)(['"])/g;

export const processJSFiles = async ({
    jsMap,
    ...replacerOption
}: Options) => {
    for (const [filePath, data] of jsMap.entries()) {
        const updatedData = data.replaceAll(
            pathRegex,
            (match, leftQuote, pathToReplace, rightQuote) => {
                invariant(typeof pathToReplace === 'string');

                const newPath = pathReplacer({
                    ...replacerOption,
                    fileNames: [...jsMap.keys()],
                    filePath,
                    data: pathToReplace,
                });

                // console.log({
                //     original: pathToReplace,
                //     new: newPath,
                // })

                return `${leftQuote}${newPath}${rightQuote}`;
            },
        );

        await fs.writeFile(filePath, updatedData, 'utf8');
    }
};