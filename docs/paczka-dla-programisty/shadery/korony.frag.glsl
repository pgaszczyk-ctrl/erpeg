// SZKIC (wariant B ze SPEC 3.3) – fragment shader filtra Phaser 4 dla warstwy koron w kawałku mapy.
// Wzorowany na FilterDisplacement (node_modules/phaser/src/renderer/webgl/shaders/FilterDisplacement-frag.js).
// uMaska: R = rf (wysokość w koronie 0..1), G = sztywność/2.5, B = faza drzewa, A = 1 gdzie korona (maska poszerzona o 3 px!).
#pragma phaserTemplate(shaderName)
precision mediump float;
uniform sampler2D uMainSampler;
uniform sampler2D uMaska;
uniform vec2 uRozmiar;      // rozmiar tekstury kawałka w px płótna
uniform vec2 uPoczatek;     // lewy-górny róg kawałka w px pliku (świat)
uniform float uCzas;        // s
uniform float uSila;        // S z pogody
uniform vec3 uGracz;        // x, y głowy gracza (px pliku, świat), promień prześwitu
varying vec2 outTexCoord;
#pragma phaserTemplate(fragmentHeader)

float bayer(vec2 p) {
  // macierz 4x4 bez tablic (GLSL ES 1.0)
  vec2 q = mod(floor(p), 4.0);
  float v = 0.0;
  if (q.y == 0.0) v = q.x == 0.0 ? 0.0 : q.x == 1.0 ? 8.0 : q.x == 2.0 ? 2.0 : 10.0;
  else if (q.y == 1.0) v = q.x == 0.0 ? 12.0 : q.x == 1.0 ? 4.0 : q.x == 2.0 ? 14.0 : 6.0;
  else if (q.y == 2.0) v = q.x == 0.0 ? 3.0 : q.x == 1.0 ? 11.0 : q.x == 2.0 ? 1.0 : 9.0;
  else v = q.x == 0.0 ? 15.0 : q.x == 1.0 ? 7.0 : q.x == 2.0 ? 13.0 : 5.0;
  return (v + 0.5) / 16.0;
}

void main() {
  vec2 px = outTexCoord * uRozmiar;
  vec2 swiat = uPoczatek + px;
  vec4 m = texture2D(uMaska, outTexCoord);
  float rf = m.r, sz = m.g * 2.5;
  float p = fract((swiat.x * 0.8 + swiat.y * 0.35) * 0.0055 - uCzas * 0.26);
  float gust = exp(-pow((p - 0.5) * 6.0, 2.0));
  float w = uSila * (0.32 * sin(uCzas * 2.1 + swiat.x * 0.07 + swiat.y * 0.03 + m.b * 6.28)
                   + 0.14 * sin(uCzas * 3.4 - swiat.x * 0.05 + swiat.y * 0.06) + 1.25 * gust);
  float dx = floor(w * sz * (0.3 + 0.95 * rf) + 0.5);      // zawsze całe piksele
  vec4 c = texture2D(uMainSampler, (px - vec2(dx, 0.0) + 0.5) / uRozmiar);
  // prześwit
  vec2 d2 = swiat - uGracz.xy; d2.y *= 1.05;
  float d = length(d2), R = uGracz.z;
  if (R > 0.0 && (d < R - 5.0 || (d < R && bayer(swiat) < (R - d) / 5.0))) c.a = 0.0;
  gl_FragColor = c;
}
