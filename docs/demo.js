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
      this.frameIndex = -1;
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
        var container = _ref.container,
            prefixUrl = _ref.prefixUrl;
        this.viewer = OpenSeadragon({
          element: container,
          prefixUrl: prefixUrl,
          showNavigationControl: false,
          maxZoomPixelRatio: 10
        });
      }
    }, {
      key: "openComic",
      value: function openComic(comic) {
        var _this2 = this;

        osdPromise.then(function () {
          _this2.container.style.backgroundColor = comic.body.backgroundColor;
          _this2.frames = comic.body.frames;
          comic.body.items.forEach(function (item, i) {
            var success;

            if (i === 0) {
              success = function success() {
                return _this2.goToFrame(0);
              };
            }

            _this2.viewer.addTiledImage({
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
        this.frameIndex = index;
      }
    }, {
      key: "getFrameIndex",
      value: function getFrameIndex() {
        return this.frameIndex;
      }
    }, {
      key: "getFrameCount",
      value: function getFrameCount() {
        return this.frames.length;
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
      var index = driftory.getFrameIndex();
      index = (index + 1) % driftory.getFrameCount(); // TO DO: we need a built in driftory.goToNextFrame() method

      driftory.goToFrame(index);
    });
    previousButton.addEventListener('click', function () {
      var index = driftory.getFrameIndex();
      index = index === 0 ? driftory.getFrameCount() - 1 : index - 1; // TO DO: we need a built in driftory.goToPrevFrame() method

      driftory.goToFrame(index);
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVtby5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL0BkYW41MDMvbG9hZC1qcy9pbmRleC5qcyIsInNyYy9saWJyYXJ5L2RyaWZ0b3J5LmpzIiwic3JjL2RlbW8vZGVtby5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG52YXIgYWxyZWFkeUNhbGxlZFNvdXJjZXMgPSBbXTtcclxudmFyIGF3YWl0aW5nQ2FsbGJhY2tzID0ge307XHJcbnZhciBhZGRDYWxsYmFjayA9IGZ1bmN0aW9uIChzcmMsIGNhbGxiYWNrKSB7XHJcbiAgICBpZiAoYXdhaXRpbmdDYWxsYmFja3Nbc3JjXSkge1xyXG4gICAgICAgIGF3YWl0aW5nQ2FsbGJhY2tzW3NyY10ucHVzaChjYWxsYmFjayk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBhd2FpdGluZ0NhbGxiYWNrc1tzcmNdID0gW2NhbGxiYWNrXTtcclxuICAgIH1cclxufTtcclxuZnVuY3Rpb24gbG9hZEpTKHNyYywgY2FsbGJhY2spIHtcclxuICAgIGlmIChhbHJlYWR5Q2FsbGVkU291cmNlcy5pbmRleE9mKHNyYykgPCAwKSB7XHJcbiAgICAgICAgYWxyZWFkeUNhbGxlZFNvdXJjZXMucHVzaChzcmMpO1xyXG4gICAgICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcclxuICAgICAgICBzY3JpcHQuc3JjID0gc3JjO1xyXG4gICAgICAgIHNjcmlwdC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGFkZENhbGxiYWNrKHNyYywgY2FsbGJhY2spO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gYXdhaXRpbmdDYWxsYmFja3MpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0aW5nQ2FsbGJhY2tzW2tleV0uZm9yRWFjaChmdW5jdGlvbiAoY2IpIHsgcmV0dXJuIGNiKCk7IH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHNjcmlwdCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBhZGRDYWxsYmFjayhzcmMsIGNhbGxiYWNrKTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLmRlZmF1bHQgPSBsb2FkSlM7XHJcbiIsImltcG9ydCBsb2FkSnMgZnJvbSAnQGRhbjUwMy9sb2FkLWpzJztcblxubGV0IE9wZW5TZWFkcmFnb247XG5sZXQgb3NkUmVxdWVzdDtcblxuY29uc3Qgb3NkUHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgb3NkUmVxdWVzdCA9IHsgcmVzb2x2ZSwgcmVqZWN0IH07XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRHJpZnRvcnkge1xuICBjb25zdHJ1Y3RvcihhcmdzKSB7XG4gICAgdGhpcy5jb250YWluZXIgPSBhcmdzLmNvbnRhaW5lcjtcbiAgICB0aGlzLmZyYW1lSW5kZXggPSAtMTtcbiAgICB0aGlzLmZyYW1lcyA9IFtdO1xuXG4gICAgLy8gVE9ETzogTWFrZSB0aGlzIG1vcmUgcm9idXN0IHNvIGl0IGhhbmRsZXMgbXVsdGlwbGUgdmlld2VycyBiZWluZyBjcmVhdGVkIGF0IHRoZSBzYW1lIHRpbWUuXG4gICAgLy8gUmlnaHQgbm93IHRoZXkgd291bGQgYm90aCBsb2FkIE9TRCBzaW5jZSB0aGV5IHdvdWxkIHN0YXJ0IGJlZm9yZSB0aGUgb3RoZXIgZmluaXNoZWQuXG4gICAgaWYgKE9wZW5TZWFkcmFnb24pIHtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZShhcmdzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9hZEpzKFxuICAgICAgICAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9vcGVuc2VhZHJhZ29uQDIuNC9idWlsZC9vcGVuc2VhZHJhZ29uL29wZW5zZWFkcmFnb24ubWluLmpzJyxcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgIE9wZW5TZWFkcmFnb24gPSB3aW5kb3cuT3BlblNlYWRyYWdvbjtcbiAgICAgICAgICB0aGlzLmluaXRpYWxpemUoYXJncyk7XG4gICAgICAgICAgb3NkUmVxdWVzdC5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgaW5pdGlhbGl6ZSh7IGNvbnRhaW5lciwgcHJlZml4VXJsIH0pIHtcbiAgICB0aGlzLnZpZXdlciA9IE9wZW5TZWFkcmFnb24oe1xuICAgICAgZWxlbWVudDogY29udGFpbmVyLFxuICAgICAgcHJlZml4VXJsOiBwcmVmaXhVcmwsXG4gICAgICBzaG93TmF2aWdhdGlvbkNvbnRyb2w6IGZhbHNlLFxuICAgICAgbWF4Wm9vbVBpeGVsUmF0aW86IDEwXG4gICAgfSk7XG4gIH1cblxuICBvcGVuQ29taWMoY29taWMpIHtcbiAgICBvc2RQcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgICAgdGhpcy5jb250YWluZXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gY29taWMuYm9keS5iYWNrZ3JvdW5kQ29sb3I7XG4gICAgICB0aGlzLmZyYW1lcyA9IGNvbWljLmJvZHkuZnJhbWVzO1xuXG4gICAgICBjb21pYy5ib2R5Lml0ZW1zLmZvckVhY2goKGl0ZW0sIGkpID0+IHtcbiAgICAgICAgdmFyIHN1Y2Nlc3M7XG5cbiAgICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICBzdWNjZXNzID0gKCkgPT4gdGhpcy5nb1RvRnJhbWUoMCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnZpZXdlci5hZGRUaWxlZEltYWdlKHtcbiAgICAgICAgICB4OiBpdGVtLnggLSBpdGVtLndpZHRoIC8gMixcbiAgICAgICAgICB5OiBpdGVtLnkgLSBpdGVtLmhlaWdodCAvIDIsXG4gICAgICAgICAgd2lkdGg6IGl0ZW0ud2lkdGgsXG4gICAgICAgICAgc3VjY2Vzczogc3VjY2VzcyxcbiAgICAgICAgICB0aWxlU291cmNlOiB7XG4gICAgICAgICAgICB0eXBlOiAnbGVnYWN5LWltYWdlLXB5cmFtaWQnLFxuICAgICAgICAgICAgbGV2ZWxzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB1cmw6IGl0ZW0udXJsLFxuICAgICAgICAgICAgICAgIHdpZHRoOiBpdGVtLndpZHRoLFxuICAgICAgICAgICAgICAgIGhlaWdodDogaXRlbS5oZWlnaHRcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGdvVG9GcmFtZShpbmRleCkge1xuICAgIHZhciBmcmFtZSA9IHRoaXMuZnJhbWVzW2luZGV4XTtcbiAgICB2YXIgYnVmZmVyRmFjdG9yID0gMC4yO1xuICAgIHZhciBib3ggPSBuZXcgT3BlblNlYWRyYWdvbi5SZWN0KFxuICAgICAgZnJhbWUueCAtIGZyYW1lLndpZHRoIC8gMixcbiAgICAgIGZyYW1lLnkgLSBmcmFtZS5oZWlnaHQgLyAyLFxuICAgICAgZnJhbWUud2lkdGgsXG4gICAgICBmcmFtZS5oZWlnaHRcbiAgICApO1xuXG4gICAgYm94LndpZHRoICo9IDEgKyBidWZmZXJGYWN0b3I7XG4gICAgYm94LmhlaWdodCAqPSAxICsgYnVmZmVyRmFjdG9yO1xuICAgIGJveC54IC09IGZyYW1lLndpZHRoICogYnVmZmVyRmFjdG9yICogMC41O1xuICAgIGJveC55IC09IGZyYW1lLmhlaWdodCAqIGJ1ZmZlckZhY3RvciAqIDAuNTtcblxuICAgIHRoaXMudmlld2VyLnZpZXdwb3J0LmZpdEJvdW5kcyhib3gpO1xuICAgIHRoaXMuZnJhbWVJbmRleCA9IGluZGV4O1xuICB9XG5cbiAgZ2V0RnJhbWVJbmRleCgpIHtcbiAgICByZXR1cm4gdGhpcy5mcmFtZUluZGV4O1xuICB9XG5cbiAgZ2V0RnJhbWVDb3VudCgpIHtcbiAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoO1xuICB9XG59XG4iLCJpbXBvcnQgRHJpZnRvcnkgZnJvbSAnLi4vbGlicmFyeS9kcmlmdG9yeSc7XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG4gIGNvbnN0IGRyaWZ0b3J5ID0gbmV3IERyaWZ0b3J5KHtcbiAgICBjb250YWluZXI6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5kcmlmdG9yeS12aWV3ZXItY29udGFpbmVyJyksXG4gICAgcHJlZml4VXJsOiAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9vcGVuc2VhZHJhZ29uQDIuNC9idWlsZC9vcGVuc2VhZHJhZ29uL2ltYWdlcy8nXG4gIH0pO1xuXG4gIGNvbnN0IG5leHRCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubmV4dC1idXR0b24nKTtcbiAgY29uc3QgcHJldmlvdXNCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucHJldmlvdXMtYnV0dG9uJyk7XG5cbiAgbmV4dEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICBsZXQgaW5kZXggPSBkcmlmdG9yeS5nZXRGcmFtZUluZGV4KCk7XG4gICAgaW5kZXggPSAoaW5kZXggKyAxKSAlIGRyaWZ0b3J5LmdldEZyYW1lQ291bnQoKTtcbiAgICAvLyBUTyBETzogd2UgbmVlZCBhIGJ1aWx0IGluIGRyaWZ0b3J5LmdvVG9OZXh0RnJhbWUoKSBtZXRob2RcbiAgICBkcmlmdG9yeS5nb1RvRnJhbWUoaW5kZXgpO1xuICB9KTtcblxuICBwcmV2aW91c0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICBsZXQgaW5kZXggPSBkcmlmdG9yeS5nZXRGcmFtZUluZGV4KCk7XG4gICAgaW5kZXggPSBpbmRleCA9PT0gMCA/IGRyaWZ0b3J5LmdldEZyYW1lQ291bnQoKSAtIDEgOiBpbmRleCAtIDE7XG4gICAgLy8gVE8gRE86IHdlIG5lZWQgYSBidWlsdCBpbiBkcmlmdG9yeS5nb1RvUHJldkZyYW1lKCkgbWV0aG9kXG4gICAgZHJpZnRvcnkuZ29Ub0ZyYW1lKGluZGV4KTtcbiAgfSk7XG5cbiAgZmV0Y2goJ2NvbWljLmpzb24nKVxuICAgIC50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICBjb25zb2xlLmVycm9yKHJlc3BvbnNlKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gbG9hZCBjb21pYy5qc29uJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgfSlcbiAgICAudGhlbigoanNvbikgPT4ge1xuICAgICAgLy8gY29uc29sZS5sb2coanNvbik7XG4gICAgICBkcmlmdG9yeS5vcGVuQ29taWMoanNvbi5jb21pYyk7XG4gICAgfSlcbiAgICAuY2F0Y2goKGVycm9yKSA9PiBjb25zb2xlLmVycm9yKGVycm9yKSk7XG59KTtcbiJdLCJuYW1lcyI6WyJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJ2YWx1ZSIsImFscmVhZHlDYWxsZWRTb3VyY2VzIiwiYXdhaXRpbmdDYWxsYmFja3MiLCJhZGRDYWxsYmFjayIsInNyYyIsImNhbGxiYWNrIiwicHVzaCIsImxvYWRKUyIsImluZGV4T2YiLCJzY3JpcHQiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJvbmxvYWQiLCJrZXkiLCJmb3JFYWNoIiwiY2IiLCJoZWFkIiwiYXBwZW5kQ2hpbGQiLCJPcGVuU2VhZHJhZ29uIiwib3NkUmVxdWVzdCIsIm9zZFByb21pc2UiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsIkRyaWZ0b3J5IiwiYXJncyIsImNvbnRhaW5lciIsImZyYW1lSW5kZXgiLCJmcmFtZXMiLCJpbml0aWFsaXplIiwibG9hZEpzIiwid2luZG93IiwicHJlZml4VXJsIiwidmlld2VyIiwiZWxlbWVudCIsInNob3dOYXZpZ2F0aW9uQ29udHJvbCIsIm1heFpvb21QaXhlbFJhdGlvIiwiY29taWMiLCJ0aGVuIiwic3R5bGUiLCJiYWNrZ3JvdW5kQ29sb3IiLCJib2R5IiwiaXRlbXMiLCJpdGVtIiwiaSIsInN1Y2Nlc3MiLCJnb1RvRnJhbWUiLCJhZGRUaWxlZEltYWdlIiwieCIsIndpZHRoIiwieSIsImhlaWdodCIsInRpbGVTb3VyY2UiLCJ0eXBlIiwibGV2ZWxzIiwidXJsIiwiaW5kZXgiLCJmcmFtZSIsImJ1ZmZlckZhY3RvciIsImJveCIsIlJlY3QiLCJ2aWV3cG9ydCIsImZpdEJvdW5kcyIsImxlbmd0aCIsImFkZEV2ZW50TGlzdGVuZXIiLCJkcmlmdG9yeSIsInF1ZXJ5U2VsZWN0b3IiLCJuZXh0QnV0dG9uIiwicHJldmlvdXNCdXR0b24iLCJnZXRGcmFtZUluZGV4IiwiZ2V0RnJhbWVDb3VudCIsImZldGNoIiwicmVzcG9uc2UiLCJvayIsImNvbnNvbGUiLCJlcnJvciIsIkVycm9yIiwianNvbiIsIm9wZW5Db21pYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBQ0FBLE1BQU0sQ0FBQ0MsY0FBUCxDQUFzQkMsT0FBdEIsRUFBK0IsWUFBL0IsRUFBNkM7RUFBRUMsRUFBQUEsS0FBSyxFQUFFO0VBQVQsQ0FBN0M7RUFDQSxJQUFJQyxvQkFBb0IsR0FBRyxFQUEzQjtFQUNBLElBQUlDLGlCQUFpQixHQUFHLEVBQXhCOztFQUNBLElBQUlDLFdBQVcsR0FBRyxTQUFkQSxXQUFjLENBQVVDLEdBQVYsRUFBZUMsUUFBZixFQUF5QjtFQUN2QyxNQUFJSCxpQkFBaUIsQ0FBQ0UsR0FBRCxDQUFyQixFQUE0QjtFQUN4QkYsSUFBQUEsaUJBQWlCLENBQUNFLEdBQUQsQ0FBakIsQ0FBdUJFLElBQXZCLENBQTRCRCxRQUE1QjtFQUNILEdBRkQsTUFHSztFQUNESCxJQUFBQSxpQkFBaUIsQ0FBQ0UsR0FBRCxDQUFqQixHQUF5QixDQUFDQyxRQUFELENBQXpC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