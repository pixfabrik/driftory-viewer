(function() {
  // ----------
  var component = (window.DriftoryViewer = function(args) {
    this.container = args.container;
    this.frameIndex = -1;
    this.frames = [];

    this.viewer = OpenSeadragon({
      element: args.container,
      prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/images/',
      showNavigationControl: false,
      maxZoomPixelRatio: 10
    });
  });

  // ----------
  component.prototype = {
    // ----------
    openComic: function(comic) {
      var self = this;

      this.container.style.backgroundColor = comic.body.backgroundColor;
      this.frames = comic.body.frames;

      comic.body.items.forEach(function(item, i) {
        var success;

        if (i === 0) {
          success = function() {
            self.goToFrame(0);
          };
        }

        self.viewer.addTiledImage({
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
    },

    // ----------
    goToFrame: function(index) {
      var frame = this.frames[index];
      var bufferFactor = 0.2;
      var box = new OpenSeadragon.Rect(
        frame.x - frame.width / 2,
        frame.y - frame.height / 2,
        frame.width,
        frame.height
      );

      box.width *= 1 + bufferFactor;
      box.height *= 1 + bufferFactor;
      box.x -= frame.width * bufferFactor * 0.5;
      box.y -= frame.height * bufferFactor * 0.5;

      this.viewer.viewport.fitBounds(box);
      this.frameIndex = index;
    },

    // ----------
    getFrameIndex: function() {
      return this.frameIndex;
    },

    // ----------
    getFrameCount: function() {
      return this.frames.length;
    }
  };
})();
