module.exports = {
  presets: ['@babel/preset-env', '@babel/preset-typescript'],
  plugins: [
    [
      require.resolve('babel-plugin-module-resolver'),
      {
        root: './src',
        extensions: ['.ts'],
      },
    ],
  ],
}
