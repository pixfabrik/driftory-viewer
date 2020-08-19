var driftoryViewer, nextButton, previousButton;

// ----------
function init() {
  var driftoryViewer = new DriftoryViewer({
    container: document.querySelector('.driftory-viewer-container')
  });

  nextButton = document.querySelector('.next-button');
  previousButton = document.querySelector('.previous-button');

  nextButton.addEventListener('click', function () {
    var index = driftoryViewer.getFrameIndex();
    index = (index + 1) % driftoryViewer.getFrameCount();
    driftoryViewer.goToFrame(index);
  });

  previousButton.addEventListener('click', function () {
    var index = driftoryViewer.getFrameIndex();
    index = index === 0 ? driftoryViewer.getFrameCount() - 1 : index - 1;
    driftoryViewer.goToFrame(index);
  });

  fetch('comic.json')
    .then(function (response) {
      if (!response.ok) {
        throw new Error('bad');
      }

      return response.json();
    })
    .then(function (json) {
      // console.log(json);

      driftoryViewer.openComic(json.comic);
    });
}

// ----------
// Kick it all off!
init();
