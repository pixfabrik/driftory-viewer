import { task, series, src, dest } from 'gulp';

task('copy:demo-site:other', () => {
  return src(['src/demo/**/*', '!src/demo/**/*.js']).pipe(dest('./docs'));
});

task('copy:demo-site', series('copy:demo-site:other'));
