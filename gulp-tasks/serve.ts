import { task, } from 'gulp';
import { create } from 'browser-sync';

// Create a new browserSync instance
export const browserSync = create();

export const reload = (done: () => void) => {
  browserSync.reload();
  done();
};

// BrowserSync
task('serve:demo-site', () => {
  browserSync.init({
    open: 'local',
    port: 3000,
    server: {
      baseDir: './docs'
    }
  });
});
