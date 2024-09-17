#!/usr/bin/env node

import fs from "node:fs/promises";
import { FolderTree } from "@lesnoypudge/utils";
import path from "node:path";



(() => {
    const __dirname = import.meta.dirname;
    const referencePath = path.resolve(__dirname, './reference')
    const referenceTree = new FolderTree(referencePath);
    if (!referenceTree.data) {
        console.error('Reference tree is null')
        return;
    }

    // console.log(JSON.stringify(referenceTree.getDataWithoutBuffer(), null, 4))

    const traverse = (currentPath, tree, fileCb) => {
        tree.files.forEach((file) => {
            fileCb(currentPath, file);
        })

        tree.folders.forEach((folder) => {
            const newPath = path.join(currentPath, folder.name);
            traverse(newPath, folder, fileCb)
        })
    }

    const executionPath = process.cwd();

    traverse(executionPath, referenceTree.data, (currentPath, file) => {
        fs.mkdir(currentPath, { recursive: true })
        fs.writeFile(path.join(currentPath, file.name), file.data)
    })
})();