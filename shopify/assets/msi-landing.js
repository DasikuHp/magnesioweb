/* ============================================================
   MSI Landing — Scrollytelling canvas en JavaScript vanilla.
   Portado de components/ScrollytellingCanvas.tsx (React +
   Framer Motion) sin dependencias.

   Cómo funciona:
   1. Precarga N frames WebP (con pantalla de carga y % real).
   2. Un contenedor de 500vh con canvas sticky de 100vh.
   3. El progreso de scroll (0→1) se mapea a un índice de frame.
   4. Un lerp (interpolación lineal, factor SPRING) suaviza el
      movimiento — réplica del useSpring de Framer Motion.
   5. Los "beats" de texto (data-msi-beat) aparecen/desaparecen
      con opacidad + translateY según su tramo [start, end].
   6. En móvil (<768px) o con prefers-reduced-motion no se
      precarga nada: el CSS muestra una imagen estática.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Configuración ---------- */

  // Factor del lerp por frame de animación (~equivale al feel del
  // useSpring{stiffness:40,damping:25} original). Más alto = más rígido.
  var SPRING = 0.12;

  // Umbral para considerar la animación "asentada" y parar el rAF.
  var SETTLE = 0.05;

  // Configuración de secuencias, portada 1:1 del componente React.
  // Por defecto solo se usa la primera (naranja) para no precargar
  // 363 imágenes.
  //
  // >>> CÓMO ACTIVAR LA SELECCIÓN ALEATORIA naranja/verde/spray <<<
  // 1. Sube los frames de las otras secuencias con un prefijo propio,
  //    p. ej. verde-frame_0001.webp y spray-frame_0001.webp.
  // 2. Descomenta los dos objetos de abajo y ajusta "prefix" (y "base"
  //    si están en otra URL).
  // 3. Descomenta la línea "índice aleatorio" en init().
  // Nota: los textos de los beats se renderizan desde Liquid (settos
  // del schema); si activas el modo aleatorio, rellena "beats" aquí
  // para que JS sobrescriba los textos según la secuencia elegida.
  var SEQUENCES = [
    {
      id: 'naranja',
      prefix: null, // null = usa el data-frame-prefix del section
      base: null, //   null = usa el data-frames-base del section
      zoomFactor: 0.85,
      stretchX: 1.35, // la secuencia naranja se dibuja 35% más ancha
      stretchY: 0.85, //   y 15% más baja (igual que el original)
      accent: '#e8620a',
      glow: 'rgba(232,98,10,0.8)',
      beats: null
    }
    // ,{
    //   id: 'verde',
    //   prefix: 'verde-frame_',
    //   base: null,
    //   zoomFactor: 0.85, stretchX: 1, stretchY: 1,
    //   accent: '#7bc144', glow: 'rgba(123,193,68,0.8)',
    //   beats: {
    //     a: { tag: 'Salud Articular y Ósea', title: 'MAGNESIO<br>COLÁGENO', sub: 'Sinergia total para huesos, piel y articulaciones.' },
    //     b: { tag: 'Recuperación activa', title: 'Huesos<br>fuertes', sub: 'Colágeno + Magnesio en sinergia para máxima protección articular y ósea.' },
    //     c: { tag: 'Piel y tejidos', title: 'Piel.<br>Pelo.<br>Uñas.', sub: 'El colágeno que tu cuerpo necesita para mantenerse joven y activo cada día.' },
    //     d: { tag: 'Empieza hoy', title: '14,90€', sub: 'Envío en 24/48h · 100% Vegano' }
    //   }
    // }
    // ,{
    //   id: 'spray',
    //   prefix: 'spray-frame_',
    //   base: null,
    //   zoomFactor: 1.5, stretchX: 1, stretchY: 1,
    //   accent: '#c9a84c', glow: 'rgba(201,168,76,0.8)',
    //   beats: {
    //     a: { tag: 'Absorción transdérmica', title: 'ACEITE<br>MAGNESIO', sub: 'Absorción directa a través de la piel. Sin pasar por el sistema digestivo.' },
    //     b: { tag: 'Acción inmediata', title: 'Directo<br>al músculo', sub: 'Sales de magnesio naturales del Balneario de La Higuera. Pureza certificada.' },
    //     c: { tag: 'Sin cápsulas', title: 'Solo<br>aplica<br>y listo.', sub: '125 ml para uso diario. Ideal para deportistas y personas con problemas de absorción oral.' },
    //     d: { tag: 'Empieza hoy', title: '14,90€', sub: 'Envío en 24/48h · Sales 100% Naturales' }
    //   }
    // }
  ];

  /* ---------- Utilidades ---------- */

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function pad4(n) {
    return ('0000' + n).slice(-4);
  }

  // ¿Debemos desactivar el scrollytelling? (móvil o reduced motion)
  function isStaticMode() {
    return (
      window.matchMedia('(max-width: 767px)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  /* ---------- Instancia por sección ---------- */

  function MsiLanding(root) {
    this.root = root;
    this.track = root.querySelector('[data-msi-hero]');
    this.canvas = root.querySelector('[data-msi-canvas]');
    this.loader = root.querySelector('[data-msi-loader]');
    this.hint = root.querySelector('[data-msi-hint]');
    this.beats = Array.prototype.slice.call(
      root.querySelectorAll('[data-msi-beat]')
    );

    this.frameCount = parseInt(root.getAttribute('data-frame-count'), 10) || 121;
    this.framesBase = root.getAttribute('data-frames-base') || '';
    this.framePrefix = root.getAttribute('data-frame-prefix') || 'frame_';
    this.frameExt = root.getAttribute('data-frame-ext') || '.webp';

    this.frames = [];
    this.started = false;
    this.destroyed = false;
    this.current = 0; // posición suavizada (float)
    this.target = 0; //  posición objetivo según scroll (float)
    this.lastDrawn = -1;
    this.raf = 0;
    this.running = false;

    // Secuencia activa. Por defecto la primera (naranja).
    this.seq = SEQUENCES[0];
    // >>> Índice aleatorio (descomenta para activar): <<<
    // this.seq = SEQUENCES[Math.floor(Math.random() * SEQUENCES.length)];

    this.onScroll = this.onScroll.bind(this);
    this.onResize = this.onResize.bind(this);
    this.loop = this.loop.bind(this);

    if (!this.track || !this.canvas) return;

    if (isStaticMode()) {
      // Móvil / reduced motion: el CSS ya muestra el fallback estático.
      // Si el usuario rota o agranda la ventana a escritorio, arrancamos.
      window.addEventListener('resize', this.onResize, { passive: true });
      return;
    }

    this.start();
  }

  MsiLanding.prototype.start = function () {
    if (this.started || this.destroyed) return;
    this.started = true;

    var self = this;

    if (this.loader) this.loader.hidden = false;

    this.preload(function () {
      if (self.destroyed) return;
      self.resizeCanvas();
      window.addEventListener('scroll', self.onScroll, { passive: true });
      window.addEventListener('resize', self.onResize, { passive: true });
      self.onScroll();
      // El original esperaba 600ms tras cargar antes de mostrar contenido.
      setTimeout(function () {
        self.hideLoader();
      }, 600);
    });
  };

  /* ---------- Precarga con progreso ---------- */

  MsiLanding.prototype.frameUrl = function (i) {
    var base = this.seq.base || this.framesBase;
    var prefix = this.seq.prefix || this.framePrefix;
    if (base && base.slice(-1) !== '/') base += '/';
    return base + prefix + pad4(i + 1) + this.frameExt;
  };

  MsiLanding.prototype.preload = function (done) {
    var self = this;
    var loaded = 0;
    var total = this.frameCount;
    var fill = this.loader
      ? this.loader.querySelector('[data-msi-loader-fill]')
      : null;
    var label = this.loader
      ? this.loader.querySelector('[data-msi-loader-label]')
      : null;
    var finished = false;

    function onOne() {
      loaded++;
      var pct = Math.round((loaded / total) * 100);
      if (fill) fill.style.width = pct + '%';
      if (label) label.textContent = pct < 100 ? 'Cargando ' + pct + '%' : 'Listo';
      if (loaded >= total && !finished) {
        finished = true;
        done();
      }
    }

    this.frames = new Array(total);
    for (var i = 0; i < total; i++) {
      (function (idx) {
        var img = new Image();
        img.onload = function () {
          self.frames[idx] = img;
          onOne();
        };
        // Un frame que falle no bloquea la experiencia.
        img.onerror = onOne;
        img.src = self.frameUrl(idx);
      })(i);
    }

    // Red de seguridad: si algo se cuelga (red lenta, CDN caído),
    // continuamos a los 20s con lo que haya.
    setTimeout(function () {
      if (!finished) {
        finished = true;
        done();
      }
    }, 20000);
  };

  MsiLanding.prototype.hideLoader = function () {
    var loader = this.loader;
    if (!loader) return;
    loader.classList.add('is-leaving');
    setTimeout(function () {
      loader.hidden = true;
    }, 500);
  };

  /* ---------- Scroll → progreso → spring ---------- */

  MsiLanding.prototype.getProgress = function () {
    var rect = this.track.getBoundingClientRect();
    var scrollable = rect.height - window.innerHeight;
    if (scrollable <= 0) return 0;
    return clamp(-rect.top / scrollable, 0, 1);
  };

  MsiLanding.prototype.onScroll = function () {
    this.target = this.getProgress() * (this.frameCount - 1);
    if (!this.running) {
      this.running = true;
      this.raf = requestAnimationFrame(this.loop);
    }
  };

  // Bucle rAF: interpola current → target (spring) y pinta.
  MsiLanding.prototype.loop = function () {
    this.current += (this.target - this.current) * SPRING;

    if (Math.abs(this.target - this.current) < SETTLE) {
      this.current = this.target; // asentado: última pasada y paramos
    }

    var idx = Math.round(this.current);
    if (idx !== this.lastDrawn) {
      this.drawFrame(idx);
      this.lastDrawn = idx;
    }

    // Los beats y el hint siguen el progreso suavizado (como el original).
    var p = this.current / (this.frameCount - 1);
    this.updateBeats(p);
    this.updateHint(p);

    if (this.current === this.target) {
      this.running = false;
      return;
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  /* ---------- Beats de texto ---------- */

  // Réplica del componente <Beat>: fade in del 0–10% del tramo,
  // meseta, fade out del 90–100%. Y se desplaza 20px → 0 → -20px.
  MsiLanding.prototype.updateBeats = function (p) {
    for (var i = 0; i < this.beats.length; i++) {
      var el = this.beats[i];
      var start = parseFloat(el.getAttribute('data-start'));
      var end = parseFloat(el.getAttribute('data-end'));
      var span = end - start;
      var fadeIn = start + span * 0.1;
      var fadeOut = end - span * 0.1;
      var opacity, y, t;

      if (p <= start) {
        opacity = 0;
        y = 20;
      } else if (p < fadeIn) {
        t = (p - start) / (fadeIn - start);
        opacity = t;
        y = 20 * (1 - t);
      } else if (p <= fadeOut) {
        opacity = 1;
        y = 0;
      } else if (p < end) {
        t = (p - fadeOut) / (end - fadeOut);
        opacity = 1 - t;
        y = -20 * t;
      } else {
        opacity = 0;
        y = -20;
      }

      el.style.opacity = opacity.toFixed(3);
      el.style.transform = 'translateY(' + y.toFixed(1) + 'px)';
    }
  };

  // "Scroll para explorar" se desvanece durante el primer 10%.
  MsiLanding.prototype.updateHint = function (p) {
    if (!this.hint) return;
    this.hint.style.opacity = clamp(1 - p / 0.1, 0, 1).toFixed(3);
  };

  /* ---------- Canvas ---------- */

  MsiLanding.prototype.resizeCanvas = function () {
    var canvas = this.canvas;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    this.lastDrawn = -1;
    this.drawFrame(Math.round(this.current));
    this.lastDrawn = Math.round(this.current);
  };

  MsiLanding.prototype.onResize = function () {
    if (!this.started) {
      // Estábamos en modo estático y ahora hay hueco de escritorio.
      if (!isStaticMode()) this.start();
      return;
    }
    this.resizeCanvas();
  };

  // Dibuja un frame + todos los overlays. Portado 1:1 del original:
  // fit "contain" con zoomFactor, estirado horizontal (naranja),
  // brillo radial central (composite overlay), viñeta radial,
  // gradientes de borde izq/dcha y arriba/abajo.
  MsiLanding.prototype.drawFrame = function (frameIndex) {
    var canvas = this.canvas;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var img = this.frames[frameIndex];
    if (!img) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = canvas.width / dpr;
    var H = canvas.height / dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var imgW = img.naturalWidth;
    var imgH = img.naturalHeight;
    if (!imgW || !imgH) return;

    // Escalado "contain" + zoom de la secuencia.
    var baseScale = Math.min(W / imgW, H / imgH);
    var scale = baseScale * this.seq.zoomFactor;
    var drawW = imgW * scale;
    var drawH = imgH * scale;
    var dx = (W - drawW) / 2;
    var dy = (H - drawH) / 2;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Estirado horizontal de la secuencia naranja (35% más ancha,
    // 15% más baja), aplicado alrededor del centro de la imagen.
    if (this.seq.stretchX !== 1 || this.seq.stretchY !== 1) {
      var centerX = (dx + drawW / 2) * dpr;
      var centerY = (dy + drawH / 2) * dpr;
      ctx.translate(centerX, centerY);
      ctx.scale(this.seq.stretchX, this.seq.stretchY);
      ctx.translate(-centerX, -centerY);
    }

    ctx.drawImage(img, dx * dpr, dy * dpr, drawW * dpr, drawH * dpr);

    var cx = canvas.width / 2;
    var cy = canvas.height / 2;

    // Brillo sutil central (simula nitidez, composite "overlay").
    var sharpR = Math.min(canvas.width, canvas.height) * 0.28;
    var sharpen = ctx.createRadialGradient(cx, cy, 0, cx, cy, sharpR);
    sharpen.addColorStop(0, 'rgba(255,255,255,0.04)');
    sharpen.addColorStop(0.6, 'rgba(255,255,255,0.01)');
    sharpen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = sharpen;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';

    // Viñeta radial hacia negro.
    var outerR = Math.sqrt(cx * cx + cy * cy) * 1.1;
    var innerR = Math.min(canvas.width, canvas.height) * 0.25;
    var radial = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    radial.addColorStop(0, 'rgba(0,0,0,0)');
    radial.addColorStop(0.35, 'rgba(0,0,0,0)');
    radial.addColorStop(0.58, 'rgba(0,0,0,0.35)');
    radial.addColorStop(0.76, 'rgba(0,0,0,0.7)');
    radial.addColorStop(1.0, 'rgba(0,0,0,0.95)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gradiente de borde izquierdo.
    var edgeW = canvas.width * 0.2;
    var left = ctx.createLinearGradient(0, 0, edgeW, 0);
    left.addColorStop(0, 'rgba(0,0,0,1)');
    left.addColorStop(0.35, 'rgba(0,0,0,0.65)');
    left.addColorStop(0.7, 'rgba(0,0,0,0.18)');
    left.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = left;
    ctx.fillRect(0, 0, edgeW, canvas.height);

    // Gradiente de borde derecho.
    var right = ctx.createLinearGradient(canvas.width - edgeW, 0, canvas.width, 0);
    right.addColorStop(0, 'rgba(0,0,0,0)');
    right.addColorStop(0.3, 'rgba(0,0,0,0.18)');
    right.addColorStop(0.65, 'rgba(0,0,0,0.65)');
    right.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = right;
    ctx.fillRect(canvas.width - edgeW, 0, edgeW, canvas.height);

    // Degradado superior.
    var topH = canvas.height * 0.18;
    var top = ctx.createLinearGradient(0, 0, 0, topH);
    top.addColorStop(0, 'rgba(0,0,0,1)');
    top.addColorStop(0.5, 'rgba(0,0,0,0.5)');
    top.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, canvas.width, topH);

    // Degradado inferior.
    var botH = canvas.height * 0.18;
    var bot = ctx.createLinearGradient(0, canvas.height - botH, 0, canvas.height);
    bot.addColorStop(0, 'rgba(0,0,0,0)');
    bot.addColorStop(0.5, 'rgba(0,0,0,0.5)');
    bot.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = bot;
    ctx.fillRect(0, canvas.height - botH, canvas.width, botH);

    ctx.restore();
  };

  /* ---------- Limpieza (editor de temas) ---------- */

  MsiLanding.prototype.destroy = function () {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    this.frames = [];
  };

  /* ---------- Arranque + soporte del editor de temas ---------- */

  function initAll(scope) {
    var roots = (scope || document).querySelectorAll('[data-msi-landing]');
    for (var i = 0; i < roots.length; i++) {
      var el = roots[i];
      if (el.msiInstance) continue;
      el.msiInstance = new MsiLanding(el);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll();
    });
  } else {
    initAll();
  }

  // El personalizador de Shopify recarga secciones dinámicamente.
  document.addEventListener('shopify:section:load', function (e) {
    initAll(e.target);
  });
  document.addEventListener('shopify:section:unload', function (e) {
    var el = e.target.querySelector('[data-msi-landing]');
    if (el && el.msiInstance) {
      el.msiInstance.destroy();
      el.msiInstance = null;
    }
  });
})();
