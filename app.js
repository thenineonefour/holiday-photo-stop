// Holiday photo stop: QR -> this page -> camera with a holiday frame and a
// snowman you can drag and pinch, or a life-size 3D snowman in AR.
// No app, no build step. Spot settings live in spots.js.
(() => {
  'use strict';

  // ---------- which spot is this? ----------
  const SPOTS = window.SPOTS || {};
  const query = new URLSearchParams(location.search);
  const spotKey = (query.get('spot') || location.hash.replace(/^#/, '') || 'default').toLowerCase();
  const spot = Object.assign({}, SPOTS.default, SPOTS[spotKey] || {});

  const THEMES = {
    classic: { band: '#8f1427', band2: '#1d4a37', ink: '#fffaf0', accent: '#f1cf7a' },
    winter:  { band: '#23476b', band2: '#8fb8d8', ink: '#ffffff', accent: '#dff1ff' },
    gold:    { band: '#132036', band2: '#2b3c5c', ink: '#fbf3dc', accent: '#d9b24c' },
  };
  const theme = THEMES[spot.theme] || THEMES.classic;

  const W = 1080, H = 1350; // 4:5, Instagram portrait

  // In-app browsers (Instagram, Facebook, TikTok) often block the camera and AR.
  const ua = navigator.userAgent || '';
  const inAppBrowser = /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Snapchat|LinkedInApp/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // ---------- markup ----------
  const icon = {
    camera: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="5" y="11" width="30" height="21" rx="4"/><path d="M14 11l2.5-4h7L26 11"/><circle cx="20" cy="21.5" r="6"/></svg>',
    snowman: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="20" cy="28" r="8"/><circle cx="20" cy="14.5" r="5.5"/><path d="M14 7.5h12M16.5 7.5V3h7v4.5" stroke-linejoin="round"/><path d="M12 22l-6-4M28 22l6-4" stroke-linecap="round"/></svg>',
    flip: '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9a9 9 0 0 1 16-3l1.5 2"/><path d="M21.5 3.5V8H17"/><path d="M22 17a9 9 0 0 1-16 3l-1.5-2"/><path d="M4.5 22.5V18H9"/></svg>',
    man: '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13" cy="18" r="5.5"/><circle cx="13" cy="8.5" r="3.6"/><path d="M8.5 4h9" stroke-linecap="round"/></svg>',
  };

  const app = document.getElementById('app');
  app.innerHTML = `
    <section class="view home" id="v-home">
      <div class="home-inner">
        <div class="eyebrow">${esc(spot.name)}</div>
        <h1>${esc(spot.greeting)}</h1>
        <p>Snap a holiday photo with a festive frame, or put a life-size snowman next to you.</p>
        ${inAppBrowser ? `<div class="notice"><strong>Open this in ${isIOS ? 'Safari' : 'Chrome'}.</strong> This app's built-in browser can block the camera. Tap the <b>&middot;&middot;&middot;</b> menu and choose "Open in browser."</div>` : ''}
        <div id="season-over" class="notice" hidden>This holiday photo stop is closed for the season. See you next year!</div>
        <div class="choices" id="choices">
          <button class="choice primary" id="go-photo">${icon.camera}<div><strong>Holiday photo</strong><span>Frame + a snowman you can move</span></div></button>
          <button class="choice" id="go-snowman">${icon.snowman}<div><strong>Life-size snowman</strong><span>Stand him in front of you in 3D</span></div></button>
        </div>
        <div class="fine">No app needed. Photos stay on your phone.</div>
      </div>
    </section>

    <section class="view" id="v-camera" hidden>
      <div class="bar"><button class="pill" id="cam-back">Back</button><span class="title">${esc(spot.greeting)}</span><span style="width:58px"></span></div>
      <div class="stage-wrap">
        <canvas id="stage" width="${W}" height="${H}" aria-label="Camera preview with holiday frame"></canvas>
        <div class="cam-msg" id="cam-msg" hidden>
          <p id="cam-msg-text">Starting the camera...</p>
          <label class="btn" for="file-cam" id="file-cam-label">Take a photo</label>
          <label class="btn ghost" for="file-lib">Choose from my photos</label>
        </div>
      </div>
      <div class="hint" id="hint">Drag the snowman. Pinch to resize him.</div>
      <div class="controls">
        <div class="side"><button class="round" id="flip" aria-label="Switch camera">${icon.flip}</button></div>
        <button class="shutter" id="shutter" aria-label="Take photo"></button>
        <div class="side"><button class="round" id="toggle-snow" aria-pressed="true" aria-label="Show snowman">${icon.man}</button></div>
      </div>
      <input class="visually-hidden" type="file" id="file-cam" accept="image/*" capture="user">
      <input class="visually-hidden" type="file" id="file-lib" accept="image/*">
    </section>

    <section class="view" id="v-preview" hidden>
      <div class="bar"><button class="pill" id="retake">Retake</button><span class="title">Looking good</span><span style="width:70px"></span></div>
      <div class="stage-wrap"><img id="shot" alt="Your holiday photo"></div>
      <div class="hint" id="save-hint">Press and hold the photo to save it, or tap Save.</div>
      <div class="actions">
        <button class="btn" id="save">Save photo</button>
        <button class="btn ghost" id="share" hidden>Share</button>
      </div>
    </section>

    <section class="view" id="v-snowman" hidden>
      <div class="bar"><button class="pill" id="snow-back">Back</button><span class="title">Life-size snowman</span><span style="width:58px"></span></div>
      <div class="stage-wrap" id="mv-wrap" style="padding:0"></div>
      <div class="tips" id="ar-tips">Loading the snowman...</div>
    </section>`;

  const $ = (id) => document.getElementById(id);
  const views = ['home', 'camera', 'preview', 'snowman'];
  const show = (name) => views.forEach(v => { $('v-' + v).hidden = v !== name; });

  if (spot.until && new Date() > new Date(spot.until + 'T23:59:59')) {
    $('season-over').hidden = false;
    $('choices').hidden = true;
  }

  // ---------- holiday frame (drawn once) ----------
  const frame = document.createElement('canvas');
  frame.width = W; frame.height = H;
  let frameReady = false;

  async function buildFrame() {
    const f = frame.getContext('2d');
    f.clearRect(0, 0, W, H);
    if (spot.frameImage) {
      const img = await loadImage(spot.frameImage).catch(() => null);
      if (img) { f.drawImage(img, 0, 0, W, H); frameReady = true; return; }
    }
    try { await document.fonts.load('italic 700 90px "Playfair Display"'); } catch (_) {}

    const side = 26, top = 26, foot = 200, radius = 34;
    // Border band with a soft two-tone gradient.
    const g = f.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, theme.band); g.addColorStop(1, theme.band2);
    f.fillStyle = g; f.fillRect(0, 0, W, H);
    // Cut the photo window out.
    f.globalCompositeOperation = 'destination-out';
    roundRect(f, side, top, W - side * 2, H - top - foot, radius); f.fill();
    f.globalCompositeOperation = 'source-over';
    // Thin gold keyline around the window.
    f.strokeStyle = theme.accent; f.globalAlpha = 0.85; f.lineWidth = 4;
    roundRect(f, side + 8, top + 8, W - (side + 8) * 2, H - top - foot - 16, radius - 8); f.stroke();
    f.globalAlpha = 1;

    // String lights swagging across the top of the photo.
    const bulbs = ['#ff4d5e', '#ffd166', '#5ad17a', '#6ec6ff', '#fff4d6'];
    const swags = 4, span = W / swags;
    f.strokeStyle = 'rgba(20, 30, 25, 0.85)'; f.lineWidth = 4;
    f.beginPath();
    for (let s = 0; s < swags; s++) {
      const x0 = s * span, x1 = x0 + span;
      f.moveTo(x0, 30); f.quadraticCurveTo((x0 + x1) / 2, 110, x1, 30);
    }
    f.stroke();
    let n = 0;
    for (let s = 0; s < swags; s++) {
      const x0 = s * span, x1 = x0 + span;
      for (let i = 1; i <= 5; i++) {
        const t = i / 6;
        const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * ((x0 + x1) / 2) + t * t * x1;
        const y = (1 - t) * (1 - t) * 30 + 2 * (1 - t) * t * 110 + t * t * 30;
        drawBulb(f, x, y, bulbs[n++ % bulbs.length]);
      }
    }

    // Snowflakes in the corners of the band and the footer.
    f.strokeStyle = 'rgba(255,255,255,0.75)';
    [[70, H - 120, 26], [W - 70, H - 120, 26], [150, H - 60, 14], [W - 150, H - 60, 14], [W - 60, 170, 16], [60, 220, 12]]
      .forEach(([x, y, r]) => drawFlake(f, x, y, r));

    // Greeting.
    f.fillStyle = theme.ink; f.textAlign = 'center'; f.textBaseline = 'alphabetic';
    f.shadowColor = 'rgba(0,0,0,0.3)'; f.shadowBlur = 8; f.shadowOffsetY = 3;
    let size = 92;
    f.font = `italic 700 ${size}px "Playfair Display", Georgia, serif`;
    while (f.measureText(spot.greeting).width > W - 300 && size > 50) {
      size -= 4; f.font = `italic 700 ${size}px "Playfair Display", Georgia, serif`;
    }
    f.fillText(spot.greeting, W / 2, H - 92);
    f.shadowBlur = 0; f.shadowOffsetY = 0;
    f.fillStyle = theme.accent;
    f.font = '800 26px Nunito, system-ui, sans-serif';
    if ('letterSpacing' in f) f.letterSpacing = '6px';
    f.fillText(String(spot.sub || '').toUpperCase(), W / 2, H - 42);
    if ('letterSpacing' in f) f.letterSpacing = '0px';
    frameReady = true;
  }

  function drawBulb(f, x, y, color) {
    f.save();
    f.translate(x, y);
    f.fillStyle = '#2b3a33'; f.fillRect(-7, 0, 14, 12); // socket
    f.shadowColor = color; f.shadowBlur = 28;
    f.fillStyle = color;
    f.beginPath(); f.ellipse(0, 28, 11, 18, 0, 0, Math.PI * 2); f.fill();
    f.shadowBlur = 0;
    f.fillStyle = 'rgba(255,255,255,0.55)';
    f.beginPath(); f.ellipse(-4, 22, 3, 6, 0, 0, Math.PI * 2); f.fill();
    f.restore();
  }

  function drawFlake(f, x, y, r) {
    f.save(); f.translate(x, y); f.lineWidth = Math.max(2, r / 8); f.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      f.rotate(Math.PI / 3);
      f.beginPath(); f.moveTo(0, 0); f.lineTo(0, -r);
      f.moveTo(0, -r * 0.55); f.lineTo(-r * 0.25, -r * 0.8);
      f.moveTo(0, -r * 0.55); f.lineTo(r * 0.25, -r * 0.8);
      f.stroke();
    }
    f.restore();
  }

  // ---------- 2D snowman sticker (drawn once) ----------
  const SW = 600, SH = 900;
  const sticker = document.createElement('canvas');
  sticker.width = SW; sticker.height = SH;
  (function drawSnowman() {
    const s = sticker.getContext('2d');
    // Ground shadow.
    s.fillStyle = 'rgba(0,0,0,0.22)';
    s.beginPath(); s.ellipse(300, 878, 210, 20, 0, 0, Math.PI * 2); s.fill();
    // Stick arms (behind the body).
    s.strokeStyle = '#5b3b22'; s.lineCap = 'round';
    [[1, 0], [-1, 0]].forEach(([d]) => {
      s.lineWidth = 12;
      s.beginPath(); s.moveTo(300 + d * 110, 420); s.lineTo(300 + d * 270, 300); s.stroke();
      s.lineWidth = 8;
      s.beginPath(); s.moveTo(300 + d * 235, 326); s.lineTo(300 + d * 250, 270); s.stroke();
      s.beginPath(); s.moveTo(300 + d * 255, 312); s.lineTo(300 + d * 295, 300); s.stroke();
    });
    // Body balls.
    const ball = (cx, cy, r) => {
      const gr = s.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.7, '#eef2f7'); gr.addColorStop(1, '#c4d0de');
      s.fillStyle = gr; s.beginPath(); s.arc(cx, cy, r, 0, Math.PI * 2); s.fill();
    };
    ball(300, 690, 190); ball(300, 425, 140); ball(300, 218, 100);
    // Coal buttons.
    s.fillStyle = '#1b1b1b';
    [365, 425, 485].forEach(y => { s.beginPath(); s.arc(300, y, 13, 0, Math.PI * 2); s.fill(); });
    // Scarf.
    s.fillStyle = '#b3122b';
    roundRect(s, 200, 296, 200, 42, 20); s.fill();
    s.save(); s.translate(345, 320); s.rotate(0.12); roundRect(s, 0, 0, 46, 130, 12); s.fill();
    s.fillStyle = '#8f0e22'; s.fillRect(4, 104, 38, 8); s.restore();
    // Face.
    s.fillStyle = '#1b1b1b';
    [[262, 196], [338, 196]].forEach(([x, y]) => { s.beginPath(); s.arc(x, y, 11, 0, Math.PI * 2); s.fill(); });
    for (let i = 0; i < 5; i++) {
      const a = -0.75 + i * 0.375;
      s.beginPath(); s.arc(300 + Math.sin(a) * 48, 250 + Math.cos(a) * 14, 6.5, 0, Math.PI * 2); s.fill();
    }
    s.fillStyle = '#ee7a1e';
    s.beginPath(); s.moveTo(300, 210); s.lineTo(392, 228); s.lineTo(300, 236); s.closePath(); s.fill();
    // Top hat.
    s.fillStyle = '#151515';
    roundRect(s, 236, 26, 128, 106, 8); s.fill();
    roundRect(s, 186, 124, 228, 18, 9); s.fill();
    s.fillStyle = '#b3122b'; s.fillRect(236, 100, 128, 20);
  })();

  // Sticker placement in frame coordinates: x center, y = feet, h = height.
  const snow = { x: W * 0.73, y: H - 230, h: 760, on: spot.snowman !== false };

  // ---------- camera ----------
  const stage = $('stage');
  const ctx = stage.getContext('2d');
  const video = document.createElement('video');
  video.setAttribute('playsinline', ''); video.muted = true; video.autoplay = true;
  let stream = null, facing = 'user', stillImage = null, looping = false;

  async function startCamera() {
    stopCamera();
    stillImage = null;
    $('cam-msg').hidden = true;
    $('shutter').disabled = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return cameraFallback('no-api');
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false,
      });
      video.srcObject = stream;
      await video.play();
      $('flip').hidden = false;
    } catch (err) {
      cameraFallback(err && err.name);
    }
  }

  function stopCamera() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
  }

  function cameraFallback(reason) {
    // Native camera via a file input works everywhere, including in-app browsers.
    stopCamera();
    $('flip').hidden = true;
    $('shutter').disabled = true;
    $('cam-msg').hidden = false;
    // Inside an embedded preview (an iframe) the frame blocks the camera, not the person.
    const embedded = (() => { try { return window.top !== window.self; } catch (_) { return true; } })();
    $('cam-msg-text').textContent = reason === 'NotAllowedError' && !embedded
      ? 'Camera access is off. Take a photo with your phone camera instead and we’ll add the frame.'
      : 'Take a photo with your phone camera and we’ll add the frame.';
  }

  function useStill(file) {
    if (!file) return;
    loadImage(URL.createObjectURL(file)).then(img => {
      stillImage = img;
      $('cam-msg').hidden = true;
      $('shutter').disabled = false;
      $('hint').textContent = 'Drag the snowman. Pinch to resize him. Then tap the shutter.';
    });
  }
  $('file-cam').addEventListener('change', e => useStill(e.target.files[0]));
  $('file-lib').addEventListener('change', e => useStill(e.target.files[0]));

  function render(target, forExport) {
    const c = target;
    c.fillStyle = '#0b1712'; c.fillRect(0, 0, W, H);
    const src = stillImage || (video.readyState >= 2 ? video : null);
    if (src) {
      const sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight;
      const scale = Math.max(W / sw, H / sh);
      const dw = sw * scale, dh = sh * scale;
      c.save();
      if (!stillImage && facing === 'user') { c.translate(W, 0); c.scale(-1, 1); } // selfie mirror
      c.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
      c.restore();
    }
    if (snow.on) {
      const w = snow.h * (SW / SH);
      c.drawImage(sticker, snow.x - w / 2, snow.y - snow.h, w, snow.h);
    }
    if (frameReady) c.drawImage(frame, 0, 0);
  }

  function loop() {
    if (!looping) return;
    render(ctx);
    requestAnimationFrame(loop);
  }

  // ---------- drag + pinch the snowman ----------
  const pointers = new Map();
  let pinchStart = null;
  const toCanvas = (e) => {
    const r = stage.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  };
  stage.addEventListener('pointerdown', e => {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, toCanvas(e));
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = { d: Math.hypot(a.x - b.x, a.y - b.y), h: snow.h };
    }
  });
  stage.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId) || !snow.on) return;
    const prev = pointers.get(e.pointerId), now = toCanvas(e);
    pointers.set(e.pointerId, now);
    if (pointers.size === 1) {
      snow.x = clamp(snow.x + now.x - prev.x, 0, W);
      snow.y = clamp(snow.y + now.y - prev.y, snow.h * 0.3, H + snow.h * 0.3);
    } else if (pointers.size === 2 && pinchStart) {
      const [a, b] = [...pointers.values()];
      snow.h = clamp(pinchStart.h * Math.hypot(a.x - b.x, a.y - b.y) / pinchStart.d, 240, 1500);
    }
  });
  const lift = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinchStart = null; };
  stage.addEventListener('pointerup', lift);
  stage.addEventListener('pointercancel', lift);
  stage.addEventListener('wheel', e => {
    e.preventDefault();
    snow.h = clamp(snow.h * (e.deltaY < 0 ? 1.06 : 0.94), 240, 1500);
  }, { passive: false });

  $('toggle-snow').setAttribute('aria-pressed', String(snow.on));
  $('hint').hidden = !snow.on;
  $('toggle-snow').addEventListener('click', () => {
    snow.on = !snow.on;
    $('toggle-snow').setAttribute('aria-pressed', String(snow.on));
    $('hint').hidden = !snow.on;
  });
  $('flip').addEventListener('click', () => { facing = facing === 'user' ? 'environment' : 'user'; startCamera(); });

  // ---------- take, save, share ----------
  let lastBlob = null;
  $('shutter').addEventListener('click', () => {
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    render(out.getContext('2d'), true);
    out.toBlob(blob => {
      lastBlob = blob;
      $('shot').src = URL.createObjectURL(blob);
      looping = false; stopCamera();
      const file = new File([blob], fileName(), { type: 'image/jpeg' });
      $('share').hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
      show('preview');
    }, 'image/jpeg', 0.92);
  });

  function fileName() { return `holiday-photo-${spotKey}-${Date.now()}.jpg`; }

  $('save').addEventListener('click', async () => {
    if (!lastBlob) return;
    const file = new File([lastBlob], fileName(), { type: 'image/jpeg' });
    // 1. Phones: the share sheet has "Save Image" (iPhone) / "Save to device".
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    // 2. A host-provided saver (the private preview shell sets one).
    if (window.SAVE_FALLBACK) {
      try { if (await window.SAVE_FALLBACK(file.name, lastBlob)) return; } catch (_) {}
    }
    // 3. Plain browser download.
    const a = document.createElement('a');
    a.href = URL.createObjectURL(lastBlob); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
  });
  $('share').addEventListener('click', async () => {
    const file = new File([lastBlob], fileName(), { type: 'image/jpeg' });
    try { await navigator.share({ files: [file], text: spot.greeting }); } catch (_) {}
  });
  $('retake').addEventListener('click', openCamera);

  // ---------- 3D / AR snowman ----------
  let mvLoaded = false;
  function openSnowman() {
    show('snowman');
    if (mvLoaded) return;
    mvLoaded = true;
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.4.0/dist/model-viewer.min.js';
    document.head.appendChild(s);
    const base = (window.AR_ASSET_BASE || 'assets/');
    let glb = base + 'snowman.glb';
    if (window.SNOWMAN_GLB_B64) { // preview hosts that can't serve .glb
      const bytes = Uint8Array.from(atob(window.SNOWMAN_GLB_B64), ch => ch.charCodeAt(0));
      glb = URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }));
    }
    $('mv-wrap').innerHTML = `
      <model-viewer id="mv" src="${glb}" ios-src="${base}snowman.usdz"
        alt="A 3D snowman in a top hat and red scarf"
        loading="eager" ar ar-modes="webxr scene-viewer quick-look" ar-scale="fixed" ar-placement="floor"
        camera-controls touch-action="pan-y" auto-rotate rotation-per-second="20deg"
        camera-orbit="20deg 80deg 4.2m" field-of-view="30deg"
        shadow-intensity="1" exposure="1.05" environment-image="neutral">
        <button slot="ar-button" class="btn ar-btn">Put him next to me</button>
      </model-viewer>`;
    const mv = $('mv');
    const tips = $('ar-tips');
    const setTips = () => {
      if (mv.canActivateAR) {
        tips.innerHTML = isIOS
          ? 'Tap <strong>Put him next to me</strong>, point at the ground, and he stands up life-size. Use the white shutter button in that view to take your photo.'
          : 'Tap <strong>Put him next to me</strong> and point at the ground. Step back so he fits, then screenshot your photo.';
      } else {
        tips.innerHTML = inAppBrowser
          ? `Open this page in ${isIOS ? 'Safari' : 'Chrome'} to stand him up life-size.`
          : 'Spin him around here. On a phone you can stand him up life-size in front of you.';
      }
    };
    mv.addEventListener('load', setTips);
    customElements.whenDefined('model-viewer').then(() => setTimeout(setTips, 300));
    mv.addEventListener('ar-status', e => {
      if (e.detail.status === 'failed') tips.textContent = 'AR didn’t start on this phone. Try the Holiday photo instead.';
    });
  }

  // ---------- navigation ----------
  function openCamera() {
    show('camera');
    if (!looping) { looping = true; loop(); }
    startCamera();
  }
  $('go-photo').addEventListener('click', openCamera);
  $('go-snowman').addEventListener('click', openSnowman);
  $('cam-back').addEventListener('click', () => { looping = false; stopCamera(); show('home'); });
  $('snow-back').addEventListener('click', () => show('home'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopCamera();
    else if (!$('v-camera').hidden && !stillImage) startCamera();
  });

  buildFrame();

  // ---------- helpers ----------
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function loadImage(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
})();
