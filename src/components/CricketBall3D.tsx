import { useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import cricketBallTexture from "@/assets/cricket-ball-icon.webp";

function Ball() {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(THREE.TextureLoader, cricketBallTexture);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 1.5;
      meshRef.current.rotation.x += delta * 0.3;
    }
  });

  return (
    <mesh ref={meshRef} castShadow>
      <sphereGeometry args={[1.2, 64, 64]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.35}
        metalness={0.1}
        envMapIntensity={1.2}
      />
      {/* Seam ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.21, 0.015, 8, 64]} />
        <meshStandardMaterial color="#c43e2a" roughness={0.6} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0.3, 0.15]}>
        <torusGeometry args={[1.21, 0.012, 8, 64]} />
        <meshStandardMaterial color="#c43e2a" roughness={0.6} />
      </mesh>
    </mesh>
  );
}

interface CricketBall3DProps {
  size?: number;
  className?: string;
}

export default function CricketBall3D({ size = 200, className = "" }: CricketBall3DProps) {
  return (
    <div className={className} style={{ width: size, height: size }}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 40 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#ff6b4a" />
        <pointLight position={[0, -3, 2]} intensity={0.3} color="#4a9eff" />
        <Ball />
        <ContactShadows
          position={[0, -1.6, 0]}
          opacity={0.4}
          scale={4}
          blur={2}
          far={3}
        />
        <Environment preset="studio" />
      </Canvas>
    </div>
  );
}
