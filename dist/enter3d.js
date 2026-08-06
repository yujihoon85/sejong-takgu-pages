/* Sejong Takgu — cinematic 3D court greeting (Three.js r160) */
(function (global) {
  "use strict";
  var _state = null;

  function init(canvas) {
    if (!global.THREE) return null;
    var THREE = global.THREE;

    var w = Math.max(2, canvas.clientWidth || window.innerWidth || 390);
    var h = Math.max(2, canvas.clientHeight || window.innerHeight || 700);

    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x08120f, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x08120f, 8, 22);

    var camera = new THREE.PerspectiveCamera(42, w / h, 0.5, 60);
    camera.position.set(4.8, 2.6, 4.0);
    camera.lookAt(0, 0.8, 0);

    scene.add(new THREE.AmbientLight(0xb8d4c8, 0.85));
    var key = new THREE.DirectionalLight(0xfff2e0, 2.2);
    key.position.set(4, 8, 5);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0x88aaff, 0.7);
    fill.position.set(-5, 3, -2);
    scene.add(fill);
    var rim = new THREE.PointLight(0xff6b2c, 12, 14, 2);
    rim.position.set(0, 2.5, 2);
    scene.add(rim);

    // floor
    var floor = new THREE.Mesh(
      new THREE.CircleGeometry(9, 64),
      new THREE.MeshStandardMaterial({ color: 0x101c18, roughness: 0.92, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    var ring = new THREE.Mesh(
      new THREE.RingGeometry(3.4, 3.55, 64),
      new THREE.MeshBasicMaterial({ color: 0xff6b2c, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.015;
    scene.add(ring);

    // TABLE
    var table = new THREE.Group();
    var top = new THREE.Mesh(
      new THREE.BoxGeometry(2.74, 0.08, 1.525),
      new THREE.MeshStandardMaterial({
        color: 0x1f9b5c,
        roughness: 0.4,
        metalness: 0.08,
        emissive: 0x0a3d24,
        emissiveIntensity: 0.25
      })
    );
    top.position.y = 0.78;
    table.add(top);

    var white = new THREE.MeshStandardMaterial({ color: 0xf5f7fa, roughness: 0.5, metalness: 0.05 });
    var centerLine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.085, 1.48), white);
    centerLine.position.y = 0.78;
    table.add(centerLine);
    // borders
    [[0, 0.78, 0.75], [0, 0.78, -0.75]].forEach(function (p) {
      var e = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.085, 0.025), white);
      e.position.set(p[0], p[1], p[2]);
      table.add(e);
    });
    [[1.36, 0.78, 0], [-1.36, 0.78, 0]].forEach(function (p) {
      var e = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.085, 1.525), white);
      e.position.set(p[0], p[1], p[2]);
      table.add(e);
    });

    var apron = new THREE.Mesh(
      new THREE.BoxGeometry(2.9, 0.12, 1.68),
      new THREE.MeshStandardMaterial({ color: 0xb8894a, roughness: 0.65, metalness: 0.05 })
    );
    apron.position.y = 0.7;
    table.add(apron);

    var legMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.55, metalness: 0.2 });
    [[-1.15, 0.34, -0.55], [1.15, 0.34, -0.55], [-1.15, 0.34, 0.55], [1.15, 0.34, 0.55]].forEach(function (p) {
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.68, 0.09), legMat);
      leg.position.set(p[0], p[1], p[2]);
      table.add(leg);
    });

    var net = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.17, 1.72),
      new THREE.MeshStandardMaterial({ color: 0xe8eaee, roughness: 0.45, metalness: 0.15, transparent: true, opacity: 0.92 })
    );
    net.position.set(0, 0.9, 0);
    table.add(net);
    scene.add(table);

    // paddles
    function makePaddle(color) {
      var g = new THREE.Group();
      var face = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.018, 28),
        new THREE.MeshStandardMaterial({ color: color, roughness: 0.45, metalness: 0.1, emissive: color, emissiveIntensity: 0.12 })
      );
      face.rotation.x = Math.PI / 2;
      g.add(face);
      var handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.13, 0.022),
        new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.7 })
      );
      handle.position.y = -0.12;
      g.add(handle);
      return g;
    }
    var padL = makePaddle(0xe85d2c);
    padL.position.set(-1.3, 0.98, 0.15);
    scene.add(padL);
    var padR = makePaddle(0x3d9b6e);
    padR.position.set(1.3, 0.98, -0.1);
    scene.add(padR);

    // ball
    var ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0xff7a3d,
        roughness: 0.3,
        metalness: 0.15,
        emissive: 0xff4a10,
        emissiveIntensity: 0.45
      })
    );
    scene.add(ball);

    // players
    function makePlayer(shirt) {
      var g = new THREE.Group();
      var body = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.55, 0.2),
        new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.55, emissive: shirt, emissiveIntensity: 0.1 })
      );
      body.position.y = 1.12;
      g.add(body);
      var head = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xe0b090, roughness: 0.65 })
      );
      head.position.y = 1.52;
      g.add(head);
      var arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.38, 0.09),
        new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.55 })
      );
      arm.position.set(0.22, 1.28, 0);
      g.add(arm);
      g.userData.arm = arm;
      var leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.45, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x1a2430, roughness: 0.7 })
      );
      leg.position.y = 0.45;
      g.add(leg);
      return g;
    }
    var p1 = makePlayer(0x2a7a52);
    p1.position.set(-2.15, 0, 0.65);
    p1.rotation.y = 0.55;
    scene.add(p1);
    var p2 = makePlayer(0xc45a2a);
    p2.position.set(2.15, 0, -0.55);
    p2.rotation.y = -0.55;
    scene.add(p2);

    var running = true;
    var t0 = performance.now();

    function onResize() {
      var ww = canvas.clientWidth || window.innerWidth;
      var hh = canvas.clientHeight || window.innerHeight;
      if (!ww || !hh) return;
      camera.aspect = ww / hh;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(ww, hh, false);
    }
    window.addEventListener("resize", onResize);

    function animate() {
      if (!running) return;
      requestAnimationFrame(animate);
      var t = (performance.now() - t0) / 1000;

      var a = 0.78 + Math.sin(t * 0.22) * 0.22;
      var r = 6.0 - Math.min(t * 0.12, 0.7);
      camera.position.x = Math.sin(a) * r;
      camera.position.z = Math.cos(a) * r * 0.9;
      camera.position.y = 2.55 + Math.sin(t * 0.35) * 0.06;
      camera.lookAt(0, 0.78, 0);

      var ph = t * 2.1;
      ball.position.set(
        Math.sin(ph) * 1.05,
        0.95 + Math.abs(Math.sin(ph * 2)) * 0.42,
        Math.cos(ph * 0.45) * 0.28
      );
      ball.rotation.x += 0.12;
      ball.rotation.y += 0.08;

      padL.position.z = ball.position.z * 0.55;
      padL.position.y = 0.98 + Math.sin(ph) * 0.05;
      padL.rotation.z = 0.35 + Math.sin(ph) * 0.35;
      padR.position.z = ball.position.z * 0.55;
      padR.position.y = 0.98 + Math.cos(ph) * 0.05;
      padR.rotation.z = -0.35 - Math.sin(ph) * 0.35;

      p1.userData.arm.rotation.z = -0.4 + Math.sin(t * 3.2) * 0.95;
      p2.userData.arm.rotation.z = 0.4 - Math.sin(t * 3.2) * 0.95;
      p1.position.y = Math.sin(t * 2) * 0.02;
      p2.position.y = Math.sin(t * 2 + 1) * 0.02;

      rim.intensity = 10 + Math.sin(t * 4) * 4;
      renderer.render(scene, camera);
    }
    animate();
    setTimeout(onResize, 40);

    try { global.__enterDbg = { scene: scene, camera: camera, renderer: renderer }; } catch (e) {}

    _state = {
      dispose: function () {
        running = false;
        window.removeEventListener("resize", onResize);
        try { renderer.dispose(); } catch (e) {}
        _state = null;
      }
    };
    return _state;
  }

  function dispose() {
    if (_state) _state.dispose();
  }

  global.SejongEnter3D = { init: init, dispose: dispose };
})(typeof window !== "undefined" ? window : globalThis);
