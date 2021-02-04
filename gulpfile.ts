import { task, parallel, series } from 'gulp';

import './gulp-tasks/clean';
import './gulp-tasks/copy';
import './gulp-tasks/js-bundle';
import './gulp-tasks/serve';
import './gulp-tasks/watch';

task(
  'demo-site',
  series(
    'clean:demo-site',
    parallel('js:demo-site', 'copy:demo-site', 'watch:demo-site'),
    'serve:demo-site'
  )
);

task('npm-bundle', parallel('copy:library', 'js:npm-bundle', 'js:npm-bundle-util'));
