require('fastclick')(document.body);
try {
const createApp = require('../createApp');
const createDemo = require('../components/createCloth');
const createAudio = require('../components/createAudio');
const createLoop = require('raf-loop');
const createBackground = require('three-vignette-background');
const palette = require('nice-color-palettes');
const isMobile = require('../isMobile');

const colors = palette[0];
const app = createApp({
  maxPixelRatio: 1.85,
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
const updateCopy = () => {
  header.children[0].textContent = 'TURN ON YOUR SOUND'
  header.children[1].textContent = isMobile ? 'AND TAP + HOLD.' : 'AND HOLD THE SPACE BAR'
};

const bg = createBackground({
  colors: [ colors[0], '#000' ]
});
app.scene.add(bg);

const component = createDemo(app, {
  colors
});

const audio = createAudio(() => {
  updateCopy();
  header.style.display = '';
  app.scene.add(component.object3d);
  
  audio.once('change', () => {
    header.style.display = 'none';
  });

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

} catch(err) {
  alert(err.message)
}