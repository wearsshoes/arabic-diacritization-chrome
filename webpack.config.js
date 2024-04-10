const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtReloader = require('webpack-ext-reloader');

module.exports = {

  mode: 'development',
  devtool: 'cheap-module-source-map',
  watch: true,

  entry: {
    background: './src/background.ts',
    options: './src/options.ts',
    popup: './src/popup.ts',
    content: './src/content.ts'
    // Add other entry points if needed
  },

  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },

  resolve: {
    extensions: ['.ts', '.js'],
  },

  plugins: [
    new ExtReloader({
      entries: { 
        contentScript: ['content'],
        background: 'background',
        extensionPage: ['popup', 'options'],
      }
    }),

    new CopyWebpackPlugin({
      patterns: [
        { from: 'public', to: '.' },
      ],
    }),
  ],
};
