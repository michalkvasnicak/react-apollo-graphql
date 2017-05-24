import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';
import visualizer from 'rollup-plugin-visualizer';

const isProduction = process.env.PRODUCTION;
const targets = isProduction
  ? [{ dest: 'dist/react-apollo-graphql.min.js', format: 'umd' }]
  : [
      {
        dest: 'dist/react-apollo-graphql.es.js',
        format: 'es',
      },
      {
        dest: 'dist/react-apollo-graphql.js',
        format: 'umd',
      },
    ];

export default {
  globals: { react: 'React', 'prop-types': 'PropTypes' },
  entry: 'src/index.js',
  external: ['prop-types', 'react'],
  exports: 'named',
  moduleName: 'GraphQL',
  targets,
  plugins: [
    nodeResolve(),
    commonjs(),
    babel({
      babelrc: false,
      presets: [
        [
          'env',
          {
            modules: false,
            loose: true,
          },
        ],
        'react',
      ],
      plugins: [
        !isProduction && 'flow-react-proptypes',
        isProduction && 'transform-react-remove-prop-types',
        'transform-flow-strip-types',
        'transform-class-properties',
        'transform-object-rest-spread',
        'external-helpers',
      ].filter(Boolean),
      ignore: '**/*.test.js',
      exclude: 'node_modules/**',
    }),
    isProduction && uglify(),
    isProduction && visualizer({ filename: './bundle-stats.html' }),
  ].filter(Boolean),
};
