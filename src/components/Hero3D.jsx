import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* Aurora douce : grands halos dégradés qui dérivent lentement — sobre & premium *
 * Fallback si WebGL échoue : un simple dégradé CSS, l'app continue quand même
 * (scan headless / vieux navigateurs / mode sans GPU) */
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;

  // Halo circulaire très doux
  float blob(vec2 uv, vec2 center, float radius) {
    float d = length((uv - center) * vec2(uResolution.x / uResolution.y, 1.0));
    return exp(-d * d / (radius * radius));
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.03; // encore plus lent — mouvement à peine perceptible

    // Base : bleu nuit, dégradé vertical doux
    vec3 base1 = vec3(0.030, 0.065, 0.155); // nuit profonde
    vec3 base2 = vec3(0.055, 0.110, 0.255); // bleu nuit
    vec3 color = mix(base2, base1, smoothstep(0.0, 1.1, uv.y));

    // Dérive souris quasi imperceptible
    vec2 m = (uMouse - 0.5) * 0.03;

    // Halo or chaud, bas-gauche — plus large, plus doux
    float b1 = blob(uv + m, vec2(0.20 + 0.05 * sin(t), 0.22 + 0.04 * cos(t * 0.8)), 0.70);
    color += vec3(0.50, 0.38, 0.12) * b1 * 0.38;

    // Halo bleu royal, haut-droite — très diffus
    float b2 = blob(uv - m, vec2(0.82 + 0.04 * cos(t * 0.7), 0.80 + 0.05 * sin(t * 0.9)), 0.75);
    color += vec3(0.15, 0.22, 0.50) * b2 * 0.45;

    // Halo or très subtil, droite
    float b3 = blob(uv + m * 0.5, vec2(0.90 + 0.03 * sin(t * 1.1), 0.28 + 0.04 * cos(t)), 0.50);
    color += vec3(0.60, 0.46, 0.15) * b3 * 0.22;

    // Halo bleu clair discret, gauche-centre (respiration très lente)
    float b4 = blob(uv - m * 0.8, vec2(0.10 + 0.04 * cos(t * 0.5), 0.62 + 0.06 * sin(t * 0.6)), 0.55);
    color += vec3(0.16, 0.28, 0.55) * b4 * (0.26 + 0.06 * sin(t * 0.9));

    // Liseré lumineux horizontal presque invisible (ligne d'horizon)
    float line = exp(-pow((uv.y - 0.40 + 0.015 * sin(t)) * 8.0, 2.0));
    color += vec3(0.40, 0.45, 0.70) * line * 0.055;

    // Voile central doux : assombrit légèrement la zone du titre (lisibilité)
    float center = exp(-pow(length((uv - vec2(0.5, 0.52)) * vec2(1.3, 1.6)), 2.0) * 2.2);
    color *= 1.0 - center * 0.16;

    // Limite douce pour éviter les zones trop lumineuses
    color = color / (1.0 + 0.12 * max(color - 0.85, vec3(0.0)));

    // Grain fin presque imperceptible (rendu "film")
    float grain = fract(sin(dot(uv + fract(uTime), vec2(12.9898, 78.233))) * 43758.5453) * 0.010;
    color += grain - 0.005;

    // Vignette douce
    float vig = smoothstep(1.25, 0.30, length(uv - vec2(0.5, 0.5)));
    color *= mix(0.80, 1.0, vig);

    gl_FragColor = vec4(color, 1.0);
  }
`

function Aurora({ children }) {
  return children
}

/* canvas doit survivre sans WebGL (sandbox / VM non-GPU / tests headless). */
export default function Hero3D() {
  const [ok, setOk] = useState(true)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl) throw new Error('no webgl')
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      setOk(false)
    }
  }, [])

  if (!ok) {
    return (
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(155deg,#0d1b3e 0%,#16295c 55%,#c9a227 130%)',
        opacity: .9,
      }} />
    )
  }

  return (
    <Canvas
      camera={{ position: [0, 0, 1] }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      dpr={[1, 1.5]}
      gl={{ antialias: false }}
    >
      <Aurora />
    </Canvas>
  )
}
