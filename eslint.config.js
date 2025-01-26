import { config } from "@lesnoypudge/eslint-config";


export default config.createConfig(
    config.configs.base,
    config.configs.node,
    {
        rules: {
            'n/hashbang': 'off',
        }
    },
    config.configs.disableTypeChecked,
);