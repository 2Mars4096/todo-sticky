import { useId, useRef, useState } from 'react'
import type { StarFocusMissionRecord, StarFocusSession } from '../types'
import type { StarFocusSnapshot } from '../hooks/useStarFocus'

interface Props {
  variant: 'sidebar' | 'overlay'
  className?: string
  liveLabel: string
  missionHistory: StarFocusMissionRecord[]
  activeSession: StarFocusSession | null
  activeSnapshot: StarFocusSnapshot | null
}

const MAP_WIDTH = 360
const MAP_HEIGHT = 240
const MAP_CENTER_X = 132
const MAP_CENTER_Y = 126
const MAP_ROTATION_DEGREES = -18
const ORBIT_RADII = [44, 74, 108, 144] as const
const SIDEBAR_MARKER_LIMIT = 6
const SIDEBAR_LABEL_LIMIT = 0
const OVERLAY_LABEL_LIMIT = 2
const CAMERA_CONFIG = {
  sidebar: {
    defaultCamera: { panX: 0, panY: 0, zoom: 1, tilt: 10 },
    minZoom: 0.9,
    maxZoom: 1.9,
    maxPanX: 76,
    maxPanY: 56,
    maxTilt: 34,
    zoomStep: 0.12,
  },
  overlay: {
    defaultCamera: { panX: 0, panY: 0, zoom: 1.04, tilt: 12 },
    minZoom: 0.78,
    maxZoom: 2.5,
    maxPanX: 164,
    maxPanY: 122,
    maxTilt: 40,
    zoomStep: 0.16,
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
  { radius: 132, angle: 6, size: 1.1, opacity: 0.34 },
  { radius: 134, angle: 18, size: 1, opacity: 0.26 },
  { radius: 136, angle: 31, size: 1.3, opacity: 0.4 },
  { radius: 138, angle: 48, size: 0.9, opacity: 0.22 },
  { radius: 131, angle: 63, size: 1.2, opacity: 0.3 },
  { radius: 133, angle: 79, size: 1, opacity: 0.24 },
  { radius: 135, angle: 94, size: 1.1, opacity: 0.32 },
  { radius: 137, angle: 111, size: 1.3, opacity: 0.38 },
  { radius: 132, angle: 128, size: 1, opacity: 0.24 },
  { radius: 134, angle: 144, size: 1.1, opacity: 0.28 },
  { radius: 136, angle: 162, size: 1.2, opacity: 0.34 },
  { radius: 138, angle: 177, size: 0.9, opacity: 0.24 },
  { radius: 131, angle: 193, size: 1.3, opacity: 0.36 },
  { radius: 133, angle: 207, size: 1, opacity: 0.28 },
  { radius: 135, angle: 221, size: 1.1, opacity: 0.32 },
  { radius: 137, angle: 237, size: 0.9, opacity: 0.22 },
  { radius: 132, angle: 252, size: 1.2, opacity: 0.34 },
  { radius: 134, angle: 268, size: 1, opacity: 0.24 },
  { radius: 136, angle: 283, size: 1.1, opacity: 0.32 },
  { radius: 138, angle: 299, size: 1.2, opacity: 0.38 },
  { radius: 131, angle: 316, size: 1, opacity: 0.26 },
]
const SYSTEM_BODIES = [
  {
    id: 'mercury',
    orbitRadius: 58,
    angle: 232,
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
      color: '#ebe3ce',
    },
  },
  {
    id: 'mars',
    orbitRadius: 154,
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
    angle: 42,
    radius: 13.4,
    glow: 'rgba(255, 208, 133, 0.18)',
    colors: {
      highlight: '#ffe8ba',
      mid: '#caa061',
      base: '#6d4a28',
    },
    ring: {
      rx: 23,
      ry: 7.8,
      rotate: -18,
      stroke: 'rgba(255, 227, 170, 0.46)',
    },
  },
] as const

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function formatClock(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function orbitPoint(radius: number, angleDegrees: number) {
  const angle = (angleDegrees * Math.PI) / 180
  const rotation = (MAP_ROTATION_DEGREES * Math.PI) / 180
  const rx = radius * 1.22
  const ry = radius * 0.72

  return {
    x: MAP_CENTER_X + (Math.cos(rotation) * rx * Math.cos(angle)) - (Math.sin(rotation) * ry * Math.sin(angle)),
    y: MAP_CENTER_Y + (Math.sin(rotation) * rx * Math.cos(angle)) + (Math.cos(rotation) * ry * Math.sin(angle)),
  }
}

function pointFrom(originX: number, originY: number, distance: number, angleDegrees: number) {
  const angle = (angleDegrees * Math.PI) / 180
  return {
    x: originX + (Math.cos(angle) * distance),
    y: originY + (Math.sin(angle) * distance),
  }
}

function renderBodyTexture(
  body: (typeof SYSTEM_BODIES)[number],
  point: { x: number; y: number },
  clipId: string,
) {
  if (body.id === 'earth') {
    return (
      <g className="starmap-system-body-detail earth" clipPath={`url(#${clipId})`}>
        <path
          className="continent"
          d={`M ${(point.x - 5.6).toFixed(2)} ${(point.y - 2.1).toFixed(2)} C ${(point.x - 2.6).toFixed(2)} ${(point.y - 7.2).toFixed(2)} ${(point.x + 2.4).toFixed(2)} ${(point.y - 4.8).toFixed(2)} ${(point.x + 0.4).toFixed(2)} ${(point.y - 0.4).toFixed(2)} C ${(point.x + 2.8).toFixed(2)} ${(point.y + 1.3).toFixed(2)} ${(point.x + 0.8).toFixed(2)} ${(point.y + 5.6).toFixed(2)} ${(point.x - 3.8).toFixed(2)} ${(point.y + 3.1).toFixed(2)} C ${(point.x - 6.2).toFixed(2)} ${(point.y + 1.4).toFixed(2)} ${(point.x - 6.8).toFixed(2)} ${(point.y - 0.2).toFixed(2)} ${(point.x - 5.6).toFixed(2)} ${(point.y - 2.1).toFixed(2)} Z`}
        />
        <path
          className="continent"
          d={`M ${(point.x + 2.6).toFixed(2)} ${(point.y - 3.8).toFixed(2)} C ${(point.x + 5.4).toFixed(2)} ${(point.y - 4.4).toFixed(2)} ${(point.x + 6.8).toFixed(2)} ${(point.y - 2.6).toFixed(2)} ${(point.x + 5.8).toFixed(2)} ${(point.y - 0.2).toFixed(2)} C ${(point.x + 7.4).toFixed(2)} ${(point.y + 1.6).toFixed(2)} ${(point.x + 6.1).toFixed(2)} ${(point.y + 4.6).toFixed(2)} ${(point.x + 2.8).toFixed(2)} ${(point.y + 3.7).toFixed(2)} C ${(point.x + 1.4).toFixed(2)} ${(point.y + 2.3).toFixed(2)} ${(point.x + 1.2).toFixed(2)} ${(point.y - 2.1).toFixed(2)} ${(point.x + 2.6).toFixed(2)} ${(point.y - 3.8).toFixed(2)} Z`}
        />
        <ellipse className="cloud" cx={(point.x - 1.2).toFixed(2)} cy={(point.y - 5.2).toFixed(2)} rx="5.6" ry="1.8" />
        <ellipse className="cloud" cx={(point.x + 2.6).toFixed(2)} cy={(point.y + 2.8).toFixed(2)} rx="6.2" ry="1.5" />
      </g>
    )
  }

  if (body.id === 'venus') {
    return (
      <g className="starmap-system-body-detail venus" clipPath={`url(#${clipId})`}>
        <ellipse className="band" cx={point.x} cy={(point.y - 3.2).toFixed(2)} rx={(body.radius * 1.06).toFixed(2)} ry="1.8" />
        <ellipse className="band" cx={(point.x - 0.6).toFixed(2)} cy={point.y} rx={(body.radius * 1.14).toFixed(2)} ry="1.9" />
        <ellipse className="band" cx={(point.x + 0.4).toFixed(2)} cy={(point.y + 3.5).toFixed(2)} rx={(body.radius * 0.96).toFixed(2)} ry="1.6" />
      </g>
    )
  }

  if (body.id === 'mars') {
    return (
      <g className="starmap-system-body-detail mars" clipPath={`url(#${clipId})`}>
        <path
          className="terrain"
          d={`M ${(point.x - 6.1).toFixed(2)} ${(point.y + 0.4).toFixed(2)} C ${(point.x - 3.2).toFixed(2)} ${(point.y - 2.4).toFixed(2)} ${(point.x + 0.8).toFixed(2)} ${(point.y - 2.2).toFixed(2)} ${(point.x + 4.1).toFixed(2)} ${(point.y - 0.1).toFixed(2)} C ${(point.x + 1.8).toFixed(2)} ${(point.y + 1.8).toFixed(2)} ${(point.x - 1.9).toFixed(2)} ${(point.y + 2.8).toFixed(2)} ${(point.x - 6.1).toFixed(2)} ${(point.y + 0.4).toFixed(2)} Z`}
        />
        <circle className="crater" cx={(point.x + 2.3).toFixed(2)} cy={(point.y - 3.4).toFixed(2)} r="1.15" />
        <circle className="crater" cx={(point.x - 3.6).toFixed(2)} cy={(point.y + 3.2).toFixed(2)} r="0.95" />
      </g>
    )
  }

  if (body.id === 'saturn') {
    return (
      <g className="starmap-system-body-detail saturn" clipPath={`url(#${clipId})`}>
        <ellipse className="band" cx={point.x} cy={(point.y - 5.8).toFixed(2)} rx={(body.radius * 0.98).toFixed(2)} ry="2.1" />
        <ellipse className="band" cx={(point.x - 0.4).toFixed(2)} cy={(point.y - 1.1).toFixed(2)} rx={(body.radius * 1.06).toFixed(2)} ry="2.2" />
        <ellipse className="band deep" cx={(point.x + 0.5).toFixed(2)} cy={(point.y + 3.9).toFixed(2)} rx={(body.radius * 1.12).toFixed(2)} ry="2.4" />
      </g>
    )
  }

  return null
}

function historyMarkerPosition(orbitIndex: number) {
  const lane = ORBIT_RADII[orbitIndex % ORBIT_RADII.length] ?? ORBIT_RADII[0]
  const angle = 18 + ((orbitIndex * 47) % 320)
  return orbitPoint(lane, angle)
}

function liveTrajectoryPosition(progress: number) {
  const normalized = clamp(progress, 0, 1)

  if (normalized < 0.72) {
    const stageProgress = normalized / 0.72
    return orbitPoint(22 + (stageProgress * 118), 164 - (stageProgress * 186))
  }

  const orbitProgress = (normalized - 0.72) / 0.28
  return orbitPoint(140, -22 - (orbitProgress * 84))
}

function buildTrajectoryPath(progress: number, steps: number) {
  const normalized = clamp(progress, 0, 1)

  return Array.from({ length: steps + 1 }, (_, index) => {
    const point = liveTrajectoryPosition((normalized * index) / steps)
    return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
  }).join(' ')
}

const FULL_TRAJECTORY_PATH = buildTrajectoryPath(1, 28)

interface CameraState {
  panX: number
  panY: number
  zoom: number
  tilt: number
}

interface DragState {
  pointerId: number
  startX: number
  startY: number
  startCamera: CameraState
}

function normalizeCamera(variant: Props['variant'], camera: CameraState): CameraState {
  const config = CAMERA_CONFIG[variant]
  const zoom = clamp(camera.zoom, config.minZoom, config.maxZoom)
  const panScale = 0.68 + (zoom * 0.52)

  return {
    panX: clamp(camera.panX, -config.maxPanX * panScale, config.maxPanX * panScale),
    panY: clamp(camera.panY, -config.maxPanY * panScale, config.maxPanY * panScale),
    zoom,
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
  const livePoint = hasLiveFlight ? liveTrajectoryPosition(liveProgress) : null
  const liveHeadingPoint = hasLiveFlight
    ? liveTrajectoryPosition(clamp(liveProgress + 0.02, 0, 1))
    : null
  const liveHeading = livePoint && liveHeadingPoint
    ? (Math.atan2(liveHeadingPoint.y - livePoint.y, liveHeadingPoint.x - livePoint.x) * 180) / Math.PI
    : 0
  const liveTrailPath = hasLiveFlight ? buildTrajectoryPath(liveProgress, 20) : ''
  const topHud = hasLiveFlight
    ? { label: 'Track', value: activeSnapshot.isPaused ? 'Hold' : liveLabel }
    : latestMission
      ? { label: 'Latest', value: latestMission.vehicleCode }
      : { label: 'Grid', value: 'Standby' }
  const bottomHud = hasLiveFlight
    ? { label: 'T-Remain', value: formatClock(activeSnapshot.remainingMs) }
    : missionHistory.length
      ? { label: 'Archive', value: `${missionHistory.length} retained` }
      : { label: 'Archive', value: 'Empty' }
  const showMapChrome = variant === 'overlay'
  const tiltMode = camera.tilt > 6 ? 'above' : camera.tilt < -6 ? 'below' : 'level'
  const sceneStyle = {
    transform: `translate3d(${camera.panX}px, ${camera.panY}px, 0) scale(${camera.zoom}) rotateX(${camera.tilt}deg)`,
  }

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
      panX: dragRef.current.startCamera.panX + deltaX,
      panY: dragRef.current.startCamera.panY + deltaY,
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
    <div className={`starmap-viewport variant-${variant} ${className ?? ''} ${hasLiveFlight ? 'is-live' : ''} ${isDragging ? 'dragging' : ''}`}>
      <div
        className="starmap-scene-frame"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onWheel={handleWheel}
        onDoubleClick={resetCamera}
        title="Drag to pan. Scroll to zoom."
      >
        <div className="starmap-scene" style={sceneStyle}>
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
              {SYSTEM_BODIES.map(body => (
                <radialGradient key={body.id} id={`${gradientId}-${body.id}`} cx="34%" cy="28%">
                  <stop offset="0%" stopColor={body.colors.highlight} />
                  <stop offset="48%" stopColor={body.colors.mid} />
                  <stop offset="100%" stopColor={body.colors.base} />
                </radialGradient>
              ))}
              {visibleSystemBodies.map(body => {
                const point = orbitPoint(body.orbitRadius, body.angle)
                return (
                  <clipPath key={`${body.id}-clip`} id={`${gradientId}-${body.id}-clip`}>
                    <circle cx={point.x} cy={point.y} r={body.radius} />
                  </clipPath>
                )
              })}
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
              {ORBIT_RADII.map((radius, index) => (
                <ellipse
                  key={radius}
                  className={`starmap-orbit-lane ${index === ORBIT_RADII.length - 1 ? 'outer' : ''}`}
                  cx={MAP_CENTER_X}
                  cy={MAP_CENTER_Y}
                  rx={radius * 1.22}
                  ry={radius * 0.72}
                  transform={`rotate(${MAP_ROTATION_DEGREES} ${MAP_CENTER_X} ${MAP_CENTER_Y})`}
                />
              ))}
              <path className="starmap-transfer-lane" d={FULL_TRAJECTORY_PATH} />
            </g>

            <g className="starmap-planet">
              <circle className="starmap-planet-aura" cx={MAP_CENTER_X} cy={MAP_CENTER_Y} r="64" fill={`url(#${gradientId}-glow)`} />
              <circle className="starmap-planet-disc" cx={MAP_CENTER_X} cy={MAP_CENTER_Y} r="24" fill={`url(#${gradientId}-planet)`} />
              <ellipse className="starmap-planet-shadow" cx={MAP_CENTER_X - 5} cy={MAP_CENTER_Y + 4} rx="18" ry="23" />
              <circle className="starmap-planet-atmosphere" cx={MAP_CENTER_X} cy={MAP_CENTER_Y} r="30" />
              <circle className="starmap-planet-inner-ring" cx={MAP_CENTER_X} cy={MAP_CENTER_Y} r="44" />
            </g>

            <g className="starmap-asteroid-belt">
              {visibleAsteroids.map((asteroid, index) => {
                const point = orbitPoint(asteroid.radius, asteroid.angle)
                return (
                  <circle
                    key={`${asteroid.angle}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={asteroid.size}
                    opacity={asteroid.opacity}
                  />
                )
              })}
            </g>

            <g className="starmap-system-bodies">
              {visibleSystemBodies.map(body => {
                const point = orbitPoint(body.orbitRadius, body.angle)
                const highlightPoint = pointFrom(point.x, point.y, body.radius * 0.38, 220)
                const shadowPoint = pointFrom(point.x, point.y, body.radius * 0.24, 28)
                const moonPoint = body.moon
                  ? pointFrom(point.x, point.y, body.moon.distance, body.moon.angle)
                  : null
                const clipId = `${gradientId}-${body.id}-clip`

                return (
                  <g key={body.id} className={`starmap-system-body ${body.id}`}>
                    <title>{body.id}</title>
                    <circle
                      className="starmap-system-body-aura"
                      cx={point.x}
                      cy={point.y}
                      r={body.radius * 2.3}
                      style={{ fill: body.glow }}
                    />

                    {body.ring && (
                      <>
                        <ellipse
                          className="starmap-system-body-ring back"
                          cx={point.x}
                          cy={point.y}
                          rx={body.ring.rx}
                          ry={body.ring.ry}
                          transform={`rotate(${body.ring.rotate} ${point.x} ${point.y})`}
                          style={{ stroke: body.ring.stroke }}
                        />
                      </>
                    )}

                    <circle
                      className="starmap-system-body-disc"
                      cx={point.x}
                      cy={point.y}
                      r={body.radius}
                      fill={`url(#${gradientId}-${body.id})`}
                    />
                    {renderBodyTexture(body, point, clipId)}
                    <ellipse
                      className="starmap-system-body-shadow"
                      cx={shadowPoint.x}
                      cy={shadowPoint.y}
                      rx={body.radius * 0.76}
                      ry={body.radius * 0.96}
                    />
                    <ellipse
                      className="starmap-system-body-highlight"
                      cx={highlightPoint.x}
                      cy={highlightPoint.y}
                      rx={body.radius * 0.32}
                      ry={body.radius * 0.22}
                    />

                    {body.ring && (
                      <ellipse
                        className="starmap-system-body-ring front"
                        cx={point.x}
                        cy={point.y}
                        rx={body.ring.rx}
                        ry={body.ring.ry}
                        transform={`rotate(${body.ring.rotate} ${point.x} ${point.y})`}
                        style={{ stroke: body.ring.stroke }}
                      />
                    )}

                    {moonPoint && body.moon && (
                      <>
                        <path
                          className="starmap-system-body-moon-link"
                          d={`M ${point.x.toFixed(2)} ${point.y.toFixed(2)} L ${moonPoint.x.toFixed(2)} ${moonPoint.y.toFixed(2)}`}
                        />
                        <circle
                          className="starmap-system-body-moon"
                          cx={moonPoint.x}
                          cy={moonPoint.y}
                          r={body.moon.radius}
                          style={{ fill: body.moon.color }}
                        />
                      </>
                    )}
                  </g>
                )
              })}
            </g>

            <g className="starmap-history">
              {visibleMissions.map((mission, index) => {
                const marker = historyMarkerPosition(mission.orbitIndex)
                const offsetX = marker.x - MAP_CENTER_X
                const offsetY = marker.y - MAP_CENTER_Y
                const distance = Math.max(Math.hypot(offsetX, offsetY), 1)
                const directionX = offsetX / distance
                const directionY = offsetY / distance
                const labelX = marker.x + (directionX * (variant === 'sidebar' ? 12 : 18))
                const labelY = marker.y + (directionY * (variant === 'sidebar' ? 12 : 18))
                const tagWidth = Math.max(44, (mission.vehicleCode.length * 7) + 18)
                const labelOnRight = directionX >= 0
                const markerOpacity = Math.max(0.34, 1 - (index * 0.09))

                return (
                  <g
                    key={mission.id}
                    className={`starmap-history-node ${index === 0 ? 'recent' : ''}`}
                    style={{ opacity: markerOpacity }}
                  >
                    <title>{`${mission.vehicleCode} • ${mission.orbitLabel}`}</title>
                    <circle className="starmap-history-halo" cx={marker.x} cy={marker.y} r={index === 0 ? 11 : 9} />
                    <circle className="starmap-history-core" cx={marker.x} cy={marker.y} r={index === 0 ? 4.5 : 3.8} />
                    <circle className="starmap-history-center" cx={marker.x} cy={marker.y} r="1.6" />

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
                )
              })}
            </g>

            {hasLiveFlight && livePoint && activeSnapshot && (
              <>
                <path
                  className={`starmap-live-trail ${activeSnapshot.isPaused ? 'paused' : ''}`}
                  d={liveTrailPath}
                />
                <g
                  className={`starmap-craft ${activeSnapshot.isPaused ? 'paused' : ''}`}
                  transform={`translate(${livePoint.x.toFixed(2)} ${livePoint.y.toFixed(2)}) rotate(${liveHeading.toFixed(2)})`}
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
              onClick={() => handleTilt(24)}
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
