
function smoothGeometry (geometry, shapeVertexCount, isClosed) {
  geometry.computeVertexNormals();
  // geometry.mergeVertices()

  // gather map of VertexIndex -> VertexNormal
  const vertexIndexToNormal = newArray(geometry.vertices.length);
  geometry.faces.forEach(face => {
    const { a, b, c } = face;
    const cells = [ a, b, c ];
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const vertexNormal = face.vertexNormals[i];
      vertexIndexToNormal[cell] = vertexNormal;
    }
  });

  // compute vertex normals
  // then go through each vertex
  // and find its neighbouring vertices
  // and then lookup the vertex normal for that vertex

  const vertices = geometry.vertices;
  if (vertices.length % shapeVertexCount !== 0) {
    throw new Error('Malformed geometry; expected even number of vertices');
  }
  const setCount = vertices.length / shapeVertexCount;

  // find the cap that defines the shape
  const startCap = geometry.vertices.slice(0, shapeVertexCount);
  startCap.push(startCap[0]); // close path

  // if groups are specified they determine the smoothing form one
  // edge of the path to the next
  // otherwise we assume each edge needs its own smoothing (like a star)
  // but normals along the curve are smoothed regardless

  const positionArray = [];
  const normalArray = [];
  const colorArray = [];
  const tmpColor = new THREE.Color();
  const groupColors = ['white', 'blue', 'green', 'orange', 'pink', 'yellow'];
  geometry.faces.forEach((face, faceIndex) => {
    const startCap = shapeVertexCount - 3;
    const endCap = startCap * 2 + 1;
    const isCap = faceIndex <= endCap;
    let faceNormal = face.normal;
    if (isCap) {
      const firstVertex = getVertex(0, 0, 0);
      const nextVertex = getVertex(0, 1, 0);
      faceNormal = new THREE.Vector3(0, 1, 0);
    // faceNormal = nextVertex.clone().sub(firstVertex).normalize()
    }

    const { a, b, c } = face;
    const cells = [ a, b, c ];
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const vertex = vertices[cell];
      const vertexNormal = face.vertexNormals[i];
      positionArray.push(vertex.x, vertex.y, vertex.z);

      const normal = isCap ? faceNormal : vertexNormal;
      normalArray.push(normal.x, normal.y, normal.z);


      const arrow = new THREE.ArrowHelper(normal, vertex, 20, 0xff0000, 5, 10);
      app.scene.add(arrow);
      // getNormal(cell, normal)

      tmpColor.setStyle(groupColors[0 % groupColors.length]);
      colorArray.push(tmpColor.r, tmpColor.g, tmpColor.b);
    }
  });
  const positions = new Float32Array(positionArray);
  const normals = new Float32Array(normalArray);
  const colors = new Float32Array(colorArray);

  const smoothGeometry = new THREE.BufferGeometry();
  smoothGeometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
  smoothGeometry.addAttribute('normal', new THREE.BufferAttribute(normals, 3));
  smoothGeometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshStandardMaterial({
    color: 'hsl(150, 60%, 95%)',
    side: THREE.DoubleSide,
    roughness: 1,
    vertexColors: THREE.VertexColors,
    shading: THREE.SmoothShading,
  // wireframe: true
  });
  const mesh = new THREE.Mesh(smoothGeometry, material);
  app.scene.add(mesh);

  const worldVerts = startCap.map(v => {
    return mesh.localToWorld(v.clone());
  });
  // app.scene.add(createLine(worldVerts))

  // const point = new THREE.Mesh(
  //   new THREE.SphereGeometry(5, 64),
  //   new THREE.MeshBasicMaterial({
  //     color: 'red',
  //     depthTest: false,
  //     depthWrite: false
  //   })
  // )
  // let testIndex = 14
  // const testVert = vertices[newIndex].clone()
  // mesh.localToWorld(testVert)
  // point.position.copy(testVert)
  // app.scene.add(point)

  function computeGroup (cell) {
    let index = Math.floor(cell % shapeVertexCount);
    if (index % 2 !== 0) index++;
    return index / 2;
  }

  function getSmoothNormal (faceA) {
    const normal = faceA.normal.clone();
    for (let i = 0; i < geometry.faces.length; i++) {
      const faceB = geometry.faces[i];
      if (faceA === faceB) continue;
    }
    return normal;
  }

  function getNormal (cell, originalNormal) {
    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();

    const currentVertex = vertices[cell];
    const nextPathVertex = getVertex(cell, 1, 0);
    const previousPathVertex = getVertex(cell, -1, 0);

    tmpA.copy(originalNormal);


    // tmpA.copy(nextPathVertex).add(previousPathVertex).normalize()
    // tmpA.add(originalNormal).normalize()

    const arrow = new THREE.ArrowHelper(tmpA, vertices[cell], 20, 0xff0000, 5, 10);
    app.scene.add(arrow);

    return tmpA;
  }

  function getVertex (cell, setDirection, edgeDirection) {
    return vertices[getIndex(cell, setDirection, edgeDirection)];
  }

  function getIndex (cell, setDirection, edgeDirection) {
    // index to set info
    const edgeIndex = Math.floor(cell % shapeVertexCount);
    const setIndex = Math.floor(cell / shapeVertexCount);
    // console.log('Set: %d\nEdge: %d', setIndex, edgeIndex)

    // get next on edge
    let nextEdge = edgeIndex + edgeDirection;
    if (nextEdge < 0) nextEdge += shapeVertexCount;
    else if (nextEdge >= shapeVertexCount) nextEdge -= shapeVertexCount;

    // is on edge?
    const hasNextSet = setIndex < setCount - 1;
    const hasPreviousSet = setIndex > 0;
    // console.log('Has next: %s\nHas previous: %s', hasNextSet, hasPreviousSet)

    // get next set
    let nextSet = setIndex + setDirection;
    if (nextSet < 0) nextSet = isClosed ? (setCount - 1) : 0;
    else if (nextSet >= setCount) nextSet = isClosed ? 0 : (setCount - 1);
    // console.log('Next Set: %d\nNext Edge: %d', nextSet, nextEdge)

    // convert set & edge to index
    return nextSet * shapeVertexCount + nextEdge;
  }
}

function createLine (vertices) {
  const lineGeometry = new THREE.Geometry();
  vertices.forEach(v => lineGeometry.vertices.push(v));
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 'red',
    linewidth: 1,
    side: THREE.DoubleSide,
    depthTest: false,
  // depthWrite: false
  });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.frustumCulling = false;
  return line;
}

function fixNormals (geometry) {
  for ( var i = 0; i < geometry.faces.length; i++) {
    var face = geometry.faces[ i ];
    if (face.materialIndex == 1) {
      for ( var j = 0; j < face.vertexNormals.length; j++) {
        face.vertexNormals[ j ].z = 0;
        face.vertexNormals[ j ].normalize();
      }
    }
  }
}