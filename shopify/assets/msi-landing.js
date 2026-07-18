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
   6. En móvil (<768px) el scrollytelling corre con una variante
      ligera: 61 frames re-escalados (*-frame-m_0001..0061.webp),
      carga progresiva multi-pasada (primer frame como póster,
      interactivo con ~10 frames, el resto rellena por detrás) y
      el bote anclado abajo para no pisar el texto.
   7. Con prefers-reduced-motion (o el ajuste "Animación de scroll
      en móvil" desactivado) no se precarga nada: el CSS muestra
      el fallback estático.
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
    ,{
      id: 'verde',
      prefix: 'verde-frame_',
      base: null,
      zoomFactor: 0.85, stretchX: 1, stretchY: 1,
      accent: '#7bc144', glow: 'rgba(123,193,68,0.8)',
      // Variante móvil: 61 frames re-escalados a 640px de ancho.
      // heightFrac = fracción de la altura del viewport que ocupa el
      // frame; anchorBottom = dónde apoya su base (0-1); maxOverflowX
      // = desborde lateral máximo permitido antes de capar la escala.
      mobile: { prefix: 'verde-frame-m_', count: 61, heightFrac: 0.66, anchorBottom: 0.96, maxOverflowX: 1.0 },
      beats: {
        a: { tag: 'Salud Articular y Ósea', title: 'MAGNESIO<br>COLÁGENO', sub: 'Sinergia total para huesos, piel y articulaciones.' },
        b: { tag: 'Recuperación activa', title: 'Huesos<br>fuertes', sub: 'Colágeno + Magnesio en sinergia para máxima protección articular y ósea.' },
        c: { tag: 'Piel y tejidos', title: 'Piel.<br>Pelo.<br>Uñas.', sub: 'El colágeno que tu cuerpo necesita para mantenerse joven y activo cada día.' },
        d: { tag: 'Empieza hoy', title: '14,90€', sub: 'Envío en 24/48h · 100% Vegano' }
      }
    }
    ,{
      id: 'spray',
      prefix: 'spray-frame_',
      base: null,
      zoomFactor: 1.5, stretchX: 1, stretchY: 1,
      accent: '#c9a84c', glow: 'rgba(201,168,76,0.8)',
      beats: {
        a: { tag: 'Absorción transdérmica', title: 'ACEITE<br>MAGNESIO', sub: 'Absorción directa a través de la piel. Sin pasar por el sistema digestivo.' },
        b: { tag: 'Acción inmediata', title: 'Directo<br>al músculo', sub: 'Sales de magnesio naturales del Balneario de La Higuera. Pureza certificada.' },
        c: { tag: 'Sin cápsulas', title: 'Solo<br>aplica<br>y listo.', sub: '125 ml para uso diario. Ideal para deportistas y personas con problemas de absorción oral.' },
        d: { tag: 'Empieza hoy', title: '14,90€', sub: 'Envío en 24/48h · Sales 100% Naturales' }
      }
    }
    ,{
      // Piloto de modo claro: mismos beats que 'verde', frames sobre
      // fondo blanco (verde-blanco-frame_0001..0121.webp). Se activa
      // con data-color-mode="light" en la sección (ver MsiLanding).
      id: 'verde-blanco',
      prefix: 'verde-blanco-frame_',
      base: null,
      zoomFactor: 1, stretchX: 1, stretchY: 1,
      accent: '#7bc144', glow: 'rgba(123,193,68,0.8)',
      // Secuencia clara apaisada (960x720): se ancla por altura y el
      // sobrante lateral se recorta simétrico al dibujar.
      // heightFrac más alto que en la oscura: el bote ocupa menos alto
      // dentro de este frame apaisado — así el TAMAÑO VISUAL del bote
      // queda igual en ambos temas (consistencia al alternar).
      // maxOverflowX 2.4: con 1.6 el cap reducía la escala en iPhone y
      // el bote claro salía un 20% más pequeño y blando que el oscuro;
      // el bote ocupa el tercio central del frame, el recorte es seguro.
      mobile: { prefix: 'verde-blanco-frame-m_', count: 61, heightFrac: 0.72, anchorBottom: 0.96, maxOverflowX: 2.4 },
      beats: {
        a: { tag: 'Salud Articular y Ósea', title: 'MAGNESIO<br>COLÁGENO', sub: 'Sinergia total para huesos, piel y articulaciones.' },
        b: { tag: 'Recuperación activa', title: 'Huesos<br>fuertes', sub: 'Colágeno + Magnesio en sinergia para máxima protección articular y ósea.' },
        c: { tag: 'Piel y tejidos', title: 'Piel.<br>Pelo.<br>Uñas.', sub: 'El colágeno que tu cuerpo necesita para mantenerse joven y activo cada día.' },
        d: { tag: 'Empieza hoy', title: '14,90€', sub: 'Envío en 24/48h · 100% Vegano' }
      }
    }
  ];

  /* ---------- Utilidades ---------- */

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function pad4(n) {
    return ('0000' + n).slice(-4);
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Hasta 1023px inclusive: cubre móviles y tablets en vertical, donde
  // el bote centrado del layout de escritorio pisaría el texto. Los
  // frames -m (640px) dan nitidez de sobra a estos tamaños con DPR 1.5.
  function isMobileViewport() {
    return window.matchMedia('(max-width: 1023px)').matches;
  }

  // Orden de carga progresiva: primero y último frame, luego pasadas
  // con zancada 8 → 4 → 2 → 1. La primera pasada (~n/8 frames) ya
  // permite animar; las siguientes refinan sin bloquear.
  function buildLoadOrder(n) {
    var seen = new Array(n);
    var out = [];
    var strides = [8, 4, 2, 1];
    function push(i) {
      if (!seen[i]) {
        seen[i] = true;
        out.push(i);
      }
    }
    push(0);
    push(n - 1);
    for (var s = 0; s < strides.length; s++) {
      for (var k = 0; k < n; k += strides[s]) push(k);
    }
    return out;
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

    this.desktopFrameCount = parseInt(root.getAttribute('data-frame-count'), 10) || 121;
    this.frameCount = this.desktopFrameCount;
    // Kill-switch del editor: "Animación de scroll en móvil".
    this.mobileScrollyEnabled = root.getAttribute('data-mobile-scrolly') !== 'false';
    this.mobileLayout = false;
    this.framesBase = root.getAttribute('data-frames-base') || '';
    this.framePrefix = root.getAttribute('data-frame-prefix') || 'frame_';
    this.frameExt = root.getAttribute('data-frame-ext') || '.webp';
    this.framesVLight = root.getAttribute('data-frames-v-light') || '';
    this.framesVmDark = root.getAttribute('data-frames-v-m-dark') || '';
    this.framesVmLight = root.getAttribute('data-frames-v-m-light') || '';
    this.colorMode = root.getAttribute('data-color-mode') || 'dark';
    // La elección del visitante (interruptor) manda sobre el ajuste
    // del editor y sobrevive a la recarga.
    try {
      var stored = window.localStorage.getItem('msi-color-mode');
      if (stored === 'light' || stored === 'dark') this.colorMode = stored;
    } catch (e) { /* localStorage bloqueado (p. ej. navegación privada) */ }
    this.bgColor = this.colorMode === 'light' ? '#fafbfc' : '#000000';
    root.classList.toggle('msi-landing--light', this.colorMode === 'light');
    root.setAttribute('data-color-mode', this.colorMode);

    this.frames = [];
    this.loadedCount = 0;
    this.started = false;
    this.destroyed = false;
    this.current = 0; // posición suavizada (float)
    this.target = 0; //  posición objetivo según scroll (float)
    this.lastDrawn = -1; //    último índice pedido al canvas
    this.lastDrawnSrc = -1; // último frame realmente pintado (nearest)
    this.raf = 0;
    this.running = false;
    this.dpr = 1;
    this.overlayCanvas = null; // viñetas/bordes pre-renderizados

    // Secuencia activa: solo verde (naranja/spray desactivadas). En
    // modo claro se usa su variante sobre fondo blanco.
    this.seq = SEQUENCES.filter(function (s) {
      return s.id === (this.colorMode === 'light' ? 'verde-blanco' : 'verde');
    }, this)[0];

    this.onScroll = this.onScroll.bind(this);
    this.onResize = this.onResize.bind(this);
    this.loop = this.loop.bind(this);
    // Safari puede prerenderizar o restaurar de bfcache sin emitir
    // resize: re-medimos el canvas al volver a ser visibles.
    this.onVisible = function () {
      if (!document.hidden) self.onResize();
    };

    // Interruptor claro/oscuro (estilo iOS).
    var self = this;
    this.swapping = false;
    this.modeToggle = root.querySelector('[data-msi-mode-toggle]');
    if (this.modeToggle) {
      this.modeToggle.setAttribute(
        'aria-checked',
        this.colorMode === 'light' ? 'true' : 'false'
      );
      this.modeToggle.addEventListener('click', function () {
        self.setColorMode(self.colorMode === 'light' ? 'dark' : 'light');
      });
    }

    // El vídeo promocional y los reveals funcionan también en estático.
    this.initPromo();
    this.initReveals();

    if (!this.track || !this.canvas) return;

    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('pageshow', this.onResize, { passive: true });
    document.addEventListener('visibilitychange', this.onVisible);

    if (this.isStatic()) {
      // Reduced motion (o kill-switch móvil apagado): el CSS muestra el
      // fallback estático. Si el viewport cambia, onResize reevalúa.
      return;
    }

    this.applyLayout();
    this.start();
  }

  // ¿Modo estático? Solo por reduced-motion o por el kill-switch del
  // editor en móvil. El móvil "normal" ya corre el scrollytelling.
  MsiLanding.prototype.isStatic = function () {
    return (
      prefersReducedMotion() ||
      (isMobileViewport() && !this.mobileScrollyEnabled)
    );
  };

  // Fija el layout (móvil/escritorio) y el nº de frames de la variante.
  // La clase .is-scrolly NO se pone aquí: se añade en markScrollyReady()
  // cuando el canvas ya tiene su primer frame pintado — hasta entonces
  // el fallback estático hace de póster y nunca se ve un canvas vacío
  // ni un fogonazo al cargar/recargar.
  MsiLanding.prototype.applyLayout = function () {
    this.mobileLayout = isMobileViewport();
    // is-canvas-ready se retira siempre: hasta que el canvas de la nueva
    // variante tenga frame pintado, el poster estático hace de fondo.
    this.root.classList.remove('is-canvas-ready');
    if (!this.mobileLayout) {
      this.root.classList.remove('is-scrolly');
    } else if (this.started) {
      this.root.classList.add('is-scrolly');
    }
    var v = this.activeVariant();
    this.frameCount = v ? v.count : this.desktopFrameCount;
  };

  MsiLanding.prototype.markScrollyReady = function () {
    if (this.mobileLayout) {
      this.root.classList.add('is-scrolly');
      this.root.classList.add('is-canvas-ready');
    }
  };

  MsiLanding.prototype.activeVariant = function () {
    return this.mobileLayout && this.seq && this.seq.mobile
      ? this.seq.mobile
      : null;
  };

  MsiLanding.prototype.start = function () {
    if (this.started || this.destroyed) return;
    this.started = true;

    var self = this;
    // En móvil no hay pantalla de carga: el primer frame hace de póster
    // y el scroll queda operativo desde el principio. (El listener de
    // resize ya se registró en el constructor.)
    var showLoader = !this.mobileLayout;

    if (showLoader && this.loader) this.loader.hidden = false;

    // En móvil reservamos ya el alto de 300vh (.is-scrolly): así la página
    // no pega un salto de layout bajo el dedo cuando llega el frame 0.
    // El poster sigue visible hasta is-canvas-ready (markScrollyReady).
    if (this.mobileLayout) this.root.classList.add('is-scrolly');
    // Dimensiona el bitmap cuanto antes (en escritorio el canvas ya es
    // visible): nunca debe quedar el 300x150 intrínseco en pantalla.
    this.resizeCanvas();

    window.addEventListener('scroll', this.onScroll, { passive: true });

    this.preload({
      onFirst: function () {
        if (self.destroyed) return;
        // Con el primer frame listo, el scrolly sustituye al póster.
        self.markScrollyReady();
        self.resizeCanvas();
        self.onScroll();
      },
      onInteractive: function () {
        if (self.destroyed) return;
        self.onScroll();
        // Escritorio: soltamos el loader con la 1ª pasada (~1/8 de los
        // frames); el resto rellena por detrás sin bloquear.
        if (showLoader) {
          setTimeout(function () {
            self.hideLoader();
          }, 300);
        }
      },
      onComplete: function () {
        if (self.destroyed) return;
        self.onScroll();
        if (showLoader) self.hideLoader();
      }
    });
  };

  /* ---------- Precarga con progreso ---------- */

  MsiLanding.prototype.frameUrl = function (i) {
    var v = this.activeVariant();
    var base = this.seq.base || this.framesBase;
    var prefix = v ? v.prefix : this.seq.prefix || this.framePrefix;
    if (base && base.slice(-1) !== '/') base += '/';
    var url = base + prefix + pad4(i + 1) + this.frameExt;
    // Cache-busters: el ?v= de asset_url cambia al re-subir los archivos,
    // así el navegador/CDN nunca sirve frames rancios con otra geometría.
    if (v) {
      var mv = this.seq.id === 'verde-blanco' ? this.framesVmLight : this.framesVmDark;
      if (mv) url += '?v=' + mv;
    } else if (this.seq.id === 'verde-blanco' && this.framesVLight) {
      url += '?v=' + this.framesVLight;
    }
    return url;
  };

  // Precarga progresiva multi-pasada. hooks = { onFirst, onInteractive,
  // onComplete } — cada uno se dispara una sola vez. La descarga va
  // limitada a 6 conexiones para no saturar la radio del móvil ni
  // bloquear el hilo principal (decoding async).
  MsiLanding.prototype.preload = function (hooks) {
    var self = this;
    var total = this.frameCount;
    var order = buildLoadOrder(total);
    var fill = this.loader
      ? this.loader.querySelector('[data-msi-loader-fill]')
      : null;
    var label = this.loader
      ? this.loader.querySelector('[data-msi-loader-label]')
      : null;
    // Fin de la primera pasada (zancada 8) + primero y último.
    var interactiveAt = Math.min(total, Math.ceil(total / 8) + 2);
    var i = 0;
    var inFlight = 0;
    var MAX_CONCURRENT = 6;
    var firedFirst = false;
    var firedInteractive = false;
    var firedComplete = false;
    var zeroFailed = false;
    // Si la secuencia cambia en mitad (toggle claro/oscuro), esta
    // precarga queda huérfana y se apaga sola.
    var mySeq = this.seq;
    var myVariant = this.activeVariant();

    this.frames = new Array(total);
    this.loadedCount = 0;

    function stale() {
      return (
        self.destroyed ||
        self.seq !== mySeq ||
        self.activeVariant() !== myVariant
      );
    }

    function fire(which) {
      if (which === 'first' && !firedFirst) {
        firedFirst = true;
        if (hooks.onFirst) hooks.onFirst();
      } else if (which === 'interactive' && !firedInteractive) {
        firedInteractive = true;
        if (hooks.onInteractive) hooks.onInteractive();
      } else if (which === 'complete' && !firedComplete) {
        firedComplete = true;
        if (hooks.onComplete) hooks.onComplete();
      }
    }

    function pump() {
      if (stale()) return;
      while (inFlight < MAX_CONCURRENT && i < order.length) {
        (function (idx) {
          inFlight++;
          var img = new Image();
          img.decoding = 'async';
          if (idx === 0 && 'fetchPriority' in img) img.fetchPriority = 'high';
          img.onload = img.onerror = function (e) {
            inFlight--;
            if (stale()) return;
            // Un frame que falle no bloquea la experiencia.
            var ok = e && e.type === 'load';
            if (ok) self.frames[idx] = img;
            if (idx === 0 && !ok) zeroFailed = true;
            self.loadedCount++;
            var pct = Math.round((self.loadedCount / total) * 100);
            if (fill) fill.style.width = pct + '%';
            if (label) label.textContent = pct < 100 ? 'Cargando ' + pct + '%' : 'Listo';
            // 'first' exige un frame REAL: el 0 cargado o, si el 0 falló,
            // el primero que llegue bien. Un onerror solo jamás retira el
            // poster (antes activaba un canvas vacío o con la pose final).
            if (self.frames[0] || (ok && zeroFailed)) fire('first');
            if (firedFirst && self.loadedCount >= interactiveAt) fire('interactive');
            // Si este frame está más cerca del objetivo que el pintado,
            // repinta: la animación se refina sola según llega la red.
            if (self.started) self.repaintIfCloser(idx);
            if (self.loadedCount >= total) fire('complete');
            pump();
          };
          img.src = self.frameUrl(idx);
        })(order[i++]);
      }
    }

    pump();

    // Red de seguridad: si algo se cuelga (red lenta, CDN caído),
    // seguimos a los 20s con lo que haya. fire() es idempotente.
    // Solo si de verdad hay algún frame pintable: con cero frames el
    // poster estático es mejor que un canvas vacío.
    setTimeout(function () {
      if (stale()) return;
      var any = false;
      for (var k = 0; k < self.frames.length; k++) {
        if (self.frames[k]) { any = true; break; }
      }
      if (!any) return;
      fire('first');
      fire('interactive');
      fire('complete');
    }, 20000);
  };

  /* ---------- Cambio de modo claro/oscuro en vivo ---------- */

  MsiLanding.prototype.setColorMode = function (mode) {
    if (mode === this.colorMode || this.swapping) return;
    this.colorMode = mode;
    this.bgColor = mode === 'light' ? '#fafbfc' : '#000000';
    this.root.classList.toggle('msi-landing--light', mode === 'light');
    this.root.setAttribute('data-color-mode', mode);
    if (this.modeToggle) {
      this.modeToggle.setAttribute('aria-checked', mode === 'light' ? 'true' : 'false');
    }
    try { window.localStorage.setItem('msi-color-mode', mode); } catch (e) {}

    // El poster estático por defecto tiene fondo negro (secuencia oscura)
    // o blanco (clara): al cambiar de tema hay que cambiarlo también o
    // queda un rectángulo del color del tema anterior.
    var poster = this.root.querySelector('[data-msi-poster]');
    if (poster) {
      var posterSrc = poster.getAttribute(mode === 'light' ? 'data-src-light' : 'data-src-dark');
      if (posterSrc) poster.setAttribute('src', posterSrc);
    }

    this.seq = SEQUENCES.filter(function (s) {
      return s.id === (mode === 'light' ? 'verde-blanco' : 'verde');
    })[0];

    // En modo estático (móvil / reduced motion) no hay canvas: el CSS
    // ya recoloreó la página y no hay nada más que hacer.
    if (!this.started) return;

    // Recarga la secuencia del nuevo modo y repinta en cuanto hay
    // frames (en móvil sin pantalla de carga; en escritorio se suelta
    // con la primera pasada). El flag "swapping" evita precargas
    // solapadas si se pulsa dos veces seguidas.
    var self = this;
    this.swapping = true;
    this.frames = [];
    this.loadedCount = 0;
    // Las viñetas dependen del tema (bordes negros ↔ blancos).
    this.buildOverlay();
    var showLoader = !this.mobileLayout;
    if (showLoader && this.loader) {
      this.loader.classList.remove('is-leaving');
      this.loader.hidden = false;
    }

    function repaint() {
      self.lastDrawn = -1;
      self.lastDrawnSrc = -1;
      self.drawFrame(Math.round(self.current));
      self.lastDrawn = Math.round(self.current);
    }

    this.preload({
      onFirst: function () {
        if (self.destroyed) return;
        // Si el toggle llegó ANTES de que el preload inicial disparase su
        // onFirst (quedó stale y muere sin bootear), este preload asume el
        // arranque: sin esto el scrolly no se activaba nunca en móvil.
        self.markScrollyReady();
        self.resizeCanvas();
        repaint();
      },
      onInteractive: function () {
        if (self.destroyed) return;
        self.swapping = false;
        repaint();
        if (showLoader) self.hideLoader();
      },
      onComplete: function () {
        if (self.destroyed) return;
        self.swapping = false;
        repaint();
        if (showLoader) self.hideLoader();
      }
    });
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
    // DPR capado más bajo en móvil: mitad de píxeles que procesar por
    // frame y ninguna diferencia visible con los frames de 640px.
    this.dpr = Math.min(window.devicePixelRatio || 1, this.mobileLayout ? 1.5 : 2);
    var w = Math.round(canvas.offsetWidth * this.dpr);
    var h = Math.round(canvas.offsetHeight * this.dpr);
    // Canvas oculto (display:none) u hoja de estilos sin aplicar: medir
    // daría 0x0 y mataría el bitmap. Se re-medirá al ser visible.
    if (!w || !h) return;
    // Guarda anti-thrash: iOS emite resize sin cambio real de tamaño.
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    this.buildOverlay();
    this.lastDrawn = -1;
    this.drawFrame(Math.round(this.current));
    this.lastDrawn = Math.round(this.current);
  };

  // Resize con debounce: reevalúa modo estático, cruce de breakpoint
  // móvil↔escritorio (recarga la variante de frames adecuada) o un
  // simple cambio de tamaño.
  MsiLanding.prototype.onResize = function () {
    var self = this;
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(function () {
      self.handleResize();
    }, 200);
  };

  MsiLanding.prototype.handleResize = function () {
    if (this.destroyed) return;
    if (this.isStatic()) return; // el CSS del fallback manda

    if (!this.started) {
      // Estábamos en modo estático y ahora hay hueco para animar.
      this.applyLayout();
      this.start();
      return;
    }

    var wasMobile = this.mobileLayout;
    if (isMobileViewport() !== wasMobile) {
      // Cruce de breakpoint: cambia la variante (61 ↔ 121 frames).
      this.applyLayout();
      this.reloadFrames();
      return;
    }

    this.resizeCanvas();
  };

  // Recarga la secuencia activa tras un cruce de breakpoint (mismo
  // patrón que el cambio de tema, sin tocar el modo de color).
  MsiLanding.prototype.reloadFrames = function () {
    var self = this;
    // El cruce de breakpoint deja stale al preload anterior: sus hooks de
    // hideLoader/swapping ya no dispararán. Reseteamos aquí o el loader
    // se queda tapando la página (iPad rotado) y el toggle muere.
    this.swapping = false;
    if (this.loader) this.loader.hidden = true;
    this.frames = [];
    this.loadedCount = 0;
    this.current = 0;
    this.target = 0;
    this.preload({
      onFirst: function () {
        if (self.destroyed) return;
        self.markScrollyReady();
        self.resizeCanvas();
        self.lastDrawn = -1;
        self.lastDrawnSrc = -1;
        self.drawFrame(Math.round(self.current));
        self.lastDrawn = Math.round(self.current);
        self.onScroll();
      },
      onInteractive: null,
      onComplete: function () {
        if (self.destroyed) return;
        self.onScroll();
      }
    });
  };

  // Frame cargado más cercano al pedido (búsqueda en anillos ±d).
  MsiLanding.prototype.nearestLoaded = function (idx) {
    if (this.frames[idx]) return idx;
    for (var d = 1; d < this.frameCount; d++) {
      if (idx - d >= 0 && this.frames[idx - d]) return idx - d;
      if (idx + d < this.frameCount && this.frames[idx + d]) return idx + d;
    }
    return -1;
  };

  // Al llegar un frame nuevo: si mejora al que hay en pantalla, repinta.
  MsiLanding.prototype.repaintIfCloser = function (loadedIdx) {
    var want = Math.round(this.current);
    var have = this.lastDrawnSrc;
    if (have === want && this.frames[want]) return;
    // Nada pintado aún y el que llega queda lejos del objetivo (p. ej. el
    // último de la secuencia): mejor esperar con el poster que enseñar la
    // pose final y dar un salto brusco cuando llegue el frame bueno.
    if (have < 0 && !this.frames[want] && Math.abs(loadedIdx - want) > 12) return;
    if (have < 0 || Math.abs(loadedIdx - want) < Math.abs(have - want)) {
      this.drawFrame(want);
      this.lastDrawn = want;
    }
  };

  // Pre-renderiza las capas estáticas (viñeta radial, bordes izq/dcha,
  // degradados superior/inferior) en un canvas offscreen. Dependen solo
  // del tamaño y del tema, así que crearlas por frame era tirar CPU —
  // clave para que el scroll no dé tirones en móviles baratos.
  MsiLanding.prototype.buildOverlay = function () {
    var canvas = this.canvas;
    if (!canvas.width || !canvas.height) {
      this.overlayCanvas = null;
      return;
    }
    var off = document.createElement('canvas');
    off.width = canvas.width;
    off.height = canvas.height;
    var ctx = off.getContext('2d');
    if (!ctx) {
      this.overlayCanvas = null;
      return;
    }

    var edgeRGB = this.colorMode === 'light' ? '255,255,255' : '0,0,0';
    var cx = off.width / 2;
    var cy = off.height / 2;

    // Viñeta radial.
    var outerR = Math.sqrt(cx * cx + cy * cy) * 1.1;
    var innerR = Math.min(off.width, off.height) * 0.25;
    var radial = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    radial.addColorStop(0, 'rgba(' + edgeRGB + ',0)');
    radial.addColorStop(0.35, 'rgba(' + edgeRGB + ',0)');
    radial.addColorStop(0.58, 'rgba(' + edgeRGB + ',0.35)');
    radial.addColorStop(0.76, 'rgba(' + edgeRGB + ',0.7)');
    radial.addColorStop(1.0, 'rgba(' + edgeRGB + ',0.95)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, off.width, off.height);

    // Gradiente de borde izquierdo.
    var edgeW = off.width * 0.2;
    var left = ctx.createLinearGradient(0, 0, edgeW, 0);
    left.addColorStop(0, 'rgba(' + edgeRGB + ',1)');
    left.addColorStop(0.35, 'rgba(' + edgeRGB + ',0.65)');
    left.addColorStop(0.7, 'rgba(' + edgeRGB + ',0.18)');
    left.addColorStop(1, 'rgba(' + edgeRGB + ',0)');
    ctx.fillStyle = left;
    ctx.fillRect(0, 0, edgeW, off.height);

    // Gradiente de borde derecho.
    var right = ctx.createLinearGradient(off.width - edgeW, 0, off.width, 0);
    right.addColorStop(0, 'rgba(' + edgeRGB + ',0)');
    right.addColorStop(0.3, 'rgba(' + edgeRGB + ',0.18)');
    right.addColorStop(0.65, 'rgba(' + edgeRGB + ',0.65)');
    right.addColorStop(1, 'rgba(' + edgeRGB + ',1)');
    ctx.fillStyle = right;
    ctx.fillRect(off.width - edgeW, 0, edgeW, off.height);

    // Degradado superior — en móvil se reduce: la franja de texto ya
    // trae su propio scrim en CSS y aquí solo hace falta un matiz.
    var topH = off.height * (this.mobileLayout ? 0.1 : 0.18);
    var top = ctx.createLinearGradient(0, 0, 0, topH);
    top.addColorStop(0, 'rgba(' + edgeRGB + ',1)');
    top.addColorStop(0.5, 'rgba(' + edgeRGB + ',0.5)');
    top.addColorStop(1, 'rgba(' + edgeRGB + ',0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, off.width, topH);

    // Degradado inferior.
    var botH = off.height * 0.18;
    var bot = ctx.createLinearGradient(0, off.height - botH, 0, off.height);
    bot.addColorStop(0, 'rgba(' + edgeRGB + ',0)');
    bot.addColorStop(0.5, 'rgba(' + edgeRGB + ',0.5)');
    bot.addColorStop(1, 'rgba(' + edgeRGB + ',1)');
    ctx.fillStyle = bot;
    ctx.fillRect(0, off.height - botH, off.width, botH);

    this.overlayCanvas = off;
  };

  // Dibuja el frame pedido (o el cargado más cercano, si aún no llegó)
  // + los overlays. Escritorio: fit "contain" con zoomFactor y estirado
  // opcional. Móvil: fit por ALTURA con el bote anclado abajo, para que
  // nunca comparta píxeles con la franja de texto superior. Las capas
  // estáticas (viñeta/bordes) vienen pre-renderizadas de buildOverlay.
  MsiLanding.prototype.drawFrame = function (frameIndex) {
    var canvas = this.canvas;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    // AUTOCURACIÓN (bug del primer viaje): si el bitmap no corresponde a
    // la caja CSS actual — p. ej. se midió con la stylesheet aún sin
    // aplicar (Safari en frío ejecuta el defer sin esperar al CSS), tras
    // un prerender/bfcache sin evento resize, o quedó el 300x150
    // intrínseco — redimensiona antes de pintar. resizeCanvas repinta él
    // mismo; sin esta guarda el navegador estira el bitmap y el bote
    // sale deforme hasta el siguiente resize real.
    if (canvas.offsetWidth) {
      var expW = Math.round(canvas.offsetWidth * (this.dpr || 1));
      var expH = Math.round(canvas.offsetHeight * (this.dpr || 1));
      if (canvas.width !== expW || canvas.height !== expH) {
        this.resizeCanvas();
        return;
      }
    }

    var dpr = this.dpr || Math.min(window.devicePixelRatio || 1, 2);
    var W = canvas.width / dpr;
    var H = canvas.height / dpr;

    // El fondo se pinta SIEMPRE: un canvas transparente/vacío es peor
    // que un fondo plano si aún no hay ningún frame descargado.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var srcIdx = this.nearestLoaded(frameIndex);
    if (srcIdx < 0) return;
    var img = this.frames[srcIdx];
    this.lastDrawnSrc = srcIdx;

    var imgW = img.naturalWidth;
    var imgH = img.naturalHeight;
    if (!imgW || !imgH) return;

    var v = this.activeVariant();
    var scale, drawW, drawH, dx, dy;
    if (v) {
      // Móvil: el frame ocupa heightFrac de la altura y su base apoya
      // en anchorBottom. Si la secuencia es apaisada, el desborde
      // lateral se capa a maxOverflowX (recorte simétrico).
      scale = (H * v.heightFrac) / imgH;
      if (imgW * scale > W * v.maxOverflowX) {
        scale = (W * v.maxOverflowX) / imgW;
      }
      drawW = imgW * scale;
      drawH = imgH * scale;
      dx = (W - drawW) / 2;
      dy = H * v.anchorBottom - drawH;
    } else {
      // Escritorio: "contain" + zoom de la secuencia.
      scale = Math.min(W / imgW, H / imgH) * this.seq.zoomFactor;
      drawW = imgW * scale;
      drawH = imgH * scale;
      dx = (W - drawW) / 2;
      dy = (H - drawH) / 2;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Estirado horizontal de la secuencia naranja (35% más ancha,
    // 15% más baja), aplicado alrededor del centro de la imagen.
    if (!v && (this.seq.stretchX !== 1 || this.seq.stretchY !== 1)) {
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
    // Dinámico porque compone contra el frame recién pintado.
    var sharpR = Math.min(canvas.width, canvas.height) * 0.28;
    var sharpen = ctx.createRadialGradient(cx, cy, 0, cx, cy, sharpR);
    sharpen.addColorStop(0, 'rgba(255,255,255,0.04)');
    sharpen.addColorStop(0.6, 'rgba(255,255,255,0.01)');
    sharpen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = sharpen;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';

    // Viñeta radial + bordes + degradados: pre-renderizados una vez.
    if (!this.overlayCanvas) this.buildOverlay();
    if (this.overlayCanvas) ctx.drawImage(this.overlayCanvas, 0, 0);

    // Viñeta de marca: anillo exterior teñido de verde que interpola
    // entre los dos verdes de la paleta según el avance del scroll.
    // Alpha bajo a propósito — es un matiz, no un marco. Va sobre el
    // índice PEDIDO (no el sustituto) para que el matiz siga al scroll.
    var outerR = Math.sqrt(cx * cx + cy * cy) * 1.1;
    var innerR = Math.min(canvas.width, canvas.height) * 0.25;
    var t = this.frameCount > 1 ? frameIndex / (this.frameCount - 1) : 0;
    var gr = Math.round(114 + (86 - 114) * t);  /* #72d52c → #56bf18 */
    var gg = Math.round(213 + (191 - 213) * t);
    var gb = Math.round(44 + (24 - 44) * t);
    var tintRGB = gr + ',' + gg + ',' + gb;
    var tint = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    tint.addColorStop(0, 'rgba(' + tintRGB + ',0)');
    tint.addColorStop(0.55, 'rgba(' + tintRGB + ',0)');
    tint.addColorStop(0.8, 'rgba(' + tintRGB + ',0.08)');
    tint.addColorStop(1, 'rgba(' + tintRGB + ',0.16)');
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.restore();
  };

  /* ---------- Vídeo promocional (autoplay en viewport) ---------- */

  MsiLanding.prototype.initPromo = function () {
    var section = this.root.querySelector('[data-msi-promo]');
    var video = this.root.querySelector('[data-msi-promo-video]');
    if (!section || !video) return;

    // Reduced motion: solo el póster; el CSS deja el overlay visible.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    function tryPlay() {
      video.muted = true; // garantiza el autoplay en todos los navegadores
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* autoplay bloqueado: queda el póster */ });
    }

    if (!('IntersectionObserver' in window)) {
      section.classList.add('is-visible');
      tryPlay();
      return;
    }

    this.promoObserver = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          section.classList.add('is-visible');
          tryPlay();
        } else {
          video.pause();
        }
      }
    }, { threshold: 0.25 });
    this.promoObserver.observe(section);
  };

  /* ---------- Reveals de secciones (IntersectionObserver) ---------- */

  MsiLanding.prototype.initReveals = function () {
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;
    var els = this.root.querySelectorAll('[data-msi-reveal]');
    if (!els.length) return;
    // La clase gate activa el estado oculto SOLO cuando el JS está listo:
    // sin JS (o sin IO) nada queda invisible.
    this.root.classList.add('msi-reveal-ready');
    this.revealObserver = new IntersectionObserver(
      function (entries, observer) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            entries[i].target.classList.add('is-inview');
            observer.unobserve(entries[i].target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
    );
    for (var i = 0; i < els.length; i++) {
      this.revealObserver.observe(els[i]);
    }
  };

  /* ---------- Limpieza (editor de temas) ---------- */

  MsiLanding.prototype.destroy = function () {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this._resizeTimer);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pageshow', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisible);
    if (this.promoObserver) {
      this.promoObserver.disconnect();
      this.promoObserver = null;
    }
    if (this.revealObserver) {
      this.revealObserver.disconnect();
      this.revealObserver = null;
    }
    this.frames = [];
    this.overlayCanvas = null;
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
