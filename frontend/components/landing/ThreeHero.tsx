"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ThreeHero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      32,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );

    camera.position.set(0, 0.2, 7.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.appendChild(renderer.domElement);

    // ─────────────────────────────────────────
    // Lighting
    // ─────────────────────────────────────────

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3);
    keyLight.position.set(4, 5, 6);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xffffff, 25, 12);
    rimLight.position.set(-4, 2, 3);
    scene.add(rimLight);

    // ─────────────────────────────────────────
    // Main product group
    // ─────────────────────────────────────────

    const product = new THREE.Group();
    scene.add(product);

    // Watch-inspired case
    const caseGeometry = new THREE.CylinderGeometry(1.65, 1.65, 0.42, 96);

    const caseMaterial = new THREE.MeshStandardMaterial({
      color: 0x8d8d8a,
      metalness: 0.95,
      roughness: 0.2,
    });

    const watchCase = new THREE.Mesh(caseGeometry, caseMaterial);
    watchCase.rotation.x = Math.PI / 2;
    product.add(watchCase);

    // Inner bezel
    const bezelGeometry = new THREE.CylinderGeometry(1.42, 1.42, 0.44, 96);

    const bezelMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b2b2a,
      metalness: 0.8,
      roughness: 0.28,
    });

    const bezel = new THREE.Mesh(bezelGeometry, bezelMaterial);
    bezel.rotation.x = Math.PI / 2;
    bezel.position.z = 0.03;
    product.add(bezel);

    // Dial
    const dialGeometry = new THREE.CylinderGeometry(1.28, 1.28, 0.08, 96);

    const dialMaterial = new THREE.MeshStandardMaterial({
      color: 0x101010,
      metalness: 0.1,
      roughness: 0.35,
    });

    const dial = new THREE.Mesh(dialGeometry, dialMaterial);
    dial.rotation.x = Math.PI / 2;
    dial.position.z = 0.26;
    product.add(dial);

    // ─────────────────────────────────────────
    // Watch markers
    // ─────────────────────────────────────────

    const markers = new THREE.Group();

    const markerMaterial = new THREE.MeshStandardMaterial({
      color: 0xc7c7c3,
      metalness: 0.7,
      roughness: 0.25,
    });

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;

      const markerGeometry = new THREE.BoxGeometry(
        i % 3 === 0 ? 0.08 : 0.035,
        i % 3 === 0 ? 0.18 : 0.12,
        0.025
      );

      const marker = new THREE.Mesh(markerGeometry, markerMaterial);

      marker.position.set(
        Math.sin(angle) * 1.02,
        Math.cos(angle) * 1.02,
        0.32
      );

      marker.rotation.z = -angle;

      markers.add(marker);
    }

    product.add(markers);

    // ─────────────────────────────────────────
    // Watch hands
    // ─────────────────────────────────────────

    const handMaterial = new THREE.MeshStandardMaterial({
      color: 0xe7e7e2,
      metalness: 0.8,
      roughness: 0.2,
    });

    const hourHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.65, 0.035),
      handMaterial
    );

    hourHand.position.set(0, 0.25, 0.37);
    hourHand.rotation.z = -0.4;
    product.add(hourHand);

    const minuteHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.9, 0.035),
      handMaterial
    );

    minuteHand.position.set(0, 0.35, 0.38);
    minuteHand.rotation.z = 1.1;
    product.add(minuteHand);

    // Center pin
    const pin = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 32, 32),
      handMaterial
    );

    pin.position.z = 0.42;
    product.add(pin);

    // ─────────────────────────────────────────
    // Verification ring
    // ─────────────────────────────────────────

    const ringGroup = new THREE.Group();

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });

    const ringGeometry = new THREE.TorusGeometry(1.95, 0.012, 8, 128);

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ringGroup.add(ring);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.1, 0.006, 8, 128),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
      })
    );

    ring2.rotation.x = Math.PI / 2;
    ringGroup.add(ring2);

    product.add(ringGroup);

    // ─────────────────────────────────────────
    // Digital identity marker
    // ─────────────────────────────────────────

    const markerGroup = new THREE.Group();

    const markerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.018, 8, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
      })
    );

    markerRing.rotation.x = Math.PI / 2;
    markerGroup.add(markerRing);

    const markerDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );

    markerDot.position.z = 0.02;
    markerGroup.add(markerDot);

    markerGroup.position.set(1.95, 0.6, 0.1);
    product.add(markerGroup);

    // ─────────────────────────────────────────
    // Cursor interaction
    // ─────────────────────────────────────────

    const mouse = new THREE.Vector2();
    const targetRotation = new THREE.Vector2();

    const onPointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();

      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      targetRotation.x = mouse.y * 0.12;
      targetRotation.y = mouse.x * 0.18;
    };

    container.addEventListener("pointermove", onPointerMove);

    // ─────────────────────────────────────────
    // Animation
    // ─────────────────────────────────────────

    const clock = new THREE.Clock();

    let animationFrame = 0;

    const animate = () => {
      animationFrame = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      product.rotation.x +=
        (targetRotation.x - product.rotation.x) * 0.04;

      product.rotation.y +=
        (targetRotation.y - product.rotation.y) * 0.04;

      product.position.y = Math.sin(elapsed * 0.6) * 0.035;

      ringGroup.rotation.z = elapsed * 0.12;
      ringGroup.rotation.y = Math.sin(elapsed * 0.3) * 0.08;

      markerGroup.position.y = 0.6 + Math.sin(elapsed * 1.2) * 0.04;

      renderer.render(scene, camera);
    };

    animate();

    // ─────────────────────────────────────────
    // Resize
    // ─────────────────────────────────────────

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    resizeObserver.observe(container);

    // ─────────────────────────────────────────
    // Cleanup
    // ─────────────────────────────────────────

    return () => {
      cancelAnimationFrame(animationFrame);

      resizeObserver.disconnect();

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
      className="h-full w-full"
      aria-label="Interactive 3D visualization of a verified physical product"
      role="img"
    />
  );
}