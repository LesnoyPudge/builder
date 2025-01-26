import { getViteLibraryConfig } from './src';



const { getBasePreparedConfig } = getViteLibraryConfig({
    tsconfigPath: './tsconfig.node.build.json',
    importMetaUrl: import.meta.url,
});

export default getBasePreparedConfig();