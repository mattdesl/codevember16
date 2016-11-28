#define PHYSICAL

uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;

uniform float time;
varying vec3 vNormal;
varying vec4 vQuat;
varying vec3 vPosition;

#pragma glslify: noise = require('glsl-noise/simplex/2d');
#pragma glslify: aastep = require('glsl-aastep');
#pragma glslify: luma = require('glsl-luma');

#ifndef STANDARD
  uniform float clearCoat;
  uniform float clearCoatRoughness;
#endif

uniform float envMapIntensity; // temporary

varying vec3 vViewPosition;

#include <common>
#include <packing>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <cube_uv_reflection_fragment>
#include <lights_pars>
#include <lights_physical_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

varying vec2 vTexCoord;

float pattern(float v, float repeats, float threshold) {
  float result = mod(v * repeats, 1.0);
  return step(threshold, result);
}

void main() {

  #include <clipping_planes_fragment>

  vec4 diffuseColor = vec4( diffuse, opacity );
  ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
  vec3 totalEmissiveRadiance = emissive;

  #include <logdepthbuf_fragment>
  #include <color_fragment>

  #include <alphamap_fragment>
  #include <alphatest_fragment>
  #include <specularmap_fragment>
  #include <roughnessmap_fragment>
  #include <metalnessmap_fragment>
  
  float frequency = 20.0;//mix(5.0, 150.0, (sin(time * 0.85) * 0.5 + 0.5));
  float amplitude = 1.0;
  float d = 0.0;
  #ifdef USE_MAP
    // vec4 texelColor = texture2D( map, vUv );
    // texelColor = mapTexelToLinear( texelColor );
    // d = texelColor.r;
  #else
    
  #endif
  // float t = sin(cos(time));
  // d = aastep(0.5, noise(vec2(vTexCoord.y * frequency + time, 1.0)) * 0.5 + 0.5);
  
  
  float threshold = 0.5;
  // float repeats = 40.0 * frequencies;
  float repeats = mix(0.5, 20.0, sin(time * 0.5) * 0.5 + 0.5);
  // float repeats = 30.0;
  float uCoord = vUv.x;
  float vCoord = vUv.y;
  d = pattern(vCoord, repeats, threshold);
  diffuseColor.rgb = mix(vec3(0.15), vec3(7.0), 1.0 - d);

  // d += aastep(0.5, (noise(vec2(vPosition.x * 10.0, vPosition.y * 0.5)) * 0.5 + 0.5));
  metalnessFactor *= d;
  roughnessFactor *= (1.0 - d * 0.75);
  // if (d < 0.001) discard;
  
  #include <normal_flip>
  #include <normal_fragment>
  #include <emissivemap_fragment>

  // accumulation
  #include <lights_physical_fragment>
  #include <lights_template>

  // modulation
  #include <aomap_fragment>

  vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

  gl_FragColor = vec4( vec3(luma(outgoingLight)), diffuseColor.a );
  // gl_FragColor.a = d;
  
  #include <premultiplied_alpha_fragment>
  #include <tonemapping_fragment>
  #include <encodings_fragment>
  #include <fog_fragment>
}
