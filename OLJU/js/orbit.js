/* OnlineJobs University — final CTA orbit shader
   One WebGL canvas draws the night sky, gold sunrise and tilted orbits; the
   DOM badge floats in front of it. The near half of each orbit is brighter and
   thicker so the system still reads in depth.
   main.js feeds scroll progress through window.OLJOrbit.setReveal(0..1). */
(() => {
  const section = document.querySelector('[data-cta]');
  if (!section) return;
  const badge = section.querySelector('[data-cta-badge]');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform vec2 uRes;       // canvas size, device px
    uniform vec2 uCenter;    // orbit centre (badge centre), device px, origin bottom-left
    uniform float uTime;
    uniform float uReveal;   // scroll reveal 0..1
    uniform float uDpr;
    uniform float uRing;     // orbit scale for narrow screens

    const float PI = 3.14159265;
    const float TAU = 6.28318531;
    const vec3 NAVY_950 = vec3(0.027, 0.043, 0.118);
    const vec3 NAVY_900 = vec3(0.047, 0.075, 0.188);
    const vec3 NAVY_700 = vec3(0.137, 0.196, 0.424);
    const vec3 NAVY_400 = vec3(0.529, 0.576, 0.761);
    const vec3 GOLD     = vec3(0.976, 0.706, 0.165);
    const vec3 GOLD_300 = vec3(0.988, 0.808, 0.337);

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 frag = gl_FragCoord.xy;
      vec2 uv = frag / uRes;
      vec2 p = (frag - uCenter) / uDpr;      // css px from the orbit centre, y up
      float aa = 1.0 / uDpr;
      vec3 col = vec3(0.0);
      float sun = exp(-pow(length(vec2(p.x * 0.75, p.y)) / (200.0 * uRing), 2.0));

      {
        // Sky: deep navy, lighter toward the horizon, with a broad navy halo
        col = mix(NAVY_900, NAVY_950, smoothstep(0.05, 0.95, uv.y));
        float halo = exp(-pow(length(vec2(p.x * 0.5, p.y * 0.9)) / (520.0 * uRing), 2.0));
        col += NAVY_700 * 0.65 * halo;
        col += GOLD * sun * (0.08 + 0.2 * uReveal) * (0.96 + 0.04 * sin(uTime * 0.8));

        // Sparse twinkling stars, fading out near the sunrise
        vec2 cp = frag / uDpr;
        vec2 cell = floor(cp / 36.0);
        float h = hash12(cell);
        if (h > 0.91) {
          vec2 o = vec2(hash12(cell + 17.0), hash12(cell + 41.0)) * 36.0;
          float d = length(cp - (cell * 36.0 + o));
          float tw = 0.5 + 0.5 * sin(uTime * (0.5 + h * 1.6) + h * 80.0);
          float fade = smoothstep(0.2, 0.75, uv.y) * (1.0 - sun);
          col += vec3(0.80, 0.84, 0.96) * (1.0 - smoothstep(0.2, 1.3, d)) * (0.2 + 0.4 * tw) * fade;
        }
      }

      // Orbits: tilted ellipses that open up as the reader scrolls in
      float tilt = mix(0.2, 0.3, uReveal);
      vec3 glow = vec3(0.0);
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float r = (150.0 + 120.0 * fi + 22.0 * fi * fi) * uRing * mix(0.86, 1.0, uReveal);
        float show = smoothstep(fi * 0.14, fi * 0.14 + 0.5, uReveal);

        vec2 q = vec2(p.x, p.y / tilt);
        float lq = max(length(q), 1e-3);
        vec2 g = vec2(p.x, p.y / (tilt * tilt)) / lq;
        float d = (lq - r) / max(length(g), 1e-3);     // ~screen distance to the ellipse
        float ang = atan(q.y, q.x);
        float near = 0.5 - 0.5 * sin(ang);              // 1 = front (below centre), 0 = back

        float width = mix(0.45, 0.95, near);
        float line = 1.0 - smoothstep(width, width + aa * 1.5, abs(d));
        float haze = exp(-abs(d) / 7.0) * 0.12;
        vec3 ringCol = mix(NAVY_400, GOLD_300, 0.2 + 0.6 * near);
        float bright = mix(0.09, 0.32, near) * (1.0 - fi * 0.15);
        glow += ringCol * (line + haze) * bright * show;

        // Two satellites per orbit with comet tails; outer orbits move slower
        for (int j = 0; j < 2; j++) {
          float fj = float(j);
          float speed = (0.2 - fi * 0.035) * (fj > 0.5 ? 0.8 : 1.0);
          float theta = fi * 1.7 + fj * PI + uTime * speed;
          vec2 sp = vec2(cos(theta) * r, sin(theta) * r * tilt);
          float sNear = 0.5 - 0.5 * sin(theta);
          float size = mix(1.3, 3.0, sNear) * (1.0 - fi * 0.1);
          float sd = length(p - sp);
          float core = 1.0 - smoothstep(size, size + aa * 1.5, sd);
          float bloom = exp(-sd / (size * 3.5)) * 0.45;
          float behind = mod(theta - ang, TAU);
          float tail = exp(-behind * 2.6) * exp(-abs(d) / 1.4) * step(behind, 2.5);
          glow += GOLD_300 * (core + bloom) * mix(0.45, 1.0, sNear) * show;
          glow += GOLD * tail * 0.55 * mix(0.4, 1.0, near) * show;
        }
      }

      col += glow;
      col += (hash12(frag) - 0.5) * 0.012;             // dither against banding
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[orbit] shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function createLayer(canvas) {
    const gl = canvas && canvas.getContext('webgl', {
      alpha: false, antialias: false,
      depth: false, stencil: false, powerPreference: 'low-power',
    });
    if (!gl) return null;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n) => gl.getUniformLocation(prog, n);
    const uni = {
      res: u('uRes'), center: u('uCenter'), time: u('uTime'), reveal: u('uReveal'),
      dpr: u('uDpr'), ring: u('uRing'),
    };
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail(); });
    return { canvas, gl, uni };
  }

  const layers = [createLayer(section.querySelector('[data-orbit]'))];

  let running = false;
  let visible = false;
  let raf = 0;
  let reveal = 0;
  let dpr = 1;
  let badgeX = 0;
  let badgeY = 0;
  let height = 0;
  let offset = 0;          // live vertical offset of the orbit centre, css px
  let ring = 1;
  const t0 = performance.now();

  function fail() {
    running = false;
    cancelAnimationFrame(raf);
    section.classList.add('no-gl');
    section.querySelectorAll('[data-orbit]').forEach((c) => { c.hidden = true; });
  }

  if (layers.some((l) => !l)) { fail(); return; }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = section.clientWidth;
    const h = section.clientHeight;
    layers.forEach(({ canvas, gl }) => {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    });
    // offsetLeft/Top ignore transforms, so this is the badge's resting centre
    badgeX = badge.offsetLeft + badge.offsetWidth / 2;
    badgeY = badge.offsetTop + badge.offsetHeight / 2;
    height = h;
    ring = Math.min(1, Math.max(0.55, w / 1360));
    draw(performance.now());
  }

  function draw(now) {
    const t = reduceMotion.matches ? 14 : (now - t0) / 1000;
    layers.forEach(({ canvas, gl, uni }) => {
      gl.uniform2f(uni.res, canvas.width, canvas.height);
      gl.uniform2f(uni.center, badgeX * dpr, (height - badgeY - offset) * dpr);
      gl.uniform1f(uni.time, t);
      gl.uniform1f(uni.reveal, reveal);
      gl.uniform1f(uni.dpr, dpr);
      gl.uniform1f(uni.ring, ring);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
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
  window.addEventListener('resize', resize);
  resize();

  window.OLJOrbit = {
    setReveal(v) {
      reveal = v;
      if (!running) draw(performance.now());
    },
    setOffset(px) {
      offset = px;
      if (!running) draw(performance.now());
    },
  };
})();
