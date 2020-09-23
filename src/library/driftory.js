import loadJs from '@dan503/load-js';

let OpenSeadragon;
let osdRequest;

const osdPromise = new Promise((resolve, reject) => {
  osdRequest = { resolve, reject };
});

export default class Driftory {
  constructor(args) {
    this.container = args.container;
    this.onFrameChange = args.onFrameChange;
    this.onComicLoad = args.onComicLoad;
    this.frames = [];
    this.frameIndex = -1;
    this.lastScrollTime = 0;
    this.scrollDelay = 2000;

    // TODO: Make this more robust so it handles multiple viewers being created at the same time.
    // Right now they would both load OSD since they would start before the other finished.
    if (OpenSeadragon) {
      this.initialize(args);
    } else {
      loadJs(
        'https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/openseadragon.min.js',
        () => {
          OpenSeadragon = window.OpenSeadragon;
          this.initialize(args);
          osdRequest.resolve();
        }
      );
    }
  }

  initialize({ container, prefixUrl }) {
    this.viewer = OpenSeadragon({
      element: container,
      prefixUrl: prefixUrl,
      showNavigationControl: false,
      maxZoomPixelRatio: 10,
      gestureSettingsMouse: {
        clickToZoom: false,
        scrollToZoom: false
      }
    });

    // TODO: Maybe don't need to do this every frame.
    this.viewer.addHandler('animation', () => {
      const frameIndex = this.figureFrameIndex();
      if (frameIndex !== -1 && frameIndex !== this.frameIndex) {
        this.frameIndex = frameIndex;
        if (this.onFrameChange) {
          this.onFrameChange({ frameIndex, isLastFrame: frameIndex === this.getFrameCount() - 1 });
        }
      }
    });

    this.viewer.addHandler('canvas-click', event => {
      if (!event.quick) {
        return;
      }

      const point = this.viewer.viewport.pointFromPixel(event.position);
      let foundIndex = -1;
      const itemCount = this.viewer.world.getItemCount();
      for (let i = 0; i < itemCount; i++) {
        const item = this.viewer.world.getItemAt(i);
        if (item.getBounds().containsPoint(point)) {
          foundIndex = i;
        }
      }

      if (foundIndex === -1) {
        const realFrameIndex = this.figureFrameIndex();
        if (realFrameIndex === -1) {
          this.goToFrame(this.frameIndex);
        } else {
          this.goToNextFrame();
        }
      } else if (foundIndex === this.frameIndex) {
        this.goToNextFrame();
      } else {
        this.goToFrame(foundIndex);
      }
    });

    this.viewer.addHandler('canvas-scroll', event => {
      // TODO: Stop the browser window from scrolling; this doesn't seem to do it.
      event.originalEvent.preventDefault();
      event.originalEvent.stopPropagation();

      const now = Date.now();
      // console.log(event.scroll, now, now - this.lastScrollTime);
      if (now - this.lastScrollTime < this.scrollDelay) {
        return;
      }

      this.lastScrollTime = now;
      if (event.scroll < 0) {
        this.goToNextFrame();
      } else {
        this.goToPreviousFrame();
      }
    });

    window.addEventListener('keydown', event => {
      if (event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === ' ') {
        this.goToNextFrame();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        this.goToPreviousFrame();
      } else {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    });
  }

  openComic(comic) {
    osdPromise.then(() => {
      this.container.style.backgroundColor = comic.body.backgroundColor;

      if (comic.body.frames) {
        this.frames = comic.body.frames.map(frame => {
          return new OpenSeadragon.Rect(
            frame.x - frame.width / 2,
            frame.y - frame.height / 2,
            frame.width,
            frame.height
          );
        });
      } else {
        this.frames = comic.body.items.map(item => {
          return new OpenSeadragon.Rect(
            item.x - item.width / 2,
            item.y - item.height / 2,
            item.width,
            item.height
          );
        });
      }

      comic.body.items.forEach((item, i) => {
        var success;

        if (i === 0) {
          success = () => this.goToFrame(0);
        }

        this.viewer.addTiledImage({
          x: item.x - item.width / 2,
          y: item.y - item.height / 2,
          width: item.width,
          success: success,
          tileSource: {
            type: 'legacy-image-pyramid',
            levels: [
              {
                url: item.url,
                width: item.width,
                height: item.height
              }
            ]
          }
        });
      });

      if (this.onComicLoad) {
        this.onComicLoad({});
      }
    });
  }

  goToFrame(index) {
    var frame = this.frames[index];
    var bufferFactor = 0.2;
    var box = frame.clone();

    box.width *= 1 + bufferFactor;
    box.height *= 1 + bufferFactor;
    box.x -= frame.width * bufferFactor * 0.5;
    box.y -= frame.height * bufferFactor * 0.5;

    this.viewer.viewport.fitBounds(box);
  }

  getFrameIndex() {
    return this.frameIndex;
  }

  figureFrameIndex() {
    let bestIndex = -1;
    let bestDistance = Infinity;
    const viewportBounds = this.viewer.viewport.getBounds(true);
    const viewportCenter = viewportBounds.getCenter();

    for (let i = 0; i < this.frames.length; i++) {
      const frame = this.frames[i];
      if (frame.containsPoint(viewportCenter)) {
        const distance = viewportCenter.squaredDistanceTo(frame.getCenter());
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }
    }

    return bestIndex;
  }

  getFrameCount() {
    return this.frames.length;
  }

  goToNextFrame() {
    let index = this.getFrameIndex();
    if (index < this.frames.length - 1) {
      this.goToFrame(index + 1);
    }
  }

  goToPreviousFrame() {
    let index = this.getFrameIndex();
    if (index > 0) {
      this.goToFrame(index - 1);
    }
  }
}
