import { task, watch, series, parallel } from 'gulp';
import { reload } from './serve';

task('watch:demo-site:js', (done) => {
  watch(['./src/**/*.js'], series('js:demo-site', reload));
  done();
});

task('watch:demo-site:other', (done) => {
  watch(['src/demo/**/*', '!src/demo/**/*.js'], series('copy:demo-site', reload));
  done();
});

task('watch:demo-site', parallel('watch:demo-site:js', 'watch:demo-site:other'));
