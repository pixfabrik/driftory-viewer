import loadJs from '@dan503/load-js';

let OpenSeadragon;

export default class Driftory {
  constructor(args) {
    loadJs(
      'https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/openseadragon.min.js',
      () => {
        OpenSeadragon = window.OpenSeadragon;
        this.initialize(args);
      }
    );
  }

  initialize({ container, prefixUrl }) {
    this.container = container;
    this.frameIndex = -1;
    this.frames = [];

    this.viewer = OpenSeadragon({
      element: container,
      prefixUrl: prefixUrl,
      showNavigationControl: false,
      maxZoomPixelRatio: 10
    });
  }

  openComic(comic) {
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
    this.frameIndex = index;
  }

  getFrameIndex() {
    return this.frameIndex;
  }

  getFrameCount() {
    return this.frames.length;
  }
}
