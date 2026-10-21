// The 360 Tour player canvas (loaded lazily — three.js and Spark only download for tours).
//   360: the equirectangular panorama on the inside of a sphere; drag to look, wheel/pinch to zoom,
//        a slow turn until the viewer touches it.
//   3D:  the Gaussian-splat scene (.spz, Spark) with Spark's controls: drag to turn, WASD/arrows
//        to walk. If it can't load, the page goes back to 360.
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
}

export default function TourViewer({ spzUrl, panoramaUrl, mode, onLoading3d, on3dError }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cb = useRef({ onLoading3d, on3dError });
  cb.current = { onLoading3d, on3dError };

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
        controls.fpsMovement.moveSpeed = 1.2;
        mesh.initialized.then(() => { if (!disposed) cb.current.onLoading3d?.(false); }, () => {
          if (!disposed) { cb.current.onLoading3d?.(false); cb.current.on3dError?.(); }
        });
        cleanups.push(() => mesh.dispose());
        renderer.setAnimationLoop(() => {
          controls.update(camera);
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
  }, [mode, spzUrl, panoramaUrl]);

  return <div ref={hostRef} className="absolute inset-0" />;
}
