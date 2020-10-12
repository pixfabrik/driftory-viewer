import { task, watch, series, parallel } from 'gulp';
import { reload } from './serve';

task('watch:demo-site:js', (done) => {
  watch(['./src/**/*.ts'], series('js:demo-site', reload));
  done();
});

task('watch:demo-site:other', (done) => {
  watch(['src/demo/**/*', '!src/demo/**/*.ts'], series('copy:demo-site', reload));
  done();
});

task('watch:demo-site', parallel('watch:demo-site:js', 'watch:demo-site:other'));
