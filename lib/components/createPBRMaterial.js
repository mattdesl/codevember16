const MeshCustomMaterial = require('../shaders/MeshCustomMaterial');

module.exports = createPBRMaterial;
function createPBRMaterial (app, cb) {
  var rgbmUrls = genCubeUrls('assets/textures/pisaRGBM16/', '.png');
  new THREE.CubeTextureLoader().load(rgbmUrls, function (rgbmCubeMap) {
    rgbmCubeMap.encoding = THREE.RGBM16Encoding;
    var pmremGenerator = new THREE.PMREMGenerator(rgbmCubeMap);
    pmremGenerator.update(app.renderer);
    var pmremCubeUVPacker = new THREE.PMREMCubeUVPacker(pmremGenerator.cubeLods);
    pmremCubeUVPacker.update(app.renderer);
    const target = pmremCubeUVPacker.CubeUVRenderTarget;
    
    const standard = new MeshCustomMaterial({
      envMap: target.texture,
      side: THREE.DoubleSide,
      vertexColors: THREE.NoColors,
      shading: THREE.SmoothShading
    });
    standard.needsUpdate = true;
    cb(standard);
  });
}

function genCubeUrls (prefix, postfix) {
  return [
    prefix + 'px' + postfix, prefix + 'nx' + postfix,
    prefix + 'py' + postfix, prefix + 'ny' + postfix,
    prefix + 'pz' + postfix, prefix + 'nz' + postfix
  ];
}
