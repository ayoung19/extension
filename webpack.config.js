const path = require('path');
const glob = require('glob');
const fs = require('fs');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const resolve = require('path').resolve;

const CHROME_KEY =
    'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmf6qYyrFypvvB0klM/hHhIdGO0bAnUT6ZK4fLqGl8/l5OWze2leeQkC/Nf0HOTQ50d2sdgXFuQDfHsMF+HQ5pUVIUT/25MzEXZWGwqi+JAxEX9Q/yGFFN53nI4m7mGNzCQ0TDUS3IrJsFfQBMEdv/fAwnhEitF/Ko9qn8/KYDzZqIjujwXKKeqlx+UXIvkgblI44RT9evwiqp+/WjZZ/YQzLa9tFhdz0Ct3Qvhn/03YrLAXa+yxXKpLAjQJ9DpYJoa++bJwluffinxKQUX0tm5dzFRSRKFCG92hKHnQHcQFUnBlDKF4LS0KQhgelyiTxN4GmKX7I1xQS/B1TByLL2wIDAQAB';

function getPathEntries(path) {
    return glob.sync(path).reduce((acc, e) => {
        if (!e.includes('node_modules')) {
            // Remove extension
            acc[e.replace(/\.[^/.]+$/, '')] = e;
        }

        return acc;
    }, {});
}

function convertToFirefoxManifest(manifest) {
    const cp = Object.assign({}, manifest);
    cp.background = {
        page: 'src/background_ff.html',
    };
    cp.browser_specific_settings = {
        gecko: {
            id: '{194d0dc6-7ada-41c6-88b8-95d7636fe43c}',
            strict_min_version: '109.0',
        },
    };
    // Allow getting the extension version from CSFloat page in Firefox
    cp.content_scripts.push({
        matches: ['*://*.csfloat.com/*'],
        js: ['src/lib/page_scripts/csfloat.js'],
    });
    cp.host_permissions.push('*://*.csfloat.com/*');
    return cp;
}

module.exports = (env) => {
    const mode = env.mode || 'development';

    return {
        mode: 'none',
        entry: Object.assign(
            getPathEntries('./src/lib/page_scripts/*.ts'),
            getPathEntries('./src/lib/types/*.d.ts'),
            getPathEntries('./src/background.ts'),
            getPathEntries('./src/**/*.js'),
            getPathEntries('./src/pages/**/*.tsx')
        ),
        output: {
            path: path.join(__dirname, 'dist'),
            filename: '[name].js',
        },
        resolve: {
            alias: {
                process: 'process/browser',
            },
            extensions: ['.ts', '.js', '.html', '.tsx'],
        },
        module: {
            rules: [
                {
                    test: /\.(ts|tsx)$/,
                    loader: 'ts-loader',
                    exclude: /node_modules|\.d\.ts$/,
                },
                {
                    test: /\.d\.ts$/,
                    loader: 'ignore-loader',
                },
                {
                    test: new RegExp(`.(css)$`),
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                    },
                    exclude: /node_modules/,
                },
                {
                    test: /environment\.ts$/,
                    loader: 'file-replace-loader',
                    options: {
                        condition: mode === 'development',
                        replacement: resolve('./src/environment.dev.ts'),
                    },
                },
            ],
        },
        plugins: [
            new webpack.ProvidePlugin({
                process: 'process/browser',
            }),
            new MiniCssExtractPlugin(),
            new webpack.SourceMapDevToolPlugin({}),
            new CopyPlugin({
                patterns: [
                    {from: 'icons', to: 'icons', context: '.'},
                    {from: 'src/global.css', to: 'src/', context: '.'},
                    {from: 'src/background_ff.html', to: 'src/', context: '.'},
                    {from: 'src/steamcommunity_ruleset.json', to: 'src/', context: '.'},
                    {from: 'src', to: 'raw/', context: '.'},
                    {from: 'README.md', to: '', context: '.'},
                    {
                        from: 'manifest.json',
                        to: 'manifest.json',
                        transform(raw) {
                            let processed = JSON.parse(raw.toString());

                            if (mode === 'development' && env.browser === 'chrome') {
                                processed.key = CHROME_KEY;
                            }

                            if (mode === 'development') {
                                // Add permissions only used for connecting to localhost dev env
                                processed.host_permissions.push('http://localhost:8080/*');

                                const versionResource = processed.web_accessible_resources.find((e) =>
                                    e.resources[0].includes('version.txt')
                                );
                                versionResource.matches.push('http://localhost:4200/*');
                                processed.externally_connectable.matches.push('http://localhost/*');
                                processed.externally_connectable.matches.push('http://localhost:4200/*');
                            }

                            if (env.browser === 'firefox') {
                                processed = convertToFirefoxManifest(processed);
                            }

                            return JSON.stringify(processed, null, 2);
                        },
                    },
                    {
                        from: 'manifest.json',
                        to: 'src/version.txt',
                        transform(raw) {
                            let processed = JSON.parse(raw.toString());

                            return processed.version;
                        },
                    },
                ],
            }),
            ...fs.readdirSync(path.join(__dirname, 'src', 'pages')).map(
                (pageName) =>
                    new HtmlWebpackPlugin({
                        template: path.join(__dirname, 'src', 'pages', pageName, 'index.html'),
                        filename: `./src/pages/${pageName}/index.html`,
                        chunks: [`./src/pages/${pageName}/index`],
                        cache: false,
                    })
            ),
        ],
        stats: {
            errorDetails: true,
        },
        optimization: {
            usedExports: true,
        },
    };
};
