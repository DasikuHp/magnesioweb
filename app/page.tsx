"use client";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useGlassMode } from "@/hooks/useGlassMode";
import { glassModeStore } from "@/lib/glassModeStore";

const ScrollytellingCanvas = dynamic(
  () => import("@/components/ScrollytellingCanvas"),
  { ssr: false }
);

export default function Home() {
  return (
    <main style={{ background: "#050505" }}>
      <svg style={{display:'none'}} aria-hidden="true">
        <defs>
          <filter id="usm-sharp" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="0.6" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="arithmetic" k1="0" k2="1.4" k3="-0.4" k4="0" result="sharpened"/>
          </filter>
        </defs>
      </svg>
      <Nav />
      <ScrollytellingCanvas />
      <ProductsSection />
      <PacksSection />
      <BenefitsSection />
      <LifestyleSection />
      <NewsletterSection />
      <Footer />
      <GlassButton />
    </main>
  );
}

function GlassButton() {
  const { active, toggle } = useGlassMode();

  const handleGlassToggle = () => {
    toggle();
    if (!active) {
      document.body.classList.add('glass-active');
    } else {
      document.body.classList.remove('glass-active');
    }
  };

  useEffect(() => {
    return glassModeStore.subscribe((isActive) => {
      if (isActive) {
        document.body.classList.add("glass-active");
      } else {
        document.body.classList.remove("glass-active");
      }
    });
  }, []);

  return (
    <button
      onClick={handleGlassToggle}
      style={{
        position: 'fixed',
        bottom: '28px',
        right: '28px',
        zIndex: 50,
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        backgroundImage: active
          ? 'conic-gradient(from 180deg at 50% 50%, #ff6ec7 0deg, #7873f5 72deg, #4bc9f0 144deg, #72f5a1 216deg, #f5e642 288deg, #ff6ec7 360deg)'
          : 'rgba(255,255,255,0.08)',
        background: active ? undefined : 'rgba(255,255,255,0.08)',
        boxShadow: active
          ? '0 0 20px rgba(120,115,245,0.6), inset 0 0 0 1px rgba(255,255,255,0.2)'
          : 'inset 0 0 0 1px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.4)',
        fontSize: '18px',
        lineHeight: 1,
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      title={active ? 'Glass OFF' : 'Glass ON'}
    >
      ◎
    </button>
  );
}

function Nav() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-8 md:px-16"
      style={{
        height: "68px",
        background: "rgba(5,5,5,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <a href="#" className="flex flex-col leading-none">
        <span className="text-xl font-black tracking-tighter">
          <span style={{ color: "#e8620a" }}>MSI</span>
          <span className="text-white/90"> Sport</span>
        </span>
        <span
          className="text-[0.55rem] tracking-[0.25em] uppercase"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          magnesionatural.com
        </span>
      </a>

      <ul className="hidden md:flex items-center gap-8">
        {[
          ["Productos", "#productos"],
          ["Packs", "#packs"],
          ["Beneficios", "#beneficios"],
          ["Nosotros", "#nosotros"],
        ].map(([label, href]) => (
          <li key={href}>
            <a
              href={href}
              className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-200 tracking-wide"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>

      <a
        href="#packs"
        className="relative group overflow-hidden rounded-xl text-sm font-semibold text-white px-6 py-2.5 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(12px) saturate(180%)",
          WebkitBackdropFilter: "blur(12px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "inset 0 0 8px 0px rgba(255,255,255,0.1), 0 8px 32px 0 rgba(0,0,0,0.3)",
        }}
      >
        <span className="relative z-10 flex items-center gap-2">
          Comprar ahora
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-x-1">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <div 
          className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" 
        />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300" style={{ background: "#e8620a" }} />
      </a>
    </nav>
  );
}

function ProductsSection() {
  const products = [
    {
      tag: "⚡ Más Vendido",
      tagColor: "#e8620a",
      bg: "#0d0804",
      imageSrc: "/images/1botenaranja.png",
      imageAlt: "Magnesio Natural con Vitamina C",
      line: "MSI Sport",
      name: "Magnesio Natural con Vitamina C",
      desc: "Alta absorción con Vitamina C. Ideal para el sistema nervioso, muscular y la reducción del cansancio. 60 cápsulas veganas.",
      price: "14,90€",
      btnColor: "#e8620a",
    },
    {
      tag: "🌿 Articulaciones",
      tagColor: "#7bc144",
      bg: "#060d04",
      imageSrc: "/images/1boteverde.png",
      imageAlt: "Magnesio con Colágeno",
      line: "MSI Health Bienestar",
      name: "Magnesio con Colágeno",
      desc: "Sinergia de magnesio y colágeno para articulaciones, huesos y piel. Bienestar integral y activo para cada día.",
      price: "14,90€",
      btnColor: "#7bc144",
    },
    {
      tag: "✨ Acción rápida",
      tagColor: "#c9a84c",
      bg: "#0a0a08",
      imageSrc: "/images/1deaceitemagnesio.png",
      imageAlt: "Aceite de Magnesio Spray",
      line: "MSI Aceite Transdérmico",
      name: "Aceite de Magnesio en Spray",
      desc: "Absorción directa a través de la piel. Sales de magnesio naturales del Balneario de La Higuera. 125 ml.",
      price: "14,90€",
      btnColor: "#c9a84c",
    },
  ];

  return (
    <section
      id="productos"
      className="py-28 px-8 md:px-16"
      style={{ background: "#080808" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <span
            className="text-xs tracking-[0.3em] uppercase font-semibold mb-4 block"
            style={{ color: "#e8620a" }}
          >
            Nuestra Gama
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white/90 mb-5">
            Los tres pilares del magnesio MSI
          </h2>
          <p className="text-white/50 max-w-lg mx-auto leading-relaxed">
            Cada producto está formulado para una necesidad específica. Elige el
            tuyo o combínalos para máximos resultados.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((p) => (
            <div
              key={p.name}
              className="rounded-2xl overflow-hidden flex flex-col group transition-all duration-500 hover:-translate-y-2"
              style={{
                background: "#0f0f0f",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="relative" style={{ background: p.bg, height: "280px" }}>
                <span
                  className="absolute top-4 left-4 z-10 text-xs font-bold tracking-wider uppercase px-3 py-1.5 rounded-full text-white"
                  style={{ background: p.tagColor }}
                >
                  {p.tag}
                </span>
                <Image
                  src={p.imageSrc}
                  alt={p.imageAlt}
                  fill
                  className="object-contain p-8 group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="p-7 flex flex-col flex-1">
                <span className="text-[0.65rem] tracking-[0.2em] uppercase text-white/40 mb-2">
                  {p.line}
                </span>
                <h3 className="text-lg font-bold text-white/90 mb-3 leading-tight">
                  {p.name}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed flex-1">
                  {p.desc}
                </p>
                <div className="flex items-center justify-between mt-6">
                  <span className="text-2xl font-black text-white/90">
                    {p.price}{" "}
                    <span className="text-xs font-normal text-white/40">
                      / ud.
                    </span>
                  </span>
                  <a
                    href="#packs"
                    className="text-sm font-semibold text-white px-4 py-2.5 rounded-lg transition-all duration-200 hover:-translate-y-px hover:opacity-90"
                    style={{ background: p.btnColor }}
                  >
                    Comprar →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PacksSection() {
  const packs = [
    {
      qty: "1",
      unit: "ud",
      label: "Unidad",
      imageSrc: "/images/1deaceitemagnesio.png",
      savings: null,
      price: "14,90€",
      perUnit: "14,90€/unidad",
      shipping: "Envío estándar",
      featured: false,
      btnLabel: "Comprar ahora",
    },
    {
      qty: "4",
      unit: "uds",
      label: "Pack Familiar",
      imageSrc: "/images/packde4naranja.png",
      savings: "Ahorras 9,70€",
      price: "49,90€",
      perUnit: "12,48€/unidad",
      shipping: "Envío estándar",
      featured: true,
      btnLabel: "Comprar Pack de 4",
      badge: "⭐ Más Popular",
    },
    {
      qty: "6",
      unit: "uds",
      label: "Pack Total",
      imageSrc: "/images/botede6verde.png",
      savings: "Ahorras 19,50€",
      price: "69,90€",
      perUnit: "11,65€/unidad",
      shipping: "PORTES GRATIS",
      freeShipping: true,
      featured: false,
      btnLabel: "Comprar Pack de 6",
    },
  ];

  return (
    <section
      id="packs"
      className="py-28 px-8 md:px-16"
      style={{
        background: "linear-gradient(180deg, #080808 0%, #0f1e3d 100%)",
      }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <span
            className="text-xs tracking-[0.3em] uppercase font-semibold mb-4 block"
            style={{ color: "#e8620a" }}
          >
            Ahorra con Packs
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white/90 mb-5">
            Elige tu pack y ahorra
          </h2>
          <p className="text-white/50 max-w-md mx-auto leading-relaxed">
            Cuanto más cuidas tu bienestar, más ahorras. Portes gratis a partir
            del pack de 6 unidades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
          {packs.map((p) => (
            <div
              key={p.qty}
              className={`rounded-2xl p-8 flex flex-col items-center text-center transition-all duration-500 ${
                p.featured ? "scale-105 md:scale-110" : ""
              }`}
              style={{
                background: p.featured
                  ? "rgba(255,255,255,0.95)"
                  : "rgba(255,255,255,0.04)",
                border: p.featured
                  ? "none"
                  : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {p.featured && (
                <span
                  className="text-xs font-black tracking-[0.2em] uppercase px-4 py-1.5 rounded-full text-white mb-6"
                  style={{
                    background: "#e8620a",
                    boxShadow: "0 4px 16px rgba(232,98,10,0.35)",
                  }}
                >
                  {p.badge}
                </span>
              )}

              <span
                className={`text-6xl font-black leading-none ${
                  p.featured ? "text-[#0f1e3d]" : "text-white"
                }`}
              >
                {p.qty}
                <span
                  className={`text-2xl ${
                    p.featured ? "text-gray-400" : "text-white/40"
                  }`}
                >
                  {p.unit}
                </span>
              </span>
              <span
                className={`text-xs tracking-[0.2em] uppercase mt-1 mb-6 ${
                  p.featured ? "text-gray-400" : "text-white/30"
                }`}
              >
                {p.label}
              </span>

              <div className="relative h-40 w-full mb-5">
                <Image
                  src={p.imageSrc}
                  alt={`Pack ${p.qty}`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 80vw, 30vw"
                />
              </div>

              {p.savings && (
                <span className="text-xs font-bold text-[#7bc144] uppercase tracking-wider mb-2">
                  ✅ {p.savings}
                </span>
              )}

              <div
                className={`text-4xl font-black my-1 ${
                  p.featured ? "text-[#0f1e3d]" : "text-white"
                }`}
              >
                {p.price}
              </div>
              <div
                className={`text-sm mb-4 ${
                  p.featured ? "text-gray-400" : "text-white/30"
                }`}
              >
                {p.perUnit}
              </div>

              <div
                className={`text-sm mb-6 flex items-center gap-2 ${
                  p.featured ? "text-gray-500" : "text-white/40"
                }`}
              >
                {p.freeShipping ? (
                  <span
                    className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white"
                    style={{ background: "#7bc144" }}
                  >
                    {p.shipping}
                  </span>
                ) : (
                  p.shipping
                )}
              </div>

              <a
                href="#"
                className={`w-full py-3.5 rounded-xl text-sm font-bold text-center block transition-all duration-200 hover:-translate-y-px ${
                  p.featured
                    ? "text-white"
                    : "border border-white/15 text-white hover:border-white/40"
                }`}
                style={
                  p.featured
                    ? {
                        background: "#e8620a",
                        boxShadow: "0 8px 24px rgba(232,98,10,0.35)",
                      }
                    : {}
                }
              >
                {p.btnLabel}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  const benefits = [
    {
      icon: "💪",
      iconBg: "rgba(232,98,10,0.12)",
      title: "Alta biodisponibilidad",
      desc: "Fórmula optimizada para máxima absorción intestinal y transdérmica. Tu cuerpo aprovecha cada miligramo.",
    },
    {
      icon: "🌿",
      iconBg: "rgba(123,193,68,0.12)",
      title: "100% vegano y natural",
      desc: "Cápsulas veganas sin aditivos artificiales. Ingredientes de origen natural certificados.",
    },
    {
      icon: "⚡",
      iconBg: "rgba(255,255,255,0.06)",
      title: "Reduce el cansancio y los calambres",
      desc: "Ideal para estilos de vida activos. Combate la fatiga muscular y mejora la recuperación.",
    },
    {
      icon: "🦴",
      iconBg: "rgba(232,98,10,0.08)",
      title: "Huesos y articulaciones fuertes",
      desc: "El magnesio es esencial para el metabolismo óseo. Con colágeno para protección articular completa.",
    },
  ];

  return (
    <section
      id="beneficios"
      className="py-28 px-8 md:px-16"
      style={{ background: "#080808" }}
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div className="relative">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ height: "520px" }}
          >
            <Image
              src="/images/parejafeliz.png"
              alt="Vida activa con MSI Magnesio"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div
            className="absolute -bottom-8 -right-8 w-44 h-36 rounded-xl overflow-hidden border-2"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <Image
              src="/images/3productosjuntos.png"
              alt="Gama completa MSI"
              fill
              className="object-cover"
              sizes="200px"
            />
          </div>
          <div
            className="absolute -top-6 -left-6 w-36 h-28 rounded-xl overflow-hidden border-2"
            style={{ borderColor: "rgba(255,255,255,0.06)", zIndex: 10 }}
          >
            <Image
              src="/images/parejafeliz2.png"
              alt="Vida activa MSI"
              fill
              className="object-cover"
              sizes="160px"
            />
          </div>
        </div>

        <div>
          <span
            className="text-xs tracking-[0.3em] uppercase font-semibold mb-4 block"
            style={{ color: "#e8620a" }}
          >
            ¿Por qué MSI?
          </span>
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white/90 mb-5 leading-tight">
            El magnesio que tu cuerpo necesita, en la forma que mejor funciona
          </h2>
          <p className="text-white/50 leading-relaxed mb-10">
            Más de 15 años de formulación científica para que cada cápsula
            aporte el máximo beneficio a tu organismo.
          </p>

          <div className="flex flex-col gap-2">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="flex gap-4 p-4 rounded-xl transition-colors duration-200 hover:bg-white/[0.03]"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: b.iconBg }}
                >
                  {b.icon}
                </div>
                <div>
                  <div className="font-semibold text-white/85 mb-1 text-sm">
                    {b.title}
                  </div>
                  <div className="text-sm text-white/45 leading-relaxed">
                    {b.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LifestyleSection() {
  const items = [
    {
      src: "/images/Foto-stock-abuela.png",
      alt: "Familia activa con MSI",
      label: "Vida en familia",
      large: true,
    },
    {
      src: "/images/parejafeliz2.png",
      alt: "Pareja activa en naturaleza",
      label: "Activos cada día",
      large: false,
    },
    {
      src: "/images/3productosjuntos.png",
      alt: "Gama completa MSI",
      label: "La gama completa",
      large: false,
    },
  ];

  return (
    <section
      id="nosotros"
      className="py-28 px-8 md:px-16"
      style={{ background: "#060606" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span
            className="text-xs tracking-[0.3em] uppercase font-semibold mb-4 block"
            style={{ color: "#e8620a" }}
          >
            Vida Activa
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white/90 mb-5">
            Para quienes no paran
          </h2>
          <p className="text-white/50 max-w-md mx-auto leading-relaxed">
            MSI nació para acompañar a personas activas que cuidan su bienestar
            sin renunciar a la vida que aman.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.src}
              className={`relative rounded-2xl overflow-hidden group ${
                item.large ? "col-span-2 md:col-span-1 md:row-span-2" : ""
              }`}
              style={{ aspectRatio: item.large ? "3/4" : "4/3" }}
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                className={`object-cover object-center group-hover:scale-105 transition-transform duration-700`}
                sizes="(max-width: 768px) 50vw, 33vw"
              />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5"
                style={{
                  background:
                    "linear-gradient(to top, rgba(5,5,5,0.75) 0%, transparent 50%)",
                }}
              >
                <span className="text-sm font-medium text-white">
                  {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterSection() {
  return (
    <section
      className="py-20 px-8 md:px-16 text-center"
      style={{
        background: "linear-gradient(135deg, #e8620a 0%, #c44d00 100%)",
      }}
    >
      <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white mb-3">
        Mantente activo, mantente informado
      </h2>
      <p className="text-white/75 mb-10 text-lg">
        Consejos de bienestar, ofertas exclusivas y novedades MSI directo a tu
        correo.
      </p>
      <div className="flex max-w-md mx-auto gap-3">
        <input
          type="email"
          placeholder="tu@email.com"
          className="flex-1 px-5 py-3.5 rounded-xl text-sm outline-none"
          style={{ background: "rgba(255,255,255,0.95)", color: "#111" }}
        />
        <button
          className="px-6 py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:-translate-y-px hover:opacity-90 whitespace-nowrap"
          style={{ background: "#0f1e3d" }}
        >
          Suscribirme
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      className="py-16 px-8 md:px-16"
      style={{
        background: "#040404",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-14">
          <div>
            <div className="text-xl font-black tracking-tighter mb-4">
              <span style={{ color: "#e8620a" }}>MSI</span>
              <span className="text-white/85"> Sport</span>
            </div>
            <p className="text-sm text-white/35 leading-relaxed max-w-xs">
              Magnesio natural de alta calidad para estilos de vida activos.
              Formulado con los mejores ingredientes, pensado para que sigas
              moviéndote.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white/70 mb-5 tracking-wide">
              Productos
            </h4>
            <ul className="flex flex-col gap-3">
              {[
                "Magnesio Natural + Vitamina C",
                "Magnesio + Colágeno",
                "Aceite de Magnesio Spray",
                "Packs y Ofertas",
              ].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-sm text-white/35 hover:text-white/70 transition-colors duration-200"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white/70 mb-5 tracking-wide">
              Información
            </h4>
            <ul className="flex flex-col gap-3">
              {[
                "Sobre MSI",
                "Envíos y Devoluciones",
                "Política de Privacidad",
                "Aviso Legal",
                "Contacto",
              ].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-sm text-white/35 hover:text-white/70 transition-colors duration-200"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="text-xs text-white/25">
            © 2026 MSI Sport — magnesionatural.com. Todos los derechos
            reservados.
          </span>
          <span className="text-xs text-white/25">
            🔒 Pago Seguro · SSL · RGPD
          </span>
        </div>
      </div>
    </footer>
  );
}
