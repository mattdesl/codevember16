const glslify = require('glslify');
const path = require('path');

// This is the original source, we will copy + paste it for our own GLSL
const vertexShader = THREE.ShaderChunk.meshphysical_vert;
// const fragmentShader = THREE.ShaderChunk.meshphysical_frag;

// Our custom shaders
const fragmentShader = glslify(path.resolve(__dirname, 'standard.frag'));
// const vertexShader = glslify(path.resolve(__dirname, 'standard.vert'));

module.exports = MeshCustomMaterial;
function MeshCustomMaterial (parameters) {
  THREE.MeshStandardMaterial.call( this );
  this.uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.common,
    THREE.UniformsLib.aomap,
    THREE.UniformsLib.lightmap,
    THREE.UniformsLib.emissivemap,
    THREE.UniformsLib.bumpmap,
    THREE.UniformsLib.normalmap,
    THREE.UniformsLib.displacementmap,
    THREE.UniformsLib.roughnessmap,
    THREE.UniformsLib.metalnessmap,
    THREE.UniformsLib.fog,
    THREE.UniformsLib.lights,
    {
      emissive : { value: new THREE.Color( 0x000000 ) },
      roughness: { value: 0.5 },
      metalness: { value: 0 },
      time: { value: 0 },
      audioStrength: { value: 0 },
      audioData: { value: new THREE.Texture() },
      color1: { value: new THREE.Color('white') },
      color2: { value: new THREE.Color('white') },
      animate: { value: 0 },
      envMapIntensity : { value: 1 }, // temporary
    }
  ]);
  setFlags(this);
  this.setValues(parameters);
}

MeshCustomMaterial.prototype = Object.create( THREE.MeshStandardMaterial.prototype );
MeshCustomMaterial.prototype.constructor = MeshCustomMaterial;
MeshCustomMaterial.prototype.isMeshStandardMaterial = true;

MeshCustomMaterial.prototype.copy = function ( source ) {
  THREE.MeshStandardMaterial.prototype.copy.call( this, source );
  this.uniforms = THREE.UniformsUtils.clone(source.uniforms);
  setFlags(this);
  return this;
};

function setFlags (material) {
  material.vertexShader = vertexShader;
  material.fragmentShader = fragmentShader;
  material.type = 'MeshCustomMaterial';
}