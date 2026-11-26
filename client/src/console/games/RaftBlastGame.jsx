import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RAFT, INPUTS } from '@shared/constants.js';
import { createAnimal } from './AnimalModels.js';

// Console-side sound synthesis
function playConsoleSound(type) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'blast') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, t0);
      osc.frequency.exponentialRampToValueAtTime(35, t0 + 0.22);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, t0);
      filter.frequency.exponentialRampToValueAtTime(120, t0 + 0.22);
      gain.gain.setValueAtTime(0.35, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
      osc.start(t0);
      osc.stop(t0 + 0.26);
    } else if (type === 'checkpoint') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, t0);
      osc.frequency.setValueAtTime(554, t0 + 0.12);
      osc.frequency.setValueAtTime(659, t0 + 0.24);
      gain.gain.setValueAtTime(0.15, t0);
      gain.gain.linearRampToValueAtTime(0.001, t0 + 0.55);
      osc.start(t0);
      osc.stop(t0 + 0.6);
    } else if (type === 'pop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t0);
      osc.frequency.exponentialRampToValueAtTime(80, t0 + 0.18);
      gain.gain.setValueAtTime(0.4, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
      osc.start(t0);
      osc.stop(t0 + 0.22);
    } else if (type === 'win') {
      osc.type = 'triangle';
      [523, 659, 784, 1047].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = f;
        g.gain.setValueAtTime(0.1, t0 + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.12 + 0.35);
        o.start(t0 + i * 0.12);
        o.stop(t0 + i * 0.12 + 0.36);
      });
      return;
    }

    setTimeout(() => ctx.close(), 900);
  } catch (e) {
    // Ignore audio errors
  }
}

const RaftBlastGame = forwardRef(({ room, onExit }, ref) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const worldRef = useRef(null);
  const raftRef = useRef(null);
  const playersRef = useRef([]);
  const inputsRef = useRef({});
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const accumulatorRef = useRef(0);
  const checkpointRef = useRef({ current: 0, positions: [] });
  const runTimerRef = useRef(0);
  const finishedRef = useRef(false);
  const particlesRef = useRef([]);
  const ripplesRef = useRef([]);
  const initialRoomRef = useRef(room);

  const [hud, setHud] = useState({
    timer: '00:00.00',
    progress: 0,
    checkpoint: 0,
    finished: false,
  });

  // Initialize Three.js + Cannon world
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 20, 90);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 200);
    camera.position.set(0, 24, 18);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xfff7e6, 1.1);
    dir.position.set(20, 40, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -40;
    dir.shadow.camera.right = 40;
    dir.shadow.camera.top = 40;
    dir.shadow.camera.bottom = -40;
    scene.add(dir);

    // Physics world
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true;
    worldRef.current = world;

    // Materials
    const raftMat = new CANNON.Material('raft');
    const groundMat = new CANNON.Material('ground');
    const raftGroundContact = new CANNON.ContactMaterial(raftMat, groundMat, {
      friction: 0.4,
      restitution: 0.2,
    });
    world.addContactMaterial(raftGroundContact);

    // Ground / water physics plane
    const groundBody = new CANNON.Body({ mass: 0, material: groundMat });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    groundBody.position.set(0, 0, 0);
    world.addBody(groundBody);

    // Procedural water texture
    function createWaterTexture() {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 180; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 4 + Math.random() * 20;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.4, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147, 197, 253, ${0.05 + Math.random() * 0.12})`;
        ctx.fill();
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(8, 10);
      return tex;
    }

    // Water plane with animated texture
    const waterGeo = new THREE.PlaneGeometry(200, 240, 64, 64);
    const waterTex = createWaterTexture();
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      map: waterTex,
      roughness: 0.15,
      metalness: 0.15,
      transparent: true,
      opacity: 0.9,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.05, 60);
    water.receiveShadow = true;
    scene.add(water);
    scene.userData.water = water;

    // Canyon walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.8 });
    const createWall = (x, z, w, h, d) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      mesh.position.set(x, h / 2 - 1, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      const body = new CANNON.Body({ mass: 0, material: groundMat });
      body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
      body.position.set(x, h / 2 - 1, z);
      world.addBody(body);
      return { mesh, body };
    };

    // River channel walls along the course
    const channelWidth = 16;
    for (let z = -20; z < 160; z += 20) {
      createWall(-channelWidth - 4, z, 10, 8, 22);
      createWall(channelWidth + 4, z, 10, 8, 22);
      // Grass tops
      const g1 = new THREE.Mesh(new THREE.BoxGeometry(12, 1.5, 22), grassMat);
      g1.position.set(-channelWidth - 4, 4.5, z);
      scene.add(g1);
      const g2 = new THREE.Mesh(new THREE.BoxGeometry(12, 1.5, 22), grassMat);
      g2.position.set(channelWidth + 4, 4.5, z);
      scene.add(g2);
    }

    // Start pond lily pads and rocks
    for (let i = 0; i < 12; i++) {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.6, 0.05, 16),
        new THREE.MeshStandardMaterial({ color: 0x22c55e })
      );
      pad.position.set((Math.random() - 0.5) * 18, -0.35, (Math.random() - 0.5) * 18);
      scene.add(pad);
    }
    for (let i = 0; i < 6; i++) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.6),
        new THREE.MeshStandardMaterial({ color: 0x64748b })
      );
      rock.position.set((Math.random() - 0.5) * 20, -0.2, (Math.random() - 0.5) * 20);
      scene.add(rock);
    }

    // Start arch
    const archMat = new THREE.MeshStandardMaterial({ color: 0xd97706 });
    const archGroup = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.35, 0.35, 5);
    const post1 = new THREE.Mesh(postGeo, archMat);
    post1.position.set(-5, 2.5, -8);
    const post2 = new THREE.Mesh(postGeo, archMat);
    post2.position.set(5, 2.5, -8);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(11, 0.8, 0.8), archMat);
    beam.position.set(0, 5, -8);
    archGroup.add(post1, post2, beam);
    scene.add(archGroup);

    // Chevrons on water
    for (let z = -2; z < 160; z += 12) {
      const chevron = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 1.5, 3),
        new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 0.3 })
      );
      chevron.rotation.x = Math.PI / 2;
      chevron.position.set(0, -0.2, z);
      scene.add(chevron);
    }

    // Raft: inflatable tube + woven floor
    const raftRadius = RAFT.RADIUS;
    const raftGroup = new THREE.Group();

    // Main inflatable tube (torus for puffy look)
    const tubeGeo = new THREE.TorusGeometry(raftRadius - 0.3, 0.38, 16, 48);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.1,
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.y = 0.18;
    tube.castShadow = true;
    tube.receiveShadow = true;
    raftGroup.add(tube);

    // Red accent ring around tube
    const accentGeo = new THREE.TorusGeometry(raftRadius - 0.3, 0.08, 8, 48);
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const accent = new THREE.Mesh(accentGeo, accentMat);
    accent.rotation.x = Math.PI / 2;
    accent.position.y = 0.42;
    raftGroup.add(accent);

    // Floor disc
    const floorGeo = new THREE.CylinderGeometry(raftRadius - 0.4, raftRadius - 0.4, 0.08, 32);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = 0.08;
    floor.receiveShadow = true;
    raftGroup.add(floor);

    // Grip lines on floor
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      const grip = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.04, raftRadius - 0.6),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
      );
      grip.position.set(0, 0.13, 0);
      grip.rotation.y = a;
      raftGroup.add(grip);
    }

    scene.add(raftGroup);

    const raftBody = new CANNON.Body({
      mass: RAFT.MASS,
      material: raftMat,
      linearDamping: 0.45,
      angularDamping: 0.92,
    });
    // Use a small sphere collision hull for stability; the visual mesh is the flat inflatable raft.
    const hullRadius = 0.35;
    raftBody.addShape(new CANNON.Sphere(hullRadius));
    raftBody.position.set(0, hullRadius, 0);
    world.addBody(raftBody);
    raftRef.current = { mesh: raftGroup, body: raftBody };

    // Players
    const connected = (initialRoomRef.current?.players || []).filter((p) => !p.disconnected).slice(0, 4);
    playersRef.current = connected.map((p, i) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      mascot: p.mascot || 'hippo',
      angle: (i / Math.max(1, connected.length)) * Math.PI * 2,
      gas: RAFT.MAX_GAS,
      emptyCooldown: 0,
      blast: false,
      slideDir: 0,
      mesh: null,
      trail: [],
    }));

    playersRef.current.forEach((pl) => {
      const animal = createAnimal(pl.mascot, pl.color);
      animal.position.y = 0.12;
      animal.traverse((child) => {
        if (child.isMesh) child.castShadow = true;
      });
      scene.add(animal);
      pl.mesh = animal;
    });

    // Checkpoints
    const checkpointZs = [30, 70, 110, 150];
    checkpointRef.current.positions = checkpointZs.map((z) => ({ z, passed: false }));

    checkpointZs.forEach((z, idx) => {
      const arch = new THREE.Group();
      const p1 = new THREE.Mesh(postGeo, new THREE.MeshStandardMaterial({ color: 0x22c55e }));
      p1.position.set(-6, 2.5, z);
      const p2 = new THREE.Mesh(postGeo, new THREE.MeshStandardMaterial({ color: 0x22c55e }));
      p2.position.set(6, 2.5, z);
      const b = new THREE.Mesh(new THREE.BoxGeometry(13, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0x22c55e }));
      b.position.set(0, 5, z);
      arch.add(p1, p2, b);
      arch.userData = { checkpoint: idx };
      scene.add(arch);
    });

    // Obstacles: spiked mines, spinning blades, pendulums
    const obstacles = [];

    // Floating spiked mines
    const minePositions = [
      { x: -4, z: 45 }, { x: 5, z: 55 }, { x: -3, z: 85 }, { x: 4, z: 95 }, { x: 0, z: 125 },
    ];
    minePositions.forEach((pos) => {
      const mine = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.8, 0),
        new THREE.MeshStandardMaterial({ color: 0xef4444 })
      );
      mine.position.set(pos.x, 0, pos.z);
      mine.castShadow = true;
      scene.add(mine);
      const body = new CANNON.Body({ mass: 0 });
      body.addShape(new CANNON.Sphere(0.8));
      body.position.set(pos.x, 0, pos.z);
      world.addBody(body);
      obstacles.push({ type: 'mine', mesh: mine, body, radius: 0.8 });
    });

    // Spinning cross blades
    const bladePositions = [{ x: 0, z: 60 }, { x: 0, z: 100 }];
    bladePositions.forEach((pos) => {
      const bladeGroup = new THREE.Group();
      const bladeGeo = new THREE.BoxGeometry(8, 0.4, 0.4);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xf472b6 });
      const b1 = new THREE.Mesh(bladeGeo, bladeMat);
      const b2 = new THREE.Mesh(bladeGeo, bladeMat);
      b2.rotation.y = Math.PI / 2;
      bladeGroup.add(b1, b2);
      bladeGroup.position.set(pos.x, 0.5, pos.z);
      scene.add(bladeGroup);
      obstacles.push({ type: 'blade', mesh: bladeGroup, x: pos.x, z: pos.z, radius: 3.8 });
    });

    // Timed spike gates
    const gateZs = [38, 78, 118];
    gateZs.forEach((z) => {
      const gateGroup = new THREE.Group();
      const spikeGeo = new THREE.ConeGeometry(0.5, 1.5, 4);
      const spikeMat = new THREE.MeshStandardMaterial({ color: 0xec4899 });
      for (let x = -5; x <= 5; x += 1.2) {
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.position.set(x, 0.75, 0);
        gateGroup.add(spike);
      }
      gateGroup.position.set(0, 0, z);
      scene.add(gateGroup);
      obstacles.push({ type: 'gate', mesh: gateGroup, z, open: false, timer: 0, cycle: 3 });
    });

    scene.userData.obstacles = obstacles;

    // Resize handler
    const onResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Game loop with fixed physics timestep
    let lastTime = performance.now();
    const fixedDt = 1 / 60;
    const loop = () => {
      try {
        const now = performance.now();
        let dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        lastTimeRef.current = now;
        accumulatorRef.current += dt;

        while (accumulatorRef.current >= fixedDt) {
          stepPhysics(fixedDt, now / 1000);
          accumulatorRef.current -= fixedDt;
        }
        updateVisual(dt);
        renderer.render(scene, camera);
      } catch (err) {
        console.error('[RaftBlastGame] loop error:', err);
      }
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animationRef.current);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      // Cleanup physics
      world.bodies.forEach((b) => world.removeBody(b));
    };
  }, []);

  const stepPhysics = (dt, time) => {
    const world = worldRef.current;
    const raft = raftRef.current;
    const scene = sceneRef.current;
    if (!world || !raft || !scene) return;

    if (!finishedRef.current) {
      runTimerRef.current += dt;
    }

    const raftBody = raft.body;
    const raftPos = raftBody.position;
    const raftQuat = raftBody.quaternion;

    playersRef.current.forEach((pl) => {
      const inp = inputsRef.current[pl.id] || {};

      // Slide along rim
      let slide = 0;
      if (inp[INPUTS.SLIDE_LEFT]) slide -= 1;
      if (inp[INPUTS.SLIDE_RIGHT]) slide += 1;
      pl.angle += slide * RAFT.SLIDE_SPEED * dt;
      pl.slideDir = slide;

      // Gas stamina
      const isBlasting = !!inp[INPUTS.BLAST];
      if (pl.emptyCooldown > 0) {
        pl.emptyCooldown -= dt;
        pl.blast = false;
      } else if (isBlasting && pl.gas > 0) {
        pl.gas -= RAFT.GAS_DRAIN_RATE * dt;
        pl.blast = true;
        if (pl.gas <= 0) {
          pl.gas = 0;
          pl.emptyCooldown = RAFT.EMPTY_COOLDOWN;
          pl.blast = false;
        }
      } else {
        pl.blast = false;
        pl.gas = Math.min(RAFT.MAX_GAS, pl.gas + RAFT.GAS_RECHARGE_RATE * dt);
      }

      if (pl.blast) {
        const raftYaw = 2 * Math.acos(raftQuat.w) * (raftQuat.y >= 0 ? 1 : -1);
        const worldAngle = pl.angle + raftYaw;
        const rimX = raftPos.x + Math.cos(worldAngle) * RAFT.RADIUS;
        const rimZ = raftPos.z + Math.sin(worldAngle) * RAFT.RADIUS;
        const dirX = -Math.cos(worldAngle);
        const dirZ = -Math.sin(worldAngle);

        const force = RAFT.BLAST_FORCE * dt;
        // Linear impulse at center of mass for stable movement with a compact hull
        raftBody.wakeUp();
        raftBody.wakeUp();
        raftBody.applyImpulse(new CANNON.Vec3(dirX * force, 0, dirZ * force), raftPos);
        // Manual torque: sitting on the right spins left, sitting on the back pitches forward, etc.
        raftBody.applyTorque(new CANNON.Vec3(0, (-dirX * 0.6 + dirZ * 0.4) * RAFT.BLAST_TORQUE * dt, 0));

        spawnGasCloud(rimX, raftPos.y + 0.2, rimZ, dirX, dirZ, pl.color);
        spawnRipple(rimX, rimZ);

        if (Math.random() < 0.12) playConsoleSound('blast');
      }
    });

    // Clamp speed
    const v = raftBody.velocity;
    const speed = Math.sqrt(v.x * v.x + v.z * v.z);
    if (speed > RAFT.MAX_SPEED) {
      const s = RAFT.MAX_SPEED / speed;
      v.x *= s;
      v.z *= s;
    }

    world.step(1 / 60, dt, 3);

    // Keep raft flat: cancel any X/Z tilt, only allow Y rotation
    const q = raftBody.quaternion;
    const yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.x * q.x));
    raftBody.quaternion.set(0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2));
    raftBody.angularVelocity.x = 0;
    raftBody.angularVelocity.z = 0;

    // Obstacles update + collisions
    const obstacles = scene.userData.obstacles || [];
    obstacles.forEach((obs) => {
      if (obs.type === 'blade') {
        obs.mesh.rotation.y += 2.5 * dt;
      } else if (obs.type === 'gate') {
        obs.timer += dt;
        const open = (obs.timer % obs.cycle) < obs.cycle * 0.5;
        obs.open = open;
        obs.mesh.position.y = open ? -2 : 0;
      } else if (obs.type === 'mine') {
        obs.mesh.position.y = Math.sin(time * 2 + obs.x) * 0.2;
        obs.body.position.y = obs.mesh.position.y;
      }

      if (obs.type === 'mine') {
        const dx = raftPos.x - obs.body.position.x;
        const dz = raftPos.z - obs.body.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < RAFT.RADIUS + obs.radius) respawnRaft();
      } else if (obs.type === 'blade') {
        const dx = raftPos.x - obs.x;
        const dz = raftPos.z - obs.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < RAFT.RADIUS + obs.radius) respawnRaft();
      } else if (obs.type === 'gate' && !obs.open) {
        const dz = raftPos.z - obs.z;
        if (Math.abs(dz) < 1.2 && Math.abs(raftPos.x) < 6) respawnRaft();
      }
    });

    // Wall collision
    if (Math.abs(raftPos.x) > 7.5) respawnRaft();

    // Checkpoints
    checkpointRef.current.positions.forEach((cp, idx) => {
      if (!cp.passed && raftPos.z > cp.z) {
        cp.passed = true;
        checkpointRef.current.current = idx + 1;
        playConsoleSound('checkpoint');
        spawnConfetti(raftPos.x, raftPos.y + 2, raftPos.z);
      }
    });

    // Finish line
    if (!finishedRef.current && raftPos.z > 165) {
      finishedRef.current = true;
      playConsoleSound('win');
      setHud((h) => ({ ...h, finished: true }));
    }
  };

  const updateVisual = (dt) => {
    const raft = raftRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!raft || !scene || !camera) return;

    const raftBody = raft.body;
    const raftPos = raftBody.position;
    const raftQuat = raftBody.quaternion;

    // Sync raft mesh
    raft.mesh.position.copy(raftBody.position);
    raft.mesh.quaternion.copy(raftBody.quaternion);

    // Sync players on rim
    const raftYaw = 2 * Math.acos(raftQuat.w) * (raftQuat.y >= 0 ? 1 : -1);
    playersRef.current.forEach((pl) => {
      const worldAngle = pl.angle + raftYaw;
      const x = raftPos.x + Math.cos(worldAngle) * RAFT.RADIUS;
      const z = raftPos.z + Math.sin(worldAngle) * RAFT.RADIUS;
      if (pl.mesh) {
        pl.mesh.position.set(x, raftPos.y + 0.22, z);
        // Face outward from raft center
        pl.mesh.lookAt(x + Math.cos(worldAngle), raftPos.y + 0.22, z + Math.sin(worldAngle));
      }
    });

    // Animate water
    const water = scene.userData.water;
    if (water) {
      water.material.map.offset.x += dt * 0.04;
      water.material.map.offset.y += dt * 0.02;
    }

    // Camera follow
    const v = raftBody.velocity;
    const speed = Math.sqrt(v.x * v.x + v.z * v.z);
    const targetX = raftPos.x;
    const targetZ = raftPos.z;
    const targetY = 24 + Math.min(10, speed * 0.4);
    camera.position.x += (targetX - camera.position.x) * 3 * dt;
    camera.position.z += (targetZ + 18 - camera.position.z) * 3 * dt;
    camera.position.y += (targetY - camera.position.y) * 2 * dt;
    camera.lookAt(raftPos.x, raftPos.y, raftPos.z);

    // Particles
    updateParticles(dt);
    updateRipples(dt);

    // HUD
    setHud((h) => ({
      ...h,
      timer: formatTime(runTimerRef.current),
      progress: Math.min(1, Math.max(0, raftPos.z / 170)),
      checkpoint: checkpointRef.current.current,
    }));
  };

  const respawnRaft = () => {
    const raft = raftRef.current;
    if (!raft) return;
    playConsoleSound('pop');
    const cp = checkpointRef.current.positions[Math.max(0, checkpointRef.current.current - 1)];
    const z = cp ? cp.z - 5 : 0;
    raft.body.position.set(0, 0.35, z);
    raft.body.velocity.set(0, 0, 0);
    raft.body.angularVelocity.set(0, 0, 0);
    raft.body.quaternion.set(0, 0, 0, 1);
    spawnSmoke(0, 1, z);
  };

  const pruneParticlesIfNeeded = () => {
    const scene = sceneRef.current;
    while (particlesRef.current.length > 200) {
      const old = particlesRef.current.shift();
      if (old?.mesh) {
        scene.remove(old.mesh);
        old.mesh.geometry.dispose();
        old.mesh.material.dispose();
      }
    }
  };

  const spawnGasCloud = (x, y, z, dirX, dirZ, color) => {
    const scene = sceneRef.current;
    if (!scene) return;
    pruneParticlesIfNeeded();
    const geo = new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x84cc16, transparent: true, opacity: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    particlesRef.current.push({
      mesh,
      life: 0.7,
      maxLife: 0.7,
      vx: dirX * 1.5 + (Math.random() - 0.5) * 0.5,
      vy: 0.5 + Math.random() * 0.5,
      vz: dirZ * 1.5 + (Math.random() - 0.5) * 0.5,
      scale: 1,
      color: 0x84cc16,
    });
  };

  const spawnSmoke = (x, y, z) => {
    const scene = sceneRef.current;
    if (!scene) return;
    pruneParticlesIfNeeded();
    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
      );
      mesh.position.set(x + (Math.random() - 0.5) * 2, y, z + (Math.random() - 0.5) * 2);
      scene.add(mesh);
      particlesRef.current.push({
        mesh,
        life: 1.0,
        maxLife: 1.0,
        vx: (Math.random() - 0.5) * 3,
        vy: 1 + Math.random(),
        vz: (Math.random() - 0.5) * 3,
        scale: 1.5,
        color: 0xffffff,
      });
    }
  };

  const spawnConfetti = (x, y, z) => {
    const scene = sceneRef.current;
    if (!scene) return;
    pruneParticlesIfNeeded();
    const colors = [0xef4444, 0x3b82f6, 0x22c55e, 0xeab308, 0xa855f7];
    for (let i = 0; i < 30; i++) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, 0.15),
        new THREE.MeshBasicMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide })
      );
      mesh.position.set(x + (Math.random() - 0.5) * 2, y, z + (Math.random() - 0.5) * 2);
      scene.add(mesh);
      particlesRef.current.push({
        mesh,
        life: 1.5,
        maxLife: 1.5,
        vx: (Math.random() - 0.5) * 6,
        vy: 3 + Math.random() * 3,
        vz: (Math.random() - 0.5) * 6,
        scale: 1,
        rotate: true,
        color: colors[i % colors.length],
      });
    }
  };

  const spawnRipple = (x, z) => {
    const scene = sceneRef.current;
    if (!scene) return;
    while (ripplesRef.current.length > 60) {
      const old = ripplesRef.current.shift();
      if (old?.mesh) {
        scene.remove(old.mesh);
        old.mesh.geometry.dispose();
        old.mesh.material.dispose();
      }
    }
    const geo = new THREE.RingGeometry(0.3, 0.35, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, -0.38, z);
    scene.add(mesh);
    ripplesRef.current.push({ mesh, life: 1.0, maxLife: 1.0 });
  };

  const updateParticles = (dt) => {
    const scene = sceneRef.current;
    if (!scene) return;
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.life -= dt;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        particlesRef.current.splice(i, 1);
        continue;
      }
      const t = p.life / p.maxLife;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.scale.setScalar(p.scale * (1 + (1 - t)));
      p.mesh.material.opacity = t * 0.6;
      if (p.rotate) {
        p.mesh.rotation.x += dt * 3;
        p.mesh.rotation.y += dt * 4;
      }
    }
  };

  const updateRipples = (dt) => {
    const scene = sceneRef.current;
    if (!scene) return;
    for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
      const r = ripplesRef.current[i];
      r.life -= dt;
      if (r.life <= 0) {
        scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
        ripplesRef.current.splice(i, 1);
        continue;
      }
      const t = r.life / r.maxLife;
      const s = 1 + (1 - t) * 5;
      r.mesh.scale.setScalar(s);
      r.mesh.material.opacity = t * 0.5;
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  // Expose handleInput and getState to parent Console
  useImperativeHandle(ref, () => ({
    handleInput: (data) => {
      const player = playersRef.current.find((p) => p.id === data.playerId);
      if (!player) return;
      inputsRef.current[player.id] = {
        ...inputsRef.current[player.id],
        [data.input]: data.active,
      };
    },
    getState: () => {
      const raft = raftRef.current;
      const players = playersRef.current.map((p) => ({
        id: p.id,
        angle: p.angle,
        gas: p.gas,
        blast: p.blast,
        color: p.color,
        name: p.name,
      }));
      return {
        type: 'raft-blast',
        raft: raft
          ? {
              x: raft.body.position.x,
              z: raft.body.position.z,
              vx: raft.body.velocity.x,
              vz: raft.body.velocity.z,
              yaw: 2 * Math.acos(raft.body.quaternion.w) * (raft.body.quaternion.y >= 0 ? 1 : -1),
            }
          : null,
        players,
        checkpoint: checkpointRef.current.current,
        timer: runTimerRef.current,
        finished: finishedRef.current,
      };
    },
  }));

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* HUD */}
      <div
        className="raft-hud"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          padding: 'clamp(12px, 1.5vw, 24px)',
          display: 'grid',
          gridTemplateColumns: '1fr 2fr 1fr',
          gap: '16px',
          pointerEvents: 'none',
          alignItems: 'start',
        }}
      >
        <style>{`
          @media (max-width: 700px) {
            .raft-hud {
              grid-template-columns: 1fr 1fr !important;
              grid-template-rows: auto auto;
            }
            .raft-hud > :nth-child(2) {
              grid-column: 1 / -1;
              order: -1;
            }
          }
        `}</style>
        <div
          style={{
            background: 'rgba(15,23,42,0.8)',
            borderRadius: '14px',
            padding: '14px 18px',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Time</div>
          <div style={{ fontSize: 'clamp(24px, 2.5vw, 40px)', fontWeight: 900, fontFamily: 'ui-monospace, monospace' }}>
            {hud.timer}
          </div>
          <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px' }}>Checkpoint {hud.checkpoint}/4</div>
        </div>

        <div
          style={{
            background: 'rgba(15,23,42,0.8)',
            borderRadius: '14px',
            padding: '14px 18px',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>
            <span>Start</span>
            <span>Finish</span>
          </div>
          <div style={{ width: '100%', height: '12px', background: '#334155', borderRadius: '99px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${hud.progress * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #22c55e, #eab308)',
                borderRadius: '99px',
                transition: 'width 0.1s linear',
              }}
            />
          </div>
          <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '13px', fontWeight: 700 }}>
            {Math.round(hud.progress * 100)}% Complete
          </div>
        </div>

        <div style={{ justifySelf: 'end', pointerEvents: 'auto' }}>
          <button
            onClick={onExit}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Exit to Hub
          </button>
        </div>
      </div>

      {hud.finished && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              borderRadius: '24px',
              padding: 'clamp(24px, 4vw, 48px)',
              textAlign: 'center',
              border: '2px solid #22c55e',
              boxShadow: '0 0 60px rgba(34,197,94,0.35)',
            }}
          >
            <div style={{ fontSize: 'clamp(36px, 5vw, 72px)', fontWeight: 900, color: '#22c55e' }}>Course Clear!</div>
            <div style={{ fontSize: 'clamp(20px, 2vw, 32px)', marginTop: '12px', fontFamily: 'ui-monospace, monospace' }}>
              {hud.timer}
            </div>
            <button
              onClick={onExit}
              style={{
                marginTop: '24px',
                background: '#22c55e',
                color: '#052e16',
                border: 'none',
                borderRadius: '14px',
                padding: '14px 32px',
                fontSize: '18px',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Back to Hub
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

RaftBlastGame.displayName = 'RaftBlastGame';
export default RaftBlastGame;
