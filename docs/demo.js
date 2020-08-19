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

  var Driftory = /*#__PURE__*/function () {
    function Driftory(args) {
      var _this = this;

      _classCallCheck(this, Driftory);

      loadJs$1('https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/openseadragon.min.js', function () {
        OpenSeadragon = window.OpenSeadragon;

        _this.initialize(args);
      });
    }

    _createClass(Driftory, [{
      key: "initialize",
      value: function initialize(_ref) {
        var container = _ref.container,
            prefixUrl = _ref.prefixUrl;
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
    }, {
      key: "openComic",
      value: function openComic(comic) {
        var _this2 = this;

        this.container.style.backgroundColor = comic.body.backgroundColor;
        this.frames = comic.body.frames;
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

  var nextButton, previousButton; // ----------

  function init() {
    var driftory = new Driftory({
      container: document.querySelector('.driftory-viewer-container'),
      prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/images/'
    });
    nextButton = document.querySelector('.next-button');
    previousButton = document.querySelector('.previous-button');
    nextButton.addEventListener('click', function () {
      var index = driftory.getFrameIndex();
      index = (index + 1) % driftory.getFrameCount();
      driftory.goToFrame(index);
    });
    previousButton.addEventListener('click', function () {
      var index = driftory.getFrameIndex();
      index = index === 0 ? driftory.getFrameCount() - 1 : index - 1;
      driftory.goToFrame(index);
    });
    fetch('comic.json').then(function (response) {
      if (!response.ok) {
        throw new Error('bad');
      }

      return response.json();
    }).then(function (json) {
      // console.log(json);
      driftory.openComic(json.comic);
    });
  } // ----------
  // Kick it all off!


  init();

}());

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVtby5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL0BkYW41MDMvbG9hZC1qcy9pbmRleC5qcyIsInNyYy9saWJyYXJ5L2RyaWZ0b3J5LmpzIiwic3JjL2RlbW8vZGVtby5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG52YXIgYWxyZWFkeUNhbGxlZFNvdXJjZXMgPSBbXTtcclxudmFyIGF3YWl0aW5nQ2FsbGJhY2tzID0ge307XHJcbnZhciBhZGRDYWxsYmFjayA9IGZ1bmN0aW9uIChzcmMsIGNhbGxiYWNrKSB7XHJcbiAgICBpZiAoYXdhaXRpbmdDYWxsYmFja3Nbc3JjXSkge1xyXG4gICAgICAgIGF3YWl0aW5nQ2FsbGJhY2tzW3NyY10ucHVzaChjYWxsYmFjayk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBhd2FpdGluZ0NhbGxiYWNrc1tzcmNdID0gW2NhbGxiYWNrXTtcclxuICAgIH1cclxufTtcclxuZnVuY3Rpb24gbG9hZEpTKHNyYywgY2FsbGJhY2spIHtcclxuICAgIGlmIChhbHJlYWR5Q2FsbGVkU291cmNlcy5pbmRleE9mKHNyYykgPCAwKSB7XHJcbiAgICAgICAgYWxyZWFkeUNhbGxlZFNvdXJjZXMucHVzaChzcmMpO1xyXG4gICAgICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcclxuICAgICAgICBzY3JpcHQuc3JjID0gc3JjO1xyXG4gICAgICAgIHNjcmlwdC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGFkZENhbGxiYWNrKHNyYywgY2FsbGJhY2spO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gYXdhaXRpbmdDYWxsYmFja3MpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0aW5nQ2FsbGJhY2tzW2tleV0uZm9yRWFjaChmdW5jdGlvbiAoY2IpIHsgcmV0dXJuIGNiKCk7IH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHNjcmlwdCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBhZGRDYWxsYmFjayhzcmMsIGNhbGxiYWNrKTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLmRlZmF1bHQgPSBsb2FkSlM7XHJcbiIsImltcG9ydCBsb2FkSnMgZnJvbSAnQGRhbjUwMy9sb2FkLWpzJztcclxuXHJcbmxldCBPcGVuU2VhZHJhZ29uO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRHJpZnRvcnkge1xyXG4gIGNvbnN0cnVjdG9yKGFyZ3MpIHtcclxuICAgIGxvYWRKcyhcclxuICAgICAgJ2h0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vb3BlbnNlYWRyYWdvbkAyLjQvYnVpbGQvb3BlbnNlYWRyYWdvbi9vcGVuc2VhZHJhZ29uLm1pbi5qcycsXHJcbiAgICAgICgpID0+IHtcclxuICAgICAgICBPcGVuU2VhZHJhZ29uID0gd2luZG93Lk9wZW5TZWFkcmFnb247XHJcbiAgICAgICAgdGhpcy5pbml0aWFsaXplKGFyZ3MpO1xyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgaW5pdGlhbGl6ZSh7IGNvbnRhaW5lciwgcHJlZml4VXJsIH0pIHtcclxuICAgIHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyO1xyXG4gICAgdGhpcy5mcmFtZUluZGV4ID0gLTE7XHJcbiAgICB0aGlzLmZyYW1lcyA9IFtdO1xyXG5cclxuICAgIHRoaXMudmlld2VyID0gT3BlblNlYWRyYWdvbih7XHJcbiAgICAgIGVsZW1lbnQ6IGNvbnRhaW5lcixcclxuICAgICAgcHJlZml4VXJsOiBwcmVmaXhVcmwsXHJcbiAgICAgIHNob3dOYXZpZ2F0aW9uQ29udHJvbDogZmFsc2UsXHJcbiAgICAgIG1heFpvb21QaXhlbFJhdGlvOiAxMFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBvcGVuQ29taWMoY29taWMpIHtcclxuICAgIHRoaXMuY29udGFpbmVyLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGNvbWljLmJvZHkuYmFja2dyb3VuZENvbG9yO1xyXG4gICAgdGhpcy5mcmFtZXMgPSBjb21pYy5ib2R5LmZyYW1lcztcclxuXHJcbiAgICBjb21pYy5ib2R5Lml0ZW1zLmZvckVhY2goKGl0ZW0sIGkpID0+IHtcclxuICAgICAgdmFyIHN1Y2Nlc3M7XHJcblxyXG4gICAgICBpZiAoaSA9PT0gMCkge1xyXG4gICAgICAgIHN1Y2Nlc3MgPSAoKSA9PiB0aGlzLmdvVG9GcmFtZSgwKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy52aWV3ZXIuYWRkVGlsZWRJbWFnZSh7XHJcbiAgICAgICAgeDogaXRlbS54IC0gaXRlbS53aWR0aCAvIDIsXHJcbiAgICAgICAgeTogaXRlbS55IC0gaXRlbS5oZWlnaHQgLyAyLFxyXG4gICAgICAgIHdpZHRoOiBpdGVtLndpZHRoLFxyXG4gICAgICAgIHN1Y2Nlc3M6IHN1Y2Nlc3MsXHJcbiAgICAgICAgdGlsZVNvdXJjZToge1xyXG4gICAgICAgICAgdHlwZTogJ2xlZ2FjeS1pbWFnZS1weXJhbWlkJyxcclxuICAgICAgICAgIGxldmVsczogW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgdXJsOiBpdGVtLnVybCxcclxuICAgICAgICAgICAgICB3aWR0aDogaXRlbS53aWR0aCxcclxuICAgICAgICAgICAgICBoZWlnaHQ6IGl0ZW0uaGVpZ2h0XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIF1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnb1RvRnJhbWUoaW5kZXgpIHtcclxuICAgIHZhciBmcmFtZSA9IHRoaXMuZnJhbWVzW2luZGV4XTtcclxuICAgIHZhciBidWZmZXJGYWN0b3IgPSAwLjI7XHJcbiAgICB2YXIgYm94ID0gbmV3IE9wZW5TZWFkcmFnb24uUmVjdChcclxuICAgICAgZnJhbWUueCAtIGZyYW1lLndpZHRoIC8gMixcclxuICAgICAgZnJhbWUueSAtIGZyYW1lLmhlaWdodCAvIDIsXHJcbiAgICAgIGZyYW1lLndpZHRoLFxyXG4gICAgICBmcmFtZS5oZWlnaHRcclxuICAgICk7XHJcblxyXG4gICAgYm94LndpZHRoICo9IDEgKyBidWZmZXJGYWN0b3I7XHJcbiAgICBib3guaGVpZ2h0ICo9IDEgKyBidWZmZXJGYWN0b3I7XHJcbiAgICBib3gueCAtPSBmcmFtZS53aWR0aCAqIGJ1ZmZlckZhY3RvciAqIDAuNTtcclxuICAgIGJveC55IC09IGZyYW1lLmhlaWdodCAqIGJ1ZmZlckZhY3RvciAqIDAuNTtcclxuXHJcbiAgICB0aGlzLnZpZXdlci52aWV3cG9ydC5maXRCb3VuZHMoYm94KTtcclxuICAgIHRoaXMuZnJhbWVJbmRleCA9IGluZGV4O1xyXG4gIH1cclxuXHJcbiAgZ2V0RnJhbWVJbmRleCgpIHtcclxuICAgIHJldHVybiB0aGlzLmZyYW1lSW5kZXg7XHJcbiAgfVxyXG5cclxuICBnZXRGcmFtZUNvdW50KCkge1xyXG4gICAgcmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aDtcclxuICB9XHJcbn1cclxuIiwiaW1wb3J0IERyaWZ0b3J5IGZyb20gJy4uL2xpYnJhcnkvZHJpZnRvcnknO1xyXG5cclxudmFyIG5leHRCdXR0b24sIHByZXZpb3VzQnV0dG9uO1xyXG5cclxuLy8gLS0tLS0tLS0tLVxyXG5mdW5jdGlvbiBpbml0KCkge1xyXG4gIHZhciBkcmlmdG9yeSA9IG5ldyBEcmlmdG9yeSh7XHJcbiAgICBjb250YWluZXI6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5kcmlmdG9yeS12aWV3ZXItY29udGFpbmVyJyksXHJcbiAgICBwcmVmaXhVcmw6ICdodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL29wZW5zZWFkcmFnb25AMi40L2J1aWxkL29wZW5zZWFkcmFnb24vaW1hZ2VzLydcclxuICB9KTtcclxuXHJcbiAgbmV4dEJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5uZXh0LWJ1dHRvbicpO1xyXG4gIHByZXZpb3VzQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnByZXZpb3VzLWJ1dHRvbicpO1xyXG5cclxuICBuZXh0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGluZGV4ID0gZHJpZnRvcnkuZ2V0RnJhbWVJbmRleCgpO1xyXG4gICAgaW5kZXggPSAoaW5kZXggKyAxKSAlIGRyaWZ0b3J5LmdldEZyYW1lQ291bnQoKTtcclxuICAgIGRyaWZ0b3J5LmdvVG9GcmFtZShpbmRleCk7XHJcbiAgfSk7XHJcblxyXG4gIHByZXZpb3VzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGluZGV4ID0gZHJpZnRvcnkuZ2V0RnJhbWVJbmRleCgpO1xyXG4gICAgaW5kZXggPSBpbmRleCA9PT0gMCA/IGRyaWZ0b3J5LmdldEZyYW1lQ291bnQoKSAtIDEgOiBpbmRleCAtIDE7XHJcbiAgICBkcmlmdG9yeS5nb1RvRnJhbWUoaW5kZXgpO1xyXG4gIH0pO1xyXG5cclxuICBmZXRjaCgnY29taWMuanNvbicpXHJcbiAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYmFkJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XHJcbiAgICB9KVxyXG4gICAgLnRoZW4oZnVuY3Rpb24gKGpzb24pIHtcclxuICAgICAgLy8gY29uc29sZS5sb2coanNvbik7XHJcblxyXG4gICAgICBkcmlmdG9yeS5vcGVuQ29taWMoanNvbi5jb21pYyk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuLy8gLS0tLS0tLS0tLVxyXG4vLyBLaWNrIGl0IGFsbCBvZmYhXHJcbmluaXQoKTtcclxuIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwiYWxyZWFkeUNhbGxlZFNvdXJjZXMiLCJhd2FpdGluZ0NhbGxiYWNrcyIsImFkZENhbGxiYWNrIiwic3JjIiwiY2FsbGJhY2siLCJwdXNoIiwibG9hZEpTIiwiaW5kZXhPZiIsInNjcmlwdCIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsIm9ubG9hZCIsImtleSIsImZvckVhY2giLCJjYiIsImhlYWQiLCJhcHBlbmRDaGlsZCIsIk9wZW5TZWFkcmFnb24iLCJEcmlmdG9yeSIsImFyZ3MiLCJsb2FkSnMiLCJ3aW5kb3ciLCJpbml0aWFsaXplIiwiY29udGFpbmVyIiwicHJlZml4VXJsIiwiZnJhbWVJbmRleCIsImZyYW1lcyIsInZpZXdlciIsImVsZW1lbnQiLCJzaG93TmF2aWdhdGlvbkNvbnRyb2wiLCJtYXhab29tUGl4ZWxSYXRpbyIsImNvbWljIiwic3R5bGUiLCJiYWNrZ3JvdW5kQ29sb3IiLCJib2R5IiwiaXRlbXMiLCJpdGVtIiwiaSIsInN1Y2Nlc3MiLCJnb1RvRnJhbWUiLCJhZGRUaWxlZEltYWdlIiwieCIsIndpZHRoIiwieSIsImhlaWdodCIsInRpbGVTb3VyY2UiLCJ0eXBlIiwibGV2ZWxzIiwidXJsIiwiaW5kZXgiLCJmcmFtZSIsImJ1ZmZlckZhY3RvciIsImJveCIsIlJlY3QiLCJ2aWV3cG9ydCIsImZpdEJvdW5kcyIsImxlbmd0aCIsIm5leHRCdXR0b24iLCJwcmV2aW91c0J1dHRvbiIsImluaXQiLCJkcmlmdG9yeSIsInF1ZXJ5U2VsZWN0b3IiLCJhZGRFdmVudExpc3RlbmVyIiwiZ2V0RnJhbWVJbmRleCIsImdldEZyYW1lQ291bnQiLCJmZXRjaCIsInRoZW4iLCJyZXNwb25zZSIsIm9rIiwiRXJyb3IiLCJqc29uIiwib3BlbkNvbWljIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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