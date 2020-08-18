(function() {
  // ----------
  var component = (window.DriftoryViewer = function(args) {
    this.container = args.container;

    this.viewer = OpenSeadragon({
      element: args.container,
      prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/images/'
    });
  });

  // ----------
  component.prototype = {
    // ----------
    openComic: function(comic) {
      var self = this;

      this.container.style.backgroundColor = comic.body.backgroundColor;

      comic.body.items.forEach(function(item) {
        self.viewer.addTiledImage({
          x: item.x - item.width / 2,
          y: item.y - item.height / 2,
          width: item.width,
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
  };
})();
