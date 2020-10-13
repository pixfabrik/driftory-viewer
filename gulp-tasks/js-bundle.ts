import { task, dest, src } from 'gulp';
import TypeScript from 'gulp-typescript';

import watchify from 'watchify';
import browserify from 'browserify';
import gulp from 'gulp';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import sourcemaps from 'gulp-sourcemaps';
import tsify from 'tsify';

// add custom browserify options here
var customOpts = {
  entries: ['./src/demo/demo.ts'],
  debug: true
};

var opts = Object.assign({}, watchify.args, customOpts);
var b = watchify(browserify(opts));

b.plugin(tsify);

// Browserify was the only bundler that I could get to output browser friendly code
gulp.task('js:demo-site', bundle); // so you can run `gulp js` to build the file
b.on('update', bundle); // on any dep update, runs the bundler
b.on('log', console.log); // output build logs to terminal

function bundle() {
  return (
    b
      .bundle()
      // log errors if they happen
      .on('error', console.error)
      .pipe(source('demo.js'))
      // optional, remove if you don't need to buffer file contents
      .pipe(buffer())
      // optional, remove if you dont want sourcemaps
      .pipe(sourcemaps.init({ loadMaps: true })) // loads map from browserify file
      // Add transformation tasks to the pipeline here.
      .pipe(sourcemaps.write('./')) // writes .map file
      .pipe(gulp.dest('./docs'))
  );
}

var tsNpmProject = TypeScript.createProject({
  target: 'es5',
  module: 'commonjs',
  declaration: true,
  moduleResolution: 'node'
});

task('js:npm-bundle', () => {
  return src('src/library/driftory.ts').pipe(tsNpmProject()).pipe(dest('src/library'));
});
