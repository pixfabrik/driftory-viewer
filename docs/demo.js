(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var alreadyCalledSources = [];
var awaitingCallbacks = {};
var addCallback = function (src, callback) {
    if (awaitingCallbacks[src]) {
        awaitingCallbacks[src].push(callback);
    }
    else {
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
                awaitingCallbacks[key].forEach(function (cb) { return cb(); });
            }
        };
        document.head.appendChild(script);
    }
    else {
        addCallback(src, callback);
    }
}
exports.default = loadJS;

},{}],2:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var driftory_1 = __importDefault(require("../library/driftory"));
document.addEventListener('DOMContentLoaded', function () {
    var nextButton = document.querySelector('.next-button');
    var previousButton = document.querySelector('.previous-button');
    var frameInfo = document.querySelector('.frame-info');
    var driftory = new driftory_1.default({
        container: document.querySelector('.driftory-viewer-container'),
        prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/images/',
        onComicLoad: function () {
            console.log('loaded!');
        },
        onFrameChange: function (_a) {
            var _b = _a.frameIndex, frameIndex = _b === void 0 ? 0 : _b, isLastFrame = _a.isLastFrame;
            if (frameInfo) {
                var text = "Frame " + (frameIndex + 1);
                if (isLastFrame) {
                    text += ' (last frame!)';
                }
                frameInfo.textContent = text;
            }
        }
    });
    nextButton === null || nextButton === void 0 ? void 0 : nextButton.addEventListener('click', function () {
        driftory.goToNextFrame();
    });
    previousButton === null || previousButton === void 0 ? void 0 : previousButton.addEventListener('click', function () {
        driftory.goToPreviousFrame();
    });
    fetch('comic.json')
        .then(function (response) {
        if (!response.ok) {
            console.error(response);
            throw new Error('Failed to load comic.json');
        }
        return response.json();
    })
        .then(function (json) {
        // console.log(json);
        driftory.openComic(json.comic);
    })
        .catch(function (error) { return console.error(error); });
});

},{"../library/driftory":3}],3:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var load_js_1 = __importDefault(require("@dan503/load-js"));
var OpenSeadragon;
var osdRequest;
var osdPromise = new Promise(function (resolve, reject) {
    osdRequest = { resolve: resolve, reject: reject };
});
var Driftory = /** @class */ (function () {
    function Driftory(args) {
        var _this = this;
        this.frames = [];
        this.frameIndex = -1;
        this.lastScrollTime = 0;
        this.scrollDelay = 2000;
        this.container = args.container;
        this.onFrameChange = args.onFrameChange;
        this.onComicLoad = args.onComicLoad;
        // Note: loadJs only loads the file once, even if called multiple times, and always makes sure
        // all of the callbacks are called.
        load_js_1.default('https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/openseadragon.min.js', function () {
            OpenSeadragon = window.OpenSeadragon;
            _this.initialize(args);
            osdRequest === null || osdRequest === void 0 ? void 0 : osdRequest.resolve();
        });
    }
    Driftory.prototype.initialize = function (_a) {
        var _this = this;
        var container = _a.container, prefixUrl = _a.prefixUrl;
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
            // TODO: Maybe don't need to do this every frame.
            this.viewer.addHandler('animation', function () {
                var frameIndex = _this.figureFrameIndex();
                if (frameIndex !== -1 && frameIndex !== _this.frameIndex) {
                    _this.frameIndex = frameIndex;
                    if (_this.onFrameChange) {
                        _this.onFrameChange({
                            frameIndex: frameIndex,
                            isLastFrame: frameIndex === _this.getFrameCount() - 1
                        });
                    }
                }
            });
            this.viewer.addHandler('canvas-click', function (event) {
                if (!event || !event.quick || !event.position || !_this.viewer) {
                    return;
                }
                var point = _this.viewer.viewport.pointFromPixel(event.position);
                var foundIndex = -1;
                var itemCount = _this.viewer.world.getItemCount();
                for (var i = 0; i < itemCount; i++) {
                    var item = _this.viewer.world.getItemAt(i);
                    if (item.getBounds().containsPoint(point)) {
                        foundIndex = i;
                    }
                }
                if (foundIndex === -1) {
                    var realFrameIndex = _this.figureFrameIndex();
                    if (realFrameIndex === -1 && _this.frameIndex !== undefined) {
                        _this.goToFrame(_this.frameIndex);
                    }
                    else {
                        _this.goToNextFrame();
                    }
                }
                else if (foundIndex === _this.frameIndex) {
                    _this.goToNextFrame();
                }
                else {
                    _this.goToFrame(foundIndex);
                }
            });
            var originalScrollHandler_1 = this.viewer.innerTracker.scrollHandler;
            this.viewer.innerTracker.scrollHandler = function (event) {
                var _a;
                if (event.originalEvent.ctrlKey ||
                    event.originalEvent.altKey ||
                    event.originalEvent.metaKey) {
                    return originalScrollHandler_1.call((_a = _this.viewer) === null || _a === void 0 ? void 0 : _a.innerTracker, event);
                }
                var now = Date.now();
                // console.log(event.scroll, now, now - this.lastScrollTime);
                if (now - _this.lastScrollTime < _this.scrollDelay) {
                    // Returning false stops the browser from scrolling itself.
                    return false;
                }
                _this.lastScrollTime = now;
                if (event.scroll < 0) {
                    _this.goToNextFrame();
                }
                else {
                    _this.goToPreviousFrame();
                }
                // Returning false stops the browser from scrolling itself.
                return false;
            };
            window.addEventListener('keydown', function (event) {
                if (event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) {
                    return;
                }
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === ' ') {
                    _this.goToNextFrame();
                }
                else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                    _this.goToPreviousFrame();
                }
                else {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
            });
        }
    };
    Driftory.prototype.openComic = function (comic) {
        var _this = this;
        osdPromise.then(function () {
            _this.container.style.backgroundColor = comic.body.backgroundColor;
            if (_this.viewer) {
                if (comic.body.frames) {
                    _this.frames = comic.body.frames.map(function (frame) {
                        return (OpenSeadragon &&
                            new OpenSeadragon.Rect(frame.x - frame.width / 2, frame.y - frame.height / 2, frame.width, frame.height));
                    });
                }
                else {
                    _this.frames = comic.body.items.map(function (item) {
                        return (OpenSeadragon &&
                            new OpenSeadragon.Rect(item.x - item.width / 2, item.y - item.height / 2, item.width, item.height));
                    });
                }
                comic.body.items.forEach(function (item, i) {
                    var _a;
                    var success;
                    if (i === 0) {
                        success = function () { return _this.goToFrame(0); };
                    }
                    (_a = _this.viewer) === null || _a === void 0 ? void 0 : _a.addTiledImage({
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
                if (_this.onComicLoad) {
                    _this.onComicLoad({});
                }
            }
        });
    };
    Driftory.prototype.goToFrame = function (index) {
        var _a;
        var frame = this.frames[index];
        var bufferFactor = 0.2;
        var box = frame.clone();
        box.width *= 1 + bufferFactor;
        box.height *= 1 + bufferFactor;
        box.x -= frame.width * bufferFactor * 0.5;
        box.y -= frame.height * bufferFactor * 0.5;
        (_a = this.viewer) === null || _a === void 0 ? void 0 : _a.viewport.fitBounds(box);
    };
    Driftory.prototype.getFrameIndex = function () {
        return this.frameIndex;
    };
    Driftory.prototype.figureFrameIndex = function () {
        var bestIndex = -1;
        var bestDistance = Infinity;
        if (this.viewer) {
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
    };
    Driftory.prototype.getFrameCount = function () {
        return this.frames.length;
    };
    Driftory.prototype.goToNextFrame = function () {
        var index = this.getFrameIndex();
        if (index !== undefined && index < this.frames.length - 1) {
            this.goToFrame(index + 1);
        }
    };
    Driftory.prototype.goToPreviousFrame = function () {
        var index = this.getFrameIndex();
        if (index !== undefined && index > 0) {
            this.goToFrame(index - 1);
        }
    };
    return Driftory;
}());
exports.default = Driftory;

},{"@dan503/load-js":1}]},{},[2])

//# sourceMappingURL=demo.js.map
