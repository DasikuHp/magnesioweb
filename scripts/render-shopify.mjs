// Renderiza la landing del tema de Shopify (shopify/) a HTML estático, fuera de
// Shopify, para la demo de GitHub Pages. Los filtros y etiquetas propios de Shopify
// (asset_url, money, {% form %}...) se simulan; los productos usan los valores por
// defecto de la sección. Uso: node scripts/render-shopify.mjs shopify site
import fs from 'node:fs';
import path from 'node:path';
import { Liquid, Tag } from 'liquidjs';

const SRC = path.resolve(process.argv[2]);
const OUT = path.resolve(process.argv[3]);
const read = (p) => fs.readFileSync(path.join(SRC, p), 'utf-8');

const engine = new Liquid({
  root: [path.join(SRC, 'snippets')],
  extname: '.liquid',
  strictFilters: false,
  strictVariables: false,
  jsTruthy: false,
});

// Argumentos con nombre de Liquid (clave: valor) llegan como [clave, valor].
const kw = (args) => Object.fromEntries(args.filter(Array.isArray));

engine.registerFilter('asset_url', (name) => `assets/${name}`);
engine.registerFilter('image_url', (img) => {
  if (!img) return '';
  return typeof img === 'string' ? img : img.src || '';
});
engine.registerFilter('image_tag', (src, ...args) => {
  const o = kw(args);
  const attrs = Object.entries(o).filter(([k]) => !['widths', 'sizes', 'preload'].includes(k))
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`).join(' ');
  return `<img src="${src}" ${attrs}>`;
});
engine.registerFilter('stylesheet_tag', (url) => `<link rel="stylesheet" href="${url}">`);
engine.registerFilter('script_tag', (url) => `<script src="${url}"></script>`);
engine.registerFilter('money', (cents) => `${(Number(cents || 0) / 100).toFixed(2).replace('.', ',')} €`);
engine.registerFilter('color_modify', (hex, prop, val) => {
  if (prop !== 'alpha' || !/^#[0-9a-f]{6}$/i.test(hex || '')) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${val})`;
});
engine.registerFilter('t', (k) => k);

// {% schema %} no se pinta; {% style %} es un <style>; {% form %} un <form>.
engine.registerTag('schema', class extends Tag {
  constructor(token, remain, liquid) {
    super(token, remain, liquid);
    while (remain.length) { const t = remain.shift(); if (t.name === 'endschema') return; }
  }
  * render() { return ''; }
});
engine.registerTag('style', class extends Tag {
  constructor(token, remain, liquid) {
    super(token, remain, liquid);
    this.tpls = [];
    const stream = liquid.parser.parseStream(remain)
      .on('tag:endstyle', () => stream.stop())
      .on('template', (tpl) => this.tpls.push(tpl))
      .on('end', () => { throw new Error('{% style %} sin cerrar'); });
    stream.start();
  }
  * render(ctx, emitter) {
    emitter.write('<style>');
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    emitter.write('</style>');
  }
});
engine.registerTag('form', class extends Tag {
  constructor(token, remain, liquid) {
    super(token, remain, liquid);
    this.kind = token.args.split(',')[0].trim().replace(/['"]/g, '');
    this.tpls = [];
    const stream = liquid.parser.parseStream(remain)
      .on('tag:endform', () => stream.stop())
      .on('template', (tpl) => this.tpls.push(tpl))
      .on('end', () => { throw new Error('{% form %} sin cerrar'); });
    stream.start();
  }
  * render(ctx, emitter) {
    const action = this.kind === 'cart' ? '/cart' : this.kind === 'product' ? '/cart/add' : '#';
    emitter.write(`<form method="post" action="${action}">`);
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    emitter.write('</form>');
  }
});

// Ajustes: valores por defecto del schema de la sección + los del template.
function sectionSettings(file, templateFile) {
  const src = read(file);
  const schema = JSON.parse(src.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/)[1]);
  const settings = {};
  for (const s of schema.settings || []) if ('default' in s) settings[s.id] = s.default;
  if (templateFile) {
    const tpl = JSON.parse(read(templateFile).replace(/^﻿/, ''));
    Object.assign(settings, Object.values(tpl.sections)[0].settings || {});
  }
  return settings;
}

const ctxBase = {
  shop: { name: 'MSI Magnesio Natural', url: '', currency: 'EUR' },
  routes: { root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', cart_change_url: '/cart/change' },
  request: { design_mode: false, page_type: 'page', locale: { iso_code: 'es' } },
  cart: { item_count: 0, total_price: 0, items: [] },
  template: { name: 'page', suffix: 'msi-landing' },
  all_products: {},
  settings: {},
  page_title: 'MSI Sport · Magnesio natural',
  content_for_header: '',
};

const settings = sectionSettings('sections/msi-landing.liquid', 'templates/page.msi-landing.json');
const section = await engine.parseAndRender(read('sections/msi-landing.liquid'),
  { ...ctxBase, section: { id: 'main', settings } });
const layout = await engine.parseAndRender(read('layout/msi-landing.liquid'), {
  ...ctxBase,
  content_for_layout: `<div id="shopify-section-main" class="shopify-section">${section}</div>`,
});

// En la demo no hay tienda detrás: los botones de compra y WhatsApp avisan en vez
// de llevar a una página que no existe.
const DEMO = `<script>
(function () {
  function aviso() {
    var t = document.getElementById('demo-aviso');
    if (!t) {
      t = document.createElement('div'); t.id = 'demo-aviso'; t.setAttribute('role', 'status');
      t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;background:#111;color:#fff;padding:12px 18px;border-radius:12px;font:500 14px/1.4 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.3);max-width:90vw;text-align:center';
      document.body.appendChild(t);
    }
    t.textContent = 'Demo: la compra y el WhatsApp funcionaban en la tienda de Shopify, no en esta copia.';
    clearTimeout(t._h); t.style.opacity = '1'; t._h = setTimeout(function () { t.style.opacity = '0'; }, 3500);
  }
  function bloquear(e) {
    var el = e.target.closest && e.target.closest('form[action^="/cart"], a[href^="/cart"], a[href*="/products/"], a[href*="wa.me"], [data-msi-add], [data-msi-buy]');
    if (!el) return;
    e.preventDefault(); e.stopImmediatePropagation(); aviso();
  }
  document.addEventListener('click', bloquear, true);
  document.addEventListener('submit', bloquear, true);
})();
</script>`;
const html = layout.replace('</body>', `${DEMO}
</body>`);

fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
for (const f of fs.readdirSync(path.join(SRC, 'assets'))) {
  fs.copyFileSync(path.join(SRC, 'assets', f), path.join(OUT, 'assets', f));
}
console.log('HTML:', Math.round(html.length / 1024), 'KB · assets:', fs.readdirSync(path.join(OUT, 'assets')).length);
