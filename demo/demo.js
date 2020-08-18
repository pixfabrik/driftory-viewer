var driftoryViewer;

// ----------
function init() {
  var driftoryViewer = new DriftoryViewer({
    container: document.querySelector('.driftory-viewer-container')
  });

  fetch('comic.json')
    .then(function(response) {
      if (!response.ok) {
        throw new Error('bad');
      }

      return response.json();
    })
    .then(function(json) {
      // console.log(json);

      driftoryViewer.openComic(json.comic);
    });
}

// ----------
// Kick it all off!
init();
