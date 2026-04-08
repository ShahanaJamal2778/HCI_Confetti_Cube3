import * as THREE from "three";
import { useEffect, useRef, useState } from "react";

// ── Confetti colors ───────────────────────────────────────
const CONFETTI_COLORS = [
    0xff2d55, 0xff9f0a, 0x30d158,
    0x0a84ff, 0xbf5af2, 0xffd60a, 0xffffff,
];

// ── Procedural gift-wrap canvas texture ──────────────────
function createGiftTexture(paperColor, ribbonColor) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Wrapping paper base
    ctx.fillStyle = paperColor;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle polka dots
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 25; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 512, Math.random() * 512, 6 + Math.random() * 12, 0, Math.PI * 2);
        ctx.fill();
    }

    // Vertical ribbon
    ctx.fillStyle = ribbonColor;
    ctx.fillRect(206, 0, 100, 512);

    // Horizontal ribbon
    ctx.fillRect(0, 206, 512, 100);

    // Ribbon shine
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 6;
    ctx.strokeRect(210, 0, 92, 512);
    ctx.strokeRect(0, 210, 512, 92);

    // Bow knot circle at center
    ctx.fillStyle = ribbonColor;
    ctx.beginPath();
    ctx.arc(256, 256, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 4;
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// ── Face configs for the 6 planes ────────────────────────
const S = 3; // face size
const FACE_CONFIGS = [
    { pos: [ S/2,  0,   0  ], rot: [0,  Math.PI/2,  0] },
    { pos: [-S/2,  0,   0  ], rot: [0, -Math.PI/2,  0] },
    { pos: [ 0,   S/2,  0  ], rot: [-Math.PI/2, 0,  0] },
    { pos: [ 0,  -S/2,  0  ], rot: [ Math.PI/2, 0,  0] },
    { pos: [ 0,   0,   S/2 ], rot: [0,  0,  0]         },
    { pos: [ 0,   0,  -S/2 ], rot: [0,  Math.PI, 0]    },
];

const GIFT_STYLES = [
    { paper: "#d32f2f", ribbon: "#ffeb3b" },
    { paper: "#1565c0", ribbon: "#ffffff" },
    { paper: "#2e7d32", ribbon: "#ffeb3b" },
    { paper: "#6a1b9a", ribbon: "#f8bbd0" },
    { paper: "#e65100", ribbon: "#fff9c4" },
    { paper: "#880e4f", ribbon: "#f8bbd0" },
];

// ─────────────────────────────────────────────────────────
export default function TexturedCube() {
    const mountRef   = useRef(null);
    const explodedRef = useRef(false);          // ← for animation loop (no stale closure)
    const [showUI, setShowUI] = useState(true); // ← for React overlay only

    useEffect(() => {
        const el = mountRef.current;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x080810);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 7;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        el.appendChild(renderer.domElement);

        // ── Lights ─────────────────────────────────────────
        scene.add(new THREE.AmbientLight(0xffffff, 0.9));
        const pLight = new THREE.PointLight(0xffffff, 2, 30);
        pLight.position.set(8, 10, 8);
        scene.add(pLight);

        // ── Gift Box (6 individual planes) ─────────────────
        const cubeGroup = new THREE.Group();
        scene.add(cubeGroup);

        const textures   = GIFT_STYLES.map(s => createGiftTexture(s.paper, s.ribbon));
        const materials  = textures.map(t => new THREE.MeshPhongMaterial({ map: t, shininess: 80 }));
        const faceMeshes = FACE_CONFIGS.map(({ pos, rot }, i) => {
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(S, S), materials[i]);
            mesh.position.set(...pos);
            mesh.rotation.set(...rot);
            // Explosion velocity = away from center + random wobble
            const awayDir = new THREE.Vector3(...pos).normalize().multiplyScalar(0.28);
            mesh.userData.vel = awayDir.add(
                new THREE.Vector3(
                    (Math.random() - 0.5) * 0.15,
                    (Math.random() - 0.5) * 0.15,
                    (Math.random() - 0.5) * 0.15,
                )
            );
            cubeGroup.add(mesh);
            return mesh;
        });

        // ── Confetti 🎊 ─────────────────────────────────────
        const confettiGroup  = new THREE.Group();
        scene.add(confettiGroup);
        const confettiPieces = [];

        for (let i = 0; i < 100; i++) {
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(0.14, 0.14),
                new THREE.MeshBasicMaterial({
                    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                    side: THREE.DoubleSide,
                })
            );
            mesh.visible = false;
            // Random burst direction, biased upward
            mesh.userData.vel = new THREE.Vector3(
                (Math.random() - 0.5) * 0.45,
                 Math.random() * 0.55 + 0.15,
                (Math.random() - 0.5) * 0.45,
            );
            mesh.userData.spin = {
                x: (Math.random() - 0.5) * 0.25,
                y: (Math.random() - 0.5) * 0.25,
                z: (Math.random() - 0.5) * 0.25,
            };
            confettiPieces.push(mesh);
            confettiGroup.add(mesh);
        }

        // ── Cat 🐈 ─────────────────────────────────────────
        const catTex  = new THREE.TextureLoader().load("https://placecats.com/500/500");
        const catMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(3.5, 3.5),
            new THREE.MeshBasicMaterial({ map: catTex, transparent: true, side: THREE.DoubleSide })
        );
        catMesh.scale.setScalar(0.001);
        scene.add(catMesh);

        // ── Click / Touch handler ───────────────────────────
        const raycaster = new THREE.Raycaster();
        const mouse2    = new THREE.Vector2();

        const tryExplode = (clientX, clientY) => {
            if (explodedRef.current) return;                  // already exploded
            mouse2.x = (clientX / window.innerWidth)  *  2 - 1;
            mouse2.y = (clientY / window.innerHeight) * -2 + 1;
            raycaster.setFromCamera(mouse2, camera);
            if (raycaster.intersectObjects(faceMeshes).length > 0) {
                explodedRef.current = true;                   // ← mutate ref, no re-render needed
                setShowUI(false);                             // hide the prompt
                confettiPieces.forEach(p => (p.visible = true));
            }
        };

        const onPointerDown = e => tryExplode(e.clientX, e.clientY);
        window.addEventListener("pointerdown", onPointerDown);

        // ── Animation loop ──────────────────────────────────
        let clock = 0;
        let rafId;

        const animate = () => {
            rafId = requestAnimationFrame(animate);
            clock += 0.016;

            if (!explodedRef.current) {
                // Jelly wobble
                cubeGroup.rotation.y += 0.008;
                cubeGroup.rotation.x += 0.004;
                const j = 0.12;
                cubeGroup.scale.set(
                    1 + Math.sin(clock * 3.0)       * j,
                    1 + Math.sin(clock * 2.5 + 1.0) * j,
                    1 + Math.sin(clock * 3.5 + 2.0) * j,
                );
                cubeGroup.position.y = Math.sin(clock * 1.5) * 0.25;
            } else {
                // Fly faces outward
                faceMeshes.forEach(m => {
                    m.position.add(m.userData.vel);
                    m.rotation.x += 0.08;
                    m.rotation.z += 0.04;
                    if (m.material.opacity > 0) {
                        m.material.transparent = true;
                        m.material.opacity = Math.max(0, m.material.opacity - 0.012);
                    }
                });

                // Confetti physics
                confettiPieces.forEach(p => {
                    if (!p.visible) return;
                    p.position.add(p.userData.vel);
                    p.userData.vel.y -= 0.009; // gravity
                    p.rotation.x += p.userData.spin.x;
                    p.rotation.y += p.userData.spin.y;
                    p.rotation.z += p.userData.spin.z;
                });

                // Cat reveal
                if (catMesh.scale.x < 1.5) {
                    const s = Math.min(1.5, catMesh.scale.x + 0.06);
                    catMesh.scale.setScalar(s);
                }
                catMesh.rotation.z = Math.sin(clock * 5) * 0.06;
            }

            renderer.render(scene, camera);
        };
        animate();

        // ── Handling Resize ───────────────────────────────────────
        const handleResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);

            // Responsive Scaling: Make cube smaller on small vertical screens
            if (w < 600 && w < h) {
                const scale = Math.max(0.6, w / 600);
                cubeGroup.scale.setScalar(scale);
                catMesh.scale.setScalar(scale * (explodedRef.current ? 1.5 : 0.001));
            } else {
                if (!explodedRef.current) {
                    cubeGroup.scale.setScalar(1);
                    catMesh.scale.setScalar(0.001);
                }
            }
        };
        window.addEventListener("resize", handleResize);
        handleResize(); // Init scaling

        // ── Cleanup ─────────────────────────────────────────
        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("resize", handleResize);
            if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
            renderer.dispose();
            textures.forEach(t => t.dispose());
            materials.forEach(m => m.dispose());
            catTex.dispose();
        };
    }, []); // ← runs ONCE only; animation loop reads explodedRef (always fresh)

    return (
        <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", touchAction: "none" }}>
            {/* Three.js canvas mounts here */}
            <div ref={mountRef} />

            {/* ── Prompt overlay ── */}
            {showUI && (
                <div style={{
                    position: "absolute",
                    bottom: "12%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    padding: "18px 36px",
                    background: "rgba(255,255,255,0.12)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    borderRadius: "20px",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "#fff",
                    fontFamily: "Arial Rounded MT Bold, Arial, sans-serif",
                    fontSize: "1.2rem",
                    fontWeight: "bold",
                    textAlign: "center",
                    pointerEvents: "none",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
                    zIndex: 20,
                    animation: "giftPulse 2s ease-in-out infinite",
                }}>
                    <div style={{ fontSize: "2.2rem", marginBottom: "6px" }}>🐱🌸</div>
                    <span style={{ color: "#ffd60a" }}>Click on box to open it</span>
                    <style>{`
                        @keyframes giftPulse {
                            0%,100% { transform: translateX(-50%) scale(1);   }
                            50%      { transform: translateX(-50%) scale(1.06); }
                        }
                    `}</style>
                </div>
            )}

            {/* ── Post-explosion message ── */}
            {!showUI && (
                <div style={{
                    position: "absolute",
                    top: "8%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    color: "#fff",
                    fontSize: "clamp(1.1rem, 4vw, 2.8rem)",
                    fontFamily: "Arial Black, Arial, sans-serif",
                    fontWeight: "900",
                    textAlign: "center",
                    textShadow: "0 0 20px #ff2d55, 0 0 40px #ff9f0a",
                    pointerEvents: "none",
                    whiteSpace: "normal",
                    maxWidth: "90vw",
                    zIndex: 20,
                    animation: "popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
                }}>
                    Shahana Mansoor B23110006152 🐱🌸
                    <style>{`
                        @keyframes popIn {
                            from { transform: translateX(-50%) scale(0.3); opacity: 0; }
                            to   { transform: translateX(-50%) scale(1);   opacity: 1; }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}