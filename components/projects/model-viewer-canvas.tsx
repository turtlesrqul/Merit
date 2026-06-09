"use client";

import { useEffect, useRef, useState } from "react";
import type { Object3D, WebGLRenderer } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type ModelFormat = "gltf" | "stl" | "obj";

type ModelViewerCanvasProps = {
  modelUrl: string;
  artifactType: string;
  className?: string;
};

function inferModelFormat(urlValue: string, artifactType: string): ModelFormat | null {
  const normalizedType = artifactType.toLowerCase();
  const lowerUrl = urlValue.toLowerCase();

  if (normalizedType === "model3d" || /\.(glb|gltf)(\?.*)?$/i.test(lowerUrl)) {
    return "gltf";
  }
  if (/\.stl(\?.*)?$/i.test(lowerUrl)) {
    return "stl";
  }
  if (/\.obj(\?.*)?$/i.test(lowerUrl)) {
    return "obj";
  }
  return null;
}

function disposeObject3d(object: Object3D) {
  object.traverse((child) => {
    const mesh = child as unknown as {
      geometry?: { dispose: () => void };
      material?: { dispose: () => void } | Array<{ dispose: () => void }>;
    };
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
      return;
    }

    material?.dispose();
  });
}

export function ModelViewerCanvas({ modelUrl, artifactType, className }: ModelViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const format = inferModelFormat(modelUrl, artifactType);

    if (!container || !format) {
      setErrorMessage("Unsupported 3D format. Upload GLB, GLTF, STL, or OBJ.");
      return;
    }
    const mountContainer: HTMLDivElement = container;

    let isDisposed = false;
    let animationFrame = 0;
    let sceneObject: Object3D | null = null;
    let renderer: WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let resizeObserver: ResizeObserver | null = null;

    async function mount() {
      try {
        const THREE = await import("three");
        const [{ OrbitControls }, { GLTFLoader }, { STLLoader }, { OBJLoader }] = await Promise.all([
          import("three/examples/jsm/controls/OrbitControls.js"),
          import("three/examples/jsm/loaders/GLTFLoader.js"),
          import("three/examples/jsm/loaders/STLLoader.js"),
          import("three/examples/jsm/loaders/OBJLoader.js")
        ]);

        if (isDisposed) {
          return;
        }

        setErrorMessage(null);
        mountContainer.innerHTML = "";

        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#f4f7fb");

        const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
        camera.position.set(3, 2, 3);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(mountContainer.clientWidth, mountContainer.clientHeight);
        mountContainer.appendChild(renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
        const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
        keyLight.position.set(6, 8, 6);
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
        fillLight.position.set(-5, 3, -4);

        scene.add(ambientLight);
        scene.add(keyLight);
        scene.add(fillLight);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0, 0);

        const baseMaterial = new THREE.MeshStandardMaterial({
          color: "#d4a005",
          metalness: 0.08,
          roughness: 0.55
        });

        function fitCameraToObject(object3d: Object3D) {
          const box = new THREE.Box3().setFromObject(object3d);
          if (box.isEmpty()) {
            return;
          }
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          object3d.position.sub(center);

          const maxDimension = Math.max(size.x, size.y, size.z);
          const fitDistance = Math.max(maxDimension * 1.8, 2.25);
          camera.position.set(fitDistance, fitDistance * 0.72, fitDistance);
          camera.near = Math.max(0.01, maxDimension / 300);
          camera.far = Math.max(1000, maxDimension * 250);
          camera.updateProjectionMatrix();
          controls?.target.set(0, 0, 0);
        }

        function addLoadedObject(object3d: Object3D) {
          sceneObject = object3d;
          sceneObject.traverse((child) => {
            if (!("isMesh" in child) || !child.isMesh) {
              return;
            }
            const mesh = child as unknown as {
              castShadow: boolean;
              receiveShadow: boolean;
              material?: unknown;
            };
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (!mesh.material) {
              mesh.material = baseMaterial.clone();
            }
          });
          fitCameraToObject(object3d);
          scene.add(object3d);
        }

        const handleLoadError = () => {
          setErrorMessage("Could not load this 3D file in the in-app viewer.");
        };

        if (format === "gltf") {
          const loader = new GLTFLoader();
          loader.load(modelUrl, (gltf) => addLoadedObject(gltf.scene), undefined, handleLoadError);
        } else if (format === "stl") {
          const loader = new STLLoader();
          loader.load(
            modelUrl,
            (geometry) => {
              const mesh = new THREE.Mesh(geometry, baseMaterial.clone());
              addLoadedObject(mesh);
            },
            undefined,
            handleLoadError
          );
        } else {
          const loader = new OBJLoader();
          loader.load(modelUrl, (obj) => addLoadedObject(obj), undefined, handleLoadError);
        }

        resizeObserver = new ResizeObserver(() => {
          if (!renderer) {
            return;
          }
          const width = Math.max(mountContainer.clientWidth, 1);
          const height = Math.max(mountContainer.clientHeight, 1);
          renderer.setSize(width, height);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        });
        resizeObserver.observe(mountContainer);

        const animate = () => {
          if (isDisposed || !renderer) {
            return;
          }
          controls?.update();
          renderer.render(scene, camera);
          animationFrame = window.requestAnimationFrame(animate);
        };
        animate();
      } catch {
        setErrorMessage("The 3D viewer failed to initialize.");
      }
    }

    mount();

    return () => {
      isDisposed = true;
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
      resizeObserver?.disconnect();
      controls?.dispose();
      if (sceneObject) {
        disposeObject3d(sceneObject);
      }
      renderer?.dispose();
      if (renderer?.domElement?.parentElement === mountContainer) {
        mountContainer.removeChild(renderer.domElement);
      }
      mountContainer.innerHTML = "";
    };
  }, [artifactType, modelUrl]);

  return (
    <div className={className}>
      <div className="relative h-full w-full overflow-hidden rounded-xl border border-ink-100 bg-[#f4f7fb]" ref={containerRef}>
        {errorMessage ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-ink-700">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
