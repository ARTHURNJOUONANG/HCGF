/**
 * Globe « en points » : continents réels (masque public/hcgf/terre-masque.png,
 * Natural Earth via world-atlas), atmosphère, anneau d’orbite et arcs animés
 * Afrique → destinations ouvertes. Couleurs lues dans le thème CSS actif.
 */
type Three = typeof import("three");

export type CouleursTerre = {
  ocean: string;
  points: string;
  atmosphere: string;
  accent: string;
};

/** Couleurs du thème courant (variables CSS de :root). */
export function couleursDuTheme(): CouleursTerre {
  const css = getComputedStyle(document.documentElement);
  const lire = (nom: string, defaut: string) => css.getPropertyValue(nom).trim() || defaut;
  return {
    ocean: lire("--navy", "#002654"),
    points: "#dbe8ff",
    atmosphere: lire("--blue-bright", "#1a6fd4"),
    accent: lire("--accent", "#e30613"),
  };
}

const ORIGINES: [number, number][] = [
  [14.69, -17.44], // Dakar
  [5.35, -4.01], // Abidjan
  [4.05, 9.7], // Douala
  [-4.32, 15.31], // Kinshasa
  [33.57, -7.59], // Casablanca
];

const DESTINATIONS: [number, number][] = [
  [48.86, 2.35], // Paris
  [52.52, 13.4], // Berlin
  [50.85, 4.35], // Bruxelles
  [41.9, 12.5], // Rome
  [45.5, -73.57], // Montréal
];

function versVecteur(THREE: Three, lat: number, lon: number, rayon: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -rayon * Math.sin(phi) * Math.cos(theta),
    rayon * Math.cos(phi),
    rayon * Math.sin(phi) * Math.sin(theta),
  );
}

async function chargerMasque(): Promise<{ data: Uint8ClampedArray; w: number; h: number } | null> {
  try {
    const img = new Image();
    img.src = "/hcgf/terre-masque.png";
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return { data: ctx.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
  } catch {
    return null;
  }
}

function texturePoint(THREE: Three) {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.55, "rgba(255,255,255,0.9)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

export async function creerTerre(THREE: Three, rayon: number, couleurs: CouleursTerre, mobile: boolean) {
  const groupe = new THREE.Group();
  const aJeter: { dispose(): void }[] = [];

  // Océan : sphère sombre légèrement translucide.
  const oceanGeo = new THREE.SphereGeometry(rayon * 0.995, 64, 64);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(couleurs.ocean),
    roughness: 0.65,
    metalness: 0.2,
    emissive: new THREE.Color(couleurs.atmosphere),
    emissiveIntensity: 0.08,
  });
  groupe.add(new THREE.Mesh(oceanGeo, oceanMat));
  aJeter.push(oceanGeo, oceanMat);

  // Continents en points (sphère de Fibonacci filtrée par le masque terre).
  const masque = await chargerMasque();
  const total = mobile ? 9000 : 16000;
  const positions: number[] = [];
  const dore = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < total; i++) {
    const y = 1 - (i / (total - 1)) * 2;
    const theta = dore * i;
    const lat = (Math.asin(y) * 180) / Math.PI;
    const lon = ((((theta * 180) / Math.PI) % 360) + 360) % 360 - 180;
    if (masque) {
      const px = Math.min(masque.w - 1, Math.floor(((lon + 180) / 360) * masque.w));
      const py = Math.min(masque.h - 1, Math.floor(((90 - lat) / 180) * masque.h));
      if (masque.data[(py * masque.w + px) * 4] < 128) continue;
    } else if (Math.random() > 0.3) {
      continue;
    }
    const v = versVecteur(THREE, lat, lon, rayon);
    positions.push(v.x, v.y, v.z);
  }
  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const sprite = texturePoint(THREE);
  const pointsMat = new THREE.PointsMaterial({
    color: new THREE.Color(couleurs.points),
    size: rayon * (mobile ? 0.034 : 0.026),
    map: sprite,
    transparent: true,
    depthWrite: false,
    opacity: 0.92,
  });
  groupe.add(new THREE.Points(pointsGeo, pointsMat));
  aJeter.push(pointsGeo, pointsMat, sprite);

  // Atmosphère : halo de Fresnel côté arrière.
  const atmoGeo = new THREE.SphereGeometry(rayon * 1.16, 48, 48);
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: { couleur: { value: new THREE.Color(couleurs.atmosphere) } },
    vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 couleur; varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); gl_FragColor = vec4(couleur, 1.0) * i; }`,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
  groupe.add(new THREE.Mesh(atmoGeo, atmoMat));
  aJeter.push(atmoGeo, atmoMat);

  // Arcs Afrique → destinations, avec une impulsion lumineuse qui voyage.
  const arcs: { courbe: InstanceType<Three["QuadraticBezierCurve3"]>; impulsion: InstanceType<Three["Mesh"]>; decalage: number }[] = [];
  const arcMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(couleurs.accent),
    transparent: true,
    opacity: 0.55,
  });
  const impulsionGeo = new THREE.SphereGeometry(rayon * 0.018, 12, 12);
  const impulsionMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(couleurs.accent) });
  const repereGeo = new THREE.RingGeometry(rayon * 0.022, rayon * 0.034, 24);
  const repereMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(couleurs.accent),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });
  aJeter.push(arcMat, impulsionGeo, impulsionMat, repereGeo, repereMat);
  const reperes: InstanceType<Three["Mesh"]>[] = [];
  DESTINATIONS.forEach(([lat, lon], i) => {
    const depart = versVecteur(THREE, ...ORIGINES[i % ORIGINES.length], rayon);
    const arrivee = versVecteur(THREE, lat, lon, rayon);
    const milieu = depart.clone().add(arrivee).multiplyScalar(0.5);
    const hauteur = 1 + depart.distanceTo(arrivee) / (rayon * 2.2);
    milieu.normalize().multiplyScalar(rayon * hauteur);
    const courbe = new THREE.QuadraticBezierCurve3(depart, milieu, arrivee);
    const geo = new THREE.BufferGeometry().setFromPoints(courbe.getPoints(64));
    aJeter.push(geo);
    groupe.add(new THREE.Line(geo, arcMat));
    const impulsion = new THREE.Mesh(impulsionGeo, impulsionMat);
    groupe.add(impulsion);
    arcs.push({ courbe, impulsion, decalage: i / DESTINATIONS.length });

    const repere = new THREE.Mesh(repereGeo, repereMat);
    repere.position.copy(versVecteur(THREE, lat, lon, rayon * 1.003));
    repere.lookAt(repere.position.clone().multiplyScalar(2));
    groupe.add(repere);
    reperes.push(repere);
  });

  // Anneau d’orbite, comme le trait du logo.
  const anneauGeo = new THREE.TorusGeometry(rayon * 1.32, rayon * 0.012, 8, 160);
  const anneauMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(couleurs.accent),
    transparent: true,
    opacity: 0.85,
  });
  const anneau = new THREE.Mesh(anneauGeo, anneauMat);
  anneau.rotation.x = 1.18;
  anneau.rotation.y = -0.32;
  aJeter.push(anneauGeo, anneauMat);

  const ensemble = new THREE.Group();
  ensemble.add(groupe, anneau);
  // Afrique et Europe face à la caméra au départ.
  groupe.rotation.y = -2.25;
  groupe.rotation.x = 0.28;

  return {
    objet: ensemble,
    animer(t: number) {
      groupe.rotation.y = -2.25 + Math.sin(t * 0.12) * 0.35;
      anneau.rotation.z = t * 0.16;
      for (const arc of arcs) {
        const u = (t * 0.22 + arc.decalage) % 1;
        arc.impulsion.position.copy(arc.courbe.getPoint(u));
        arc.impulsion.scale.setScalar(Math.sin(u * Math.PI) * 1.2 + 0.2);
      }
      const pulse = 1 + (Math.sin(t * 2.4) * 0.5 + 0.5) * 0.6;
      for (const r of reperes) r.scale.setScalar(pulse);
    },
    recolorer(c: CouleursTerre) {
      oceanMat.color.set(c.ocean);
      oceanMat.emissive.set(c.atmosphere);
      atmoMat.uniforms.couleur.value.set(c.atmosphere);
      for (const m of [arcMat, impulsionMat, repereMat, anneauMat]) m.color.set(c.accent);
    },
    liberer() {
      for (const o of aJeter) o.dispose();
    },
  };
}
