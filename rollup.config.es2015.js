import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';

export default {
  dest: 'lib/react-apollo-graphql.js',
  entry: 'src/index.js',
  external: ['prop-types', 'react'],
  format: 'es',
  plugins: [
    resolve(),
    babel({
      presets: [
        [
          'env',
          {
            targets: { browsers: { ie: 9, uglify: true } },
            // do not transform to common js modules
            modules: false,
            // disable polyfill transforms
            useBuiltIns: false,
          },
        ],
        'react',
      ],
      plugins: [
        'transform-class-properties',
        // you need to polyfill Object.assign
        ['transform-object-rest-spread', { useBuiltIns: true }],
        'external-helpers',
      ],
      ignore: '**/*.test.js',
      exclude: 'node_modules/**',
    }),
  ],
};
