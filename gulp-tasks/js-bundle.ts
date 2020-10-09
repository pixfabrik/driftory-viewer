import { task, dest, src } from 'gulp';
import TypeScript from 'gulp-typescript'

var tsDemoSiteProject = TypeScript.createProject({
  outFile: 'demo.js',
  target: 'es5',
  module: 'amd',
  moduleResolution: 'node'
});

var tsNpmProject = TypeScript.createProject({
  target: 'es5',
  module: 'commonjs',
  declaration: true,
  moduleResolution: 'node',
});

task('js:demo-site', function () {
  return src('src/demo/demo.ts')
    .pipe(tsDemoSiteProject())
    .pipe(dest('docs'));
});

task('js:npm-bundle', () => {
  return src('src/library/driftory.ts')
    .pipe(tsNpmProject())
    .pipe(dest('src/library'));
});
