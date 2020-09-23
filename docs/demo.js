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
      this.frameIndex = -1; // TODO: Make this more robust so it handles multiple viewers being created at the same time.
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVtby5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL0BkYW41MDMvbG9hZC1qcy9pbmRleC5qcyIsInNyYy9saWJyYXJ5L2RyaWZ0b3J5LmpzIiwic3JjL2RlbW8vZGVtby5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG52YXIgYWxyZWFkeUNhbGxlZFNvdXJjZXMgPSBbXTtcclxudmFyIGF3YWl0aW5nQ2FsbGJhY2tzID0ge307XHJcbnZhciBhZGRDYWxsYmFjayA9IGZ1bmN0aW9uIChzcmMsIGNhbGxiYWNrKSB7XHJcbiAgICBpZiAoYXdhaXRpbmdDYWxsYmFja3Nbc3JjXSkge1xyXG4gICAgICAgIGF3YWl0aW5nQ2FsbGJhY2tzW3NyY10ucHVzaChjYWxsYmFjayk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBhd2FpdGluZ0NhbGxiYWNrc1tzcmNdID0gW2NhbGxiYWNrXTtcclxuICAgIH1cclxufTtcclxuZnVuY3Rpb24gbG9hZEpTKHNyYywgY2FsbGJhY2spIHtcclxuICAgIGlmIChhbHJlYWR5Q2FsbGVkU291cmNlcy5pbmRleE9mKHNyYykgPCAwKSB7XHJcbiAgICAgICAgYWxyZWFkeUNhbGxlZFNvdXJjZXMucHVzaChzcmMpO1xyXG4gICAgICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcclxuICAgICAgICBzY3JpcHQuc3JjID0gc3JjO1xyXG4gICAgICAgIHNjcmlwdC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGFkZENhbGxiYWNrKHNyYywgY2FsbGJhY2spO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gYXdhaXRpbmdDYWxsYmFja3MpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0aW5nQ2FsbGJhY2tzW2tleV0uZm9yRWFjaChmdW5jdGlvbiAoY2IpIHsgcmV0dXJuIGNiKCk7IH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHNjcmlwdCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBhZGRDYWxsYmFjayhzcmMsIGNhbGxiYWNrKTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLmRlZmF1bHQgPSBsb2FkSlM7XHJcbiIsImltcG9ydCBsb2FkSnMgZnJvbSAnQGRhbjUwMy9sb2FkLWpzJztcblxubGV0IE9wZW5TZWFkcmFnb247XG5sZXQgb3NkUmVxdWVzdDtcblxuY29uc3Qgb3NkUHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgb3NkUmVxdWVzdCA9IHsgcmVzb2x2ZSwgcmVqZWN0IH07XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRHJpZnRvcnkge1xuICBjb25zdHJ1Y3RvcihhcmdzKSB7XG4gICAgdGhpcy5jb250YWluZXIgPSBhcmdzLmNvbnRhaW5lcjtcbiAgICB0aGlzLm9uRnJhbWVDaGFuZ2UgPSBhcmdzLm9uRnJhbWVDaGFuZ2U7XG4gICAgdGhpcy5vbkNvbWljTG9hZCA9IGFyZ3Mub25Db21pY0xvYWQ7XG4gICAgdGhpcy5mcmFtZXMgPSBbXTtcbiAgICB0aGlzLmZyYW1lSW5kZXggPSAtMTtcblxuICAgIC8vIFRPRE86IE1ha2UgdGhpcyBtb3JlIHJvYnVzdCBzbyBpdCBoYW5kbGVzIG11bHRpcGxlIHZpZXdlcnMgYmVpbmcgY3JlYXRlZCBhdCB0aGUgc2FtZSB0aW1lLlxuICAgIC8vIFJpZ2h0IG5vdyB0aGV5IHdvdWxkIGJvdGggbG9hZCBPU0Qgc2luY2UgdGhleSB3b3VsZCBzdGFydCBiZWZvcmUgdGhlIG90aGVyIGZpbmlzaGVkLlxuICAgIGlmIChPcGVuU2VhZHJhZ29uKSB7XG4gICAgICB0aGlzLmluaXRpYWxpemUoYXJncyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvYWRKcyhcbiAgICAgICAgJ2h0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vb3BlbnNlYWRyYWdvbkAyLjQvYnVpbGQvb3BlbnNlYWRyYWdvbi9vcGVuc2VhZHJhZ29uLm1pbi5qcycsXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICBPcGVuU2VhZHJhZ29uID0gd2luZG93Lk9wZW5TZWFkcmFnb247XG4gICAgICAgICAgdGhpcy5pbml0aWFsaXplKGFyZ3MpO1xuICAgICAgICAgIG9zZFJlcXVlc3QucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIGluaXRpYWxpemUoeyBjb250YWluZXIsIHByZWZpeFVybCB9KSB7XG4gICAgdGhpcy52aWV3ZXIgPSBPcGVuU2VhZHJhZ29uKHtcbiAgICAgIGVsZW1lbnQ6IGNvbnRhaW5lcixcbiAgICAgIHByZWZpeFVybDogcHJlZml4VXJsLFxuICAgICAgc2hvd05hdmlnYXRpb25Db250cm9sOiBmYWxzZSxcbiAgICAgIG1heFpvb21QaXhlbFJhdGlvOiAxMCxcbiAgICAgIGdlc3R1cmVTZXR0aW5nc01vdXNlOiB7XG4gICAgICAgIGNsaWNrVG9ab29tOiBmYWxzZSxcbiAgICAgICAgc2Nyb2xsVG9ab29tOiBmYWxzZVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gVE9ETzogTWF5YmUgZG9uJ3QgbmVlZCB0byBkbyB0aGlzIGV2ZXJ5IGZyYW1lLlxuICAgIHRoaXMudmlld2VyLmFkZEhhbmRsZXIoJ2FuaW1hdGlvbicsICgpID0+IHtcbiAgICAgIGNvbnN0IGZyYW1lSW5kZXggPSB0aGlzLmZpZ3VyZUZyYW1lSW5kZXgoKTtcbiAgICAgIGlmIChmcmFtZUluZGV4ICE9PSAtMSAmJiBmcmFtZUluZGV4ICE9PSB0aGlzLmZyYW1lSW5kZXgpIHtcbiAgICAgICAgdGhpcy5mcmFtZUluZGV4ID0gZnJhbWVJbmRleDtcbiAgICAgICAgaWYgKHRoaXMub25GcmFtZUNoYW5nZSkge1xuICAgICAgICAgIHRoaXMub25GcmFtZUNoYW5nZSh7IGZyYW1lSW5kZXgsIGlzTGFzdEZyYW1lOiBmcmFtZUluZGV4ID09PSB0aGlzLmdldEZyYW1lQ291bnQoKSAtIDEgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMudmlld2VyLmFkZEhhbmRsZXIoJ2NhbnZhcy1jbGljaycsIGV2ZW50ID0+IHtcbiAgICAgIGlmICghZXZlbnQucXVpY2spIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwb2ludCA9IHRoaXMudmlld2VyLnZpZXdwb3J0LnBvaW50RnJvbVBpeGVsKGV2ZW50LnBvc2l0aW9uKTtcbiAgICAgIGxldCBmb3VuZEluZGV4ID0gLTE7XG4gICAgICBjb25zdCBpdGVtQ291bnQgPSB0aGlzLnZpZXdlci53b3JsZC5nZXRJdGVtQ291bnQoKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaXRlbUNvdW50OyBpKyspIHtcbiAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMudmlld2VyLndvcmxkLmdldEl0ZW1BdChpKTtcbiAgICAgICAgaWYgKGl0ZW0uZ2V0Qm91bmRzKCkuY29udGFpbnNQb2ludChwb2ludCkpIHtcbiAgICAgICAgICBmb3VuZEluZGV4ID0gaTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgY29uc3QgcmVhbEZyYW1lSW5kZXggPSB0aGlzLmZpZ3VyZUZyYW1lSW5kZXgoKTtcbiAgICAgICAgaWYgKHJlYWxGcmFtZUluZGV4ID09PSAtMSkge1xuICAgICAgICAgIHRoaXMuZ29Ub0ZyYW1lKHRoaXMuZnJhbWVJbmRleCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5nb1RvTmV4dEZyYW1lKCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZm91bmRJbmRleCA9PT0gdGhpcy5mcmFtZUluZGV4KSB7XG4gICAgICAgIHRoaXMuZ29Ub05leHRGcmFtZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5nb1RvRnJhbWUoZm91bmRJbmRleCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGV2ZW50ID0+IHtcbiAgICAgIGlmIChldmVudC5hbHRLZXkgfHwgZXZlbnQuc2hpZnRLZXkgfHwgZXZlbnQuY3RybEtleSB8fCBldmVudC5tZXRhS2V5KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKGV2ZW50LmtleSA9PT0gJ0Fycm93UmlnaHQnIHx8IGV2ZW50LmtleSA9PT0gJ0Fycm93RG93bicgfHwgZXZlbnQua2V5ID09PSAnICcpIHtcbiAgICAgICAgdGhpcy5nb1RvTmV4dEZyYW1lKCk7XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50LmtleSA9PT0gJ0Fycm93TGVmdCcgfHwgZXZlbnQua2V5ID09PSAnQXJyb3dVcCcpIHtcbiAgICAgICAgdGhpcy5nb1RvUHJldmlvdXNGcmFtZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgfSk7XG4gIH1cblxuICBvcGVuQ29taWMoY29taWMpIHtcbiAgICBvc2RQcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgICAgdGhpcy5jb250YWluZXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gY29taWMuYm9keS5iYWNrZ3JvdW5kQ29sb3I7XG5cbiAgICAgIGlmIChjb21pYy5ib2R5LmZyYW1lcykge1xuICAgICAgICB0aGlzLmZyYW1lcyA9IGNvbWljLmJvZHkuZnJhbWVzLm1hcChmcmFtZSA9PiB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBPcGVuU2VhZHJhZ29uLlJlY3QoXG4gICAgICAgICAgICBmcmFtZS54IC0gZnJhbWUud2lkdGggLyAyLFxuICAgICAgICAgICAgZnJhbWUueSAtIGZyYW1lLmhlaWdodCAvIDIsXG4gICAgICAgICAgICBmcmFtZS53aWR0aCxcbiAgICAgICAgICAgIGZyYW1lLmhlaWdodFxuICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5mcmFtZXMgPSBjb21pYy5ib2R5Lml0ZW1zLm1hcChpdGVtID0+IHtcbiAgICAgICAgICByZXR1cm4gbmV3IE9wZW5TZWFkcmFnb24uUmVjdChcbiAgICAgICAgICAgIGl0ZW0ueCAtIGl0ZW0ud2lkdGggLyAyLFxuICAgICAgICAgICAgaXRlbS55IC0gaXRlbS5oZWlnaHQgLyAyLFxuICAgICAgICAgICAgaXRlbS53aWR0aCxcbiAgICAgICAgICAgIGl0ZW0uaGVpZ2h0XG4gICAgICAgICAgKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNvbWljLmJvZHkuaXRlbXMuZm9yRWFjaCgoaXRlbSwgaSkgPT4ge1xuICAgICAgICB2YXIgc3VjY2VzcztcblxuICAgICAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICAgIHN1Y2Nlc3MgPSAoKSA9PiB0aGlzLmdvVG9GcmFtZSgwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudmlld2VyLmFkZFRpbGVkSW1hZ2Uoe1xuICAgICAgICAgIHg6IGl0ZW0ueCAtIGl0ZW0ud2lkdGggLyAyLFxuICAgICAgICAgIHk6IGl0ZW0ueSAtIGl0ZW0uaGVpZ2h0IC8gMixcbiAgICAgICAgICB3aWR0aDogaXRlbS53aWR0aCxcbiAgICAgICAgICBzdWNjZXNzOiBzdWNjZXNzLFxuICAgICAgICAgIHRpbGVTb3VyY2U6IHtcbiAgICAgICAgICAgIHR5cGU6ICdsZWdhY3ktaW1hZ2UtcHlyYW1pZCcsXG4gICAgICAgICAgICBsZXZlbHM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHVybDogaXRlbS51cmwsXG4gICAgICAgICAgICAgICAgd2lkdGg6IGl0ZW0ud2lkdGgsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBpdGVtLmhlaWdodFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAodGhpcy5vbkNvbWljTG9hZCkge1xuICAgICAgICB0aGlzLm9uQ29taWNMb2FkKHt9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGdvVG9GcmFtZShpbmRleCkge1xuICAgIHZhciBmcmFtZSA9IHRoaXMuZnJhbWVzW2luZGV4XTtcbiAgICB2YXIgYnVmZmVyRmFjdG9yID0gMC4yO1xuICAgIHZhciBib3ggPSBmcmFtZS5jbG9uZSgpO1xuXG4gICAgYm94LndpZHRoICo9IDEgKyBidWZmZXJGYWN0b3I7XG4gICAgYm94LmhlaWdodCAqPSAxICsgYnVmZmVyRmFjdG9yO1xuICAgIGJveC54IC09IGZyYW1lLndpZHRoICogYnVmZmVyRmFjdG9yICogMC41O1xuICAgIGJveC55IC09IGZyYW1lLmhlaWdodCAqIGJ1ZmZlckZhY3RvciAqIDAuNTtcblxuICAgIHRoaXMudmlld2VyLnZpZXdwb3J0LmZpdEJvdW5kcyhib3gpO1xuICB9XG5cbiAgZ2V0RnJhbWVJbmRleCgpIHtcbiAgICByZXR1cm4gdGhpcy5mcmFtZUluZGV4O1xuICB9XG5cbiAgZmlndXJlRnJhbWVJbmRleCgpIHtcbiAgICBsZXQgYmVzdEluZGV4ID0gLTE7XG4gICAgbGV0IGJlc3REaXN0YW5jZSA9IEluZmluaXR5O1xuICAgIGNvbnN0IHZpZXdwb3J0Qm91bmRzID0gdGhpcy52aWV3ZXIudmlld3BvcnQuZ2V0Qm91bmRzKHRydWUpO1xuICAgIGNvbnN0IHZpZXdwb3J0Q2VudGVyID0gdmlld3BvcnRCb3VuZHMuZ2V0Q2VudGVyKCk7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZnJhbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBmcmFtZSA9IHRoaXMuZnJhbWVzW2ldO1xuICAgICAgaWYgKGZyYW1lLmNvbnRhaW5zUG9pbnQodmlld3BvcnRDZW50ZXIpKSB7XG4gICAgICAgIGNvbnN0IGRpc3RhbmNlID0gdmlld3BvcnRDZW50ZXIuc3F1YXJlZERpc3RhbmNlVG8oZnJhbWUuZ2V0Q2VudGVyKCkpO1xuICAgICAgICBpZiAoZGlzdGFuY2UgPCBiZXN0RGlzdGFuY2UpIHtcbiAgICAgICAgICBiZXN0RGlzdGFuY2UgPSBkaXN0YW5jZTtcbiAgICAgICAgICBiZXN0SW5kZXggPSBpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGJlc3RJbmRleDtcbiAgfVxuXG4gIGdldEZyYW1lQ291bnQoKSB7XG4gICAgcmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aDtcbiAgfVxuXG4gIGdvVG9OZXh0RnJhbWUoKSB7XG4gICAgbGV0IGluZGV4ID0gdGhpcy5nZXRGcmFtZUluZGV4KCk7XG4gICAgaWYgKGluZGV4IDwgdGhpcy5mcmFtZXMubGVuZ3RoIC0gMSkge1xuICAgICAgdGhpcy5nb1RvRnJhbWUoaW5kZXggKyAxKTtcbiAgICB9XG4gIH1cblxuICBnb1RvUHJldmlvdXNGcmFtZSgpIHtcbiAgICBsZXQgaW5kZXggPSB0aGlzLmdldEZyYW1lSW5kZXgoKTtcbiAgICBpZiAoaW5kZXggPiAwKSB7XG4gICAgICB0aGlzLmdvVG9GcmFtZShpbmRleCAtIDEpO1xuICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IERyaWZ0b3J5IGZyb20gJy4uL2xpYnJhcnkvZHJpZnRvcnknO1xuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKCkgPT4ge1xuICBjb25zdCBuZXh0QnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm5leHQtYnV0dG9uJyk7XG4gIGNvbnN0IHByZXZpb3VzQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnByZXZpb3VzLWJ1dHRvbicpO1xuICBjb25zdCBmcmFtZUluZm8gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZnJhbWUtaW5mbycpO1xuXG4gIGNvbnN0IGRyaWZ0b3J5ID0gbmV3IERyaWZ0b3J5KHtcbiAgICBjb250YWluZXI6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5kcmlmdG9yeS12aWV3ZXItY29udGFpbmVyJyksXG4gICAgcHJlZml4VXJsOiAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9vcGVuc2VhZHJhZ29uQDIuNC9idWlsZC9vcGVuc2VhZHJhZ29uL2ltYWdlcy8nLFxuICAgIG9uQ29taWNMb2FkOiAoKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnbG9hZGVkIScpO1xuICAgIH0sXG4gICAgb25GcmFtZUNoYW5nZTogKHsgZnJhbWVJbmRleCwgaXNMYXN0RnJhbWUgfSkgPT4ge1xuICAgICAgbGV0IHRleHQgPSBgRnJhbWUgJHtmcmFtZUluZGV4ICsgMX1gO1xuICAgICAgaWYgKGlzTGFzdEZyYW1lKSB7XG4gICAgICAgIHRleHQgKz0gJyAobGFzdCBmcmFtZSEpJztcbiAgICAgIH1cblxuICAgICAgZnJhbWVJbmZvLnRleHRDb250ZW50ID0gdGV4dDtcbiAgICB9XG4gIH0pO1xuXG4gIG5leHRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgZHJpZnRvcnkuZ29Ub05leHRGcmFtZSgpO1xuICB9KTtcblxuICBwcmV2aW91c0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICBkcmlmdG9yeS5nb1RvUHJldmlvdXNGcmFtZSgpO1xuICB9KTtcblxuICBmZXRjaCgnY29taWMuanNvbicpXG4gICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICBjb25zb2xlLmVycm9yKHJlc3BvbnNlKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gbG9hZCBjb21pYy5qc29uJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgfSlcbiAgICAudGhlbihqc29uID0+IHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGpzb24pO1xuICAgICAgZHJpZnRvcnkub3BlbkNvbWljKGpzb24uY29taWMpO1xuICAgIH0pXG4gICAgLmNhdGNoKGVycm9yID0+IGNvbnNvbGUuZXJyb3IoZXJyb3IpKTtcbn0pO1xuIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwiYWxyZWFkeUNhbGxlZFNvdXJjZXMiLCJhd2FpdGluZ0NhbGxiYWNrcyIsImFkZENhbGxiYWNrIiwic3JjIiwiY2FsbGJhY2siLCJwdXNoIiwibG9hZEpTIiwiaW5kZXhPZiIsInNjcmlwdCIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsIm9ubG9hZCIsImtleSIsImZvckVhY2giLCJjYiIsImhlYWQiLCJhcHBlbmRDaGlsZCIsIk9wZW5TZWFkcmFnb24iLCJvc2RSZXF1ZXN0Iiwib3NkUHJvbWlzZSIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiRHJpZnRvcnkiLCJhcmdzIiwiY29udGFpbmVyIiwib25GcmFtZUNoYW5nZSIsIm9uQ29taWNMb2FkIiwiZnJhbWVzIiwiZnJhbWVJbmRleCIsImluaXRpYWxpemUiLCJsb2FkSnMiLCJ3aW5kb3ciLCJwcmVmaXhVcmwiLCJ2aWV3ZXIiLCJlbGVtZW50Iiwic2hvd05hdmlnYXRpb25Db250cm9sIiwibWF4Wm9vbVBpeGVsUmF0aW8iLCJnZXN0dXJlU2V0dGluZ3NNb3VzZSIsImNsaWNrVG9ab29tIiwic2Nyb2xsVG9ab29tIiwiYWRkSGFuZGxlciIsImZpZ3VyZUZyYW1lSW5kZXgiLCJpc0xhc3RGcmFtZSIsImdldEZyYW1lQ291bnQiLCJldmVudCIsInF1aWNrIiwicG9pbnQiLCJ2aWV3cG9ydCIsInBvaW50RnJvbVBpeGVsIiwicG9zaXRpb24iLCJmb3VuZEluZGV4IiwiaXRlbUNvdW50Iiwid29ybGQiLCJnZXRJdGVtQ291bnQiLCJpIiwiaXRlbSIsImdldEl0ZW1BdCIsImdldEJvdW5kcyIsImNvbnRhaW5zUG9pbnQiLCJyZWFsRnJhbWVJbmRleCIsImdvVG9GcmFtZSIsImdvVG9OZXh0RnJhbWUiLCJhZGRFdmVudExpc3RlbmVyIiwiYWx0S2V5Iiwic2hpZnRLZXkiLCJjdHJsS2V5IiwibWV0YUtleSIsImdvVG9QcmV2aW91c0ZyYW1lIiwicHJldmVudERlZmF1bHQiLCJzdG9wUHJvcGFnYXRpb24iLCJjb21pYyIsInRoZW4iLCJzdHlsZSIsImJhY2tncm91bmRDb2xvciIsImJvZHkiLCJtYXAiLCJmcmFtZSIsIlJlY3QiLCJ4Iiwid2lkdGgiLCJ5IiwiaGVpZ2h0IiwiaXRlbXMiLCJzdWNjZXNzIiwiYWRkVGlsZWRJbWFnZSIsInRpbGVTb3VyY2UiLCJ0eXBlIiwibGV2ZWxzIiwidXJsIiwiaW5kZXgiLCJidWZmZXJGYWN0b3IiLCJib3giLCJjbG9uZSIsImZpdEJvdW5kcyIsImJlc3RJbmRleCIsImJlc3REaXN0YW5jZSIsIkluZmluaXR5Iiwidmlld3BvcnRCb3VuZHMiLCJ2aWV3cG9ydENlbnRlciIsImdldENlbnRlciIsImxlbmd0aCIsImRpc3RhbmNlIiwic3F1YXJlZERpc3RhbmNlVG8iLCJnZXRGcmFtZUluZGV4IiwibmV4dEJ1dHRvbiIsInF1ZXJ5U2VsZWN0b3IiLCJwcmV2aW91c0J1dHRvbiIsImZyYW1lSW5mbyIsImRyaWZ0b3J5IiwiY29uc29sZSIsImxvZyIsInRleHQiLCJ0ZXh0Q29udGVudCIsImZldGNoIiwicmVzcG9uc2UiLCJvayIsImVycm9yIiwiRXJyb3IiLCJqc29uIiwib3BlbkNvbWljIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUFDQUEsTUFBTSxDQUFDQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QztFQUFFQyxFQUFBQSxLQUFLLEVBQUU7RUFBVCxDQUE3QztFQUNBLElBQUlDLG9CQUFvQixHQUFHLEVBQTNCO0VBQ0EsSUFB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