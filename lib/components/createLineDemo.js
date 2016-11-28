const glslify = require('glslify');
const createPBRMap = require('./createPBRMaterial').createPBRMap;
const LineMaterial = require('../shaders/LineMaterial');
const tweenr = require('tweenr')();

module.exports = function (app) {
  const object3d = new THREE.Object3D();

  let time = 0.5;
  let material;
  const geometry = new THREE.IcosahedronGeometry(0.8, 7);

  createPBRMap(app, envMap => {
    material = new LineMaterial({
      roughness: 1,
      // wireframe: true,
      // wireframeLinewidth: 5,
      metalness: 1.0,
      // transparent: true,
      shading: THREE.FlatShading,
      envMap
    });
    material.map = new THREE.TextureLoader().load('assets/textures/p2.jpg', () => {
      material.needsUpdate = true;
    });
    material.map.repeat.set(1, 1);
    material.normalMap = new THREE.TextureLoader().load('assets/textures/normal.jpg', () => {
      material.needsUpdate = true;
    });
    material.normalMap.wrapS = material.normalMap.wrapT = THREE.RepeatWrapping;
    material.normalScale.multiplyScalar(0.25);

    const mesh = new THREE.Mesh(geometry, material);
    object3d.add(mesh);
    mesh.frustumCulled = false;

    material.uniforms.chaos.value = 1;
    // tweenr.to(material.uniforms.chaos, {
    //   value: 1,
    //   duration: 5,
    //   ease: 'quadOut'
    // });
    
  });

  return {
    object3d,
    update
  };

  function update (dt) {
    time += dt / 1000;
    if (material) {
      material.uniforms.time.value = time;
    }
  }
};
