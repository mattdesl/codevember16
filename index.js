const createApp = require('./lib/createApp');
const createAttractor = require('./lib/createAttractor');
const createLoop = require('raf-loop');

const app = createApp();
app.renderer.setClearColor('hsl(0, 0%, 98%)');
app.renderer.sortObjects = false;
app.renderer.shadowMap.enabled = true;
app.renderer.toneMapping = THREE.CineonToneMapping;
app.renderer.gammaInput = true;
app.renderer.gammaOutput = true;
app.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(app.canvas);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const component = createAttractor(app);
app.scene.add(component.object3d);

createLoop(dt => {
  component.update(dt);
  app.updateControls();
  app.render();
}).start();
