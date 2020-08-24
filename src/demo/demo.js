import Driftory from '../library/driftory';

document.addEventListener('DOMContentLoaded', () => {
  const driftory = new Driftory({
    container: document.querySelector('.driftory-viewer-container'),
    prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/images/'
  });

  const nextButton = document.querySelector('.next-button');
  const previousButton = document.querySelector('.previous-button');

  nextButton.addEventListener('click', () => {
    let index = driftory.getFrameIndex();
    index = (index + 1) % driftory.getFrameCount();
    // TO DO: we need a built in driftory.goToNextFrame() method
    driftory.goToFrame(index);
  });

  previousButton.addEventListener('click', () => {
    let index = driftory.getFrameIndex();
    index = index === 0 ? driftory.getFrameCount() - 1 : index - 1;
    // TO DO: we need a built in driftory.goToPrevFrame() method
    driftory.goToFrame(index);
  });

  fetch('comic.json')
    .then((response) => {
      if (!response.ok) {
        console.error(response);
        throw new Error('Failed to load comic.json');
      }

      return response.json();
    })
    .then((json) => {
      // console.log(json);
      driftory.openComic(json.comic);
    })
    .catch((error) => console.error(error));
});
