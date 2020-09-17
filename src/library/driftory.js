import loadJs from '@dan503/load-js';

let OpenSeadragon;
let osdRequest;

const osdPromise = new Promise((resolve, reject) => {
  osdRequest = { resolve, reject };
});

export default class Driftory {
  constructor(args) {
    this.container = args.container;
    this.frames = [];

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

      const frameIndex = this.getFrameIndex();
      if (foundIndex === frameIndex || foundIndex === -1) {
        this.goToNextFrame();
      } else {
        this.goToFrame(foundIndex);
      }
    });
  }

  openComic(comic) {
    osdPromise.then(() => {
      this.container.style.backgroundColor = comic.body.backgroundColor;
      this.frames = comic.body.frames;

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
    });
  }

  goToFrame(index) {
    var frame = this.frames[index];
    var bufferFactor = 0.2;
    var box = new OpenSeadragon.Rect(
      frame.x - frame.width / 2,
      frame.y - frame.height / 2,
      frame.width,
      frame.height
    );

    box.width *= 1 + bufferFactor;
    box.height *= 1 + bufferFactor;
    box.x -= frame.width * bufferFactor * 0.5;
    box.y -= frame.height * bufferFactor * 0.5;

    this.viewer.viewport.fitBounds(box);
  }

  getFrameIndex() {
    let bestIndex = -1;
    let bestDistance = Infinity;
    const viewportBounds = this.viewer.viewport.getBounds();
    const viewportCenter = viewportBounds.getCenter();

    const itemCount = this.viewer.world.getItemCount();
    for (let i = 0; i < itemCount; i++) {
      const item = this.viewer.world.getItemAt(i);
      const itemBounds = item.getBounds();
      const distance = viewportCenter.squaredDistanceTo(itemBounds.getCenter());
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
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
