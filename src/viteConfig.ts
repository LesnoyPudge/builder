import { mergeConfig, UserConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { checker } from 'vite-plugin-checker';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';
import { libInjectCss } from 'vite-plugin-lib-inject-css';
import path from 'node:path';
import { glob } from 'glob';
import { T } from '@lesnoypudge/types-utils-base/namespace';
import url from 'node:url';



export namespace getViteLibraryConfig {
    export type Options = {
        tsconfigPath: string;
        importMetaUrl: string;
    };
}

export const getViteLibraryConfig = (
    options: getViteLibraryConfig.Options,
) => {
    const {
        tsconfigPath,
        importMetaUrl,
    } = options;

    // https://vite.dev/config/
    const _libraryConfig = {
        build: {
            outDir: 'build',
            emptyOutDir: true,
            copyPublicDir: false,
            lib: {
                entry: `./src/index.ts`,
                formats: ['es'],
            },
            sourcemap: true,
            minify: false,
            ssr: true,
            rollupOptions: {
                input: Object.fromEntries(
                    glob.sync(
                        `./src/**/*.{ts,tsx}`,
                        { ignore: `./src/**/*.{d,test}.{ts,tsx}` },
                    ).map((file) => [
                        path.relative(
                            './src',
                            file.slice(
                                0,
                                file.length - path.extname(file).length,
                            ),
                        ),
                        // file,
                        url.fileURLToPath(new URL(file, importMetaUrl)),
                    ]),
                ),
                treeshake: true,
                output: {
                    assetFileNames: 'assets/[name][extname]',
                    entryFileNames: '[name].js',
                },
            },
        },
    } as const satisfies UserConfig;

    const libraryConfig = _libraryConfig as (
        T.SimplifyDeep<T.WritableDeep<typeof _libraryConfig>>
    );

    const extraPlugins = {
        libInjectCss,
        react,
    };

    const _extraPluginOptions = {
        react: {
            babel: {
                plugins: [
                    [
                        '@babel/plugin-transform-react-jsx',
                        { runtime: 'automatic' },
                    ],
                    'jsx-control-statements',
                ],
            },
        },
    } as const;

    const extraPluginOptions = _extraPluginOptions as (
        T.SimplifyDeep<T.WritableDeep<typeof _extraPluginOptions>>
    );

    const plugins = {
        tsconfigPaths,
        dts,
        checker,
    } as const;

    const _pluginOptions = {
        tsconfigPaths: { projects: [tsconfigPath] },
        dts: { tsconfigPath },
        checker: { typescript: true },
    };

    const pluginOptions = _pluginOptions as (
        T.SimplifyDeep<T.WritableDeep<typeof _pluginOptions>>
    );

    const getBasePreparedConfig = () => {
        return mergeConfig(libraryConfig, {
            plugins: [
                plugins.checker(pluginOptions.checker),
                plugins.dts(pluginOptions.dts),
                plugins.tsconfigPaths(pluginOptions.tsconfigPaths),
            ],
        });
    };

    return {
        libraryConfig,
        extraPlugins,
        extraPluginOptions,
        plugins,
        pluginOptions,
        getBasePreparedConfig,
    };
};