(function () {
  'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function getDefaultExportFromCjs (x) {
  	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
  }

  function createCommonjsModule(fn, basedir, module) {
  	return module = {
  	  path: basedir,
  	  exports: {},
  	  require: function (path, base) {
        return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
      }
  	}, fn(module, module.exports), module.exports;
  }

  function commonjsRequire () {
  	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
  }

  var loadJs = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var alreadyCalledSources = [];
  var awaitingCallbacks = {};

  var addCallback = function addCallback(src, callback) {
    if (awaitingCallbacks[src]) {
      awaitingCallbacks[src].push(callback);
    } else {
      awaitingCallbacks[src] = [callback];
    }
  };

  function loadJS(src, callback) {
    if (alreadyCalledSources.indexOf(src) < 0) {
      alreadyCalledSources.push(src);
      var script = document.createElement('script');
      script.src = src;

      script.onload = function () {
        addCallback(src, callback);

        for (var key in awaitingCallbacks) {
          awaitingCallbacks[key].forEach(function (cb) {
            return cb();
          });
        }
      };

      document.head.appendChild(script);
    } else {
      addCallback(src, callback);
    }
  }

  exports["default"] = loadJS;
  });

  var loadJs$1 = /*@__PURE__*/getDefaultExportFromCjs(loadJs);

  var OpenSeadragon;
  var osdRequest;
  var osdPromise = new Promise(function (resolve, reject) {
    osdRequest = {
      resolve: resolve,
      reject: reject
    };
  });

  var Driftory = /*#__PURE__*/function () {
    function Driftory(args) {
      var _this = this;

      _classCallCheck(this, Driftory);

      this.container = args.container;
      this.onFrameChange = args.onFrameChange;
      this.onComicLoad = args.onComicLoad;
      this.frames = [];
      this.frameIndex = -1;
      this.lastScrollTime = 0;
      this.scrollDelay = 2000; // TODO: Make this more robust so it handles multiple viewers being created at the same time.
      // Right now they would both load OSD since they would start before the other finished.

      if (OpenSeadragon) {
        this.initialize(args);
      } else {
        loadJs$1('https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/openseadragon.min.js', function () {
          OpenSeadragon = window.OpenSeadragon;

          _this.initialize(args);

          osdRequest.resolve();
        });
      }
    }

    _createClass(Driftory, [{
      key: "initialize",
      value: function initialize(_ref) {
        var _this2 = this;

        var container = _ref.container,
            prefixUrl = _ref.prefixUrl;
        this.viewer = OpenSeadragon({
          element: container,
          prefixUrl: prefixUrl,
          showNavigationControl: false,
          maxZoomPixelRatio: 10,
          gestureSettingsMouse: {
            clickToZoom: false
          }
        }); // TODO: Maybe don't need to do this every frame.

        this.viewer.addHandler('animation', function () {
          var frameIndex = _this2.figureFrameIndex();

          if (frameIndex !== -1 && frameIndex !== _this2.frameIndex) {
            _this2.frameIndex = frameIndex;

            if (_this2.onFrameChange) {
              _this2.onFrameChange({
                frameIndex: frameIndex,
                isLastFrame: frameIndex === _this2.getFrameCount() - 1
              });
            }
          }
        });
        this.viewer.addHandler('canvas-click', function (event) {
          if (!event.quick) {
            return;
          }

          var point = _this2.viewer.viewport.pointFromPixel(event.position);

          var foundIndex = -1;

          var itemCount = _this2.viewer.world.getItemCount();

          for (var i = 0; i < itemCount; i++) {
            var item = _this2.viewer.world.getItemAt(i);

            if (item.getBounds().containsPoint(point)) {
              foundIndex = i;
            }
          }

          if (foundIndex === -1) {
            var realFrameIndex = _this2.figureFrameIndex();

            if (realFrameIndex === -1) {
              _this2.goToFrame(_this2.frameIndex);
            } else {
              _this2.goToNextFrame();
            }
          } else if (foundIndex === _this2.frameIndex) {
            _this2.goToNextFrame();
          } else {
            _this2.goToFrame(foundIndex);
          }
        });
        var originalScrollHandler = this.viewer.innerTracker.scrollHandler;

        this.viewer.innerTracker.scrollHandler = function (event) {
          if (event.originalEvent.ctrlKey || event.originalEvent.altKey || event.originalEvent.metaKey) {
            return originalScrollHandler.call(_this2.viewer.innerTracker, event);
          }

          var now = Date.now(); // console.log(event.scroll, now, now - this.lastScrollTime);

          if (now - _this2.lastScrollTime < _this2.scrollDelay) {
            // Returning false stops the browser from scrolling itself.
            return false;
          }

          _this2.lastScrollTime = now;

          if (event.scroll < 0) {
            _this2.goToNextFrame();
          } else {
            _this2.goToPreviousFrame();
          } // Returning false stops the browser from scrolling itself.


          return false;
        };

        window.addEventListener('keydown', function (event) {
          if (event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) {
            return;
          }

          if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === ' ') {
            _this2.goToNextFrame();
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            _this2.goToPreviousFrame();
          } else {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
        });
      }
    }, {
      key: "openComic",
      value: function openComic(comic) {
        var _this3 = this;

        osdPromise.then(function () {
          _this3.container.style.backgroundColor = comic.body.backgroundColor;

          if (comic.body.frames) {
            _this3.frames = comic.body.frames.map(function (frame) {
              return new OpenSeadragon.Rect(frame.x - frame.width / 2, frame.y - frame.height / 2, frame.width, frame.height);
            });
          } else {
            _this3.frames = comic.body.items.map(function (item) {
              return new OpenSeadragon.Rect(item.x - item.width / 2, item.y - item.height / 2, item.width, item.height);
            });
          }

          comic.body.items.forEach(function (item, i) {
            var success;

            if (i === 0) {
              success = function success() {
                return _this3.goToFrame(0);
              };
            }

            _this3.viewer.addTiledImage({
              x: item.x - item.width / 2,
              y: item.y - item.height / 2,
              width: item.width,
              success: success,
              tileSource: {
                type: 'legacy-image-pyramid',
                levels: [{
                  url: item.url,
                  width: item.width,
                  height: item.height
                }]
              }
            });
          });

          if (_this3.onComicLoad) {
            _this3.onComicLoad({});
          }
        });
      }
    }, {
      key: "goToFrame",
      value: function goToFrame(index) {
        var frame = this.frames[index];
        var bufferFactor = 0.2;
        var box = frame.clone();
        box.width *= 1 + bufferFactor;
        box.height *= 1 + bufferFactor;
        box.x -= frame.width * bufferFactor * 0.5;
        box.y -= frame.height * bufferFactor * 0.5;
        this.viewer.viewport.fitBounds(box);
      }
    }, {
      key: "getFrameIndex",
      value: function getFrameIndex() {
        return this.frameIndex;
      }
    }, {
      key: "figureFrameIndex",
      value: function figureFrameIndex() {
        var bestIndex = -1;
        var bestDistance = Infinity;
        var viewportBounds = this.viewer.viewport.getBounds(true);
        var viewportCenter = viewportBounds.getCenter();

        for (var i = 0; i < this.frames.length; i++) {
          var frame = this.frames[i];

          if (frame.containsPoint(viewportCenter)) {
            var distance = viewportCenter.squaredDistanceTo(frame.getCenter());

            if (distance < bestDistance) {
              bestDistance = distance;
              bestIndex = i;
            }
          }
        }

        return bestIndex;
      }
    }, {
      key: "getFrameCount",
      value: function getFrameCount() {
        return this.frames.length;
      }
    }, {
      key: "goToNextFrame",
      value: function goToNextFrame() {
        var index = this.getFrameIndex();

        if (index < this.frames.length - 1) {
          this.goToFrame(index + 1);
        }
      }
    }, {
      key: "goToPreviousFrame",
      value: function goToPreviousFrame() {
        var index = this.getFrameIndex();

        if (index > 0) {
          this.goToFrame(index - 1);
        }
      }
    }]);

    return Driftory;
  }();

  document.addEventListener('DOMContentLoaded', function () {
    var nextButton = document.querySelector('.next-button');
    var previousButton = document.querySelector('.previous-button');
    var frameInfo = document.querySelector('.frame-info');
    var driftory = new Driftory({
      container: document.querySelector('.driftory-viewer-container'),
      prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/images/',
      onComicLoad: function onComicLoad() {
        console.log('loaded!');
      },
      onFrameChange: function onFrameChange(_ref) {
        var frameIndex = _ref.frameIndex,
            isLastFrame = _ref.isLastFrame;
        var text = "Frame ".concat(frameIndex + 1);

        if (isLastFrame) {
          text += ' (last frame!)';
        }

        frameInfo.textContent = text;
      }
    });
    nextButton.addEventListener('click', function () {
      driftory.goToNextFrame();
    });
    previousButton.addEventListener('click', function () {
      driftory.goToPreviousFrame();
    });
    fetch('comic.json').then(function (response) {
      if (!response.ok) {
        console.error(response);
        throw new Error('Failed to load comic.json');
      }

      return response.json();
    }).then(function (json) {
      // console.log(json);
      driftory.openComic(json.comic);
    })["catch"](function (error) {
      return console.error(error);
    });
  });

}());

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVtby5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL0BkYW41MDMvbG9hZC1qcy9pbmRleC5qcyIsInNyYy9saWJyYXJ5L2RyaWZ0b3J5LmpzIiwic3JjL2RlbW8vZGVtby5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG52YXIgYWxyZWFkeUNhbGxlZFNvdXJjZXMgPSBbXTtcclxudmFyIGF3YWl0aW5nQ2FsbGJhY2tzID0ge307XHJcbnZhciBhZGRDYWxsYmFjayA9IGZ1bmN0aW9uIChzcmMsIGNhbGxiYWNrKSB7XHJcbiAgICBpZiAoYXdhaXRpbmdDYWxsYmFja3Nbc3JjXSkge1xyXG4gICAgICAgIGF3YWl0aW5nQ2FsbGJhY2tzW3NyY10ucHVzaChjYWxsYmFjayk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBhd2FpdGluZ0NhbGxiYWNrc1tzcmNdID0gW2NhbGxiYWNrXTtcclxuICAgIH1cclxufTtcclxuZnVuY3Rpb24gbG9hZEpTKHNyYywgY2FsbGJhY2spIHtcclxuICAgIGlmIChhbHJlYWR5Q2FsbGVkU291cmNlcy5pbmRleE9mKHNyYykgPCAwKSB7XHJcbiAgICAgICAgYWxyZWFkeUNhbGxlZFNvdXJjZXMucHVzaChzcmMpO1xyXG4gICAgICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcclxuICAgICAgICBzY3JpcHQuc3JjID0gc3JjO1xyXG4gICAgICAgIHNjcmlwdC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGFkZENhbGxiYWNrKHNyYywgY2FsbGJhY2spO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gYXdhaXRpbmdDYWxsYmFja3MpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0aW5nQ2FsbGJhY2tzW2tleV0uZm9yRWFjaChmdW5jdGlvbiAoY2IpIHsgcmV0dXJuIGNiKCk7IH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHNjcmlwdCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBhZGRDYWxsYmFjayhzcmMsIGNhbGxiYWNrKTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLmRlZmF1bHQgPSBsb2FkSlM7XHJcbiIsImltcG9ydCBsb2FkSnMgZnJvbSAnQGRhbjUwMy9sb2FkLWpzJztcclxuXHJcbmxldCBPcGVuU2VhZHJhZ29uO1xyXG5sZXQgb3NkUmVxdWVzdDtcclxuXHJcbmNvbnN0IG9zZFByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgb3NkUmVxdWVzdCA9IHsgcmVzb2x2ZSwgcmVqZWN0IH07XHJcbn0pO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRHJpZnRvcnkge1xyXG4gIGNvbnN0cnVjdG9yKGFyZ3MpIHtcclxuICAgIHRoaXMuY29udGFpbmVyID0gYXJncy5jb250YWluZXI7XHJcbiAgICB0aGlzLm9uRnJhbWVDaGFuZ2UgPSBhcmdzLm9uRnJhbWVDaGFuZ2U7XHJcbiAgICB0aGlzLm9uQ29taWNMb2FkID0gYXJncy5vbkNvbWljTG9hZDtcclxuICAgIHRoaXMuZnJhbWVzID0gW107XHJcbiAgICB0aGlzLmZyYW1lSW5kZXggPSAtMTtcclxuICAgIHRoaXMubGFzdFNjcm9sbFRpbWUgPSAwO1xyXG4gICAgdGhpcy5zY3JvbGxEZWxheSA9IDIwMDA7XHJcblxyXG4gICAgLy8gVE9ETzogTWFrZSB0aGlzIG1vcmUgcm9idXN0IHNvIGl0IGhhbmRsZXMgbXVsdGlwbGUgdmlld2VycyBiZWluZyBjcmVhdGVkIGF0IHRoZSBzYW1lIHRpbWUuXHJcbiAgICAvLyBSaWdodCBub3cgdGhleSB3b3VsZCBib3RoIGxvYWQgT1NEIHNpbmNlIHRoZXkgd291bGQgc3RhcnQgYmVmb3JlIHRoZSBvdGhlciBmaW5pc2hlZC5cclxuICAgIGlmIChPcGVuU2VhZHJhZ29uKSB7XHJcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZShhcmdzKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGxvYWRKcyhcclxuICAgICAgICAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9vcGVuc2VhZHJhZ29uQDIuNC9idWlsZC9vcGVuc2VhZHJhZ29uL29wZW5zZWFkcmFnb24ubWluLmpzJyxcclxuICAgICAgICAoKSA9PiB7XHJcbiAgICAgICAgICBPcGVuU2VhZHJhZ29uID0gd2luZG93Lk9wZW5TZWFkcmFnb247XHJcbiAgICAgICAgICB0aGlzLmluaXRpYWxpemUoYXJncyk7XHJcbiAgICAgICAgICBvc2RSZXF1ZXN0LnJlc29sdmUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpbml0aWFsaXplKHsgY29udGFpbmVyLCBwcmVmaXhVcmwgfSkge1xyXG4gICAgdGhpcy52aWV3ZXIgPSBPcGVuU2VhZHJhZ29uKHtcclxuICAgICAgZWxlbWVudDogY29udGFpbmVyLFxyXG4gICAgICBwcmVmaXhVcmw6IHByZWZpeFVybCxcclxuICAgICAgc2hvd05hdmlnYXRpb25Db250cm9sOiBmYWxzZSxcclxuICAgICAgbWF4Wm9vbVBpeGVsUmF0aW86IDEwLFxyXG4gICAgICBnZXN0dXJlU2V0dGluZ3NNb3VzZToge1xyXG4gICAgICAgIGNsaWNrVG9ab29tOiBmYWxzZVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUT0RPOiBNYXliZSBkb24ndCBuZWVkIHRvIGRvIHRoaXMgZXZlcnkgZnJhbWUuXHJcbiAgICB0aGlzLnZpZXdlci5hZGRIYW5kbGVyKCdhbmltYXRpb24nLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGZyYW1lSW5kZXggPSB0aGlzLmZpZ3VyZUZyYW1lSW5kZXgoKTtcclxuICAgICAgaWYgKGZyYW1lSW5kZXggIT09IC0xICYmIGZyYW1lSW5kZXggIT09IHRoaXMuZnJhbWVJbmRleCkge1xyXG4gICAgICAgIHRoaXMuZnJhbWVJbmRleCA9IGZyYW1lSW5kZXg7XHJcbiAgICAgICAgaWYgKHRoaXMub25GcmFtZUNoYW5nZSkge1xyXG4gICAgICAgICAgdGhpcy5vbkZyYW1lQ2hhbmdlKHsgZnJhbWVJbmRleCwgaXNMYXN0RnJhbWU6IGZyYW1lSW5kZXggPT09IHRoaXMuZ2V0RnJhbWVDb3VudCgpIC0gMSB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMudmlld2VyLmFkZEhhbmRsZXIoJ2NhbnZhcy1jbGljaycsIGV2ZW50ID0+IHtcclxuICAgICAgaWYgKCFldmVudC5xdWljaykge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgcG9pbnQgPSB0aGlzLnZpZXdlci52aWV3cG9ydC5wb2ludEZyb21QaXhlbChldmVudC5wb3NpdGlvbik7XHJcbiAgICAgIGxldCBmb3VuZEluZGV4ID0gLTE7XHJcbiAgICAgIGNvbnN0IGl0ZW1Db3VudCA9IHRoaXMudmlld2VyLndvcmxkLmdldEl0ZW1Db3VudCgpO1xyXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW1Db3VudDsgaSsrKSB7XHJcbiAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMudmlld2VyLndvcmxkLmdldEl0ZW1BdChpKTtcclxuICAgICAgICBpZiAoaXRlbS5nZXRCb3VuZHMoKS5jb250YWluc1BvaW50KHBvaW50KSkge1xyXG4gICAgICAgICAgZm91bmRJbmRleCA9IGk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIHtcclxuICAgICAgICBjb25zdCByZWFsRnJhbWVJbmRleCA9IHRoaXMuZmlndXJlRnJhbWVJbmRleCgpO1xyXG4gICAgICAgIGlmIChyZWFsRnJhbWVJbmRleCA9PT0gLTEpIHtcclxuICAgICAgICAgIHRoaXMuZ29Ub0ZyYW1lKHRoaXMuZnJhbWVJbmRleCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoaXMuZ29Ub05leHRGcmFtZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIGlmIChmb3VuZEluZGV4ID09PSB0aGlzLmZyYW1lSW5kZXgpIHtcclxuICAgICAgICB0aGlzLmdvVG9OZXh0RnJhbWUoKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmdvVG9GcmFtZShmb3VuZEluZGV4KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3Qgb3JpZ2luYWxTY3JvbGxIYW5kbGVyID0gdGhpcy52aWV3ZXIuaW5uZXJUcmFja2VyLnNjcm9sbEhhbmRsZXI7XHJcbiAgICB0aGlzLnZpZXdlci5pbm5lclRyYWNrZXIuc2Nyb2xsSGFuZGxlciA9IGV2ZW50ID0+IHtcclxuICAgICAgaWYgKFxyXG4gICAgICAgIGV2ZW50Lm9yaWdpbmFsRXZlbnQuY3RybEtleSB8fFxyXG4gICAgICAgIGV2ZW50Lm9yaWdpbmFsRXZlbnQuYWx0S2V5IHx8XHJcbiAgICAgICAgZXZlbnQub3JpZ2luYWxFdmVudC5tZXRhS2V5XHJcbiAgICAgICkge1xyXG4gICAgICAgIHJldHVybiBvcmlnaW5hbFNjcm9sbEhhbmRsZXIuY2FsbCh0aGlzLnZpZXdlci5pbm5lclRyYWNrZXIsIGV2ZW50KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcclxuICAgICAgLy8gY29uc29sZS5sb2coZXZlbnQuc2Nyb2xsLCBub3csIG5vdyAtIHRoaXMubGFzdFNjcm9sbFRpbWUpO1xyXG4gICAgICBpZiAobm93IC0gdGhpcy5sYXN0U2Nyb2xsVGltZSA8IHRoaXMuc2Nyb2xsRGVsYXkpIHtcclxuICAgICAgICAvLyBSZXR1cm5pbmcgZmFsc2Ugc3RvcHMgdGhlIGJyb3dzZXIgZnJvbSBzY3JvbGxpbmcgaXRzZWxmLlxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5sYXN0U2Nyb2xsVGltZSA9IG5vdztcclxuICAgICAgaWYgKGV2ZW50LnNjcm9sbCA8IDApIHtcclxuICAgICAgICB0aGlzLmdvVG9OZXh0RnJhbWUoKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmdvVG9QcmV2aW91c0ZyYW1lKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFJldHVybmluZyBmYWxzZSBzdG9wcyB0aGUgYnJvd3NlciBmcm9tIHNjcm9sbGluZyBpdHNlbGYuXHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH07XHJcblxyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBldmVudCA9PiB7XHJcbiAgICAgIGlmIChldmVudC5hbHRLZXkgfHwgZXZlbnQuc2hpZnRLZXkgfHwgZXZlbnQuY3RybEtleSB8fCBldmVudC5tZXRhS2V5KSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoZXZlbnQua2V5ID09PSAnQXJyb3dSaWdodCcgfHwgZXZlbnQua2V5ID09PSAnQXJyb3dEb3duJyB8fCBldmVudC5rZXkgPT09ICcgJykge1xyXG4gICAgICAgIHRoaXMuZ29Ub05leHRGcmFtZSgpO1xyXG4gICAgICB9IGVsc2UgaWYgKGV2ZW50LmtleSA9PT0gJ0Fycm93TGVmdCcgfHwgZXZlbnQua2V5ID09PSAnQXJyb3dVcCcpIHtcclxuICAgICAgICB0aGlzLmdvVG9QcmV2aW91c0ZyYW1lKCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgb3BlbkNvbWljKGNvbWljKSB7XHJcbiAgICBvc2RQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG4gICAgICB0aGlzLmNvbnRhaW5lci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBjb21pYy5ib2R5LmJhY2tncm91bmRDb2xvcjtcclxuXHJcbiAgICAgIGlmIChjb21pYy5ib2R5LmZyYW1lcykge1xyXG4gICAgICAgIHRoaXMuZnJhbWVzID0gY29taWMuYm9keS5mcmFtZXMubWFwKGZyYW1lID0+IHtcclxuICAgICAgICAgIHJldHVybiBuZXcgT3BlblNlYWRyYWdvbi5SZWN0KFxyXG4gICAgICAgICAgICBmcmFtZS54IC0gZnJhbWUud2lkdGggLyAyLFxyXG4gICAgICAgICAgICBmcmFtZS55IC0gZnJhbWUuaGVpZ2h0IC8gMixcclxuICAgICAgICAgICAgZnJhbWUud2lkdGgsXHJcbiAgICAgICAgICAgIGZyYW1lLmhlaWdodFxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmZyYW1lcyA9IGNvbWljLmJvZHkuaXRlbXMubWFwKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgcmV0dXJuIG5ldyBPcGVuU2VhZHJhZ29uLlJlY3QoXHJcbiAgICAgICAgICAgIGl0ZW0ueCAtIGl0ZW0ud2lkdGggLyAyLFxyXG4gICAgICAgICAgICBpdGVtLnkgLSBpdGVtLmhlaWdodCAvIDIsXHJcbiAgICAgICAgICAgIGl0ZW0ud2lkdGgsXHJcbiAgICAgICAgICAgIGl0ZW0uaGVpZ2h0XHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb21pYy5ib2R5Lml0ZW1zLmZvckVhY2goKGl0ZW0sIGkpID0+IHtcclxuICAgICAgICB2YXIgc3VjY2VzcztcclxuXHJcbiAgICAgICAgaWYgKGkgPT09IDApIHtcclxuICAgICAgICAgIHN1Y2Nlc3MgPSAoKSA9PiB0aGlzLmdvVG9GcmFtZSgwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudmlld2VyLmFkZFRpbGVkSW1hZ2Uoe1xyXG4gICAgICAgICAgeDogaXRlbS54IC0gaXRlbS53aWR0aCAvIDIsXHJcbiAgICAgICAgICB5OiBpdGVtLnkgLSBpdGVtLmhlaWdodCAvIDIsXHJcbiAgICAgICAgICB3aWR0aDogaXRlbS53aWR0aCxcclxuICAgICAgICAgIHN1Y2Nlc3M6IHN1Y2Nlc3MsXHJcbiAgICAgICAgICB0aWxlU291cmNlOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdsZWdhY3ktaW1hZ2UtcHlyYW1pZCcsXHJcbiAgICAgICAgICAgIGxldmVsczogW1xyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHVybDogaXRlbS51cmwsXHJcbiAgICAgICAgICAgICAgICB3aWR0aDogaXRlbS53aWR0aCxcclxuICAgICAgICAgICAgICAgIGhlaWdodDogaXRlbS5oZWlnaHRcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBpZiAodGhpcy5vbkNvbWljTG9hZCkge1xyXG4gICAgICAgIHRoaXMub25Db21pY0xvYWQoe30pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdvVG9GcmFtZShpbmRleCkge1xyXG4gICAgdmFyIGZyYW1lID0gdGhpcy5mcmFtZXNbaW5kZXhdO1xyXG4gICAgdmFyIGJ1ZmZlckZhY3RvciA9IDAuMjtcclxuICAgIHZhciBib3ggPSBmcmFtZS5jbG9uZSgpO1xyXG5cclxuICAgIGJveC53aWR0aCAqPSAxICsgYnVmZmVyRmFjdG9yO1xyXG4gICAgYm94LmhlaWdodCAqPSAxICsgYnVmZmVyRmFjdG9yO1xyXG4gICAgYm94LnggLT0gZnJhbWUud2lkdGggKiBidWZmZXJGYWN0b3IgKiAwLjU7XHJcbiAgICBib3gueSAtPSBmcmFtZS5oZWlnaHQgKiBidWZmZXJGYWN0b3IgKiAwLjU7XHJcblxyXG4gICAgdGhpcy52aWV3ZXIudmlld3BvcnQuZml0Qm91bmRzKGJveCk7XHJcbiAgfVxyXG5cclxuICBnZXRGcmFtZUluZGV4KCkge1xyXG4gICAgcmV0dXJuIHRoaXMuZnJhbWVJbmRleDtcclxuICB9XHJcblxyXG4gIGZpZ3VyZUZyYW1lSW5kZXgoKSB7XHJcbiAgICBsZXQgYmVzdEluZGV4ID0gLTE7XHJcbiAgICBsZXQgYmVzdERpc3RhbmNlID0gSW5maW5pdHk7XHJcbiAgICBjb25zdCB2aWV3cG9ydEJvdW5kcyA9IHRoaXMudmlld2VyLnZpZXdwb3J0LmdldEJvdW5kcyh0cnVlKTtcclxuICAgIGNvbnN0IHZpZXdwb3J0Q2VudGVyID0gdmlld3BvcnRCb3VuZHMuZ2V0Q2VudGVyKCk7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmZyYW1lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBmcmFtZSA9IHRoaXMuZnJhbWVzW2ldO1xyXG4gICAgICBpZiAoZnJhbWUuY29udGFpbnNQb2ludCh2aWV3cG9ydENlbnRlcikpIHtcclxuICAgICAgICBjb25zdCBkaXN0YW5jZSA9IHZpZXdwb3J0Q2VudGVyLnNxdWFyZWREaXN0YW5jZVRvKGZyYW1lLmdldENlbnRlcigpKTtcclxuICAgICAgICBpZiAoZGlzdGFuY2UgPCBiZXN0RGlzdGFuY2UpIHtcclxuICAgICAgICAgIGJlc3REaXN0YW5jZSA9IGRpc3RhbmNlO1xyXG4gICAgICAgICAgYmVzdEluZGV4ID0gaTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYmVzdEluZGV4O1xyXG4gIH1cclxuXHJcbiAgZ2V0RnJhbWVDb3VudCgpIHtcclxuICAgIHJldHVybiB0aGlzLmZyYW1lcy5sZW5ndGg7XHJcbiAgfVxyXG5cclxuICBnb1RvTmV4dEZyYW1lKCkge1xyXG4gICAgbGV0IGluZGV4ID0gdGhpcy5nZXRGcmFtZUluZGV4KCk7XHJcbiAgICBpZiAoaW5kZXggPCB0aGlzLmZyYW1lcy5sZW5ndGggLSAxKSB7XHJcbiAgICAgIHRoaXMuZ29Ub0ZyYW1lKGluZGV4ICsgMSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnb1RvUHJldmlvdXNGcmFtZSgpIHtcclxuICAgIGxldCBpbmRleCA9IHRoaXMuZ2V0RnJhbWVJbmRleCgpO1xyXG4gICAgaWYgKGluZGV4ID4gMCkge1xyXG4gICAgICB0aGlzLmdvVG9GcmFtZShpbmRleCAtIDEpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG4iLCJpbXBvcnQgRHJpZnRvcnkgZnJvbSAnLi4vbGlicmFyeS9kcmlmdG9yeSc7XHJcblxyXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKCkgPT4ge1xyXG4gIGNvbnN0IG5leHRCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubmV4dC1idXR0b24nKTtcclxuICBjb25zdCBwcmV2aW91c0J1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wcmV2aW91cy1idXR0b24nKTtcclxuICBjb25zdCBmcmFtZUluZm8gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZnJhbWUtaW5mbycpO1xyXG5cclxuICBjb25zdCBkcmlmdG9yeSA9IG5ldyBEcmlmdG9yeSh7XHJcbiAgICBjb250YWluZXI6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5kcmlmdG9yeS12aWV3ZXItY29udGFpbmVyJyksXHJcbiAgICBwcmVmaXhVcmw6ICdodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL29wZW5zZWFkcmFnb25AMi40L2J1aWxkL29wZW5zZWFkcmFnb24vaW1hZ2VzLycsXHJcbiAgICBvbkNvbWljTG9hZDogKCkgPT4ge1xyXG4gICAgICBjb25zb2xlLmxvZygnbG9hZGVkIScpO1xyXG4gICAgfSxcclxuICAgIG9uRnJhbWVDaGFuZ2U6ICh7IGZyYW1lSW5kZXgsIGlzTGFzdEZyYW1lIH0pID0+IHtcclxuICAgICAgbGV0IHRleHQgPSBgRnJhbWUgJHtmcmFtZUluZGV4ICsgMX1gO1xyXG4gICAgICBpZiAoaXNMYXN0RnJhbWUpIHtcclxuICAgICAgICB0ZXh0ICs9ICcgKGxhc3QgZnJhbWUhKSc7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZyYW1lSW5mby50ZXh0Q29udGVudCA9IHRleHQ7XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIG5leHRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XHJcbiAgICBkcmlmdG9yeS5nb1RvTmV4dEZyYW1lKCk7XHJcbiAgfSk7XHJcblxyXG4gIHByZXZpb3VzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgZHJpZnRvcnkuZ29Ub1ByZXZpb3VzRnJhbWUoKTtcclxuICB9KTtcclxuXHJcbiAgZmV0Y2goJ2NvbWljLmpzb24nKVxyXG4gICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihyZXNwb25zZSk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gbG9hZCBjb21pYy5qc29uJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XHJcbiAgICB9KVxyXG4gICAgLnRoZW4oanNvbiA9PiB7XHJcbiAgICAgIC8vIGNvbnNvbGUubG9nKGpzb24pO1xyXG4gICAgICBkcmlmdG9yeS5vcGVuQ29taWMoanNvbi5jb21pYyk7XHJcbiAgICB9KVxyXG4gICAgLmNhdGNoKGVycm9yID0+IGNvbnNvbGUuZXJyb3IoZXJyb3IpKTtcclxufSk7XHJcbiJdLCJuYW1lcyI6WyJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJ2YWx1ZSIsImFscmVhZHlDYWxsZWRTb3VyY2VzIiwiYXdhaXRpbmdDYWxsYmFja3MiLCJhZGRDYWxsYmFjayIsInNyYyIsImNhbGxiYWNrIiwicHVzaCIsImxvYWRKUyIsImluZGV4T2YiLCJzY3JpcHQiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJvbmxvYWQiLCJrZXkiLCJmb3JFYWNoIiwiY2IiLCJoZWFkIiwiYXBwZW5kQ2hpbGQiLCJPcGVuU2VhZHJhZ29uIiwib3NkUmVxdWVzdCIsIm9zZFByb21pc2UiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsIkRyaWZ0b3J5IiwiYXJncyIsImNvbnRhaW5lciIsIm9uRnJhbWVDaGFuZ2UiLCJvbkNvbWljTG9hZCIsImZyYW1lcyIsImZyYW1lSW5kZXgiLCJsYXN0U2Nyb2xsVGltZSIsInNjcm9sbERlbGF5IiwiaW5pdGlhbGl6ZSIsImxvYWRKcyIsIndpbmRvdyIsInByZWZpeFVybCIsInZpZXdlciIsImVsZW1lbnQiLCJzaG93TmF2aWdhdGlvbkNvbnRyb2wiLCJtYXhab29tUGl4ZWxSYXRpbyIsImdlc3R1cmVTZXR0aW5nc01vdXNlIiwiY2xpY2tUb1pvb20iLCJhZGRIYW5kbGVyIiwiZmlndXJlRnJhbWVJbmRleCIsImlzTGFzdEZyYW1lIiwiZ2V0RnJhbWVDb3VudCIsImV2ZW50IiwicXVpY2siLCJwb2ludCIsInZpZXdwb3J0IiwicG9pbnRGcm9tUGl4ZWwiLCJwb3NpdGlvbiIsImZvdW5kSW5kZXgiLCJpdGVtQ291bnQiLCJ3b3JsZCIsImdldEl0ZW1Db3VudCIsImkiLCJpdGVtIiwiZ2V0SXRlbUF0IiwiZ2V0Qm91bmRzIiwiY29udGFpbnNQb2ludCIsInJlYWxGcmFtZUluZGV4IiwiZ29Ub0ZyYW1lIiwiZ29Ub05leHRGcmFtZSIsIm9yaWdpbmFsU2Nyb2xsSGFuZGxlciIsImlubmVyVHJhY2tlciIsInNjcm9sbEhhbmRsZXIiLCJvcmlnaW5hbEV2ZW50IiwiY3RybEtleSIsImFsdEtleSIsIm1ldGFLZXkiLCJjYWxsIiwibm93IiwiRGF0ZSIsInNjcm9sbCIsImdvVG9QcmV2aW91c0ZyYW1lIiwiYWRkRXZlbnRMaXN0ZW5lciIsInNoaWZ0S2V5IiwicHJldmVudERlZmF1bHQiLCJzdG9wUHJvcGFnYXRpb24iLCJjb21pYyIsInRoZW4iLCJzdHlsZSIsImJhY2tncm91bmRDb2xvciIsImJvZHkiLCJtYXAiLCJmcmFtZSIsIlJlY3QiLCJ4Iiwid2lkdGgiLCJ5IiwiaGVpZ2h0IiwiaXRlbXMiLCJzdWNjZXNzIiwiYWRkVGlsZWRJbWFnZSIsInRpbGVTb3VyY2UiLCJ0eXBlIiwibGV2ZWxzIiwidXJsIiwiaW5kZXgiLCJidWZmZXJGYWN0b3IiLCJib3giLCJjbG9uZSIsImZpdEJvdW5kcyIsImJlc3RJbmRleCIsImJlc3REaXN0YW5jZSIsIkluZmluaXR5Iiwidmlld3BvcnRCb3VuZHMiLCJ2aWV3cG9ydENlbnRlciIsImdldENlbnRlciIsImxlbmd0aCIsImRpc3RhbmNlIiwic3F1YXJlZERpc3RhbmNlVG8iLCJnZXRGcmFtZUluZGV4IiwibmV4dEJ1dHRvbiIsInF1ZXJ5U2VsZWN0b3IiLCJwcmV2aW91c0J1dHRvbiIsImZyYW1lSW5mbyIsImRyaWZ0b3J5IiwiY29uc29sZSIsImxvZyIsInRleHQiLCJ0ZXh0Q29udGVudCIsImZldGNoIiwicmVzcG9uc2UiLCJvayIsImVycm9yIiwiRXJyb3IiLCJqc29uIiwib3BlbkNvbWljIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUFDQUEsTUFBTSxDQUFDQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QztFQUFFQyxFQUFBQSxLQUFLLEVBQUU7RUFBVCxDQUE3QztFQUNBLElBQUlDLG9CQUFvQixHQUFHLEVBQTNCO0VBQ0EsSUFBSUMsaUJBQWlCLEdBQUcsRUFBeEI7O0VBQ0EsSUFBSUMsV0FBVyxHQUFHLFNBQWRBLFdBQWMsQ0FBVUMsR0FBVixFQUFlQyxRQUFmLEVBQXlCO0VBQ3ZDLE1BQUlILGlCQUFpQixDQUFDRSxHQUFELENBQXJCLEVBQTRCO0VBQ3hCRixJQUFBQSxpQkFBaUIsQ0FBQ0UsR0FBRCxDQUFqQixDQUF1QkUsSUFBdkIsQ0FBNEJELFFBQTVCO0VBQ0gsR0FGRCxNQUdLO0VBQ0RILElBQUFBLGlCQUFpQixDQUFDRSxHQUFELENBQWpCLEdBQXlCLENBQUNDLFFBQUQsQ0FBekI7RUFDSDtFQUNKLENBUEQ7O0VBUUEsU0FBU0UsTUFBVCxDQUFnQkgsR0FBaEIsRUFBcUJDLFFBQXJCLEVBQStCO0VBQzNCLE1BQUlKLG9CQUFvQixDQUFDTyxPQUFyQixDQUE2QkosR0FBN0IsSUFBb0MsQ0FBeEMsRUFBMkM7RUFDdkNILElBQUFBLG9CQUFvQixDQUFDSyxJQUFyQixDQUEwQkYsR0FBMUI7RUFDQSxRQUFJSyxNQUFNLEdBQUdDLFFBQVEsQ0FBQ0MsYUFBVCxDQUF1QixRQUF2QixDQUFiO0VBQ0FGLElBQUFBLE1BQU0sQ0FBQ0wsR0FBUCxHQUFhQSxHQUFiOztFQUNBSyxJQUFBQSxNQUFNLENBQUNHLE1BQVAsR0FBZ0IsWUFBWTtFQUN4QlQsTUFBQUEsV0FBVyxDQUFDQyxHQUFELEVBQU1DLFFBQU4sQ0FBWDs7RUFDQSxXQUFLLElBQUlRLEdBQVQsSUFBZ0JYLGlCQUFoQixFQUFtQztFQUMvQkEsUUFBQUEsaUJBQWlCLENBQUNXLEdBQUQsQ0FBakIsQ0FBdUJDLE9BQXZCLENBQStCLFVBQVVDLEVBQVYsRUFBYztFQUFFLGlCQUFPQSxFQUFFLEVBQVQ7RUFBYyxTQUE3RDtFQUNIO0VBQ0osS0FMRDs7RUFNQUwsSUFBQUEsUUFBUSxDQUFDTSxJQUFULENBQWNDLFdBQWQsQ0FBMEJSLE1BQTFCO0VBQ0gsR0FYRCxNQVlLO0VBQ0ROLElBQUFBLFdBQVcsQ0FBQ0MsR0FBRCxFQUFNQyxRQUFOLENBQVg7RUFDSDtFQUNKOztFQUNETixPQUFPLFdBQVAsR0FBa0JRLE1BQWxCOzs7OztFQzNCQSxJQUFJVyxhQUFKO0VBQ0EsSUFBSUMsVUFBSjtFQUVBLElBQU1DLFVBQVUsR0FBRyxJQUFJQyxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFVQyxNQUFWLEVBQXFCO0VBQ2xESixFQUFBQSxVQUFVLEdBQUc7RUFBRUcsSUFBQUEsT0FBTyxFQUFQQSxPQUFGO0VBQVdDLElBQUFBLE1BQU0sRUFBTkE7RUFBWCxHQUFiO0VBQ0QsQ0FGa0IsQ0FBbkI7O01BSXFCQztFQUNuQixvQkFBWUMsSUFBWixFQUFrQjtFQUFBOztFQUFBOztFQUNoQixTQUFLQyxTQUFMLEdBQWlCRCxJQUFJLENBQUNDLFNBQXRCO0VBQ0EsU0FBS0MsYUFBTCxHQUFxQkYsSUFBSSxDQUFDRSxhQUExQjtFQUNBLFNBQUtDLFdBQUwsR0FBbUJILElBQUksQ0FBQ0csV0FBeEI7RUFDQSxTQUFLQyxNQUFMLEdBQWMsRUFBZDtFQUNBLFNBQUtDLFVBQUwsR0FBa0IsQ0FBQyxDQUFuQjtFQUNBLFNBQUtDLGNBQUwsR0FBc0IsQ0FBdEI7RUFDQSxTQUFLQyxXQUFMLEdBQW1CLElBQW5CLENBUGdCO0VBVWhCOztFQUNBLFFBQUlkLGFBQUosRUFBbUI7RUFDakIsV0FBS2UsVUFBTCxDQUFnQlIsSUFBaEI7RUFDRCxLQUZELE1BRU87RUFDTFMsTUFBQUEsUUFBTSxDQUNKLHlGQURJLEVBRUosWUFBTTtFQUNKaEIsUUFBQUEsYUFBYSxHQUFHaUIsTUFBTSxDQUFDakIsYUFBdkI7O0VBQ0EsUUFBQSxLQUFJLENBQUNlLFVBQUwsQ0FBZ0JSLElBQWhCOztFQUNBTixRQUFBQSxVQUFVLENBQUNHLE9BQVg7RUFDRCxPQU5HLENBQU47RUFRRDtFQUNGOzs7O3VDQUVvQztFQUFBOztFQUFBLFVBQXhCSSxTQUF3QixRQUF4QkEsU0FBd0I7RUFBQSxVQUFiVSxTQUFhLFFBQWJBLFNBQWE7RUFDbkMsV0FBS0MsTUFBTCxHQUFjbkIsYUFBYSxDQUFDO0VBQzFCb0IsUUFBQUEsT0FBTyxFQUFFWixTQURpQjtFQUUxQlUsUUFBQUEsU0FBUyxFQUFFQSxTQUZlO0VBRzFCRyxRQUFBQSxxQkFBcUIsRUFBRSxLQUhHO0VBSTFCQyxRQUFBQSxpQkFBaUIsRUFBRSxFQUpPO0VBSzFCQyxRQUFBQSxvQkFBb0IsRUFBRTtFQUNwQkMsVUFBQUEsV0FBVyxFQUFFO0VBRE87RUFMSSxPQUFELENBQTNCLENBRG1DOztFQVluQyxXQUFLTCxNQUFMLENBQVlNLFVBQVosQ0FBdUIsV0FBdkIsRUFBb0MsWUFBTTtFQUN4QyxZQUFNYixVQUFVLEdBQUcsTUFBSSxDQUFDYyxnQkFBTCxFQUFuQjs7RUFDQSxZQUFJZCxVQUFVLEtBQUssQ0FBQyxDQUFoQixJQUFxQkEsVUFBVSxLQUFLLE1BQUksQ0FBQ0EsVUFBN0MsRUFBeUQ7RUFDdkQsVUFBQSxNQUFJLENBQUNBLFVBQUwsR0FBa0JBLFVBQWxCOztFQUNBLGNBQUksTUFBSSxDQUFDSCxhQUFULEVBQXdCO0VBQ3RCLFlBQUEsTUFBSSxDQUFDQSxhQUFMLENBQW1CO0VBQUVHLGNBQUFBLFVBQVUsRUFBVkEsVUFBRjtFQUFjZSxjQUFBQSxXQUFXLEVBQUVmLFVBQVUsS0FBSyxNQUFJLENBQUNnQixhQUFMLEtBQXVCO0VBQWpFLGFBQW5CO0VBQ0Q7RUFDRjtFQUNGLE9BUkQ7RUFVQSxXQUFLVCxNQUFMLENBQVlNLFVBQVosQ0FBdUIsY0FBdkIsRUFBdUMsVUFBQUksS0FBSyxFQUFJO0VBQzlDLFlBQUksQ0FBQ0EsS0FBSyxDQUFDQyxLQUFYLEVBQWtCO0VBQ2hCO0VBQ0Q7O0VBRUQsWUFBTUMsS0FBSyxHQUFHLE1BQUksQ0FBQ1osTUFBTCxDQUFZYSxRQUFaLENBQXFCQyxjQUFyQixDQUFvQ0osS0FBSyxDQUFDSyxRQUExQyxDQUFkOztFQUNBLFlBQUlDLFVBQVUsR0FBRyxDQUFDLENBQWxCOztFQUNBLFlBQU1DLFNBQVMsR0FBRyxNQUFJLENBQUNqQixNQUFMLENBQVlrQixLQUFaLENBQWtCQyxZQUFsQixFQUFsQjs7RUFDQSxhQUFLLElBQUlDLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUdILFNBQXBCLEVBQStCRyxDQUFDLEVBQWhDLEVBQW9DO0VBQ2xDLGNBQU1DLElBQUksR0FBRyxNQUFJLENBQUNyQixNQUFMLENBQVlrQixLQUFaLENBQWtCSSxTQUFsQixDQUE0QkYsQ0FBNUIsQ0FBYjs7RUFDQSxjQUFJQyxJQUFJLENBQUNFLFNBQUwsR0FBaUJDLGFBQWpCLENBQStCWixLQUEvQixDQUFKLEVBQTJDO0VBQ3pDSSxZQUFBQSxVQUFVLEdBQUdJLENBQWI7RUFDRDtFQUNGOztFQUVELFlBQUlKLFVBQVUsS0FBSyxDQUFDLENBQXBCLEVBQXVCO0VBQ3JCLGNBQU1TLGNBQWMsR0FBRyxNQUFJLENBQUNsQixnQkFBTCxFQUF2Qjs7RUFDQSxjQUFJa0IsY0FBYyxLQUFLLENBQUMsQ0FBeEIsRUFBMkI7RUFDekIsWUFBQSxNQUFJLENBQUNDLFNBQUwsQ0FBZSxNQUFJLENBQUNqQyxVQUFwQjtFQUNELFdBRkQsTUFFTztFQUNMLFlBQUEsTUFBSSxDQUFDa0MsYUFBTDtFQUNEO0VBQ0YsU0FQRCxNQU9PLElBQUlYLFVBQVUsS0FBSyxNQUFJLENBQUN2QixVQUF4QixFQUFvQztFQUN6QyxVQUFBLE1BQUksQ0FBQ2tDLGFBQUw7RUFDRCxTQUZNLE1BRUE7RUFDTCxVQUFBLE1BQUksQ0FBQ0QsU0FBTCxDQUFlVixVQUFmO0VBQ0Q7RUFDRixPQTNCRDtFQTZCQSxVQUFNWSxxQkFBcUIsR0FBRyxLQUFLNUIsTUFBTCxDQUFZNkIsWUFBWixDQUF5QkMsYUFBdkQ7O0VBQ0EsV0FBSzlCLE1BQUwsQ0FBWTZCLFlBQVosQ0FBeUJDLGFBQXpCLEdBQXlDLFVBQUFwQixLQUFLLEVBQUk7RUFDaEQsWUFDRUEsS0FBSyxDQUFDcUIsYUFBTixDQUFvQkMsT0FBcEIsSUFDQXRCLEtBQUssQ0FBQ3FCLGFBQU4sQ0FBb0JFLE1BRHBCLElBRUF2QixLQUFLLENBQUNxQixhQUFOLENBQW9CRyxPQUh0QixFQUlFO0VBQ0EsaUJBQU9OLHFCQUFxQixDQUFDTyxJQUF0QixDQUEyQixNQUFJLENBQUNuQyxNQUFMLENBQVk2QixZQUF2QyxFQUFxRG5CLEtBQXJELENBQVA7RUFDRDs7RUFFRCxZQUFNMEIsR0FBRyxHQUFHQyxJQUFJLENBQUNELEdBQUwsRUFBWixDQVRnRDs7RUFXaEQsWUFBSUEsR0FBRyxHQUFHLE1BQUksQ0FBQzFDLGNBQVgsR0FBNEIsTUFBSSxDQUFDQyxXQUFyQyxFQUFrRDtFQUNoRDtFQUNBLGlCQUFPLEtBQVA7RUFDRDs7RUFFRCxRQUFBLE1BQUksQ0FBQ0QsY0FBTCxHQUFzQjBDLEdBQXRCOztFQUNBLFlBQUkxQixLQUFLLENBQUM0QixNQUFOLEdBQWUsQ0FBbkIsRUFBc0I7RUFDcEIsVUFBQSxNQUFJLENBQUNYLGFBQUw7RUFDRCxTQUZELE1BRU87RUFDTCxVQUFBLE1BQUksQ0FBQ1ksaUJBQUw7RUFDRCxTQXJCK0M7OztFQXdCaEQsZUFBTyxLQUFQO0VBQ0QsT0F6QkQ7O0VBMkJBekMsTUFBQUEsTUFBTSxDQUFDMEMsZ0JBQVAsQ0FBd0IsU0FBeEIsRUFBbUMsVUFBQTlCLEtBQUssRUFBSTtFQUMxQyxZQUFJQSxLQUFLLENBQUN1QixNQUFOLElBQWdCdkIsS0FBSyxDQUFDK0IsUUFBdEIsSUFBa0MvQixLQUFLLENBQUNzQixPQUF4QyxJQUFtRHRCLEtBQUssQ0FBQ3dCLE9BQTdELEVBQXNFO0VBQ3BFO0VBQ0Q7O0VBRUQsWUFBSXhCLEtBQUssQ0FBQ2xDLEdBQU4sS0FBYyxZQUFkLElBQThCa0MsS0FBSyxDQUFDbEMsR0FBTixLQUFjLFdBQTVDLElBQTJEa0MsS0FBSyxDQUFDbEMsR0FBTixLQUFjLEdBQTdFLEVBQWtGO0VBQ2hGLFVBQUEsTUFBSSxDQUFDbUQsYUFBTDtFQUNELFNBRkQsTUFFTyxJQUFJakIsS0FBSyxDQUFDbEMsR0FBTixLQUFjLFdBQWQsSUFBNkJrQyxLQUFLLENBQUNsQyxHQUFOLEtBQWMsU0FBL0MsRUFBMEQ7RUFDL0QsVUFBQSxNQUFJLENBQUMrRCxpQkFBTDtFQUNELFNBRk0sTUFFQTtFQUNMO0VBQ0Q7O0VBRUQ3QixRQUFBQSxLQUFLLENBQUNnQyxjQUFOO0VBQ0FoQyxRQUFBQSxLQUFLLENBQUNpQyxlQUFOO0VBQ0QsT0FmRDtFQWdCRDs7O2dDQUVTQyxPQUFPO0VBQUE7O0VBQ2Y3RCxNQUFBQSxVQUFVLENBQUM4RCxJQUFYLENBQWdCLFlBQU07RUFDcEIsUUFBQSxNQUFJLENBQUN4RCxTQUFMLENBQWV5RCxLQUFmLENBQXFCQyxlQUFyQixHQUF1Q0gsS0FBSyxDQUFDSSxJQUFOLENBQVdELGVBQWxEOztFQUVBLFlBQUlILEtBQUssQ0FBQ0ksSUFBTixDQUFXeEQsTUFBZixFQUF1QjtFQUNyQixVQUFBLE1BQUksQ0FBQ0EsTUFBTCxHQUFjb0QsS0FBSyxDQUFDSSxJQUFOLENBQVd4RCxNQUFYLENBQWtCeUQsR0FBbEIsQ0FBc0IsVUFBQUMsS0FBSyxFQUFJO0VBQzNDLG1CQUFPLElBQUlyRSxhQUFhLENBQUNzRSxJQUFsQixDQUNMRCxLQUFLLENBQUNFLENBQU4sR0FBVUYsS0FBSyxDQUFDRyxLQUFOLEdBQWMsQ0FEbkIsRUFFTEgsS0FBSyxDQUFDSSxDQUFOLEdBQVVKLEtBQUssQ0FBQ0ssTUFBTixHQUFlLENBRnBCLEVBR0xMLEtBQUssQ0FBQ0csS0FIRCxFQUlMSCxLQUFLLENBQUNLLE1BSkQsQ0FBUDtFQU1ELFdBUGEsQ0FBZDtFQVFELFNBVEQsTUFTTztFQUNMLFVBQUEsTUFBSSxDQUFDL0QsTUFBTCxHQUFjb0QsS0FBSyxDQUFDSSxJQUFOLENBQVdRLEtBQVgsQ0FBaUJQLEdBQWpCLENBQXFCLFVBQUE1QixJQUFJLEVBQUk7RUFDekMsbUJBQU8sSUFBSXhDLGFBQWEsQ0FBQ3NFLElBQWxCLENBQ0w5QixJQUFJLENBQUMrQixDQUFMLEdBQVMvQixJQUFJLENBQUNnQyxLQUFMLEdBQWEsQ0FEakIsRUFFTGhDLElBQUksQ0FBQ2lDLENBQUwsR0FBU2pDLElBQUksQ0FBQ2tDLE1BQUwsR0FBYyxDQUZsQixFQUdMbEMsSUFBSSxDQUFDZ0MsS0FIQSxFQUlMaEMsSUFBSSxDQUFDa0MsTUFKQSxDQUFQO0VBTUQsV0FQYSxDQUFkO0VBUUQ7O0VBRURYLFFBQUFBLEtBQUssQ0FBQ0ksSUFBTixDQUFXUSxLQUFYLENBQWlCL0UsT0FBakIsQ0FBeUIsVUFBQzRDLElBQUQsRUFBT0QsQ0FBUCxFQUFhO0VBQ3BDLGNBQUlxQyxPQUFKOztFQUVBLGNBQUlyQyxDQUFDLEtBQUssQ0FBVixFQUFhO0VBQ1hxQyxZQUFBQSxPQUFPLEdBQUc7RUFBQSxxQkFBTSxNQUFJLENBQUMvQixTQUFMLENBQWUsQ0FBZixDQUFOO0VBQUEsYUFBVjtFQUNEOztFQUVELFVBQUEsTUFBSSxDQUFDMUIsTUFBTCxDQUFZMEQsYUFBWixDQUEwQjtFQUN4Qk4sWUFBQUEsQ0FBQyxFQUFFL0IsSUFBSSxDQUFDK0IsQ0FBTCxHQUFTL0IsSUFBSSxDQUFDZ0MsS0FBTCxHQUFhLENBREQ7RUFFeEJDLFlBQUFBLENBQUMsRUFBRWpDLElBQUksQ0FBQ2lDLENBQUwsR0FBU2pDLElBQUksQ0FBQ2tDLE1BQUwsR0FBYyxDQUZGO0VBR3hCRixZQUFBQSxLQUFLLEVBQUVoQyxJQUFJLENBQUNnQyxLQUhZO0VBSXhCSSxZQUFBQSxPQUFPLEVBQUVBLE9BSmU7RUFLeEJFLFlBQUFBLFVBQVUsRUFBRTtFQUNWQyxjQUFBQSxJQUFJLEVBQUUsc0JBREk7RUFFVkMsY0FBQUEsTUFBTSxFQUFFLENBQ047RUFDRUMsZ0JBQUFBLEdBQUcsRUFBRXpDLElBQUksQ0FBQ3lDLEdBRFo7RUFFRVQsZ0JBQUFBLEtBQUssRUFBRWhDLElBQUksQ0FBQ2dDLEtBRmQ7RUFHRUUsZ0JBQUFBLE1BQU0sRUFBRWxDLElBQUksQ0FBQ2tDO0VBSGYsZUFETTtFQUZFO0VBTFksV0FBMUI7RUFnQkQsU0F2QkQ7O0VBeUJBLFlBQUksTUFBSSxDQUFDaEUsV0FBVCxFQUFzQjtFQUNwQixVQUFBLE1BQUksQ0FBQ0EsV0FBTCxDQUFpQixFQUFqQjtFQUNEO0VBQ0YsT0FuREQ7RUFvREQ7OztnQ0FFU3dFLE9BQU87RUFDZixVQUFJYixLQUFLLEdBQUcsS0FBSzFELE1BQUwsQ0FBWXVFLEtBQVosQ0FBWjtFQUNBLFVBQUlDLFlBQVksR0FBRyxHQUFuQjtFQUNBLFVBQUlDLEdBQUcsR0FBR2YsS0FBSyxDQUFDZ0IsS0FBTixFQUFWO0VBRUFELE1BQUFBLEdBQUcsQ0FBQ1osS0FBSixJQUFhLElBQUlXLFlBQWpCO0VBQ0FDLE1BQUFBLEdBQUcsQ0FBQ1YsTUFBSixJQUFjLElBQUlTLFlBQWxCO0VBQ0FDLE1BQUFBLEdBQUcsQ0FBQ2IsQ0FBSixJQUFTRixLQUFLLENBQUNHLEtBQU4sR0FBY1csWUFBZCxHQUE2QixHQUF0QztFQUNBQyxNQUFBQSxHQUFHLENBQUNYLENBQUosSUFBU0osS0FBSyxDQUFDSyxNQUFOLEdBQWVTLFlBQWYsR0FBOEIsR0FBdkM7RUFFQSxXQUFLaEUsTUFBTCxDQUFZYSxRQUFaLENBQXFCc0QsU0FBckIsQ0FBK0JGLEdBQS9CO0VBQ0Q7OztzQ0FFZTtFQUNkLGFBQU8sS0FBS3hFLFVBQVo7RUFDRDs7O3lDQUVrQjtFQUNqQixVQUFJMkUsU0FBUyxHQUFHLENBQUMsQ0FBakI7RUFDQSxVQUFJQyxZQUFZLEdBQUdDLFFBQW5CO0VBQ0EsVUFBTUMsY0FBYyxHQUFHLEtBQUt2RSxNQUFMLENBQVlhLFFBQVosQ0FBcUJVLFNBQXJCLENBQStCLElBQS9CLENBQXZCO0VBQ0EsVUFBTWlELGNBQWMsR0FBR0QsY0FBYyxDQUFDRSxTQUFmLEVBQXZCOztFQUVBLFdBQUssSUFBSXJELENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUcsS0FBSzVCLE1BQUwsQ0FBWWtGLE1BQWhDLEVBQXdDdEQsQ0FBQyxFQUF6QyxFQUE2QztFQUMzQyxZQUFNOEIsS0FBSyxHQUFHLEtBQUsxRCxNQUFMLENBQVk0QixDQUFaLENBQWQ7O0VBQ0EsWUFBSThCLEtBQUssQ0FBQzFCLGFBQU4sQ0FBb0JnRCxjQUFwQixDQUFKLEVBQXlDO0VBQ3ZDLGNBQU1HLFFBQVEsR0FBR0gsY0FBYyxDQUFDSSxpQkFBZixDQUFpQzFCLEtBQUssQ0FBQ3VCLFNBQU4sRUFBakMsQ0FBakI7O0VBQ0EsY0FBSUUsUUFBUSxHQUFHTixZQUFmLEVBQTZCO0VBQzNCQSxZQUFBQSxZQUFZLEdBQUdNLFFBQWY7RUFDQVAsWUFBQUEsU0FBUyxHQUFHaEQsQ0FBWjtFQUNEO0VBQ0Y7RUFDRjs7RUFFRCxhQUFPZ0QsU0FBUDtFQUNEOzs7c0NBRWU7RUFDZCxhQUFPLEtBQUs1RSxNQUFMLENBQVlrRixNQUFuQjtFQUNEOzs7c0NBRWU7RUFDZCxVQUFJWCxLQUFLLEdBQUcsS0FBS2MsYUFBTCxFQUFaOztFQUNBLFVBQUlkLEtBQUssR0FBRyxLQUFLdkUsTUFBTCxDQUFZa0YsTUFBWixHQUFxQixDQUFqQyxFQUFvQztFQUNsQyxhQUFLaEQsU0FBTCxDQUFlcUMsS0FBSyxHQUFHLENBQXZCO0VBQ0Q7RUFDRjs7OzBDQUVtQjtFQUNsQixVQUFJQSxLQUFLLEdBQUcsS0FBS2MsYUFBTCxFQUFaOztFQUNBLFVBQUlkLEtBQUssR0FBRyxDQUFaLEVBQWU7RUFDYixhQUFLckMsU0FBTCxDQUFlcUMsS0FBSyxHQUFHLENBQXZCO0VBQ0Q7RUFDRjs7Ozs7O0VDOU9IMUYsUUFBUSxDQUFDbUUsZ0JBQVQsQ0FBMEIsa0JBQTFCLEVBQThDLFlBQU07RUFDbEQsTUFBTXNDLFVBQVUsR0FBR3pHLFFBQVEsQ0FBQzBHLGFBQVQsQ0FBdUIsY0FBdkIsQ0FBbkI7RUFDQSxNQUFNQyxjQUFjLEdBQUczRyxRQUFRLENBQUMwRyxhQUFULENBQXVCLGtCQUF2QixDQUF2QjtFQUNBLE1BQU1FLFNBQVMsR0FBRzVHLFFBQVEsQ0FBQzBHLGFBQVQsQ0FBdUIsYUFBdkIsQ0FBbEI7RUFFQSxNQUFNRyxRQUFRLEdBQUcsSUFBSS9GLFFBQUosQ0FBYTtFQUM1QkUsSUFBQUEsU0FBUyxFQUFFaEIsUUFBUSxDQUFDMEcsYUFBVCxDQUF1Qiw0QkFBdkIsQ0FEaUI7RUFFNUJoRixJQUFBQSxTQUFTLEVBQUUsNEVBRmlCO0VBRzVCUixJQUFBQSxXQUFXLEVBQUUsdUJBQU07RUFDakI0RixNQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxTQUFaO0VBQ0QsS0FMMkI7RUFNNUI5RixJQUFBQSxhQUFhLEVBQUUsNkJBQWlDO0VBQUEsVUFBOUJHLFVBQThCLFFBQTlCQSxVQUE4QjtFQUFBLFVBQWxCZSxXQUFrQixRQUFsQkEsV0FBa0I7RUFDOUMsVUFBSTZFLElBQUksbUJBQVk1RixVQUFVLEdBQUcsQ0FBekIsQ0FBUjs7RUFDQSxVQUFJZSxXQUFKLEVBQWlCO0VBQ2Y2RSxRQUFBQSxJQUFJLElBQUksZ0JBQVI7RUFDRDs7RUFFREosTUFBQUEsU0FBUyxDQUFDSyxXQUFWLEdBQXdCRCxJQUF4QjtFQUNEO0VBYjJCLEdBQWIsQ0FBakI7RUFnQkFQLEVBQUFBLFVBQVUsQ0FBQ3RDLGdCQUFYLENBQTRCLE9BQTVCLEVBQXFDLFlBQU07RUFDekMwQyxJQUFBQSxRQUFRLENBQUN2RCxhQUFUO0VBQ0QsR0FGRDtFQUlBcUQsRUFBQUEsY0FBYyxDQUFDeEMsZ0JBQWYsQ0FBZ0MsT0FBaEMsRUFBeUMsWUFBTTtFQUM3QzBDLElBQUFBLFFBQVEsQ0FBQzNDLGlCQUFUO0VBQ0QsR0FGRDtFQUlBZ0QsRUFBQUEsS0FBSyxDQUFDLFlBQUQsQ0FBTCxDQUNHMUMsSUFESCxDQUNRLFVBQUEyQyxRQUFRLEVBQUk7RUFDaEIsUUFBSSxDQUFDQSxRQUFRLENBQUNDLEVBQWQsRUFBa0I7RUFDaEJOLE1BQUFBLE9BQU8sQ0FBQ08sS0FBUixDQUFjRixRQUFkO0VBQ0EsWUFBTSxJQUFJRyxLQUFKLENBQVUsMkJBQVYsQ0FBTjtFQUNEOztFQUVELFdBQU9ILFFBQVEsQ0FBQ0ksSUFBVCxFQUFQO0VBQ0QsR0FSSCxFQVNHL0MsSUFUSCxDQVNRLFVBQUErQyxJQUFJLEVBQUk7RUFDWjtFQUNBVixJQUFBQSxRQUFRLENBQUNXLFNBQVQsQ0FBbUJELElBQUksQ0FBQ2hELEtBQXhCO0VBQ0QsR0FaSCxXQWFTLFVBQUE4QyxLQUFLO0VBQUEsV0FBSVAsT0FBTyxDQUFDTyxLQUFSLENBQWNBLEtBQWQsQ0FBSjtFQUFBLEdBYmQ7RUFjRCxDQTNDRDs7Ozs7OyJ9