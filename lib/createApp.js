/*
  This is a generic "ThreeJS Application"
  helper which sets up a renderer and camera
  controls.
 */

const createControls = require('orbit-controls');
const assign = require('object-assign');
const SSAOShader = require('./shaders/SSAOShader');
const EffectComposer = require('./post/EffectComposer');
const FXAA = require('three-shader-fxaa');
const BloomPass = require('./post/BloomPass');

module.exports = createApp;
function createApp (opt = {}) {
  // Scale for retina
  const dpr = Math.min(2, window.devicePixelRatio);

  // Our WebGL renderer with alpha and device-scaled
  const renderer = new THREE.WebGLRenderer(assign({
    antialias: false // default enabled
  }, opt));
  renderer.setPixelRatio(dpr);

  // Add the <canvas> to DOM body
  const canvas = renderer.domElement;

  // perspective camera
  const near = 0.1;
  const far = 100;
  const fieldOfView = 65;
  const camera = new THREE.PerspectiveCamera(fieldOfView, 1, near, far);
  const target = new THREE.Vector3();

  const composer = createComposer();
  const renderTargets = [ composer.renderTarget1, composer.renderTarget2, composer.initialRenderTarget ];

  // 3D scene
  const scene = new THREE.Scene();

  // slick 3D orbit controller with damping
  const controls = createControls(assign({
    canvas,
    distanceBounds: [ 1, 10 ],
    distance: 4,
    target: [ 0, 2, 0 ],
    phi: 90 * Math.PI / 180,
    theta: 90 * Math.PI / 180,
    // phiBounds: [ 0, 125 * Math.PI / 180 ]
  }, opt));

  // Update renderer size
  window.addEventListener('resize', resize);

  // post processing
  setupPost();

  const app = assign({}, {
    updateControls,
    camera,
    scene,
    renderer,
    controls,
    canvas,
    render
  });

  app.width = 0;
  app.height = 0;

  // Setup initial size & aspect ratio
  resize();
  updateControls();
  return app;

  function setupPost () {
    composer.addPass(new EffectComposer.RenderPass(scene, camera));

    var pass = new EffectComposer.ShaderPass(SSAOShader);
    pass.material.precision = 'highp';
    composer.addPass(pass);
    pass.uniforms.tDepth.value = composer.initialRenderTarget.depthTexture;
    pass.uniforms.cameraNear.value = camera.near;
    pass.uniforms.cameraFar.value = camera.far;

    composer.addPass(new EffectComposer.ShaderPass(FXAA()));
    composer.addPass(new BloomPass(scene, camera));

    composer.passes[composer.passes.length - 1].renderToScreen = true;
  }

  function updateControls () {
    const aspect = app.width / app.height;

    // update camera controls
    controls.update();
    camera.position.fromArray(controls.position);
    camera.up.fromArray(controls.up);
    target.fromArray(controls.direction).add(camera.position);
    camera.lookAt(target);

    // Update camera matrices
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  function render () {
    if (composer.passes.length >= 2) composer.render();
    else renderer.render(scene, camera);
  }

  function resize () {
    const dpr = renderer.getPixelRatio();
    let width = window.innerWidth;
    let height = window.innerHeight;
    const clampSize = false;
    if (clampSize) {
      const maxWidth = 720;
      const maxHeight = maxWidth / 1.6;
      if (width > maxWidth) {
        width = Math.min(maxWidth, width);
      }
      if (height > maxHeight) {
        height = Math.min(maxHeight, height);
      }
    }

    canvas.style.left = `${Math.floor((window.innerWidth - width) / 2)}px`;
    canvas.style.top = `${Math.floor((window.innerHeight - height) / 2)}px`;
    canvas.style.position = 'absolute';

    app.width = width;
    app.height = height;
    renderer.setSize(width, height);

    composer.passes.forEach(pass => {
      if (pass.uniforms && pass.uniforms.resolution) {
        pass.uniforms.resolution.value.set(width * dpr, height * dpr);
      }
    });

    renderTargets.forEach(t => {
      t.setSize(width * dpr, height * dpr);
    });

    updateControls();
  }

  function createComposer () {
    const createTarget = () => {
      const rt = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
      rt.texture.minFilter = THREE.NearestFilter;
      rt.texture.magFilter = THREE.NearestFilter;
      rt.texture.generateMipmaps = false;
      rt.texture.format = THREE.RGBFormat;
      return rt;
    };
    const rt1 = createTarget();
    const rt2 = createTarget();
    const rtInitial = createTarget();
    rtInitial.depthTexture = new THREE.DepthTexture();
    return new EffectComposer(renderer, rt1, rt2, rtInitial);
  }
}
