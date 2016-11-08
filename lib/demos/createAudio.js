const createPlayer = require('web-audio-player');
const tweenr = require('tweenr')();
const lerp = require('lerp');
const EventEmitter = require('events').EventEmitter;
const isMobile = require('../isMobile');
const touches = require('touches');

module.exports = function (cb) {
  let bufferNode;
  const tween = { value: 0 };
  const minRate = 0.65;
  const maxRate = 1;
  const isIOS = /(iPhone|iPad|iPod)/i.test(window.navigator.userAgent);
  const player = createPlayer('assets/audio/pilotpriest-cruising-cut.mp3', {
    buffer: true
  });

  // const analyser = player.context.createAnalyser();
  player.node.connect(player.context.destination);
  // analyser.connect(player.context.destination);
  // const frequencies = new Uint8Array(analyser.frequencyBinCount);

  player.on('load', () => {
    bufferNode = player.context.createBufferSource();
    bufferNode.connect(player.node);
    bufferNode.buffer = player.buffer
    bufferNode.loop = true
    updateBuffer();
    if (!isIOS) bufferNode.start(0);
    cb(null);
  });

  let isInteracting = false;
  window.addEventListener('keydown', ev => {
    if (ev.keyCode === 32) {
      ev.preventDefault();
      enableInteraction();
    }
  });
  window.addEventListener('keyup', ev => {
    if (ev.keyCode === 32) {
      ev.preventDefault();
      disableInteraction();
    }
  })
  if (isMobile) {
    touches(window, { filtered: true })
      .on('start', ev => {
        enableInteraction();
      })
      .on('end', ev => {
        disableInteraction();
      });
  }

  const emitter = new EventEmitter();
  // emitter.updateFrequencies = updateFrequencies;
  // emitter.frequencies = frequencies;
  // emitter.analyser = analyser;
  return emitter;

  // function updateFrequencies () {
  //   analyser.getByteFrequencyData(frequencies);
  // }

  function enableInteraction () {
    isInteracting = true;
    tweenr.cancel().to(tween, {
      duration: 0.5,
      value: 1,
      ease: 'expoOut'
    }).on('update', updateBuffer);
  }

  function disableInteraction () {
    isInteracting = false;
    tweenr.cancel().to(tween, {
      duration: 1,
      value: 0,
      ease: 'quadOut'
    }).on('update', updateBuffer);
  }

  function updateBuffer () {
    if (bufferNode)  {
      bufferNode.playbackRate.value = lerp(minRate, maxRate, tween.value);
    }
    emitter.emit('rate', tween.value);
  }
}