// The 360 Tour player canvas (loaded lazily — three.js and Spark only download for tours).
//   360: the equirectangular panorama on the inside of a sphere; drag to look, wheel/pinch to zoom,
//        a slow turn until the viewer touches it.
//   3D:  the Gaussian-splat scene (.spz, Spark) with Spark's controls: drag to turn, WASD/arrows
//        to walk (a touch joystick feeds the same movement). Immersion: the world's people stand
//        around as cutouts that always face you; the page hears who is close enough to talk to.
//        If it can't load, the page goes back to 360.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export type TourMode = '360' | '3d';

interface Props {
  spzUrl: string;
  panoramaUrl: string;
  mode: TourMode;
  /** 3D: true while the scene downloads (17 MB-ish), false once it shows. */
  onLoading3d?: (loading: boolean) => void;
  on3dError?: () => void;
  /** 3D: people standing in the world (transparent full-body cutouts). */
  people?: { name: string; bodyUrl: string }[];
  /** 3D: the person within talking distance (index in `people`), or null. */
  onNear?: (index: number | null) => void;
  /** 3D: whether the viewer is walking (the page sways the first-person hands). */
  onMoving?: (moving: boolean) => void;
  /** 3D: a touch joystick's push, x right / y back, -1..1 (read every frame). */
  stick?: { current: { x: number; y: number } };
}

// Viggle worlds aren't in meters (one unit was ~5 m in a Wild West town). The camera starts at a
// standing person's eyes, so the drop to the ground under it is the yardstick: ~1.6 m. People,
// talking distance and walking speed are in meters times that scale.
const EYE_M = 1.6;
const PERSON_M = 1.7;
const TALK_DISTANCE = 1.8;
const WALK_M = 2.5;

export default function TourViewer({ spzUrl, panoramaUrl, mode, onLoading3d, on3dError, people = [], onNear, onMoving, stick }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cb = useRef({ onLoading3d, on3dError, onNear, onMoving });
  cb.current = { onLoading3d, on3dError, onNear, onMoving };
  const peopleKey = people.map((p) => p.bodyUrl).join('|');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    const renderer = new THREE.WebGLRenderer({ antialias: mode === '360' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    const canvas = renderer.domElement;
    canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;cursor:grab';
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.01, 1000);
    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();
    const cleanups: (() => void)[] = [];

    if (mode === '360') {
      const geometry = new THREE.SphereGeometry(500, 64, 40);
      geometry.scale(-1, 1, 1); // look at the inside
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      const texture = loader.load(panoramaUrl);
      texture.colorSpace = THREE.SRGBColorSpace;
      const sphere = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture }));
      scene.add(sphere);
      cleanups.push(() => { geometry.dispose(); texture.dispose(); (sphere.material as THREE.Material).dispose(); });

      // Look around: longitude/latitude from drags, field of view from wheel / pinch.
      // lon 180 faces the middle of the panorama (what the scene was framed around).
      let lon = 180, lat = 0, touched = false;
      const pointers = new Map<number, { x: number; y: number }>();
      let pinch = 0;
      const down = (e: PointerEvent) => { touched = true; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; };
      const move = (e: PointerEvent) => {
        const prev = pointers.get(e.pointerId);
        if (!prev) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinch) camera.fov = THREE.MathUtils.clamp(camera.fov * (pinch / d), 30, 95);
          pinch = d;
          camera.updateProjectionMatrix();
          return;
        }
        const k = camera.fov / (host.clientHeight || 1);
        lon -= (e.clientX - prev.x) * k;
        lat = THREE.MathUtils.clamp(lat + (e.clientY - prev.y) * k, -85, 85);
      };
      const up = (e: PointerEvent) => { pointers.delete(e.pointerId); pinch = 0; canvas.style.cursor = 'grab'; };
      const wheel = (e: WheelEvent) => { e.preventDefault(); touched = true; camera.fov = THREE.MathUtils.clamp(camera.fov + e.deltaY * 0.05, 30, 95); camera.updateProjectionMatrix(); };
      canvas.addEventListener('pointerdown', down);
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
      canvas.addEventListener('wheel', wheel, { passive: false });
      cleanups.push(() => {
        canvas.removeEventListener('pointerdown', down);
        canvas.removeEventListener('pointermove', move);
        canvas.removeEventListener('pointerup', up);
        canvas.removeEventListener('pointercancel', up);
        canvas.removeEventListener('wheel', wheel);
      });
      const target = new THREE.Vector3();
      renderer.setAnimationLoop(() => {
        if (!touched) lon += 0.03;
        const phi = THREE.MathUtils.degToRad(90 - lat);
        const theta = THREE.MathUtils.degToRad(lon);
        target.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
        camera.lookAt(target);
        renderer.render(scene, camera);
      });
    } else {
      cb.current.onLoading3d?.(true);
      void import('@sparkjsdev/spark').then(({ SparkRenderer, SplatMesh, SparkControls }) => {
        if (disposed) return;
        scene.add(new SparkRenderer({ renderer }));
        // Viggle scenes are already y-up with the camera at the origin (checked 2026-10-22).
        const mesh = new SplatMesh({ url: spzUrl });
        scene.add(mesh);
        const controls = new SparkControls({ canvas });
        controls.fpsMovement.moveSpeed = WALK_M;
        let scale = 1;
        // What's below the eyes around each spot (sorted heights of the splats there).
        const below = (spots: { x: number; z: number }[], r: number) => {
          const ys = spots.map(() => [] as number[]);
          mesh.forEachSplat((_, c) => {
            if (c.y >= 0) return;
            spots.forEach((s, k) => { if (Math.hypot(c.x - s.x, c.z - s.z) < r) ys[k].push(c.y); });
          });
          return ys.map((a) => a.sort((p, q) => p - q));
        };
        // The ground there: a low percentile (stray splats under the floor don't count).
        const ground = (ys: number[]) => (ys.length < 20 ? null : ys[Math.floor(ys.length * 0.1)]);
        // The world's people: cutouts ~1.7 m tall, shown once the world's scale is known and each has
        // found a free spot to stand in.
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        const sprites = people.map((person) => {
          const texture = loader.load(person.bodyUrl);
          texture.colorSpace = THREE.SRGBColorSpace;
          // alphaTest: the cutout's empty pixels write no depth, so the world shows around the person.
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.5 }));
          sprite.visible = false;
          scene.add(sprite);
          return sprite;
        });
        cleanups.push(() => sprites.forEach((sp) => { sp.material.map?.dispose(); sp.material.dispose(); }));
        let near: number | null = null;
        let moving = false;
        let still = 0;
        const last = new THREE.Vector3();
        mesh.initialized.then(() => {
          if (disposed) return;
          const under = ground(below([{ x: 0, z: 0 }], 1)[0]);
          const eye = under !== null && -under > 0.05 && -under < 5 ? -under : EYE_M;
          scale = eye / EYE_M;
          controls.fpsMovement.moveSpeed = WALK_M * scale;
          // Spots 2-3.5 m away, in front and to the sides (lon 180 faces -z). A good one is floor
          // level (not up on a fountain or a table) with little in the body's way (walls, trees…).
          const spots: { x: number; z: number }[] = [];
          for (let a = -1.6; a <= 1.6; a += 0.4) for (const r of [2, 2.7, 3.4]) spots.push({ x: Math.sin(Math.PI + a) * r * scale, z: Math.cos(Math.PI + a) * r * scale });
          const ranked = below(spots, 0.3 * scale).map((ys, k) => {
            const g = ground(ys);
            const raised = g === null || g > -eye * 0.75;
            const clutter = g === null ? 1 : ys.filter((y) => y > g + eye * 0.12).length / ys.length;
            return { ...spots[k], g: g ?? -eye, score: clutter + (raised ? 1 : 0) };
          }).sort((p, q) => p.score - q.score);
          // The best spots, at least 0.8 m apart.
          const chosen: typeof ranked = [];
          for (const s of ranked) if (chosen.length < sprites.length && chosen.every((c) => Math.hypot(c.x - s.x, c.z - s.z) > 0.8 * scale)) chosen.push(s);
          const h = PERSON_M * scale;
          sprites.forEach((sp, i) => {
            const s = chosen[i] ?? ranked[i];
            sp.scale.set(h * 2 / 3, h, 1); // the cutouts are 2:3
            sp.position.set(s.x, s.g + h / 2, s.z);
            sp.visible = true;
          });
          cb.current.onLoading3d?.(false);
        }, () => {
          if (!disposed) { cb.current.onLoading3d?.(false); cb.current.on3dError?.(); }
        });
        cleanups.push(() => mesh.dispose());
        renderer.setAnimationLoop(() => {
          const push = stick?.current;
          controls.fpsMovement.extraMove.set(push?.x ?? 0, 0, push?.y ?? 0);
          controls.update(camera);
          // Who is close enough to talk to (the nearest within reach).
          let best: number | null = null, bestD = TALK_DISTANCE * scale;
          sprites.forEach((sp, i) => { if (!sp.visible) return; const d = Math.hypot(sp.position.x - camera.position.x, sp.position.z - camera.position.z); if (d < bestD) { bestD = d; best = i; } });
          if (best !== near) { near = best; cb.current.onNear?.(near); }
          // Walking or not (with a short grace so the hands don't flicker).
          const stepped = camera.position.distanceTo(last) > 0.002 * scale;
          last.copy(camera.position);
          still = stepped ? 0 : still + 1;
          const now = stepped || still < 8;
          if (now !== moving) { moving = now; cb.current.onMoving?.(moving); }
          renderer.render(scene, camera);
        });
      }, () => { if (!disposed) { cb.current.onLoading3d?.(false); cb.current.on3dError?.(); } });
    }

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      cleanups.forEach((c) => c());
      renderer.dispose();
      canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, spzUrl, panoramaUrl, peopleKey]);

  return <div ref={hostRef} className="absolute inset-0" />;
}
