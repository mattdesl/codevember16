const getShadowPlane = require('../getShadowPlane');
const palettes = require('nice-color-palettes');
const simplex = new (require('simplex-noise'))();
const newArray = require('new-array');
const VerletSystem = require('verlet-system/3d');
const VerletPoint = require('verlet-point/3d');
const VerletConstraint = require('verlet-constraint/3d');
const createPBRMaterial = require('./createPBRMaterial');
const lerp = require('lerp');
const createBackground = require('three-vignette-background');
const randomFloat = require('random-float');
const now = require('right-now');
const analyserFrequencyAverage = require('analyser-frequency-average');
const smoothstep = require('smoothstep');
const isMobile = require('../isMobile');

module.exports = function (app, opt = {}) {
  const subdivs = isMobile ? 40 : 50;
  let integrationTime = 0;
  let rate = 0;
  let material;

  app.renderer.shadowMap.renderReverseSided = false;
  app.renderer.shadowMap.renderSingleSided = false;

  let frequencyTexture;
  const analyser = opt.analyser;
  const frequencies = opt.frequencies;
  if (frequencies) {
    frequencyTexture = new THREE.DataTexture(frequencies, frequencies.length, 1, THREE.LuminanceFormat, THREE.UnsignedByteType);
    frequencyTexture.minFilter = THREE.LinearFilter;
    frequencyTexture.magFilter = THREE.LinearFilter;
    frequencyTexture.generateMipmaps = false;
  }

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

  // const floor = getShadowPlane();
  // floor.scale.multiplyScalar(3000);
  // object3d.add(floor);

  // const lineGeometry = new THREE.Geometry();
  // for (let i = 0; i < subdivs; i++) {
  //   const x = (i / subdivs * 2 - 1) * 4;
  //   lineGeometry.vertices.push(new THREE.Vector3(x, 0, 0));
  // }

  const cloth = createClothBody();

  const world = VerletSystem({
    gravity: [ 0, -2.5, 0 ],
    min: [ null, 0, null ],
    // friction: 0.75
  });

  createPBRMaterial(app, newMaterial => {
    material = newMaterial.clone();
    material.roughness = 1;
    material.uniforms.animate.value = rate;
    material.uniforms.audioData.value = frequencyTexture;
    material.side = THREE.DoubleSide;
    material.metalness = 0.5;
    material.uniforms.color1.value.setStyle(opt.colors[3]);
    material.uniforms.color2.value.setStyle(opt.colors[4]);
    // material.opacity = 0.5;
    // material.depthTest = false;
    // material.depthWrite = false;
    // material.transparent = true;
    material.shading = THREE.SmoothShading;
    material.needsUpdate = true;
    material.roughnessMap = new THREE.TextureLoader().load('assets/textures/pirate.png');
    material.roughnessMap.generateMipmaps = false;
    material.roughnessMap.minFilter = THREE.LinearFilter;

    material.bumpMap = new THREE.TextureLoader().load('assets/textures/fabric.jpg');
    material.bumpMap.repeat.set(40, 40);
    material.bumpScale = 0.02;
    material.color.setStyle(opt.colors[0]);
    // material.wireframe = true;

    const maps = [
      material.bumpMap
    ].filter(Boolean);
    maps.forEach(map => {
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
    });

    const planeMesh = new THREE.Mesh(cloth.geometry, material);
    if (!isMobile) {
      planeMesh.castShadow = true;
      planeMesh.receiveShadow = true;
    }
    object3d.add(planeMesh);

    // const lineMaterial = new THREE.LineBasicMaterial({
    //   color: 'white',
    //   // depthTest: false,
    //   // depthWrite: false,
    //   side: THREE.DoubleSide,
    //   linewidth: 10
    // });
    // const lineMesh = new THREE.Line(lineGeometry, lineMaterial);
    // object3d.add(lineMesh);
    // lineMesh.frustumCulled = false;
  });

  // solve initial gust of wind
  for (let i = 0; i < 150; i++) {
    integrate(1 / 60);
  }

  return {
    object3d,
    setRate,
    update
  };

  function setRate (newRate) {
    rate = newRate;
    if (material) {
      material.uniforms.animate.value = rate;
    }
  }

  function createClothBody () {
    const aspect = 1;
    const yOff = isMobile ? 2 : 2.45;
    const scale = 2;
    const plane = new THREE.PlaneBufferGeometry(1, 0.5, subdivs - 1, subdivs - 1);
    plane.applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI / 2));
    // plane.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    plane.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
    plane.applyMatrix(new THREE.Matrix4().makeScale(scale, scale, scale));
    plane.applyMatrix(new THREE.Matrix4().makeTranslation(0, yOff, 0));
    plane.computeBoundingBox();

    const positions = plane.attributes.position.array;
    const verletPoints = [];
    for (let i = 0; i < positions.length / 3; i++) {
      const x = Math.floor(i % subdivs);
      const y = Math.floor(i / subdivs);
      let newPosition = [
        positions[i * 3 + 0],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      ];

      // a bit of tension and randomness
      const s = 0.2;
      newPosition[2] += 0.015 * simplex.noise2D(x * s, y * s);
      newPosition[0] += 0.015 * simplex.noise2D(x * s, y * s);
      
      const p = VerletPoint({
        mass: 1,
        position: newPosition
      });

      // an initial gust of wind
      const t = (x / (subdivs - 1));
      const angle = Math.PI * 2 * t * Math.random() * 2;
      const radius = 0.01;
      const rx = Math.cos(angle) * radius;
      const rz = Math.sin(angle) * radius;
      p.addForce([ rz, 0, rx ]);

      const pointOff = 2;
      if (y === 0 && (x < pointOff || x > (subdivs - 1 - pointOff))) {
        p.pinned = true;
        p.pinPosition = [ p.position[0], p.position[1], p.position[2] ];
      }
      verletPoints.push(p);
    }

    // const lineConstraints = [];
    // const linePoints = [];
    // const minZ = plane.boundingBox.min.z;
    // const maxY = plane.boundingBox.max.y;
    // const maxZ = plane.boundingBox.max.z;
    // for (let x = 0; x < subdivs; x++) {
    //   const t = x / (subdivs - 1);
    //   const p = VerletPoint({
    //     mass: 0.5,
    //     position: [
    //       0,
    //       maxY,
    //       lerp(minZ, maxZ, t)
    //     ]
    //   });
    //   linePoints.push(p);
    //   if (x === 0 || x === (subdivs - 1)) {
    //     p.pinned = true;
    //     p.place([ p.position[0], p.position[1], p.position[2] * 1.25 ]);
    //     p.pinPosition = [ p.position[0], p.position[1], p.position[2] ];
    //   }
    // }

    // linePoints.forEach((p, x) => {
    //   const opts = { stiffness: 1 };
    //   if (x !== 0) {
    //     const previous = linePoints[x - 1];
    //     lineConstraints.push(VerletConstraint([ p, previous ], opts));
    //   }
    // });

    const constraints = [];
    for (let y = 0; y < subdivs; y++) {
      for (let x = 0; x < subdivs; x++) {
        const point = verletPoints[x + (y * subdivs)];
        const constraintOpts = { stiffness: computeStiffness(x, y), restingDistance: undefined };
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

        // attach to line
        // const lineConstraintOpts = { stiffness: 1, restingDistance: undefined };
        // if (y === 0) {
        //   const linePoint = linePoints[(subdivs - x - 1)];
        //   const lineConstraint = VerletConstraint([ point, linePoint ], lineConstraintOpts);
        //   lineConstraints.push(lineConstraint);
        // }
      }
    }

    // lineConstraints.forEach(c => constraints.push(c));

    return {
      constraints,
      clothPoints: verletPoints,
      // linePoints: linePoints,
      points: verletPoints,//.concat(linePoints),
      geometry: plane
    };
  }

  function computeStiffness (x, y) {
    const t = Math.sin(x * 0.75) * 0.5 + 0.5;
    // const s = 0.5;
    // const t = simplex.noise2D(x * s, y * s) * 0.5 + 0.5;
    // return lerp(0.9998, 0.9999, t);
    return 1;
  }
  

  function update (dt) {
    integrate(1 / 60);

    if (material && frequencies) {
      const bass = analyserFrequencyAverage(analyser, frequencies, 20, 180);
      material.uniforms.audioStrength.value = smoothstep(0.5, 1, bass);
      frequencyTexture.needsUpdate = true;
    }

    const geometry = cloth.geometry;
    geometry.computeVertexNormals();
  }

  function integrate (dt) {
    const { constraints, clothPoints, linePoints, geometry, points } = cloth;
    integrationTime += dt;
    if (material) material.uniforms.time.value = integrationTime;

    // pin upper row
    points.forEach((point, i) => {
      const x = Math.floor(i % subdivs);
      const y = Math.floor(i / subdivs);

      const wind = Math.sin(y * 0.25 + integrationTime * 0.5) * 0.5 + 0.5;
      let windComputed = wind * 0.0005;
      const windCurl = Math.sin(Math.cos(x * 0.25 + integrationTime * 4));
      const windCurlComputed = windCurl * 0.00025;
      const windRate = lerp(0.5, 1.0, rate);
      const force = [ windComputed * windRate, windCurlComputed * windRate, 0 ];
      point.addForce(force);

      let noiseScale = 0.25;
      let noiseStrength = 0.0025;
      let nOff = 0;
      nOff += simplex.noise3D(x * noiseScale, y * noiseScale, integrationTime) * rate * noiseStrength;
      
      noiseScale = 2.5;
      noiseStrength = 0.0025;
      nOff += simplex.noise3D(x * noiseScale, y * noiseScale, integrationTime + 1000) * rate * noiseStrength;
      const t = (x / (subdivs - 1));
      const angle = Math.PI * 2 * t * 4;
      const spinRadius = rate * 0.01;
      const rx = Math.cos(angle) * spinRadius;
      const ry = Math.cos(angle) * spinRadius;
      point.addForce([ nOff, 0, 0 ]);

      if (point.pinned) {
        point.place(point.pinPosition);
      }
    });

    constraints.forEach(c => c.solve());
    world.integrate(points, dt);

    const positionAttr = geometry.attributes.position;
    clothPoints.forEach((point, i) => {
      positionAttr.setXYZ(i, point.position[0], point.position[1], point.position[2]);
    });
    positionAttr.needsUpdate = true;

    // linePoints.forEach((point, i) => {
    //   lineGeometry.vertices[i].fromArray(point.position);
    // });
    // lineGeometry.verticesNeedUpdate = true;
  }
};




      // const angleFraction = (x / (subdivs - 1));
      // const segments = 3;
      // const rAngle = (Math.round(angleFraction * segments) / segments) * Math.PI * 2;
      // const rRadius = 1;
      // const px = Math.cos(rAngle) * rRadius;
      // const py = ((1 - y / subdivs) * 2 - 1) + yOff + 0.5;
      // const pz = Math.sin(rAngle) * rRadius;
      // newPosition[0] = px;
      // newPosition[1] = py;
      // newPosition[2] = pz;
