"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type NfcTapAnimationProps = {
  active: boolean;
};

export function NfcTapAnimation({ active }: NfcTapAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      34,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0.4, 7.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.8));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(3, 5, 5);
    scene.add(keyLight);

    const stage = new THREE.Group();
    stage.rotation.x = -0.08;
    scene.add(stage);

    const table = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 0.12, 2.7),
      new THREE.MeshStandardMaterial({
        color: 0x777873,
        roughness: 0.8,
        metalness: 0.05,
      }),
    );
    table.position.set(0, -1.35, 0);
    stage.add(table);

    const objectGroup = new THREE.Group();
    objectGroup.position.set(0.9, -0.85, 0.05);
    stage.add(objectGroup);

    const object = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.42, 0.82),
      new THREE.MeshStandardMaterial({
        color: 0x464844,
        roughness: 0.42,
        metalness: 0.45,
      }),
    );
    objectGroup.add(object);

    const tag = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.025, 32),
      new THREE.MeshBasicMaterial({ color: 0xd8d8d0 }),
    );
    tag.rotation.x = Math.PI / 2;
    tag.position.set(0, 0.23, 0);
    objectGroup.add(tag);

    const pulse = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.018, 8, 48),
      new THREE.MeshBasicMaterial({
        color: 0x9ee6c1,
        transparent: true,
        opacity: 0,
      }),
    );
    pulse.rotation.x = Math.PI / 2;
    pulse.position.set(0, 0.27, 0);
    objectGroup.add(pulse);

    const handGroup = new THREE.Group();
    handGroup.position.set(-0.7, 2.6, 0.35);
    handGroup.rotation.z = -0.12;
    stage.add(handGroup);

    const skin = new THREE.MeshStandardMaterial({
      color: 0xc59b7f,
      roughness: 0.7,
      metalness: 0,
    });

    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 20), skin);
    palm.scale.set(0.82, 1.15, 0.38);
    handGroup.add(palm);

    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.68, 8, 16), skin);
    finger.rotation.z = -0.14;
    finger.position.set(0.48, -0.15, 0.02);
    handGroup.add(finger);

    const fingerTwo = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.58, 8, 16), skin);
    fingerTwo.rotation.z = -0.28;
    fingerTwo.position.set(0.24, -0.32, 0.02);
    handGroup.add(fingerTwo);

    const phoneGroup = new THREE.Group();
    phoneGroup.position.set(0.15, 2.75, 0.35);
    phoneGroup.rotation.z = -0.12;
    stage.add(phoneGroup);

    const phone = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 1.58, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0x262927,
        roughness: 0.28,
        metalness: 0.7,
      }),
    );
    phoneGroup.add(phone);

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 1.3, 0.018),
      new THREE.MeshBasicMaterial({ color: 0x9fb8b0 }),
    );
    screen.position.z = 0.07;
    phoneGroup.add(screen);

    const phoneMark = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.012, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xd8d8d0 }),
    );
    phoneMark.position.set(0, -0.48, 0.09);
    phoneGroup.add(phoneMark);

    const clock = new THREE.Clock();
    let frame = 0;
    let lastActive = false;

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const isActive = activeRef.current;

      if (isActive && !lastActive) {
        pulse.scale.setScalar(0.5);
      }
      lastActive = isActive;

      const tap = isActive ? Math.sin(elapsed * 8) * 0.06 : 0;
      const handTargetY = isActive ? 0.45 + tap : 2.6;
      const phoneTargetY = isActive ? 0.48 + tap * 0.35 : 2.75;
      handGroup.position.y += (handTargetY - handGroup.position.y) * 0.13;
      phoneGroup.position.y += (phoneTargetY - phoneGroup.position.y) * 0.13;

      const pulseScale = pulse.scale.x + (isActive ? 0.035 : -0.02);
      pulse.scale.setScalar(THREE.MathUtils.clamp(pulseScale, 0.5, 2.4));
      (pulse.material as THREE.MeshBasicMaterial).opacity = isActive
        ? Math.max(0, 0.65 - (pulse.scale.x - 0.5) * 0.3)
        : 0;

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
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      renderer.dispose();
      scene.traverse((item) => {
        if (!(item instanceof THREE.Mesh)) return;
        item.geometry.dispose();
        if (Array.isArray(item.material)) {
          item.material.forEach((material) => material.dispose());
        } else {
          item.material.dispose();
        }
      });
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
          Tap simulator
        </span>
        <span className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
          <span className={`h-1.5 w-1.5 rounded-full ${active ? "animate-pulse bg-emerald-400" : "bg-[var(--muted)]"}`} />
          {active ? "Reading" : "Ready"}
        </span>
      </div>
      <div
        ref={containerRef}
        className="h-52 w-full"
        aria-label="Three dimensional animation of a phone tapping an NFC object"
        role="img"
      />
    </div>
  );
}
