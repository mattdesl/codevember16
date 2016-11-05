var vIndex = ['a', 'b', 'c', 'd'];
var startIndex, endIndex, count, indexCount, compareIndex01, compareIndex02, compareEdge;
var edgeAlreadyProcessed = false;

function _sortAdjacentFaces (adjacentFacesArray) {
  for (var i = 0; i < adjacentFacesArray.length; i++) {
    _sort(adjacentFacesArray[i], i);
  }
}

function _sort (facesPerVertex, vertexIndex) {
  startIndex = vertexIndex;
  var edges = [];

  for (var i = 0; i < facesPerVertex.length; i++) {
    count = 3;
    // find endIndex
    for (var j = 0; j < count; j++) {
      if (facesPerVertex[edges.length].face[vIndex[j]] === startIndex) {
        endIndex = facesPerVertex[edges.length].face[vIndex[(j + 1) % count]];
      }
    }
    // console.log("endIndex: ", endIndex)

    // if there aren't any edges in here yet, just push!
    if (edges.length < 1) {
      edges.push(startIndex <= endIndex ? { edge: [startIndex, endIndex] } : { edge: [endIndex, startIndex] });
    } else {
      // else check if the edge is already in there! if it is, need to find new endIndex!
      for (var k = 0; k < edges.length; k++) {
        if (!((edges[k].edge[0] === startIndex && edges[k].edge[1] === endIndex) || (edges[k].edge[0] === endIndex && edges[k].edge[1] === startIndex))) {
          edgeAlreadyProcessed = false;
        } else {
          console.log('warning: edge already used');
          // at this point, one would have to get a new endIndex!!!
          edgeAlreadyProcessed = true;
          break;
        }
      }
      if (!edgeAlreadyProcessed) {
        edges.push(startIndex <= endIndex ? {edge: [startIndex, endIndex] } : {edge: [endIndex, startIndex] });
      }
    }

    outerLoop: for (j = edges.length; j < facesPerVertex.length; j++) {
      // check if face is face3 or face4 and adjust loop-length appropriately
      indexCount = 3;
      for (k = 0; k < indexCount; k++) {
        compareIndex01 = facesPerVertex[j].face[vIndex[k]];
        compareIndex02 = facesPerVertex[j].face[vIndex[(k + 1) % indexCount]];
        compareIndex01 <= compareIndex02 ? compareEdge = [compareIndex01, compareIndex02] : compareEdge = [compareIndex02, compareIndex01];
        if (compareEdge[0] === edges[edges.length - 1].edge[0] && compareEdge[1] === edges[edges.length - 1].edge[1]) {
          // only swap if those 2 array elements do not follow each other in the array!
          if (j !== edges.length) {
            _swap(facesPerVertex, j, edges.length);
            break outerLoop;
          }
        }
      }
    }
  }
}

function _swap (array, index, startIndex) {
  // console.log("swap! ", index, startIndex)
  var temp = array[index];
  array[index] = array[startIndex];
  array[startIndex] = temp;
}

// calculates the average vector for one smoothing group by taking all non-normalized face normals (which are thereby area-weighted!) and just add them together.
// in the end, check if there are two smoothing groups that belong together, if so, add their vectors together and write them back on both averageVector attributes of the 2 smoothing groups
function _calculateVectorSumsForSmoothingGroups (connectedFaces, geometry) {
  var smoothingGroupVectorSums = {};
  var smoothingGroup;

  for (var i = 0; i < connectedFaces.length; i++) {
    // assign smoothing group ID by using only the first value of the array (in case it has more than 1 value)
    // in practice, as we where going "around the vertex", only the first/last face can have 2 smoothing groups
    smoothingGroup = connectedFaces[i].smoothingGroup[0];

    // if the groupID does not exist, use the newly calculated face normal as a start
    if (!smoothingGroupVectorSums[smoothingGroup]) {
      smoothingGroupVectorSums[smoothingGroup] = {averageVec: _calculateFaceNormal(connectedFaces[i].face, geometry)};
    } else {
      // check if groupID already used. if it is, instead of adding a new groupID entry, just add the un normalized face-normal
      smoothingGroupVectorSums[smoothingGroup].averageVec.add(_calculateFaceNormal(connectedFaces[i].face, geometry));
    }
  }

  // combine 2 smoothing groups if necessary
  if (connectedFaces[0].smoothingGroup.length === 2) {
    var group1 = smoothingGroupVectorSums[connectedFaces[0].smoothingGroup[0]];
    var group2 = smoothingGroupVectorSums[connectedFaces[0].smoothingGroup[1]];

    var combinedVec = new THREE.Vector3().addVectors(group1.averageVec, group2.averageVec);

    // now both groups use the combined result
    group1.averageVec.copy(combinedVec);
    group2.averageVec.copy(combinedVec);
  }
  // console.log("sums: " ,smoothingGroupVectorSums)
  return smoothingGroupVectorSums;
}

function _calculateFaceNormal (face, geometry) {
  // no normalization in this function as these are weighted normals
  var vA, vB, vC, vD;
  var cb = new THREE.Vector3(), ab = new THREE.Vector3(),
    db = new THREE.Vector3(), dc = new THREE.Vector3(), bc = new THREE.Vector3();

  vA = geometry.vertices[ face.a ];
  vB = geometry.vertices[ face.b ];
  vC = geometry.vertices[ face.c ];

  cb.subVectors(vC, vB);
  ab.subVectors(vA, vB);
  cb.cross(ab);
  return cb;
}

module.exports = computeSmoothNormals;
function computeSmoothNormals (geometry, angleRadians) {
  geometry.computeFaceNormals();

  // reset vertex normals to zero-vectors
  for (var i = 0; i < geometry.faces.length; i++) {
    geometry.faces[i].vertexNormals.length = 0;
    geometry.faces[i].vertexNormals.push(new THREE.Vector3());
    geometry.faces[i].vertexNormals.push(new THREE.Vector3());
    geometry.faces[i].vertexNormals.push(new THREE.Vector3());
  }

  // save face index per vertex index
  var adjacentNormals = [];
  var vN;

  for (var v = 0; v < geometry.vertices.length; v++) {
    for (var f = 0; f < geometry.faces.length; f++) {
      // this is needed for correct indexing of the given vertex with its vertexNormal.
      if (geometry.faces[f].a === v) {
        vN = geometry.faces[f].vertexNormals[0];
      } else if (geometry.faces[f].b === v) {
        vN = geometry.faces[f].vertexNormals[1];
      } else if (geometry.faces[f].c === v) {
        vN = geometry.faces[f].vertexNormals[2];
      } else if (geometry.faces[f].d === v) {
        vN = geometry.faces[f].vertexNormals[3];
      } else {
        vN = null;
      }
      if (vN !== null) {
        adjacentNormals[v] = adjacentNormals[v] || [];
        adjacentNormals[v].push({face: geometry.faces[f], vertexNormal: vN, smoothingGroup: []});
      }
    }
  }
  // sort faces in "adjacentNormals' because the face-objects are not sorted in an adjacent way, meaning that when going around 1 vertex by iterating through those faces
  // one does not know if face[i] and face[i+1] are adjacent in the array.
  _sortAdjacentFaces(adjacentNormals);

  // recalculate vertex normals
  var adjacentFaceNormal01 = new THREE.Vector3();
  var adjacentFaceNormal02 = new THREE.Vector3();
  var dotProduct;
  var angleBetweenFacesRad;
  var smoothing;
  var smoothingGroupID = 0;

  var normal, smoothingGroup;

  for (v = 0; v < geometry.vertices.length; v++) {
    // for all faces the vertex is connected to
    for (i = 0; i < adjacentNormals[v].length; i++) {
      // compare two adjacent faces (i) and (i+19 that are connected by the specified vertex v
      adjacentFaceNormal01.copy(adjacentNormals[v][i].face.normal);
      adjacentFaceNormal02.copy(adjacentNormals[v][(i + 1) % adjacentNormals[v].length].face.normal);
      // calculate the dot product of the two face normals
      dotProduct = adjacentNormals[v][i].face.normal.dot(adjacentFaceNormal02);

      // now calculate the angle between those 2 faces using the dot Product and the face normal length/ norm of the vector
      // result is in radian measure
      angleBetweenFacesRad = Math.acos(dotProduct / (adjacentFaceNormal01.length() * adjacentFaceNormal02.length()));

      if (angleBetweenFacesRad <= angleRadians) {
        // console.log("angle:", _radToDeg(angleBetweenFacesRad)  + "    " ,i, (i+1)%adjacentNormals[v].length)
        smoothing = true;

        // if there are any smoothing groups, one will have to check if the array already contains the to be added groupID
        if (adjacentNormals[v][i].smoothingGroup.length > 0) {
          for (var k = 0; k < adjacentNormals[v][i].smoothingGroup.length; k++) {
            if (adjacentNormals[v][i].smoothingGroup[k] !== smoothingGroupID) {
              adjacentNormals[v][i].smoothingGroup.push(smoothingGroupID);
              break;
            }
          }
        } else {
          // else , smoothing group is still empty so just push the ID in
          adjacentNormals[v][i].smoothingGroup.push(smoothingGroupID);
        }
        // same for the next (i+1) face in the array...
        if (adjacentNormals[v][(i + 1) % adjacentNormals[v].length].smoothingGroup.length > 0) {
          for (k = 0; k < adjacentNormals[v][(i + 1) % adjacentNormals[v].length].smoothingGroup.length; k++) {
            if (adjacentNormals[v][(i + 1) % adjacentNormals[v].length].smoothingGroup[k] !== smoothingGroupID) {
              adjacentNormals[v][(i + 1) % adjacentNormals[v].length].smoothingGroup.push(smoothingGroupID);
              break;
            }
          }
        } else {
          adjacentNormals[v][(i + 1) % adjacentNormals[v].length].smoothingGroup.push(smoothingGroupID);
        }
      } else {
        // if the angle is larger than specified, there is a hard edge between the 2 checked faces and therefore, increment smoothing group ID
        // and use the existing face normal as the vertex normal
        smoothingGroupID++;
        adjacentNormals[v][i].vertexNormal.add(adjacentNormals[v][i].face.normal);
        adjacentNormals[v][(i + 1) % adjacentNormals[v].length].vertexNormal.add(adjacentNormals[v][(i + 1) % adjacentNormals[v].length].face.normal);
      }
    }
    // console.log("counttest ", countTest)
    // console.log(adjacentNormals[v])

    // average vertexNormals based on smoothingGroupIDs
    // only loop if anything got smoothed at all
    if (smoothing) {
      var groupIDNormals = _calculateVectorSumsForSmoothingGroups(adjacentNormals[v], geometry);

      for (k = 0; k < adjacentNormals[v].length; k++) {
        normal = adjacentNormals[v][k];
        smoothingGroup = normal.smoothingGroup[0];
        if (smoothingGroup !== undefined) {
          var groupNormal = groupIDNormals[smoothingGroup];
          normal.vertexNormal.copy(groupNormal.averageVec);
        }
      }
    }

    // reset values per vertex.
    // this also means that smoothingGroupIDs are local to their vertex with its connected faces.
    smoothing = false;
    smoothingGroupID = 0;
  }

  // if everything is calculated, last but not least normalize all vertex normals to have unit- vectors
  for (i = 0; i < geometry.faces.length; i++) {
    for (var j = 0; j < geometry.faces[i].vertexNormals.length; j++) {
      geometry.faces[i].vertexNormals[j].normalize();
    }
  }
}
