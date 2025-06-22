import * as THREE from 'three';
import vertexShader from '../shader/vertexShader.glsl';
import fragmentShader from '../shader/fragmentShader.glsl';

// Simple mobile detection
function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// If on mobile, just show images and do nothing else
if (isMobile()) {
  window.addEventListener('load', () => {
    // Restore image opacity
    document.querySelectorAll('img').forEach(img => {
      img.style.opacity = 1;
    });
    // Hide canvas if present
    const canvas = document.getElementById('canvas');
    if (canvas) {
      canvas.style.display = 'none';
    }
  });
} else {
  const planes = [];
  let camera, scene, renderer;

  // Store image/plane/texture/material mapping for easier update on resize
  const planeData = [];

  setTimeout(() => {
    document.querySelectorAll('img').forEach(img => {
      img.style.opacity = 0;
    });
  }, 1000);

  window.addEventListener('load', () => {
    const canvas = document.getElementById('canvas');
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    scene = new THREE.Scene();

    const distance = 600;
    const fov = 2 * Math.atan((window.innerHeight / 2) / distance) * (180 / Math.PI);
    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = distance;

    const images = document.querySelectorAll('img');

    images.forEach((image) => {
      const imgbounds = image.getBoundingClientRect();
      const texture = new THREE.TextureLoader().load(image.src);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;

      const geometry = new THREE.PlaneGeometry(imgbounds.width, imgbounds.height);

      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTexture: { value: texture },
          uMouse: { value: new THREE.Vector2(0, 0) },
        },
        transparent: true,
      });

      const plane = new THREE.Mesh(geometry, material);

      const x = imgbounds.left + imgbounds.width / 2 - window.innerWidth / 2;
      const y = - (imgbounds.top + imgbounds.height / 2 - window.innerHeight / 2);
      plane.position.set(x, y, 0);

      planes.push(plane);
      scene.add(plane);

      // Store for later resize
      planeData.push({
        image,
        plane,
        texture,
        material
      });
    });

    function updatePlanesPositionAndScale() {
      planeData.forEach(({ image, plane }) => {
        const imgbounds = image.getBoundingClientRect();
        // Update geometry size if needed
        // Remove old geometry to avoid memory leak
        if (plane.geometry) plane.geometry.dispose();
        plane.geometry = new THREE.PlaneGeometry(imgbounds.width, imgbounds.height);

        const x = imgbounds.left + imgbounds.width / 2 - window.innerWidth / 2;
        const y = - (imgbounds.top + imgbounds.height / 2 - window.innerHeight / 2);
        plane.position.set(x, y, 0);
      });
    }

    function animate() {
      requestAnimationFrame(animate);
      updatePlanesPositionAndScale();
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);

      // Update FOV in case height changes
      const distance = 600;
      const fov = 2 * Math.atan((window.innerHeight / 2) / distance) * (180 / Math.PI);
      camera.fov = fov;
      camera.updateProjectionMatrix();

      // Update plane geometry and position
      updatePlanesPositionAndScale();
    });
  });

  // Raycaster logic for uMouse on plane
  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2();

  window.addEventListener('mousemove', (e) => {
    mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNDC.y = - (e.clientY / window.innerHeight) * 2 + 1;

    if (!camera || !scene) return;

    raycaster.setFromCamera(mouseNDC, camera);

    const intersects = raycaster.intersectObjects(planes);

    planes.forEach((plane) => {
      plane.material.uniforms.uMouse.value.set(0, 0);
    });

    if (intersects.length > 0) {
      const intersect = intersects[0];
      if (intersect.uv) {
        intersect.object.material.uniforms.uMouse.value.copy(intersect.uv);
      }
    }
  });
}
