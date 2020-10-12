import { task } from 'gulp';
import del from 'del';

task('clean:demo-site', () => del(['docs/**/*']));
task('clean:npm-bundle', () => del(['src/library/driftory{.js,.d.ts}']));
