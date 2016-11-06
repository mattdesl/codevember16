const getShadowPlane = require('../getShadowPlane');
const palettes = require('nice-color-palettes');

module.exports = function (app) {
  let time = 0;
  let meshes = [];

  const object3d = new THREE.Object3D();

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(2048, 2048);
  directionalLight.shadow.camera.left = -3;
  directionalLight.shadow.camera.right = 3;
  directionalLight.shadow.camera.top = 5;
  directionalLight.shadow.camera.bottom = -5;
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.radius = 1;
  createScene();

  return {
    object3d,
    update
  };

  function update (dt) {
    time += dt / 1000;
    const radius = 4;
    const orbitSpeed = 0.025;
    const x = Math.cos(time * orbitSpeed) * radius;
    const z = Math.sin(time * orbitSpeed) * radius;
    directionalLight.position.set(x, 5, z);
    meshes.forEach((m, i) => {
      m.rotation.z += 0.00185 * (1);
    });
  }

  function createPBRMaterial (cb) {
    const standard = new THREE.MeshStandardMaterial({
      map: null,
      metalness: 0.0,
      roughness: 1,
      color: 'hsl(150, 60%, 95%)',
      side: THREE.DoubleSide,
      vertexColors: THREE.NoColors,
      shading: THREE.FlatShading
    });
    var rgbmUrls = genCubeUrls('assets/textures/pisaRGBM16/', '.png');
    new THREE.CubeTextureLoader().load(rgbmUrls, function (rgbmCubeMap) {
      rgbmCubeMap.encoding = THREE.RGBM16Encoding;
      var pmremGenerator = new THREE.PMREMGenerator(rgbmCubeMap);
      pmremGenerator.update(app.renderer);
      var pmremCubeUVPacker = new THREE.PMREMCubeUVPacker(pmremGenerator.cubeLods);
      pmremCubeUVPacker.update(app.renderer);
      const target = pmremCubeUVPacker.CubeUVRenderTarget;
      standard.envMap = target.texture;
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

  function createScene () {
    object3d.add(directionalLight);
    object3d.add(new THREE.AmbientLight('hsl(0, 0%, 5%)'));

    createPBRMaterial(material => {
      const floor = getShadowPlane();
      floor.scale.multiplyScalar(3000);
      object3d.add(floor);

      const colors = palettes[0];
      createAttractor(material, 0.1, 0, 0, 8, 1 / 3, 35, colors[0]);
      createAttractor(material, 0.1, 0, 0, 10, 4 / 8, 30, colors[1]);
      createAttractor(material, 0.1, 0, 0, 2, 3 / 8, 30, colors[2]);
      // createAttractor(material, 10, 0, 0, 2, 3 / 4, 25, colors[2]);
    });
  }

  function createAttractor (material, x, y, z, sigma, beta, rho, color) {
    // this bit is from ‏@grgrdvrt's demo: http://grgrdvrt.com/sketches/222_lorenz/
    var dt = 0.01;
    var nPts = 2000;
    var points = [];
    for (var i = 0; i < nPts; i++) {
      var xt = x + dt * sigma * (y - x);
      var yt = y + dt * (rho * x - y - x * z);
      var zt = z + dt * (x * y - beta * z);
      x = xt;
      y = yt;
      z = zt;
      points[i] = new THREE.Vector3(x, y, z);
    }

    const spline = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(spline, Math.floor(points.length / 2), 1.5, 4, spline.closed);

    material = material.clone();
    material.bumpMap = new THREE.TextureLoader().load('assets/textures/tex.jpg');
    material.bumpMap.wrapS = material.bumpMap.wrapT = THREE.RepeatWrapping;
    material.bumpMap.repeat.set(0.5, 0.5);
    material.bumpScale = 0.015;
    material.color.setStyle(color);
    material.needsUpdate = true;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.scale.multiplyScalar(0.05);
    mesh.position.y = 2.25;
    mesh.position.z = -2;
    object3d.add(mesh);
    meshes.push(mesh);
  }
};
