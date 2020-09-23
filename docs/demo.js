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
            clickToZoom: false,
            scrollToZoom: false
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
        this.viewer.addHandler('canvas-scroll', function (event) {
          // TODO: Stop the browser window from scrolling; this doesn't seem to do it.
          event.originalEvent.preventDefault();
          event.originalEvent.stopPropagation();
          var now = Date.now(); // console.log(event.scroll, now, now - this.lastScrollTime);

          if (now - _this2.lastScrollTime < _this2.scrollDelay) {
            return;
          }

          _this2.lastScrollTime = now;

          if (event.scroll < 0) {
            _this2.goToNextFrame();
          } else {
            _this2.goToPreviousFrame();
          }
        });
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVtby5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL0BkYW41MDMvbG9hZC1qcy9pbmRleC5qcyIsInNyYy9saWJyYXJ5L2RyaWZ0b3J5LmpzIiwic3JjL2RlbW8vZGVtby5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG52YXIgYWxyZWFkeUNhbGxlZFNvdXJjZXMgPSBbXTtcclxudmFyIGF3YWl0aW5nQ2FsbGJhY2tzID0ge307XHJcbnZhciBhZGRDYWxsYmFjayA9IGZ1bmN0aW9uIChzcmMsIGNhbGxiYWNrKSB7XHJcbiAgICBpZiAoYXdhaXRpbmdDYWxsYmFja3Nbc3JjXSkge1xyXG4gICAgICAgIGF3YWl0aW5nQ2FsbGJhY2tzW3NyY10ucHVzaChjYWxsYmFjayk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBhd2FpdGluZ0NhbGxiYWNrc1tzcmNdID0gW2NhbGxiYWNrXTtcclxuICAgIH1cclxufTtcclxuZnVuY3Rpb24gbG9hZEpTKHNyYywgY2FsbGJhY2spIHtcclxuICAgIGlmIChhbHJlYWR5Q2FsbGVkU291cmNlcy5pbmRleE9mKHNyYykgPCAwKSB7XHJcbiAgICAgICAgYWxyZWFkeUNhbGxlZFNvdXJjZXMucHVzaChzcmMpO1xyXG4gICAgICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcclxuICAgICAgICBzY3JpcHQuc3JjID0gc3JjO1xyXG4gICAgICAgIHNjcmlwdC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGFkZENhbGxiYWNrKHNyYywgY2FsbGJhY2spO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gYXdhaXRpbmdDYWxsYmFja3MpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0aW5nQ2FsbGJhY2tzW2tleV0uZm9yRWFjaChmdW5jdGlvbiAoY2IpIHsgcmV0dXJuIGNiKCk7IH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHNjcmlwdCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBhZGRDYWxsYmFjayhzcmMsIGNhbGxiYWNrKTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLmRlZmF1bHQgPSBsb2FkSlM7XHJcbiIsImltcG9ydCBsb2FkSnMgZnJvbSAnQGRhbjUwMy9sb2FkLWpzJztcblxubGV0IE9wZW5TZWFkcmFnb247XG5sZXQgb3NkUmVxdWVzdDtcblxuY29uc3Qgb3NkUHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgb3NkUmVxdWVzdCA9IHsgcmVzb2x2ZSwgcmVqZWN0IH07XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRHJpZnRvcnkge1xuICBjb25zdHJ1Y3RvcihhcmdzKSB7XG4gICAgdGhpcy5jb250YWluZXIgPSBhcmdzLmNvbnRhaW5lcjtcbiAgICB0aGlzLm9uRnJhbWVDaGFuZ2UgPSBhcmdzLm9uRnJhbWVDaGFuZ2U7XG4gICAgdGhpcy5vbkNvbWljTG9hZCA9IGFyZ3Mub25Db21pY0xvYWQ7XG4gICAgdGhpcy5mcmFtZXMgPSBbXTtcbiAgICB0aGlzLmZyYW1lSW5kZXggPSAtMTtcbiAgICB0aGlzLmxhc3RTY3JvbGxUaW1lID0gMDtcbiAgICB0aGlzLnNjcm9sbERlbGF5ID0gMjAwMDtcblxuICAgIC8vIFRPRE86IE1ha2UgdGhpcyBtb3JlIHJvYnVzdCBzbyBpdCBoYW5kbGVzIG11bHRpcGxlIHZpZXdlcnMgYmVpbmcgY3JlYXRlZCBhdCB0aGUgc2FtZSB0aW1lLlxuICAgIC8vIFJpZ2h0IG5vdyB0aGV5IHdvdWxkIGJvdGggbG9hZCBPU0Qgc2luY2UgdGhleSB3b3VsZCBzdGFydCBiZWZvcmUgdGhlIG90aGVyIGZpbmlzaGVkLlxuICAgIGlmIChPcGVuU2VhZHJhZ29uKSB7XG4gICAgICB0aGlzLmluaXRpYWxpemUoYXJncyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvYWRKcyhcbiAgICAgICAgJ2h0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vb3BlbnNlYWRyYWdvbkAyLjQvYnVpbGQvb3BlbnNlYWRyYWdvbi9vcGVuc2VhZHJhZ29uLm1pbi5qcycsXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICBPcGVuU2VhZHJhZ29uID0gd2luZG93Lk9wZW5TZWFkcmFnb247XG4gICAgICAgICAgdGhpcy5pbml0aWFsaXplKGFyZ3MpO1xuICAgICAgICAgIG9zZFJlcXVlc3QucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIGluaXRpYWxpemUoeyBjb250YWluZXIsIHByZWZpeFVybCB9KSB7XG4gICAgdGhpcy52aWV3ZXIgPSBPcGVuU2VhZHJhZ29uKHtcbiAgICAgIGVsZW1lbnQ6IGNvbnRhaW5lcixcbiAgICAgIHByZWZpeFVybDogcHJlZml4VXJsLFxuICAgICAgc2hvd05hdmlnYXRpb25Db250cm9sOiBmYWxzZSxcbiAgICAgIG1heFpvb21QaXhlbFJhdGlvOiAxMCxcbiAgICAgIGdlc3R1cmVTZXR0aW5nc01vdXNlOiB7XG4gICAgICAgIGNsaWNrVG9ab29tOiBmYWxzZSxcbiAgICAgICAgc2Nyb2xsVG9ab29tOiBmYWxzZVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gVE9ETzogTWF5YmUgZG9uJ3QgbmVlZCB0byBkbyB0aGlzIGV2ZXJ5IGZyYW1lLlxuICAgIHRoaXMudmlld2VyLmFkZEhhbmRsZXIoJ2FuaW1hdGlvbicsICgpID0+IHtcbiAgICAgIGNvbnN0IGZyYW1lSW5kZXggPSB0aGlzLmZpZ3VyZUZyYW1lSW5kZXgoKTtcbiAgICAgIGlmIChmcmFtZUluZGV4ICE9PSAtMSAmJiBmcmFtZUluZGV4ICE9PSB0aGlzLmZyYW1lSW5kZXgpIHtcbiAgICAgICAgdGhpcy5mcmFtZUluZGV4ID0gZnJhbWVJbmRleDtcbiAgICAgICAgaWYgKHRoaXMub25GcmFtZUNoYW5nZSkge1xuICAgICAgICAgIHRoaXMub25GcmFtZUNoYW5nZSh7IGZyYW1lSW5kZXgsIGlzTGFzdEZyYW1lOiBmcmFtZUluZGV4ID09PSB0aGlzLmdldEZyYW1lQ291bnQoKSAtIDEgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMudmlld2VyLmFkZEhhbmRsZXIoJ2NhbnZhcy1jbGljaycsIGV2ZW50ID0+IHtcbiAgICAgIGlmICghZXZlbnQucXVpY2spIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwb2ludCA9IHRoaXMudmlld2VyLnZpZXdwb3J0LnBvaW50RnJvbVBpeGVsKGV2ZW50LnBvc2l0aW9uKTtcbiAgICAgIGxldCBmb3VuZEluZGV4ID0gLTE7XG4gICAgICBjb25zdCBpdGVtQ291bnQgPSB0aGlzLnZpZXdlci53b3JsZC5nZXRJdGVtQ291bnQoKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaXRlbUNvdW50OyBpKyspIHtcbiAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMudmlld2VyLndvcmxkLmdldEl0ZW1BdChpKTtcbiAgICAgICAgaWYgKGl0ZW0uZ2V0Qm91bmRzKCkuY29udGFpbnNQb2ludChwb2ludCkpIHtcbiAgICAgICAgICBmb3VuZEluZGV4ID0gaTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgY29uc3QgcmVhbEZyYW1lSW5kZXggPSB0aGlzLmZpZ3VyZUZyYW1lSW5kZXgoKTtcbiAgICAgICAgaWYgKHJlYWxGcmFtZUluZGV4ID09PSAtMSkge1xuICAgICAgICAgIHRoaXMuZ29Ub0ZyYW1lKHRoaXMuZnJhbWVJbmRleCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5nb1RvTmV4dEZyYW1lKCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZm91bmRJbmRleCA9PT0gdGhpcy5mcmFtZUluZGV4KSB7XG4gICAgICAgIHRoaXMuZ29Ub05leHRGcmFtZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5nb1RvRnJhbWUoZm91bmRJbmRleCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLnZpZXdlci5hZGRIYW5kbGVyKCdjYW52YXMtc2Nyb2xsJywgZXZlbnQgPT4ge1xuICAgICAgLy8gVE9ETzogU3RvcCB0aGUgYnJvd3NlciB3aW5kb3cgZnJvbSBzY3JvbGxpbmc7IHRoaXMgZG9lc24ndCBzZWVtIHRvIGRvIGl0LlxuICAgICAgZXZlbnQub3JpZ2luYWxFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgZXZlbnQub3JpZ2luYWxFdmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGV2ZW50LnNjcm9sbCwgbm93LCBub3cgLSB0aGlzLmxhc3RTY3JvbGxUaW1lKTtcbiAgICAgIGlmIChub3cgLSB0aGlzLmxhc3RTY3JvbGxUaW1lIDwgdGhpcy5zY3JvbGxEZWxheSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMubGFzdFNjcm9sbFRpbWUgPSBub3c7XG4gICAgICBpZiAoZXZlbnQuc2Nyb2xsIDwgMCkge1xuICAgICAgICB0aGlzLmdvVG9OZXh0RnJhbWUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZ29Ub1ByZXZpb3VzRnJhbWUoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZXZlbnQgPT4ge1xuICAgICAgaWYgKGV2ZW50LmFsdEtleSB8fCBldmVudC5zaGlmdEtleSB8fCBldmVudC5jdHJsS2V5IHx8IGV2ZW50Lm1ldGFLZXkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoZXZlbnQua2V5ID09PSAnQXJyb3dSaWdodCcgfHwgZXZlbnQua2V5ID09PSAnQXJyb3dEb3duJyB8fCBldmVudC5rZXkgPT09ICcgJykge1xuICAgICAgICB0aGlzLmdvVG9OZXh0RnJhbWUoKTtcbiAgICAgIH0gZWxzZSBpZiAoZXZlbnQua2V5ID09PSAnQXJyb3dMZWZ0JyB8fCBldmVudC5rZXkgPT09ICdBcnJvd1VwJykge1xuICAgICAgICB0aGlzLmdvVG9QcmV2aW91c0ZyYW1lKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9KTtcbiAgfVxuXG4gIG9wZW5Db21pYyhjb21pYykge1xuICAgIG9zZFByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICB0aGlzLmNvbnRhaW5lci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBjb21pYy5ib2R5LmJhY2tncm91bmRDb2xvcjtcblxuICAgICAgaWYgKGNvbWljLmJvZHkuZnJhbWVzKSB7XG4gICAgICAgIHRoaXMuZnJhbWVzID0gY29taWMuYm9keS5mcmFtZXMubWFwKGZyYW1lID0+IHtcbiAgICAgICAgICByZXR1cm4gbmV3IE9wZW5TZWFkcmFnb24uUmVjdChcbiAgICAgICAgICAgIGZyYW1lLnggLSBmcmFtZS53aWR0aCAvIDIsXG4gICAgICAgICAgICBmcmFtZS55IC0gZnJhbWUuaGVpZ2h0IC8gMixcbiAgICAgICAgICAgIGZyYW1lLndpZHRoLFxuICAgICAgICAgICAgZnJhbWUuaGVpZ2h0XG4gICAgICAgICAgKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmZyYW1lcyA9IGNvbWljLmJvZHkuaXRlbXMubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgIHJldHVybiBuZXcgT3BlblNlYWRyYWdvbi5SZWN0KFxuICAgICAgICAgICAgaXRlbS54IC0gaXRlbS53aWR0aCAvIDIsXG4gICAgICAgICAgICBpdGVtLnkgLSBpdGVtLmhlaWdodCAvIDIsXG4gICAgICAgICAgICBpdGVtLndpZHRoLFxuICAgICAgICAgICAgaXRlbS5oZWlnaHRcbiAgICAgICAgICApO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY29taWMuYm9keS5pdGVtcy5mb3JFYWNoKChpdGVtLCBpKSA9PiB7XG4gICAgICAgIHZhciBzdWNjZXNzO1xuXG4gICAgICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgICAgc3VjY2VzcyA9ICgpID0+IHRoaXMuZ29Ub0ZyYW1lKDApO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy52aWV3ZXIuYWRkVGlsZWRJbWFnZSh7XG4gICAgICAgICAgeDogaXRlbS54IC0gaXRlbS53aWR0aCAvIDIsXG4gICAgICAgICAgeTogaXRlbS55IC0gaXRlbS5oZWlnaHQgLyAyLFxuICAgICAgICAgIHdpZHRoOiBpdGVtLndpZHRoLFxuICAgICAgICAgIHN1Y2Nlc3M6IHN1Y2Nlc3MsXG4gICAgICAgICAgdGlsZVNvdXJjZToge1xuICAgICAgICAgICAgdHlwZTogJ2xlZ2FjeS1pbWFnZS1weXJhbWlkJyxcbiAgICAgICAgICAgIGxldmVsczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdXJsOiBpdGVtLnVybCxcbiAgICAgICAgICAgICAgICB3aWR0aDogaXRlbS53aWR0aCxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IGl0ZW0uaGVpZ2h0XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGlmICh0aGlzLm9uQ29taWNMb2FkKSB7XG4gICAgICAgIHRoaXMub25Db21pY0xvYWQoe30pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZ29Ub0ZyYW1lKGluZGV4KSB7XG4gICAgdmFyIGZyYW1lID0gdGhpcy5mcmFtZXNbaW5kZXhdO1xuICAgIHZhciBidWZmZXJGYWN0b3IgPSAwLjI7XG4gICAgdmFyIGJveCA9IGZyYW1lLmNsb25lKCk7XG5cbiAgICBib3gud2lkdGggKj0gMSArIGJ1ZmZlckZhY3RvcjtcbiAgICBib3guaGVpZ2h0ICo9IDEgKyBidWZmZXJGYWN0b3I7XG4gICAgYm94LnggLT0gZnJhbWUud2lkdGggKiBidWZmZXJGYWN0b3IgKiAwLjU7XG4gICAgYm94LnkgLT0gZnJhbWUuaGVpZ2h0ICogYnVmZmVyRmFjdG9yICogMC41O1xuXG4gICAgdGhpcy52aWV3ZXIudmlld3BvcnQuZml0Qm91bmRzKGJveCk7XG4gIH1cblxuICBnZXRGcmFtZUluZGV4KCkge1xuICAgIHJldHVybiB0aGlzLmZyYW1lSW5kZXg7XG4gIH1cblxuICBmaWd1cmVGcmFtZUluZGV4KCkge1xuICAgIGxldCBiZXN0SW5kZXggPSAtMTtcbiAgICBsZXQgYmVzdERpc3RhbmNlID0gSW5maW5pdHk7XG4gICAgY29uc3Qgdmlld3BvcnRCb3VuZHMgPSB0aGlzLnZpZXdlci52aWV3cG9ydC5nZXRCb3VuZHModHJ1ZSk7XG4gICAgY29uc3Qgdmlld3BvcnRDZW50ZXIgPSB2aWV3cG9ydEJvdW5kcy5nZXRDZW50ZXIoKTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5mcmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGZyYW1lID0gdGhpcy5mcmFtZXNbaV07XG4gICAgICBpZiAoZnJhbWUuY29udGFpbnNQb2ludCh2aWV3cG9ydENlbnRlcikpIHtcbiAgICAgICAgY29uc3QgZGlzdGFuY2UgPSB2aWV3cG9ydENlbnRlci5zcXVhcmVkRGlzdGFuY2VUbyhmcmFtZS5nZXRDZW50ZXIoKSk7XG4gICAgICAgIGlmIChkaXN0YW5jZSA8IGJlc3REaXN0YW5jZSkge1xuICAgICAgICAgIGJlc3REaXN0YW5jZSA9IGRpc3RhbmNlO1xuICAgICAgICAgIGJlc3RJbmRleCA9IGk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYmVzdEluZGV4O1xuICB9XG5cbiAgZ2V0RnJhbWVDb3VudCgpIHtcbiAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoO1xuICB9XG5cbiAgZ29Ub05leHRGcmFtZSgpIHtcbiAgICBsZXQgaW5kZXggPSB0aGlzLmdldEZyYW1lSW5kZXgoKTtcbiAgICBpZiAoaW5kZXggPCB0aGlzLmZyYW1lcy5sZW5ndGggLSAxKSB7XG4gICAgICB0aGlzLmdvVG9GcmFtZShpbmRleCArIDEpO1xuICAgIH1cbiAgfVxuXG4gIGdvVG9QcmV2aW91c0ZyYW1lKCkge1xuICAgIGxldCBpbmRleCA9IHRoaXMuZ2V0RnJhbWVJbmRleCgpO1xuICAgIGlmIChpbmRleCA+IDApIHtcbiAgICAgIHRoaXMuZ29Ub0ZyYW1lKGluZGV4IC0gMSk7XG4gICAgfVxuICB9XG59XG4iLCJpbXBvcnQgRHJpZnRvcnkgZnJvbSAnLi4vbGlicmFyeS9kcmlmdG9yeSc7XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG4gIGNvbnN0IG5leHRCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubmV4dC1idXR0b24nKTtcbiAgY29uc3QgcHJldmlvdXNCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucHJldmlvdXMtYnV0dG9uJyk7XG4gIGNvbnN0IGZyYW1lSW5mbyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5mcmFtZS1pbmZvJyk7XG5cbiAgY29uc3QgZHJpZnRvcnkgPSBuZXcgRHJpZnRvcnkoe1xuICAgIGNvbnRhaW5lcjogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmRyaWZ0b3J5LXZpZXdlci1jb250YWluZXInKSxcbiAgICBwcmVmaXhVcmw6ICdodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL29wZW5zZWFkcmFnb25AMi40L2J1aWxkL29wZW5zZWFkcmFnb24vaW1hZ2VzLycsXG4gICAgb25Db21pY0xvYWQ6ICgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCdsb2FkZWQhJyk7XG4gICAgfSxcbiAgICBvbkZyYW1lQ2hhbmdlOiAoeyBmcmFtZUluZGV4LCBpc0xhc3RGcmFtZSB9KSA9PiB7XG4gICAgICBsZXQgdGV4dCA9IGBGcmFtZSAke2ZyYW1lSW5kZXggKyAxfWA7XG4gICAgICBpZiAoaXNMYXN0RnJhbWUpIHtcbiAgICAgICAgdGV4dCArPSAnIChsYXN0IGZyYW1lISknO1xuICAgICAgfVxuXG4gICAgICBmcmFtZUluZm8udGV4dENvbnRlbnQgPSB0ZXh0O1xuICAgIH1cbiAgfSk7XG5cbiAgbmV4dEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICBkcmlmdG9yeS5nb1RvTmV4dEZyYW1lKCk7XG4gIH0pO1xuXG4gIHByZXZpb3VzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgIGRyaWZ0b3J5LmdvVG9QcmV2aW91c0ZyYW1lKCk7XG4gIH0pO1xuXG4gIGZldGNoKCdjb21pYy5qc29uJylcbiAgICAudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IocmVzcG9uc2UpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBsb2FkIGNvbWljLmpzb24nKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbiAgICB9KVxuICAgIC50aGVuKGpzb24gPT4ge1xuICAgICAgLy8gY29uc29sZS5sb2coanNvbik7XG4gICAgICBkcmlmdG9yeS5vcGVuQ29taWMoanNvbi5jb21pYyk7XG4gICAgfSlcbiAgICAuY2F0Y2goZXJyb3IgPT4gY29uc29sZS5lcnJvcihlcnJvcikpO1xufSk7XG4iXSwibmFtZXMiOlsiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwidmFsdWUiLCJhbHJlYWR5Q2FsbGVkU291cmNlcyIsImF3YWl0aW5nQ2FsbGJhY2tzIiwiYWRkQ2FsbGJhY2siLCJzcmMiLCJjYWxsYmFjayIsInB1c2giLCJsb2FkSlMiLCJpbmRleE9mIiwic2NyaXB0IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50Iiwib25sb2FkIiwia2V5IiwiZm9yRWFjaCIsImNiIiwiaGVhZCIsImFwcGVuZENoaWxkIiwiT3BlblNlYWRyYWdvbiIsIm9zZFJlcXVlc3QiLCJvc2RQcm9taXNlIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJEcmlmdG9yeSIsImFyZ3MiLCJjb250YWluZXIiLCJvbkZyYW1lQ2hhbmdlIiwib25Db21pY0xvYWQiLCJmcmFtZXMiLCJmcmFtZUluZGV4IiwibGFzdFNjcm9sbFRpbWUiLCJzY3JvbGxEZWxheSIsImluaXRpYWxpemUiLCJsb2FkSnMiLCJ3aW5kb3ciLCJwcmVmaXhVcmwiLCJ2aWV3ZXIiLCJlbGVtZW50Iiwic2hvd05hdmlnYXRpb25Db250cm9sIiwibWF4Wm9vbVBpeGVsUmF0aW8iLCJnZXN0dXJlU2V0dGluZ3NNb3VzZSIsImNsaWNrVG9ab29tIiwic2Nyb2xsVG9ab29tIiwiYWRkSGFuZGxlciIsImZpZ3VyZUZyYW1lSW5kZXgiLCJpc0xhc3RGcmFtZSIsImdldEZyYW1lQ291bnQiLCJldmVudCIsInF1aWNrIiwicG9pbnQiLCJ2aWV3cG9ydCIsInBvaW50RnJvbVBpeGVsIiwicG9zaXRpb24iLCJmb3VuZEluZGV4IiwiaXRlbUNvdW50Iiwid29ybGQiLCJnZXRJdGVtQ291bnQiLCJpIiwiaXRlbSIsImdldEl0ZW1BdCIsImdldEJvdW5kcyIsImNvbnRhaW5zUG9pbnQiLCJyZWFsRnJhbWVJbmRleCIsImdvVG9GcmFtZSIsImdvVG9OZXh0RnJhbWUiLCJvcmlnaW5hbEV2ZW50IiwicHJldmVudERlZmF1bHQiLCJzdG9wUHJvcGFnYXRpb24iLCJub3ciLCJEYXRlIiwic2Nyb2xsIiwiZ29Ub1ByZXZpb3VzRnJhbWUiLCJhZGRFdmVudExpc3RlbmVyIiwiYWx0S2V5Iiwic2hpZnRLZXkiLCJjdHJsS2V5IiwibWV0YUtleSIsImNvbWljIiwidGhlbiIsInN0eWxlIiwiYmFja2dyb3VuZENvbG9yIiwiYm9keSIsIm1hcCIsImZyYW1lIiwiUmVjdCIsIngiLCJ3aWR0aCIsInkiLCJoZWlnaHQiLCJpdGVtcyIsInN1Y2Nlc3MiLCJhZGRUaWxlZEltYWdlIiwidGlsZVNvdXJjZSIsInR5cGUiLCJsZXZlbHMiLCJ1cmwiLCJpbmRleCIsImJ1ZmZlckZhY3RvciIsImJveCIsImNsb25lIiwiZml0Qm91bmRzIiwiYmVzdEluZGV4IiwiYmVzdERpc3RhbmNlIiwiSW5maW5pdHkiLCJ2aWV3cG9ydEJvdW5kcyIsInZpZXdwb3J0Q2VudGVyIiwiZ2V0Q2VudGVyIiwibGVuZ3RoIiwiZGlzdGFuY2UiLCJzcXVhcmVkRGlzdGFuY2VUbyIsImdldEZyYW1lSW5kZXgiLCJuZXh0QnV0dG9uIiwicXVlcnlTZWxlY3RvciIsInByZXZpb3VzQnV0dG9uIiwiZnJhbWVJbmZvIiwiZHJpZnRvcnkiLCJjb25zb2xlIiwibG9nIiwidGV4dCIsInRleHRDb250ZW50IiwiZmV0Y2giLCJyZXNwb25zZSIsIm9rIiwiZXJyb3IiLCJFcnJvciIsImpzb24iLCJvcGVuQ29taWMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQUNBQSxNQUFNLENBQUNDLGNBQVAsQ0FBc0JDLE9BQXRCLEVBQStCLFlBQS9CLEVBQTZDO0VBQUVDLEVBQUFBLEtBQUssRUFBRTtFQUFULENBQTdDO0VBQ0EsSUFBSUMsb0JBQW9CLEdBQUcsRUFBM0I7RUFDQSxJQUFJQyxpQkFBaUIsR0FBRyxFQUF4Qjs7RUFDQSxJQUFJQyxXQUFXLEdBQUcsU0FBZEEsV0FBYyxDQUFVQyxHQUFWLEVBQWVDLFFBQWYsRUFBeUI7RUFDdkMsTUFBSUgsaUJBQWlCLENBQUNFLEdBQUQsQ0FBckIsRUFBNEI7RUFDeEJGLElBQUFBLGlCQUFpQixDQUFDRSxHQUFELENBQWpCLENBQXVCRSxJQUF2QixDQUE0QkQsUUFB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