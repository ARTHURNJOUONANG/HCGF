"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { EVENEMENT_THEME } from "@/lib/theme";
import { couleursDuTheme, creerTerre } from "./terre3d";

/** Fond de scène : bleu abysse du thème courant. */
function couleurFond() {
  const rgb = getComputedStyle(document.documentElement).getPropertyValue("--abyss-rgb").trim() || "4 24 48";
  const [r, g, b] = rgb.split(/\s+/).map(Number);
  return (r << 16) | (g << 8) | b;
}

type Mode = "journey" | "ambience";

const STOPS = [
  { src: "/hcgf/garantie.jpg", x: -5.4, z: -8 },
  { src: "/hcgf/assurance.jpg", x: 5.4, z: -16 },
  { src: "/hcgf/hebergement.jpg", x: -5.2, z: -24 },
  { src: "/hcgf/vol.jpg", x: 5.2, z: -32 },
];

const PATH = [
  { p: 0, cam: [-2.1, 0.9, 11.5], look: [1.4, 0.25, 2] },
  { p: 0.14, cam: [-1.4, 0.72, 6.2], look: [0.3, 0.18, -3] },
  { p: 0.3, cam: [-2.4, 0.62, -4.2], look: [-3.6, 0.15, -8] },
  { p: 0.46, cam: [1.8, 0.6, -12.2], look: [3.4, 0.15, -16] },
  { p: 0.62, cam: [-2.0, 0.58, -20.2], look: [-3.2, 0.15, -24] },
  { p: 0.78, cam: [1.4, 0.56, -28], look: [3.0, 0.15, -32] },
  { p: 0.9, cam: [0, 0.52, -34.2], look: [0, 0.55, -44] },
  { p: 1, cam: [0, 0.48, -37.2], look: [0, 0.58, -44] },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function samplePath(t: number) {
  const p = Math.min(1, Math.max(0, t));
  let i = 0;
  while (i < PATH.length - 2 && PATH[i + 1].p < p) i += 1;
  const a = PATH[i];
  const b = PATH[i + 1];
  const u = (p - a.p) / Math.max(b.p - a.p, 0.0001);
  const s = u * u * (3 - 2 * u);
  return {
    cam: a.cam.map((v, n) => lerp(v, b.cam[n], s)) as [number, number, number],
    look: a.look.map((v, n) => lerp(v, b.look[n], s)) as [number, number, number],
  };
}

export function VitrineWorld({
  mode = "journey",
  progressRef,
}: {
  mode?: Mode;
  progressRef?: MutableRefObject<number>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let disposed = false;
    let raf = 0;
    let smooth = mode === "ambience" ? 0.06 : 0;
    const mouse = { x: 0, y: 0 };
    const onMove = (event: MouseEvent) => {
      mouse.x = event.clientX / window.innerWidth - 0.5;
      mouse.y = event.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    let cleanup = () => undefined;

    const boot = async () => {
      const THREE = await import("three");
      if (disposed || !canvas) return;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(couleurFond(), 1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(couleurFond(), 14, 52);
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);

      const mobile = window.innerWidth < 768;
      const terre = await creerTerre(THREE, 1.28, couleursDuTheme(), mobile);
      if (disposed) {
        terre.liberer();
        return;
      }
      const world = terre.objet;
      world.position.set(1.6, 0.2, 3.8);
      scene.add(world);

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(48, 90),
        new THREE.MeshStandardMaterial({
          color: 0x071a33,
          roughness: 0.82,
          metalness: 0.12,
        }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -1.72, -18);
      scene.add(floor);

      const starGeo = new THREE.BufferGeometry();
      const starCount = 420;
      const positions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i += 1) {
        positions[i * 3] = (Math.random() - 0.5) * 40;
        positions[i * 3 + 1] = Math.random() * 10 + 1.2;
        positions[i * 3 + 2] = 8 - Math.random() * 62;
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      scene.add(
        new THREE.Points(
          starGeo,
          new THREE.PointsMaterial({ color: 0xd7e6ff, size: 0.028, opacity: 0.45, transparent: true }),
        ),
      );

      const guideGeo = new THREE.CylinderGeometry(0.012, 0.012, 2.4, 8);
      const couleursInitiales = couleursDuTheme();
      const guideMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(couleursInitiales.atmosphere),
        transparent: true,
        opacity: 0.22,
      });
      for (let i = 0; i < 8; i += 1) {
        const post = new THREE.Mesh(guideGeo, guideMat);
        post.position.set(i % 2 === 0 ? -2.8 : 2.8, -0.5, 2 - i * 5.4);
        scene.add(post);
      }

      const loader = new THREE.TextureLoader();
      await Promise.all(
        STOPS.map(async (stop) => {
          const texture = await loader.loadAsync(stop.src);
          if (disposed) return;
          texture.colorSpace = THREE.SRGBColorSpace;
          const panel = new THREE.Mesh(
            new THREE.PlaneGeometry(3.35, 2.05),
            new THREE.MeshStandardMaterial({ map: texture, roughness: 0.62, metalness: 0.04 }),
          );
          panel.position.set(stop.x, 0.12, stop.z);
          panel.lookAt(0, 0.12, stop.z + 7);
          const frame = new THREE.Mesh(
            new THREE.PlaneGeometry(3.48, 2.18),
            new THREE.MeshBasicMaterial({ color: 0xd8e4f4, transparent: true, opacity: 0.16 }),
          );
          frame.position.copy(panel.position);
          frame.position.z += stop.x > 0 ? 0.04 : -0.04;
          frame.quaternion.copy(panel.quaternion);
          scene.add(frame, panel);
        }),
      );

      const door = new THREE.Group();
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x0c2748,
        metalness: 0.38,
        roughness: 0.36,
      });
      const brass = new THREE.MeshStandardMaterial({
        color: new THREE.Color(couleursInitiales.accent),
        metalness: 0.55,
        roughness: 0.32,
        emissive: new THREE.Color(couleursInitiales.accent),
        emissiveIntensity: 0.18,
      });
      const colGeo = new THREE.BoxGeometry(0.18, 3.5, 0.22);
      const leftPost = new THREE.Mesh(colGeo, frameMat);
      leftPost.position.set(-1.48, 0.08, 0);
      const rightPost = new THREE.Mesh(colGeo, frameMat);
      rightPost.position.set(1.48, 0.08, 0);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 0.22), frameMat);
      lintel.position.set(0, 1.9, 0);
      const brassLine = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.03, 0.24), brass);
      brassLine.position.set(0, 1.82, 0.02);

      const wingMat = new THREE.MeshStandardMaterial({
        color: 0x12325a,
        metalness: 0.22,
        roughness: 0.42,
      });
      const leftWing = new THREE.Group();
      leftWing.position.set(-1.32, 0.08, 0.03);
      const leftLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.28, 3.15, 0.07), wingMat);
      leftLeaf.position.x = 0.64;
      leftWing.add(leftLeaf);
      const rightWing = new THREE.Group();
      rightWing.position.set(1.32, 0.08, 0.03);
      const rightLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.28, 3.15, 0.07), wingMat);
      rightLeaf.position.x = -0.64;
      rightWing.add(rightLeaf);

      door.add(leftPost, rightPost, lintel, brassLine, leftWing, rightWing);
      door.position.set(0, 0.12, -44);
      scene.add(door);

      const interior = new THREE.Mesh(
        new THREE.PlaneGeometry(5.4, 4.2),
        new THREE.MeshBasicMaterial({ color: 0xf4efe6, transparent: true, opacity: 0.88 }),
      );
      interior.position.set(0, 0.7, -46.6);
      scene.add(interior);

      scene.add(new THREE.AmbientLight(0x9bb8dc, 0.72));
      const key = new THREE.DirectionalLight(0xffffff, 1.25);
      key.position.set(-3, 7, 9);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x7eacde, 0.45);
      fill.position.set(4, 3, 2);
      scene.add(fill);
      const warm = new THREE.PointLight(0xfff1d6, 16, 22);
      warm.position.set(0, 1.4, -45.2);
      scene.add(warm);

      const resize = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(h, 1);
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      resize();
      ro.observe(canvas.parentElement ?? canvas);
      if (disposed) return;

      const tick = () => {
        if (disposed) return;
        const t = performance.now() * 0.001;
        terre.animer(t);

        const target =
          mode === "journey" ? (progressRef?.current ?? 0) : 0.05 + (Math.sin(t * 0.12) * 0.5 + 0.5) * 0.1;
        smooth += (target - smooth) * (mode === "journey" ? 0.055 : 0.028);
        const pose = samplePath(smooth);
        const sway = mode === "journey" ? 0.22 : 0.1;
        camera.position.set(pose.cam[0] + mouse.x * sway, pose.cam[1] + mouse.y * -0.12, pose.cam[2]);
        camera.lookAt(pose.look[0], pose.look[1], pose.look[2]);
        camera.fov = 40 - smooth * 4;
        camera.updateProjectionMatrix();

        const open = Math.max(0, (smooth - 0.78) / 0.22);
        leftWing.rotation.y = -open * 0.92;
        rightWing.rotation.y = open * 0.92;
        warm.intensity = 12 + open * 18;

        renderer.render(scene, camera);
        cancelAnimationFrame(raf);
        if (visible && !document.hidden) raf = requestAnimationFrame(tick);
      };
      // Le thème change : la scène suit sans rechargement.
      const surTheme = () => {
        const c = couleursDuTheme();
        terre.recolorer(c);
        guideMat.color.set(c.atmosphere);
        brass.color.set(c.accent);
        brass.emissive.set(c.accent);
        renderer.setClearColor(couleurFond(), 1);
        scene.fog?.color.setHex(couleurFond());
      };
      window.addEventListener(EVENEMENT_THEME, surTheme);

      // Pas de rendu quand la scène est hors écran ou l’onglet masqué (batterie, CPU).
      let visible = true;
      const io = new IntersectionObserver(([entree]) => {
        const avant = visible;
        visible = entree.isIntersecting;
        if (visible && !avant && !document.hidden) raf = requestAnimationFrame(tick);
      });
      io.observe(canvas);
      const surVisibilite = () => {
        if (!document.hidden && visible) raf = requestAnimationFrame(tick);
      };
      document.addEventListener("visibilitychange", surVisibilite);
      tick();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener(EVENEMENT_THEME, surTheme);
        document.removeEventListener("visibilitychange", surVisibilite);
        renderer.dispose();
        terre.liberer();
        colGeo.dispose();
        guideGeo.dispose();
        starGeo.dispose();
      };
    };

    void boot();
    return () => {
      disposed = true;
      window.removeEventListener("mousemove", onMove);
      cleanup();
    };
  }, [mode, progressRef]);

  return (
    <canvas
      ref={canvasRef}
      className={mode === "journey" ? "vz-globe-canvas" : "vz-ambience-canvas"}
      aria-hidden
    />
  );
}
