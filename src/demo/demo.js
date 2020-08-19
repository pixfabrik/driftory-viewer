import Driftory from '../library/driftory';

var nextButton, previousButton;

// ----------
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

  fetch('comic.json')
    .then(function (response) {
      if (!response.ok) {
        throw new Error('bad');
      }

      return response.json();
    })
    .then(function (json) {
      // console.log(json);

      driftory.openComic(json.comic);
    });
}

// ----------
// Kick it all off!
init();
