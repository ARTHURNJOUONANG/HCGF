"use client";

import { useEffect, useRef } from "react";

function earthTexture(THREE: typeof import("three")) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const sky = ctx.createLinearGradient(0, 0, 0, 1024);
  sky.addColorStop(0, "#082a62");
  sky.addColorStop(0.5, "#1a6fd4");
  sky.addColorStop(1, "#041830");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 2048, 1024);

  ctx.fillStyle = "#c4a574";
  const land = (x: number, y: number, rx: number, ry: number) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  land(1080, 420, 140, 90);
  land(1180, 520, 90, 160);
  land(980, 380, 80, 50);
  land(420, 400, 180, 110);
  land(560, 560, 70, 120);
  land(1680, 620, 120, 70);
  land(1520, 480, 90, 60);

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 12; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, (i / 12) * 1024);
    ctx.lineTo(2048, (i / 12) * 1024);
    ctx.stroke();
  }
  for (let i = 0; i < 24; i += 1) {
    ctx.beginPath();
    ctx.moveTo((i / 24) * 2048, 0);
    ctx.lineTo((i / 24) * 2048, 1024);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function VitrineGlobe({ active = 0 }: { active?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let disposed = false;
    let raf = 0;
    const mouse = { x: 0, y: 0 };
    const onMove = (event: MouseEvent) => {
      mouse.x = event.clientX / window.innerWidth - 0.5;
      mouse.y = event.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const boot = async () => {
      const THREE = await import("three");
      if (disposed || !canvas) return;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.55;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
      camera.position.set(0, 0, 5.2);

      const map = earthTexture(THREE);
      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(1.42, 64, 64),
        new THREE.MeshStandardMaterial({
          map,
          roughness: 0.38,
          metalness: 0.12,
          emissive: new THREE.Color("#1a6fd4"),
          emissiveIntensity: 0.35,
        }),
      );
      const grid = new THREE.Mesh(
        new THREE.SphereGeometry(1.435, 36, 24),
        new THREE.MeshBasicMaterial({
          color: 0xb9dcff,
          wireframe: true,
          transparent: true,
          opacity: 0.32,
        }),
      );
      const atmo = new THREE.Mesh(
        new THREE.SphereGeometry(1.58, 32, 32),
        new THREE.MeshBasicMaterial({
          color: 0x4da3ff,
          transparent: true,
          opacity: 0.14,
          side: THREE.BackSide,
        }),
      );
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.68, 0.048, 16, 96),
        new THREE.MeshStandardMaterial({
          color: 0xf7901e,
          emissive: 0xf7901e,
          emissiveIntensity: 1.1,
          roughness: 0.25,
          metalness: 0.45,
        }),
      );
      ring.rotation.x = 1.15;
      ring.rotation.y = 0.35;

      const world = new THREE.Group();
      world.add(globe, grid, atmo, ring);
      world.position.set(2.08, 0.28, 0);
      world.scale.setScalar(0.5);
      scene.add(world);

      const starGeo = new THREE.BufferGeometry();
      const starCount = 420;
      const positions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i += 1) {
        positions[i * 3] = (Math.random() - 0.5) * 28;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 4;
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const stars = new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.7 }),
      );
      scene.add(stars);

      scene.add(new THREE.AmbientLight(0x9ec8ff, 1.15));
      const key = new THREE.DirectionalLight(0xffffff, 2.1);
      key.position.set(-3, 2.4, 4);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x1a6fd4, 1.2);
      fill.position.set(4, -1, 2);
      scene.add(fill);
      const rim = new THREE.PointLight(0xf7901e, 32, 16);
      rim.position.set(2.2, 0.6, 2.4);
      scene.add(rim);

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = canvas;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(h, 1);
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(canvas.parentElement ?? canvas);

      const tick = () => {
        if (disposed) return;
        const t = performance.now() * 0.001;
        const away = activeRef.current > 0 ? 1 : 0;
        const mobile = window.innerWidth < 768;
        const tx = mobile ? 0.7 : 2.08 + away * 0.35;
        const ty = mobile ? 1.25 : 0.28;
        const tz = 0;
        const ts = (mobile ? 0.42 : 0.5) * (1 - away * 0.18);
        world.position.x += (tx - world.position.x) * 0.08;
        world.position.y += (ty - world.position.y) * 0.08;
        world.position.z += (tz - world.position.z) * 0.08;
        world.scale.setScalar(world.scale.x + (ts - world.scale.x) * 0.08);
        globe.rotation.y = t * 0.45;
        grid.rotation.y = t * 0.45;
        ring.rotation.z = t * 0.85;
        stars.rotation.y = t * 0.02;
        camera.position.x += (mouse.x * 0.7 - camera.position.x) * 0.08;
        camera.position.y += (-mouse.y * 0.4 - camera.position.y) * 0.08;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      tick();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        renderer.dispose();
        globe.geometry.dispose();
        grid.geometry.dispose();
        ring.geometry.dispose();
        starGeo.dispose();
        map?.dispose();
      };
    };

    let cleanup = () => undefined;
    void boot();

    return () => {
      disposed = true;
      window.removeEventListener("mousemove", onMove);
      cleanup();
    };
  }, []);

  return <canvas ref={canvasRef} className="vz-globe-canvas" aria-hidden />;
}
