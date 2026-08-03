(function (global) {
  'use strict';

  // ---- Pure math helpers (exported for tests) ----

  function area(r) {
    return Math.PI * r * r;
  }

  // Two merged bubbles conserve area, so the new radius is hypot(r1, r2),
  // capped so a blob never grows past rMax.
  function mergedRadius(r1, r2, rMax) {
    return Math.min(Math.hypot(r1, r2), rMax);
  }

  // Splitting into 4 conserves area, since 4 * (r/2)^2 = r^2.
  function splitRadius(r) {
    return r / 2;
  }

  // Area-weighted center of two bubbles (center of mass for uniform density).
  function mergeCenter(a, b) {
    var aa = area(a.r), ab = area(b.r), total = aa + ab;
    return { x: (a.x * aa + b.x * ab) / total, y: (a.y * aa + b.y * ab) / total };
  }

  // Momentum-conserving velocity of the merged bubble (mass proportional to area).
  function mergeVelocity(a, b) {
    var aa = area(a.r), ab = area(b.r), total = aa + ab;
    return { x: (a.vx * aa + b.vx * ab) / total, y: (a.vy * aa + b.vy * ab) / total };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      area: area, mergedRadius: mergedRadius, splitRadius: splitRadius,
      mergeCenter: mergeCenter, mergeVelocity: mergeVelocity
    };
  }

  // ---- Runtime (browser only) ----

  if (typeof document === 'undefined') return;

  var MAX_BUBBLES = 16;

  function init() {
    var canvas = document.querySelector('.bubble-canvas');
    if (!canvas) return;
    var boxEl = canvas.parentElement;
    var Matter = global.Matter;
    if (!Matter) return; // physics engine required

    var reducedMotion = global.matchMedia
      ? global.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

    // Work entirely in device pixels so Matter's mouse maps 1:1 to the canvas
    // backing store (avoids a Retina drag/hit-test offset).
    var dpr = global.devicePixelRatio || 1;
    var W = boxEl.clientWidth * dpr;
    var H = boxEl.clientHeight * dpr;
    if (W === 0 || H === 0) return;

    var base = Math.min(W, H);
    var START_R = base * 0.17;
    var R_MAX = base * 0.34;
    var R_MIN_SPLIT = base * 0.075;
    var MIN_R = base * 0.032;
    var WALL = base * 0.4;
    var MOVE_THRESH = 5 * dpr;
    var GRACE_MS = 650;

    var Engine = Matter.Engine, Bodies = Matter.Bodies, Body = Matter.Body,
        Composite = Matter.Composite, Events = Matter.Events, Mouse = Matter.Mouse,
        MouseConstraint = Matter.MouseConstraint, Query = Matter.Query;

    var engine = Engine.create();
    engine.gravity.x = 0;
    engine.gravity.y = 0;
    var world = engine.world;

    function makeWalls() {
      var opts = { isStatic: true, restitution: 0.9, render: { visible: false } };
      return [
        Bodies.rectangle(W / 2, -WALL / 2, W + WALL * 2, WALL, opts),
        Bodies.rectangle(W / 2, H + WALL / 2, W + WALL * 2, WALL, opts),
        Bodies.rectangle(-WALL / 2, H / 2, WALL, H + WALL * 2, opts),
        Bodies.rectangle(W + WALL / 2, H / 2, WALL, H + WALL * 2, opts)
      ];
    }
    Composite.add(world, makeWalls());

    function now() {
      return (global.performance && global.performance.now)
        ? global.performance.now() : Date.now();
    }

    function makeBubble(x, y, r, grace) {
      var b = Bodies.circle(x, y, r, {
        restitution: 0.4,
        frictionAir: 0.02,
        friction: 0,
        density: 0.001,
        render: { visible: false }
      });
      b.plugin = { bubble: true, noMergeUntil: grace || 0, r: r };
      return b;
    }

    function bubbleBodies() {
      return Composite.allBodies(world).filter(function (b) {
        return b.plugin && b.plugin.bubble;
      });
    }

    // ---- Renderer (WebGL metaballs, with a 2D fallback) ----
    var renderer = createGLRenderer(canvas, W, H) || create2DRenderer(canvas, W, H);

    // ---- Mouse drag / throw ----
    var mouse = Mouse.create(canvas);
    var mc = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.2, render: { visible: false } }
    });
    Composite.add(world, mc);

    // Split on a click (small movement) that lands on a bubble.
    var downPos = null;
    Events.on(mc, 'mousedown', function () {
      downPos = { x: mouse.position.x, y: mouse.position.y };
    });
    Events.on(mc, 'mouseup', function () {
      if (!downPos) return;
      var up = { x: mouse.position.x, y: mouse.position.y };
      var moved = Math.hypot(up.x - downPos.x, up.y - downPos.y);
      downPos = null;
      if (moved > MOVE_THRESH) return;
      var hits = Query.point(bubbleBodies(), up);
      if (hits.length) splitBody(hits[hits.length - 1]);
    });

    function splitBody(b) {
      var r = b.plugin.r;
      if (r < R_MIN_SPLIT) return;
      if (bubbleBodies().length - 1 + 4 > MAX_BUBBLES) return;
      var nr = Math.max(MIN_R, splitRadius(r));
      var cx = b.position.x, cy = b.position.y;
      var vx = b.velocity.x, vy = b.velocity.y;
      Composite.remove(world, b);
      var offset = nr * 1.4;
      var speed = base * 0.03;
      var dirs = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      for (var i = 0; i < 4; i++) {
        var dx = dirs[i][0], dy = dirs[i][1];
        var nx = Math.max(nr, Math.min(W - nr, cx + dx * offset));
        var ny = Math.max(nr, Math.min(H - nr, cy + dy * offset));
        var nb = makeBubble(nx, ny, nr, now() + GRACE_MS);
        Composite.add(world, nb);
        Body.setVelocity(nb, { x: vx + dx * speed, y: vy + dy * speed });
      }
    }

    // Fuse two bubbles on contact.
    Events.on(engine, 'collisionStart', function (evt) {
      var pairs = evt.pairs;
      for (var i = 0; i < pairs.length; i++) {
        var a = pairs[i].bodyA, b = pairs[i].bodyB;
        if (!a.plugin || !b.plugin || !a.plugin.bubble || !b.plugin.bubble) continue;
        var t = now();
        if (t < a.plugin.noMergeUntil || t < b.plugin.noMergeUntil) continue;
        if (!Composite.get(world, a.id, 'body') || !Composite.get(world, b.id, 'body')) continue;
        fuse(a, b);
      }
    });

    function fuse(a, b) {
      var A = { x: a.position.x, y: a.position.y, r: a.plugin.r, vx: a.velocity.x, vy: a.velocity.y };
      var B = { x: b.position.x, y: b.position.y, r: b.plugin.r, vx: b.velocity.x, vy: b.velocity.y };
      var nr = mergedRadius(A.r, B.r, R_MAX);
      var c = mergeCenter(A, B);
      var v = mergeVelocity(A, B);
      Composite.remove(world, a);
      Composite.remove(world, b);
      var nb = makeBubble(
        Math.max(nr, Math.min(W - nr, c.x)),
        Math.max(nr, Math.min(H - nr, c.y)),
        nr, 0
      );
      Composite.add(world, nb);
      Body.setVelocity(nb, v);
    }

    // Gentle idle drift in velocity space (same units as the speed cap) plus a
    // max-speed clamp, so bubbles float on their own but stay slow. The body being
    // dragged is skipped so we don't fight the mouse constraint.
    var MAX_V = base * 0.04;    // top speed for drift / throws / splits
    var DRIFT = base * 0.0035;  // per-step idle wander
    Events.on(engine, 'beforeUpdate', function () {
      var bs = bubbleBodies();
      for (var i = 0; i < bs.length; i++) {
        var b = bs[i];
        if (b === mc.body) continue;
        if (!reducedMotion) {
          Body.setVelocity(b, {
            x: b.velocity.x + (Math.random() - 0.5) * DRIFT,
            y: b.velocity.y + (Math.random() - 0.5) * DRIFT
          });
        }
        var sp = Math.hypot(b.velocity.x, b.velocity.y);
        if (sp > MAX_V) {
          var k = MAX_V / sp;
          Body.setVelocity(b, { x: b.velocity.x * k, y: b.velocity.y * k });
        }
      }
    });

    // Seed a single bubble.
    Composite.add(world, makeBubble(W / 2, H / 2, START_R, 0));

    // ---- Colors from the theme ----
    var colors = { core: [0.92, 0.96, 1.0], body: [0.34, 0.65, 1.0], deep: [0.11, 0.36, 0.66] };
    function hexToRgb(hex) {
      hex = hex.replace('#', '').trim();
      if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      var n = parseInt(hex, 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }
    function mix(a, b, t) {
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    }
    function readColors() {
      var css = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
      if (css[0] !== '#') return;
      colors.body = hexToRgb(css);
      colors.core = mix(colors.body, [1, 1, 1], 0.5);
      colors.deep = mix(colors.body, [0.03, 0.1, 0.19], 0.55);
    }
    readColors();
    if (global.MutationObserver) {
      new MutationObserver(readColors).observe(document.documentElement, {
        attributes: true, attributeFilter: ['data-theme']
      });
    }

    // ---- Main loop ----
    function loop() {
      Engine.update(engine, 1000 / 60);
      var bs = bubbleBodies();
      var data = [];
      for (var i = 0; i < bs.length; i++) {
        data.push({ x: bs[i].position.x, y: bs[i].position.y, r: bs[i].plugin.r });
      }
      renderer.draw(data, colors);
      global.requestAnimationFrame(loop);
    }
    global.requestAnimationFrame(loop);

    // Re-measure on resize.
    var resizeTimer = null;
    global.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        dpr = global.devicePixelRatio || 1;
        W = boxEl.clientWidth * dpr;
        H = boxEl.clientHeight * dpr;
        if (W === 0 || H === 0) return;
        renderer.resize(W, H);
      }, 150);
    });
  }

  // ---- WebGL metaball renderer ----

  function createGLRenderer(canvas, W, H) {
    var gl = null;
    try {
      gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    } catch (e) { gl = null; }
    if (!gl) return null;

    var MAXB = MAX_BUBBLES;
    var vsrc = 'attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}';
    var fsrc =
      'precision highp float;' +
      'uniform vec2 uRes;' +
      'uniform int uCount;' +
      'uniform vec3 uBub[' + MAXB + '];' +
      'uniform vec3 uCore;uniform vec3 uBody;uniform vec3 uDeep;' +
      'void main(){' +
      '  vec2 p=vec2(gl_FragCoord.x, uRes.y-gl_FragCoord.y);' +
      '  float f=0.0; vec2 grad=vec2(0.0);' +
      '  for(int i=0;i<' + MAXB + ';i++){' +
      '    if(i>=uCount) break;' +
      '    vec2 c=uBub[i].xy; float r=uBub[i].z;' +
      '    vec2 d=p-c; float dd=dot(d,d)+1.0;' +
      '    float w=r*r/dd;' +
      '    f+=w; grad+= -2.0*w/dd*d;' +
      '  }' +
      '  float T=1.0;' +
      '  float aa=fwidth(f)+0.001;' +
      '  float mask=smoothstep(T-aa, T+aa, f);' +
      '  if(mask<=0.001){ discard; }' +
      '  vec3 n; n.xy=clamp(-grad*(min(uRes.x,uRes.y)*0.5), -1.0, 1.0);' +
      '  n.z=sqrt(max(0.0,1.0-dot(n.xy,n.xy)));' +
      '  vec3 L=normalize(vec3(-0.4,-0.6,0.8));' +
      '  vec3 V=vec3(0.0,0.0,1.0);' +
      '  vec3 Hh=normalize(L+V);' +
      '  float nz=clamp(n.z,0.0,1.0);' +
      // thin bright edge ring, and a see-through interior
      '  float edge=pow(1.0-nz, 1.5);' +
      '  float ring=pow(1.0-nz, 5.0);' +
      // specular highlights (main + secondary)
      '  float spec=pow(clamp(dot(n,Hh),0.0,1.0), 60.0);' +
      '  float spec2=pow(clamp(dot(n,normalize(L+vec3(0.5,0.3,1.0))),0.0,1.0), 18.0)*0.25;' +
      // faint soap-film iridescence near the rim
      '  vec3 irid=0.5+0.5*cos(6.2831*(n.x*1.3+n.y*1.1+vec3(0.0,0.33,0.67)));' +
      '  float baseCenter=0.22;' +
      '  float edgeStrength=0.6;' +
      '  vec3 col=mix(uBody, uCore, edge*0.6);' +     // blue center to lighter-blue edge
      '  col=mix(col, irid, ring*0.25);' +            // faint soap sheen on the edge
      '  col+=uCore*ring*0.35;' +                     // lighter-blue rim glow
      '  col+=vec3(1.0)*(spec+spec2);' +              // small white glints
      '  float alpha=mask*clamp(baseCenter + edge*edgeStrength + ring*0.4 + spec, 0.0, 1.0);' +
      '  gl_FragColor=vec4(col, alpha);' +
      '}';

    var ext = gl.getExtension('OES_standard_derivatives');
    if (ext) {
      fsrc = '#extension GL_OES_standard_derivatives : enable\n' + fsrc;
    } else {
      fsrc = fsrc.replace('float aa=fwidth(f)+0.001;', 'float aa=0.02;');
    }

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
      return s;
    }
    var vs = compile(gl.VERTEX_SHADER, vsrc);
    var fs = compile(gl.FRAGMENT_SHADER, fsrc);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, 'uRes');
    var uCount = gl.getUniformLocation(prog, 'uCount');
    var uBub = gl.getUniformLocation(prog, 'uBub');
    var uCore = gl.getUniformLocation(prog, 'uCore');
    var uBody = gl.getUniformLocation(prog, 'uBody');
    var uDeep = gl.getUniformLocation(prog, 'uDeep');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    function resize(w, h) {
      W = w; H = h;
      canvas.width = Math.round(W);
      canvas.height = Math.round(H);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize(W, H);

    var arr = new Float32Array(MAXB * 3);
    function draw(bubbles, colors) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      var n = Math.min(bubbles.length, MAXB);
      for (var i = 0; i < n; i++) {
        arr[i * 3] = bubbles[i].x;
        arr[i * 3 + 1] = bubbles[i].y;
        arr[i * 3 + 2] = bubbles[i].r;
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1i(uCount, n);
      gl.uniform3fv(uBub, arr);
      gl.uniform3fv(uCore, colors.core);
      gl.uniform3fv(uBody, colors.body);
      gl.uniform3fv(uDeep, colors.deep);
      if (n > 0) gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    return { draw: draw, resize: resize };
  }

  // ---- 2D canvas fallback (plain shaded circles) ----

  function create2DRenderer(canvas, W, H) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return { draw: function () {}, resize: function () {} };
    function resize(w, h) {
      W = w; H = h;
      canvas.width = Math.round(W);
      canvas.height = Math.round(H);
    }
    resize(W, H);
    function rgb(c) {
      return 'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')';
    }
    function draw(bubbles, colors) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < bubbles.length; i++) {
        var b = bubbles[i];
        var g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.1, b.x, b.y, b.r);
        g.addColorStop(0, rgb(colors.core));
        g.addColorStop(0.45, rgb(colors.body));
        g.addColorStop(1, rgb(colors.deep));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return { draw: draw, resize: resize };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : this);
