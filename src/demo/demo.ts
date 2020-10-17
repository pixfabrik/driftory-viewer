import Driftory from '../library/driftory';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.driftory-viewer-container') as HTMLDivElement;
  const startButton = document.querySelector('.start-button');
  const previousButton = document.querySelector('.previous-button');
  const nextButton = document.querySelector('.next-button');
  const hideButton = document.querySelector('.hide-button');
  const frameInfo = document.querySelector('.frame-info');

  const driftory = new Driftory({
    container,
    prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@2.4/build/openseadragon/images/',
    onComicLoad: () => {
      console.log('loaded!');
    },
    onFrameChange: ({ frameIndex = 0, isLastFrame }) => {
      if (frameInfo) {
        let text = `Frame ${frameIndex + 1}`;
        if (isLastFrame) {
          text += ' (last frame!)';
        }

        frameInfo.textContent = text;
      }
    }
  });

  startButton?.addEventListener('click', () => {
    driftory.goToFrame(0);
  });

  previousButton?.addEventListener('click', () => {
    driftory.goToPreviousFrame();
  });

  nextButton?.addEventListener('click', () => {
    driftory.goToNextFrame();
  });

  hideButton?.addEventListener('click', () => {
    container.classList.toggle('hide')
  })

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
      driftory.openComic(json);
    })
    .catch(error => console.error(error));
});
