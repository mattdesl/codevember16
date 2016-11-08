require('fastclick')(document.body);

const createApp = require('./lib/createApp');
const createDemo = require('./lib/demos/createCloth');
const createAudio = require('./lib/demos/createAudio');
const createLoop = require('raf-loop');
const createBackground = require('three-vignette-background');
const palette = require('nice-color-palettes');
const isMobile = require('./lib/isMobile');

const colors = palette[0];
const app = createApp({
  canvas: document.querySelector('#canvas')
});
app.renderer.setClearColor(colors[0]);
app.renderer.sortObjects = false;
if (!isMobile) app.renderer.shadowMap.enabled = true;
app.renderer.toneMapping = THREE.CineonToneMapping;
app.renderer.gammaInput = true;
app.renderer.gammaOutput = true;
app.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const header = document.querySelector('header');
if (isMobile) {
  header.children[1].textContent = 'AND TAP + HOLD.'
}

const bg = createBackground({
  colors: [ colors[0], '#000' ]
});
app.scene.add(bg);

const component = createDemo(app, {
  colors
});

const audio = createAudio(() => {
  header.style.display = '';
  app.scene.add(component.object3d);
});

audio.on('rate', rate => {
  component.setRate(rate);
});

createLoop(dt => {
  // audio.updateFrequencies();
  component.update(dt);
  bg.style({
    aspect: app.width / app.height,
    aspectCorrection: true,
    scale: 3.5,
    // ensure even grain scale based on width/height
    grainScale: 0
  });
  app.updateControls();
  app.render();
  header.style.left = `${app.left + 20}px`;
  header.style.top = `${app.top + 20}px`;
}).start();
