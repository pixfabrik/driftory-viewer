import { task, series, src, dest } from 'gulp';

task('copy:demo-site', () => {
  return src(['src/demo/**/*', '!src/demo/**/*.ts']).pipe(dest('./docs'));
});

task('copy:library', () => {
  return src(['src/library/**/*.types.ts']).pipe(dest('./dist'));
});
