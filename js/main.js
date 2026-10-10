(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const toRGB = (c, a = 1) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;

  /* =========================================================
     The day: one sky keyframe per chapter
     ========================================================= */
  const KEYS = {
    dawn:      { top: '#1b2452', mid: '#6c6aa8', bot: '#f4b49a', lit: '#ffdcc8', shade: '#8a7aa6', sun: '#ffc896', sunPos: [0.74, 0.20], sunI: 0.95, moonI: 0, stars: 0, veil: 0.0,  accent: '#ffd2a8', phase: 'Aube' },
    morning:   { top: '#24509f', mid: '#7499d6', bot: '#e3dce6', lit: '#ffffff', shade: '#a2aed0', sun: '#fff0d8', sunPos: [0.70, 0.54], sunI: 0.85, moonI: 0, stars: 0, veil: 0.42, accent: '#ffe7c4', phase: 'Matin' },
    late:      { top: '#1d4fa8', mid: '#5b8ad6', bot: '#c4d7f0', lit: '#ffffff', shade: '#a6b8da', sun: '#fff6e2', sunPos: [0.62, 0.74], sunI: 0.8,  moonI: 0, stars: 0, veil: 0.46, accent: '#dfeaff', phase: 'Fin de matinée' },
    midday:    { top: '#1747a6', mid: '#3f7dd4', bot: '#a7c8ee', lit: '#ffffff', shade: '#aec0e0', sun: '#fffbea', sunPos: [0.50, 0.88], sunI: 0.75, moonI: 0, stars: 0, veil: 0.5,  accent: '#fff3cf', phase: 'Midi' },
    afternoon: { top: '#23408c', mid: '#6680c4', bot: '#efc6a4', lit: '#fff1e2', shade: '#a596b6', sun: '#ffd39a', sunPos: [0.34, 0.62], sunI: 0.85, moonI: 0, stars: 0, veil: 0.46, accent: '#ffd39a', phase: 'Après-midi' },
    sunset:    { top: '#2b2466', mid: '#9f5a8b', bot: '#ff9a62', lit: '#ffc4a0', shade: '#6d4878', sun: '#ff9550', sunPos: [0.26, 0.22], sunI: 1.0,  moonI: 0, stars: 0, veil: 0.42, accent: '#ffb27a', phase: 'Coucher du soleil' },
    dusk:      { top: '#0d1236', mid: '#34366f', bot: '#8a5a86', lit: '#a796c6', shade: '#2c2a58', sun: '#ff8a6a', sunPos: [0.22, -0.02], sunI: 0.35, moonI: 0.35, stars: 0.35, veil: 0.36, accent: '#dcc8ff', phase: 'Crépuscule' },
    night:     { top: '#03050f', mid: '#0b1232', bot: '#1c2452', lit: '#6f79b6', shade: '#141a3d', sun: '#ffb08a', sunPos: [0.20, -0.25], sunI: 0.0,  moonI: 1.0, stars: 1.0, veil: 0.1,  accent: '#c9d2ff', phase: 'Nuit' }
  };
  Object.values(KEYS).forEach((k) => ['top', 'mid', 'bot', 'lit', 'shade', 'sun', 'accent'].forEach((n) => (k['_' + n] = hex(k[n]))));

  /* =========================================================
     Text splitting
     ========================================================= */
  // Keep punctuation glued to an adjacent <em> so it never wraps alone.
  const glue = (el) => {
    el.querySelectorAll('em').forEach((em) => {
      const next = em.nextSibling;
      if (next && next.nodeType === 3) {
        const m = next.textContent.match(/^[^\s]+/);
        if (m) { const s = document.createElement('span'); s.className = 'np'; s.textContent = m[0]; em.appendChild(s); next.textContent = next.textContent.slice(m[0].length); }
      }
      const prev = em.previousSibling;
      if (prev && prev.nodeType === 3) {
        const m = prev.textContent.match(/[^\s]+$/);
        if (m) { const s = document.createElement('span'); s.className = 'np'; s.textContent = m[0]; em.insertBefore(s, em.firstChild); prev.textContent = prev.textContent.slice(0, -m[0].length); }
      }
    });
  };

  const splitWords = (el, mode) => {
    glue(el);
    let idx = 0;
    const words = [];
    const build = (src, dst) => {
      let cur = null;
      const newWord = () => {
        if (mode === 'mask') {
          const w = document.createElement('span'); w.className = 'w';
          const wi = document.createElement('span'); wi.className = 'wi'; wi.style.setProperty('--i', idx++);
          w.appendChild(wi); dst.appendChild(w); words.push(wi); return wi;
        }
        const s = document.createElement('span'); s.className = 'sw'; idx++;
        dst.appendChild(s); words.push(s); return s;
      };
      [...src.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { cur = null; dst.appendChild(document.createTextNode(' ')); return; }
            if (!cur) cur = newWord();
            cur.appendChild(document.createTextNode(part));
          });
        } else if (n.nodeType === 1) {
          if (n.classList.contains('np')) { if (!cur) cur = newWord(); cur.appendChild(n.cloneNode(true)); }
          else if (n.tagName === 'BR') { cur = null; dst.appendChild(n.cloneNode()); }
          else { cur = null; const c = n.cloneNode(false); dst.appendChild(c); build(n, c); }
        }
      });
    };
    const frag = document.createDocumentFragment();
    build(el, frag);
    el.replaceChildren(frag);
    return words;
  };

  document.querySelectorAll('[data-split]').forEach((el) => splitWords(el, 'mask'));
  const scrubs = [...document.querySelectorAll('.scrub')].map((el) => ({ el, words: splitWords(el, 'plain'), hero: el.hasAttribute('data-hero-scrub') }));

  const chars = [];
  document.querySelectorAll('[data-chars]').forEach((el) => {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((c) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      el.appendChild(s);
      chars.push(s);
    });
  });

  /* =========================================================
     Clock (real time in Sousse)
     ========================================================= */
  const TZ = 'Africa/Tunis';
  const clockFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  const tick = () => {
    const t = clockFmt.format(new Date());
    document.querySelectorAll('[data-clock]').forEach((el) => (el.textContent = `${t} GMT+1`));
    document.querySelectorAll('[data-clock-short]').forEach((el) => (el.textContent = t));
    document.querySelectorAll('[data-clock-full]').forEach((el) => (el.textContent = `Sousse · ${t} GMT+1`));
  };
  tick();
  setInterval(tick, 15000);

  /* =========================================================
     WebGL
     ========================================================= */
  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const COMMON = `
    precision highp float;
    uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse;
    float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
    float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);
      for(int i=0;i<6;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
  `;

  function createGL(canvas, frag, extra = []) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) return null;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT);
    const fs = sh(gl.FRAGMENT_SHADER, COMMON + frag);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); return null; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {};
    ['uRes', 'uTime', 'uMouse', ...extra].forEach((n) => (u[n] = gl.getUniformLocation(prog, n)));
    const r = { gl, u, canvas, mouse: [0.5, 0.5], mouseT: [0.5, 0.5], visible: true, scale: 1 };
    r.resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5) * r.scale;
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    };
    r.draw = (t) => {
      r.resize();
      r.mouse[0] = lerp(r.mouse[0], r.mouseT[0], 0.04);
      r.mouse[1] = lerp(r.mouse[1], r.mouseT[1], 0.04);
      gl.uniform2f(u.uRes, canvas.width, canvas.height);
      gl.uniform1f(u.uTime, t);
      gl.uniform2f(u.uMouse, r.mouse[0], r.mouse[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    return r;
  }

  /* ---------- Sky: gradient, sun, moon, stars, lit clouds ---------- */
  const SKY = `
    uniform vec3 uTop,uMid,uBot,uLit,uShade,uSun;
    uniform vec2 uSunPos,uMoonPos;
    uniform float uSunI,uMoonI,uStars,uRise,uScroll;

    float star(vec2 fc){
      float cs=26.*uRes.y/900.;
      vec2 g=fc/cs; vec2 id=floor(g); vec2 f=fract(g)-.5;
      float h=hash(id);
      if(h<.88) return 0.;
      vec2 o=(vec2(hash(id+1.3),hash(id+2.7))-.5)*.6;
      float d=length(f-o)*cs;
      float r=.55+1.1*hash(id+5.1);
      float tw=.6+.4*sin(uTime*(.6+h*1.8)+h*60.);
      float core=smoothstep(r,0.,d);
      float halo=exp(-d*.9)*.18*step(.97,h);
      return (core+halo)*tw*(.4+.6*(h-.88)/.12);
    }

    void main(){
      vec2 uv=gl_FragCoord.xy/uRes; float asp=uRes.x/uRes.y;
      vec2 p=vec2(uv.x*asp,uv.y);
      vec2 par=(uMouse-.5)*vec2(.03,.02);

      // atmosphere
      vec3 col=mix(uBot,uMid,smoothstep(0.,.52,uv.y));
      col=mix(col,uTop,smoothstep(.38,1.,uv.y));

      // stars (dusk & night only) — soft round points
      if(uStars>.001){
        col+=vec3(.92,.95,1.)*star(gl_FragCoord.xy+par*uRes.y*.3)*uStars*smoothstep(.22,.6,uv.y);
      }

      // sun: disc + bloom + warm horizon wash
      vec2 sp=vec2(uSunPos.x*asp,uSunPos.y)+par;
      float ds=length(p-sp);
      col+=uSun*uSunI*(exp(-ds*2.4)*.42+exp(-ds*10.)*.45);
      col+=vec3(1.,.97,.92)*exp(-ds*38.)*.55*uSunI;
      col+=uSun*uSunI*.28*exp(-uv.y*4.5)*exp(-abs(p.x-sp.x)*1.1);

      // crescent moon
      vec2 mp=vec2(uMoonPos.x*asp,uMoonPos.y)+par*.6;
      float dm=length(p-mp);
      float disc=smoothstep(.034,.031,dm);
      float bite=smoothstep(.033,.030,length(p-mp-vec2(.013,.008)));
      col+=uMoonI*(vec3(.96,.96,1.)*disc*(1.-bite)*.95+vec3(.55,.62,1.)*exp(-dm*5.)*.22);

      // high floating clouds, lit from the sun side
      vec2 q=vec2(p.x*1.05+uTime*.006,p.y*2.1-uScroll);
      vec2 w=vec2(fbm(q*.7+3.1),fbm(q*.7+7.7));
      float n=fbm(q*1.25+w*1.1);
      float hiMask=smoothstep(.34,.62,uv.y)*smoothstep(1.05,.78,uv.y);
      float hc=smoothstep(.56,.82,n)*hiMask;
      vec2 toSun=normalize(sp-p+vec2(1e-4))*.035;
      float n2=fbm((q+toSun*vec2(1.05,2.1))*1.25+w*1.1);
      float lt=clamp(.5+(n-n2)*7.,0.,1.);
      vec3 hcol=mix(uShade,uLit,lt)+uSun*uSunI*.35*exp(-ds*1.6)*lt;
      col=mix(col,hcol,hc*.88);

      // sea of clouds: three layers, far to near; they sink as the story rises
      float cover=0.;
      for(int i=0;i<3;i++){
        float fi=float(i);
        float s=2.6-fi*.75;
        float h0=mix(.44-fi*.1,.2-fi*.075,uRise);
        float x=p.x*s+uTime*(.003+fi*.004)+fi*17.3+par.x*(2.+fi*4.);
        vec2 cq=vec2(x,uv.y*s*1.5+fi*5.);
        float n1=fbm(vec2(x*.5,fi*7.1));
        float n3=fbm(cq*1.8);
        float edge=h0+(n1-.5)*.17+(n3-.5)*.11;
        float a=smoothstep(edge+.01,edge-.03,uv.y);
        float depth=clamp((edge-uv.y)/.2,0.,1.);
        float tex=fbm(cq*3.4+3.);
        float l=clamp((1.-depth)*.8+tex*.35-.05,0.,1.);
        float side=exp(-abs(p.x-sp.x)*.8);
        vec3 cc=mix(uShade,uLit,l);
        cc+=uSun*uSunI*(.2*side*(1.-depth)+.45*exp(-abs(edge-uv.y)*80.)*side);
        cc=mix(cc,mix(uBot,uMid,.3),.42-fi*.2);
        col=mix(col,cc,a);
        cover=max(cover,a);
      }

      // soft vignette + fine dither to avoid banding
      col*=1.-.2*pow(length(uv-vec2(.5,.56)),2.2);
      col+=(hash(gl_FragCoord.xy+fract(uTime*3.))-.5)*.012;
      gl_FragColor=vec4(col,1.);
    }`;

  /* ---------- Panel shaders ---------- */
  const PLEXUS = `
    vec2 pt(vec2 id){vec2 h=vec2(hash(id),hash(id+17.3));return .5+.38*sin(h*6.2831+uTime*(.25+.35*h));}
    float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
    float line(vec2 p,vec2 a,vec2 b){float d=seg(p,a,b);float m=smoothstep(.02,.004,d);float l=length(a-b);return m*smoothstep(1.25,.35,l)*.85;}
    float layer(vec2 uv){
      vec2 id=floor(uv),gv=fract(uv);vec2 P[9];
      for(int y=0;y<3;y++)for(int x=0;x<3;x++){vec2 o=vec2(float(x-1),float(y-1));P[y*3+x]=o+pt(id+o);}
      float m=0.;
      for(int i=0;i<9;i++){m+=line(gv,P[4],P[i]);
        vec2 j=(P[i]-gv)*18.;float s=1./dot(j,j);m+=s*(.6+.4*sin(uTime*3.+P[i].x*10.));}
      m+=line(gv,P[1],P[3]);m+=line(gv,P[1],P[5]);m+=line(gv,P[7],P[3]);m+=line(gv,P[7],P[5]);
      return m;}
    void main(){
      vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; vec2 mo=(uMouse-.5)*.4;
      float m=0.; float t=uTime*.03;
      mat2 rot=mat2(cos(t),-sin(t),sin(t),cos(t)); uv=rot*uv;
      for(float i=0.;i<1.;i+=.25){float z=fract(i+t*.6);float sz=mix(9.,.6,z);float fade=smoothstep(0.,.45,z)*smoothstep(1.,.8,z);
        m+=layer(uv*sz+i*20.+mo*sz)*fade;}
      vec3 base=mix(vec3(.03,.03,.08),vec3(.07,.06,.16),uv.y+.5);
      vec3 tint=.55+.45*cos(6.2831*(vec3(.62,.66,.74)+uv.x*.15+uTime*.02));
      vec3 col=base+m*tint*.8;
      col+=vec3(.25,.22,.6)*exp(-length(uv-mo)*2.2)*.35;
      gl_FragColor=vec4(col,1.);}`;

  const AURORA = `
    void main(){
      vec2 uv=gl_FragCoord.xy/uRes; vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y;
      vec3 col=mix(vec3(.01,.01,.03),vec3(.04,.03,.1),uv.y);
      for(int i=0;i<5;i++){float fi=float(i);
        float y=p.y+.22*sin(p.x*1.7+uTime*.22+fi*1.3)+.09*sin(p.x*4.3-uTime*.37+fi*2.1)+(uMouse.y-.5)*.1;
        float c=.24-.11*fi;
        float band=exp(-abs(y-c)*(10.+fi*3.));
        float streak=.45+.55*fbm(vec2(p.x*3.+fi*7.,y*14.-uTime*.25));
        vec3 hue=.5+.5*cos(6.2831*(vec3(.0,.12,.25)+.48+fi*.09+p.x*.08));
        col+=hue*band*streak*(.55-.06*fi);}
      col+=vec3(.6,.7,1.)*pow(max(0.,1.-length(p-vec2(.45,.38))),6.)*.25;
      col=1.-exp(-col*1.6);
      gl_FragColor=vec4(col,1.);}`;

  const DOTS = `
    void main(){
      float s=uRes.y/34.; vec2 g=gl_FragCoord.xy/s; vec2 id=floor(g); vec2 f=fract(g)-.5;
      vec2 c=id/34.; float t=uTime*.12;
      vec2 m=(uMouse-.5)*vec2(uRes.x/uRes.y,1.)*2.;
      float h=fbm(c*1.8+vec2(t,-t*.5)+fbm(c*3.-t)*.8);
      h+=.18*sin(c.x*5.+c.y*3.-uTime*.9);
      vec2 cc=(id*s+.5*s-.5*uRes)/uRes.y; h+=.35*exp(-length(cc-m*.5)*3.);
      float r=mix(.05,.42,smoothstep(.35,.95,h));
      float a=smoothstep(r,r-.08,length(f));
      vec3 lo=vec3(.32,.38,.95),hi=vec3(1.,.78,.6);
      vec3 dt=mix(lo,hi,smoothstep(.45,1.,h))*(.35+.9*smoothstep(.3,.9,h));
      gl_FragColor=vec4(vec3(.02,.02,.05)+dt*a,1.);}`;

  const renderers = [];
  const sky = createGL(document.getElementById('sky'), SKY,
    ['uTop', 'uMid', 'uBot', 'uLit', 'uShade', 'uSun', 'uSunPos', 'uMoonPos', 'uSunI', 'uMoonI', 'uStars', 'uRise', 'uScroll']);
  if (sky) { sky.scale = 0.7; renderers.push(sky); }

  const FRAGS = { plexus: PLEXUS, aurora: AURORA, dots: DOTS };
  const panelIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.target._r) e.target._r.visible = e.isIntersecting; }), { rootMargin: '15% 0px' });
  document.querySelectorAll('[data-panel]').forEach((fig) => {
    const r = createGL(fig.querySelector('canvas'), FRAGS[fig.dataset.panel]);
    if (!r) return;
    r.visible = false; r.fig = fig; r.scale = 0.85;
    fig._r = r;
    panelIO.observe(fig);
    fig.addEventListener('pointermove', (e) => {
      const b = fig.getBoundingClientRect();
      r.mouseT = [(e.clientX - b.left) / b.width, 1 - (e.clientY - b.top) / b.height];
    });
    renderers.push(r);
  });

  /* =========================================================
     Smooth scroll
     ========================================================= */
  let lenis = null;
  if (!reduced && window.Lenis) lenis = new window.Lenis({ lerp: 0.08, smoothWheel: true });
  const scrollY = () => (lenis ? lenis.scroll : window.scrollY);
  const scrollTo = (hash) => {
    const target = hash === '#top' ? 0 : document.querySelector(hash);
    if (target === null) return;
    if (lenis) lenis.scrollTo(target, { duration: 2, easing: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2) });
    else if (target === 0) window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };

  /* =========================================================
     Menu
     ========================================================= */
  const menu = document.getElementById('menu');
  const menuBtn = document.querySelector('[data-menu-open]');
  menu.querySelectorAll('.menu__list a').forEach((a, i) => a.style.setProperty('--i', i));
  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    menuBtn.setAttribute('aria-expanded', String(open));
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  menuBtn.addEventListener('click', () => setMenu(true));
  menu.querySelector('[data-menu-close]').addEventListener('click', () => setMenu(false));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  document.querySelectorAll('[data-link]').forEach((a) => a.addEventListener('click', (e) => {
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    e.preventDefault();
    const wasOpen = menu.classList.contains('is-open');
    if (wasOpen) setMenu(false);
    setTimeout(() => scrollTo(href), wasOpen ? 250 : 0);
  }));

  /* =========================================================
     Layout measurements
     ========================================================= */
  const hero = document.querySelector('.hero');
  const heroName = document.querySelector('.hero__name');
  const heroFit = heroName.querySelector('.fit');
  const heroA = [...document.querySelectorAll('[data-hero-a]')];
  const heroCenterBits = [...document.querySelectorAll('.hero__center [data-intro]')];
  const heroStory = document.querySelector('[data-hero-b]');
  const storyEls = [...document.querySelectorAll('[data-story]')];
  let anchors = [];
  let vh = innerHeight;
  let nameSize = 100;

  const fitName = () => {
    heroName.style.fontSize = '100px';
    const w = heroFit.getBoundingClientRect().width;
    const avail = document.querySelector('.hero__stage').clientWidth - 2 * parseFloat(getComputedStyle(heroName.parentElement).paddingLeft);
    nameSize = Math.min((100 * avail * 0.985) / w, innerHeight * 0.34);
    heroName.style.fontSize = `${nameSize}px`;
  };
  const measure = () => {
    vh = innerHeight;
    fitName();
    anchors = storyEls.map((el, i) => ({
      y: i === 0 ? vh * 0.5 : el.getBoundingClientRect().top + scrollY(),
      key: KEYS[el.dataset.sky],
      hour: parseFloat(el.dataset.hour),
      label: el.dataset.label
    }));
  };
  measure();
  addEventListener('resize', measure);
  if (document.fonts) document.fonts.ready.then(measure);

  /* =========================================================
     Reveal on view
     ========================================================= */
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    io.unobserve(e.target);
    e.target.querySelectorAll('[data-countup]').forEach(countUp);
    if (e.target.matches('[data-countup]')) countUp(e.target);
  }), { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });

  const countUp = (el) => {
    const to = parseInt(el.dataset.countup, 10);
    const t0 = performance.now();
    const step = (now) => {
      const p = clamp((now - t0) / 1400);
      el.textContent = Math.round(easeOut(p) * to);
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  };

  const observeReveals = () => {
    document.querySelectorAll('main [data-split], main [data-fade]').forEach((el) => {
      const parent = el.parentElement;
      if (parent && parent.matches('.cards, .timeline, .works, .langs, .stats')) {
        el.style.setProperty('--d', `${([...parent.children].indexOf(el) % 4) * 0.09}s`);
      }
      io.observe(el);
    });
  };

  /* =========================================================
     Coordinates scramble
     ========================================================= */
  const scramble = (el) => {
    const final = el.dataset.coord;
    const start = performance.now();
    const step = (now) => {
      const p = clamp((now - start) / 1600);
      const locked = Math.floor(easeOut(p) * final.length);
      el.textContent = [...final].map((c, i) => (i < locked || !/\d/.test(c) ? c : Math.floor(Math.random() * 10))).join('');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* =========================================================
     Interaction: cursor, magnetic, spotlight, marquee, copy
     ========================================================= */
  const cursor = document.querySelector('.cursor');
  const cDot = cursor.querySelector('.cursor__dot');
  const cRing = cursor.querySelector('.cursor__ring');
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const ring = { x: mouse.x, y: mouse.y };
  if (finePointer && !reduced) {
    root.classList.add('has-cursor');
    addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    document.addEventListener('pointerover', (e) => cursor.classList.toggle('is-hover', !!e.target.closest('a, button, .card, .work')));
  }
  addEventListener('pointermove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (sky) sky.mouseT = [e.clientX / innerWidth, 1 - e.clientY / innerHeight];
  }, { passive: true });

  if (finePointer && !reduced) {
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      el.style.transition = 'transform .7s cubic-bezier(.16,1,.3,1), background .4s, color .4s, border-color .4s';
      el.addEventListener('pointermove', (e) => {
        const b = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - b.left - b.width / 2) * 0.22}px, ${(e.clientY - b.top - b.height / 2) * 0.32}px)`;
      });
      el.addEventListener('pointerleave', () => (el.style.transform = ''));
    });
    document.querySelectorAll('.card').forEach((c) => c.addEventListener('pointermove', (e) => {
      const b = c.getBoundingClientRect();
      c.style.setProperty('--mx', `${e.clientX - b.left}px`);
      c.style.setProperty('--my', `${e.clientY - b.top}px`);
    }));
  }

  const marquees = [...document.querySelectorAll('[data-marquee]')].map((track, i) => {
    track.innerHTML += track.innerHTML;
    return { track, x: 0, dir: track.closest('.marquee--rev') ? 1 : -1, speed: 0.5 + i * 0.12 };
  });

  const toast = document.querySelector('.toast');
  let toastT;
  document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast.textContent = 'Adresse copiée ✓'; }
    catch { location.href = `mailto:${b.dataset.copy}`; return; }
    toast.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove('is-on'), 1800);
  }));

  /* =========================================================
     Story HUD: chapter label, story clock, logo sun, rail
     ========================================================= */
  const chapterLabel = document.querySelector('[data-section-label]');
  const orbit = document.querySelector('[data-orbit]');
  const progressBar = document.querySelector('[data-progress]');
  const railFill = document.querySelector('[data-rail-fill]');
  const railLinks = [...document.querySelectorAll('[data-rail]')];
  let currentChapter = -1;
  let swapT;

  const swapLabel = (text) => {
    clearTimeout(swapT);
    chapterLabel.classList.add('is-out');
    swapT = setTimeout(() => {
      chapterLabel.textContent = text;
      chapterLabel.classList.remove('is-out');
      chapterLabel.classList.add('is-in-start');
      void chapterLabel.offsetWidth;
      chapterLabel.classList.remove('is-in-start');
    }, 260);
  };

  let lastAccent = '';
  const applyHUD = (sky, hour, idx) => {
    // the logo's sun follows the sky: rises on the left, sets on the right
    const dayFrac = clamp((hour - 6) / 16.5);
    orbit.style.transform = `rotate(${(-95 + dayFrac * 230).toFixed(2)}deg)`;
    if (idx !== currentChapter) {
      currentChapter = idx;
      swapLabel(anchors[idx].label);
      railLinks.forEach((a, i) => { a.classList.toggle('is-active', i === idx); a.classList.toggle('is-past', i < idx); });
    }
    const accent = toRGB(sky.accent);
    if (accent !== lastAccent) {
      lastAccent = accent;
      root.style.setProperty('--accent', accent);
      root.style.setProperty('--tint', toRGB(mix3(sky.top, [1, 1, 1], 0.55), 0.1));
    }
  };

  /* =========================================================
     Main loop
     ========================================================= */
  const veil = document.querySelector('.veil');
  const t0 = performance.now();
  let introStart = -1;
  const blend = {};

  function frame(now) {
    if (lenis) lenis.raf(now);
    const y = scrollY();
    const t = (now - t0) / 1000;
    const docH = document.documentElement.scrollHeight - vh;

    // ----- Sky state from story position -----
    const s = y + vh * 0.5;
    let i = 0;
    while (i < anchors.length - 1 && s >= anchors[i + 1].y) i++;
    const a = anchors[i];
    const b = anchors[Math.min(i + 1, anchors.length - 1)];
    const k = b === a ? 0 : smooth(0, 1, (s - a.y) / (b.y - a.y));
    ['top', 'mid', 'bot', 'lit', 'shade', 'sun', 'accent'].forEach((n) => (blend[n] = mix3(a.key['_' + n], b.key['_' + n], k)));
    blend.sunPos = [lerp(a.key.sunPos[0], b.key.sunPos[0], k), lerp(a.key.sunPos[1], b.key.sunPos[1], k)];
    blend.sunI = lerp(a.key.sunI, b.key.sunI, k);
    blend.moonI = lerp(a.key.moonI, b.key.moonI, k);
    blend.stars = lerp(a.key.stars, b.key.stars, k);
    blend.veil = lerp(a.key.veil, b.key.veil, k);
    blend.phase = k < 0.5 ? a.key.phase : b.key.phase;
    const hour = lerp(a.hour, b.hour, k);
    const chapterIdx = i;

    // ----- Prologue sequence (pinned hero) -----
    const pinLen = Math.max(1, hero.offsetHeight - vh);
    const hp = reduced ? 0 : clamp(y / pinLen);
    const rise = smooth(0.0, 0.62, hp);
    if (introStart > 0 || reduced) {
      const it = reduced ? 1 : clamp((now - introStart) / 1800);
      chars.forEach((c, ci) => {
        const kin = easeOut(clamp((it * 1.5 - ci * 0.05) / 0.85));
        const ko = smooth(0.04 + ci * 0.016, 0.34 + ci * 0.016, hp);
        const ty = (1 - kin) * nameSize * 0.5 - ko * vh * 0.22 * (1 + ci * 0.05);
        c.style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0)`;
        c.style.opacity = (kin * (1 - ko)).toFixed(3);
        const blur = (1 - kin) * 10 + ko * 14;
        c.style.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : 'none';
      });
    }
    const fadeA = 1 - smooth(0.02, 0.2, hp);
    heroA.forEach((el) => { el.style.opacity = el.classList.contains('hero__center') ? 1 : fadeA; });
    heroCenterBits.forEach((el) => (el.style.opacity = fadeA));
    const storyIn = smooth(0.3, 0.44, hp);
    heroStory.style.opacity = storyIn;
    heroStory.style.transform = `translateY(calc(-50% + ${((1 - storyIn) * 40).toFixed(1)}px))`;
    body.classList.toggle('is-hero', hp < 0.98);

    // ----- Scroll-scrubbed words -----
    scrubs.forEach((sc) => {
      let p;
      if (sc.hero) p = smooth(0.4, 0.88, hp);
      else {
        const r = sc.el.getBoundingClientRect();
        if (r.bottom < -50 || r.top > vh + 50) return;
        p = clamp((vh * 0.86 - r.top) / (vh * 0.5));
      }
      const n = sc.words.length;
      sc.words.forEach((w, wi) => {
        const o = reduced ? 1 : 0.16 + 0.84 * clamp(p * n * 1.15 - wi);
        const v = o.toFixed(2);
        if (w._o !== v) { w._o = v; w.style.opacity = v; }
      });
    });

    // ----- Veil & HUD -----
    veil.style.opacity = blend.veil.toFixed(3);
    applyHUD(blend, hour, chapterIdx);
    const prog = clamp(y / Math.max(1, docH));
    progressBar.style.transform = `scaleX(${prog.toFixed(4)})`;
    railFill.style.transform = `scaleY(${prog.toFixed(4)})`;

    // ----- Marquees -----
    const vel = lenis ? Math.abs(lenis.velocity) : 0;
    marquees.forEach((m) => {
      const half = m.track.scrollWidth / 2;
      m.x += m.dir * (m.speed + vel * 0.2);
      if (m.x <= -half) m.x += half;
      if (m.x > 0) m.x -= half;
      m.track.style.transform = `translate3d(${m.x.toFixed(2)}px,0,0)`;
    });

    // ----- Cursor -----
    if (finePointer && !reduced) {
      ring.x = lerp(ring.x, mouse.x, 0.16);
      ring.y = lerp(ring.y, mouse.y, 0.16);
      cDot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
      cRing.style.transform = `translate3d(${ring.x.toFixed(1)}px, ${ring.y.toFixed(1)}px, 0)`;
    }

    // ----- WebGL -----
    renderers.forEach((r) => {
      if (r === sky) {
        const { gl, u } = r;
        gl.uniform3fv(u.uTop, blend.top); gl.uniform3fv(u.uMid, blend.mid); gl.uniform3fv(u.uBot, blend.bot);
        gl.uniform3fv(u.uLit, blend.lit); gl.uniform3fv(u.uShade, blend.shade); gl.uniform3fv(u.uSun, blend.sun);
        gl.uniform2f(u.uSunPos, blend.sunPos[0], blend.sunPos[1]);
        gl.uniform2f(u.uMoonPos, 0.76, 0.76);
        gl.uniform1f(u.uSunI, blend.sunI); gl.uniform1f(u.uMoonI, blend.moonI); gl.uniform1f(u.uStars, blend.stars);
        gl.uniform1f(u.uRise, rise);
        gl.uniform1f(u.uScroll, (y / vh) * 0.06);
        r.draw(t);
        return;
      }
      if (!r.visible) return;
      const bb = r.fig.getBoundingClientRect();
      const pr = (bb.top + bb.height / 2 - vh / 2) / vh;
      r.canvas.style.transform = `translate3d(0, ${(pr * -7).toFixed(2)}%, 0)`;
      r.draw(t);
    });

    requestAnimationFrame(frame);
  }

  /* =========================================================
     Loader → intro
     ========================================================= */
  const loader = document.querySelector('.loader');
  const count = loader.querySelector('[data-count]');
  const sun = loader.querySelector('.loader__sun');
  if (lenis) lenis.stop();
  if (history.scrollRestoration) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  let fontsDone = !document.fonts;
  if (document.fonts) document.fonts.ready.then(() => (fontsDone = true));
  setTimeout(() => (fontsDone = true), 3500);
  const loadDur = reduced ? 0 : 1900;
  const loadStart = performance.now();

  const load = (now) => {
    const p = loadDur ? clamp((now - loadStart) / loadDur) : 1;
    const shown = fontsDone ? easeOut(p) : Math.min(easeOut(p), 0.92);
    count.textContent = String(Math.round(shown * 100)).padStart(3, '0');
    sun.style.setProperty('--p', shown.toFixed(3));
    if (shown < 1) { requestAnimationFrame(load); return; }
    measure();
    loader.classList.add('is-done');
    body.classList.remove('is-loading');
    if (lenis) lenis.start();
    setTimeout(() => {
      introStart = performance.now();
      body.classList.add('is-ready');
      document.querySelectorAll('[data-intro]').forEach((el, i) => el.style.setProperty('--d', `${0.5 + i * 0.1}s`));
      document.querySelectorAll('[data-coord]').forEach(scramble);
      observeReveals();
    }, reduced ? 0 : 350);
    setTimeout(() => loader.remove(), 1700);
  };

  requestAnimationFrame(load);
  requestAnimationFrame(frame);
})();
