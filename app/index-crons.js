require('babel-core/register')({
    presets: [require.resolve('babel-preset-es2015-node5'), require.resolve('babel-preset-stage-3')],
});

require('crons/index');
