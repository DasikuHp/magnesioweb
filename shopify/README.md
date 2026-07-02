# MSI Landing → Shopify

Conversión de la landing Next.js (React + Tailwind + Framer Motion) a una
**sección de tema Shopify autocontenida**: HTML + CSS plano + JavaScript
vanilla. No toca `theme.liquid`, checkout, carrito ni productos.

## Contenido de esta carpeta

| Archivo | Destino en el tema | Qué es |
|---|---|---|
| `sections/msi-landing.liquid` | `sections/` | La sección completa (markup + schema de ajustes) |
| `assets/msi-landing.css` | `assets/` | Todo el CSS (Tailwind convertido a CSS plano, prefijo `.msi-`) |
| `assets/msi-landing.js` | `assets/` | Scrollytelling del canvas en JS vanilla (comentado) |
| `layout/msi-landing.liquid` | `layout/` | Layout mínimo opcional (sin header/footer del tema) |
| `templates/page.msi-landing.json` | `templates/` | Plantilla de página que usa la sección + layout |

## Instalación paso a paso

### 1. Copiar los archivos al tema

1. En el admin de Shopify: **Tienda online → Temas → ⋯ → Editar código**
   (hazlo sobre una **copia/duplicado** del tema para probar sin riesgo).
2. En **Secciones** → *Agregar una nueva sección* → nómbrala `msi-landing`
   → borra el contenido generado y pega el de `sections/msi-landing.liquid`.
3. En **Assets** → *Agregar un nuevo asset* → sube `msi-landing.css` y
   `msi-landing.js`.
4. (Recomendado) En **Layout** → *Agregar un nuevo layout* → nómbralo
   `msi-landing` → pega el contenido de `layout/msi-landing.liquid`.
5. En **Plantillas** → *Agregar una nueva plantilla* → tipo `page`, nombre
   `msi-landing`, formato JSON → pega el contenido de
   `templates/page.msi-landing.json`.
   - Si NO creaste el layout del paso 4, elimina la línea
     `"layout": "msi-landing",` de la plantilla. La sección funcionará con
     el layout del tema, pero: desactiva el ajuste **"Mostrar barra de
     navegación propia"** para no duplicar el header, y comprueba que el
     hero sticky funciona (ver *Problemas conocidos*).

### 2. Subir los 121 frames WebP

Los frames están en `public/sequence-naranja/` del repo
(`frame_0001.webp` … `frame_0121.webp`, ~14 MB en total).

**Opción A — carpeta `assets/` del tema (más simple):**
1. En *Editar código* → **Assets** → *Agregar un nuevo asset* → sube los
   121 archivos (admite selección múltiple, arrástralos todos).
2. En los ajustes de la sección, deja **"URL base de los frames"** vacío:
   la sección deriva la URL automáticamente con `asset_url`.

**Opción B — Contenido > Archivos (CDN de Shopify, no engorda el tema):**
1. Admin → **Contenido → Archivos** → sube los 121 WebP.
2. Copia la URL de `frame_0001.webp` (icono de enlace). Será algo como
   `https://cdn.shopify.com/s/files/1/0123/4567/files/frame_0001.webp?v=…`
3. Pega en el ajuste **"URL base de los frames"** todo lo anterior al
   nombre del archivo: `https://cdn.shopify.com/s/files/1/0123/4567/files/`
   - ⚠️ Si Shopify renombra archivos por colisión de nombres
     (`frame_0001_abc123.webp`), borra los duplicados o usa la opción A.

### 3. Crear la página y asignar la plantilla

1. Admin → **Tienda online → Páginas → Agregar página**. Título p. ej.
   "Landing MSI". 
2. En el panel derecho, **Plantilla de tema** → `page.msi-landing`.
3. Guarda y abre la página. El hero, los beats y las secciones deberían
   funcionar ya con los textos por defecto.

### 4. Configurar la sección en el personalizador

**Tienda online → Temas → Personalizar** → arriba, selecciona la plantilla
**Páginas → msi-landing** → haz clic en la sección *MSI Landing*:

- **Imágenes**: sube las fotos de producto, packs, beneficios y lifestyle
  (las del repo están en `public/images/`). Sin imagen asignada se muestra
  un placeholder gris.
- **Productos 1–3**: los Variant IDs y handles reales ya vienen como
  valores por defecto:
  - Magnesio + Vitamina C → `57770820370767` / `magnesio-con-vitamina-c`
  - Magnesio + Colágeno → `57770818502991` / `magnesio-con-colageno`
  - Aceite de Magnesio → `57770818175311` / `aceite-de-magnesio`
    (marcado **Agotado** por defecto: botón deshabilitado que enlaza a la
    ficha; desmarca la casilla cuando actualices stock y precio)
  - Mejor aún: usa el selector **"Producto de Shopify"** de cada tarjeta —
    precio, stock y enlace se leen solos de la tienda y el estado
    "Agotado" se actualiza automáticamente.
- **Packs 4 y 6**: aún no existen como productos. Crea en Shopify un
  producto (o variante) por pack, copia su Variant ID
  (Admin → Producto → Variante → el número al final de la URL) y pégalo en
  el ajuste correspondiente. Mientras estén vacíos el botón muestra
  "Próximamente" deshabilitado.

### 5. Newsletter

El formulario usa `{% form 'customer' %}` nativo: crea clientes con el tag
`newsletter` (Admin → Clientes, filtra por tag). Compatible con los flujos
de email marketing de Shopify. Sin apps ni configuración extra.

## Cómo funciona el scrollytelling (resumen técnico)

- Contenedor de **500vh** con un `<canvas>` en `position:sticky; top:0;
  height:100vh`.
- JS precarga los 121 frames con pantalla de carga y % real; el progreso
  de scroll (0→1) se mapea a un índice de frame.
- El suavizado tipo *spring* de Framer Motion se replica con **lerp**:
  `current += (target - current) * 0.12` dentro de un bucle
  `requestAnimationFrame` que se detiene solo cuando converge.
- Los 4 *beats* de texto (A 0–20% izq, B 25–45% izq, C 50–70% dcha,
  D 75–95% centro + CTA) se animan con opacidad + `translateY` según su
  tramo, con fade del 10% en cada extremo (idéntico al original).
- Overlays portados 1:1: brillo radial central (composite `overlay`),
  viñeta radial, gradientes de borde izquierda/derecha/arriba/abajo y
  textura de ruido SVG.

## Rendimiento móvil

- En pantallas **<768px** (o `prefers-reduced-motion`) **no se descarga
  ningún frame**: el CSS oculta el canvas y muestra una imagen estática
  (ajuste "Imagen estática para móvil") con el texto del Beat A, precio y
  CTA. Si el usuario agranda la ventana a escritorio, el canvas arranca.
- Solo se precarga **una** secuencia (naranja), no las tres (121 imágenes
  en vez de 363).
- Todas las imágenes de las secciones estáticas llevan `loading="lazy"` y
  se sirven redimensionadas por el CDN de Shopify (`image_url: width`).
- Consejo extra: los frames pesan ~120 KB de media; si quieres aligerar,
  recomprime a calidad 60–70 o reduce a 1280px de ancho antes de subirlos.

## Activar la rotación aleatoria naranja/verde/spray

Por defecto solo se usa la secuencia naranja. Para las tres:

1. Sube los frames de `public/sequence-verde/` renombrados a
   `verde-frame_0001.webp…` y los de `public/sequence-spray/` como
   `spray-frame_0001.webp…` (mismo sitio que los naranjas).
2. En `assets/msi-landing.js`, descomenta los objetos `verde` y `spray`
   del array `SEQUENCES` (incluyen los textos de sus beats) y la línea
   marcada `>>> Índice aleatorio <<<` en `init()`.

## Problemas conocidos / a vigilar

- **Sticky roto**: si un ancestro del hero tiene `overflow: hidden|auto`,
  `position: sticky` deja de funcionar. Por eso existe el layout mínimo
  `msi-landing`. Si usas el layout del tema y el canvas "no se queda
  fijo", ese es el motivo.
- **Header duplicado**: con el layout del tema activo, desactiva la barra
  de navegación propia de la sección (ajuste "General").
- **`/cart/add?id=…`** añade la unidad y redirige al carrito — comportamiento
  estándar de Shopify, no toca nada del checkout.
- **Glass Mode**: excluido a propósito (experimental en el original).
