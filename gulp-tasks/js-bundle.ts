import { task, dest } from 'gulp';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import rollup from '@rollup/stream';

// *Optional* Depends on what JS features you want vs what browsers you need to support
// *Not needed* for basic ES6 module import syntax support
import babel from '@rollup/plugin-babel';

// Add support for require() syntax
import commonjs from '@rollup/plugin-commonjs';

// Add support for importing from node_modules folder like import x from 'module-name'
import nodeResolve from '@rollup/plugin-node-resolve';

// Cache needs to be initialized outside of the Gulp task
let cache: any = null;

task('js:demo-site', () => {
  return (
    rollup({
      // Point to the entry file
      input: './src/demo/demo.js',

      // Apply plugins
      plugins: [
        babel({ babelHelpers: 'bundled', presets: ['@babel/preset-env'] }),
        commonjs(),
        nodeResolve()
      ],

      // Use cache for better performance
      cache: cache,
      output: {
        // Output bundle is intended for use in browsers
        // (iife = immediately invoked function expression)
        format: 'iife',

        // Show source code when debugging in browser
        sourcemap: true
      }
    })
      .on('bundle', (bundle) => {
        // Update cache data after every bundle is created
        cache = bundle;
      })
      // Name of the output file.
      .pipe(source('demo.js'))
      .pipe(buffer())

      // Where to send the output file
      .pipe(dest('./docs'))
  );
});

task('js:npm-bundle', () => {
  return (
    rollup({
      // Point to the entry file
      input: './src/library/driftory.js',

      // Apply plugins
      plugins: [
        babel({ babelHelpers: 'bundled', presets: ['@babel/preset-env'] }),
        commonjs(),
        nodeResolve()
      ],

      output: {
        // Output bundle is intended for use in both node and the browser
        // (umd = Universal Module Definition)
        format: 'umd',

        // Determines the global variable name when imported into browsers directly
        name: 'Driftory',

        // Show source code when debugging in browser
        sourcemap: true
      }
    })
      // Name of the output file.
      .pipe(source('index.js'))
      .pipe(buffer())

      // Where to send the output file
      .pipe(dest('.'))
  );
});
