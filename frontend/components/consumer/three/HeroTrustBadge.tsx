"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function readAccentColor(): number {
  if (typeof window === "undefined") return 0x5b5bf6;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--vc-accent").trim();
  if (!raw) return 0x5b5bf6;
  return new THREE.Color(raw).getHex();
}

/**
 * Home's signature 3D piece — a rotating metallic "trust seal": a beveled
 * ring with a checkmark suspended at its center, orbited by a thin halo
 * ring. Deliberately distinct from the scan page's wireframe verification
 * orb, so Home has its own 3D identity rather than reusing the same asset.
 * Same raw-three.js construction pattern as ThreeHero/VerificationOrb
 * (ResizeObserver, pointer parallax, full manual disposal).
 */
export function HeroTrustBadge({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      34,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      100,
    );
    camera.position.set(0, 0, 6.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(3, 4, 5);
    scene.add(key);

    let accentColor = readAccentColor();

    const group = new THREE.Group();
    scene.add(group);

    const ringMaterial = new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.6,
      roughness: 0.25,
      emissive: new THREE.Color(accentColor),
      emissiveIntensity: 0.15,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.14, 32, 128), ringMaterial);
    group.add(ring);

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.35,
    });
    const halo = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.015, 8, 128), haloMaterial);
    group.add(halo);

    const checkMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      metalness: 0.3,
      roughness: 0.35,
    });
    const checkGroup = new THREE.Group();
    const shortArm = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.22, 0.22), checkMaterial);
    shortArm.position.set(-0.5, -0.15, 0);
    shortArm.rotation.z = Math.PI / 4;
    checkGroup.add(shortArm);
    const longArm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.22), checkMaterial);
    longArm.position.set(0.35, 0.2, 0);
    longArm.rotation.z = -Math.PI / 4;
    checkGroup.add(longArm);
    group.add(checkGroup);

    const themeObserver = new MutationObserver(() => {
      accentColor = readAccentColor();
      ringMaterial.color.setHex(accentColor);
      ringMaterial.emissive.setHex(accentColor);
      haloMaterial.color.setHex(accentColor);
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const targetRotation = new THREE.Vector2();
    function onPointerMove(event: PointerEvent) {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      targetRotation.x = y * 0.2;
      targetRotation.y = x * 0.3;
    }
    if (!reduceMotion) container.addEventListener("pointermove", onPointerMove);

    const clock = new THREE.Clock();
    let animationFrame = 0;

    function renderOnce() {
      renderer.render(scene, camera);
    }

    function animate() {
      animationFrame = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      group.rotation.y += (targetRotation.y - group.rotation.y) * 0.04 + 0.002;
      group.rotation.x += (targetRotation.x - group.rotation.x) * 0.04;
      group.position.y = Math.sin(elapsed * 0.5) * 0.08;
      halo.rotation.z = elapsed * 0.2;

      renderer.render(scene, camera);
    }

    if (reduceMotion) {
      renderOnce();
    } else {
      animate();
    }

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const width = container.clientWidth;
      const height = Math.max(container.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (reduceMotion) renderOnce();
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
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
      className={className}
      aria-label="A rotating 3D seal representing a verified product"
      role="img"
    />
  );
}
