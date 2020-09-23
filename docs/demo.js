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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVtby5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL0BkYW41MDMvbG9hZC1qcy9pbmRleC5qcyIsInNyYy9saWJyYXJ5L2RyaWZ0b3J5LmpzIiwic3JjL2RlbW8vZGVtby5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG52YXIgYWxyZWFkeUNhbGxlZFNvdXJjZXMgPSBbXTtcclxudmFyIGF3YWl0aW5nQ2FsbGJhY2tzID0ge307XHJcbnZhciBhZGRDYWxsYmFjayA9IGZ1bmN0aW9uIChzcmMsIGNhbGxiYWNrKSB7XHJcbiAgICBpZiAoYXdhaXRpbmdDYWxsYmFja3Nbc3JjXSkge1xyXG4gICAgICAgIGF3YWl0aW5nQ2FsbGJhY2tzW3NyY10ucHVzaChjYWxsYmFjayk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBhd2FpdGluZ0NhbGxiYWNrc1tzcmNdID0gW2NhbGxiYWNrXTtcclxuICAgIH1cclxufTtcclxuZnVuY3Rpb24gbG9hZEpTKHNyYywgY2FsbGJhY2spIHtcclxuICAgIGlmIChhbHJlYWR5Q2FsbGVkU291cmNlcy5pbmRleE9mKHNyYykgPCAwKSB7XHJcbiAgICAgICAgYWxyZWFkeUNhbGxlZFNvdXJjZXMucHVzaChzcmMpO1xyXG4gICAgICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcclxuICAgICAgICBzY3JpcHQuc3JjID0gc3JjO1xyXG4gICAgICAgIHNjcmlwdC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGFkZENhbGxiYWNrKHNyYywgY2FsbGJhY2spO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gYXdhaXRpbmdDYWxsYmFja3MpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0aW5nQ2FsbGJhY2tzW2tleV0uZm9yRWFjaChmdW5jdGlvbiAoY2IpIHsgcmV0dXJuIGNiKCk7IH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHNjcmlwdCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBhZGRDYWxsYmFjayhzcmMsIGNhbGxiYWNrKTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLmRlZmF1bHQgPSBsb2FkSlM7XHJcbiIsImltcG9ydCBsb2FkSnMgZnJvbSAnQGRhbjUwMy9sb2FkLWpzJztcblxubGV0IE9wZW5TZWFkcmFnb247XG5sZXQgb3NkUmVxdWVzdDtcblxuY29uc3Qgb3NkUHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgb3NkUmVxdWVzdCA9IHsgcmVzb2x2ZSwgcmVqZWN0IH07XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRHJpZnRvcnkge1xuICBjb25zdHJ1Y3RvcihhcmdzKSB7XG4gICAgdGhpcy5jb250YWluZXIgPSBhcmdzLmNvbnRhaW5lcjtcbiAgICB0aGlzLm9uRnJhbWVDaGFuZ2UgPSBhcmdzLm9uRnJhbWVDaGFuZ2U7XG4gICAgdGhpcy5vbkNvbWljTG9hZCA9IGFyZ3Mub25Db21pY0xvYWQ7XG4gICAgdGhpcy5mcmFtZXMgPSBbXTtcbiAgICB0aGlzLmZyYW1lSW5kZXggPSAtMTtcbiAgICB0aGlzLmxhc3RTY3JvbGxUaW1lID0gMDtcbiAgICB0aGlzLnNjcm9sbERlbGF5ID0gMjAwMDtcblxuICAgIC8vIFRPRE86IE1ha2UgdGhpcyBtb3JlIHJvYnVzdCBzbyBpdCBoYW5kbGVzIG11bHRpcGxlIHZpZXdlcnMgYmVpbmcgY3JlYXRlZCBhdCB0aGUgc2FtZSB0aW1lLlxuICAgIC8vIFJpZ2h0IG5vdyB0aGV5IHdvdWxkIGJvdGggbG9hZCBPU0Qgc2luY2UgdGhleSB3b3VsZCBzdGFydCBiZWZvcmUgdGhlIG90aGVyIGZpbmlzaGVkLlxuICAgIGlmIChPcGVuU2VhZHJhZ29uKSB7XG4gICAgICB0aGlzLmluaXRpYWxpemUoYXJncyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvYWRKcyhcbiAgICAgICAgJ2h0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vb3BlbnNlYWRyYWdvbkAyLjQvYnVpbGQvb3BlbnNlYWRyYWdvbi9vcGVuc2VhZHJhZ29uLm1pbi5qcycsXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICBPcGVuU2VhZHJhZ29uID0gd2luZG93Lk9wZW5TZWFkcmFnb247XG4gICAgICAgICAgdGhpcy5pbml0aWFsaXplKGFyZ3MpO1xuICAgICAgICAgIG9zZFJlcXVlc3QucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIGluaXRpYWxpemUoeyBjb250YWluZXIsIHByZWZpeFVybCB9KSB7XG4gICAgdGhpcy52aWV3ZXIgPSBPcGVuU2VhZHJhZ29uKHtcbiAgICAgIGVsZW1lbnQ6IGNvbnRhaW5lcixcbiAgICAgIHByZWZpeFVybDogcHJlZml4VXJsLFxuICAgICAgc2hvd05hdmlnYXRpb25Db250cm9sOiBmYWxzZSxcbiAgICAgIG1heFpvb21QaXhlbFJhdGlvOiAxMCxcbiAgICAgIGdlc3R1cmVTZXR0aW5nc01vdXNlOiB7XG4gICAgICAgIGNsaWNrVG9ab29tOiBmYWxzZVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gVE9ETzogTWF5YmUgZG9uJ3QgbmVlZCB0byBkbyB0aGlzIGV2ZXJ5IGZyYW1lLlxuICAgIHRoaXMudmlld2VyLmFkZEhhbmRsZXIoJ2FuaW1hdGlvbicsICgpID0+IHtcbiAgICAgIGNvbnN0IGZyYW1lSW5kZXggPSB0aGlzLmZpZ3VyZUZyYW1lSW5kZXgoKTtcbiAgICAgIGlmIChmcmFtZUluZGV4ICE9PSAtMSAmJiBmcmFtZUluZGV4ICE9PSB0aGlzLmZyYW1lSW5kZXgpIHtcbiAgICAgICAgdGhpcy5mcmFtZUluZGV4ID0gZnJhbWVJbmRleDtcbiAgICAgICAgaWYgKHRoaXMub25GcmFtZUNoYW5nZSkge1xuICAgICAgICAgIHRoaXMub25GcmFtZUNoYW5nZSh7IGZyYW1lSW5kZXgsIGlzTGFzdEZyYW1lOiBmcmFtZUluZGV4ID09PSB0aGlzLmdldEZyYW1lQ291bnQoKSAtIDEgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMudmlld2VyLmFkZEhhbmRsZXIoJ2NhbnZhcy1jbGljaycsIGV2ZW50ID0+IHtcbiAgICAgIGlmICghZXZlbnQucXVpY2spIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwb2ludCA9IHRoaXMudmlld2VyLnZpZXdwb3J0LnBvaW50RnJvbVBpeGVsKGV2ZW50LnBvc2l0aW9uKTtcbiAgICAgIGxldCBmb3VuZEluZGV4ID0gLTE7XG4gICAgICBjb25zdCBpdGVtQ291bnQgPSB0aGlzLnZpZXdlci53b3JsZC5nZXRJdGVtQ291bnQoKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaXRlbUNvdW50OyBpKyspIHtcbiAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMudmlld2VyLndvcmxkLmdldEl0ZW1BdChpKTtcbiAgICAgICAgaWYgKGl0ZW0uZ2V0Qm91bmRzKCkuY29udGFpbnNQb2ludChwb2ludCkpIHtcbiAgICAgICAgICBmb3VuZEluZGV4ID0gaTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgY29uc3QgcmVhbEZyYW1lSW5kZXggPSB0aGlzLmZpZ3VyZUZyYW1lSW5kZXgoKTtcbiAgICAgICAgaWYgKHJlYWxGcmFtZUluZGV4ID09PSAtMSkge1xuICAgICAgICAgIHRoaXMuZ29Ub0ZyYW1lKHRoaXMuZnJhbWVJbmRleCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5nb1RvTmV4dEZyYW1lKCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZm91bmRJbmRleCA9PT0gdGhpcy5mcmFtZUluZGV4KSB7XG4gICAgICAgIHRoaXMuZ29Ub05leHRGcmFtZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5nb1RvRnJhbWUoZm91bmRJbmRleCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBvcmlnaW5hbFNjcm9sbEhhbmRsZXIgPSB0aGlzLnZpZXdlci5pbm5lclRyYWNrZXIuc2Nyb2xsSGFuZGxlcjtcbiAgICB0aGlzLnZpZXdlci5pbm5lclRyYWNrZXIuc2Nyb2xsSGFuZGxlciA9IGV2ZW50ID0+IHtcbiAgICAgIGlmIChcbiAgICAgICAgZXZlbnQub3JpZ2luYWxFdmVudC5jdHJsS2V5IHx8XG4gICAgICAgIGV2ZW50Lm9yaWdpbmFsRXZlbnQuYWx0S2V5IHx8XG4gICAgICAgIGV2ZW50Lm9yaWdpbmFsRXZlbnQubWV0YUtleVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBvcmlnaW5hbFNjcm9sbEhhbmRsZXIuY2FsbCh0aGlzLnZpZXdlci5pbm5lclRyYWNrZXIsIGV2ZW50KTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGV2ZW50LnNjcm9sbCwgbm93LCBub3cgLSB0aGlzLmxhc3RTY3JvbGxUaW1lKTtcbiAgICAgIGlmIChub3cgLSB0aGlzLmxhc3RTY3JvbGxUaW1lIDwgdGhpcy5zY3JvbGxEZWxheSkge1xuICAgICAgICAvLyBSZXR1cm5pbmcgZmFsc2Ugc3RvcHMgdGhlIGJyb3dzZXIgZnJvbSBzY3JvbGxpbmcgaXRzZWxmLlxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIHRoaXMubGFzdFNjcm9sbFRpbWUgPSBub3c7XG4gICAgICBpZiAoZXZlbnQuc2Nyb2xsIDwgMCkge1xuICAgICAgICB0aGlzLmdvVG9OZXh0RnJhbWUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZ29Ub1ByZXZpb3VzRnJhbWUoKTtcbiAgICAgIH1cblxuICAgICAgLy8gUmV0dXJuaW5nIGZhbHNlIHN0b3BzIHRoZSBicm93c2VyIGZyb20gc2Nyb2xsaW5nIGl0c2VsZi5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBldmVudCA9PiB7XG4gICAgICBpZiAoZXZlbnQuYWx0S2V5IHx8IGV2ZW50LnNoaWZ0S2V5IHx8IGV2ZW50LmN0cmxLZXkgfHwgZXZlbnQubWV0YUtleSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChldmVudC5rZXkgPT09ICdBcnJvd1JpZ2h0JyB8fCBldmVudC5rZXkgPT09ICdBcnJvd0Rvd24nIHx8IGV2ZW50LmtleSA9PT0gJyAnKSB7XG4gICAgICAgIHRoaXMuZ29Ub05leHRGcmFtZSgpO1xuICAgICAgfSBlbHNlIGlmIChldmVudC5rZXkgPT09ICdBcnJvd0xlZnQnIHx8IGV2ZW50LmtleSA9PT0gJ0Fycm93VXAnKSB7XG4gICAgICAgIHRoaXMuZ29Ub1ByZXZpb3VzRnJhbWUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIH0pO1xuICB9XG5cbiAgb3BlbkNvbWljKGNvbWljKSB7XG4gICAgb3NkUHJvbWlzZS50aGVuKCgpID0+IHtcbiAgICAgIHRoaXMuY29udGFpbmVyLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGNvbWljLmJvZHkuYmFja2dyb3VuZENvbG9yO1xuXG4gICAgICBpZiAoY29taWMuYm9keS5mcmFtZXMpIHtcbiAgICAgICAgdGhpcy5mcmFtZXMgPSBjb21pYy5ib2R5LmZyYW1lcy5tYXAoZnJhbWUgPT4ge1xuICAgICAgICAgIHJldHVybiBuZXcgT3BlblNlYWRyYWdvbi5SZWN0KFxuICAgICAgICAgICAgZnJhbWUueCAtIGZyYW1lLndpZHRoIC8gMixcbiAgICAgICAgICAgIGZyYW1lLnkgLSBmcmFtZS5oZWlnaHQgLyAyLFxuICAgICAgICAgICAgZnJhbWUud2lkdGgsXG4gICAgICAgICAgICBmcmFtZS5oZWlnaHRcbiAgICAgICAgICApO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZnJhbWVzID0gY29taWMuYm9keS5pdGVtcy5tYXAoaXRlbSA9PiB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBPcGVuU2VhZHJhZ29uLlJlY3QoXG4gICAgICAgICAgICBpdGVtLnggLSBpdGVtLndpZHRoIC8gMixcbiAgICAgICAgICAgIGl0ZW0ueSAtIGl0ZW0uaGVpZ2h0IC8gMixcbiAgICAgICAgICAgIGl0ZW0ud2lkdGgsXG4gICAgICAgICAgICBpdGVtLmhlaWdodFxuICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjb21pYy5ib2R5Lml0ZW1zLmZvckVhY2goKGl0ZW0sIGkpID0+IHtcbiAgICAgICAgdmFyIHN1Y2Nlc3M7XG5cbiAgICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICBzdWNjZXNzID0gKCkgPT4gdGhpcy5nb1RvRnJhbWUoMCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnZpZXdlci5hZGRUaWxlZEltYWdlKHtcbiAgICAgICAgICB4OiBpdGVtLnggLSBpdGVtLndpZHRoIC8gMixcbiAgICAgICAgICB5OiBpdGVtLnkgLSBpdGVtLmhlaWdodCAvIDIsXG4gICAgICAgICAgd2lkdGg6IGl0ZW0ud2lkdGgsXG4gICAgICAgICAgc3VjY2Vzczogc3VjY2VzcyxcbiAgICAgICAgICB0aWxlU291cmNlOiB7XG4gICAgICAgICAgICB0eXBlOiAnbGVnYWN5LWltYWdlLXB5cmFtaWQnLFxuICAgICAgICAgICAgbGV2ZWxzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB1cmw6IGl0ZW0udXJsLFxuICAgICAgICAgICAgICAgIHdpZHRoOiBpdGVtLndpZHRoLFxuICAgICAgICAgICAgICAgIGhlaWdodDogaXRlbS5oZWlnaHRcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMub25Db21pY0xvYWQpIHtcbiAgICAgICAgdGhpcy5vbkNvbWljTG9hZCh7fSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBnb1RvRnJhbWUoaW5kZXgpIHtcbiAgICB2YXIgZnJhbWUgPSB0aGlzLmZyYW1lc1tpbmRleF07XG4gICAgdmFyIGJ1ZmZlckZhY3RvciA9IDAuMjtcbiAgICB2YXIgYm94ID0gZnJhbWUuY2xvbmUoKTtcblxuICAgIGJveC53aWR0aCAqPSAxICsgYnVmZmVyRmFjdG9yO1xuICAgIGJveC5oZWlnaHQgKj0gMSArIGJ1ZmZlckZhY3RvcjtcbiAgICBib3gueCAtPSBmcmFtZS53aWR0aCAqIGJ1ZmZlckZhY3RvciAqIDAuNTtcbiAgICBib3gueSAtPSBmcmFtZS5oZWlnaHQgKiBidWZmZXJGYWN0b3IgKiAwLjU7XG5cbiAgICB0aGlzLnZpZXdlci52aWV3cG9ydC5maXRCb3VuZHMoYm94KTtcbiAgfVxuXG4gIGdldEZyYW1lSW5kZXgoKSB7XG4gICAgcmV0dXJuIHRoaXMuZnJhbWVJbmRleDtcbiAgfVxuXG4gIGZpZ3VyZUZyYW1lSW5kZXgoKSB7XG4gICAgbGV0IGJlc3RJbmRleCA9IC0xO1xuICAgIGxldCBiZXN0RGlzdGFuY2UgPSBJbmZpbml0eTtcbiAgICBjb25zdCB2aWV3cG9ydEJvdW5kcyA9IHRoaXMudmlld2VyLnZpZXdwb3J0LmdldEJvdW5kcyh0cnVlKTtcbiAgICBjb25zdCB2aWV3cG9ydENlbnRlciA9IHZpZXdwb3J0Qm91bmRzLmdldENlbnRlcigpO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmZyYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgZnJhbWUgPSB0aGlzLmZyYW1lc1tpXTtcbiAgICAgIGlmIChmcmFtZS5jb250YWluc1BvaW50KHZpZXdwb3J0Q2VudGVyKSkge1xuICAgICAgICBjb25zdCBkaXN0YW5jZSA9IHZpZXdwb3J0Q2VudGVyLnNxdWFyZWREaXN0YW5jZVRvKGZyYW1lLmdldENlbnRlcigpKTtcbiAgICAgICAgaWYgKGRpc3RhbmNlIDwgYmVzdERpc3RhbmNlKSB7XG4gICAgICAgICAgYmVzdERpc3RhbmNlID0gZGlzdGFuY2U7XG4gICAgICAgICAgYmVzdEluZGV4ID0gaTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBiZXN0SW5kZXg7XG4gIH1cblxuICBnZXRGcmFtZUNvdW50KCkge1xuICAgIHJldHVybiB0aGlzLmZyYW1lcy5sZW5ndGg7XG4gIH1cblxuICBnb1RvTmV4dEZyYW1lKCkge1xuICAgIGxldCBpbmRleCA9IHRoaXMuZ2V0RnJhbWVJbmRleCgpO1xuICAgIGlmIChpbmRleCA8IHRoaXMuZnJhbWVzLmxlbmd0aCAtIDEpIHtcbiAgICAgIHRoaXMuZ29Ub0ZyYW1lKGluZGV4ICsgMSk7XG4gICAgfVxuICB9XG5cbiAgZ29Ub1ByZXZpb3VzRnJhbWUoKSB7XG4gICAgbGV0IGluZGV4ID0gdGhpcy5nZXRGcmFtZUluZGV4KCk7XG4gICAgaWYgKGluZGV4ID4gMCkge1xuICAgICAgdGhpcy5nb1RvRnJhbWUoaW5kZXggLSAxKTtcbiAgICB9XG4gIH1cbn1cbiIsImltcG9ydCBEcmlmdG9yeSBmcm9tICcuLi9saWJyYXJ5L2RyaWZ0b3J5JztcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsICgpID0+IHtcbiAgY29uc3QgbmV4dEJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5uZXh0LWJ1dHRvbicpO1xuICBjb25zdCBwcmV2aW91c0J1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wcmV2aW91cy1idXR0b24nKTtcbiAgY29uc3QgZnJhbWVJbmZvID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmZyYW1lLWluZm8nKTtcblxuICBjb25zdCBkcmlmdG9yeSA9IG5ldyBEcmlmdG9yeSh7XG4gICAgY29udGFpbmVyOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZHJpZnRvcnktdmlld2VyLWNvbnRhaW5lcicpLFxuICAgIHByZWZpeFVybDogJ2h0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vb3BlbnNlYWRyYWdvbkAyLjQvYnVpbGQvb3BlbnNlYWRyYWdvbi9pbWFnZXMvJyxcbiAgICBvbkNvbWljTG9hZDogKCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coJ2xvYWRlZCEnKTtcbiAgICB9LFxuICAgIG9uRnJhbWVDaGFuZ2U6ICh7IGZyYW1lSW5kZXgsIGlzTGFzdEZyYW1lIH0pID0+IHtcbiAgICAgIGxldCB0ZXh0ID0gYEZyYW1lICR7ZnJhbWVJbmRleCArIDF9YDtcbiAgICAgIGlmIChpc0xhc3RGcmFtZSkge1xuICAgICAgICB0ZXh0ICs9ICcgKGxhc3QgZnJhbWUhKSc7XG4gICAgICB9XG5cbiAgICAgIGZyYW1lSW5mby50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgfVxuICB9KTtcblxuICBuZXh0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgIGRyaWZ0b3J5LmdvVG9OZXh0RnJhbWUoKTtcbiAgfSk7XG5cbiAgcHJldmlvdXNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgZHJpZnRvcnkuZ29Ub1ByZXZpb3VzRnJhbWUoKTtcbiAgfSk7XG5cbiAgZmV0Y2goJ2NvbWljLmpzb24nKVxuICAgIC50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihyZXNwb25zZSk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGxvYWQgY29taWMuanNvbicpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xuICAgIH0pXG4gICAgLnRoZW4oanNvbiA9PiB7XG4gICAgICAvLyBjb25zb2xlLmxvZyhqc29uKTtcbiAgICAgIGRyaWZ0b3J5Lm9wZW5Db21pYyhqc29uLmNvbWljKTtcbiAgICB9KVxuICAgIC5jYXRjaChlcnJvciA9PiBjb25zb2xlLmVycm9yKGVycm9yKSk7XG59KTtcbiJdLCJuYW1lcyI6WyJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJ2YWx1ZSIsImFscmVhZHlDYWxsZWRTb3VyY2VzIiwiYXdhaXRpbmdDYWxsYmFja3MiLCJhZGRDYWxsYmFjayIsInNyYyIsImNhbGxiYWNrIiwicHVzaCIsImxvYWRKUyIsImluZGV4T2YiLCJzY3JpcHQiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJvbmxvYWQiLCJrZXkiLCJmb3JFYWNoIiwiY2IiLCJoZWFkIiwiYXBwZW5kQ2hpbGQiLCJPcGVuU2VhZHJhZ29uIiwib3NkUmVxdWVzdCIsIm9zZFByb21pc2UiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsIkRyaWZ0b3J5IiwiYXJncyIsImNvbnRhaW5lciIsIm9uRnJhbWVDaGFuZ2UiLCJvbkNvbWljTG9hZCIsImZyYW1lcyIsImZyYW1lSW5kZXgiLCJsYXN0U2Nyb2xsVGltZSIsInNjcm9sbERlbGF5IiwiaW5pdGlhbGl6ZSIsImxvYWRKcyIsIndpbmRvdyIsInByZWZpeFVybCIsInZpZXdlciIsImVsZW1lbnQiLCJzaG93TmF2aWdhdGlvbkNvbnRyb2wiLCJtYXhab29tUGl4ZWxSYXRpbyIsImdlc3R1cmVTZXR0aW5nc01vdXNlIiwiY2xpY2tUb1pvb20iLCJhZGRIYW5kbGVyIiwiZmlndXJlRnJhbWVJbmRleCIsImlzTGFzdEZyYW1lIiwiZ2V0RnJhbWVDb3VudCIsImV2ZW50IiwicXVpY2siLCJwb2ludCIsInZpZXdwb3J0IiwicG9pbnRGcm9tUGl4ZWwiLCJwb3NpdGlvbiIsImZvdW5kSW5kZXgiLCJpdGVtQ291bnQiLCJ3b3JsZCIsImdldEl0ZW1Db3VudCIsImkiLCJpdGVtIiwiZ2V0SXRlbUF0IiwiZ2V0Qm91bmRzIiwiY29udGFpbnNQb2ludCIsInJlYWxGcmFtZUluZGV4IiwiZ29Ub0ZyYW1lIiwiZ29Ub05leHRGcmFtZSIsIm9yaWdpbmFsU2Nyb2xsSGFuZGxlciIsImlubmVyVHJhY2tlciIsInNjcm9sbEhhbmRsZXIiLCJvcmlnaW5hbEV2ZW50IiwiY3RybEtleSIsImFsdEtleSIsIm1ldGFLZXkiLCJjYWxsIiwibm93IiwiRGF0ZSIsInNjcm9sbCIsImdvVG9QcmV2aW91c0ZyYW1lIiwiYWRkRXZlbnRMaXN0ZW5lciIsInNoaWZ0S2V5IiwicHJldmVudERlZmF1bHQiLCJzdG9wUHJvcGFnYXRpb24iLCJjb21pYyIsInRoZW4iLCJzdHlsZSIsImJhY2tncm91bmRDb2xvciIsImJvZHkiLCJtYXAiLCJmcmFtZSIsIlJlY3QiLCJ4Iiwid2lkdGgiLCJ5IiwiaGVpZ2h0IiwiaXRlbXMiLCJzdWNjZXNzIiwiYWRkVGlsZWRJbWFnZSIsInRpbGVTb3VyY2UiLCJ0eXBlIiwibGV2ZWxzIiwidXJsIiwiaW5kZXgiLCJidWZmZXJGYWN0b3IiLCJib3giLCJjbG9uZSIsImZpdEJvdW5kcyIsImJlc3RJbmRleCIsImJlc3REaXN0YW5jZSIsIkluZmluaXR5Iiwidmlld3BvcnRCb3VuZHMiLCJ2aWV3cG9ydENlbnRlciIsImdldENlbnRlciIsImxlbmd0aCIsImRpc3RhbmNlIiwic3F1YXJlZERpc3RhbmNlVG8iLCJnZXRGcmFtZUluZGV4IiwibmV4dEJ1dHRvbiIsInF1ZXJ5U2VsZWN0b3IiLCJwcmV2aW91c0J1dHRvbiIsImZyYW1lSW5mbyIsImRyaWZ0b3J5IiwiY29uc29sZSIsImxvZyIsInRleHQiLCJ0ZXh0Q29udGVudCIsImZldGNoIiwicmVzcG9uc2UiLCJvayIsImVycm9yIiwiRXJyb3IiLCJqc29uIiwib3BlbkNvbWljIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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