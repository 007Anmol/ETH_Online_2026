"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function readAccentColor(): number {
  if (typeof window === "undefined") return 0x5b5bf6;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--vc-accent")
    .trim();
  if (!raw) return 0x5b5bf6;
  return new THREE.Color(raw).getHex();
}

/**
 * A small reusable abstract 3D motif — an icosahedron "node" shell with an
 * orbiting verification ring, in the consumer accent color. Not a literal
 * sponsor/blockchain logo (the brief explicitly warns against fabricating
 * one) — an abstract network/identity mark in the same spirit as the
 * landing page's ThreeHero, built with the same raw-three.js pattern for
 * consistency (ResizeObserver + pointer parallax + full manual disposal).
 */
export function VerificationOrb({
  className = "",
  interactive = true,
}: {
  className?: string;
  interactive?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      36,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      100,
    );
    camera.position.set(0, 0, 5.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    let accentColor = readAccentColor();

    const shellMaterial = new THREE.MeshBasicMaterial({
      color: accentColor,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 1), shellMaterial);
    group.add(shell);

    const coreMaterial = new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.12,
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), coreMaterial);
    group.add(core);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.01, 8, 120), ringMaterial);
    ring.rotation.x = Math.PI / 2.4;
    group.add(ring);

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 16, 16),
      new THREE.MeshBasicMaterial({ color: accentColor }),
    );
    group.add(dot);

    // Re-tint on theme toggle (the `dark` class flips on <html>).
    const themeObserver = new MutationObserver(() => {
      accentColor = readAccentColor();
      shellMaterial.color.setHex(accentColor);
      coreMaterial.color.setHex(accentColor);
      ringMaterial.color.setHex(accentColor);
      (dot.material as THREE.MeshBasicMaterial).color.setHex(accentColor);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const targetRotation = new THREE.Vector2();

    function onPointerMove(event: PointerEvent) {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      targetRotation.x = y * 0.15;
      targetRotation.y = x * 0.25;
    }

    if (interactive && !reduceMotion) {
      container.addEventListener("pointermove", onPointerMove);
    }

    const clock = new THREE.Clock();
    let animationFrame = 0;

    function renderOnce() {
      renderer.render(scene, camera);
    }

    function animate() {
      animationFrame = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      group.rotation.y += (targetRotation.y - group.rotation.y) * 0.04 + 0.0025;
      group.rotation.x += (targetRotation.x - group.rotation.x) * 0.04;
      ring.rotation.z = elapsed * 0.15;
      dot.position.set(Math.cos(elapsed * 0.4) * 2.05, Math.sin(elapsed * 0.4) * 2.05 * 0.4, 0);

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
  }, [interactive]);

  return (
    <div
      ref={containerRef}
      className={className}
      aria-hidden="true"
      role="presentation"
    />
  );
}
