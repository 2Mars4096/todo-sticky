import { useId, useRef, useState, type CSSProperties } from 'react'
import type { StarFocusMissionRecord, StarFocusPhase, StarFocusSession } from '../types'
import type { StarFocusSnapshot } from '../hooks/useStarFocus'

interface Props {
  variant: 'sidebar' | 'overlay'
  className?: string
  liveLabel: string
  missionHistory: StarFocusMissionRecord[]
  activeSession: StarFocusSession | null
  activeSnapshot: StarFocusSnapshot | null
}

interface OrbitLaneDefinition {
  radius: number
  inclination: number
  longitude: number
}

interface SystemBodyDefinition {
  id: 'mercury' | 'venus' | 'earth' | 'mars' | 'saturn'
  orbitRadius: number
  orbitInclination: number
  orbitLongitude: number
  angle: number
  radius: number
  glow: string
  colors: {
    highlight: string
    mid: string
    base: string
  }
  moon?: {
    distance: number
    radius: number
    angle: number
    inclination: number
    longitude: number
    color: string
  }
  ring?: {
    radiusX: number
    radiusZ: number
    inclination: number
    longitude: number
    stroke: string
  }
}

interface CameraState {
  zoom: number
  yaw: number
  tilt: number
}

interface DragState {
  pointerId: number
  startX: number
  startY: number
  startCamera: CameraState
}

interface Vec3 {
  x: number
  y: number
  z: number
}

interface ProjectedPoint {
  x: number
  y: number
  depth: number
  scale: number
}

interface PhaseMaterialTuning {
  auraOpacity: number
  shellOpacity: number
  shellWidth: number
  scatterOpacity: number
  nightOpacity: number
  glossOpacity: number
  rimOpacity: number
  ringOpacity: number
  nebulaOpacity: number
  glowOpacity: number
  sweepOpacity: number
  planetAtmosphereStroke: string
  planetInnerRingStroke: string
  bodyMotionRate: number
  weatherMotionRate: number
}

type OrbitalPhaseTheme = StarFocusPhase | 'idle'

const MAP_WIDTH = 360
const MAP_HEIGHT = 240
const MAP_CENTER_X = 132
const MAP_CENTER_Y = 126
const SIDEBAR_MARKER_LIMIT = 6
const SIDEBAR_LABEL_LIMIT = 0
const OVERLAY_LABEL_LIMIT = 2
const SCENE_PERSPECTIVE = 460
const ORBIT_SAMPLE_COUNT = 92
const ASTEROID_BELT_INCLINATION = 16
const ASTEROID_BELT_LONGITUDE = 54
const MISSION_ORBIT_LANES: readonly OrbitLaneDefinition[] = [
  { radius: 44, inclination: 20, longitude: -14 },
  { radius: 74, inclination: -12, longitude: 26 },
  { radius: 108, inclination: 24, longitude: 58 },
  { radius: 144, inclination: -18, longitude: -34 },
] as const
const CAMERA_CONFIG = {
  sidebar: {
    defaultCamera: { zoom: 0.96, yaw: -12, tilt: 22 },
    minZoom: 0.82,
    maxZoom: 1.76,
    maxYaw: 64,
    maxTilt: 52,
    zoomStep: 0.12,
    dragYawFactor: 0.34,
    dragTiltFactor: 0.26,
  },
  overlay: {
    defaultCamera: { zoom: 1.06, yaw: -20, tilt: 24 },
    minZoom: 0.78,
    maxZoom: 2.24,
    maxYaw: 76,
    maxTilt: 58,
    zoomStep: 0.16,
    dragYawFactor: 0.42,
    dragTiltFactor: 0.32,
  },
} as const
const STAR_FIELD = [
  { x: 20, y: 20, r: 1.2, opacity: 0.72 },
  { x: 48, y: 70, r: 1.1, opacity: 0.56 },
  { x: 72, y: 36, r: 1.4, opacity: 0.84 },
  { x: 98, y: 210, r: 1, opacity: 0.44 },
  { x: 112, y: 16, r: 1.1, opacity: 0.4 },
  { x: 142, y: 44, r: 1, opacity: 0.48 },
  { x: 166, y: 204, r: 1.1, opacity: 0.38 },
  { x: 188, y: 34, r: 1.3, opacity: 0.62 },
  { x: 214, y: 94, r: 1.2, opacity: 0.42 },
  { x: 230, y: 22, r: 1, opacity: 0.36 },
  { x: 244, y: 178, r: 1.2, opacity: 0.5 },
  { x: 268, y: 54, r: 1.5, opacity: 0.68 },
  { x: 282, y: 128, r: 1.2, opacity: 0.4 },
  { x: 296, y: 28, r: 1, opacity: 0.44 },
  { x: 306, y: 186, r: 1.4, opacity: 0.56 },
  { x: 322, y: 78, r: 1.2, opacity: 0.48 },
  { x: 336, y: 126, r: 1.1, opacity: 0.42 },
  { x: 344, y: 42, r: 1.6, opacity: 0.8 },
  { x: 44, y: 162, r: 1.4, opacity: 0.36 },
  { x: 260, y: 220, r: 1.1, opacity: 0.34 },
  { x: 316, y: 224, r: 1, opacity: 0.3 },
]
const ASTEROID_BELT = [
  { radius: 132, angle: 6, size: 1.1, opacity: 0.34, elevation: -1.2 },
  { radius: 134, angle: 18, size: 1, opacity: 0.26, elevation: 0.6 },
  { radius: 136, angle: 31, size: 1.3, opacity: 0.4, elevation: 1.2 },
  { radius: 138, angle: 48, size: 0.9, opacity: 0.22, elevation: -0.8 },
  { radius: 131, angle: 63, size: 1.2, opacity: 0.3, elevation: 0.3 },
  { radius: 133, angle: 79, size: 1, opacity: 0.24, elevation: 1.4 },
  { radius: 135, angle: 94, size: 1.1, opacity: 0.32, elevation: -0.4 },
  { radius: 137, angle: 111, size: 1.3, opacity: 0.38, elevation: 0.8 },
  { radius: 132, angle: 128, size: 1, opacity: 0.24, elevation: -1.1 },
  { radius: 134, angle: 144, size: 1.1, opacity: 0.28, elevation: 0.2 },
  { radius: 136, angle: 162, size: 1.2, opacity: 0.34, elevation: 1.1 },
  { radius: 138, angle: 177, size: 0.9, opacity: 0.24, elevation: -0.6 },
  { radius: 131, angle: 193, size: 1.3, opacity: 0.36, elevation: 0.7 },
  { radius: 133, angle: 207, size: 1, opacity: 0.28, elevation: -1.3 },
  { radius: 135, angle: 221, size: 1.1, opacity: 0.32, elevation: 0.5 },
  { radius: 137, angle: 237, size: 0.9, opacity: 0.22, elevation: 1.2 },
  { radius: 132, angle: 252, size: 1.2, opacity: 0.34, elevation: -0.5 },
  { radius: 134, angle: 268, size: 1, opacity: 0.24, elevation: 0.9 },
  { radius: 136, angle: 283, size: 1.1, opacity: 0.32, elevation: -1.1 },
  { radius: 138, angle: 299, size: 1.2, opacity: 0.38, elevation: 0.4 },
  { radius: 131, angle: 316, size: 1, opacity: 0.26, elevation: 1.4 },
]
const SYSTEM_BODIES: readonly SystemBodyDefinition[] = [
  {
    id: 'mercury',
    orbitRadius: 58,
    orbitInclination: 10,
    orbitLongitude: 18,
    angle: 236,
    radius: 4.6,
    glow: 'rgba(255, 217, 170, 0.16)',
    colors: {
      highlight: '#f6d9b1',
      mid: '#ba8b63',
      base: '#523529',
    },
  },
  {
    id: 'venus',
    orbitRadius: 88,
    orbitInclination: -8,
    orbitLongitude: 42,
    angle: 338,
    radius: 7.8,
    glow: 'rgba(255, 208, 135, 0.18)',
    colors: {
      highlight: '#ffe7b3',
      mid: '#d9ab63',
      base: '#7d5330',
    },
  },
  {
    id: 'earth',
    orbitRadius: 118,
    orbitInclination: 18,
    orbitLongitude: -24,
    angle: 148,
    radius: 8.2,
    glow: 'rgba(129, 198, 255, 0.22)',
    colors: {
      highlight: '#b9ecff',
      mid: '#4ba1d9',
      base: '#15496d',
    },
    moon: {
      distance: 13.2,
      radius: 2.1,
      angle: 28,
      inclination: 28,
      longitude: 16,
      color: '#ebe3ce',
    },
  },
  {
    id: 'mars',
    orbitRadius: 154,
    orbitInclination: -16,
    orbitLongitude: 62,
    angle: 206,
    radius: 6.2,
    glow: 'rgba(255, 139, 104, 0.16)',
    colors: {
      highlight: '#ffd0b2',
      mid: '#c77254',
      base: '#6b2f25',
    },
  },
  {
    id: 'saturn',
    orbitRadius: 188,
    orbitInclination: 14,
    orbitLongitude: -46,
    angle: 42,
    radius: 13.4,
    glow: 'rgba(255, 208, 133, 0.18)',
    colors: {
      highlight: '#ffe8ba',
      mid: '#caa061',
      base: '#6d4a28',
    },
    ring: {
      radiusX: 24,
      radiusZ: 12.5,
      inclination: 56,
      longitude: -12,
      stroke: 'rgba(255, 227, 170, 0.46)',
    },
  },
] as const
const PHASE_CLASS_PATTERN = /\bphase-(ignition|ascent|heating|staging|orbit|idle)\b/
const STARMAP_PHASE_TUNING: Record<OrbitalPhaseTheme, PhaseMaterialTuning> = {
  idle: {
    auraOpacity: 0.92,
    shellOpacity: 0.9,
    shellWidth: 0.98,
    scatterOpacity: 0.88,
    nightOpacity: 1.02,
    glossOpacity: 0.92,
    rimOpacity: 0.9,
    ringOpacity: 0.92,
    nebulaOpacity: 0.34,
    glowOpacity: 0.82,
    sweepOpacity: 0.22,
    planetAtmosphereStroke: 'rgba(255, 220, 150, 0.14)',
    planetInnerRingStroke: 'rgba(255, 205, 118, 0.05)',
    bodyMotionRate: 1.08,
    weatherMotionRate: 1.1,
  },
  ignition: {
    auraOpacity: 1.12,
    shellOpacity: 1.08,
    shellWidth: 1.04,
    scatterOpacity: 1.1,
    nightOpacity: 0.96,
    glossOpacity: 1.1,
    rimOpacity: 0.96,
    ringOpacity: 0.98,
    nebulaOpacity: 0.48,
    glowOpacity: 1.08,
    sweepOpacity: 0.44,
    planetAtmosphereStroke: 'rgba(255, 196, 118, 0.22)',
    planetInnerRingStroke: 'rgba(255, 176, 96, 0.12)',
    bodyMotionRate: 0.98,
    weatherMotionRate: 0.96,
  },
  ascent: {
    auraOpacity: 1.06,
    shellOpacity: 1.04,
    shellWidth: 1.02,
    scatterOpacity: 1.06,
    nightOpacity: 0.98,
    glossOpacity: 1.04,
    rimOpacity: 1.12,
    ringOpacity: 1.04,
    nebulaOpacity: 0.46,
    glowOpacity: 1.02,
    sweepOpacity: 0.42,
    planetAtmosphereStroke: 'rgba(160, 218, 255, 0.22)',
    planetInnerRingStroke: 'rgba(146, 201, 255, 0.12)',
    bodyMotionRate: 1,
    weatherMotionRate: 0.94,
  },
  heating: {
    auraOpacity: 1.14,
    shellOpacity: 1.16,
    shellWidth: 1.1,
    scatterOpacity: 1.24,
    nightOpacity: 1.08,
    glossOpacity: 0.98,
    rimOpacity: 1.02,
    ringOpacity: 1.06,
    nebulaOpacity: 0.52,
    glowOpacity: 1.12,
    sweepOpacity: 0.46,
    planetAtmosphereStroke: 'rgba(255, 154, 109, 0.24)',
    planetInnerRingStroke: 'rgba(255, 132, 90, 0.12)',
    bodyMotionRate: 0.96,
    weatherMotionRate: 0.9,
  },
  staging: {
    auraOpacity: 1.02,
    shellOpacity: 1.02,
    shellWidth: 0.98,
    scatterOpacity: 0.94,
    nightOpacity: 0.94,
    glossOpacity: 1.08,
    rimOpacity: 1.16,
    ringOpacity: 1.12,
    nebulaOpacity: 0.4,
    glowOpacity: 0.94,
    sweepOpacity: 0.32,
    planetAtmosphereStroke: 'rgba(204, 220, 255, 0.2)',
    planetInnerRingStroke: 'rgba(196, 213, 255, 0.11)',
    bodyMotionRate: 1.02,
    weatherMotionRate: 0.96,
  },
  orbit: {
    auraOpacity: 1.08,
    shellOpacity: 1.08,
    shellWidth: 1.04,
    scatterOpacity: 1.02,
    nightOpacity: 0.9,
    glossOpacity: 1.14,
    rimOpacity: 1.18,
    ringOpacity: 1.14,
    nebulaOpacity: 0.38,
    glowOpacity: 0.92,
    sweepOpacity: 0.26,
    planetAtmosphereStroke: 'rgba(132, 230, 191, 0.2)',
    planetInnerRingStroke: 'rgba(124, 220, 176, 0.1)',
    bodyMotionRate: 1.06,
    weatherMotionRate: 1.08,
  },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function formatClock(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function rotateX(point: Vec3, degrees: number): Vec3 {
  const angle = toRadians(degrees)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return {
    x: point.x,
    y: (point.y * cos) - (point.z * sin),
    z: (point.y * sin) + (point.z * cos),
  }
}

function rotateY(point: Vec3, degrees: number): Vec3 {
  const angle = toRadians(degrees)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return {
    x: (point.x * cos) + (point.z * sin),
    y: point.y,
    z: (-point.x * sin) + (point.z * cos),
  }
}

function addVectors(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x + right.x,
    y: left.y + right.y,
    z: left.z + right.z,
  }
}

function orbitalOffset(
  radius: number,
  angleDegrees: number,
  inclinationDegrees = 0,
  longitudeDegrees = 0,
  elevation = 0,
): Vec3 {
  const angle = toRadians(angleDegrees)
  const point = {
    x: Math.cos(angle) * radius,
    y: elevation,
    z: Math.sin(angle) * radius,
  }

  return rotateY(rotateX(point, inclinationDegrees), longitudeDegrees)
}

function ellipticalOffset(
  radiusX: number,
  radiusZ: number,
  angleDegrees: number,
  inclinationDegrees = 0,
  longitudeDegrees = 0,
  elevation = 0,
): Vec3 {
  const angle = toRadians(angleDegrees)
  const point = {
    x: Math.cos(angle) * radiusX,
    y: elevation,
    z: Math.sin(angle) * radiusZ,
  }

  return rotateY(rotateX(point, inclinationDegrees), longitudeDegrees)
}

function projectPoint(point: Vec3, camera: CameraState): ProjectedPoint {
  const yawAdjusted = rotateY(point, -camera.yaw)
  const viewPoint = rotateX(yawAdjusted, -camera.tilt)
  const safeDepth = Math.min(viewPoint.z, SCENE_PERSPECTIVE - 48)
  const perspective = SCENE_PERSPECTIVE / (SCENE_PERSPECTIVE - safeDepth)
  const scale = clamp(perspective * camera.zoom, 0.44, 3.1)

  return {
    x: MAP_CENTER_X + (viewPoint.x * scale),
    y: MAP_CENTER_Y - (viewPoint.y * scale),
    depth: safeDepth,
    scale,
  }
}

function buildProjectedLoop(
  samples: number,
  pointBuilder: (angleDegrees: number) => Vec3,
  camera: CameraState,
) {
  return Array.from({ length: samples }, (_, index) => projectPoint(pointBuilder((index / samples) * 360), camera))
}

function buildSegmentPath(points: ProjectedPoint[], depthMode: 'front' | 'back', closed: boolean) {
  if (points.length < 2) return ''

  const maxIndex = closed ? points.length : points.length - 1
  const isVisible = (point: ProjectedPoint) => (depthMode === 'front' ? point.depth >= 0 : point.depth < 0)
  const segments: string[] = []

  for (let index = 0; index < maxIndex; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]

    if (!isVisible(current) || !isVisible(next)) continue

    segments.push(`M ${current.x.toFixed(2)} ${current.y.toFixed(2)} L ${next.x.toFixed(2)} ${next.y.toFixed(2)}`)
  }

  return segments.join(' ')
}

function buildLinePath(points: ProjectedPoint[]) {
  if (!points.length) return ''

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')
}

function historyMarkerWorldPoint(orbitIndex: number) {
  const lane = MISSION_ORBIT_LANES[orbitIndex % MISSION_ORBIT_LANES.length] ?? MISSION_ORBIT_LANES[0]
  const angle = 18 + ((orbitIndex * 47) % 320)
  return orbitalOffset(lane.radius, angle, lane.inclination, lane.longitude, 0)
}

function liveTrajectoryWorldPoint(progress: number) {
  const normalized = clamp(progress, 0, 1)

  if (normalized < 0.72) {
    const stageProgress = normalized / 0.72
    return orbitalOffset(
      22 + (stageProgress * 118),
      166 - (stageProgress * 204),
      30 - (stageProgress * 14),
      -18 + (stageProgress * 40),
      Math.sin(stageProgress * Math.PI) * 30,
    )
  }

  const orbitProgress = (normalized - 0.72) / 0.28
  return orbitalOffset(
    140,
    -22 - (orbitProgress * 88),
    18,
    24,
    Math.sin(orbitProgress * Math.PI) * 6,
  )
}

function buildTrajectoryPoints(progress: number, steps: number, camera: CameraState) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const point = liveTrajectoryWorldPoint((clamp(progress, 0, 1) * index) / steps)
    return projectPoint(point, camera)
  })
}

function pointFrom(originX: number, originY: number, distance: number, angleDegrees: number) {
  const angle = toRadians(angleDegrees)

  return {
    x: originX + (Math.cos(angle) * distance),
    y: originY + (Math.sin(angle) * distance),
  }
}

function angleFromPoint(origin: { x: number; y: number }, target: { x: number; y: number }) {
  return (Math.atan2(target.y - origin.y, target.x - origin.x) * 180) / Math.PI
}

function resolvePhaseTheme(className: string | undefined, fallback: OrbitalPhaseTheme): OrbitalPhaseTheme {
  const matchedTheme = className?.match(PHASE_CLASS_PATTERN)?.[1] as OrbitalPhaseTheme | undefined
  return matchedTheme ?? fallback
}

function textureMotionStyle(
  bodyId: SystemBodyDefinition['id'],
  point: { x: number; y: number },
  motionRate: number,
): CSSProperties {
  const durationMap: Record<SystemBodyDefinition['id'], number> = {
    mercury: 64,
    venus: 118,
    earth: 88,
    mars: 96,
    saturn: 142,
  }

  return {
    transformOrigin: `${point.x}px ${point.y}px`,
    animationDuration: `${(durationMap[bodyId] * motionRate).toFixed(2)}s`,
  }
}

function layerDriftStyle(
  point: { x: number; y: number },
  durationSeconds: number,
  driftX: number,
  driftY: number,
  motionRate: number,
): CSSProperties {
  return {
    transformOrigin: `${point.x}px ${point.y}px`,
    animationDuration: `${(durationSeconds * motionRate).toFixed(2)}s`,
    '--starmap-layer-drift-x': `${driftX}px`,
    '--starmap-layer-drift-y': `${driftY}px`,
  } as CSSProperties
}

function renderBodyShell(
  body: SystemBodyDefinition,
  point: { x: number; y: number },
  radius: number,
  lightAngle: number,
) {
  const limbPoint = pointFrom(point.x, point.y, radius * 0.12, lightAngle)
  const scatterPoint = pointFrom(point.x, point.y, radius * 0.2, lightAngle)

  if (body.id === 'earth') {
    return (
      <g className="starmap-system-body-shell earth">
        <circle className="atmosphere near" cx={point.x} cy={point.y} r={(radius * 1.04).toFixed(2)} />
        <circle className="atmosphere mid" cx={point.x} cy={point.y} r={(radius * 1.09).toFixed(2)} />
        <circle className="atmosphere far" cx={point.x} cy={point.y} r={(radius * 1.17).toFixed(2)} />
        <ellipse className="scatter" cx={scatterPoint.x.toFixed(2)} cy={scatterPoint.y.toFixed(2)} rx={(radius * 1.14).toFixed(2)} ry={(radius * 1.02).toFixed(2)} />
        <ellipse className="limb" cx={limbPoint.x.toFixed(2)} cy={limbPoint.y.toFixed(2)} rx={(radius * 1.02).toFixed(2)} ry={(radius * 0.98).toFixed(2)} />
      </g>
    )
  }

  if (body.id === 'venus') {
    return (
      <g className="starmap-system-body-shell venus">
        <circle className="atmosphere near" cx={point.x} cy={point.y} r={(radius * 1.06).toFixed(2)} />
        <circle className="atmosphere mid" cx={point.x} cy={point.y} r={(radius * 1.12).toFixed(2)} />
        <circle className="atmosphere far" cx={point.x} cy={point.y} r={(radius * 1.22).toFixed(2)} />
        <ellipse className="scatter" cx={scatterPoint.x.toFixed(2)} cy={scatterPoint.y.toFixed(2)} rx={(radius * 1.2).toFixed(2)} ry={(radius * 1.08).toFixed(2)} />
        <ellipse className="limb" cx={limbPoint.x.toFixed(2)} cy={limbPoint.y.toFixed(2)} rx={(radius * 1.06).toFixed(2)} ry={(radius * 1.02).toFixed(2)} />
      </g>
    )
  }

  if (body.id === 'mars') {
    return (
      <g className="starmap-system-body-shell mars">
        <circle className="atmosphere near" cx={point.x} cy={point.y} r={(radius * 1.03).toFixed(2)} />
        <circle className="atmosphere mid" cx={point.x} cy={point.y} r={(radius * 1.08).toFixed(2)} />
        <ellipse className="scatter dust" cx={scatterPoint.x.toFixed(2)} cy={scatterPoint.y.toFixed(2)} rx={(radius * 1.08).toFixed(2)} ry={(radius * 0.96).toFixed(2)} />
      </g>
    )
  }

  if (body.id === 'saturn') {
    return (
      <g className="starmap-system-body-shell saturn">
        <ellipse className="atmosphere near" cx={point.x} cy={point.y} rx={(radius * 1.04).toFixed(2)} ry={(radius * 1.01).toFixed(2)} />
        <ellipse className="atmosphere mid" cx={point.x} cy={point.y} rx={(radius * 1.1).toFixed(2)} ry={(radius * 1.06).toFixed(2)} />
        <ellipse className="atmosphere far" cx={point.x} cy={point.y} rx={(radius * 1.18).toFixed(2)} ry={(radius * 1.12).toFixed(2)} />
        <ellipse className="scatter" cx={scatterPoint.x.toFixed(2)} cy={scatterPoint.y.toFixed(2)} rx={(radius * 1.18).toFixed(2)} ry={(radius * 1.04).toFixed(2)} />
        <ellipse className="limb" cx={limbPoint.x.toFixed(2)} cy={limbPoint.y.toFixed(2)} rx={(radius * 1.02).toFixed(2)} ry={(radius * 0.98).toFixed(2)} />
      </g>
    )
  }

  return null
}

function renderBodyTexture(
  body: SystemBodyDefinition,
  point: { x: number; y: number },
  radius: number,
  clipId: string,
  phaseTuning: PhaseMaterialTuning,
) {
  if (body.id === 'mercury') {
    return (
      <g
        className="starmap-system-body-detail mercury motion-spin"
        clipPath={`url(#${clipId})`}
        style={textureMotionStyle(body.id, point, phaseTuning.bodyMotionRate)}
      >
        <path
          className="basin"
          d={`M ${(point.x - (radius * 0.86)).toFixed(2)} ${(point.y - (radius * 0.12)).toFixed(2)} C ${(point.x - (radius * 0.48)).toFixed(2)} ${(point.y - (radius * 0.58)).toFixed(2)} ${(point.x + (radius * 0.04)).toFixed(2)} ${(point.y - (radius * 0.48)).toFixed(2)} ${(point.x + (radius * 0.44)).toFixed(2)} ${(point.y - (radius * 0.16)).toFixed(2)} C ${(point.x + (radius * 0.16)).toFixed(2)} ${(point.y + (radius * 0.18)).toFixed(2)} ${(point.x - (radius * 0.28)).toFixed(2)} ${(point.y + (radius * 0.3)).toFixed(2)} ${(point.x - (radius * 0.86)).toFixed(2)} ${(point.y - (radius * 0.12)).toFixed(2)} Z`}
        />
        <path
          className="ridge"
          d={`M ${(point.x - (radius * 0.72)).toFixed(2)} ${(point.y - (radius * 0.42)).toFixed(2)} C ${(point.x - (radius * 0.3)).toFixed(2)} ${(point.y - (radius * 0.18)).toFixed(2)} ${(point.x + (radius * 0.12)).toFixed(2)} ${(point.y - (radius * 0.24)).toFixed(2)} ${(point.x + (radius * 0.58)).toFixed(2)} ${(point.y - (radius * 0.02)).toFixed(2)}`}
        />
        <path
          className="ridge secondary"
          d={`M ${(point.x - (radius * 0.46)).toFixed(2)} ${(point.y + (radius * 0.44)).toFixed(2)} C ${(point.x - (radius * 0.08)).toFixed(2)} ${(point.y + (radius * 0.2)).toFixed(2)} ${(point.x + (radius * 0.2)).toFixed(2)} ${(point.y + (radius * 0.18)).toFixed(2)} ${(point.x + (radius * 0.62)).toFixed(2)} ${(point.y + (radius * 0.34)).toFixed(2)}`}
        />
        <circle className="crater" cx={(point.x - (radius * 0.34)).toFixed(2)} cy={(point.y - (radius * 0.54)).toFixed(2)} r={(radius * 0.18).toFixed(2)} />
        <circle className="crater" cx={(point.x + (radius * 0.44)).toFixed(2)} cy={(point.y - (radius * 0.08)).toFixed(2)} r={(radius * 0.14).toFixed(2)} />
        <circle className="crater" cx={(point.x - (radius * 0.04)).toFixed(2)} cy={(point.y + (radius * 0.44)).toFixed(2)} r={(radius * 0.12).toFixed(2)} />
      </g>
    )
  }

  if (body.id === 'earth') {
    return (
      <g
        className="starmap-system-body-detail earth motion-spin"
        clipPath={`url(#${clipId})`}
        style={textureMotionStyle(body.id, point, phaseTuning.bodyMotionRate)}
      >
        <path
          className="shoal"
          d={`M ${(point.x - (radius * 0.92)).toFixed(2)} ${(point.y - (radius * 0.08)).toFixed(2)} C ${(point.x - (radius * 0.46)).toFixed(2)} ${(point.y - (radius * 0.72)).toFixed(2)} ${(point.x + (radius * 0.28)).toFixed(2)} ${(point.y - (radius * 0.6)).toFixed(2)} ${(point.x + (radius * 0.78)).toFixed(2)} ${(point.y - (radius * 0.04)).toFixed(2)} C ${(point.x + (radius * 0.22)).toFixed(2)} ${(point.y + (radius * 0.42)).toFixed(2)} ${(point.x - (radius * 0.42)).toFixed(2)} ${(point.y + (radius * 0.56)).toFixed(2)} ${(point.x - (radius * 0.92)).toFixed(2)} ${(point.y - (radius * 0.08)).toFixed(2)} Z`}
        />
        <path
          className="continent major"
          d={`M ${(point.x - (radius * 0.68)).toFixed(2)} ${(point.y - (radius * 0.26)).toFixed(2)} C ${(point.x - (radius * 0.32)).toFixed(2)} ${(point.y - (radius * 0.88)).toFixed(2)} ${(point.x + (radius * 0.28)).toFixed(2)} ${(point.y - (radius * 0.58)).toFixed(2)} ${(point.x + (radius * 0.05)).toFixed(2)} ${(point.y - (radius * 0.05)).toFixed(2)} C ${(point.x + (radius * 0.34)).toFixed(2)} ${(point.y + (radius * 0.16)).toFixed(2)} ${(point.x + (radius * 0.1)).toFixed(2)} ${(point.y + (radius * 0.68)).toFixed(2)} ${(point.x - (radius * 0.46)).toFixed(2)} ${(point.y + (radius * 0.38)).toFixed(2)} C ${(point.x - (radius * 0.76)).toFixed(2)} ${(point.y + (radius * 0.17)).toFixed(2)} ${(point.x - (radius * 0.82)).toFixed(2)} ${(point.y - (radius * 0.02)).toFixed(2)} ${(point.x - (radius * 0.68)).toFixed(2)} ${(point.y - (radius * 0.26)).toFixed(2)} Z`}
        />
        <path
          className="continent minor"
          d={`M ${(point.x + (radius * 0.32)).toFixed(2)} ${(point.y - (radius * 0.46)).toFixed(2)} C ${(point.x + (radius * 0.66)).toFixed(2)} ${(point.y - (radius * 0.54)).toFixed(2)} ${(point.x + (radius * 0.84)).toFixed(2)} ${(point.y - (radius * 0.31)).toFixed(2)} ${(point.x + (radius * 0.7)).toFixed(2)} ${(point.y - (radius * 0.02)).toFixed(2)} C ${(point.x + (radius * 0.9)).toFixed(2)} ${(point.y + (radius * 0.2)).toFixed(2)} ${(point.x + (radius * 0.74)).toFixed(2)} ${(point.y + (radius * 0.56)).toFixed(2)} ${(point.x + (radius * 0.34)).toFixed(2)} ${(point.y + (radius * 0.45)).toFixed(2)} C ${(point.x + (radius * 0.18)).toFixed(2)} ${(point.y + (radius * 0.28)).toFixed(2)} ${(point.x + (radius * 0.15)).toFixed(2)} ${(point.y - (radius * 0.26)).toFixed(2)} ${(point.x + (radius * 0.32)).toFixed(2)} ${(point.y - (radius * 0.46)).toFixed(2)} Z`}
        />
        <path
          className="continent islet"
          d={`M ${(point.x - (radius * 0.06)).toFixed(2)} ${(point.y - (radius * 0.68)).toFixed(2)} C ${(point.x + (radius * 0.08)).toFixed(2)} ${(point.y - (radius * 0.78)).toFixed(2)} ${(point.x + (radius * 0.22)).toFixed(2)} ${(point.y - (radius * 0.72)).toFixed(2)} ${(point.x + (radius * 0.22)).toFixed(2)} ${(point.y - (radius * 0.58)).toFixed(2)} C ${(point.x + (radius * 0.08)).toFixed(2)} ${(point.y - (radius * 0.5)).toFixed(2)} ${(point.x - (radius * 0.02)).toFixed(2)} ${(point.y - (radius * 0.54)).toFixed(2)} ${(point.x - (radius * 0.06)).toFixed(2)} ${(point.y - (radius * 0.68)).toFixed(2)} Z`}
        />
        <path
          className="current"
          d={`M ${(point.x - (radius * 0.84)).toFixed(2)} ${(point.y + (radius * 0.08)).toFixed(2)} C ${(point.x - (radius * 0.34)).toFixed(2)} ${(point.y - (radius * 0.18)).toFixed(2)} ${(point.x + (radius * 0.1)).toFixed(2)} ${(point.y - (radius * 0.1)).toFixed(2)} ${(point.x + (radius * 0.74)).toFixed(2)} ${(point.y + (radius * 0.12)).toFixed(2)}`}
        />
        <path
          className="current secondary"
          d={`M ${(point.x - (radius * 0.62)).toFixed(2)} ${(point.y + (radius * 0.48)).toFixed(2)} C ${(point.x - (radius * 0.22)).toFixed(2)} ${(point.y + (radius * 0.2)).toFixed(2)} ${(point.x + (radius * 0.2)).toFixed(2)} ${(point.y + (radius * 0.18)).toFixed(2)} ${(point.x + (radius * 0.68)).toFixed(2)} ${(point.y + (radius * 0.34)).toFixed(2)}`}
        />
        <ellipse className="icecap north" cx={(point.x - (radius * 0.12)).toFixed(2)} cy={(point.y - (radius * 0.88)).toFixed(2)} rx={(radius * 0.38).toFixed(2)} ry={(radius * 0.18).toFixed(2)} />
        <ellipse className="icecap south" cx={(point.x + (radius * 0.08)).toFixed(2)} cy={(point.y + (radius * 0.84)).toFixed(2)} rx={(radius * 0.42).toFixed(2)} ry={(radius * 0.2).toFixed(2)} />
        <g className="weather-drift" style={layerDriftStyle(point, 28, radius * 0.05, radius * 0.015, phaseTuning.weatherMotionRate)}>
          <ellipse className="cloud band" cx={(point.x - (radius * 0.14)).toFixed(2)} cy={(point.y - (radius * 0.62)).toFixed(2)} rx={(radius * 0.68).toFixed(2)} ry={(radius * 0.22).toFixed(2)} />
          <ellipse className="cloud band" cx={(point.x + (radius * 0.3)).toFixed(2)} cy={(point.y + (radius * 0.34)).toFixed(2)} rx={(radius * 0.76).toFixed(2)} ry={(radius * 0.18).toFixed(2)} />
          <path
            className="cloud storm"
            d={`M ${(point.x - (radius * 0.62)).toFixed(2)} ${(point.y + (radius * 0.02)).toFixed(2)} C ${(point.x - (radius * 0.28)).toFixed(2)} ${(point.y - (radius * 0.2)).toFixed(2)} ${(point.x + (radius * 0.16)).toFixed(2)} ${(point.y - (radius * 0.1)).toFixed(2)} ${(point.x + (radius * 0.44)).toFixed(2)} ${(point.y + (radius * 0.08)).toFixed(2)} C ${(point.x + (radius * 0.08)).toFixed(2)} ${(point.y + (radius * 0.2)).toFixed(2)} ${(point.x - (radius * 0.2)).toFixed(2)} ${(point.y + (radius * 0.3)).toFixed(2)} ${(point.x - (radius * 0.62)).toFixed(2)} ${(point.y + (radius * 0.02)).toFixed(2)} Z`}
          />
        </g>
        <ellipse className="aurora north" cx={(point.x - (radius * 0.18)).toFixed(2)} cy={(point.y - (radius * 0.74)).toFixed(2)} rx={(radius * 0.48).toFixed(2)} ry={(radius * 0.14).toFixed(2)} />
        <ellipse className="aurora south" cx={(point.x + (radius * 0.08)).toFixed(2)} cy={(point.y + (radius * 0.72)).toFixed(2)} rx={(radius * 0.42).toFixed(2)} ry={(radius * 0.12).toFixed(2)} />
      </g>
    )
  }

  if (body.id === 'venus') {
    return (
      <g
        className="starmap-system-body-detail venus motion-spin"
        clipPath={`url(#${clipId})`}
        style={textureMotionStyle(body.id, point, phaseTuning.bodyMotionRate)}
      >
        <ellipse className="haze" cx={point.x} cy={point.y} rx={(radius * 1.16).toFixed(2)} ry={(radius * 1.02).toFixed(2)} />
        <g className="weather-drift" style={layerDriftStyle(point, 38, radius * 0.03, radius * 0.012, phaseTuning.weatherMotionRate)}>
          <ellipse className="micro-band upper" cx={(point.x - (radius * 0.02)).toFixed(2)} cy={(point.y - (radius * 0.68)).toFixed(2)} rx={(radius * 0.96).toFixed(2)} ry={(radius * 0.08).toFixed(2)} />
          <ellipse className="band high" cx={point.x} cy={(point.y - (radius * 0.52)).toFixed(2)} rx={(radius * 1.08).toFixed(2)} ry={(radius * 0.18).toFixed(2)} />
          <ellipse className="band" cx={point.x} cy={(point.y - (radius * 0.2)).toFixed(2)} rx={(radius * 1.1).toFixed(2)} ry={(radius * 0.22).toFixed(2)} />
          <ellipse className="micro-band mid" cx={(point.x + (radius * 0.03)).toFixed(2)} cy={(point.y + (radius * 0.01)).toFixed(2)} rx={(radius * 1.06).toFixed(2)} ry={(radius * 0.07).toFixed(2)} />
          <ellipse className="band deep" cx={(point.x - (radius * 0.06)).toFixed(2)} cy={(point.y + (radius * 0.16)).toFixed(2)} rx={(radius * 1.18).toFixed(2)} ry={(radius * 0.24).toFixed(2)} />
          <ellipse className="band low" cx={(point.x + (radius * 0.05)).toFixed(2)} cy={(point.y + (radius * 0.56)).toFixed(2)} rx={(radius * 0.94).toFixed(2)} ry={(radius * 0.18).toFixed(2)} />
          <ellipse className="micro-band lower" cx={(point.x - (radius * 0.04)).toFixed(2)} cy={(point.y + (radius * 0.72)).toFixed(2)} rx={(radius * 0.82).toFixed(2)} ry={(radius * 0.06).toFixed(2)} />
          <path
            className="vein"
            d={`M ${(point.x - (radius * 0.86)).toFixed(2)} ${(point.y - (radius * 0.06)).toFixed(2)} C ${(point.x - (radius * 0.34)).toFixed(2)} ${(point.y - (radius * 0.34)).toFixed(2)} ${(point.x + (radius * 0.12)).toFixed(2)} ${(point.y - (radius * 0.18)).toFixed(2)} ${(point.x + (radius * 0.7)).toFixed(2)} ${(point.y + (radius * 0.12)).toFixed(2)}`}
          />
          <path
            className="swirl"
            d={`M ${(point.x - (radius * 0.68)).toFixed(2)} ${(point.y + (radius * 0.24)).toFixed(2)} C ${(point.x - (radius * 0.28)).toFixed(2)} ${(point.y + (radius * 0.02)).toFixed(2)} ${(point.x + (radius * 0.1)).toFixed(2)} ${(point.y + (radius * 0.02)).toFixed(2)} ${(point.x + (radius * 0.56)).toFixed(2)} ${(point.y + (radius * 0.22)).toFixed(2)}`}
          />
        </g>
      </g>
    )
  }

  if (body.id === 'mars') {
    return (
      <g
        className="starmap-system-body-detail mars motion-spin"
        clipPath={`url(#${clipId})`}
        style={textureMotionStyle(body.id, point, phaseTuning.bodyMotionRate)}
      >
        <g className="weather-drift" style={layerDriftStyle(point, 44, radius * 0.03, radius * 0.012, phaseTuning.weatherMotionRate)}>
          <ellipse className="dust" cx={(point.x - (radius * 0.08)).toFixed(2)} cy={(point.y - (radius * 0.06)).toFixed(2)} rx={(radius * 1.08).toFixed(2)} ry={(radius * 0.82).toFixed(2)} />
        </g>
        <path
          className="terrain"
          d={`M ${(point.x - (radius * 0.98)).toFixed(2)} ${(point.y + (radius * 0.06)).toFixed(2)} C ${(point.x - (radius * 0.52)).toFixed(2)} ${(point.y - (radius * 0.38)).toFixed(2)} ${(point.x + (radius * 0.12)).toFixed(2)} ${(point.y - (radius * 0.34)).toFixed(2)} ${(point.x + (radius * 0.66)).toFixed(2)} ${(point.y - (radius * 0.02)).toFixed(2)} C ${(point.x + (radius * 0.28)).toFixed(2)} ${(point.y + (radius * 0.29)).toFixed(2)} ${(point.x - (radius * 0.3)).toFixed(2)} ${(point.y + (radius * 0.45)).toFixed(2)} ${(point.x - (radius * 0.98)).toFixed(2)} ${(point.y + (radius * 0.06)).toFixed(2)} Z`}
        />
        <path
          className="terrain ridge"
          d={`M ${(point.x - (radius * 0.74)).toFixed(2)} ${(point.y - (radius * 0.4)).toFixed(2)} C ${(point.x - (radius * 0.34)).toFixed(2)} ${(point.y - (radius * 0.64)).toFixed(2)} ${(point.x + (radius * 0.24)).toFixed(2)} ${(point.y - (radius * 0.54)).toFixed(2)} ${(point.x + (radius * 0.74)).toFixed(2)} ${(point.y - (radius * 0.16)).toFixed(2)} C ${(point.x + (radius * 0.28)).toFixed(2)} ${(point.y - (radius * 0.08)).toFixed(2)} ${(point.x - (radius * 0.14)).toFixed(2)} ${(point.y - (radius * 0.02)).toFixed(2)} ${(point.x - (radius * 0.74)).toFixed(2)} ${(point.y - (radius * 0.4)).toFixed(2)} Z`}
        />
        <path
          className="dune"
          d={`M ${(point.x - (radius * 0.86)).toFixed(2)} ${(point.y + (radius * 0.18)).toFixed(2)} C ${(point.x - (radius * 0.42)).toFixed(2)} ${(point.y + (radius * 0.02)).toFixed(2)} ${(point.x - (radius * 0.06)).toFixed(2)} ${(point.y + (radius * 0.04)).toFixed(2)} ${(point.x + (radius * 0.44)).toFixed(2)} ${(point.y + (radius * 0.22)).toFixed(2)}`}
        />
        <path
          className="dune secondary"
          d={`M ${(point.x - (radius * 0.52)).toFixed(2)} ${(point.y + (radius * 0.54)).toFixed(2)} C ${(point.x - (radius * 0.18)).toFixed(2)} ${(point.y + (radius * 0.34)).toFixed(2)} ${(point.x + (radius * 0.16)).toFixed(2)} ${(point.y + (radius * 0.34)).toFixed(2)} ${(point.x + (radius * 0.58)).toFixed(2)} ${(point.y + (radius * 0.48)).toFixed(2)}`}
        />
        <path
          className="canyon"
          d={`M ${(point.x - (radius * 0.86)).toFixed(2)} ${(point.y - (radius * 0.08)).toFixed(2)} C ${(point.x - (radius * 0.34)).toFixed(2)} ${(point.y + (radius * 0.06)).toFixed(2)} ${(point.x + (radius * 0.08)).toFixed(2)} ${(point.y + (radius * 0.18)).toFixed(2)} ${(point.x + (radius * 0.76)).toFixed(2)} ${(point.y + (radius * 0.44)).toFixed(2)}`}
        />
        <ellipse className="icecap" cx={(point.x - (radius * 0.08)).toFixed(2)} cy={(point.y - (radius * 0.88)).toFixed(2)} rx={(radius * 0.34).toFixed(2)} ry={(radius * 0.16).toFixed(2)} />
        <circle className="crater" cx={(point.x + (radius * 0.37)).toFixed(2)} cy={(point.y - (radius * 0.55)).toFixed(2)} r={(radius * 0.18).toFixed(2)} />
        <circle className="crater" cx={(point.x - (radius * 0.58)).toFixed(2)} cy={(point.y + (radius * 0.52)).toFixed(2)} r={(radius * 0.15).toFixed(2)} />
        <circle className="crater small" cx={(point.x + (radius * 0.06)).toFixed(2)} cy={(point.y + (radius * 0.28)).toFixed(2)} r={(radius * 0.09).toFixed(2)} />
      </g>
    )
  }

  if (body.id === 'saturn') {
    return (
      <g
        className="starmap-system-body-detail saturn motion-spin"
        clipPath={`url(#${clipId})`}
        style={textureMotionStyle(body.id, point, phaseTuning.bodyMotionRate)}
      >
        <ellipse className="polar-haze" cx={point.x} cy={(point.y - (radius * 0.84)).toFixed(2)} rx={(radius * 0.52).toFixed(2)} ry={(radius * 0.18).toFixed(2)} />
        <ellipse className="ring-shadow" cx={(point.x + (radius * 0.04)).toFixed(2)} cy={(point.y + (radius * 0.08)).toFixed(2)} rx={(radius * 1.26).toFixed(2)} ry={(radius * 0.18).toFixed(2)} />
        <g className="weather-drift" style={layerDriftStyle(point, 52, radius * 0.028, radius * 0.01, phaseTuning.weatherMotionRate)}>
          <ellipse className="micro-band upper" cx={(point.x - (radius * 0.02)).toFixed(2)} cy={(point.y - (radius * 0.7)).toFixed(2)} rx={(radius * 0.86).toFixed(2)} ry={(radius * 0.05).toFixed(2)} />
          <ellipse className="band high" cx={point.x} cy={(point.y - (radius * 0.54)).toFixed(2)} rx={(radius * 0.92).toFixed(2)} ry={(radius * 0.14).toFixed(2)} />
          <ellipse className="micro-band" cx={(point.x + (radius * 0.02)).toFixed(2)} cy={(point.y - (radius * 0.36)).toFixed(2)} rx={(radius * 1).toFixed(2)} ry={(radius * 0.05).toFixed(2)} />
          <ellipse className="band" cx={point.x} cy={(point.y - (radius * 0.22)).toFixed(2)} rx={(radius * 1.02).toFixed(2)} ry={(radius * 0.14).toFixed(2)} />
          <ellipse className="micro-band mid" cx={(point.x - (radius * 0.02)).toFixed(2)} cy={(point.y - (radius * 0.08)).toFixed(2)} rx={(radius * 1.06).toFixed(2)} ry={(radius * 0.05).toFixed(2)} />
          <ellipse className="band" cx={(point.x - (radius * 0.03)).toFixed(2)} cy={(point.y + (radius * 0.06)).toFixed(2)} rx={(radius * 1.08).toFixed(2)} ry={(radius * 0.15).toFixed(2)} />
          <ellipse className="band deep" cx={(point.x + (radius * 0.04)).toFixed(2)} cy={(point.y + (radius * 0.34)).toFixed(2)} rx={(radius * 1.14).toFixed(2)} ry={(radius * 0.17).toFixed(2)} />
          <ellipse className="micro-band lower" cx={(point.x - (radius * 0.04)).toFixed(2)} cy={(point.y + (radius * 0.48)).toFixed(2)} rx={(radius * 0.98).toFixed(2)} ry={(radius * 0.05).toFixed(2)} />
          <ellipse className="band low" cx={(point.x - (radius * 0.04)).toFixed(2)} cy={(point.y + (radius * 0.62)).toFixed(2)} rx={(radius * 0.94).toFixed(2)} ry={(radius * 0.13).toFixed(2)} />
          <path
            className="storm"
            d={`M ${(point.x - (radius * 0.58)).toFixed(2)} ${(point.y - (radius * 0.04)).toFixed(2)} C ${(point.x - (radius * 0.22)).toFixed(2)} ${(point.y - (radius * 0.16)).toFixed(2)} ${(point.x + (radius * 0.06)).toFixed(2)} ${(point.y - (radius * 0.1)).toFixed(2)} ${(point.x + (radius * 0.4)).toFixed(2)} ${(point.y + (radius * 0.02)).toFixed(2)} C ${(point.x + (radius * 0.12)).toFixed(2)} ${(point.y + (radius * 0.14)).toFixed(2)} ${(point.x - (radius * 0.16)).toFixed(2)} ${(point.y + (radius * 0.16)).toFixed(2)} ${(point.x - (radius * 0.58)).toFixed(2)} ${(point.y - (radius * 0.04)).toFixed(2)} Z`}
          />
          <path
            className="shear"
            d={`M ${(point.x - (radius * 0.86)).toFixed(2)} ${(point.y + (radius * 0.22)).toFixed(2)} C ${(point.x - (radius * 0.42)).toFixed(2)} ${(point.y + (radius * 0.08)).toFixed(2)} ${(point.x + (radius * 0.06)).toFixed(2)} ${(point.y + (radius * 0.08)).toFixed(2)} ${(point.x + (radius * 0.82)).toFixed(2)} ${(point.y + (radius * 0.28)).toFixed(2)}`}
          />
        </g>
      </g>
    )
  }

  return null
}

function renderBodyLighting(
  body: SystemBodyDefinition,
  point: { x: number; y: number },
  radius: number,
  clipId: string,
  lightAngle: number,
  detailFalloffGradientId: string,
  ringOcclusionPath: string,
) {
  const nightCenter = pointFrom(point.x, point.y, radius * 0.34, lightAngle + 180)
  const rimCenter = pointFrom(point.x, point.y, radius * 0.12, lightAngle)
  const glossCenter = pointFrom(point.x, point.y, radius * 0.28, lightAngle)

  return (
    <g className={`starmap-system-body-lighting ${body.id}`} clipPath={`url(#${clipId})`}>
      {body.id === 'saturn' && ringOcclusionPath && (
        <path className="ring-occlusion" d={ringOcclusionPath} />
      )}
      <circle
        className="detail-falloff"
        cx={point.x}
        cy={point.y}
        r={radius.toFixed(2)}
        fill={`url(#${detailFalloffGradientId})`}
      />
      <ellipse
        className="night"
        cx={nightCenter.x.toFixed(2)}
        cy={nightCenter.y.toFixed(2)}
        rx={(radius * (body.id === 'venus' ? 0.92 : 0.86)).toFixed(2)}
        ry={(radius * 1.12).toFixed(2)}
        transform={`rotate(${lightAngle.toFixed(2)} ${nightCenter.x.toFixed(2)} ${nightCenter.y.toFixed(2)})`}
      />
      <ellipse
        className="gloss"
        cx={glossCenter.x.toFixed(2)}
        cy={glossCenter.y.toFixed(2)}
        rx={(radius * 0.56).toFixed(2)}
        ry={(radius * 0.28).toFixed(2)}
        transform={`rotate(${lightAngle.toFixed(2)} ${glossCenter.x.toFixed(2)} ${glossCenter.y.toFixed(2)})`}
      />
      <ellipse
        className="rim"
        cx={rimCenter.x.toFixed(2)}
        cy={rimCenter.y.toFixed(2)}
        rx={(radius * 1.02).toFixed(2)}
        ry={(radius * 0.98).toFixed(2)}
        transform={`rotate(${lightAngle.toFixed(2)} ${rimCenter.x.toFixed(2)} ${rimCenter.y.toFixed(2)})`}
      />
    </g>
  )
}

function renderMoonTexture(point: ProjectedPoint, radius: number, lightAngle: number) {
  const highlightPoint = pointFrom(point.x, point.y, radius * 0.18, lightAngle)
  const shadowPoint = pointFrom(point.x, point.y, radius * 0.18, lightAngle + 180)
  const craterOne = pointFrom(point.x, point.y, radius * 0.18, lightAngle + 116)
  const craterTwo = pointFrom(point.x, point.y, radius * 0.22, lightAngle - 64)

  return (
    <g className="starmap-system-body-moon-detail">
      <ellipse
        className="moon-shadow"
        cx={shadowPoint.x.toFixed(2)}
        cy={shadowPoint.y.toFixed(2)}
        rx={(radius * 0.72).toFixed(2)}
        ry={(radius * 0.84).toFixed(2)}
        transform={`rotate(${lightAngle.toFixed(2)} ${shadowPoint.x.toFixed(2)} ${shadowPoint.y.toFixed(2)})`}
      />
      <ellipse
        className="moon-highlight"
        cx={highlightPoint.x.toFixed(2)}
        cy={highlightPoint.y.toFixed(2)}
        rx={(radius * 0.44).toFixed(2)}
        ry={(radius * 0.28).toFixed(2)}
        transform={`rotate(${lightAngle.toFixed(2)} ${highlightPoint.x.toFixed(2)} ${highlightPoint.y.toFixed(2)})`}
      />
      <circle className="moon-crater" cx={craterOne.x.toFixed(2)} cy={craterOne.y.toFixed(2)} r={(radius * 0.16).toFixed(2)} />
      <circle className="moon-crater small" cx={craterTwo.x.toFixed(2)} cy={craterTwo.y.toFixed(2)} r={(radius * 0.1).toFixed(2)} />
    </g>
  )
}

function normalizeCamera(variant: Props['variant'], camera: CameraState): CameraState {
  const config = CAMERA_CONFIG[variant]

  return {
    zoom: clamp(camera.zoom, config.minZoom, config.maxZoom),
    yaw: clamp(camera.yaw, -config.maxYaw, config.maxYaw),
    tilt: clamp(camera.tilt, -config.maxTilt, config.maxTilt),
  }
}

export function StarFocusOrbitalMap({
  variant,
  className,
  liveLabel,
  missionHistory,
  activeSession,
  activeSnapshot,
}: Props) {
  const config = CAMERA_CONFIG[variant]
  const gradientId = useId().replace(/:/g, '')
  const [camera, setCamera] = useState<CameraState>(() => ({ ...config.defaultCamera }))
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<DragState | null>(null)
  const visibleMissions = variant === 'sidebar'
    ? missionHistory.slice(0, SIDEBAR_MARKER_LIMIT)
    : missionHistory
  const visibleSystemBodies = SYSTEM_BODIES.filter(body => (
    variant === 'sidebar'
      ? body.id === 'earth' || body.id === 'saturn'
      : body.id !== 'mercury'
  ))
  const visibleAsteroids = variant === 'overlay'
    ? ASTEROID_BELT.filter((_, index) => index % 2 === 0)
    : []
  const labeledMissionIds = new Set(
    visibleMissions
      .slice(0, variant === 'sidebar' ? SIDEBAR_LABEL_LIMIT : OVERLAY_LABEL_LIMIT)
      .map(mission => mission.id),
  )
  const latestMission = missionHistory[0] ?? null
  const hasLiveFlight = Boolean(activeSession && activeSnapshot)
  const liveProgress = activeSnapshot?.progress ?? 0
  const fallbackPhaseTheme: OrbitalPhaseTheme = activeSnapshot?.phase ?? (missionHistory.length ? 'orbit' : 'idle')
  const phaseTheme = resolvePhaseTheme(className, fallbackPhaseTheme)
  const phaseClassName = `phase-${phaseTheme}`
  const phaseTuning = STARMAP_PHASE_TUNING[phaseTheme]
  const topHud = hasLiveFlight
    ? { label: 'Track', value: activeSnapshot?.isPaused ? 'Hold' : liveLabel }
    : latestMission
      ? { label: 'Latest', value: latestMission.vehicleCode }
      : { label: 'Grid', value: 'Standby' }
  const bottomHud = hasLiveFlight && activeSnapshot
    ? { label: 'T-Remain', value: formatClock(activeSnapshot.remainingMs) }
    : missionHistory.length
      ? { label: 'Archive', value: `${missionHistory.length} retained` }
      : { label: 'Archive', value: 'Empty' }
  const showMapChrome = variant === 'overlay'
  const tiltMode = camera.tilt > 8 ? 'above' : camera.tilt < -8 ? 'below' : 'level'
  const viewportStyle = {
    '--starmap-parallax-x': `${(camera.yaw / config.maxYaw) * -18}px`,
    '--starmap-parallax-y': `${(camera.tilt / config.maxTilt) * 16}px`,
    '--starmap-grid-rotate': `${camera.yaw * -0.08}deg`,
    '--starmap-body-aura-opacity-mult': String(phaseTuning.auraOpacity),
    '--starmap-shell-opacity-mult': String(phaseTuning.shellOpacity),
    '--starmap-shell-width-mult': String(phaseTuning.shellWidth),
    '--starmap-scatter-opacity-mult': String(phaseTuning.scatterOpacity),
    '--starmap-night-opacity-mult': String(phaseTuning.nightOpacity),
    '--starmap-gloss-opacity-mult': String(phaseTuning.glossOpacity),
    '--starmap-rim-opacity-mult': String(phaseTuning.rimOpacity),
    '--starmap-ring-opacity-mult': String(phaseTuning.ringOpacity),
    '--starmap-nebula-opacity': String(phaseTuning.nebulaOpacity),
    '--starmap-glow-opacity': String(phaseTuning.glowOpacity),
    '--starmap-sweep-opacity': String(phaseTuning.sweepOpacity),
    '--starmap-planet-atmosphere-stroke': phaseTuning.planetAtmosphereStroke,
    '--starmap-planet-inner-ring-stroke': phaseTuning.planetInnerRingStroke,
  } as CSSProperties
  const orbitGuides = MISSION_ORBIT_LANES.map((lane, index) => {
    const points = buildProjectedLoop(
      ORBIT_SAMPLE_COUNT,
      angleDegrees => orbitalOffset(lane.radius, angleDegrees, lane.inclination, lane.longitude),
      camera,
    )

    return {
      key: `${lane.radius}-${index}`,
      backPath: buildSegmentPath(points, 'back', true),
      frontPath: buildSegmentPath(points, 'front', true),
      outer: index === MISSION_ORBIT_LANES.length - 1,
    }
  })
  const guideTrajectoryPoints = buildTrajectoryPoints(1, 36, camera)
  const guideTrajectoryBackPath = buildSegmentPath(guideTrajectoryPoints, 'back', false)
  const guideTrajectoryFrontPath = buildSegmentPath(guideTrajectoryPoints, 'front', false)
  const sunProjection = projectPoint({ x: 0, y: 0, z: 0 }, camera)
  const sunRadius = 24 * sunProjection.scale
  const projectedBodies = visibleSystemBodies
    .map(body => {
      const worldPoint = orbitalOffset(
        body.orbitRadius,
        body.angle,
        body.orbitInclination,
        body.orbitLongitude,
      )
      const projected = projectPoint(worldPoint, camera)
      const screenRadius = body.radius * projected.scale
      const lightAngle = angleFromPoint(projected, sunProjection)
      const lightDistance = Math.max(Math.hypot(sunProjection.x - projected.x, sunProjection.y - projected.y), 1)
      const lightVector = {
        x: (sunProjection.x - projected.x) / lightDistance,
        y: (sunProjection.y - projected.y) / lightDistance,
      }
      const highlightPoint = pointFrom(projected.x, projected.y, screenRadius * 0.38, lightAngle)
      const shadowPoint = pointFrom(projected.x, projected.y, screenRadius * 0.24, lightAngle + 180)
      const moonPoint = body.moon
        ? projectPoint(
          addVectors(
            worldPoint,
            orbitalOffset(
              body.moon.distance,
              body.moon.angle,
              body.moon.inclination,
              body.moon.longitude,
            ),
          ),
          camera,
        )
        : null
      const ringPoints = body.ring
        ? buildProjectedLoop(
          54,
          angleDegrees => addVectors(
            worldPoint,
            ellipticalOffset(
              body.ring.radiusX,
              body.ring.radiusZ,
              angleDegrees,
              body.ring.inclination,
              body.ring.longitude,
            ),
          ),
          camera,
        )
        : null
      const ringBackPath = ringPoints ? buildSegmentPath(ringPoints, 'back', true) : ''
      const ringFrontPath = ringPoints ? buildSegmentPath(ringPoints, 'front', true) : ''
      const ringOcclusionPath = `${ringBackPath} ${ringFrontPath}`.trim()
      const moonLightAngle = moonPoint ? angleFromPoint(moonPoint, sunProjection) : lightAngle

      return {
        body,
        projected,
        screenRadius,
        lightAngle,
        lightVector,
        highlightPoint,
        shadowPoint,
        moonPoint,
        moonLightAngle,
        moonRadius: moonPoint && body.moon ? body.moon.radius * moonPoint.scale : 0,
        clipId: `${gradientId}-${body.id}-clip`,
        surfaceGradientId: `${gradientId}-${body.id}-surface`,
        detailFalloffGradientId: `${gradientId}-${body.id}-detail-falloff`,
        ringBackPath,
        ringFrontPath,
        ringOcclusionPath,
      }
    })
    .sort((left, right) => left.projected.depth - right.projected.depth)
  const projectedAsteroids = visibleAsteroids
    .map((asteroid, index) => ({
      key: `${asteroid.angle}-${index}`,
      asteroid,
      point: projectPoint(
        orbitalOffset(
          asteroid.radius,
          asteroid.angle,
          ASTEROID_BELT_INCLINATION,
          ASTEROID_BELT_LONGITUDE,
          asteroid.elevation,
        ),
        camera,
      ),
    }))
    .sort((left, right) => left.point.depth - right.point.depth)
  const projectedHistoryNodes = visibleMissions
    .map((mission, index) => {
      const marker = projectPoint(historyMarkerWorldPoint(mission.orbitIndex), camera)
      const offsetX = marker.x - MAP_CENTER_X
      const offsetY = marker.y - MAP_CENTER_Y
      const distance = Math.max(Math.hypot(offsetX, offsetY), 1)
      const directionX = offsetX / distance
      const directionY = offsetY / distance
      const labelDistance = variant === 'sidebar' ? 12 : 18
      const labelX = marker.x + (directionX * labelDistance)
      const labelY = marker.y + (directionY * labelDistance)
      const tagWidth = Math.max(44, (mission.vehicleCode.length * 7) + 18)
      const labelOnRight = directionX >= 0
      const markerOpacity = Math.max(0.34, 1 - (index * 0.09))
      const markerScale = clamp(marker.scale * 0.94, 0.72, 1.42)

      return {
        mission,
        index,
        marker,
        labelX,
        labelY,
        tagWidth,
        labelOnRight,
        markerOpacity,
        markerScale,
      }
    })
    .sort((left, right) => left.marker.depth - right.marker.depth)
  const liveTrailPoints = hasLiveFlight ? buildTrajectoryPoints(liveProgress, 20, camera) : []
  const liveTrailBackPath = hasLiveFlight ? buildSegmentPath(liveTrailPoints, 'back', false) : ''
  const liveTrailFrontPath = hasLiveFlight ? buildSegmentPath(liveTrailPoints, 'front', false) : ''
  const livePoint = liveTrailPoints.at(-1) ?? null
  const liveHeadingPoint = hasLiveFlight
    ? projectPoint(liveTrajectoryWorldPoint(clamp(liveProgress + 0.02, 0, 1)), camera)
    : null
  const liveHeading = livePoint && liveHeadingPoint
    ? (Math.atan2(liveHeadingPoint.y - livePoint.y, liveHeadingPoint.x - livePoint.x) * 180) / Math.PI
    : 0
  const craftScale = livePoint ? clamp(livePoint.scale * 0.9, 0.76, 1.74) : 1

  function updateCamera(nextCamera: CameraState | ((prev: CameraState) => CameraState)) {
    setCamera(prev => normalizeCamera(variant, typeof nextCamera === 'function' ? nextCamera(prev) : nextCamera))
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCamera: camera,
    }
    setIsDragging(true)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return

    const deltaX = event.clientX - dragRef.current.startX
    const deltaY = event.clientY - dragRef.current.startY

    updateCamera({
      ...dragRef.current.startCamera,
      yaw: dragRef.current.startCamera.yaw + (deltaX * config.dragYawFactor),
      tilt: dragRef.current.startCamera.tilt - (deltaY * config.dragTiltFactor),
    })
  }

  function finishDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    dragRef.current = null
    setIsDragging(false)
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault()

    const zoomDelta = event.deltaY < 0 ? config.zoomStep : -config.zoomStep
    updateCamera(prev => ({ ...prev, zoom: prev.zoom + zoomDelta }))
  }

  function handleZoom(delta: number) {
    updateCamera(prev => ({ ...prev, zoom: prev.zoom + delta }))
  }

  function handleTilt(tilt: number) {
    updateCamera(prev => ({ ...prev, tilt }))
  }

  function resetCamera() {
    setCamera({ ...config.defaultCamera })
  }

  return (
    <div
      className={`starmap-viewport variant-${variant} ${className ?? ''} ${phaseClassName} ${hasLiveFlight ? 'is-live' : ''} ${isDragging ? 'dragging' : ''}`}
      style={viewportStyle}
    >
      <div
        className="starmap-scene-frame"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onWheel={handleWheel}
        onDoubleClick={resetCamera}
        title="Drag to orbit camera. Scroll to zoom."
      >
        <div className="starmap-scene">
          <div className="starmap-grid" />
          <div className="starmap-nebula" />
          <div className="starmap-sweep" />
          <div className="starmap-glow" />
          <div className="starmap-phase-wash" />
          <div className="starmap-vignette" />

          <svg
            className="starmap-svg"
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            aria-hidden="true"
            role="presentation"
          >
            <defs>
              <radialGradient id={`${gradientId}-planet`} cx="34%" cy="28%">
                <stop offset="0%" stopColor="#fff2b6" />
                <stop offset="38%" stopColor="#ffca61" />
                <stop offset="74%" stopColor="#9e5920" />
                <stop offset="100%" stopColor="#1c1008" />
              </radialGradient>
              <radialGradient id={`${gradientId}-glow`} cx="50%" cy="50%">
                <stop offset="0%" stopColor="#ffd375" stopOpacity="0.46" />
                <stop offset="100%" stopColor="#ffd375" stopOpacity="0" />
              </radialGradient>
              {projectedBodies.flatMap(({ body, lightVector, surfaceGradientId, detailFalloffGradientId }) => [
                <radialGradient
                  key={surfaceGradientId}
                  id={surfaceGradientId}
                  cx={`${(50 + (lightVector.x * 18)).toFixed(2)}%`}
                  cy={`${(50 + (lightVector.y * 18)).toFixed(2)}%`}
                >
                  <stop offset="0%" stopColor={body.colors.highlight} />
                  <stop offset="22%" stopColor={body.colors.highlight} stopOpacity="0.98" />
                  <stop offset="52%" stopColor={body.colors.mid} />
                  <stop offset="82%" stopColor={body.colors.base} />
                  <stop offset="100%" stopColor={body.colors.base} stopOpacity="0.96" />
                </radialGradient>,
                <radialGradient
                  key={detailFalloffGradientId}
                  id={detailFalloffGradientId}
                  cx="50%"
                  cy="50%"
                  r="50%"
                >
                  <stop offset="48%" stopColor="#060302" stopOpacity="0" />
                  <stop
                    offset="76%"
                    stopColor={body.id === 'earth' ? '#03141f' : body.id === 'venus' ? '#1a0f08' : body.id === 'saturn' ? '#130b06' : '#120806'}
                    stopOpacity={body.id === 'earth' ? '0.08' : body.id === 'venus' ? '0.12' : body.id === 'saturn' ? '0.14' : '0.1'}
                  />
                  <stop
                    offset="100%"
                    stopColor={body.id === 'earth' ? '#01070b' : body.id === 'venus' ? '#060302' : body.id === 'saturn' ? '#040201' : '#050201'}
                    stopOpacity={body.id === 'earth' ? '0.34' : body.id === 'venus' ? '0.42' : body.id === 'saturn' ? '0.44' : '0.38'}
                  />
                </radialGradient>,
              ])}
              {projectedBodies.map(({ body, projected, screenRadius }) => (
                <clipPath key={`${body.id}-clip`} id={`${gradientId}-${body.id}-clip`}>
                  <circle cx={projected.x} cy={projected.y} r={screenRadius} />
                </clipPath>
              ))}
            </defs>

            <g className="starmap-stars">
              {STAR_FIELD.map((star, index) => (
                <circle
                  key={`${star.x}-${star.y}-${index}`}
                  cx={star.x}
                  cy={star.y}
                  r={star.r}
                  opacity={star.opacity}
                />
              ))}
            </g>

            <g className="starmap-guides">
              <line className="starmap-axis starmap-axis-diagonal" x1="-20" y1="178" x2="380" y2="54" />
              <line className="starmap-axis starmap-axis-vertical" x1="284" y1="-10" x2="246" y2="252" />
              {orbitGuides.map(guide => (
                <g key={guide.key}>
                  <path className={`starmap-orbit-lane back ${guide.outer ? 'outer' : ''}`} d={guide.backPath} />
                  <path className={`starmap-orbit-lane front ${guide.outer ? 'outer' : ''}`} d={guide.frontPath} />
                </g>
              ))}
              <path className="starmap-transfer-lane back" d={guideTrajectoryBackPath} />
              <path className="starmap-transfer-lane front" d={guideTrajectoryFrontPath} />
            </g>

            <g className="starmap-planet">
              <circle className="starmap-planet-aura" cx={MAP_CENTER_X} cy={MAP_CENTER_Y} r={(64 * sunProjection.scale).toFixed(2)} fill={`url(#${gradientId}-glow)`} />
              <circle className="starmap-planet-disc" cx={MAP_CENTER_X} cy={MAP_CENTER_Y} r={sunRadius.toFixed(2)} fill={`url(#${gradientId}-planet)`} />
              <ellipse className="starmap-planet-shadow" cx={(MAP_CENTER_X - (sunRadius * 0.22)).toFixed(2)} cy={(MAP_CENTER_Y + (sunRadius * 0.16)).toFixed(2)} rx={(sunRadius * 0.75).toFixed(2)} ry={(sunRadius * 0.96).toFixed(2)} />
              <circle className="starmap-planet-atmosphere" cx={MAP_CENTER_X} cy={MAP_CENTER_Y} r={(30 * sunProjection.scale).toFixed(2)} />
              <circle className="starmap-planet-inner-ring" cx={MAP_CENTER_X} cy={MAP_CENTER_Y} r={(44 * sunProjection.scale).toFixed(2)} />
            </g>

            <g className="starmap-asteroid-belt">
              {projectedAsteroids.map(({ key, asteroid, point }) => (
                <circle
                  key={key}
                  cx={point.x}
                  cy={point.y}
                  r={(asteroid.size * clamp(point.scale * 0.92, 0.72, 1.32)).toFixed(2)}
                  opacity={asteroid.opacity}
                />
              ))}
            </g>

            <g className="starmap-system-bodies">
              {projectedBodies.map(({ body, projected, screenRadius, lightAngle, highlightPoint, shadowPoint, moonPoint, moonLightAngle, moonRadius, surfaceGradientId, detailFalloffGradientId, ringBackPath, ringFrontPath, ringOcclusionPath, clipId }) => (
                <g key={body.id} className={`starmap-system-body ${body.id}`}>
                  <title>{body.id}</title>
                  <circle
                    className="starmap-system-body-aura"
                    cx={projected.x}
                    cy={projected.y}
                    r={screenRadius * 2.3}
                    style={{ fill: body.glow }}
                  />
                  {renderBodyShell(body, projected, screenRadius)}

                  {body.ring && (
                    <>
                      <path className="starmap-system-body-ring back glow" d={ringBackPath} />
                      <path className="starmap-system-body-ring back halo" d={ringBackPath} />
                      <path className="starmap-system-body-ring back dust" d={ringBackPath} />
                      <path className="starmap-system-body-ring back grains" d={ringBackPath} />
                      <path className="starmap-system-body-ring back" d={ringBackPath} style={{ stroke: body.ring.stroke }} />
                    </>
                  )}

                  <circle
                    className="starmap-system-body-disc"
                    cx={projected.x}
                    cy={projected.y}
                    r={screenRadius}
                    fill={`url(#${surfaceGradientId})`}
                  />
                  {renderBodyTexture(body, projected, screenRadius, clipId, phaseTuning)}
                  {renderBodyLighting(body, projected, screenRadius, clipId, lightAngle, detailFalloffGradientId, ringOcclusionPath)}
                  <ellipse
                    className="starmap-system-body-shadow"
                    cx={shadowPoint.x}
                    cy={shadowPoint.y}
                    rx={screenRadius * 0.76}
                    ry={screenRadius * 0.96}
                  />
                  <ellipse
                    className="starmap-system-body-highlight"
                    cx={highlightPoint.x}
                    cy={highlightPoint.y}
                    rx={screenRadius * 0.32}
                    ry={screenRadius * 0.22}
                  />

                  {body.ring && (
                    <>
                      <path className="starmap-system-body-ring front halo" d={ringFrontPath} />
                      <path className="starmap-system-body-ring front dust" d={ringFrontPath} />
                      <path className="starmap-system-body-ring front grains" d={ringFrontPath} />
                      <path className="starmap-system-body-ring front" d={ringFrontPath} style={{ stroke: body.ring.stroke }} />
                      <path className="starmap-system-body-ring front core" d={ringFrontPath} />
                    </>
                  )}

                  {moonPoint && body.moon && (
                    <>
                      <path
                        className="starmap-system-body-moon-link"
                        d={`M ${projected.x.toFixed(2)} ${projected.y.toFixed(2)} L ${moonPoint.x.toFixed(2)} ${moonPoint.y.toFixed(2)}`}
                      />
                      <circle
                        className="starmap-system-body-moon"
                        cx={moonPoint.x}
                        cy={moonPoint.y}
                        r={moonRadius.toFixed(2)}
                        style={{ fill: body.moon.color }}
                      />
                      {renderMoonTexture(moonPoint, moonRadius, moonLightAngle)}
                    </>
                  )}
                </g>
              ))}
            </g>

            <g className="starmap-history">
              {projectedHistoryNodes.map(({ mission, index, marker, labelX, labelY, tagWidth, labelOnRight, markerOpacity, markerScale }) => (
                <g
                  key={mission.id}
                  className={`starmap-history-node ${index === 0 ? 'recent' : ''}`}
                  style={{ opacity: markerOpacity }}
                >
                  <title>{`${mission.vehicleCode} • ${mission.orbitLabel}`}</title>
                  <circle className="starmap-history-halo" cx={marker.x} cy={marker.y} r={(index === 0 ? 11 : 9) * markerScale} />
                  <circle className="starmap-history-core" cx={marker.x} cy={marker.y} r={(index === 0 ? 4.5 : 3.8) * markerScale} />
                  <circle className="starmap-history-center" cx={marker.x} cy={marker.y} r={1.6 * clamp(markerScale, 0.84, 1.18)} />

                  {labeledMissionIds.has(mission.id) && (
                    <g className="starmap-history-tag">
                      <path
                        className="starmap-history-tag-line"
                        d={`M ${marker.x.toFixed(2)} ${marker.y.toFixed(2)} L ${labelX.toFixed(2)} ${labelY.toFixed(2)}`}
                      />
                      <rect
                        x={(labelOnRight ? labelX + 6 : labelX - tagWidth - 6).toFixed(2)}
                        y={(labelY - 11).toFixed(2)}
                        width={tagWidth}
                        height="18"
                        rx="9"
                      />
                      <text
                        x={(labelOnRight ? labelX + 14 : labelX - 14).toFixed(2)}
                        y={(labelY + 1).toFixed(2)}
                        textAnchor={labelOnRight ? 'start' : 'end'}
                      >
                        {mission.vehicleCode}
                      </text>
                    </g>
                  )}
                </g>
              ))}
            </g>

            {hasLiveFlight && livePoint && activeSnapshot && (
              <>
                <path
                  className={`starmap-live-trail back ${activeSnapshot.isPaused ? 'paused' : ''}`}
                  d={liveTrailBackPath}
                />
                <path
                  className={`starmap-live-trail front ${activeSnapshot.isPaused ? 'paused' : ''}`}
                  d={liveTrailFrontPath}
                />
                <g
                  className={`starmap-craft ${activeSnapshot.isPaused ? 'paused' : ''}`}
                  transform={`translate(${livePoint.x.toFixed(2)} ${livePoint.y.toFixed(2)}) rotate(${liveHeading.toFixed(2)}) scale(${craftScale.toFixed(3)})`}
                >
                  <title>{activeSession?.taskText ?? liveLabel}</title>
                  <circle className="starmap-craft-halo" r="11" />
                  <path className="starmap-craft-vector" d="M 10 0 L 24 0" />
                  {!activeSnapshot.isPaused && <path className="starmap-craft-flame" d="M -8 -3.6 L -19 0 L -8 3.6 Z" />}
                  <path className="starmap-craft-body" d="M 8 0 L -2 -7 L -7 -4.5 L -9 0 L -7 4.5 L -2 7 Z" />
                  <path className="starmap-craft-core" d="M 4 0 L -1 -3.3 L -3 -2 L -4 0 L -3 2 L -1 3.3 Z" />
                </g>
              </>
            )}
          </svg>
        </div>
      </div>

      {showMapChrome && (
        <div className="starmap-controls">
          <div className="starmap-control-row">
            <button className="starmap-control-btn" onClick={() => handleZoom(-config.zoomStep)} title="Zoom out">-</button>
            <span className="starmap-control-readout">{camera.zoom.toFixed(1)}x</span>
            <button className="starmap-control-btn" onClick={() => handleZoom(config.zoomStep)} title="Zoom in">+</button>
          </div>
          <div className="starmap-control-row">
            <button
              className={`starmap-control-btn ${tiltMode === 'above' ? 'active' : ''}`}
              onClick={() => handleTilt(28)}
              title="View from above"
            >
              Above
            </button>
            <button
              className={`starmap-control-btn ${tiltMode === 'level' ? 'active' : ''}`}
              onClick={() => handleTilt(0)}
              title="Level view"
            >
              Level
            </button>
            <button
              className={`starmap-control-btn ${tiltMode === 'below' ? 'active' : ''}`}
              onClick={() => handleTilt(-24)}
              title="View from below"
            >
              Below
            </button>
            <button className="starmap-control-btn" onClick={resetCamera} title="Reset camera">Reset</button>
          </div>
        </div>
      )}

      {showMapChrome && (
        <>
          <div className="starmap-hud top-left">
            <span>{topHud.label}</span>
            <strong>{topHud.value}</strong>
          </div>

          <div className="starmap-hud bottom-right">
            <span>{bottomHud.label}</span>
            <strong>{bottomHud.value}</strong>
          </div>
        </>
      )}
    </div>
  )
}
