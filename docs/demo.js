(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var alreadyCalledScripts = [];
var allScripts = {};
var defaultScript = { hasLoaded: false, callbacks: [] };
var addCallback = function (src, callback) {
    var script = allScripts[src];
    if (!script)
        return;
    if (script.hasLoaded) {
        // If the script has already been previously loaded, just run the callback immediately
        callback();
    }
    else {
        if (script.callbacks.length > 0) {
            script.callbacks.push(callback);
        }
        else {
            script.callbacks = [callback];
        }
    }
};
function loadJS(src, callback) {
    var script = allScripts[src] || defaultScript;
    allScripts[src] = script;
    if (alreadyCalledScripts.indexOf(src) < 0) {
        alreadyCalledScripts.push(src);
        var $scriptElem = document.createElement('script');
        $scriptElem.setAttribute('class', 'load-js-script');
        $scriptElem.src = src;
        $scriptElem.onload = function () {
            addCallback(src, callback);
            var updatedScript = allScripts[src];
            if (updatedScript) {
                updatedScript.hasLoaded = true;
            }
            for (var thisSource in allScripts) {
                var thisScript = allScripts[thisSource] || defaultScript;
                thisScript.callbacks.forEach(function (cb) { return cb(); });
            }
        };
        document.head.appendChild($scriptElem);
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
var comicNames = [
    'comic.json',
    'comic-no-frames.json'
    // 'comic-hide-until-frame.json'
];
var comicIndex = 0;
var driftory;
// ----------
function openComic() {
    var comicName = comicNames[comicIndex];
    fetch(comicName)
        .then(function (response) {
        if (!response.ok) {
            console.error(response);
            throw new Error('Failed to load ' + comicName);
        }
        return response.json();
    })
        .then(function (json) {
        // console.log(json);
        driftory.openComic(json);
    })
        .catch(function (error) { return console.error(error); });
}
// ----------
document.addEventListener('DOMContentLoaded', function () {
    // We need to cast this to HTMLDivElement because that's what Driftory needs.
    var container = document.querySelector('.driftory-viewer-container');
    var startButton = document.querySelector('.start-button');
    var endButton = document.querySelector('.end-button');
    var previousButton = document.querySelector('.previous-button');
    var nextButton = document.querySelector('.next-button');
    var hideButton = document.querySelector('.hide-button');
    var navButton = document.querySelector('.nav-button');
    var nextComicButton = document.querySelector('.next-comic-button');
    var closeComicButton = document.querySelector('.close-comic-button');
    var frameInfo = document.querySelector('.frame-info');
    if (!container) {
        console.error('Cannot find viewer container');
        return;
    }
    driftory = new driftory_1.default({
        container: container,
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
        },
        onNoNext: function () {
            console.log('User trying to go past end');
        },
        onNoPrevious: function () {
            console.log('User trying to go before beginning');
        }
    });
    startButton === null || startButton === void 0 ? void 0 : startButton.addEventListener('click', function () {
        driftory.goToFrame(0);
    });
    endButton === null || endButton === void 0 ? void 0 : endButton.addEventListener('click', function () {
        driftory.goToFrame(driftory.getFrameCount() - 1);
    });
    previousButton === null || previousButton === void 0 ? void 0 : previousButton.addEventListener('click', function () {
        driftory.goToPreviousFrame();
    });
    nextButton === null || nextButton === void 0 ? void 0 : nextButton.addEventListener('click', function () {
        driftory.goToNextFrame();
    });
    hideButton === null || hideButton === void 0 ? void 0 : hideButton.addEventListener('click', function () {
        container.classList.toggle('hide');
    });
    navButton === null || navButton === void 0 ? void 0 : navButton.addEventListener('click', function () {
        var flag = !driftory.getNavEnabled();
        driftory.setNavEnabled(flag);
        navButton.textContent = flag ? 'disable nav' : 'enable nav';
    });
    nextComicButton === null || nextComicButton === void 0 ? void 0 : nextComicButton.addEventListener('click', function () {
        comicIndex = (comicIndex + 1) % comicNames.length;
        openComic();
    });
    closeComicButton === null || closeComicButton === void 0 ? void 0 : closeComicButton.addEventListener('click', function () {
        driftory.closeComic();
    });
    openComic();
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
    // ----------
    function Driftory(args) {
        var _this = this;
        this.imageItems = [];
        this.frames = [];
        this.frameIndex = -1;
        this.frameIndexHint = -1;
        this.lastScrollTime = 0;
        this.scrollDelay = 2000;
        this.navEnabled = true;
        this.comicLoaded = false;
        this.container = args.container;
        this.onFrameChange = args.onFrameChange || function () { };
        this.onComicLoad = args.onComicLoad || function () { };
        this.onNoNext = args.onNoNext || function () { };
        this.onNoPrevious = args.onNoPrevious || function () { };
        if (args.OpenSeadragon) {
            OpenSeadragon = args.OpenSeadragon;
            this._initialize(args);
            osdRequest === null || osdRequest === void 0 ? void 0 : osdRequest.resolve();
        }
        else {
            // Note: loadJs only loads the file once, even if called multiple times, and always makes sure
            // all of the callbacks are called.
            load_js_1.default('https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/openseadragon.min.js', function () {
                OpenSeadragon = window.OpenSeadragon;
                _this._initialize(args);
                osdRequest === null || osdRequest === void 0 ? void 0 : osdRequest.resolve();
            });
        }
    }
    // ----------
    Driftory.prototype._initialize = function (_a) {
        var _this = this;
        var container = _a.container;
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
            var frameHandler = function () {
                if (!_this.comicLoaded) {
                    return;
                }
                var frameIndex = _this._figureFrameIndex(false);
                if (frameIndex !== -1 && frameIndex !== _this.frameIndex) {
                    _this.frameIndex = frameIndex;
                    _this._updateImageVisibility();
                    if (_this.onFrameChange) {
                        _this.onFrameChange({
                            frameIndex: frameIndex,
                            isLastFrame: frameIndex === _this.getFrameCount() - 1
                        });
                    }
                }
            };
            this.viewer.addHandler('zoom', frameHandler);
            this.viewer.addHandler('pan', frameHandler);
            this.viewer.addHandler('canvas-click', function (event) {
                if (!event || !event.quick || !event.position || !_this.viewer || !_this.navEnabled) {
                    return;
                }
                var point = _this.viewer.viewport.pointFromPixel(event.position);
                var foundIndex = _this._getHitFrame(point);
                if (foundIndex === -1) {
                    var realFrameIndex = _this._figureFrameIndex(true);
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
                if (!_this.navEnabled) {
                    // Returning false stops the browser from scrolling itself.
                    return false;
                }
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
                if (event.altKey || event.shiftKey || event.ctrlKey || event.metaKey || !_this.navEnabled) {
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
    /** Render the comic on screen */
    Driftory.prototype.openComic = function (unsafeComic) {
        var _this = this;
        if (this.frames.length || this.imageItems.length) {
            this.closeComic();
        }
        var comic = (typeof unsafeComic === 'string' ? JSON.parse(unsafeComic) : unsafeComic).comic;
        osdPromise.then(function () {
            _this.container.style.backgroundColor = comic.body.backgroundColor;
            if (_this.viewer) {
                if (comic.body.frames) {
                    _this.frames = comic.body.frames.map(function (frame) {
                        return new OpenSeadragon.Rect(frame.x - frame.width / 2, frame.y - frame.height / 2, frame.width, frame.height);
                    });
                }
                else {
                    _this.frames = comic.body.items.map(function (item) {
                        return new OpenSeadragon.Rect(item.x - item.width / 2, item.y - item.height / 2, item.width, item.height);
                    });
                }
                comic.body.items.forEach(function (item, i) {
                    var _a;
                    var imageItem = {
                        hideUntilFrame: item.hideUntilFrame
                    };
                    _this.imageItems.push(imageItem);
                    (_a = _this.viewer) === null || _a === void 0 ? void 0 : _a.addTiledImage({
                        preload: true,
                        x: item.x - item.width / 2,
                        y: item.y - item.height / 2,
                        width: item.width,
                        success: function (event) {
                            imageItem.tiledImage = event.item;
                            _this._updateImageVisibility();
                            if (i === 0) {
                                _this._startComic();
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
    };
    /** Remove the comic from the screen */
    Driftory.prototype.closeComic = function () {
        var _a;
        this.imageItems = [];
        this.frames = [];
        this.frameIndex = -1;
        this.frameIndexHint = -1;
        this.lastScrollTime = 0;
        this.comicLoaded = false;
        (_a = this.viewer) === null || _a === void 0 ? void 0 : _a.close();
    };
    // ----------
    Driftory.prototype._startComic = function () {
        this.comicLoaded = true;
        this.goToFrame(0);
        if (this.onComicLoad) {
            this.onComicLoad({});
        }
    };
    // ----------
    Driftory.prototype._updateImageVisibility = function () {
        var _this = this;
        this.imageItems.forEach(function (imageItem) {
            var _a;
            if (imageItem.hideUntilFrame !== undefined) {
                (_a = imageItem.tiledImage) === null || _a === void 0 ? void 0 : _a.setOpacity(_this.frameIndex < imageItem.hideUntilFrame ? 0 : 1);
            }
        });
    };
    /** Determine if the frame navigation controls are currently able to be used to navigate */
    Driftory.prototype.getNavEnabled = function () {
        return this.navEnabled;
    };
    /** Enable / Disable frame navigation controls */
    Driftory.prototype.setNavEnabled = function (flag) {
        var _a;
        this.navEnabled = flag;
        (_a = this.viewer) === null || _a === void 0 ? void 0 : _a.setMouseNavEnabled(flag);
    };
    /** Navigate to a specific frame via its index number */
    Driftory.prototype.goToFrame = function (index) {
        var _a;
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
                (_a = this.viewer) === null || _a === void 0 ? void 0 : _a.viewport.fitBounds(box);
            }
        }
    };
    /** Get the currently active frame index. This will be whatever frame is in the middle of the
    screen. If there is no frame in the middle, it'll be whatever frame the user last had there. */
    Driftory.prototype.getFrameIndex = function () {
        return this.frameIndex;
    };
    // ----------
    Driftory.prototype._figureFrameIndex = function (current) {
        var bestIndex = -1;
        var bestDistance = Infinity;
        if (this.viewer) {
            var viewportBounds = this.viewer.viewport.getBounds(current);
            var viewportCenter = viewportBounds.getCenter();
            for (var i = 0; i < this.frames.length; i++) {
                var frame = this.frames[i];
                if (frame.containsPoint(viewportCenter)) {
                    if (this.frameIndexHint === i) {
                        bestIndex = i;
                        break;
                    }
                    var distance = viewportCenter.squaredDistanceTo(frame.getCenter());
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestIndex = i;
                    }
                }
            }
        }
        return bestIndex;
    };
    // ----------
    Driftory.prototype._getHitFrame = function (point) {
        var bestIndex = -1;
        if (this.viewer) {
            for (var i = 0; i < this.frames.length; i++) {
                var frame = this.frames[i];
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
    };
    /** Return the total number of frames found in the comic sequence */
    Driftory.prototype.getFrameCount = function () {
        return this.frames.length;
    };
    /** Navigate to the next frame in the sequence */
    Driftory.prototype.goToNextFrame = function () {
        var index = this.getFrameIndex();
        if (index < this.frames.length - 1) {
            this.goToFrame(index + 1);
        }
        else {
            this.onNoNext({});
        }
    };
    /** Navigate to the previous frame in the sequence */
    Driftory.prototype.goToPreviousFrame = function () {
        var index = this.getFrameIndex();
        if (index > 0) {
            this.goToFrame(index - 1);
        }
        else {
            this.onNoPrevious({});
        }
    };
    return Driftory;
}());
exports.default = Driftory;

},{"@dan503/load-js":1}]},{},[2])

//# sourceMappingURL=demo.js.map
