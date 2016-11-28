const createApp = require('../createApp');
const createDemo = require('../components/createLineDemo');
const createLoop = require('raf-loop');

const app = createApp({
  maxPixelRatio: 2,
  clampSize: false,
  target: [ 0, 0, 0 ],
  distance: 4,
});
app.renderer.setClearColor('hsl(0, 0%, 98%)');
app.renderer.sortObjects = false;
app.renderer.shadowMap.enabled = false;
app.renderer.toneMapping = THREE.CineonToneMapping;
app.renderer.gammaInput = true;
app.renderer.gammaOutput = true;
app.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(app.canvas);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const component = createDemo(app);
app.scene.add(component.object3d);

// const loop = createLoop(dt => {
  
// }).start();

setTimeout(() => {
  component.update(0);
  app.updateControls();
  app.render();
}, 1000)