const getShadowPlane = require('../getShadowPlane');
const palettes = require('nice-color-palettes');
const simplex = new (require('simplex-noise'))();
const newArray = require('new-array');
const VerletSystem = require('verlet-system/3d');
const VerletPoint = require('verlet-point/3d');
const VerletConstraint = require('verlet-constraint/3d');
const createPBRMaterial = require('./createPBRMaterial');

module.exports = function (app) {
  const subdivs = 10;
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
    gravity: [ 0, -2.5, 0 ],
    min: [ null, 0, null ]
  });
  solveInitial();

  createPBRMaterial(app, material => {
    material = material.clone();
    material.roughness = 0.75;
    material.metalness = 0.75;
    material.shading = THREE.SmoothShading;
    material.needsUpdate = true;
    material.bumpMap = new THREE.TextureLoader().load('assets/textures/fabric.jpg');
    material.map = new THREE.TextureLoader().load('assets/textures/pirate.png');
    material.bumpMap.wrapS = material.bumpMap.wrapT = THREE.RepeatWrapping;
    material.bumpMap.repeat.set(1, 1);
    material.bumpScale = 0.01;
    material.color.setStyle('white');
    material.wireframe = true;

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
    const aspect = 2;
    const yOff = 1;
    const scale = 2;
    const plane = new THREE.PlaneGeometry(aspect, 1, subdivs - 1, subdivs - 1);
    plane.applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI / 2));
    plane.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
    plane.applyMatrix(new THREE.Matrix4().makeScale(scale, scale, scale));
    plane.applyMatrix(new THREE.Matrix4().makeTranslation(0, yOff, 0));

    const bufferGeometry = new THREE.BufferGeometry();
    const vertices = plane.vertices;
    const allUvs = plane.faceVertexUvs[0];
    const newVertices = [];
    const newUvs = [];
    const verletPoints = [];
    plane.faces.forEach((face, i) => {
      const { a, b, c } = face;
      const cells = [ a, b, c ];
      const faceUvs = allUvs[i];
      const facePoints = [];
      cells.forEach((cell, cellIndex) => {
        const vert = vertices[cell];
        const uv = faceUvs[cellIndex];
        const point = VerletPoint({
          position: vert.toArray()
        });
        const row = Math.floor(cell / subdivs);
        const column = Math.floor(cell % subdivs);
        if (row === 0) {
          point.pinned = true;
          point.pinPosition = point.position.slice();
        }
        point.row = row;
        point.column = column;
        facePoints.push(point);
        verletPoints.push(point);
        newVertices.push(vert.x, vert.y, vert.z);
        newUvs.push(uv.x, uv.y);
      });
    });
    const vertArray = new Float32Array(newVertices);
    const uvArray = new Float32Array(newUvs);
    bufferGeometry.addAttribute('position', new THREE.BufferAttribute(vertArray, 3));
    bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(uvArray, 2));

    const constraints = [];
    const constraintOpts = { stiffness: 0.5 };
    for (let i = 0; i < Math.floor(verletPoints.length / 4); i++) {
      const topLeft = verletPoints[i * 4];
      const bottomRight = verletPoints[i * 4 + 4];
      constraints.push(VerletConstraint([ topLeft, bottomRight ], constraintOpts));
    }
    
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 64, 64),
      new THREE.MeshBasicMaterial({ color: 'red', depthTest: false, depthWrite: false })
    );
    sphere.position.fromArray(verletPoints[4].position)
    object3d.add(sphere);

    // for (let y = 0; y < subdivs; y++) {
    //   for (let x = 0; x < subdivs; x++) {
    //     const point = verletPoints[x + (y * subdivs)];
        // const constraintOpts = { stiffness: 1, restingDistance: undefined };
    //     if (x !== 0) {
    //       const xNeighbour = verletPoints[(x - 1) + (y * subdivs)];
    //       const xConstraint = VerletConstraint([ point, xNeighbour ], constraintOpts);
    //       constraints.push(xConstraint);
    //     }
    //     if (y !== 0) {
    //       const yNeighbour = verletPoints[x + ((y - 1) * subdivs)];
    //       const yConstraint = VerletConstraint([ point, yNeighbour ], constraintOpts);
    //       constraints.push(yConstraint);
    //     }
    //   }
    // }

    return {
      constraints,
      points: verletPoints,
      geometry: bufferGeometry
    };
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

  function integrate (dt, useWind = true) {
    const { constraints, points, geometry } = cloth;
    integrationTime += dt / 1000;

    // pin upper row
    points.forEach((point, i) => {
      const x = Math.floor(i % subdivs);
      const y = Math.floor(i / subdivs);

      if (point.pinned) {
        point.place(point.pinPosition);
      } else if (useWind) {
        const wind = Math.sin(integrationTime) * 0.5 + 0.5;
        let windComputed = wind * 0.0005;
        const windCurl = Math.sin(Math.cos(x * 0.25 + integrationTime * 4));
        const windCurlComputed = windCurl * 0.00025;
        const force = [ 0, windCurlComputed, 0 ];
        // point.addForce(force);
      }
    });

    constraints.forEach(c => c.solve());
    world.integrate(points, dt / 1000);
    const positionAttr = geometry.attributes.position;
    points.forEach((point, i) => {
      positionAttr.setXYZ(i, point.position[0], point.position[1], point.position[2]);
    });
    positionAttr.needsUpdate = true;
  }
};
