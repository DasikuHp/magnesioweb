/* ============================================================
   MSI Cart Drawer — intercepta los enlaces GET /cart/add de la
   landing y los convierte en POST AJAX + drawer lateral.

   Principios:
   - La compra NUNCA se bloquea: si el fetch falla por red u otro
     error, se navega al href original (comportamiento actual).
     Solo el 422 (sin stock) se muestra dentro del drawer.
   - Cero datos hardcodeados: catálogo, precios y stock vienen del
     JSON #msi-drawer-data que emite el snippet Liquid.
   - IIFE vanilla, sin dependencias, sin bloquear el hilo.
   ============================================================ */
(function () {
  'use strict';

  if (window.__msiCartDrawerInit) return;
  window.__msiCartDrawerInit = true;

  var GENERIC_ERROR = 'No se ha podido actualizar el carrito. Inténtalo de nuevo.';
  var CLOSE_MS = 400;

  function init() {
    if (!window.fetch || !document.querySelector || !Element.prototype.closest) return;

    var dataEl = document.getElementById('msi-drawer-data');
    var root = document.querySelector('[data-msi-drawer-root]');
    if (!dataEl || !root) return;

    var config;
    try {
      config = JSON.parse(dataEl.textContent);
    } catch (err) {
      return; /* sin datos válidos: los enlaces siguen navegando por GET */
    }
    if (!config || !config.endpoints || !config.endpoints.add) return;

    var products = [];
    var productsByHandle = {};
    (config.products || []).forEach(function (p) {
      if (!p || !p.handle || !p.variantId) return;
      products.push(p);
      productsByHandle[p.handle] = p;
    });

    var els = {
      root: root,
      overlay: root.querySelector('[data-msi-drawer-overlay]'),
      drawer: root.querySelector('[data-msi-drawer]'),
      closeBtn: root.querySelector('[data-msi-drawer-close]'),
      count: root.querySelector('[data-msi-drawer-count]'),
      error: root.querySelector('[data-msi-drawer-error]'),
      shipbar: root.querySelector('[data-msi-drawer-shipbar]'),
      shipbarLabel: root.querySelector('[data-msi-drawer-shipbar-label]'),
      shipbarTrack: root.querySelector('[data-msi-drawer-shipbar-track]'),
      shipbarFill: root.querySelector('[data-msi-drawer-shipbar-fill]'),
      items: root.querySelector('[data-msi-drawer-items]'),
      empty: root.querySelector('[data-msi-drawer-empty]'),
      upsell: root.querySelector('[data-msi-drawer-upsell]'),
      upsellList: root.querySelector('[data-msi-drawer-upsell-list]'),
      subtotal: root.querySelector('[data-msi-drawer-subtotal]'),
      checkout: root.querySelector('[data-msi-drawer-checkout]')
    };
    if (!els.drawer || !els.items || !els.subtotal) return;

    var state = {
      open: false,
      busy: false,
      cart: null,
      lastFocus: null,
      hideTimer: null,
      prevOverflow: ''
    };

    /* ---------------- Utilidades ---------------- */

    function el(tag, className, text) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    }

    function reducedMotion() {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function groupThousands(intPart, sep) {
      return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    }

    function formatMoney(cents) {
      if (typeof cents !== 'number' || !isFinite(cents)) cents = 0;
      var fixed = (Math.round(cents) / 100).toFixed(2);
      var parts = fixed.split('.');
      var dot = groupThousands(parts[0], ',') + '.' + parts[1];
      var comma = groupThousands(parts[0], '.') + ',' + parts[1];
      var noDec = groupThousands(String(Math.round(cents / 100)), '.');
      var format = String(config.moneyFormat || '').replace(/<[^>]*>/g, '');
      if (format.indexOf('{{') === -1) return comma + ' €';
      return format
        .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/g, comma)
        .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/g, noDec)
        .replace(/\{\{\s*amount_no_decimals\s*\}\}/g, noDec)
        .replace(/\{\{\s*amount\s*\}\}/g, dot);
    }

    /* ---------------- API AJAX de Shopify ---------------- */

    function request(url, options) {
      var opts = options || {};
      opts.credentials = 'same-origin';
      opts.headers = opts.headers || {};
      opts.headers['Accept'] = 'application/json';
      opts.headers['X-Requested-With'] = 'XMLHttpRequest';
      if (opts.body) opts.headers['Content-Type'] = 'application/json';
      return window.fetch(url, opts).then(function (response) {
        return response.json().then(
          function (json) { return { ok: response.ok, status: response.status, json: json }; },
          function () { return { ok: response.ok, status: response.status, json: null }; }
        );
      });
    }

    function getCart() {
      return request(config.endpoints.cart + '.js', { method: 'GET' });
    }

    function addItem(id, quantity) {
      return request(config.endpoints.add + '.js', {
        method: 'POST',
        body: JSON.stringify({ items: [{ id: Number(id), quantity: quantity }] })
      });
    }

    function changeLine(line, quantity) {
      return request(config.endpoints.change + '.js', {
        method: 'POST',
        body: JSON.stringify({ line: line, quantity: quantity })
      });
    }

    /* ---------------- Estado UI ---------------- */

    function setBusy(flag) {
      state.busy = flag;
      els.drawer.classList.toggle('is-busy', flag);
      els.drawer.setAttribute('aria-busy', flag ? 'true' : 'false');
    }

    function showError(msg) {
      if (!els.error) return;
      els.error.textContent = msg || GENERIC_ERROR;
      els.error.hidden = false;
    }

    function clearError() {
      if (!els.error) return;
      els.error.hidden = true;
      els.error.textContent = '';
    }

    function syncCount(n) {
      var value = typeof n === 'number' && isFinite(n) ? n : 0;
      if (els.count) els.count.textContent = '(' + value + ')';
      var nodes = document.querySelectorAll('[data-msi-cart-count]');
      Array.prototype.forEach.call(nodes, function (node) {
        node.textContent = String(value);
      });
    }

    function flashSubtotal() {
      if (reducedMotion()) return;
      els.subtotal.classList.remove('is-flash');
      void els.subtotal.offsetWidth;
      els.subtotal.classList.add('is-flash');
    }

    /* ---------------- Render ---------------- */

    function buildItem(item, index) {
      var title = item.product_title || item.title || '';
      var li = el('li', 'msi-drawer-item');

      var imgWrap = el('div', 'msi-drawer-item-img');
      var meta = productsByHandle[item.handle];
      var src = meta && meta.imgSrc ? meta.imgSrc : (item.image || '');
      if (src) {
        var img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.loading = 'lazy';
        img.width = 56;
        img.height = 74;
        imgWrap.appendChild(img);
      }
      li.appendChild(imgWrap);

      var info = el('div', 'msi-drawer-item-info');
      info.appendChild(el('p', 'msi-drawer-item-title', title));
      info.appendChild(el('p', 'msi-drawer-item-price', formatMoney(item.price) + ' / ud.'));

      var controls = el('div', 'msi-drawer-item-controls');
      var stepper = el('div', 'msi-drawer-stepper');
      var line = index + 1;

      var dec = el('button', 'msi-drawer-step', '−');
      dec.type = 'button';
      dec.setAttribute('data-msi-drawer-action', 'dec');
      dec.setAttribute('data-msi-line', String(line));
      dec.setAttribute('data-msi-qty', String(item.quantity));
      dec.setAttribute('aria-label', 'Reducir cantidad de ' + title);
      stepper.appendChild(dec);

      var qty = el('span', 'msi-drawer-qty', String(item.quantity));
      qty.setAttribute('aria-label', 'Cantidad: ' + item.quantity);
      stepper.appendChild(qty);

      var inc = el('button', 'msi-drawer-step', '+');
      inc.type = 'button';
      inc.setAttribute('data-msi-drawer-action', 'inc');
      inc.setAttribute('data-msi-line', String(line));
      inc.setAttribute('data-msi-qty', String(item.quantity));
      inc.setAttribute('aria-label', 'Aumentar cantidad de ' + title);
      stepper.appendChild(inc);
      controls.appendChild(stepper);

      var remove = el('button', 'msi-drawer-item-remove', 'Eliminar');
      remove.type = 'button';
      remove.setAttribute('data-msi-drawer-action', 'remove');
      remove.setAttribute('data-msi-line', String(line));
      remove.setAttribute('aria-label', 'Eliminar ' + title + ' del carrito');
      controls.appendChild(remove);

      info.appendChild(controls);
      li.appendChild(info);

      var lineTotal = item.final_line_price != null ? item.final_line_price : item.line_price;
      li.appendChild(el('div', 'msi-drawer-item-total', formatMoney(lineTotal)));
      return li;
    }

    function renderItems(cart) {
      els.items.textContent = '';
      var frag = document.createDocumentFragment();
      cart.items.forEach(function (item, index) {
        frag.appendChild(buildItem(item, index));
      });
      els.items.appendChild(frag);
    }

    function setProgress(pct) {
      if (els.shipbarFill) els.shipbarFill.style.width = pct + '%';
      if (els.shipbarTrack) els.shipbarTrack.setAttribute('aria-valuenow', String(pct));
    }

    function renderShipbar(cart) {
      if (!els.shipbar || !els.shipbarLabel) return;
      var fs = config.freeShipping || {};
      var threshold = Number(fs.threshold) || 0;
      var hasPack = cart.items.some(function (it) { return it.handle === fs.handle; });

      /* Portes gratis reales: solo si el Pack de 6 está en el carrito. */
      if (threshold > 0 && hasPack) {
        els.shipbar.hidden = false;
        els.shipbar.classList.add('is-complete');
        els.shipbarLabel.textContent = 'PORTES GRATIS incluidos con tu Pack de 6 ✓';
        setProgress(100);
        return;
      }
      /* Incentivo: solo si el Pack de 6 se puede comprar hoy. */
      if (threshold > 0 && fs.available && cart.item_count > 0 && cart.total_price < threshold) {
        els.shipbar.hidden = false;
        els.shipbar.classList.remove('is-complete');
        var remaining = threshold - cart.total_price;
        els.shipbarLabel.textContent =
          'Te faltan ' + formatMoney(remaining) + ' para PORTES GRATIS con el Pack de 6';
        setProgress(Math.max(4, Math.min(96, Math.round((cart.total_price / threshold) * 100))));
        return;
      }
      els.shipbar.hidden = true;
    }

    function buildUpsellCard(p) {
      var card = el('div', 'msi-drawer-upsell-card');

      var imgWrap = el('div', 'msi-drawer-upsell-img');
      if (p.imgSrc) {
        var img = document.createElement('img');
        img.src = p.imgSrc;
        img.alt = '';
        img.loading = 'lazy';
        img.width = 42;
        img.height = 54;
        imgWrap.appendChild(img);
      }
      card.appendChild(imgWrap);

      var info = el('div', 'msi-drawer-upsell-info');
      info.appendChild(el('p', 'msi-drawer-upsell-name', p.title));
      var meta = el('p', 'msi-drawer-upsell-meta');
      meta.appendChild(el('span', 'msi-drawer-upsell-price', p.priceFormatted || formatMoney(p.price)));
      if (p.savingsFormatted) {
        meta.appendChild(el('span', 'msi-drawer-upsell-savings', 'Ahorras ' + p.savingsFormatted));
      }
      if (p.freeShipping) {
        meta.appendChild(el('span', 'msi-drawer-upsell-free', 'PORTES GRATIS'));
      }
      info.appendChild(meta);
      card.appendChild(info);

      var btn = el('button', 'msi-drawer-upsell-add', 'Añadir');
      btn.type = 'button';
      btn.setAttribute('data-msi-drawer-action', 'upsell-add');
      btn.setAttribute('data-msi-variant', String(p.variantId));
      btn.setAttribute('aria-label', 'Añadir ' + p.title + ' al carrito');
      card.appendChild(btn);
      return card;
    }

    function renderUpsell(cart) {
      if (!els.upsell || !els.upsellList) return;
      var inCart = {};
      cart.items.forEach(function (it) { inCart[it.handle] = true; });
      /* Solo lo que hay: agotados fuera. Prioridad: mayor ahorro, luego mayor precio. */
      var candidates = products
        .filter(function (p) { return p.available && !inCart[p.handle]; })
        .sort(function (a, b) { return (b.savings - a.savings) || (b.price - a.price); })
        .slice(0, 2);
      els.upsellList.textContent = '';
      if (!candidates.length) {
        els.upsell.hidden = true;
        return;
      }
      els.upsell.hidden = false;
      var frag = document.createDocumentFragment();
      candidates.forEach(function (p) { frag.appendChild(buildUpsellCard(p)); });
      els.upsellList.appendChild(frag);
    }

    function render(cart) {
      if (!cart || !cart.items) return;
      state.cart = cart;
      syncCount(cart.item_count || 0);
      renderItems(cart);
      renderShipbar(cart);
      renderUpsell(cart);
      els.subtotal.textContent = formatMoney(cart.total_price || 0);

      var isEmpty = cart.items.length === 0;
      if (els.empty) els.empty.hidden = !isEmpty;
      if (els.checkout) {
        els.checkout.classList.toggle('is-disabled', isEmpty);
        if (isEmpty) {
          els.checkout.setAttribute('aria-disabled', 'true');
          els.checkout.setAttribute('tabindex', '-1');
        } else {
          els.checkout.removeAttribute('aria-disabled');
          els.checkout.removeAttribute('tabindex');
        }
      }
    }

    function refreshCart() {
      return getCart().then(function (res) {
        if (res.ok && res.json) render(res.json);
      });
    }

    /* ---------------- Abrir / cerrar ---------------- */

    function focusables() {
      var nodes = els.drawer.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      return Array.prototype.filter.call(nodes, function (n) {
        return (n.offsetWidth > 0 || n.offsetHeight > 0) && n.getAttribute('tabindex') !== '-1';
      });
    }

    function openDrawer() {
      if (state.open) return;
      if (state.hideTimer) {
        window.clearTimeout(state.hideTimer);
        state.hideTimer = null;
      }
      state.lastFocus = document.activeElement;
      els.root.hidden = false;
      void els.drawer.offsetWidth; /* reflow para que la transición arranque */
      els.root.classList.add('is-open');
      state.open = true;
      state.prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      if (els.closeBtn) els.closeBtn.focus();
    }

    function closeDrawer() {
      if (!state.open) return;
      state.open = false;
      els.root.classList.remove('is-open');
      document.body.style.overflow = state.prevOverflow || '';
      clearError();
      var delay = reducedMotion() ? 0 : CLOSE_MS;
      state.hideTimer = window.setTimeout(function () {
        els.root.hidden = true;
        state.hideTimer = null;
      }, delay);
      if (state.lastFocus && typeof state.lastFocus.focus === 'function') {
        state.lastFocus.focus();
      }
    }

    /* ---------------- Acciones ---------------- */

    function handleAnchorAdd(id, quantity, anchor) {
      if (state.busy) return;
      setBusy(true);
      anchor.classList.add('is-msi-adding');

      function fallbackNavigate() {
        window.location.href = anchor.href;
      }

      addItem(id, quantity)
        .then(function (res) {
          anchor.classList.remove('is-msi-adding');
          if (res.ok) {
            return getCart().then(function (cartRes) {
              setBusy(false);
              if (cartRes.ok && cartRes.json) {
                clearError();
                render(cartRes.json);
                openDrawer();
                flashSubtotal();
              } else {
                fallbackNavigate(); /* añadido OK pero sin estado: /cart lo enseña */
              }
            });
          }
          setBusy(false);
          if (res.status === 422) {
            var msg = (res.json && (res.json.description || res.json.message)) || GENERIC_ERROR;
            return getCart().then(function (cartRes) {
              if (cartRes.ok && cartRes.json) render(cartRes.json);
              showError(msg);
              openDrawer();
            });
          }
          fallbackNavigate();
        })
        .catch(function () {
          anchor.classList.remove('is-msi-adding');
          setBusy(false);
          fallbackNavigate(); /* la compra nunca se bloquea */
        });
    }

    function handleUpsellAdd(variantId, btn) {
      if (state.busy || !variantId) return;
      setBusy(true);
      if (btn) btn.classList.add('is-msi-adding');

      function done() {
        setBusy(false);
        if (btn) btn.classList.remove('is-msi-adding');
      }

      addItem(variantId, 1)
        .then(function (res) {
          if (res.ok) {
            return getCart().then(function (cartRes) {
              done();
              if (cartRes.ok && cartRes.json) {
                clearError();
                render(cartRes.json);
                flashSubtotal();
              } else {
                showError(GENERIC_ERROR);
              }
            });
          }
          done();
          var msg = res.status === 422 && res.json && (res.json.description || res.json.message);
          showError(msg || GENERIC_ERROR);
          return refreshCart();
        })
        .catch(function () {
          done();
          showError(GENERIC_ERROR);
        });
    }

    function handleChange(line, quantity) {
      if (state.busy) return;
      setBusy(true);
      changeLine(line, quantity)
        .then(function (res) {
          setBusy(false);
          if (res.ok && res.json) {
            clearError();
            render(res.json);
            return;
          }
          var msg = res.status === 422 && res.json && (res.json.description || res.json.message);
          showError(msg || GENERIC_ERROR);
          return refreshCart();
        })
        .catch(function () {
          setBusy(false);
          showError(GENERIC_ERROR);
        });
    }

    /* ---------------- Eventos ---------------- */

    /* Interceptación de los enlaces GET /cart/add de la landing. */
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; /* respeta abrir en pestaña nueva */
      var anchor = e.target && e.target.closest ? e.target.closest('a[href*="/cart/add"]') : null;
      if (!anchor || !anchor.closest('[data-msi-landing]')) return;

      var url;
      try {
        url = new URL(anchor.href, window.location.origin);
      } catch (err) {
        return;
      }
      var id = url.searchParams.get('id');
      if (!id) return;
      var quantity = parseInt(url.searchParams.get('quantity'), 10);
      if (!quantity || quantity < 1) quantity = 1;

      e.preventDefault();
      handleAnchorAdd(id, quantity, anchor);
    });

    /* Delegación dentro del drawer: cerrar, stepper, eliminar, upsell. */
    els.drawer.addEventListener('click', function (e) {
      var target = e.target && e.target.closest ? e.target.closest('[data-msi-drawer-action]') : null;
      if (!target) return;
      var action = target.getAttribute('data-msi-drawer-action');
      if (action === 'close') {
        closeDrawer();
        return;
      }
      if (action === 'upsell-add') {
        handleUpsellAdd(target.getAttribute('data-msi-variant'), target);
        return;
      }
      var line = parseInt(target.getAttribute('data-msi-line'), 10);
      if (!line) return;
      var qty = parseInt(target.getAttribute('data-msi-qty'), 10) || 1;
      if (action === 'inc') handleChange(line, Math.min(qty + 1, 99));
      else if (action === 'dec') handleChange(line, Math.max(qty - 1, 0));
      else if (action === 'remove') handleChange(line, 0);
    });

    if (els.overlay) els.overlay.addEventListener('click', closeDrawer);

    if (els.checkout) {
      els.checkout.addEventListener('click', function (e) {
        if (state.cart && state.cart.item_count === 0) e.preventDefault();
      });
    }

    els.subtotal.addEventListener('animationend', function () {
      els.subtotal.classList.remove('is-flash');
    });

    /* Escape + trampa de foco (aria-modal). */
    document.addEventListener('keydown', function (e) {
      if (!state.open) return;
      if (e.key === 'Escape' || e.key === 'Esc') {
        closeDrawer();
        return;
      }
      if (e.key !== 'Tab') return;
      var nodes = focusables();
      if (!nodes.length) return;
      var first = nodes[0];
      var last = nodes[nodes.length - 1];
      var active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !els.drawer.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !els.drawer.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    });

    /* Al volver por bfcache (p. ej. desde /cart), re-sincroniza el estado. */
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      refreshCart().catch(function () {});
    });

    /* Contador inicial (si existe [data-msi-cart-count] en la página). */
    if (typeof config.cartCount === 'number') syncCount(config.cartCount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
