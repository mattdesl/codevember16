#define PHYSICAL

uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec4 offsetRepeat;
uniform float roughness;
uniform float metalness;
uniform float audioStrength;
uniform float time;
uniform float opacity;
uniform vec3 color1;
uniform vec3 color2;
uniform float animate;
uniform sampler2D audioData;

#ifndef STANDARD
  uniform float clearCoat;
  uniform float clearCoatRoughness;
#endif

uniform float envMapIntensity; // temporary

varying vec3 vViewPosition;

#ifndef FLAT_SHADED

  varying vec3 vNormal;

#endif

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

#pragma glslify: noise = require('glsl-noise/simplex/3d');
#pragma glslify: hsl2rgb = require('glsl-hsl2rgb');

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
  // vec4 texelColor = texture2D( map, vUv );
  // texelColor = mapTexelToLinear( texelColor );
  
  // float dist = abs(mod(vUv.y / offsetRepeat.w * mix(10.0, 5.0, animate), 1.0) - 0.5);
  // dist = smoothstep(0.5, 0.45, dist);
  // float frequencies = texture2D(audioData, vec2(vUv.x / offsetRepeat.z + 0.05, 0.0)).r;
  
  float threshold = mix(0.25, 0.5, animate);
  // float repeats = 40.0 * frequencies;
  float repeats = mix(20.0, 10.0, animate);
  float uCoord = vUv.x / offsetRepeat.z;
  float vCoord = vUv.y / offsetRepeat.w;
  float stripe = pattern(vCoord, repeats, threshold);
  diffuseColor.rgb = mix(
    vec3(stripe),
    mix(color1, color2, stripe),
    animate);

  // if (vUv.y / offsetRepeat.w < 0.5) diffuseColor.rgb *= vec3(0.25);
  // if (vUv.x / offsetRepeat.z < 0.5) diffuseColor.rgb *= vec3(0.15);
  // diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * color2, animate);

  #include <alphamap_fragment>
  #include <alphatest_fragment>
  #include <specularmap_fragment>

  float metalnessFactor = 0.0;
  float roughnessFactor = roughness;

  // if (gl_FrontFacing) {
    float texelRoughMetal = texture2D(roughnessMap, vUv / offsetRepeat.zw).r;
    float rough1 = roughness;
    float rough2 = roughness * texelRoughMetal; // metallic decal
    float roughStrength = animate;
    roughnessFactor = mix(rough1, rough2, roughStrength);
    float metal1 = 0.0;
    float metal2 = metalness * (1.0 - texelRoughMetal);
    metalnessFactor = mix(metal1, metal2, roughStrength);
  // }
  // float mapRoughMetal = texelRoughMetal.r;
  // metalnessFactor *= (1.0 - mapRoughMetal);
  // roughnessFactor *= mapRoughMetal;

  // metalnessFactor *= animate;
  // roughnessFactor *= animate;
  #include <normal_flip>
  #include <normal_fragment>
  #include <emissivemap_fragment>

  // accumulation
  #include <lights_physical_fragment>
  #include <lights_template>

  // modulation
  #include <aomap_fragment>

  vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

  gl_FragColor = vec4( outgoingLight, diffuseColor.a );

  #include <premultiplied_alpha_fragment>
  #include <tonemapping_fragment>
  #include <encodings_fragment>
  #include <fog_fragment>

}
