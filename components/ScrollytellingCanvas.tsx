"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useScroll, useSpring, useTransform, motion } from "framer-motion";

const FRAME_COUNT = 121;

type SequenceKey = "naranja" | "verde" | "spray";

interface SequenceData {
  id: SequenceKey;
  folder: string;
  zoomFactor: number;
  fitMode: "cover" | "contain";
  accent: string;
  accentGlow: string;
  beats: {
    A: { tag: string; title: React.ReactNode; sub: string };
    B: { tag: string; title: React.ReactNode; sub: string };
    C: { tag: string; title: React.ReactNode; sub: string };
    D: { tag: string; title: React.ReactNode; sub: string; cta: string };
  };
}

const SEQUENCES: SequenceData[] = [
  {
    id: "naranja",
    folder: "sequence-naranja",
    zoomFactor: 0.85,
    fitMode: "contain",
    accent: "#e8620a",
    accentGlow: "rgba(232,98,10,0.8)",
    beats: {
      A: {
        tag: "Producto Nº1 en Magnesio Natural",
        title: <>MAGNESIO<br />NATURAL</>,
        sub: "El mineral que tu cuerpo necesita, en la forma que mejor funciona.",
      },
      B: {
        tag: "Alta absorción",
        title: <>3× más<br />rápida</>,
        sub: "Vitamina C + Magnesio. Fórmula exclusiva MSI para máxima biodisponibilidad.",
      },
      C: {
        tag: "Bienestar Total",
        title: <>Músculos.<br />Huesos.<br />Mente.</>,
        sub: "60 cápsulas veganas para articulaciones, sistema nervioso y recuperación activa.",
      },
      D: {
        tag: "Empieza hoy",
        title: "14,90€",
        sub: "Envío en 24/48h · 100% Vegano",
        cta: "Ver Packs y Precios",
      },
    },
  },
  {
    id: "verde",
    folder: "sequence-verde",
    zoomFactor: 0.85,
    fitMode: "contain",
    accent: "#7bc144",
    accentGlow: "rgba(123,193,68,0.8)",
    beats: {
      A: {
        tag: "Salud Articular y Ósea",
        title: <>MAGNESIO<br />COLÁGENO</>,
        sub: "Sinergia total para huesos, piel y articulaciones.",
      },
      B: {
        tag: "Recuperación activa",
        title: <>Huesos<br />fuertes</>,
        sub: "Colágeno + Magnesio en sinergia para máxima protección articular y ósea.",
      },
      C: {
        tag: "Piel y tejidos",
        title: <>Piel.<br />Pelo.<br />Uñas.</>,
        sub: "El colágeno que tu cuerpo necesita para mantenerse joven y activo cada día.",
      },
      D: {
        tag: "Empieza hoy",
        title: "14,90€",
        sub: "Envío en 24/48h · 100% Vegano",
        cta: "Ver Packs y Precios",
      },
    },
  },
  {
    id: "spray",
    folder: "sequence-spray",
    zoomFactor: 1.500,
    fitMode: "contain",
    accent: "#c9a84c",
    accentGlow: "rgba(201,168,76,0.8)",
    beats: {
      A: {
        tag: "Absorción transdérmica",
        title: <>ACEITE<br />MAGNESIO</>,
        sub: "Absorción directa a través de la piel. Sin pasar por el sistema digestivo.",
      },
      B: {
        tag: "Acción inmediata",
        title: <>Directo<br />al músculo</>,
        sub: "Sales de magnesio naturales del Balneario de La Higuera. Pureza certificada.",
      },
      C: {
        tag: "Sin cápsulas",
        title: <>Solo<br />aplica<br />y listo.</>,
        sub: "125 ml para uso diario. Ideal para deportistas y personas con problemas de absorción oral.",
      },
      D: {
        tag: "Empieza hoy",
        title: "14,90€",
        sub: "Envío en 24/48h · Sales 100% Naturales",
        cta: "Ver Packs y Precios",
      },
    },
  },
];

function padNumber(num: number): string {
  return num.toString().padStart(4, "0");
}

function generateFramePaths(folder: string): string[] {
  return Array.from(
    { length: FRAME_COUNT },
    (_, i) => `/${folder}/frame_${padNumber(i + 1)}.webp`
  );
}

interface BeatProps {
  scrollProgress: ReturnType<typeof useSpring>;
  start: number;
  end: number;
  alignment: "left" | "center" | "right";
  children: React.ReactNode;
}

function Beat({ scrollProgress, start, end, alignment, children }: BeatProps) {
  const fadeIn = start + (end - start) * 0.1;
  const fadeOut = end - (end - start) * 0.1;

  const opacity = useTransform(
    scrollProgress,
    [start, fadeIn, fadeOut, end],
    [0, 1, 1, 0]
  );
  const y = useTransform(
    scrollProgress,
    [start, fadeIn, fadeOut, end],
    [20, 0, 0, -20]
  );

  const alignClass =
    alignment === "left"
      ? "items-start text-left"
      : alignment === "right"
      ? "items-end text-right"
      : "items-center text-center";

  return (
    <motion.div
      style={{ opacity, y }}
      className={`absolute inset-0 flex flex-col justify-center px-8 md:px-16 lg:px-24 pointer-events-none ${alignClass}`}
    >
      {children}
    </motion.div>
  );
}

export default function ScrollytellingCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);
  const rafRef = useRef<number>(0);

  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // Stable random selection per session
  const [sequence] = useState<SequenceData>(() => {
    if (typeof window === "undefined") return SEQUENCES[0]; // SSR fallback
    const randomIndex = Math.floor(Math.random() * SEQUENCES.length);
    return SEQUENCES[randomIndex];
  });

  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 40,
    damping: 25,
    mass: 0.5,
  });

  const preloadImages = useCallback(async () => {
    const paths = generateFramePaths(sequence.folder);
    const images: HTMLImageElement[] = new Array(FRAME_COUNT);
    let loaded = 0;

    await Promise.all(
      paths.map(
        (path, i) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              images[i] = img;
              loaded++;
              setLoadProgress(Math.round((loaded / FRAME_COUNT) * 100));
              resolve();
            };
            img.onerror = () => {
              loaded++;
              setLoadProgress(Math.round((loaded / FRAME_COUNT) * 100));
              resolve();
            };
            img.src = path;
          })
      )
    );

    framesRef.current = images;
    setIsLoaded(true);
    setTimeout(() => setShowContent(true), 600);
  }, [sequence]);

  useEffect(() => {
    preloadImages();
  }, [preloadImages]);

  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;
    const img = framesRef.current[frameIndex];
    if (!img) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    if (!imgW || !imgH) return;

    const baseScale = sequence.fitMode === "cover"
      ? Math.max(W / imgW, H / imgH)
      : Math.min(W / imgW, H / imgH);
    const scale = baseScale * sequence.zoomFactor;
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const dx = (W - drawW) / 2;
    const dy = (H - drawH) / 2;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Apply horizontal scaling for naranja to make it wider
    if (sequence.id === "naranja") {
      const centerX = (dx + drawW / 2) * dpr;
      const centerY = (dy + drawH / 2) * dpr;
      ctx.translate(centerX, centerY);
      ctx.scale(1.35, 0.85); // 35% wider, 15% shorter
      ctx.translate(-centerX, -centerY);
    }

    ctx.drawImage(img, dx * dpr, dy * dpr, drawW * dpr, drawH * dpr);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const sharpR = Math.min(canvas.width, canvas.height) * 0.28;
    const sharpen = ctx.createRadialGradient(cx, cy, 0, cx, cy, sharpR);
    sharpen.addColorStop(0,   "rgba(255,255,255,0.04)");
    sharpen.addColorStop(0.6, "rgba(255,255,255,0.01)");
    sharpen.addColorStop(1,   "rgba(255,255,255,0)");
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = sharpen;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";

    const outerR = Math.sqrt(cx * cx + cy * cy) * 1.1;
    const innerR = Math.min(canvas.width, canvas.height) * 0.25;
    const radial = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    radial.addColorStop(0,    "rgba(0,0,0,0)");
    radial.addColorStop(0.35, "rgba(0,0,0,0)");
    radial.addColorStop(0.58, "rgba(0,0,0,0.35)");
    radial.addColorStop(0.76, "rgba(0,0,0,0.7)");
    radial.addColorStop(1.0,  "rgba(0,0,0,0.95)");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const edgeW = canvas.width * 0.20;
    const left = ctx.createLinearGradient(0, 0, edgeW, 0);
    left.addColorStop(0,    "rgba(0,0,0,1)");
    left.addColorStop(0.35, "rgba(0,0,0,0.65)");
    left.addColorStop(0.7,  "rgba(0,0,0,0.18)");
    left.addColorStop(1,    "rgba(0,0,0,0)");
    ctx.fillStyle = left;
    ctx.fillRect(0, 0, edgeW, canvas.height);

    const right = ctx.createLinearGradient(canvas.width - edgeW, 0, canvas.width, 0);
    right.addColorStop(0,    "rgba(0,0,0,0)");
    right.addColorStop(0.3,  "rgba(0,0,0,0.18)");
    right.addColorStop(0.65, "rgba(0,0,0,0.65)");
    right.addColorStop(1,    "rgba(0,0,0,1)");
    ctx.fillStyle = right;
    ctx.fillRect(canvas.width - edgeW, 0, edgeW, canvas.height);

    const topH = canvas.height * 0.18;
    const top = ctx.createLinearGradient(0, 0, 0, topH);
    top.addColorStop(0,   "rgba(0,0,0,1)");
    top.addColorStop(0.5, "rgba(0,0,0,0.5)");
    top.addColorStop(1,   "rgba(0,0,0,0)");
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, canvas.width, topH);

    const botH = canvas.height * 0.18;
    const bot = ctx.createLinearGradient(0, canvas.height - botH, 0, canvas.height);
    bot.addColorStop(0,   "rgba(0,0,0,0)");
    bot.addColorStop(0.5, "rgba(0,0,0,0.5)");
    bot.addColorStop(1,   "rgba(0,0,0,1)");
    ctx.fillStyle = bot;
    ctx.fillRect(0, canvas.height - botH, canvas.width, botH);

    ctx.restore();
  }, [sequence]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    drawFrame(currentFrameRef.current);
  }, [drawFrame]);

  useEffect(() => {
    if (!isLoaded) return;
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [isLoaded, resizeCanvas]);

  useEffect(() => {
    if (!isLoaded) return;

    const unsubscribe = smoothProgress.on("change", (v) => {
      const clamped = Math.min(1, Math.max(0, v));
      const frameIndex = Math.min(
        FRAME_COUNT - 1,
        Math.floor(clamped * (FRAME_COUNT - 1))
      );
      if (frameIndex !== currentFrameRef.current) {
        currentFrameRef.current = frameIndex;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => drawFrame(frameIndex));
      }
    });

    return () => {
      unsubscribe();
      cancelAnimationFrame(rafRef.current);
    };
  }, [isLoaded, smoothProgress, drawFrame]);

  const scrollHintOpacity = useTransform(smoothProgress, [0, 0.1], [1, 0]);

  return (
    <>
      {!showContent && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: "#050505" }}
        >
          <div className="flex flex-col items-center gap-8">
            <div className="flex items-baseline gap-1">
              <span
                className="text-5xl font-black tracking-tighter"
                style={{ color: "#e8620a" }}
              >
                MSI
              </span>
              <span className="text-2xl font-light text-white/70 ml-1">
                Sport
              </span>
            </div>

            <div className="flex flex-col items-center gap-3 w-64">
              <div className="w-full h-px bg-white/10 relative overflow-hidden rounded-full">
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-200"
                  style={{
                    width: `${loadProgress}%`,
                    background: "#e8620a",
                  }}
                />
              </div>
              <span className="text-xs tracking-widest text-white/30 uppercase">
                {loadProgress < 100 ? `Cargando ${loadProgress}%` : "Listo"}
              </span>
            </div>

            {loadProgress < 100 && (
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1 h-1 rounded-full bg-white/30"
                    style={{
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <style jsx>{`
            @keyframes pulse {
              0%,
              100% {
                opacity: 0.3;
                transform: scale(1);
              }
              50% {
                opacity: 1;
                transform: scale(1.4);
              }
            }
          `}</style>
        </div>
      )}

      <div
        ref={wrapperRef}
        style={{ height: "500vh" }}
        className="relative"
      >
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ background: "#050505", imageRendering: "auto" }}
          />
          {/* Perceptual Vignette Overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 55%, rgba(0, 0, 0, 0.25) 75%, rgba(0, 0, 0, 0.55) 100%)",
              zIndex: 1,
              pointerEvents: "none"
            }}
          />
          <div 
            className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-overlay"
            style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }}
          />

          {showContent && (
            <>
              <Beat
                scrollProgress={smoothProgress}
                start={-0.02}
                end={0.2}
                alignment="left"
              >
                <span
                  className="text-xs tracking-[0.3em] uppercase mb-6 font-medium"
                  style={{ color: sequence.accent }}
                >
                  {sequence.beats.A.tag}
                </span>
                <h1
                  className="text-7xl md:text-8xl font-black tracking-tighter leading-none max-w-xs"
                  style={{ color: "rgba(255,255,255,0.92)" }}
                >
                  {sequence.beats.A.title}
                </h1>
                <p
                  className="text-lg font-light mt-6 max-w-xs"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  {sequence.beats.A.sub}
                </p>
              </Beat>

              <Beat
                scrollProgress={smoothProgress}
                start={0.25}
                end={0.45}
                alignment="left"
              >
                <span
                  className="text-xs tracking-[0.3em] uppercase mb-4 font-medium"
                  style={{ color: sequence.accent }}
                >
                  {sequence.beats.B.tag}
                </span>
                <h2
                  className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-none"
                  style={{ color: "rgba(255,255,255,0.92)" }}
                >
                  {sequence.beats.B.title}
                </h2>
                <p
                  className="text-lg md:text-xl font-light mt-5 max-w-xs"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  {sequence.beats.B.sub}
                </p>
              </Beat>

              <Beat
                scrollProgress={smoothProgress}
                start={0.5}
                end={0.7}
                alignment="right"
              >
                <span
                  className="text-xs tracking-[0.3em] uppercase mb-4 font-medium"
                  style={{ color: sequence.accent }}
                >
                  {sequence.beats.C.tag}
                </span>
                <h2
                  className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-none"
                  style={{ color: "rgba(255,255,255,0.92)" }}
                >
                  {sequence.beats.C.title}
                </h2>
                <p
                  className="text-lg md:text-xl font-light mt-5 max-w-xs"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  {sequence.beats.C.sub}
                </p>
              </Beat>

              <Beat
                scrollProgress={smoothProgress}
                start={0.75}
                end={0.95}
                alignment="center"
              >
                <span
                  className="text-xs tracking-[0.3em] uppercase mb-4 font-medium"
                  style={{ color: "rgba(255,255,255,0.85)", textShadow: `0 0 20px ${sequence.accentGlow}` }}
                >
                  {sequence.beats.D.tag}
                </span>
                <h2
                  className="text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none"
                  style={{ color: "rgba(255,255,255,0.92)", textShadow: "0 0 40px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,1)" }}
                >
                  {sequence.beats.D.title}
                </h2>
                <p
                  className="text-xl md:text-2xl font-light mt-4"
                  style={{ color: "rgba(255,255,255,0.80)", textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}
                >
                  {sequence.beats.D.sub}
                </p>
                <a
                  href="#packs"
                  className="mt-8 inline-flex items-center gap-3 text-white font-semibold text-sm tracking-widest uppercase px-8 py-4 rounded-full border border-white/20 hover:border-white/60 hover:bg-white/5 transition-all duration-300 pointer-events-auto"
                  style={{
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.3), 0 4px 24px rgba(0,0,0,0.8)",
                    backgroundColor: "rgba(0,0,0,0.4)",
                    backdropFilter: "blur(8px)"
                  }}
                >
                  {sequence.beats.D.cta}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="translate-y-px"
                  >
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </Beat>

              <motion.div
                style={{ opacity: scrollHintOpacity }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
              >
                <span
                  className="text-xs tracking-[0.25em] uppercase"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  Scroll para explorar
                </span>
                <div className="w-px h-10 bg-white/10 relative overflow-hidden">
                  <div
                    className="absolute w-full"
                    style={{
                      height: "40%",
                      background: "#e8620a",
                      animation: "scrollRun 2s ease-in-out infinite",
                    }}
                  />
                </div>
                <style jsx>{`
                  @keyframes scrollRun {
                    0% {
                      top: -40%;
                    }
                    100% {
                      top: 140%;
                    }
                  }
                `}</style>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
