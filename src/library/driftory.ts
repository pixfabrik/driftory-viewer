import loadJs from '@dan503/load-js';
import { mapLinear, clamp } from './util';
import { Comic } from './Comic.types';
import { OpenSeadragonType, ViewerType } from './openseadragon.types';
import normalizeWheel from 'normalize-wheel';

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

// Part of the external API
interface ImageInfo {
  url: string;
  bounds: OpenSeadragon.Rect;
  hideUntilFrame?: number;
  index: number;
  frameFillFactor: number;
}

// Part of the external API
interface FrameInfo {
  images: Array<ImageInfo>;
  bounds: OpenSeadragon.Rect;
}

// Used internally
interface ImageItem {
  url: string;
  bounds: OpenSeadragon.Rect;
  hideUntilFrame?: number;
  tiledImage?: OpenSeadragon.TiledImage;
}

// Used internally
interface FrameImage {
  imageItem: ImageItem;
  imageIndex: number;
  frameFillFactor: number;
}

// Used internally
interface FramePathItem {
  scroll: number;
  point: OpenSeadragon.Point;
  bounds: OpenSeadragon.Rect;
}

type Frame = { images: Array<FrameImage>; bounds: OpenSeadragon.Rect };
type Container = HTMLElement;
type OnFrameChange = (params: { frameIndex: number; isLastFrame: boolean }) => void;
type OnComicLoad = (params: {}) => void;
type OnNoNext = (params: {}) => void;
type OnNoPrevious = (params: {}) => void;

export interface DriftoryArguments {
  /** The HTML DOM element that the Driftory Comic will be rendered in.  */
  container: Container;
  /**
   * This library has a dependency on the [OpenSeadragon](https://openseadragon.github.io/) library.
   *
   * By default, OpenSeadragon will be loaded from [the JS Deliver CDN](https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/openseadragon.min.js)
   * while initializing.
   *
   * To prevent this, you can use this parameter to provide your own instance of OpenSeaDragon instead.
   *  */
  OpenSeadragon?: OpenSeadragonType;
  /** Called whenever driftory navigates to a new frame, whether via clicking, dragging, keys, or API. */
  onFrameChange?: OnFrameChange;
  /** Called when the comic has finished initializing. */
  onComicLoad?: OnComicLoad;
  /** Called when the user tries to navigate to the next frame in the sequence
   *  but there are no frames left to navigate to. */
  onNoNext?: OnNoNext;
  /** Called when the user tries to navigate to the previous frame in the sequence
   *  but there are no frames left to navigate to. */
  onNoPrevious?: OnNoPrevious;
}

const scrollQuantum = 0.05;

export default class Driftory {
  container: Container;
  onFrameChange: OnFrameChange;
  onComicLoad: OnComicLoad;
  onNoNext: OnNoNext;
  onNoPrevious: OnNoPrevious;
  imageItems: Array<ImageItem> = [];
  frames: Array<Frame> = [];
  framePath: Array<FramePathItem> = [];
  frameIndex: number = -1;
  frameIndexHint: number = -1;
  scrollValue: number = 0;
  maxScrollValue: number = 0;
  lastScrollTime: number = 0;
  scrollDelay: number = 2000;
  viewer?: ViewerType;
  navEnabled: boolean = true;
  comicLoaded: boolean = false;
  scroll: any = null;

  // ----------
  constructor(args: DriftoryArguments) {
    this.container = args.container;
    this.onFrameChange = args.onFrameChange || function () {};
    this.onComicLoad = args.onComicLoad || function () {};
    this.onNoNext = args.onNoNext || function () {};
    this.onNoPrevious = args.onNoPrevious || function () {};

    this._animationFrame = this._animationFrame.bind(this);

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
  _initialize({ container }: DriftoryArguments) {
    this.viewer =
      OpenSeadragon &&
      OpenSeadragon({
        element: container,
        showNavigationControl: false,
        maxZoomPixelRatio: 10,
        gestureSettingsMouse: {
          clickToZoom: false
        }
      });

    if (this.viewer) {
      const frameHandler = () => {
        if (!this.comicLoaded) {
          return;
        }

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

        const normalized = normalizeWheel(event.originalEvent as WheelEvent);

        if (!this.scroll || Math.abs(normalized.spinY) > 0.9) {
          const direction = normalized.spinY < 0 ? -1 : 1;

          let target = this.scrollValue + normalized.spinY * 0.5;
          target = direction < 0 ? Math.floor(target) : Math.ceil(target);
          target = clamp(target, 0, this.maxScrollValue);

          this.scroll = {
            direction,
            target,
            time: Date.now()
          };
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

    this._animationFrame();
  }

  /** Render the comic on screen */
  openComic(unsafeComic: Comic | string) {
    if (this.frames.length || this.imageItems.length) {
      this.closeComic();
    }

    const { comic } =
      typeof unsafeComic === 'string' ? (JSON.parse(unsafeComic) as Comic) : unsafeComic;

    osdPromise.then(() => {
      this.container.style.backgroundColor = comic.body.backgroundColor;

      // Get frames
      if (this.viewer) {
        if (comic.body.frames) {
          this.frames = comic.body.frames.map((frame) => {
            return {
              images: [],
              bounds: new OpenSeadragon!.Rect(
                frame.x - frame.width / 2,
                frame.y - frame.height / 2,
                frame.width,
                frame.height
              )
            };
          });
        } else {
          this.frames = comic.body.items.map((item) => {
            return {
              images: [],
              bounds: new OpenSeadragon!.Rect(
                item.x - item.width / 2,
                item.y - item.height / 2,
                item.width,
                item.height
              )
            };
          });
        }

        // Make frame path
        this.framePath = [];
        let scroll = 0;
        this.frames.forEach((frame) => {
          const point = frame.bounds.getCenter();
          const bounds = this._getBoundsForFrame(frame);

          this.framePath.push({
            scroll,
            point,
            bounds
          });

          this.maxScrollValue = scroll;
          scroll++;
        });

        // Get image items
        comic.body.items.forEach((item, i) => {
          const imageItem: ImageItem = {
            url: item.url,
            bounds: new OpenSeadragon!.Rect(
              item.x - item.width / 2,
              item.y - item.height / 2,
              item.width,
              item.height
            ),
            hideUntilFrame: item.hideUntilFrame
          };

          this.imageItems.push(imageItem);

          this.viewer?.addTiledImage({
            preload: true,
            x: imageItem.bounds.x,
            y: imageItem.bounds.y,
            width: imageItem.bounds.width,
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

        this.frames.forEach((frame, frameIndex) => {
          const frameArea = frame.bounds.width * frame.bounds.height;

          this.imageItems.forEach((imageItem, imageIndex) => {
            if (!imageItem.hideUntilFrame || imageItem.hideUntilFrame <= frameIndex) {
              const intersection = frame.bounds.intersection(imageItem.bounds);
              if (intersection) {
                const area = intersection.width * intersection.height;

                frame.images.push({ imageItem, imageIndex, frameFillFactor: area / frameArea });
              }
            }
          });

          // Sort primary image first, based on how much it fills the frame. On a tie, prefer later images.
          // TODO: Account for images hidden under other images better.
          frame.images.sort((a, b) => {
            if (a.frameFillFactor > b.frameFillFactor) {
              return -1;
            }

            if (a.frameFillFactor < b.frameFillFactor) {
              return 1;
            }

            if (a.imageIndex > b.imageIndex) {
              return -1;
            }

            if (a.imageIndex < b.imageIndex) {
              return 1;
            }

            return 0;
          });
        });
      }
    });
  }

  /** Remove the comic from the screen */
  closeComic() {
    this.imageItems = [];
    this.frames = [];
    this.framePath = [];
    this.frameIndex = -1;
    this.frameIndexHint = -1;
    this.scrollValue = 0;
    this.maxScrollValue = 0;
    this.lastScrollTime = 0;
    this.comicLoaded = false;
    this.viewer?.close();
  }

  // ----------
  _startComic() {
    this.comicLoaded = true;
    this.scrollValue = 0;
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
  _animationFrame() {
    requestAnimationFrame(this._animationFrame);

    if (this.scroll) {
      const epsilon = 0.00001;
      let amount = Math.abs(this.scroll.target - this.scrollValue) * 0.1;
      amount = Math.max(amount, epsilon);
      amount = Math.min(amount, scrollQuantum) * this.scroll.direction;
      this.scrollValue += amount;

      if (this.scroll.direction > 0) {
        if (this.scrollValue >= this.scroll.target - epsilon) {
          this.scrollValue = this.scroll.target;
        }
      } else {
        if (this.scrollValue <= this.scroll.target + epsilon) {
          this.scrollValue = this.scroll.target;
        }
      }

      this._updateForScrollValue(this.scroll.direction);

      const timeDiff = Date.now() - this.scroll.time;
      // console.log(timeDiff, this.scrollValue, this.scroll.target);
      if (this.scrollValue === this.scroll.target && timeDiff > 20) {
        delete this.scroll;
      }
    }
  }

  // ----------
  _updateForScrollValue(direction: number) {
    if (this.viewer) {
      for (let i = 0; i < this.framePath.length - 1; i++) {
        const a = this.framePath[i];
        const b = this.framePath[i + 1];
        if (this.scrollValue >= a.scroll && this.scrollValue <= b.scroll) {
          let newFrameIndex;
          if (direction > 0) {
            newFrameIndex = this.scrollValue === a.scroll ? i : i + 1;
          } else {
            newFrameIndex = this.scrollValue === b.scroll ? i + 1 : i;
          }

          this.frameIndexHint = newFrameIndex;

          const factor = mapLinear(this.scrollValue, a.scroll, b.scroll, 0, 1);

          const newBounds = new OpenSeadragon!.Rect(
            mapLinear(factor, 0, 1, a.bounds.x, b.bounds.x),
            mapLinear(factor, 0, 1, a.bounds.y, b.bounds.y),
            mapLinear(factor, 0, 1, a.bounds.width, b.bounds.width),
            mapLinear(factor, 0, 1, a.bounds.height, b.bounds.height)
          );

          this.viewer.viewport.fitBounds(newBounds, true);

          break;
        }
      }
    }
  }

  /** Determine if the frame navigation controls are currently able to be used to navigate */
  getNavEnabled() {
    return this.navEnabled;
  }

  /** Enable / Disable frame navigation controls */
  setNavEnabled(flag: boolean) {
    this.navEnabled = flag;
    this.viewer?.setMouseNavEnabled(flag);
  }

  /** Navigate to a specific frame via its index number */
  goToFrame(index: number) {
    if (this.getFrameIndex() !== index) {
      var frame = this.frames[index];
      if (frame) {
        this.frameIndexHint = index;

        var box = this._getBoundsForFrame(frame);
        this.viewer?.viewport.fitBounds(box);
      }
    }
  }

  // ----------
  _getBoundsForFrame(frame: Frame) {
    var bufferFactor = 0.2;
    var box = frame.bounds.clone();

    box.width *= 1 + bufferFactor;
    box.height *= 1 + bufferFactor;
    box.x -= frame.bounds.width * bufferFactor * 0.5;
    box.y -= frame.bounds.height * bufferFactor * 0.5;
    return box;
  }

  /** Get the currently active frame index. This will be whatever frame is in the middle of the
  screen. If there is no frame in the middle, it'll be whatever frame the user last had there. */
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
        const bounds = frame.bounds;

        if (bounds.containsPoint(viewportCenter)) {
          let distance;
          if (this.frameIndexHint === -1) {
            distance = viewportCenter.squaredDistanceTo(bounds.getCenter());
          } else {
            distance = Math.abs(this.frameIndexHint - i);
          }

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
        const bounds = frame.bounds;

        if (bounds.containsPoint(point)) {
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

  /** Return the total number of frames found in the comic sequence */
  getFrameCount() {
    return this.frames.length;
  }

  /** Return an object with information about the frame at the specified index */
  getFrame(frameIndex: number): FrameInfo | null {
    const frame = this.frames[frameIndex];
    if (!frame) {
      return null;
    }

    return {
      bounds: frame.bounds.clone(),
      images: frame.images.map((frameImage) => {
        const imageItem = frameImage.imageItem;

        return {
          url: imageItem.url,
          bounds: imageItem.bounds.clone(),
          hideUntilFrame: imageItem.hideUntilFrame,
          frameFillFactor: frameImage.frameFillFactor,
          index: frameImage.imageIndex
        };
      })
    };
  }

  /** Return the total number of images found in the comic */
  getImageCount() {
    return this.imageItems.length;
  }

  /** Navigate to the next frame in the sequence */
  goToNextFrame() {
    let index = this.getFrameIndex();
    if (index < this.frames.length - 1) {
      this.goToFrame(index + 1);
    } else {
      this.onNoNext({});
    }
  }

  /** Navigate to the previous frame in the sequence */
  goToPreviousFrame() {
    let index = this.getFrameIndex();
    if (index > 0) {
      this.goToFrame(index - 1);
    } else {
      this.onNoPrevious({});
    }
  }
}
