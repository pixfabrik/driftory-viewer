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
      this.frames = []; // TODO: Make this more robust so it handles multiple viewers being created at the same time.
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

          var frameIndex = _this2.getFrameIndex();

          if (foundIndex === frameIndex || foundIndex === -1) {
            _this2.goToNextFrame();
          } else {
            _this2.goToFrame(foundIndex);
          }
        });
      }
    }, {
      key: "openComic",
      value: function openComic(comic) {
        var _this3 = this;

        osdPromise.then(function () {
          _this3.container.style.backgroundColor = comic.body.backgroundColor;
          _this3.frames = comic.body.frames;
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
        });
      }
    }, {
      key: "goToFrame",
      value: function goToFrame(index) {
        var frame = this.frames[index];
        var bufferFactor = 0.2;
        var box = new OpenSeadragon.Rect(frame.x - frame.width / 2, frame.y - frame.height / 2, frame.width, frame.height);
        box.width *= 1 + bufferFactor;
        box.height *= 1 + bufferFactor;
        box.x -= frame.width * bufferFactor * 0.5;
        box.y -= frame.height * bufferFactor * 0.5;
        this.viewer.viewport.fitBounds(box);
      }
    }, {
      key: "getFrameIndex",
      value: function getFrameIndex() {
        var bestIndex = -1;
        var bestDistance = Infinity;
        var viewportBounds = this.viewer.viewport.getBounds();
        var viewportCenter = viewportBounds.getCenter();
        var itemCount = this.viewer.world.getItemCount();

        for (var i = 0; i < itemCount; i++) {
          var item = this.viewer.world.getItemAt(i);
          var itemBounds = item.getBounds();
          var distance = viewportCenter.squaredDistanceTo(itemBounds.getCenter());

          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = i;
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
    var driftory = new Driftory({
      container: document.querySelector('.driftory-viewer-container'),
      prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/images/'
    });
    var nextButton = document.querySelector('.next-button');
    var previousButton = document.querySelector('.previous-button');
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVtby5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL0BkYW41MDMvbG9hZC1qcy9pbmRleC5qcyIsInNyYy9saWJyYXJ5L2RyaWZ0b3J5LmpzIiwic3JjL2RlbW8vZGVtby5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG52YXIgYWxyZWFkeUNhbGxlZFNvdXJjZXMgPSBbXTtcclxudmFyIGF3YWl0aW5nQ2FsbGJhY2tzID0ge307XHJcbnZhciBhZGRDYWxsYmFjayA9IGZ1bmN0aW9uIChzcmMsIGNhbGxiYWNrKSB7XHJcbiAgICBpZiAoYXdhaXRpbmdDYWxsYmFja3Nbc3JjXSkge1xyXG4gICAgICAgIGF3YWl0aW5nQ2FsbGJhY2tzW3NyY10ucHVzaChjYWxsYmFjayk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBhd2FpdGluZ0NhbGxiYWNrc1tzcmNdID0gW2NhbGxiYWNrXTtcclxuICAgIH1cclxufTtcclxuZnVuY3Rpb24gbG9hZEpTKHNyYywgY2FsbGJhY2spIHtcclxuICAgIGlmIChhbHJlYWR5Q2FsbGVkU291cmNlcy5pbmRleE9mKHNyYykgPCAwKSB7XHJcbiAgICAgICAgYWxyZWFkeUNhbGxlZFNvdXJjZXMucHVzaChzcmMpO1xyXG4gICAgICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcclxuICAgICAgICBzY3JpcHQuc3JjID0gc3JjO1xyXG4gICAgICAgIHNjcmlwdC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGFkZENhbGxiYWNrKHNyYywgY2FsbGJhY2spO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gYXdhaXRpbmdDYWxsYmFja3MpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0aW5nQ2FsbGJhY2tzW2tleV0uZm9yRWFjaChmdW5jdGlvbiAoY2IpIHsgcmV0dXJuIGNiKCk7IH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHNjcmlwdCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBhZGRDYWxsYmFjayhzcmMsIGNhbGxiYWNrKTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLmRlZmF1bHQgPSBsb2FkSlM7XHJcbiIsImltcG9ydCBsb2FkSnMgZnJvbSAnQGRhbjUwMy9sb2FkLWpzJztcblxubGV0IE9wZW5TZWFkcmFnb247XG5sZXQgb3NkUmVxdWVzdDtcblxuY29uc3Qgb3NkUHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgb3NkUmVxdWVzdCA9IHsgcmVzb2x2ZSwgcmVqZWN0IH07XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRHJpZnRvcnkge1xuICBjb25zdHJ1Y3RvcihhcmdzKSB7XG4gICAgdGhpcy5jb250YWluZXIgPSBhcmdzLmNvbnRhaW5lcjtcbiAgICB0aGlzLmZyYW1lcyA9IFtdO1xuXG4gICAgLy8gVE9ETzogTWFrZSB0aGlzIG1vcmUgcm9idXN0IHNvIGl0IGhhbmRsZXMgbXVsdGlwbGUgdmlld2VycyBiZWluZyBjcmVhdGVkIGF0IHRoZSBzYW1lIHRpbWUuXG4gICAgLy8gUmlnaHQgbm93IHRoZXkgd291bGQgYm90aCBsb2FkIE9TRCBzaW5jZSB0aGV5IHdvdWxkIHN0YXJ0IGJlZm9yZSB0aGUgb3RoZXIgZmluaXNoZWQuXG4gICAgaWYgKE9wZW5TZWFkcmFnb24pIHtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZShhcmdzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9hZEpzKFxuICAgICAgICAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9vcGVuc2VhZHJhZ29uQDIuNC9idWlsZC9vcGVuc2VhZHJhZ29uL29wZW5zZWFkcmFnb24ubWluLmpzJyxcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgIE9wZW5TZWFkcmFnb24gPSB3aW5kb3cuT3BlblNlYWRyYWdvbjtcbiAgICAgICAgICB0aGlzLmluaXRpYWxpemUoYXJncyk7XG4gICAgICAgICAgb3NkUmVxdWVzdC5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgaW5pdGlhbGl6ZSh7IGNvbnRhaW5lciwgcHJlZml4VXJsIH0pIHtcbiAgICB0aGlzLnZpZXdlciA9IE9wZW5TZWFkcmFnb24oe1xuICAgICAgZWxlbWVudDogY29udGFpbmVyLFxuICAgICAgcHJlZml4VXJsOiBwcmVmaXhVcmwsXG4gICAgICBzaG93TmF2aWdhdGlvbkNvbnRyb2w6IGZhbHNlLFxuICAgICAgbWF4Wm9vbVBpeGVsUmF0aW86IDEwLFxuICAgICAgZ2VzdHVyZVNldHRpbmdzTW91c2U6IHtcbiAgICAgICAgY2xpY2tUb1pvb206IGZhbHNlLFxuICAgICAgICBzY3JvbGxUb1pvb206IGZhbHNlXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLnZpZXdlci5hZGRIYW5kbGVyKCdjYW52YXMtY2xpY2snLCBldmVudCA9PiB7XG4gICAgICBpZiAoIWV2ZW50LnF1aWNrKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcG9pbnQgPSB0aGlzLnZpZXdlci52aWV3cG9ydC5wb2ludEZyb21QaXhlbChldmVudC5wb3NpdGlvbik7XG4gICAgICBsZXQgZm91bmRJbmRleCA9IC0xO1xuICAgICAgY29uc3QgaXRlbUNvdW50ID0gdGhpcy52aWV3ZXIud29ybGQuZ2V0SXRlbUNvdW50KCk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW1Db3VudDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLnZpZXdlci53b3JsZC5nZXRJdGVtQXQoaSk7XG4gICAgICAgIGlmIChpdGVtLmdldEJvdW5kcygpLmNvbnRhaW5zUG9pbnQocG9pbnQpKSB7XG4gICAgICAgICAgZm91bmRJbmRleCA9IGk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgZnJhbWVJbmRleCA9IHRoaXMuZ2V0RnJhbWVJbmRleCgpO1xuICAgICAgaWYgKGZvdW5kSW5kZXggPT09IGZyYW1lSW5kZXggfHwgZm91bmRJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgdGhpcy5nb1RvTmV4dEZyYW1lKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmdvVG9GcmFtZShmb3VuZEluZGV4KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIG9wZW5Db21pYyhjb21pYykge1xuICAgIG9zZFByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICB0aGlzLmNvbnRhaW5lci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBjb21pYy5ib2R5LmJhY2tncm91bmRDb2xvcjtcbiAgICAgIHRoaXMuZnJhbWVzID0gY29taWMuYm9keS5mcmFtZXM7XG5cbiAgICAgIGNvbWljLmJvZHkuaXRlbXMuZm9yRWFjaCgoaXRlbSwgaSkgPT4ge1xuICAgICAgICB2YXIgc3VjY2VzcztcblxuICAgICAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICAgIHN1Y2Nlc3MgPSAoKSA9PiB0aGlzLmdvVG9GcmFtZSgwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudmlld2VyLmFkZFRpbGVkSW1hZ2Uoe1xuICAgICAgICAgIHg6IGl0ZW0ueCAtIGl0ZW0ud2lkdGggLyAyLFxuICAgICAgICAgIHk6IGl0ZW0ueSAtIGl0ZW0uaGVpZ2h0IC8gMixcbiAgICAgICAgICB3aWR0aDogaXRlbS53aWR0aCxcbiAgICAgICAgICBzdWNjZXNzOiBzdWNjZXNzLFxuICAgICAgICAgIHRpbGVTb3VyY2U6IHtcbiAgICAgICAgICAgIHR5cGU6ICdsZWdhY3ktaW1hZ2UtcHlyYW1pZCcsXG4gICAgICAgICAgICBsZXZlbHM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHVybDogaXRlbS51cmwsXG4gICAgICAgICAgICAgICAgd2lkdGg6IGl0ZW0ud2lkdGgsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBpdGVtLmhlaWdodFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgZ29Ub0ZyYW1lKGluZGV4KSB7XG4gICAgdmFyIGZyYW1lID0gdGhpcy5mcmFtZXNbaW5kZXhdO1xuICAgIHZhciBidWZmZXJGYWN0b3IgPSAwLjI7XG4gICAgdmFyIGJveCA9IG5ldyBPcGVuU2VhZHJhZ29uLlJlY3QoXG4gICAgICBmcmFtZS54IC0gZnJhbWUud2lkdGggLyAyLFxuICAgICAgZnJhbWUueSAtIGZyYW1lLmhlaWdodCAvIDIsXG4gICAgICBmcmFtZS53aWR0aCxcbiAgICAgIGZyYW1lLmhlaWdodFxuICAgICk7XG5cbiAgICBib3gud2lkdGggKj0gMSArIGJ1ZmZlckZhY3RvcjtcbiAgICBib3guaGVpZ2h0ICo9IDEgKyBidWZmZXJGYWN0b3I7XG4gICAgYm94LnggLT0gZnJhbWUud2lkdGggKiBidWZmZXJGYWN0b3IgKiAwLjU7XG4gICAgYm94LnkgLT0gZnJhbWUuaGVpZ2h0ICogYnVmZmVyRmFjdG9yICogMC41O1xuXG4gICAgdGhpcy52aWV3ZXIudmlld3BvcnQuZml0Qm91bmRzKGJveCk7XG4gIH1cblxuICBnZXRGcmFtZUluZGV4KCkge1xuICAgIGxldCBiZXN0SW5kZXggPSAtMTtcbiAgICBsZXQgYmVzdERpc3RhbmNlID0gSW5maW5pdHk7XG4gICAgY29uc3Qgdmlld3BvcnRCb3VuZHMgPSB0aGlzLnZpZXdlci52aWV3cG9ydC5nZXRCb3VuZHMoKTtcbiAgICBjb25zdCB2aWV3cG9ydENlbnRlciA9IHZpZXdwb3J0Qm91bmRzLmdldENlbnRlcigpO1xuXG4gICAgY29uc3QgaXRlbUNvdW50ID0gdGhpcy52aWV3ZXIud29ybGQuZ2V0SXRlbUNvdW50KCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpdGVtQ291bnQ7IGkrKykge1xuICAgICAgY29uc3QgaXRlbSA9IHRoaXMudmlld2VyLndvcmxkLmdldEl0ZW1BdChpKTtcbiAgICAgIGNvbnN0IGl0ZW1Cb3VuZHMgPSBpdGVtLmdldEJvdW5kcygpO1xuICAgICAgY29uc3QgZGlzdGFuY2UgPSB2aWV3cG9ydENlbnRlci5zcXVhcmVkRGlzdGFuY2VUbyhpdGVtQm91bmRzLmdldENlbnRlcigpKTtcbiAgICAgIGlmIChkaXN0YW5jZSA8IGJlc3REaXN0YW5jZSkge1xuICAgICAgICBiZXN0RGlzdGFuY2UgPSBkaXN0YW5jZTtcbiAgICAgICAgYmVzdEluZGV4ID0gaTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYmVzdEluZGV4O1xuICB9XG5cbiAgZ2V0RnJhbWVDb3VudCgpIHtcbiAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoO1xuICB9XG5cbiAgZ29Ub05leHRGcmFtZSgpIHtcbiAgICBsZXQgaW5kZXggPSB0aGlzLmdldEZyYW1lSW5kZXgoKTtcbiAgICBpZiAoaW5kZXggPCB0aGlzLmZyYW1lcy5sZW5ndGggLSAxKSB7XG4gICAgICB0aGlzLmdvVG9GcmFtZShpbmRleCArIDEpO1xuICAgIH1cbiAgfVxuXG4gIGdvVG9QcmV2aW91c0ZyYW1lKCkge1xuICAgIGxldCBpbmRleCA9IHRoaXMuZ2V0RnJhbWVJbmRleCgpO1xuICAgIGlmIChpbmRleCA+IDApIHtcbiAgICAgIHRoaXMuZ29Ub0ZyYW1lKGluZGV4IC0gMSk7XG4gICAgfVxuICB9XG59XG4iLCJpbXBvcnQgRHJpZnRvcnkgZnJvbSAnLi4vbGlicmFyeS9kcmlmdG9yeSc7XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG4gIGNvbnN0IGRyaWZ0b3J5ID0gbmV3IERyaWZ0b3J5KHtcbiAgICBjb250YWluZXI6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5kcmlmdG9yeS12aWV3ZXItY29udGFpbmVyJyksXG4gICAgcHJlZml4VXJsOiAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9vcGVuc2VhZHJhZ29uQDIuNC9idWlsZC9vcGVuc2VhZHJhZ29uL2ltYWdlcy8nXG4gIH0pO1xuXG4gIGNvbnN0IG5leHRCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubmV4dC1idXR0b24nKTtcbiAgY29uc3QgcHJldmlvdXNCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucHJldmlvdXMtYnV0dG9uJyk7XG5cbiAgbmV4dEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICBkcmlmdG9yeS5nb1RvTmV4dEZyYW1lKCk7XG4gIH0pO1xuXG4gIHByZXZpb3VzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgIGRyaWZ0b3J5LmdvVG9QcmV2aW91c0ZyYW1lKCk7XG4gIH0pO1xuXG4gIGZldGNoKCdjb21pYy5qc29uJylcbiAgICAudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IocmVzcG9uc2UpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBsb2FkIGNvbWljLmpzb24nKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbiAgICB9KVxuICAgIC50aGVuKGpzb24gPT4ge1xuICAgICAgLy8gY29uc29sZS5sb2coanNvbik7XG4gICAgICBkcmlmdG9yeS5vcGVuQ29taWMoanNvbi5jb21pYyk7XG4gICAgfSlcbiAgICAuY2F0Y2goZXJyb3IgPT4gY29uc29sZS5lcnJvcihlcnJvcikpO1xufSk7XG4iXSwibmFtZXMiOlsiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwidmFsdWUiLCJhbHJlYWR5Q2FsbGVkU291cmNlcyIsImF3YWl0aW5nQ2FsbGJhY2tzIiwiYWRkQ2FsbGJhY2siLCJzcmMiLCJjYWxsYmFjayIsInB1c2giLCJsb2FkSlMiLCJpbmRleE9mIiwic2NyaXB0IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50Iiwib25sb2FkIiwia2V5IiwiZm9yRWFjaCIsImNiIiwiaGVhZCIsImFwcGVuZENoaWxkIiwiT3BlblNlYWRyYWdvbiIsIm9zZFJlcXVlc3QiLCJvc2RQcm9taXNlIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJEcmlmdG9yeSIsImFyZ3MiLCJjb250YWluZXIiLCJmcmFtZXMiLCJpbml0aWFsaXplIiwibG9hZEpzIiwid2luZG93IiwicHJlZml4VXJsIiwidmlld2VyIiwiZWxlbWVudCIsInNob3dOYXZpZ2F0aW9uQ29udHJvbCIsIm1heFpvb21QaXhlbFJhdGlvIiwiZ2VzdHVyZVNldHRpbmdzTW91c2UiLCJjbGlja1RvWm9vbSIsInNjcm9sbFRvWm9vbSIsImFkZEhhbmRsZXIiLCJldmVudCIsInF1aWNrIiwicG9pbnQiLCJ2aWV3cG9ydCIsInBvaW50RnJvbVBpeGVsIiwicG9zaXRpb24iLCJmb3VuZEluZGV4IiwiaXRlbUNvdW50Iiwid29ybGQiLCJnZXRJdGVtQ291bnQiLCJpIiwiaXRlbSIsImdldEl0ZW1BdCIsImdldEJvdW5kcyIsImNvbnRhaW5zUG9pbnQiLCJmcmFtZUluZGV4IiwiZ2V0RnJhbWVJbmRleCIsImdvVG9OZXh0RnJhbWUiLCJnb1RvRnJhbWUiLCJjb21pYyIsInRoZW4iLCJzdHlsZSIsImJhY2tncm91bmRDb2xvciIsImJvZHkiLCJpdGVtcyIsInN1Y2Nlc3MiLCJhZGRUaWxlZEltYWdlIiwieCIsIndpZHRoIiwieSIsImhlaWdodCIsInRpbGVTb3VyY2UiLCJ0eXBlIiwibGV2ZWxzIiwidXJsIiwiaW5kZXgiLCJmcmFtZSIsImJ1ZmZlckZhY3RvciIsImJveCIsIlJlY3QiLCJmaXRCb3VuZHMiLCJiZXN0SW5kZXgiLCJiZXN0RGlzdGFuY2UiLCJJbmZpbml0eSIsInZpZXdwb3J0Qm91bmRzIiwidmlld3BvcnRDZW50ZXIiLCJnZXRDZW50ZXIiLCJpdGVtQm91bmRzIiwiZGlzdGFuY2UiLCJzcXVhcmVkRGlzdGFuY2VUbyIsImxlbmd0aCIsImFkZEV2ZW50TGlzdGVuZXIiLCJkcmlmdG9yeSIsInF1ZXJ5U2VsZWN0b3IiLCJuZXh0QnV0dG9uIiwicHJldmlvdXNCdXR0b24iLCJnb1RvUHJldmlvdXNGcmFtZSIsImZldGNoIiwicmVzcG9uc2UiLCJvayIsImNvbnNvbGUiLCJlcnJvciIsIkVycm9yIiwianNvbiIsIm9wZW5Db21pYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBQ0FBLE1BQU0sQ0FBQ0MsY0FBUCxDQUFzQkMsT0FBdEIsRUFBK0IsWUFBL0IsRUFBNkM7RUFBRUMsRUFBQUEsS0FBSyxFQUFFO0VBQVQsQ0FBN0M7RUFDQSxJQUFJQyxvQkFBb0IsR0FBRyxFQUEzQjtFQUNBLElBQUlDLGlCQUFpQixHQUFHLEVBQXhCOztFQUNBLElBQUlDLFdBQVcsR0FBRyxTQUFkQSxXQUFjLENBQVVDLEdBQVYsRUFBZUMsUUFBZixFQUF5QjtFQUN2QyxNQUFJSCxpQkFBaUIsQ0FBQ0UsR0FBRCxDQUFyQixFQUE0QjtFQUN4QkYsSUFBQUEsaUJBQWlCLENBQUNFLEdBQUQsQ0FBakIsQ0FBdUJFLElBQXZCLENBQTRCRCxRQUE1QjtFQUNILEdBRkQsTUFHSztFQUNESCxJQUFBQSxpQkFBaUIsQ0FBQ0UsR0FBRCxDQUFqQixHQUF5QixDQUFDQyxRQUFELENBQXpCO0VBQ0g7RUFDSixDQVBEOztFQVFBLFNBQVNFLE1BQVQsQ0FBZ0JILEdBQWhCLEVBQXFCQyxRQUFyQixFQUErQjtFQUMzQixNQUFJSixvQkFBb0IsQ0FBQ08sT0FBckIsQ0FBNkJKLEdBQTdCLElBQW9DLENBQXhDLEVBQTJDO0VBQ3ZDSCxJQUFBQSxvQkFBb0IsQ0FBQ0ssSUFBckIsQ0FBMEJGLEdBQTFCO0VBQ0EsUUFBSUssTUFBTSxHQUFHQyxRQUFRLENBQUNDLGFBQVQsQ0FBdUIsUUFBdkIsQ0FBYjtFQUNBRixJQUFBQSxNQUFNLENBQUNMLEdBQVAsR0FBYUEsR0FBYjs7RUFDQUssSUFBQUEsTUFBTSxDQUFDRyxNQUFQLEdBQWdCLFlBQVk7RUFDeEJULE1BQUFBLFdBQVcsQ0FBQ0MsR0FBRCxFQUFNQyxRQUFOLENBQVg7O0VBQ0EsV0FBSyxJQUFJUSxHQUFULElBQWdCWCxpQkFBaEIsRUFBbUM7RUFDL0JBLFFBQUFBLGlCQUFpQixDQUFDVyxHQUFELENBQWpCLENBQXVCQyxPQUF2QixDQUErQixVQUFVQyxFQUFWLEVBQWM7RUFBRSxpQkFBT0EsRUFBRSxFQUFUO0VBQWMsU0FBN0Q7RUFDSDtFQUNKLEtBTEQ7O0VBTUFMLElBQUFBLFFBQVEsQ0FBQ00sSUFBVCxDQUFjQyxXQUFkLENBQTBCUixNQUExQjtFQUNILEdBWEQsTUFZSztFQUNETixJQUFBQSxXQUFXLENBQUNDLEdBQUQsRUFBTUMsUUFBTixDQUFYO0VBQ0g7RUFDSjs7RUFDRE4sT0FBTyxXQUFQLEdBQWtCUSxNQUFsQjs7Ozs7RUMzQkEsSUFBSVcsYUFBSjtFQUNBLElBQUlDLFVBQUo7RUFFQSxJQUFNQyxVQUFVLEdBQUcsSUFBSUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBVUMsTUFBVixFQUFxQjtFQUNsREosRUFBQUEsVUFBVSxHQUFHO0VBQUVHLElBQUFBLE9BQU8sRUFBUEEsT0FBRjtFQUFXQyxJQUFBQSxNQUFNLEVBQU5BO0VBQVgsR0FBYjtFQUNELENBRmtCLENBQW5COztNQUlxQkM7RUFDbkIsb0JBQVlDLElBQVosRUFBa0I7RUFBQTs7RUFBQTs7RUFDaEIsU0FBS0MsU0FBTCxHQUFpQkQsSUFBSSxDQUFDQyxTQUF0QjtFQUNBLFNBQUtDLE1BQUwsR0FBYyxFQUFkLENBRmdCO0VBS2hCOztFQUNBLFFBQUlULGFBQUosRUFBbUI7RUFDakIsV0FBS1UsVUFBTCxDQUFnQkgsSUFBaEI7RUFDRCxLQUZELE1BRU87RUFDTEksTUFBQUEsUUFBTSxDQUNKLHlGQURJLEVBRUosWUFBTTtFQUNKWCxRQUFBQSxhQUFhLEdBQUdZLE1BQU0sQ0FBQ1osYUFBdkI7O0VBQ0EsUUFBQSxLQUFJLENBQUNVLFVBQUwsQ0FBZ0JILElBQWhCOztFQUNBTixRQUFBQSxVQUFVLENBQUNHLE9BQVg7RUFDRCxPQU5HLENBQU47RUFRRDtFQUNGOzs7O3VDQUVvQztFQUFBOztFQUFBLFVBQXhCSSxTQUF3QixRQUF4QkEsU0FBd0I7RUFBQSxVQUFiSyxTQUFhLFFBQWJBLFNBQWE7RUFDbkMsV0FBS0MsTUFBTCxHQUFjZCxhQUFhLENBQUM7RUFDMUJlLFFBQUFBLE9BQU8sRUFBRVAsU0FEaUI7RUFFMUJLLFFBQUFBLFNBQVMsRUFBRUEsU0FGZTtFQUcxQkcsUUFBQUEscUJBQXFCLEVBQUUsS0FIRztFQUkxQkMsUUFBQUEsaUJBQWlCLEVBQUUsRUFKTztFQUsxQkMsUUFBQUEsb0JBQW9CLEVBQUU7RUFDcEJDLFVBQUFBLFdBQVcsRUFBRSxLQURPO0VBRXBCQyxVQUFBQSxZQUFZLEVBQUU7RUFGTTtFQUxJLE9BQUQsQ0FBM0I7RUFXQSxXQUFLTixNQUFMLENBQVlPLFVBQVosQ0FBdUIsY0FBdkIsRUFBdUMsVUFBQUMsS0FBSyxFQUFJO0VBQzlDLFlBQUksQ0FBQ0EsS0FBSyxDQUFDQyxLQUFYLEVBQWtCO0VBQ2hCO0VBQ0Q7O0VBRUQsWUFBTUMsS0FBSyxHQUFHLE1BQUksQ0FBQ1YsTUFBTCxDQUFZVyxRQUFaLENBQXFCQyxjQUFyQixDQUFvQ0osS0FBSyxDQUFDSyxRQUExQyxDQUFkOztFQUNBLFlBQUlDLFVBQVUsR0FBRyxDQUFDLENBQWxCOztFQUNBLFlBQU1DLFNBQVMsR0FBRyxNQUFJLENBQUNmLE1BQUwsQ0FBWWdCLEtBQVosQ0FBa0JDLFlBQWxCLEVBQWxCOztFQUNBLGFBQUssSUFBSUMsQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBR0gsU0FBcEIsRUFBK0JHLENBQUMsRUFBaEMsRUFBb0M7RUFDbEMsY0FBTUMsSUFBSSxHQUFHLE1BQUksQ0FBQ25CLE1BQUwsQ0FBWWdCLEtBQVosQ0FBa0JJLFNBQWxCLENBQTRCRixDQUE1QixDQUFiOztFQUNBLGNBQUlDLElBQUksQ0FBQ0UsU0FBTCxHQUFpQkMsYUFBakIsQ0FBK0JaLEtBQS9CLENBQUosRUFBMkM7RUFDekNJLFlBQUFBLFVBQVUsR0FBR0ksQ0FBYjtFQUNEO0VBQ0Y7O0VBRUQsWUFBTUssVUFBVSxHQUFHLE1BQUksQ0FBQ0MsYUFBTCxFQUFuQjs7RUFDQSxZQUFJVixVQUFVLEtBQUtTLFVBQWYsSUFBNkJULFVBQVUsS0FBSyxDQUFDLENBQWpELEVBQW9EO0VBQ2xELFVBQUEsTUFBSSxDQUFDVyxhQUFMO0VBQ0QsU0FGRCxNQUVPO0VBQ0wsVUFBQSxNQUFJLENBQUNDLFNBQUwsQ0FBZVosVUFBZjtFQUNEO0VBQ0YsT0FyQkQ7RUFzQkQ7OztnQ0FFU2EsT0FBTztFQUFBOztFQUNmdkMsTUFBQUEsVUFBVSxDQUFDd0MsSUFBWCxDQUFnQixZQUFNO0VBQ3BCLFFBQUEsTUFBSSxDQUFDbEMsU0FBTCxDQUFlbUMsS0FBZixDQUFxQkMsZUFBckIsR0FBdUNILEtBQUssQ0FBQ0ksSUFBTixDQUFXRCxlQUFsRDtFQUNBLFFBQUEsTUFBSSxDQUFDbkMsTUFBTCxHQUFjZ0MsS0FBSyxDQUFDSSxJQUFOLENBQVdwQyxNQUF6QjtFQUVBZ0MsUUFBQUEsS0FBSyxDQUFDSSxJQUFOLENBQVdDLEtBQVgsQ0FBaUJsRCxPQUFqQixDQUF5QixVQUFDcUMsSUFBRCxFQUFPRCxDQUFQLEVBQWE7RUFDcEMsY0FBSWUsT0FBSjs7RUFFQSxjQUFJZixDQUFDLEtBQUssQ0FBVixFQUFhO0VBQ1hlLFlBQUFBLE9BQU8sR0FBRztFQUFBLHFCQUFNLE1BQUksQ0FBQ1AsU0FBTCxDQUFlLENBQWYsQ0FBTjtFQUFBLGFBQVY7RUFDRDs7RUFFRCxVQUFBLE1BQUksQ0FBQzFCLE1BQUwsQ0FBWWtDLGFBQVosQ0FBMEI7RUFDeEJDLFlBQUFBLENBQUMsRUFBRWhCLElBQUksQ0FBQ2dCLENBQUwsR0FBU2hCLElBQUksQ0FBQ2lCLEtBQUwsR0FBYSxDQUREO0VBRXhCQyxZQUFBQSxDQUFDLEVBQUVsQixJQUFJLENBQUNrQixDQUFMLEdBQVNsQixJQUFJLENBQUNtQixNQUFMLEdBQWMsQ0FGRjtFQUd4QkYsWUFBQUEsS0FBSyxFQUFFakIsSUFBSSxDQUFDaUIsS0FIWTtFQUl4QkgsWUFBQUEsT0FBTyxFQUFFQSxPQUplO0VBS3hCTSxZQUFBQSxVQUFVLEVBQUU7RUFDVkMsY0FBQUEsSUFBSSxFQUFFLHNCQURJO0VBRVZDLGNBQUFBLE1BQU0sRUFBRSxDQUNOO0VBQ0VDLGdCQUFBQSxHQUFHLEVBQUV2QixJQUFJLENBQUN1QixHQURaO0VBRUVOLGdCQUFBQSxLQUFLLEVBQUVqQixJQUFJLENBQUNpQixLQUZkO0VBR0VFLGdCQUFBQSxNQUFNLEVBQUVuQixJQUFJLENBQUNtQjtFQUhmLGVBRE07RUFGRTtFQUxZLFdBQTFCO0VBZ0JELFNBdkJEO0VBd0JELE9BNUJEO0VBNkJEOzs7Z0NBRVNLLE9BQU87RUFDZixVQUFJQyxLQUFLLEdBQUcsS0FBS2pELE1BQUwsQ0FBWWdELEtBQVosQ0FBWjtFQUNBLFVBQUlFLFlBQVksR0FBRyxHQUFuQjtFQUNBLFVBQUlDLEdBQUcsR0FBRyxJQUFJNUQsYUFBYSxDQUFDNkQsSUFBbEIsQ0FDUkgsS0FBSyxDQUFDVCxDQUFOLEdBQVVTLEtBQUssQ0FBQ1IsS0FBTixHQUFjLENBRGhCLEVBRVJRLEtBQUssQ0FBQ1AsQ0FBTixHQUFVTyxLQUFLLENBQUNOLE1BQU4sR0FBZSxDQUZqQixFQUdSTSxLQUFLLENBQUNSLEtBSEUsRUFJUlEsS0FBSyxDQUFDTixNQUpFLENBQVY7RUFPQVEsTUFBQUEsR0FBRyxDQUFDVixLQUFKLElBQWEsSUFBSVMsWUFBakI7RUFDQUMsTUFBQUEsR0FBRyxDQUFDUixNQUFKLElBQWMsSUFBSU8sWUFBbEI7RUFDQUMsTUFBQUEsR0FBRyxDQUFDWCxDQUFKLElBQVNTLEtBQUssQ0FBQ1IsS0FBTixHQUFjUyxZQUFkLEdBQTZCLEdBQXRDO0VBQ0FDLE1BQUFBLEdBQUcsQ0FBQ1QsQ0FBSixJQUFTTyxLQUFLLENBQUNOLE1BQU4sR0FBZU8sWUFBZixHQUE4QixHQUF2QztFQUVBLFdBQUs3QyxNQUFMLENBQVlXLFFBQVosQ0FBcUJxQyxTQUFyQixDQUErQkYsR0FBL0I7RUFDRDs7O3NDQUVlO0VBQ2QsVUFBSUcsU0FBUyxHQUFHLENBQUMsQ0FBakI7RUFDQSxVQUFJQyxZQUFZLEdBQUdDLFFBQW5CO0VBQ0EsVUFBTUMsY0FBYyxHQUFHLEtBQUtwRCxNQUFMLENBQVlXLFFBQVosQ0FBcUJVLFNBQXJCLEVBQXZCO0VBQ0EsVUFBTWdDLGNBQWMsR0FBR0QsY0FBYyxDQUFDRSxTQUFmLEVBQXZCO0VBRUEsVUFBTXZDLFNBQVMsR0FBRyxLQUFLZixNQUFMLENBQVlnQixLQUFaLENBQWtCQyxZQUFsQixFQUFsQjs7RUFDQSxXQUFLLElBQUlDLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUdILFNBQXBCLEVBQStCRyxDQUFDLEVBQWhDLEVBQW9DO0VBQ2xDLFlBQU1DLElBQUksR0FBRyxLQUFLbkIsTUFBTCxDQUFZZ0IsS0FBWixDQUFrQkksU0FBbEIsQ0FBNEJGLENBQTVCLENBQWI7RUFDQSxZQUFNcUMsVUFBVSxHQUFHcEMsSUFBSSxDQUFDRSxTQUFMLEVBQW5CO0VBQ0EsWUFBTW1DLFFBQVEsR0FBR0gsY0FBYyxDQUFDSSxpQkFBZixDQUFpQ0YsVUFBVSxDQUFDRCxTQUFYLEVBQWpDLENBQWpCOztFQUNBLFlBQUlFLFFBQVEsR0FBR04sWUFBZixFQUE2QjtFQUMzQkEsVUFBQUEsWUFBWSxHQUFHTSxRQUFmO0VBQ0FQLFVBQUFBLFNBQVMsR0FBRy9CLENBQVo7RUFDRDtFQUNGOztFQUVELGFBQU8rQixTQUFQO0VBQ0Q7OztzQ0FFZTtFQUNkLGFBQU8sS0FBS3RELE1BQUwsQ0FBWStELE1BQW5CO0VBQ0Q7OztzQ0FFZTtFQUNkLFVBQUlmLEtBQUssR0FBRyxLQUFLbkIsYUFBTCxFQUFaOztFQUNBLFVBQUltQixLQUFLLEdBQUcsS0FBS2hELE1BQUwsQ0FBWStELE1BQVosR0FBcUIsQ0FBakMsRUFBb0M7RUFDbEMsYUFBS2hDLFNBQUwsQ0FBZWlCLEtBQUssR0FBRyxDQUF2QjtFQUNEO0VBQ0Y7OzswQ0FFbUI7RUFDbEIsVUFBSUEsS0FBSyxHQUFHLEtBQUtuQixhQUFMLEVBQVo7O0VBQ0EsVUFBSW1CLEtBQUssR0FBRyxDQUFaLEVBQWU7RUFDYixhQUFLakIsU0FBTCxDQUFlaUIsS0FBSyxHQUFHLENBQXZCO0VBQ0Q7RUFDRjs7Ozs7O0VDdEpIakUsUUFBUSxDQUFDaUYsZ0JBQVQsQ0FBMEIsa0JBQTFCLEVBQThDLFlBQU07RUFDbEQsTUFBTUMsUUFBUSxHQUFHLElBQUlwRSxRQUFKLENBQWE7RUFDNUJFLElBQUFBLFNBQVMsRUFBRWhCLFFBQVEsQ0FBQ21GLGFBQVQsQ0FBdUIsNEJBQXZCLENBRGlCO0VBRTVCOUQsSUFBQUEsU0FBUyxFQUFFO0VBRmlCLEdBQWIsQ0FBakI7RUFLQSxNQUFNK0QsVUFBVSxHQUFHcEYsUUFBUSxDQUFDbUYsYUFBVCxDQUF1QixjQUF2QixDQUFuQjtFQUNBLE1BQU1FLGNBQWMsR0FBR3JGLFFBQVEsQ0FBQ21GLGFBQVQsQ0FBdUIsa0JBQXZCLENBQXZCO0VBRUFDLEVBQUFBLFVBQVUsQ0FBQ0gsZ0JBQVgsQ0FBNEIsT0FBNUIsRUFBcUMsWUFBTTtFQUN6Q0MsSUFBQUEsUUFBUSxDQUFDbkMsYUFBVDtFQUNELEdBRkQ7RUFJQXNDLEVBQUFBLGNBQWMsQ0FBQ0osZ0JBQWYsQ0FBZ0MsT0FBaEMsRUFBeUMsWUFBTTtFQUM3Q0MsSUFBQUEsUUFBUSxDQUFDSSxpQkFBVDtFQUNELEdBRkQ7RUFJQUMsRUFBQUEsS0FBSyxDQUFDLFlBQUQsQ0FBTCxDQUNHckMsSUFESCxDQUNRLFVBQUFzQyxRQUFRLEVBQUk7RUFDaEIsUUFBSSxDQUFDQSxRQUFRLENBQUNDLEVBQWQsRUFBa0I7RUFDaEJDLE1BQUFBLE9BQU8sQ0FBQ0MsS0FBUixDQUFjSCxRQUFkO0VBQ0EsWUFBTSxJQUFJSSxLQUFKLENBQVUsMkJBQVYsQ0FBTjtFQUNEOztFQUVELFdBQU9KLFFBQVEsQ0FBQ0ssSUFBVCxFQUFQO0VBQ0QsR0FSSCxFQVNHM0MsSUFUSCxDQVNRLFVBQUEyQyxJQUFJLEVBQUk7RUFDWjtFQUNBWCxJQUFBQSxRQUFRLENBQUNZLFNBQVQsQ0FBbUJELElBQUksQ0FBQzVDLEtBQXhCO0VBQ0QsR0FaSCxXQWFTLFVBQUEwQyxLQUFLO0VBQUEsV0FBSUQsT0FBTyxDQUFDQyxLQUFSLENBQWNBLEtBQWQsQ0FBSjtFQUFBLEdBYmQ7RUFjRCxDQS9CRDs7Ozs7OyJ9