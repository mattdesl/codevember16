attribute vec4 position;
attribute vec2 uv;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float time;
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

#pragma glslify: noise = require('glsl-noise/simplex/4d');
#pragma glslify: PI = require('glsl-pi');

vec4 randomQuaternion (float u1, float u2, float u3) {
  float sq1 = sqrt(1.0 - u1);
  float sq2 = sqrt(u1);

  float theta1 = PI * 2.0 * u2;
  float theta2 = PI * 2.0 * u3;

  float x = sin(theta1) * sq1;
  float y = cos(theta1) * sq1;
  float z = sin(theta2) * sq2;
  float w = cos(theta2) * sq2;
  return vec4(x, y, z, w);
}

vec3 randomSphere (float scale, float n1, float n2) {
  float r = n1 * 2.0 * PI;
  float z = n2 * 2.0 - 1.0;
  float zScale = sqrt(1.0 - z * z) * scale;
  float tx = cos(r) * zScale;
  float ty = sin(r) * zScale;
  float tz = z * scale;
  return vec3(tx, ty, tz);
}

//rotate vector
vec3 qrot(vec4 q, vec3 v)   {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

void main() {
  vUv = uv;

  vec3 tPosition = position.xyz;

  // float sf1 = 5.0;
  // float sf2 = 0.5;
  // float scale = 1.0;
  // float sn1 = (noise(vec4(position.xyz * sf1, time * 0.15)) * 0.5 + 0.5);
  // float sn2 = 0.5;//noise(vec4(position.xyz * sf2, time * 0.5)) * 0.5 + 0.5;
  // tPosition += randomSphere(scale, sn1, sn2);

  // float f1 = 0.5;
  // float f2 = 0.15;
  // float f3 = 0.25;
  // float n1 = noise(vec4(position.xyz * f1, time * 0.15)) * 0.5 + 0.5;
  // float n2 = noise(vec4(position.xyz * f2, time * 0.15)) * 0.5 + 0.5;
  // float n3 = noise(vec4(position.xyz * f3, time * 0.15)) * 0.5 + 0.5;
  // vec4 quat = randomQuaternion(n1, n2, n3);
  // tPosition = qrot(quat, tPosition);
  // tPosition += noise(quat);

  vPosition = tPosition.xyz;
  vNormal = normalize(tPosition);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(tPosition, 1.0);
}
