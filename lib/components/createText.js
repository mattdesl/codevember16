const loadBMFont = require('load-bmfont');
const createTextGeometry = require('three-bmfont-text');
const MSDFShader = require('three-bmfont-text/shaders/msdf');
const runParallel = require('run-parallel');

module.exports = function (app, text, cb) {
  const object3d = new THREE.Object3D();

  runParallel({
    texture: (next) => {
      new THREE.TextureLoader().load('assets/fonts/ProximaNova.png', tex => {
        next(null, tex);
      }, () => {}, () => {
        next(new Error('could not load text'));
      });
    },
    font: (next) => loadBMFont('assets/fonts/ProximaNova.fnt', next)
  }, (err, results) => {
    if (err) throw err;
    // const material = new THREE.MeshBasicMaterial({
    //   color: 'red',
    //   side: THREE.DoubleSide
    // });
    const material = new THREE.RawShaderMaterial(MSDFShader({
      map: results.texture,
      transparent: true,
      opacity: 0.15,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide
    }));
    const geometry = createTextGeometry({
      font: results.font,
      align: 'center',
      text
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.position.x -= geometry.layout.width / 2;
    mesh.position.y += geometry.layout.height / 2;

    const anchor = new THREE.Object3D();
    anchor.add(mesh);
    const scale = 0.05;
    anchor.rotation.y = Math.PI / 2;
    anchor.scale.set(scale, -scale, scale);

    object3d.add(anchor);
  });

  return {
    object3d,
    update (dt) {
      
    }
  }
};