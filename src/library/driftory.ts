import loadJs from '@dan503/load-js';
import { Comic } from './Comic.types';
export * from './Comic.types';
export * from './openseadragon.types';
import { OpenSeadragonType, ViewerType } from './openseadragon.types';

interface OsdRequest {
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}

let OpenSeadragon: OpenSeadragonType | undefined;
let osdRequest: OsdRequest | undefined;

declare global {
  interface Window {
    OpenSeadragon: OpenSeadragonType;
  }
}

const osdPromise = new Promise((resolve, reject) => {
  osdRequest = { resolve, reject };
});

interface ImageItem {
  hideUntilFrame?: number;
  tiledImage?: OpenSeadragon.TiledImage;
}

type Frame = OpenSeadragon.Rect;
type Container = HTMLElement;
type OnFrameChange = (params: { frameIndex: number; isLastFrame: boolean }) => void;
type OnComicLoad = (params: {}) => void;
type OnNoNext = (params: {}) => void;
type OnNoPrevious = (params: {}) => void;

interface DriftoryArguments {
  container: Container;
  OpenSeadragon?: OpenSeadragonType;
  onFrameChange?: OnFrameChange;
  onComicLoad?: OnComicLoad;
  onNoNext?: OnNoNext;
  onNoPrevious?: OnNoPrevious;
  prefixUrl?: string;
}

export default class Driftory {
  container: Container;
  onFrameChange: OnFrameChange;
  onComicLoad: OnComicLoad;
  onNoNext: OnNoNext;
  onNoPrevious: OnNoPrevious;
  imageItems: Array<ImageItem> = [];
  frames: Array<Frame> = [];
  frameIndex: number = -1;
  frameIndexHint: number = -1;
  lastScrollTime: number = 0;
  scrollDelay: number = 2000;
  viewer?: ViewerType;
  navEnabled: boolean = true;

  // ----------
  constructor(args: DriftoryArguments) {
    this.container = args.container;
    this.onFrameChange = args.onFrameChange || function () {};
    this.onComicLoad = args.onComicLoad || function () {};
    this.onNoNext = args.onNoNext || function () {};
    this.onNoPrevious = args.onNoPrevious || function () {};

    if (args.OpenSeadragon) {
      OpenSeadragon = args.OpenSeadragon;
      this._initialize(args);
      osdRequest?.resolve();
    } else {
      // Note: loadJs only loads the file once, even if called multiple times, and always makes sure
      // all of the callbacks are called.
      loadJs(
        'https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/openseadragon.min.js',
        () => {
          OpenSeadragon = window.OpenSeadragon;
          this._initialize(args);
          osdRequest?.resolve();
        }
      );
    }
  }

  // ----------
  _initialize({ container, prefixUrl }: DriftoryArguments) {
    this.viewer =
      OpenSeadragon &&
      OpenSeadragon({
        element: container,
        prefixUrl: prefixUrl,
        showNavigationControl: false,
        maxZoomPixelRatio: 10,
        gestureSettingsMouse: {
          clickToZoom: false
        }
      });

    if (this.viewer) {
      this.viewer.addHandler('canvas-click', (event) => {
        if (!event || !event.quick || !event.position || !this.viewer || !this.navEnabled) {
          return;
        }

        const point = this.viewer.viewport.pointFromPixel(event.position);
        let foundIndex = this._getHitFrame(point);
        if (foundIndex === -1) {
          const realFrameIndex = this._figureFrameIndex(true);
          if (realFrameIndex === -1 && this.frameIndex !== undefined) {
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

      const originalScrollHandler = this.viewer.innerTracker.scrollHandler;
      this.viewer.innerTracker.scrollHandler = (event) => {
        if (!this.navEnabled) {
          // Returning false stops the browser from scrolling itself.
          return false;
        }

        if (
          event.originalEvent.ctrlKey ||
          event.originalEvent.altKey ||
          event.originalEvent.metaKey
        ) {
          return originalScrollHandler.call(this.viewer?.innerTracker, event);
        }

        const now = Date.now();
        // console.log(event.scroll, now, now - this.lastScrollTime);
        if (now - this.lastScrollTime < this.scrollDelay) {
          // Returning false stops the browser from scrolling itself.
          return false;
        }

        this.lastScrollTime = now;
        if (event.scroll < 0) {
          this.goToNextFrame();
        } else {
          this.goToPreviousFrame();
        }

        // Returning false stops the browser from scrolling itself.
        return false;
      };

      window.addEventListener('keydown', (event) => {
        if (event.altKey || event.shiftKey || event.ctrlKey || event.metaKey || !this.navEnabled) {
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
  }

  // ----------
  openComic(unsafeComic: Comic | string) {
    if (this.frames.length || this.imageItems.length) {
      console.error(
        'Currently the Driftory viewer is not set up to load a second comic after the first.'
      );

      return;
    }

    const { comic } =
      typeof unsafeComic === 'string' ? (JSON.parse(unsafeComic) as Comic) : unsafeComic;

    osdPromise.then(() => {
      this.container.style.backgroundColor = comic.body.backgroundColor;

      if (this.viewer) {
        if (comic.body.frames) {
          this.frames = comic.body.frames.map((frame) => {
            return new OpenSeadragon!.Rect(
              frame.x - frame.width / 2,
              frame.y - frame.height / 2,
              frame.width,
              frame.height
            );
          });
        } else {
          this.frames = comic.body.items.map((item) => {
            return new OpenSeadragon!.Rect(
              item.x - item.width / 2,
              item.y - item.height / 2,
              item.width,
              item.height
            );
          });
        }

        comic.body.items.forEach((item, i) => {
          const imageItem: ImageItem = {
            hideUntilFrame: item.hideUntilFrame
          };

          this.imageItems.push(imageItem);

          this.viewer?.addTiledImage({
            preload: true,
            x: item.x - item.width / 2,
            y: item.y - item.height / 2,
            width: item.width,
            success: (event: any) => {
              imageItem.tiledImage = event.item as OpenSeadragon.TiledImage;
              this._updateImageVisibility();

              if (i === 0) {
                this._startComic();
              }
            },
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
    });
  }

  // ----------
  _startComic() {
    if (this.viewer) {
      const frameHandler = () => {
        const frameIndex = this._figureFrameIndex(false);
        if (frameIndex !== -1 && frameIndex !== this.frameIndex) {
          this.frameIndex = frameIndex;
          this._updateImageVisibility();

          if (this.onFrameChange) {
            this.onFrameChange({
              frameIndex,
              isLastFrame: frameIndex === this.getFrameCount() - 1
            });
          }
        }
      };

      this.viewer.addHandler('zoom', frameHandler);
      this.viewer.addHandler('pan', frameHandler);
    }

    this.goToFrame(0);

    if (this.onComicLoad) {
      this.onComicLoad({});
    }
  }

  // ----------
  _updateImageVisibility() {
    this.imageItems.forEach((imageItem) => {
      if (imageItem.hideUntilFrame !== undefined) {
        imageItem.tiledImage?.setOpacity(this.frameIndex < imageItem.hideUntilFrame ? 0 : 1);
      }
    });
  }

  // ----------
  getNavEnabled() {
    return this.navEnabled;
  }

  // ----------
  setNavEnabled(flag: boolean) {
    this.navEnabled = flag;
    this.viewer?.setMouseNavEnabled(flag);
  }

  // ----------
  goToFrame(index: number) {
    if (this.getFrameIndex() !== index) {
      var frame = this.frames[index];
      var bufferFactor = 0.2;
      if (frame) {
        this.frameIndexHint = index;

        var box = frame.clone();

        box.width *= 1 + bufferFactor;
        box.height *= 1 + bufferFactor;
        box.x -= frame.width * bufferFactor * 0.5;
        box.y -= frame.height * bufferFactor * 0.5;

        this.viewer?.viewport.fitBounds(box);
      }
    }
  }

  // ----------
  getFrameIndex() {
    return this.frameIndex;
  }

  // ----------
  _figureFrameIndex(current: boolean) {
    let bestIndex = -1;
    let bestDistance = Infinity;
    if (this.viewer) {
      const viewportBounds = this.viewer.viewport.getBounds(current);
      const viewportCenter = viewportBounds.getCenter();

      for (let i = 0; i < this.frames.length; i++) {
        const frame = this.frames[i];
        if (frame.containsPoint(viewportCenter)) {
          if (this.frameIndexHint === i) {
            bestIndex = i;
            break;
          }

          const distance = viewportCenter.squaredDistanceTo(frame.getCenter());
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = i;
          }
        }
      }
    }

    return bestIndex;
  }

  // ----------
  _getHitFrame(point: OpenSeadragon.Point) {
    let bestIndex = -1;

    if (this.viewer) {
      for (let i = 0; i < this.frames.length; i++) {
        const frame = this.frames[i];
        if (frame.containsPoint(point)) {
          if (this.frameIndex === i) {
            bestIndex = i;
            break;
          }

          if (bestIndex === -1) {
            bestIndex = i;
          }
        }
      }
    }

    return bestIndex;
  }

  // ----------
  getFrameCount() {
    return this.frames.length;
  }

  // ----------
  goToNextFrame() {
    let index = this.getFrameIndex();
    if (index < this.frames.length - 1) {
      this.goToFrame(index + 1);
    } else {
      this.onNoNext({});
    }
  }

  // ----------
  goToPreviousFrame() {
    let index = this.getFrameIndex();
    if (index > 0) {
      this.goToFrame(index - 1);
    } else {
      this.onNoPrevious({});
    }
  }
}
