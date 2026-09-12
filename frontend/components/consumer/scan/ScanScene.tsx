"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type ScanScenePhase =
  | "idle"
  | "scanning"
  | "VERIFIED"
  | "INCOMPLETE"
  | "SUSPICIOUS"
  | "NOT_FOUND";

const PHASE_COLOR: Record<ScanScenePhase, number> = {
  idle: 0x9a9a96,
  scanning: 0xffffff,
  VERIFIED: 0x10b981,
  INCOMPLETE: 0xf59e0b,
  SUSPICIOUS: 0xef4444,
  NOT_FOUND: 0x9a9a96,
};

export function ScanScene({ phase }: { phase: ScanScenePhase }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      36,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0.3, 6.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(3, 4, 5);
    scene.add(key);

    const rig = new THREE.Group();
    scene.add(rig);

    // Core: a faceted "product identity" crystal
    const coreGeometry = new THREE.IcosahedronGeometry(1.05, 1);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.35,
      roughness: 0.25,
      flatShading: true,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    rig.add(core);

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const wireShell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.22, 1),
      wireMaterial,
    );
    rig.add(wireShell);

    // Scan rings — orbiting torus rings that pulse outward while scanning
    const ringMaterials: THREE.MeshBasicMaterial[] = [];
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5 - i * 0.12,
        side: THREE.DoubleSide,
      });
      ringMaterials.push(material);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.55 + i * 0.28, 0.008, 8, 96),
        material,
      );
      ring.rotation.x = Math.PI / 2;
      rings.push(ring);
      rig.add(ring);
    }

    // Particle field of "identity points" drifting around the core
    const particleCount = 90;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const radius = 1.8 + Math.random() * 1.1;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.035,
      transparent: true,
      opacity: 0.6,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    rig.add(particles);

    const targetColor = new THREE.Color(PHASE_COLOR.idle);
    const currentColor = new THREE.Color(PHASE_COLOR.idle);

    const mouse = new THREE.Vector2();
    const targetRotation = new THREE.Vector2();
    const onPointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      targetRotation.x = mouse.y * 0.15;
      targetRotation.y = mouse.x * 0.25;
    };
    container.addEventListener("pointermove", onPointerMove);

    const clock = new THREE.Clock();
    let animationFrame = 0;

    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const scanning = phaseRef.current === "scanning";

      targetColor.setHex(PHASE_COLOR[phaseRef.current]);
      currentColor.lerp(targetColor, 0.05);
      coreMaterial.color.copy(currentColor);
      wireMaterial.color.copy(currentColor);
      ringMaterials.forEach((m) => m.color.copy(currentColor));
      particleMaterial.color.copy(currentColor);

      rig.rotation.y +=
        (targetRotation.y - rig.rotation.y) * 0.04 + (scanning ? 0.006 : 0.0015);
      rig.rotation.x += (targetRotation.x - rig.rotation.x) * 0.04;

      const pulse = scanning ? 1 + Math.sin(elapsed * 6) * 0.06 : 1;
      core.scale.setScalar(pulse);
      wireShell.scale.setScalar(1 + Math.sin(elapsed * (scanning ? 6 : 1.2)) * 0.015);

      rings.forEach((ring, i) => {
        const speed = scanning ? 1.6 : 0.4;
        ring.rotation.z = elapsed * (0.3 + i * 0.15) * speed;
        const breathe = scanning
          ? 1 + Math.sin(elapsed * 3 - i * 0.6) * 0.05
          : 1;
        ring.scale.setScalar(breathe);
      });

      particles.rotation.y = elapsed * 0.05;
      particles.rotation.x = Math.sin(elapsed * 0.2) * 0.1;

      rig.position.y = Math.sin(elapsed * 0.6) * 0.05;

      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((m) => m.dispose());
          } else {
            material.dispose();
          }
        }
      });
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      aria-label="3D visualization of the product verification scan"
      role="img"
    />
  );
}
