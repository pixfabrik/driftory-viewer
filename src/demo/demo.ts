import Driftory from '../library/driftory';

const comicNames = [
  // 'comic-hide-until-frame.json',
  // 'comic-dual-frames.json',
  'comic.json',
  'comic-no-frames.json'
];

let comicIndex = 0;
let driftory: Driftory;

// ----------
function openComic() {
  const comicName = comicNames[comicIndex];
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
}

// ----------
document.addEventListener('DOMContentLoaded', () => {
  // We need to cast this to HTMLDivElement because that's what Driftory needs.
  const container = document.querySelector('.driftory-viewer-container') as HTMLDivElement | null;

  const startButton = document.querySelector('.start-button');
  const endButton = document.querySelector('.end-button');
  const previousButton = document.querySelector('.previous-button');
  const nextButton = document.querySelector('.next-button');
  const hideButton = document.querySelector('.hide-button');
  const navButton = document.querySelector('.nav-button');
  const nextComicButton = document.querySelector('.next-comic-button');
  const closeComicButton = document.querySelector('.close-comic-button');
  const listImagesButton = document.querySelector('.list-images-button');
  const frameInfo = document.querySelector('.frame-info');
  const imageList = document.querySelector('.image-list');

  if (!container) {
    console.error('Cannot find viewer container');
    return;
  }

  driftory = new Driftory({
    container,
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

  nextComicButton?.addEventListener('click', () => {
    comicIndex = (comicIndex + 1) % comicNames.length;
    openComic();
  });

  closeComicButton?.addEventListener('click', () => {
    driftory.closeComic();
  });

  listImagesButton?.addEventListener('click', () => {
    const count = driftory.getFrameCount();
    for (let i = 0; i < count; i++) {
      const frame = driftory.getFrame(i);
      if (frame?.images.length) {
        const frameImage = frame.images[0];
        const image = document.createElement('img');
        image.src = frameImage.url;
        imageList?.appendChild(image);
      }
    }
  });

  openComic();
});
