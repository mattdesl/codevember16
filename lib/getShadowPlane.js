const glslify = require('glslify');
const vertexShader = glslify(__dirname + '/shaders/ground-plane.vert');
const fragmentShader = glslify(__dirname + '/shaders/ground-plane.frag');

module.exports = function () {
  const geometry = new THREE.PlaneGeometry(1, 1, 1);
  geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
  const material = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    lights: true,
    uniforms: THREE.UniformsUtils.clone(THREE.ShaderLib.lambert.uniforms),
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: false
  });
  material.uniforms.opacity.value = 0.15;
  const planeMesh = new THREE.Mesh(geometry, material);
  planeMesh.receiveShadow = true;
  return planeMesh;
};
