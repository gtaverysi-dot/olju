/* OnlineJobs University — About page "Next chapter" horizon shader
   One WebGL canvas draws the navy sky, a gold sunrise under the horizon arc,
   a light that travels along the rim, ripples rising off the horizon and
   twinkling stars. Every motion is a whole cycle of LOOP seconds, so the
   animation repeats seamlessly. Falls back to the static CSS image when
   WebGL is unavailable; holds a still frame for reduced motion. */
(() => {
  const section = document.querySelector('[data-horizon]');
  const canvas = section && section.querySelector('[data-horizon-canvas]');
  if (!canvas) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const LOOP = 12;          // seconds per cycle
  const STILL = 0.42;       // loop position shown when motion is reduced

  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform vec2 uRes;      // canvas size, device px
    uniform float uDpr;
    uniform float uPhase;   // 0..1 position in the loop
    uniform vec3 uArc;      // horizon radius x, radius y, centre height above the bottom edge (css px)

    const float PI = 3.14159265;
    const float TAU = 6.28318531;
    const vec3 NAVY_900 = vec3(0.047, 0.075, 0.188);
    const vec3 NAVY_700 = vec3(0.137, 0.196, 0.424);
    const vec3 NAVY_600 = vec3(0.231, 0.290, 0.525);
    const vec3 NAVY_400 = vec3(0.529, 0.576, 0.761);
    const vec3 GOLD     = vec3(0.976, 0.706, 0.165);
    const vec3 GOLD_300 = vec3(0.988, 0.808, 0.337);
    const vec3 RIM      = vec3(0.84, 0.81, 0.74);
    const vec3 STAR     = vec3(0.80, 0.84, 0.96);

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    // Approximate signed distance (css px) to an ellipse of radius r and
    // height ratio tilt; ang is the point's angle around the centre.
    float ellipseDist(vec2 p, float r, float tilt, out float ang) {
      vec2 q = vec2(p.x, p.y / tilt);
      float lq = max(length(q), 1e-3);
      vec2 g = vec2(p.x, p.y / (tilt * tilt)) / lq;
      ang = atan(q.y, q.x);
      return (lq - r) / max(length(g), 1e-3);
    }

    void main() {
      vec2 css = gl_FragCoord.xy / uDpr;            // css px, origin bottom-left
      vec2 size = uRes / uDpr;
      float aa = 1.0 / uDpr;
      float rx = uArc.x;
      float ry = uArc.y;
      float tilt = ry / rx;
      vec2 p = vec2(css.x - size.x * 0.5, css.y - uArc.z);
      float wave = sin(TAU * uPhase);

      // Sky: the same top glow as the section's CSS background
      float e = length(vec2((css.x - size.x * 0.5) / (0.7 * size.x), (size.y - css.y) / (0.4 * size.y)));
      vec3 col = mix(NAVY_700, NAVY_900, clamp(e, 0.0, 1.0));

      float ang;
      float d = ellipseDist(p, rx, tilt, ang);
      float outside = max(d, 0.0);

      // Atmosphere: a blue band above the horizon and a thin warm haze on it
      col += NAVY_600 * 0.4 * exp(-outside / (ry * 0.95));
      col += GOLD * 0.06 * exp(-outside / 24.0) * (0.85 + 0.15 * wave);

      // Stars, kept clear of the horizon glow; each twinkles a whole number of times per loop
      vec2 cell = floor(css / 44.0);
      float h = hash12(cell);
      if (h > 0.93) {
        vec2 o = vec2(hash12(cell + 17.0), hash12(cell + 41.0)) * 44.0;
        float sd = length(css - (cell * 44.0 + o));
        float k = 1.0 + floor(hash12(cell + 7.0) * 3.0);
        float tw = 0.5 + 0.5 * sin(TAU * (uPhase * k + h * 5.0));
        float clear = smoothstep(60.0, 260.0, outside);
        col += STAR * (1.0 - smoothstep(0.3, 1.3, sd)) * (0.12 + 0.4 * tw) * clear;
      }

      // Ripples rising off the horizon, two per loop
      for (int i = 0; i < 2; i++) {
        float ph = fract(uPhase + float(i) * 0.5);
        float ra;
        float rd = ellipseDist(p, rx * (1.0 + 0.6 * ph), tilt, ra);
        float fade = smoothstep(0.0, 0.08, ph) * (1.0 - ph) * (1.0 - ph);
        float ring = 1.0 - smoothstep(0.5, 0.5 + aa * 1.5, abs(rd));
        col += mix(NAVY_400, GOLD_300, 0.4) * (ring * 0.6 + exp(-abs(rd) / 12.0) * 0.25) * 0.28 * fade;
      }

      // Below the horizon: dusk-blue near the rim, a breathing gold sunrise at the centre
      float inside = 1.0 - smoothstep(-1.0, 1.5, d);
      float sun = exp(-pow(length(vec2(p.x / (rx * 0.6), (p.y + ry * 0.12) / (ry * 0.8))), 2.0));
      sun *= 0.84 + 0.16 * wave;
      vec3 planet = mix(vec3(0.13, 0.16, 0.31), vec3(0.27, 0.28, 0.38), exp(d / 36.0) * 0.7);
      planet = mix(planet, GOLD * 0.9, sun * 0.88);
      col = mix(col, planet, inside);

      // Rim of the horizon
      float rim = 1.0 - smoothstep(0.8, 0.8 + aa * 1.5, abs(d));
      float rimHaze = exp(-abs(d) / 5.0);
      col = mix(col, RIM, rim * 0.68);
      col += RIM * rimHaze * 0.1;

      // A light runs along the rim from left to right once per loop, trailing a comet tail
      float travel = clamp((uPhase - 0.04) / 0.76, 0.0, 1.0);
      float live = smoothstep(0.0, 0.08, travel) * (1.0 - smoothstep(0.92, 1.0, travel));
      float gAng = mix(PI + 0.3, -0.3, travel);
      float da = ang - gAng;
      float glint = (exp(-pow(da / 0.045, 2.0)) + step(0.0, da) * exp(-da / 0.4) * 0.55) * live;
      col += GOLD_300 * (rim * 0.95 + rimHaze * 0.45) * glint;
      vec2 gp = vec2(cos(gAng) * rx, sin(gAng) * ry);
      float gd = length(p - gp);
      col += GOLD_300 * (exp(-gd / 16.0) * 0.6 + exp(-gd / 80.0) * 0.14) * live;

      col += (hash12(gl_FragCoord.xy) - 0.5) / 255.0 * 1.5;   // dither against banding
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[horizon] shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  const gl = canvas.getContext('webgl', {
    alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power',
  });
  const vs = gl && compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = gl && compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;   // CSS image stays as the background
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = (n) => gl.getUniformLocation(prog, n);
  const uni = { res: u('uRes'), dpr: u('uDpr'), phase: u('uPhase'), arc: u('uArc') };

  let running = false;
  let visible = false;
  let raf = 0;
  let dpr = 1;
  const t0 = performance.now();

  function fail() {
    running = false;
    cancelAnimationFrame(raf);
    section.classList.remove('has-gl');
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail(); });

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = section.clientWidth;
    const h = section.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Wide, flat horizon on desktop; narrower and more domed on phones
    const rx = Math.min(640, Math.max(230, w * 0.4));
    const tilt = 0.42 - 0.1 * Math.min(1, Math.max(0, (w - 400) / 800));
    const ry = rx * tilt;
    gl.uniform3f(uni.arc, rx, ry, -ry * 0.06);
    gl.uniform2f(uni.res, canvas.width, canvas.height);
    gl.uniform1f(uni.dpr, dpr);
    draw(performance.now());
  }

  function draw(now) {
    const phase = reduceMotion.matches ? STILL : (((now - t0) / 1000) % LOOP) / LOOP;
    gl.uniform1f(uni.phase, phase);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function loop(now) {
    draw(now);
    if (running) raf = requestAnimationFrame(loop);
  }

  function start() {
    if (running || reduceMotion.matches) return;
    running = true;
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  // Only animate while the section is on screen
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start(); else stop();
  }, { rootMargin: '120px 0px' }).observe(section);

  reduceMotion.addEventListener('change', () => {
    stop();
    draw(performance.now());
    if (visible) start();
  });

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(section);
  else addEventListener('resize', resize);
  resize();
  section.classList.add('has-gl');
})();
