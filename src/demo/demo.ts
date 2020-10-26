import Driftory from '../library/driftory';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.driftory-viewer-container') as HTMLDivElement | null;
  const startButton = document.querySelector('.start-button');
  const endButton = document.querySelector('.end-button');
  const previousButton = document.querySelector('.previous-button');
  const nextButton = document.querySelector('.next-button');
  const hideButton = document.querySelector('.hide-button');
  const navButton = document.querySelector('.nav-button');
  const frameInfo = document.querySelector('.frame-info');

  if (!container) {
    console.error('Cannot find viewer container');
    return;
  }

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
    },
    onNoNext: () => {
      console.log('User trying to go past end');
    },
    onNoPrevious: () => {
      console.log('User trying to go before beginning');
    }
  });

  startButton?.addEventListener('click', () => {
    driftory.goToFrame(0);
  });

  endButton?.addEventListener('click', () => {
    driftory.goToFrame(driftory.getFrameCount() - 1);
  });

  previousButton?.addEventListener('click', () => {
    driftory.goToPreviousFrame();
  });

  nextButton?.addEventListener('click', () => {
    driftory.goToNextFrame();
  });

  hideButton?.addEventListener('click', () => {
    container.classList.toggle('hide');
  });

  navButton?.addEventListener('click', () => {
    const flag = !driftory.getNavEnabled();
    driftory.setNavEnabled(flag);
    navButton.textContent = flag ? 'disable nav' : 'enable nav';
  });

  const comicName = 'comic.json';
  // const comicName = 'comic-no-frames.json';
  // const comicName = 'comic-hide-until-frame.json';
  fetch(comicName)
    .then((response) => {
      if (!response.ok) {
        console.error(response);
        throw new Error('Failed to load ' + comicName);
      }

      return response.json();
    })
    .then((json) => {
      // console.log(json);
      driftory.openComic(json);
    })
    .catch((error) => console.error(error));
});
