uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;

varying vec3 vLightFront;

#ifdef DOUBLE_SIDED

  varying vec3 vLightBack;

#endif

#include <common>
#include <packing>
#include <lights_pars>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

void main() {
  // gl_FragColor = vec4(vec3(0.5), 1.0);
  // gl_FragColor = vec4(vec3(0.5) * (getShadowMask()), 1.0);
  // gl_FragColor = vec4(mix(vec3(1.0), vec3(getShadowMask()), opacity), 1.0);
  gl_FragColor = vec4(vec3(0.0), (1.0 - getShadowMask()) * opacity);
}
