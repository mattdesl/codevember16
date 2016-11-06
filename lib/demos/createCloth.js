const getShadowPlane = require('../getShadowPlane');
const palettes = require('nice-color-palettes');
const simplex = new (require('simplex-noise'))();
const newArray = require('new-array');
const VerletSystem = require('verlet-system/3d');
const VerletPoint = require('verlet-point/3d');
const VerletConstraint = require('verlet-constraint/3d');
const createPBRMaterial = require('./createPBRMaterial');
const lerp = require('lerp');
const randomFloat = require('random-float');

module.exports = function (app) {
  const subdivs = 30;
  let integrationTime = 0;

  app.renderer.shadowMap.renderReverseSided = false;

  const object3d = new THREE.Object3D();

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.castShadow = true;
  directionalLight.position.set(1, 5, 4);
  directionalLight.shadow.mapSize.set(2048, 2048);
  directionalLight.shadow.camera.left = -3;
  directionalLight.shadow.camera.right = 3;
  directionalLight.shadow.camera.top = 5;
  directionalLight.shadow.camera.bottom = -5;
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.radius = 2;
  object3d.add(directionalLight);
  object3d.add(new THREE.AmbientLight('hsl(0, 0%, 5%)'));

  const floor = getShadowPlane();
  floor.scale.multiplyScalar(3000);
  object3d.add(floor);

  const cloth = createClothBody();

  const world = VerletSystem({
    // gravity: [ 0, -2.5, 0 ],
    min: [ null, 0, null ]
  });
  // solveInitial();

  createPBRMaterial(app, material => {
    material = material.clone();
    material.roughness = 1;
    material.metalness = 0.5;
    // material.opacity = 0.5;
    // material.depthTest = false;
    // material.depthWrite = false;
    // material.transparent = true;
    material.shading = THREE.SmoothShading;
    material.needsUpdate = true;
    material.roughnessMap = new THREE.TextureLoader().load('assets/textures/pirate.png');
    material.metalnessMap = new THREE.TextureLoader().load('assets/textures/pirate_inv.png');
    material.bumpMap = new THREE.TextureLoader().load('assets/textures/fabric.jpg');
    material.bumpMap.wrapS = material.bumpMap.wrapT = THREE.RepeatWrapping;
    material.bumpMap.repeat.set(1., 1.);
    material.bumpScale = 0.02;
    material.color.setStyle('hsl(0, 0%, 9%)');
    // material.wireframe = true;

    const planeMesh = new THREE.Mesh(cloth.geometry, material);
    planeMesh.castShadow = true;
    planeMesh.receiveShadow = true;
    object3d.add(planeMesh);
  });

  return {
    object3d,
    update
  };

  function createClothBody () {
    const aspect = 1;
    const yOff = 1;
    const scale = 2;
    const plane = new THREE.PlaneBufferGeometry(aspect, 1, subdivs - 1, subdivs - 1);
    plane.applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI / 2));
    // plane.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    plane.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
    plane.applyMatrix(new THREE.Matrix4().makeScale(scale, scale, scale));
    plane.applyMatrix(new THREE.Matrix4().makeTranslation(0, yOff, 0));

    const positions = plane.attributes.position.array;
    const verletPoints = [];
    for (let i = 0; i < positions.length / 3; i++) {
      const x = Math.floor(i % subdivs);
      const y = Math.floor(i / subdivs);

      const p = VerletPoint({
        position: [
          positions[i * 3 + 0],
          positions[i * 3 + 1],
          positions[i * 3 + 2]
        ]
      });
      if (y === 0) {
        p.pinned = true;
        p.pinPosition = p.position.slice();
      }
      verletPoints.push(p);
    }

    const constraints = [];
    for (let y = 0; y < subdivs; y++) {
      for (let x = 0; x < subdivs; x++) {
        const point = verletPoints[x + (y * subdivs)];
        const constraintOpts = { stiffness: computeStiffness(x, y) };
        if (x !== 0) {
          const xNeighbour = verletPoints[(x - 1) + (y * subdivs)];
          const xConstraint = VerletConstraint([ point, xNeighbour ], constraintOpts);
          constraints.push(xConstraint);
        }
        if (y !== 0) {
          const yNeighbour = verletPoints[x + ((y - 1) * subdivs)];
          const yConstraint = VerletConstraint([ point, yNeighbour ], constraintOpts);
          constraints.push(yConstraint);
        }
      }
    }

    return {
      constraints,
      points: verletPoints,
      geometry: plane
    };
  }

  function computeStiffness (x, y) {
    const t = Math.sin(x * 0.5) * 0.5 + 0.5;
    // const s = 0.5;
    // const t = simplex.noise2D(x * s, y * s) * 0.5 + 0.5;
    return lerp(0.25, 0.999, t);
    
  }

  function solveInitial () {
    const iterations = 300;
    for (let i = 0; i < iterations; i++) {
      integrate(1000 / 60);
    }
  }

  function update (dt) {
    integrate(1000 / 60);
    const geometry = cloth.geometry;
    geometry.computeVertexNormals();
  }

  function integrate (dt) {
    const { constraints, points, geometry } = cloth;
    integrationTime += dt / 1000;

    // pin upper row
    points.forEach((point, i) => {
      const x = Math.floor(i % subdivs);
      const y = Math.floor(i / subdivs);

      // add upward gust
      // point.addForce([ 0, 0.0005, 0 ])

      const wind = Math.sin(y * 0.25 + integrationTime * 0.5) * 0.5 + 0.5;
      let windComputed = wind * 0.0005;
      const windCurl = Math.sin(Math.cos(x * 0.25 + integrationTime * 4));
      const windCurlComputed = windCurl * 0.00025;
      const force = [ windComputed, windCurlComputed, 0 ];
      point.addForce(force);

      if (point.pinned) {
        point.place(point.pinPosition);
      }
    });

    const iterations = 1;
    for (let i = 0; i < iterations; i++) {
      constraints.forEach(c => c.solve());
    }
    world.integrate(points, dt / 1000);
    const positionAttr = geometry.attributes.position;
    points.forEach((point, i) => {
      positionAttr.setXYZ(i, point.position[0], point.position[1], point.position[2]);
    });
    positionAttr.needsUpdate = true;
  }
};
