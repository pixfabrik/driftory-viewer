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
module.exports = require('./src/normalizeWheel.js');

},{"./src/normalizeWheel.js":6}],3:[function(require,module,exports){
/**
 * Copyright (c) 2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ExecutionEnvironment
 */

/*jslint evil: true */

'use strict';

var canUseDOM = !!(
  typeof window !== 'undefined' &&
  window.document &&
  window.document.createElement
);

/**
 * Simple, lightweight module assisting with the detection and context of
 * Worker. Helps avoid circular dependencies and allows code to reason about
 * whether or not they are in a Worker, even if they never include the main
 * `ReactWorker` dependency.
 */
var ExecutionEnvironment = {

  canUseDOM: canUseDOM,

  canUseWorkers: typeof Worker !== 'undefined',

  canUseEventListeners:
    canUseDOM && !!(window.addEventListener || window.attachEvent),

  canUseViewport: canUseDOM && !!window.screen,

  isInWorker: !canUseDOM // For now, this is true - might change in the future.

};

module.exports = ExecutionEnvironment;

},{}],4:[function(require,module,exports){
/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule UserAgent_DEPRECATED
 */

/**
 *  Provides entirely client-side User Agent and OS detection. You should prefer
 *  the non-deprecated UserAgent module when possible, which exposes our
 *  authoritative server-side PHP-based detection to the client.
 *
 *  Usage is straightforward:
 *
 *    if (UserAgent_DEPRECATED.ie()) {
 *      //  IE
 *    }
 *
 *  You can also do version checks:
 *
 *    if (UserAgent_DEPRECATED.ie() >= 7) {
 *      //  IE7 or better
 *    }
 *
 *  The browser functions will return NaN if the browser does not match, so
 *  you can also do version compares the other way:
 *
 *    if (UserAgent_DEPRECATED.ie() < 7) {
 *      //  IE6 or worse
 *    }
 *
 *  Note that the version is a float and may include a minor version number,
 *  so you should always use range operators to perform comparisons, not
 *  strict equality.
 *
 *  **Note:** You should **strongly** prefer capability detection to browser
 *  version detection where it's reasonable:
 *
 *    http://www.quirksmode.org/js/support.html
 *
 *  Further, we have a large number of mature wrapper functions and classes
 *  which abstract away many browser irregularities. Check the documentation,
 *  grep for things, or ask on javascript@lists.facebook.com before writing yet
 *  another copy of "event || window.event".
 *
 */

var _populated = false;

// Browsers
var _ie, _firefox, _opera, _webkit, _chrome;

// Actual IE browser for compatibility mode
var _ie_real_version;

// Platforms
var _osx, _windows, _linux, _android;

// Architectures
var _win64;

// Devices
var _iphone, _ipad, _native;

var _mobile;

function _populate() {
  if (_populated) {
    return;
  }

  _populated = true;

  // To work around buggy JS libraries that can't handle multi-digit
  // version numbers, Opera 10's user agent string claims it's Opera
  // 9, then later includes a Version/X.Y field:
  //
  // Opera/9.80 (foo) Presto/2.2.15 Version/10.10
  var uas = navigator.userAgent;
  var agent = /(?:MSIE.(\d+\.\d+))|(?:(?:Firefox|GranParadiso|Iceweasel).(\d+\.\d+))|(?:Opera(?:.+Version.|.)(\d+\.\d+))|(?:AppleWebKit.(\d+(?:\.\d+)?))|(?:Trident\/\d+\.\d+.*rv:(\d+\.\d+))/.exec(uas);
  var os    = /(Mac OS X)|(Windows)|(Linux)/.exec(uas);

  _iphone = /\b(iPhone|iP[ao]d)/.exec(uas);
  _ipad = /\b(iP[ao]d)/.exec(uas);
  _android = /Android/i.exec(uas);
  _native = /FBAN\/\w+;/i.exec(uas);
  _mobile = /Mobile/i.exec(uas);

  // Note that the IE team blog would have you believe you should be checking
  // for 'Win64; x64'.  But MSDN then reveals that you can actually be coming
  // from either x64 or ia64;  so ultimately, you should just check for Win64
  // as in indicator of whether you're in 64-bit IE.  32-bit IE on 64-bit
  // Windows will send 'WOW64' instead.
  _win64 = !!(/Win64/.exec(uas));

  if (agent) {
    _ie = agent[1] ? parseFloat(agent[1]) : (
          agent[5] ? parseFloat(agent[5]) : NaN);
    // IE compatibility mode
    if (_ie && document && document.documentMode) {
      _ie = document.documentMode;
    }
    // grab the "true" ie version from the trident token if available
    var trident = /(?:Trident\/(\d+.\d+))/.exec(uas);
    _ie_real_version = trident ? parseFloat(trident[1]) + 4 : _ie;

    _firefox = agent[2] ? parseFloat(agent[2]) : NaN;
    _opera   = agent[3] ? parseFloat(agent[3]) : NaN;
    _webkit  = agent[4] ? parseFloat(agent[4]) : NaN;
    if (_webkit) {
      // We do not add the regexp to the above test, because it will always
      // match 'safari' only since 'AppleWebKit' appears before 'Chrome' in
      // the userAgent string.
      agent = /(?:Chrome\/(\d+\.\d+))/.exec(uas);
      _chrome = agent && agent[1] ? parseFloat(agent[1]) : NaN;
    } else {
      _chrome = NaN;
    }
  } else {
    _ie = _firefox = _opera = _chrome = _webkit = NaN;
  }

  if (os) {
    if (os[1]) {
      // Detect OS X version.  If no version number matches, set _osx to true.
      // Version examples:  10, 10_6_1, 10.7
      // Parses version number as a float, taking only first two sets of
      // digits.  If only one set of digits is found, returns just the major
      // version number.
      var ver = /(?:Mac OS X (\d+(?:[._]\d+)?))/.exec(uas);

      _osx = ver ? parseFloat(ver[1].replace('_', '.')) : true;
    } else {
      _osx = false;
    }
    _windows = !!os[2];
    _linux   = !!os[3];
  } else {
    _osx = _windows = _linux = false;
  }
}

var UserAgent_DEPRECATED = {

  /**
   *  Check if the UA is Internet Explorer.
   *
   *
   *  @return float|NaN Version number (if match) or NaN.
   */
  ie: function() {
    return _populate() || _ie;
  },

  /**
   * Check if we're in Internet Explorer compatibility mode.
   *
   * @return bool true if in compatibility mode, false if
   * not compatibility mode or not ie
   */
  ieCompatibilityMode: function() {
    return _populate() || (_ie_real_version > _ie);
  },


  /**
   * Whether the browser is 64-bit IE.  Really, this is kind of weak sauce;  we
   * only need this because Skype can't handle 64-bit IE yet.  We need to remove
   * this when we don't need it -- tracked by #601957.
   */
  ie64: function() {
    return UserAgent_DEPRECATED.ie() && _win64;
  },

  /**
   *  Check if the UA is Firefox.
   *
   *
   *  @return float|NaN Version number (if match) or NaN.
   */
  firefox: function() {
    return _populate() || _firefox;
  },


  /**
   *  Check if the UA is Opera.
   *
   *
   *  @return float|NaN Version number (if match) or NaN.
   */
  opera: function() {
    return _populate() || _opera;
  },


  /**
   *  Check if the UA is WebKit.
   *
   *
   *  @return float|NaN Version number (if match) or NaN.
   */
  webkit: function() {
    return _populate() || _webkit;
  },

  /**
   *  For Push
   *  WILL BE REMOVED VERY SOON. Use UserAgent_DEPRECATED.webkit
   */
  safari: function() {
    return UserAgent_DEPRECATED.webkit();
  },

  /**
   *  Check if the UA is a Chrome browser.
   *
   *
   *  @return float|NaN Version number (if match) or NaN.
   */
  chrome : function() {
    return _populate() || _chrome;
  },


  /**
   *  Check if the user is running Windows.
   *
   *  @return bool `true' if the user's OS is Windows.
   */
  windows: function() {
    return _populate() || _windows;
  },


  /**
   *  Check if the user is running Mac OS X.
   *
   *  @return float|bool   Returns a float if a version number is detected,
   *                       otherwise true/false.
   */
  osx: function() {
    return _populate() || _osx;
  },

  /**
   * Check if the user is running Linux.
   *
   * @return bool `true' if the user's OS is some flavor of Linux.
   */
  linux: function() {
    return _populate() || _linux;
  },

  /**
   * Check if the user is running on an iPhone or iPod platform.
   *
   * @return bool `true' if the user is running some flavor of the
   *    iPhone OS.
   */
  iphone: function() {
    return _populate() || _iphone;
  },

  mobile: function() {
    return _populate() || (_iphone || _ipad || _android || _mobile);
  },

  nativeApp: function() {
    // webviews inside of the native apps
    return _populate() || _native;
  },

  android: function() {
    return _populate() || _android;
  },

  ipad: function() {
    return _populate() || _ipad;
  }
};

module.exports = UserAgent_DEPRECATED;

},{}],5:[function(require,module,exports){
/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule isEventSupported
 */

'use strict';

var ExecutionEnvironment = require('./ExecutionEnvironment');

var useHasFeature;
if (ExecutionEnvironment.canUseDOM) {
  useHasFeature =
    document.implementation &&
    document.implementation.hasFeature &&
    // always returns true in newer browsers as per the standard.
    // @see http://dom.spec.whatwg.org/#dom-domimplementation-hasfeature
    document.implementation.hasFeature('', '') !== true;
}

/**
 * Checks if an event is supported in the current execution environment.
 *
 * NOTE: This will not work correctly for non-generic events such as `change`,
 * `reset`, `load`, `error`, and `select`.
 *
 * Borrows from Modernizr.
 *
 * @param {string} eventNameSuffix Event name, e.g. "click".
 * @param {?boolean} capture Check if the capture phase is supported.
 * @return {boolean} True if the event is supported.
 * @internal
 * @license Modernizr 3.0.0pre (Custom Build) | MIT
 */
function isEventSupported(eventNameSuffix, capture) {
  if (!ExecutionEnvironment.canUseDOM ||
      capture && !('addEventListener' in document)) {
    return false;
  }

  var eventName = 'on' + eventNameSuffix;
  var isSupported = eventName in document;

  if (!isSupported) {
    var element = document.createElement('div');
    element.setAttribute(eventName, 'return;');
    isSupported = typeof element[eventName] === 'function';
  }

  if (!isSupported && useHasFeature && eventNameSuffix === 'wheel') {
    // This is the only way to test support for the `wheel` event in IE9+.
    isSupported = document.implementation.hasFeature('Events.wheel', '3.0');
  }

  return isSupported;
}

module.exports = isEventSupported;

},{"./ExecutionEnvironment":3}],6:[function(require,module,exports){
/**
 * Copyright (c) 2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule normalizeWheel
 * @typechecks
 */

'use strict';

var UserAgent_DEPRECATED = require('./UserAgent_DEPRECATED');

var isEventSupported = require('./isEventSupported');


// Reasonable defaults
var PIXEL_STEP  = 10;
var LINE_HEIGHT = 40;
var PAGE_HEIGHT = 800;

/**
 * Mouse wheel (and 2-finger trackpad) support on the web sucks.  It is
 * complicated, thus this doc is long and (hopefully) detailed enough to answer
 * your questions.
 *
 * If you need to react to the mouse wheel in a predictable way, this code is
 * like your bestest friend. * hugs *
 *
 * As of today, there are 4 DOM event types you can listen to:
 *
 *   'wheel'                -- Chrome(31+), FF(17+), IE(9+)
 *   'mousewheel'           -- Chrome, IE(6+), Opera, Safari
 *   'MozMousePixelScroll'  -- FF(3.5 only!) (2010-2013) -- don't bother!
 *   'DOMMouseScroll'       -- FF(0.9.7+) since 2003
 *
 * So what to do?  The is the best:
 *
 *   normalizeWheel.getEventType();
 *
 * In your event callback, use this code to get sane interpretation of the
 * deltas.  This code will return an object with properties:
 *
 *   spinX   -- normalized spin speed (use for zoom) - x plane
 *   spinY   -- " - y plane
 *   pixelX  -- normalized distance (to pixels) - x plane
 *   pixelY  -- " - y plane
 *
 * Wheel values are provided by the browser assuming you are using the wheel to
 * scroll a web page by a number of lines or pixels (or pages).  Values can vary
 * significantly on different platforms and browsers, forgetting that you can
 * scroll at different speeds.  Some devices (like trackpads) emit more events
 * at smaller increments with fine granularity, and some emit massive jumps with
 * linear speed or acceleration.
 *
 * This code does its best to normalize the deltas for you:
 *
 *   - spin is trying to normalize how far the wheel was spun (or trackpad
 *     dragged).  This is super useful for zoom support where you want to
 *     throw away the chunky scroll steps on the PC and make those equal to
 *     the slow and smooth tiny steps on the Mac. Key data: This code tries to
 *     resolve a single slow step on a wheel to 1.
 *
 *   - pixel is normalizing the desired scroll delta in pixel units.  You'll
 *     get the crazy differences between browsers, but at least it'll be in
 *     pixels!
 *
 *   - positive value indicates scrolling DOWN/RIGHT, negative UP/LEFT.  This
 *     should translate to positive value zooming IN, negative zooming OUT.
 *     This matches the newer 'wheel' event.
 *
 * Why are there spinX, spinY (or pixels)?
 *
 *   - spinX is a 2-finger side drag on the trackpad, and a shift + wheel turn
 *     with a mouse.  It results in side-scrolling in the browser by default.
 *
 *   - spinY is what you expect -- it's the classic axis of a mouse wheel.
 *
 *   - I dropped spinZ/pixelZ.  It is supported by the DOM 3 'wheel' event and
 *     probably is by browsers in conjunction with fancy 3D controllers .. but
 *     you know.
 *
 * Implementation info:
 *
 * Examples of 'wheel' event if you scroll slowly (down) by one step with an
 * average mouse:
 *
 *   OS X + Chrome  (mouse)     -    4   pixel delta  (wheelDelta -120)
 *   OS X + Safari  (mouse)     -  N/A   pixel delta  (wheelDelta  -12)
 *   OS X + Firefox (mouse)     -    0.1 line  delta  (wheelDelta  N/A)
 *   Win8 + Chrome  (mouse)     -  100   pixel delta  (wheelDelta -120)
 *   Win8 + Firefox (mouse)     -    3   line  delta  (wheelDelta -120)
 *
 * On the trackpad:
 *
 *   OS X + Chrome  (trackpad)  -    2   pixel delta  (wheelDelta   -6)
 *   OS X + Firefox (trackpad)  -    1   pixel delta  (wheelDelta  N/A)
 *
 * On other/older browsers.. it's more complicated as there can be multiple and
 * also missing delta values.
 *
 * The 'wheel' event is more standard:
 *
 * http://www.w3.org/TR/DOM-Level-3-Events/#events-wheelevents
 *
 * The basics is that it includes a unit, deltaMode (pixels, lines, pages), and
 * deltaX, deltaY and deltaZ.  Some browsers provide other values to maintain
 * backward compatibility with older events.  Those other values help us
 * better normalize spin speed.  Example of what the browsers provide:
 *
 *                          | event.wheelDelta | event.detail
 *        ------------------+------------------+--------------
 *          Safari v5/OS X  |       -120       |       0
 *          Safari v5/Win7  |       -120       |       0
 *         Chrome v17/OS X  |       -120       |       0
 *         Chrome v17/Win7  |       -120       |       0
 *                IE9/Win7  |       -120       |   undefined
 *         Firefox v4/OS X  |     undefined    |       1
 *         Firefox v4/Win7  |     undefined    |       3
 *
 */
function normalizeWheel(/*object*/ event) /*object*/ {
  var sX = 0, sY = 0,       // spinX, spinY
      pX = 0, pY = 0;       // pixelX, pixelY

  // Legacy
  if ('detail'      in event) { sY = event.detail; }
  if ('wheelDelta'  in event) { sY = -event.wheelDelta / 120; }
  if ('wheelDeltaY' in event) { sY = -event.wheelDeltaY / 120; }
  if ('wheelDeltaX' in event) { sX = -event.wheelDeltaX / 120; }

  // side scrolling on FF with DOMMouseScroll
  if ( 'axis' in event && event.axis === event.HORIZONTAL_AXIS ) {
    sX = sY;
    sY = 0;
  }

  pX = sX * PIXEL_STEP;
  pY = sY * PIXEL_STEP;

  if ('deltaY' in event) { pY = event.deltaY; }
  if ('deltaX' in event) { pX = event.deltaX; }

  if ((pX || pY) && event.deltaMode) {
    if (event.deltaMode == 1) {          // delta in LINE units
      pX *= LINE_HEIGHT;
      pY *= LINE_HEIGHT;
    } else {                             // delta in PAGE units
      pX *= PAGE_HEIGHT;
      pY *= PAGE_HEIGHT;
    }
  }

  // Fall-back if spin cannot be determined
  if (pX && !sX) { sX = (pX < 1) ? -1 : 1; }
  if (pY && !sY) { sY = (pY < 1) ? -1 : 1; }

  return { spinX  : sX,
           spinY  : sY,
           pixelX : pX,
           pixelY : pY };
}


/**
 * The best combination if you prefer spinX + spinY normalization.  It favors
 * the older DOMMouseScroll for Firefox, as FF does not include wheelDelta with
 * 'wheel' event, making spin speed determination impossible.
 */
normalizeWheel.getEventType = function() /*string*/ {
  return (UserAgent_DEPRECATED.firefox())
           ? 'DOMMouseScroll'
           : (isEventSupported('wheel'))
               ? 'wheel'
               : 'mousewheel';
};

module.exports = normalizeWheel;

},{"./UserAgent_DEPRECATED":4,"./isEventSupported":5}],7:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var driftory_1 = __importDefault(require("../library/driftory"));
var comicNames = [
    // 'comic-hide-until-frame.json',
    'comic.json',
    'comic-no-frames.json'
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
    var listImagesButton = document.querySelector('.list-images-button');
    var frameInfo = document.querySelector('.frame-info');
    var imageList = document.querySelector('.image-list');
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
    listImagesButton === null || listImagesButton === void 0 ? void 0 : listImagesButton.addEventListener('click', function () {
        var count = driftory.getFrameCount();
        for (var i = 0; i < count; i++) {
            var frame = driftory.getFrame(i);
            if (frame === null || frame === void 0 ? void 0 : frame.images.length) {
                var frameImage = frame.images[0];
                var image = document.createElement('img');
                image.src = frameImage.url;
                imageList.appendChild(image);
            }
        }
    });
    openComic();
});

},{"../library/driftory":8}],8:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var load_js_1 = __importDefault(require("@dan503/load-js"));
var util_1 = require("./util");
var normalize_wheel_1 = __importDefault(require("normalize-wheel"));
var OpenSeadragon;
var osdRequest;
var osdPromise = new Promise(function (resolve, reject) {
    osdRequest = { resolve: resolve, reject: reject };
});
var scrollQuantum = 0.05;
var Driftory = /** @class */ (function () {
    // ----------
    function Driftory(args) {
        var _this = this;
        this.imageItems = [];
        this.frames = [];
        this.framePath = [];
        this.frameIndex = -1;
        this.frameIndexHint = -1;
        this.maxScrollValue = 0;
        this.navEnabled = true;
        this.comicLoaded = false;
        this.scroll = null;
        this.container = args.container;
        this.onFrameChange = args.onFrameChange || function () { };
        this.onComicLoad = args.onComicLoad || function () { };
        this.onNoNext = args.onNoNext || function () { };
        this.onNoPrevious = args.onNoPrevious || function () { };
        this._animationFrame = this._animationFrame.bind(this);
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
                var _a, _b;
                if (!_this.navEnabled) {
                    // Returning false stops the browser from scrolling itself.
                    return false;
                }
                if (event.originalEvent.ctrlKey ||
                    event.originalEvent.altKey ||
                    event.originalEvent.metaKey) {
                    return originalScrollHandler_1.call((_a = _this.viewer) === null || _a === void 0 ? void 0 : _a.innerTracker, event);
                }
                var normalized = normalize_wheel_1.default(event.originalEvent);
                if (!_this.scroll || Math.abs(normalized.spinY) > 0.9) {
                    var direction = normalized.spinY < 0 ? -1 : 1;
                    if (!_this.scroll || _this.scroll.direction !== direction) {
                        _this.scroll = {
                            value: _this.frameIndex,
                            startIndex: _this.frameIndex,
                            startBounds: (_b = _this.viewer) === null || _b === void 0 ? void 0 : _b.viewport.getBounds(true)
                        };
                    }
                    var target = _this.scroll.value + normalized.spinY * 0.5;
                    target = direction < 0 ? Math.floor(target) : Math.ceil(target);
                    target = util_1.clamp(target, 0, _this.maxScrollValue);
                    _this.scroll.direction = direction;
                    _this.scroll.target = target;
                    _this.scroll.time = Date.now();
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
        this._animationFrame();
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
            // Get frames
            if (_this.viewer) {
                if (comic.body.frames) {
                    _this.frames = comic.body.frames.map(function (frame) {
                        return {
                            images: [],
                            bounds: new OpenSeadragon.Rect(frame.x - frame.width / 2, frame.y - frame.height / 2, frame.width, frame.height)
                        };
                    });
                }
                else {
                    _this.frames = comic.body.items.map(function (item) {
                        return {
                            images: [],
                            bounds: new OpenSeadragon.Rect(item.x - item.width / 2, item.y - item.height / 2, item.width, item.height)
                        };
                    });
                }
                // Make frame path
                _this.framePath = [];
                var scroll_1 = 0;
                _this.frames.forEach(function (frame) {
                    var point = frame.bounds.getCenter();
                    var bounds = _this._getBoundsForFrame(frame);
                    _this.framePath.push({
                        scroll: scroll_1,
                        point: point,
                        bounds: bounds
                    });
                    _this.maxScrollValue = scroll_1;
                    scroll_1++;
                });
                // Get image items
                comic.body.items.forEach(function (item, i) {
                    var _a, _b;
                    var imageItem = {
                        url: item.url,
                        bounds: new OpenSeadragon.Rect(item.x - item.width / 2, item.y - item.height / 2, item.width, item.height),
                        targetOpacity: 1,
                        hideUntilFrame: item.hideUntilFrame
                    };
                    _this.imageItems.push(imageItem);
                    var tileSource = {
                        type: 'legacy-image-pyramid',
                        levels: [
                            {
                                url: item.url,
                                width: item.width,
                                height: item.height
                            }
                        ]
                    };
                    (_a = _this.viewer) === null || _a === void 0 ? void 0 : _a.addTiledImage({
                        preload: true,
                        opacity: 0,
                        x: imageItem.bounds.x,
                        y: imageItem.bounds.y,
                        width: imageItem.bounds.width,
                        success: function (event) {
                            imageItem.tiledImage = event.item;
                            _this._updateImageVisibility();
                            if (i === 0) {
                                _this._startComic();
                            }
                        },
                        tileSource: tileSource
                    });
                    if (i > 0) {
                        var previousImageItem = _this.imageItems[i - 1];
                        (_b = _this.viewer) === null || _b === void 0 ? void 0 : _b.addTiledImage({
                            preload: true,
                            opacity: 0,
                            x: previousImageItem.bounds.x,
                            y: previousImageItem.bounds.y,
                            width: previousImageItem.bounds.width,
                            success: function (event) {
                                imageItem.preloadTiledImage = event.item;
                            },
                            tileSource: tileSource
                        });
                    }
                });
                _this.frames.forEach(function (frame, frameIndex) {
                    var frameArea = frame.bounds.width * frame.bounds.height;
                    _this.imageItems.forEach(function (imageItem, imageIndex) {
                        if (!imageItem.hideUntilFrame || imageItem.hideUntilFrame <= frameIndex) {
                            var intersection = frame.bounds.intersection(imageItem.bounds);
                            if (intersection) {
                                var area = intersection.width * intersection.height;
                                frame.images.push({ imageItem: imageItem, imageIndex: imageIndex, frameFillFactor: area / frameArea });
                            }
                        }
                    });
                    // Sort primary image first, based on how much it fills the frame. On a tie, prefer later images.
                    // TODO: Account for images hidden under other images better.
                    frame.images.sort(function (a, b) {
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
    };
    /** Remove the comic from the screen */
    Driftory.prototype.closeComic = function () {
        var _a;
        this.imageItems = [];
        this.frames = [];
        this.framePath = [];
        this.frameIndex = -1;
        this.frameIndexHint = -1;
        this.maxScrollValue = 0;
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
            if (imageItem.hideUntilFrame !== undefined) {
                imageItem.targetOpacity = _this.frameIndex < imageItem.hideUntilFrame ? 0 : 1;
            }
        });
    };
    // ----------
    Driftory.prototype._animationFrame = function () {
        requestAnimationFrame(this._animationFrame);
        this.imageItems.forEach(function (imageItem) {
            var tiledImage = imageItem.tiledImage;
            var preloadTiledImage = imageItem.preloadTiledImage;
            if (tiledImage &&
                (tiledImage.getFullyLoaded() || (preloadTiledImage && preloadTiledImage.getFullyLoaded()))) {
                var opacity = tiledImage.getOpacity();
                if (opacity !== imageItem.targetOpacity) {
                    tiledImage.setOpacity(util_1.clamp(opacity + util_1.sign(imageItem.targetOpacity - opacity) * 0.03, 0, 1));
                }
            }
        });
        if (this.scroll) {
            var epsilon = 0.00001;
            var amount = Math.abs(this.scroll.target - this.scroll.value) * 0.1;
            amount = Math.max(amount, epsilon);
            amount = Math.min(amount, scrollQuantum) * this.scroll.direction;
            this.scroll.value += amount;
            if (this.scroll.direction > 0) {
                if (this.scroll.value >= this.scroll.target - epsilon) {
                    this.scroll.value = this.scroll.target;
                }
            }
            else {
                if (this.scroll.value <= this.scroll.target + epsilon) {
                    this.scroll.value = this.scroll.target;
                }
            }
            this._updateForScrollValue();
            var timeDiff = Date.now() - this.scroll.time;
            // console.log(timeDiff, this.scroll.value, this.scroll.target);
            if (this.scroll.value === this.scroll.target && timeDiff > 20) {
                delete this.scroll;
            }
        }
    };
    // ----------
    Driftory.prototype._updateForScrollValue = function () {
        if (this.viewer && this.scroll) {
            for (var i = 0; i < this.framePath.length - 1; i++) {
                var aIndex = i;
                var bIndex = i + 1;
                var a = this.framePath[aIndex];
                var b = this.framePath[bIndex];
                if (this.scroll.value >= a.scroll && this.scroll.value <= b.scroll) {
                    var newFrameIndex = void 0;
                    if (this.scroll.direction > 0) {
                        newFrameIndex = this.scroll.value === a.scroll ? aIndex : bIndex;
                    }
                    else {
                        newFrameIndex = this.scroll.value === b.scroll ? bIndex : aIndex;
                    }
                    this.frameIndexHint = newFrameIndex;
                    var factor = util_1.mapLinear(this.scroll.value, a.scroll, b.scroll, 0, 1);
                    var earlierBounds = void 0, laterBounds = void 0;
                    if (this.scroll.startIndex === aIndex || this.scroll.startIndex === bIndex) {
                        if (this.scroll.direction > 0) {
                            earlierBounds = this.scroll.startBounds;
                            laterBounds = b.bounds;
                        }
                        else {
                            earlierBounds = a.bounds;
                            laterBounds = this.scroll.startBounds;
                        }
                    }
                    else {
                        this.scroll.startIndex = -1;
                        earlierBounds = a.bounds;
                        laterBounds = b.bounds;
                    }
                    var newBounds = new OpenSeadragon.Rect(util_1.mapLinear(factor, 0, 1, earlierBounds.x, laterBounds.x), util_1.mapLinear(factor, 0, 1, earlierBounds.y, laterBounds.y), util_1.mapLinear(factor, 0, 1, earlierBounds.width, laterBounds.width), util_1.mapLinear(factor, 0, 1, earlierBounds.height, laterBounds.height));
                    this.viewer.viewport.fitBounds(newBounds, true);
                    break;
                }
            }
        }
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
            if (frame) {
                this.frameIndexHint = index;
                var box = this._getBoundsForFrame(frame);
                (_a = this.viewer) === null || _a === void 0 ? void 0 : _a.viewport.fitBounds(box);
            }
        }
    };
    // ----------
    Driftory.prototype._getBoundsForFrame = function (frame) {
        var bufferFactor = 0.2;
        var box = frame.bounds.clone();
        box.width *= 1 + bufferFactor;
        box.height *= 1 + bufferFactor;
        box.x -= frame.bounds.width * bufferFactor * 0.5;
        box.y -= frame.bounds.height * bufferFactor * 0.5;
        return box;
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
                var bounds = frame.bounds;
                if (bounds.containsPoint(viewportCenter)) {
                    var distance = void 0;
                    if (this.frameIndexHint === -1) {
                        distance = viewportCenter.squaredDistanceTo(bounds.getCenter());
                    }
                    else {
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
    };
    // ----------
    Driftory.prototype._getHitFrame = function (point) {
        var bestIndex = -1;
        if (this.viewer) {
            for (var i = 0; i < this.frames.length; i++) {
                var frame = this.frames[i];
                var bounds = frame.bounds;
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
    };
    /** Return the total number of frames found in the comic sequence */
    Driftory.prototype.getFrameCount = function () {
        return this.frames.length;
    };
    /** Return an object with information about the frame at the specified index */
    Driftory.prototype.getFrame = function (frameIndex) {
        var frame = this.frames[frameIndex];
        if (!frame) {
            return null;
        }
        return {
            bounds: frame.bounds.clone(),
            images: frame.images.map(function (frameImage) {
                var imageItem = frameImage.imageItem;
                return {
                    url: imageItem.url,
                    bounds: imageItem.bounds.clone(),
                    hideUntilFrame: imageItem.hideUntilFrame,
                    frameFillFactor: frameImage.frameFillFactor,
                    index: frameImage.imageIndex
                };
            })
        };
    };
    /** Return the total number of images found in the comic */
    Driftory.prototype.getImageCount = function () {
        return this.imageItems.length;
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

},{"./util":9,"@dan503/load-js":1,"normalize-wheel":2}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sign = exports.clamp = exports.polarToVector = exports.vectorToPolar = exports.mapLinear = void 0;
// ----------
function mapLinear(x, a1, a2, b1, b2, clamp) {
    console.assert(a1 !== a2, 'a1 and a2 must be different');
    var output = b1 + ((x - a1) * (b2 - b1)) / (a2 - a1);
    if (clamp) {
        var min = Math.min(b1, b2);
        var max = Math.max(b1, b2);
        return Math.max(min, Math.min(max, output));
    }
    return output;
}
exports.mapLinear = mapLinear;
// ----------
function vectorToPolar(x, y) {
    return {
        radians: Math.atan2(y, x),
        distance: Math.sqrt(x * x + y * y)
    };
}
exports.vectorToPolar = vectorToPolar;
// ----------
function polarToVector(radians, distance) {
    return {
        x: Math.cos(radians) * distance,
        y: Math.sin(radians) * distance
    };
}
exports.polarToVector = polarToVector;
// ----------
function clamp(x, min, max) {
    return Math.max(min, Math.min(max, x));
}
exports.clamp = clamp;
// ----------
function sign(x) {
    if (x < 0) {
        return -1;
    }
    if (x > 0) {
        return 1;
    }
    return 0;
}
exports.sign = sign;

},{}]},{},[7])

//# sourceMappingURL=demo.js.map
