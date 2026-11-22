import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Button } from './ui'

// [M-24] WebGL Context Loss / Unsupported Hardware Error Boundary
class WebGLErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.warn('WebGL context unavailable or lost, falling back to 2D matrix:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="spatial-fallback-grid"
          style={{
            padding: 32,
            textAlign: 'center',
            background: '#092327',
            color: '#F4F6F8',
            borderRadius: 12,
            border: '1px solid rgba(144, 194, 231, 0.2)',
            minHeight: 280,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              color: '#90C2E7',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}
          >
            ARCHITECTURAL SPATIAL MATRIX · 2D FALLBACK
          </div>
          <p style={{ color: '#C7E3F7', fontSize: 12, maxWidth: 420, margin: '0 auto 16px' }}>
            WebGL context is disabled or unaccelerated. Operating in deterministic 2D projection mode.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, width: '100%', maxWidth: 460 }}>
            {['MON', 'TUE', 'WED', 'THU', 'FRI'].map((d) => (
              <div
                key={d}
                style={{
                  padding: '8px 4px',
                  background: 'rgba(14, 48, 53, 0.9)',
                  border: '1px solid rgba(144, 194, 231, 0.3)',
                  borderRadius: 6,
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#90C2E7',
                }}
              >
                {d}
              </div>
            ))}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const days = ['MON', 'TUE', 'WED', 'THU', 'FRI']
const times = ['09', '10', '11', '12', '13', '14', '15']
const midnight = '#092327'
const mist = '#90C2E7'
const ember = '#E06D53'
const pearl = '#F4F6F8'

function cellPosition(day: number, time: number, height = 0.18): [number, number, number] {
  return [(day - 2) * 1.14, height, (time - 3) * 0.82]
}

function SceneParallax({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const { pointer } = useThree()
  useFrame(() => {
    if (!group.current) return
    // [M-25] Honor prefers-reduced-motion accessibility preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    if (prefersReducedMotion) {
      group.current.rotation.x = 0
      group.current.rotation.y = 0
      return
    }

    const px = typeof pointer?.x === 'number' && Number.isFinite(pointer.x) ? pointer.x : 0
    const py = typeof pointer?.y === 'number' && Number.isFinite(pointer.y) ? pointer.y : 0
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, px * 0.055, 0.06)
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, py * -0.035, 0.06)
  })
  return <group ref={group}>{children}</group>
}

function GridPlate() {
  return (
    <group>
      {/* Deep Midnight Teal Base Plate */}
      <RoundedBox args={[6.7, 0.14, 6.1]} radius={0.12} smoothness={4} position={[0, -0.1, 0]}>
        <meshStandardMaterial color={midnight} roughness={0.38} metalness={0.2} transparent opacity={0.96} />
      </RoundedBox>

      {/* Day Separation Grid Lines */}
      {Array.from({ length: 6 }).map((_, index) => (
        <mesh key={`day-${index}`} position={[(index - 2.5) * 1.14, -0.02, 0]}>
          <boxGeometry args={[0.012, 0.022, 5.8]} />
          <meshBasicMaterial color={mist} transparent opacity={0.22} />
        </mesh>
      ))}

      {/* Time Separation Grid Lines */}
      {Array.from({ length: 8 }).map((_, index) => (
        <mesh key={`time-${index}`} position={[0, -0.01, (index - 3.5) * 0.82]}>
          <boxGeometry args={[6.48, 0.022, 0.012]} />
          <meshBasicMaterial color={mist} transparent opacity={0.22} />
        </mesh>
      ))}

      {/* Physical Recessed Translucent Lunch Break Channel (13:00 - 14:00 at index 4) */}
      <LunchBreakChannel />
    </group>
  )
}

function LunchBreakChannel() {
  // time index 4 corresponds to 13:00 -> z = (4 - 3) * 0.82 = 0.82
  return (
    <group position={[0, -0.05, 0.82]}>
      {/* Recessed frosted channel trough */}
      <RoundedBox args={[6.4, 0.06, 0.74]} radius={0.06} smoothness={4}>
        <meshStandardMaterial
          color="#061a1e"
          roughness={0.65}
          metalness={0.25}
          transparent
          opacity={0.92}
        />
      </RoundedBox>

      {/* Glowing boundary lines */}
      <mesh position={[0, 0.032, -0.36]}>
        <boxGeometry args={[6.35, 0.01, 0.014]} />
        <meshBasicMaterial color={mist} transparent opacity={0.45} />
      </mesh>
      <mesh position={[0, 0.032, 0.36]}>
        <boxGeometry args={[6.35, 0.01, 0.014]} />
        <meshBasicMaterial color={mist} transparent opacity={0.45} />
      </mesh>
    </group>
  )
}

function createTileTexture(label: string, tone: 'mist' | 'ember' | 'pearl') {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, 256, 128)
    ctx.fillStyle = tone === 'ember' ? '#9e3a24' : tone === 'mist' ? '#143c46' : '#1c4a54'
    ctx.fillRect(0, 0, 256, 128)
    ctx.strokeStyle = tone === 'ember' ? '#E06D53' : '#90C2E7'
    ctx.lineWidth = 6
    ctx.strokeRect(4, 4, 248, 120)
    ctx.fillStyle = '#F4F6F8'
    ctx.font = 'bold 50px "JetBrains Mono", monospace, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, 128, 64)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function TimetableTile({
  day,
  time,
  label,
  tone,
  targetDay,
  targetTime,
  solved,
}: {
  day: number
  time: number
  label: string
  tone: 'mist' | 'ember' | 'pearl'
  targetDay?: number
  targetTime?: number
  solved?: boolean
}) {
  const mesh = useRef<THREE.Group>(null)
  const base = cellPosition(day, time, 0.18)
  const target =
    solved && targetDay !== undefined && targetTime !== undefined
      ? cellPosition(targetDay, targetTime, 0.18)
      : base

  const activeTone = solved && tone === 'ember' ? 'mist' : tone
  const texture = useMemo(() => createTileTexture(label, activeTone), [label, activeTone])

  useEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])

  useFrame((_, delta) => {
    if (!mesh.current) return
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    if (prefersReducedMotion) {
      mesh.current.position.set(target[0], target[1], target[2])
      mesh.current.rotation.set(0, 0, 0)
      return
    }

    mesh.current.position.x = THREE.MathUtils.damp(mesh.current.position.x, target[0], 3.2, delta)
    mesh.current.position.z = THREE.MathUtils.damp(mesh.current.position.z, target[2], 3.2, delta)

    // Smooth Z/Y-axis arc lifting during clash resolution translation over the lunch break
    const dist = Math.hypot(mesh.current.position.x - target[0], mesh.current.position.z - target[2])
    const liftY = dist > 0.08 ? 0.62 : target[1]
    mesh.current.position.y = THREE.MathUtils.damp(mesh.current.position.y, liftY, 3.8, delta)
    mesh.current.rotation.z = THREE.MathUtils.damp(mesh.current.rotation.z, dist > 0.08 ? 0.08 : 0, 3, delta)
  })

  const color = activeTone === 'ember' ? ember : activeTone === 'mist' ? mist : '#dbe7ec'

  return (
    <group ref={mesh} position={base}>
      <RoundedBox args={[0.92, 0.28, 0.6]} radius={0.08} smoothness={4}>
        <meshStandardMaterial
          color={color}
          roughness={0.24}
          metalness={0.22}
          emissive={activeTone === 'ember' ? ember : mist}
          emissiveIntensity={activeTone === 'ember' ? 0.22 : 0.06}
        />
      </RoundedBox>
      <mesh position={[0, 0.145, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.82, 0.5]} />
        <meshBasicMaterial map={texture} transparent opacity={0.96} />
      </mesh>
    </group>
  )
}

function ClashPulse({ solved }: { solved: boolean }) {
  const ring = useRef<THREE.Mesh>(null)

  useEffect(() => {
    return () => {
      if (ring.current) {
        ring.current.geometry.dispose()
        if (Array.isArray(ring.current.material)) {
          ring.current.material.forEach((m) => m.dispose())
        } else if (ring.current.material) {
          ring.current.material.dispose()
        }
      }
    }
  }, [])
  useFrame((state) => {
    if (!ring.current) return
    const pulse = solved ? 0 : 1 + Math.sin(state.clock.elapsedTime * 3.2) * 0.08
    ring.current.scale.setScalar(pulse)
    const mat = ring.current.material
    if (mat) {
      const basicMat = Array.isArray(mat) ? mat[0] : mat
      if ('opacity' in basicMat) {
        basicMat.opacity = solved ? 0 : 0.38 + Math.sin(state.clock.elapsedTime * 3.2) * 0.12
      }
    }
  })

  return (
    <mesh ref={ring} position={cellPosition(2, 2, 0.48)} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.48, 0.58, 32]} />
      <meshBasicMaterial color={ember} transparent opacity={0.35} side={THREE.DoubleSide} />
    </mesh>
  )
}

function TimetableScene({ solved }: { solved: boolean }) {
  return (
    <WebGLErrorBoundary>
      <Canvas camera={{ position: [7.6, 6.4, 8.1], fov: 31 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={1.75} />
        <directionalLight position={[4, 7, 4]} intensity={2.8} color="#d8edf7" />
        <pointLight position={[-4, 3, 2]} intensity={7} color={mist} distance={8} />
        <SceneParallax>
          <GridPlate />
          <TimetableTile day={0} time={0} label="OS" tone="mist" />
          <TimetableTile day={1} time={1} label="DBMS" tone="pearl" />
          {/* Wednesday 11:00 (slot 2) Clash Blocks */}
          <TimetableTile day={2} time={2} label="OS" tone={solved ? 'mist' : 'ember'} />
          <TimetableTile
            day={2}
            time={2}
            label="NW"
            tone={solved ? 'mist' : 'ember'}
            targetDay={3}
            targetTime={5} // Moves to Thursday 14:00 (Post-lunch, slot 5)
            solved={solved}
          />
          <TimetableTile day={4} time={0} label="SE" tone="pearl" />
          <TimetableTile day={3} time={1} label="ALGO" tone="mist" />
          <TimetableTile day={1} time={6} label="CN" tone="pearl" />
          <ClashPulse solved={solved} />
        </SceneParallax>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={1.04}
          maxPolarAngle={1.56}
          minAzimuthAngle={-0.55}
          maxAzimuthAngle={0.55}
          target={[0, 0, 0]}
        />
      </Canvas>
    </WebGLErrorBoundary>
  )
}

export function SpatialTimetable({ onSolved }: { onSolved?: () => void }) {
  const [solved, setSolved] = useState(false)
  const [showReadout, setShowReadout] = useState(false)

  const resolve = () => {
    setSolved((value) => !value)
    setShowReadout((value) => !value)
    if (!solved) onSolved?.()
  }

  return (
    <div className="spatial-demo">
      <div className="spatial-canvas-frame">
        <div className="spatial-canvas">
          <div className="spatial-canvas__meta">
            <span>LIVE MATRIX · CSE-5A</span>
            <span>5 DAYS · 6 PERIODS + LUNCH</span>
          </div>
          <div className="spatial-canvas__day-labels" aria-hidden="true">
            {days.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="spatial-canvas__time-labels" aria-hidden="true">
            {times.map((time, idx) => (
              <span key={time} style={idx === 4 ? { color: '#E06D53', fontWeight: 700 } : undefined}>
                {idx === 4 ? '13:00 LUNCH' : `${time}:00`}
              </span>
            ))}
          </div>
          <TimetableScene solved={solved} />
          <div className="spatial-canvas__legend">
            <span>
              <i className="legend-swatch legend-swatch--ember" />
              {solved ? '0 Collisions' : 'Collision Detected'}
            </span>
            <span>
              <i className="legend-swatch legend-swatch--mist" />
              {solved ? 'MRV Relocated (Thu 14:00)' : 'Resolved Block'}
            </span>
            <span style={{ opacity: 0.8 }}>
              <i
                className="legend-swatch"
                style={{ background: 'rgba(144, 194, 231, 0.4)', border: '1px solid #90C2E7' }}
              />
              Lunch Break (13:00-14:00)
            </span>
          </div>
        </div>
        <div className="solver-console">
          <div>
            <span className="solver-console__eyebrow">DETERMINISTIC CONTROL · BACKTRACKING CSP (MRV)</span>
            <p>
              {showReadout
                ? '0 Conflicts • Solved in 28ms via Backtracking CSP (MRV). Overlap relocated to Thu 14:00 (Post-Lunch).'
                : 'Two blocks share Wednesday 11:00 domain (CS-501 & CS-503 clash). Lunch break (13:00–14:00) preserved.'}
            </p>
          </div>
          <Button tone={solved ? 'mist' : 'ember'} size="sm" onClick={resolve}>
            {solved ? 'Inject Clash' : 'Resolve Clash (Run Solver)'}
          </Button>
        </div>
      </div>
    </div>
  )
}
