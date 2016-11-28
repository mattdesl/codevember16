#define PHYSICAL

varying vec3 vViewPosition;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec4 vQuat;
varying vec2 vTexCoord;
uniform float time;
uniform float chaos;

#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

#pragma glslify: noise = require('glsl-noise/simplex/4d');
#pragma glslify: ease1 = require('glsl-easings/linear');
#pragma glslify: ease2 = require('glsl-easings/linear');
#define PI 3.14159265359

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

  #include <uv_vertex>
  #include <uv2_vertex>
  #include <color_vertex>

  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>

#ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED

  vNormal = normalize( transformedNormal );

#endif

  #include <begin_vertex>
  #include <displacementmap_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>

  
  float sinNorm = (sin(time) * 0.5 + 0.5);

  float sf1 = mix(0.0, 1.5, ease1((sin(time) * 0.5 + 0.5)));
  float sf2 = sinNorm * 0.5;
  float scale = 1.0;
  float sn1 = (noise(vec4(position.xyz * sf1, time * 0.15)) * 0.5 + 0.5);
  float sn2 = (noise(vec4(position.xyz * sf2, time * 0.5)) * 0.5 + 0.5);
  vec3 original = transformed;
  transformed += randomSphere(scale, sn1, sn2) * 1.0;

  float f1 = (sin(cos(time)) * 0.5 + 0.5) * 1.0;
  float f2 = sinNorm * 0.05;
  float f3 = sinNorm * 0.05;
  float n1 = noise(vec4(transformed.xyz * f1, time * 0.15)) * 0.5 + 0.5;
  float n2 = noise(vec4(transformed.xyz * f2, time * 0.15)) * 0.5 + 0.5;
  float n3 = noise(vec4(transformed.xyz * f3, time * 0.15)) * 0.5 + 0.5;
  vec4 quat = randomQuaternion(n1, n2, n3);
  vQuat = quat;
  transformed = qrot(quat, transformed);
  transformed = mix(original, transformed, chaos);
  vNormal = normalize(transformed.xyz);
  vPosition = transformed;
  vTexCoord = uv;

  #include <project_vertex>
  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>

  vViewPosition = - mvPosition.xyz;

  #include <worldpos_vertex>
  #include <shadowmap_vertex>

}
