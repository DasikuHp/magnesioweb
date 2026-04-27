"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useScroll, useSpring, useTransform, motion } from "framer-motion";

const FRAME_COUNT = 140;

function generateFramePaths(): string[] {
  return Array.from(
    { length: FRAME_COUNT },
    (_, i) => `/sequence/frame_${i}.jpg`
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

  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    mass: 0.5,
  });

  const preloadImages = useCallback(async () => {
    const paths = generateFramePaths();
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
  }, []);

  useEffect(() => {
    preloadImages();
  }, [preloadImages]);

  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = framesRef.current[frameIndex];
    if (!img) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    if (!imgW || !imgH) return;

    const scale = Math.min(W / imgW, H / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const dx = (W - drawW) / 2;
    const dy = (H - drawH) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, dx * dpr, dy * dpr, drawW * dpr, drawH * dpr);
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
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
      const frameIndex = Math.min(
        FRAME_COUNT - 1,
        Math.max(0, Math.floor(v * (FRAME_COUNT - 1)))
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
            style={{ background: "#050505" }}
          />

          {showContent && (
            <>
              <Beat
                scrollProgress={smoothProgress}
                start={0}
                end={0.2}
                alignment="center"
              >
                <span
                  className="text-xs tracking-[0.3em] uppercase mb-6 font-medium"
                  style={{ color: "#e8620a" }}
                >
                  Producto Nº1 en Magnesio Natural
                </span>
                <h1
                  className="text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none"
                  style={{ color: "rgba(255,255,255,0.92)" }}
                >
                  MAGNESIO
                </h1>
                <p
                  className="text-xl md:text-2xl font-light mt-6 max-w-md"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  El mineral que tu cuerpo necesita,<br />
                  en la forma que mejor funciona.
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
                  style={{ color: "#e8620a" }}
                >
                  Alta absorción
                </span>
                <h2
                  className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-none"
                  style={{ color: "rgba(255,255,255,0.92)" }}
                >
                  3× más
                  <br />
                  rápida
                </h2>
                <p
                  className="text-lg md:text-xl font-light mt-5 max-w-xs"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  Vitamina C + Magnesio. Fórmula exclusiva
                  MSI para máxima biodisponibilidad.
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
                  style={{ color: "#7bc144" }}
                >
                  Bienestar Total
                </span>
                <h2
                  className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-none"
                  style={{ color: "rgba(255,255,255,0.92)" }}
                >
                  Músculos.
                  <br />
                  Huesos.
                  <br />
                  Mente.
                </h2>
                <p
                  className="text-lg md:text-xl font-light mt-5 max-w-xs"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  60 cápsulas veganas para articulaciones,
                  sistema nervioso y recuperación activa.
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
                  style={{ color: "#e8620a" }}
                >
                  Empieza hoy
                </span>
                <h2
                  className="text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none"
                  style={{ color: "rgba(255,255,255,0.92)" }}
                >
                  14,90€
                </h2>
                <p
                  className="text-xl md:text-2xl font-light mt-4"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  Envío en 24/48h · 100% Vegano
                </p>
                <a
                  href="#packs"
                  className="mt-8 inline-flex items-center gap-3 text-white font-semibold text-sm tracking-widest uppercase px-8 py-4 rounded-full border border-white/20 hover:border-white/60 hover:bg-white/5 transition-all duration-300 pointer-events-auto"
                >
                  Ver Packs y Precios
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
