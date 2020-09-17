import Driftory from '../library/driftory';

document.addEventListener('DOMContentLoaded', () => {
  const driftory = new Driftory({
    container: document.querySelector('.driftory-viewer-container'),
    prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/images/'
  });

  const nextButton = document.querySelector('.next-button');
  const previousButton = document.querySelector('.previous-button');

  nextButton.addEventListener('click', () => {
    driftory.goToNextFrame();
  });

  previousButton.addEventListener('click', () => {
    driftory.goToPreviousFrame();
  });

  fetch('comic.json')
    .then(response => {
      if (!response.ok) {
        console.error(response);
        throw new Error('Failed to load comic.json');
      }

      return response.json();
    })
    .then(json => {
      // console.log(json);
      driftory.openComic(json.comic);
    })
    .catch(error => console.error(error));
});
