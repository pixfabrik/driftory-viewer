const alreadyCalledSources = [];

const awaitingCallbacks = {};

const addCallback = (src, callback) => {
  if (awaitingCallbacks[src]) {
    awaitingCallbacks[src].push(callback);
  } else {
    awaitingCallbacks[src] = [callback];
  }
};

export default function loadJS(src, callback) {
  if (alreadyCalledSources.indexOf(src) < 0) {
    alreadyCalledSources.push(src);
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      addCallback(src, callback);

      for (const key in awaitingCallbacks) {
        awaitingCallbacks[key].forEach((cb) => cb());
      }
    };
    document.head.appendChild(script);
  } else {
    addCallback(src, callback);
  }
}
