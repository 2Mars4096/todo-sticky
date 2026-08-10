import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react'
import * as THREE from 'three'
import type { StarFocusMissionRecord, StarFocusPhase, StarFocusSession } from '../types'
import type { StarFocusSnapshot } from '../hooks/useStarFocus'

interface Props {
  className?: string
  liveLabel: string
  destinationLabel?: string
  missionHistory: StarFocusMissionRecord[]
  activeSession: StarFocusSession | null
  activeSnapshot: StarFocusSnapshot | null
}

interface CameraState {
  distance: number
  yaw: number
  tilt: number
}

interface DragState {
  pointerId: number
  startX: number
  startY: number
  startCamera: CameraState
}

type BodyId = 'mercury' | 'venus' | 'earth' | 'mars' | 'saturn'

interface BodyDefinition {
  id: BodyId
  radius: number
  orbitRadius: number
  orbitInclination: number
  orbitLongitude: number
  baseAngle: number
  orbitSpeed: number
  spinSpeed: number
  axialTilt: number
  color: number
  emissive: number
  atmosphereColor?: number
  atmosphereOpacity?: number
  clouds?: {
    altitude: number
    color: number
    opacity: number
    speed: number
  }
  moon?: {
    radius: number
    distance: number
    speed: number
    baseAngle: number
    color: number
  }
  ring?: {
    inner: number
    outer: number
    tilt: number
  }
}

interface BodyRuntime {
  definition: BodyDefinition
  group: THREE.Group
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial>
  atmosphere?: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  atmosphereGlow?: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  phaseRim?: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  cloudShadow?: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  clouds?: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  glint?: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  nightLights?: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  moonTransitShadow?: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  ring?: THREE.Mesh<THREE.RingGeometry, THREE.MeshStandardMaterial>
  ringGlow?: THREE.Mesh<THREE.RingGeometry, THREE.ShaderMaterial>
  ringShadow?: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  earthshineLight?: THREE.PointLight
  moonOrbit?: THREE.Group
  moonMesh?: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>
  moonPhaseRim?: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  moonLine?: THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>
}

interface BodyTextureSet {
  map: THREE.CanvasTexture
  bumpMap?: THREE.CanvasTexture
  roughnessMap?: THREE.CanvasTexture
  alphaMap?: THREE.CanvasTexture
  glintMap?: THREE.CanvasTexture
  nightMap?: THREE.CanvasTexture
}

interface RingTextureSet {
  map: THREE.CanvasTexture
  alphaMap: THREE.CanvasTexture
}

interface AtmosphereGlowOptions {
  color: number
  intensity: number
  power: number
  terminatorColor: number
  nightColor: number
  twilightStrength?: number
  nightStrength?: number
  daySharpness?: number
}

interface AtmosphereShellOptions {
  color: number
  opacity: number
  terminatorColor: number
  nightColor: number
  twilightStrength?: number
  nightStrength?: number
  limbPower?: number
  limbStrength?: number
}

interface CloudShellOptions {
  color: number
  opacity: number
  nightColor: number
  terminatorColor: number
  scatterColor: number
  scatterStrength?: number
  rimPower?: number
}

interface StarfieldLayerOptions {
  count: number
  radiusMin: number
  radiusMax: number
  verticalScale: number
  size: number
  opacity: number
  palette: readonly string[]
  blending?: THREE.Blending
}

interface NebulaFieldOptions {
  count: number
  radiusMin: number
  radiusMax: number
  verticalScale: number
  scaleMin: number
  scaleMax: number
  opacity: number
  palette: readonly string[]
  blending?: THREE.Blending
  seedOffset?: number
}

const DEFAULT_CAMERA: CameraState = {
  distance: 168,
  yaw: -0.54,
  tilt: 0.42,
}

const CAMERA_LIMITS = {
  minDistance: 104,
  maxDistance: 260,
  maxYaw: 1.42,
  maxTilt: 1.08,
  zoomStep: 12,
  dragYawFactor: 0.0062,
  dragTiltFactor: 0.0054,
}

const BODY_DEFINITIONS: readonly BodyDefinition[] = [
  {
    id: 'mercury',
    radius: 2.7,
    orbitRadius: 24,
    orbitInclination: 9,
    orbitLongitude: 18,
    baseAngle: 232,
    orbitSpeed: 0.08,
    spinSpeed: 0.18,
    axialTilt: 0.03,
    color: 0xbc8b63,
    emissive: 0x2c140a,
  },
  {
    id: 'venus',
    radius: 5.3,
    orbitRadius: 37,
    orbitInclination: -7,
    orbitLongitude: 42,
    baseAngle: 336,
    orbitSpeed: 0.052,
    spinSpeed: 0.11,
    axialTilt: 177,
    color: 0xd9ab63,
    emissive: 0x311408,
    atmosphereColor: 0xffd5a3,
    atmosphereOpacity: 0.16,
    clouds: {
      altitude: 1.028,
      color: 0xfff0d7,
      opacity: 0.34,
      speed: 0.018,
    },
  },
  {
    id: 'earth',
    radius: 5.8,
    orbitRadius: 52,
    orbitInclination: 16,
    orbitLongitude: -24,
    baseAngle: 148,
    orbitSpeed: 0.038,
    spinSpeed: 0.26,
    axialTilt: 23.5,
    color: 0x2d8aca,
    emissive: 0x081f32,
    atmosphereColor: 0x7fd6ff,
    atmosphereOpacity: 0.18,
    clouds: {
      altitude: 1.024,
      color: 0xf6fcff,
      opacity: 0.56,
      speed: 0.064,
    },
    moon: {
      radius: 1.45,
      distance: 10.5,
      speed: 0.54,
      baseAngle: 30,
      color: 0xe7dec9,
    },
  },
  {
    id: 'mars',
    radius: 4.2,
    orbitRadius: 69,
    orbitInclination: -14,
    orbitLongitude: 60,
    baseAngle: 206,
    orbitSpeed: 0.026,
    spinSpeed: 0.19,
    axialTilt: 25.2,
    color: 0xbf6646,
    emissive: 0x250d09,
    atmosphereColor: 0xf2a27a,
    atmosphereOpacity: 0.08,
  },
  {
    id: 'saturn',
    radius: 9.8,
    orbitRadius: 92,
    orbitInclination: 12,
    orbitLongitude: -46,
    baseAngle: 42,
    orbitSpeed: 0.014,
    spinSpeed: 0.13,
    axialTilt: 26.7,
    color: 0xcaa061,
    emissive: 0x231307,
    atmosphereColor: 0xffe1ac,
    atmosphereOpacity: 0.1,
    ring: {
      inner: 13.2,
      outer: 21.2,
      tilt: 24,
    },
  },
] as const

const ARCHIVE_LANES = [
  { radius: 58, inclination: 20, longitude: -16 },
  { radius: 78, inclination: -14, longitude: 22 },
  { radius: 102, inclination: 22, longitude: 58 },
] as const

const PHASE_COLORS: Record<StarFocusPhase | 'idle', { accent: number; soft: number }> = {
  idle: { accent: 0xffc56c, soft: 0x6a3f18 },
  ignition: { accent: 0xffa35e, soft: 0x7b2f10 },
  ascent: { accent: 0x82d5ff, soft: 0x1b4667 },
  heating: { accent: 0xff7b58, soft: 0x6f1b12 },
  staging: { accent: 0xc4d4ff, soft: 0x354669 },
  orbit: { accent: 0x7fe1b0, soft: 0x173d2d },
}

const FAR_STAR_COUNT = 460
const NEAR_STAR_COUNT = 220
const DUST_MOTE_COUNT = 260
const FAR_NEBULA_COUNT = 8
const NEAR_NEBULA_COUNT = 5
const TRAIL_SAMPLE_COUNT = 90

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalizeCamera(camera: CameraState): CameraState {
  return {
    distance: clamp(camera.distance, CAMERA_LIMITS.minDistance, CAMERA_LIMITS.maxDistance),
    yaw: clamp(camera.yaw, -CAMERA_LIMITS.maxYaw, CAMERA_LIMITS.maxYaw),
    tilt: clamp(camera.tilt, -CAMERA_LIMITS.maxTilt, CAMERA_LIMITS.maxTilt),
  }
}

function formatClock(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function orbitalPosition(
  radius: number,
  angleDegrees: number,
  inclinationDegrees = 0,
  longitudeDegrees = 0,
  elevation = 0,
) {
  const point = new THREE.Vector3(
    Math.cos(THREE.MathUtils.degToRad(angleDegrees)) * radius,
    elevation,
    Math.sin(THREE.MathUtils.degToRad(angleDegrees)) * radius,
  )

  point.applyAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(inclinationDegrees))
  point.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(longitudeDegrees))

  return point
}

function buildOrbitPoints(radius: number, inclination: number, longitude: number, segments = 180) {
  return Array.from({ length: segments + 1 }, (_, index) => (
    orbitalPosition(radius, (index / segments) * 360, inclination, longitude)
  ))
}

function createTextureCanvas(width = 1024, height = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function createCanvasTexture(
  canvas: HTMLCanvasElement,
  wrapS: THREE.Wrapping = THREE.RepeatWrapping,
  wrapT: THREE.Wrapping = THREE.ClampToEdgeWrapping,
  colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace,
) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = colorSpace
  texture.wrapS = wrapS
  texture.wrapT = wrapT
  texture.needsUpdate = true
  return texture
}

function seededUnit(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453123
  return value - Math.floor(value)
}

function fillCanvas(context: CanvasRenderingContext2D, color: string, width: number, height: number) {
  context.fillStyle = color
  context.fillRect(0, 0, width, height)
}

function paintEllipse(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  rotation: number,
  fillStyle: string,
  alpha = 1,
) {
  context.save()
  context.globalAlpha = alpha
  context.fillStyle = fillStyle
  context.beginPath()
  context.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function paintRadialGlow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  innerColor: string,
  outerColor = 'rgba(0, 0, 0, 0)',
) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
  gradient.addColorStop(0, innerColor)
  gradient.addColorStop(1, outerColor)
  context.fillStyle = gradient
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.fill()
}

function createPlanetTextureSet(bodyId: BodyId): BodyTextureSet {
  const colorCanvas = createTextureCanvas(1536, 768)
  const bumpCanvas = createTextureCanvas(1536, 768)
  const roughnessCanvas = createTextureCanvas(1536, 768)
  const alphaCanvas = bodyId === 'earth' || bodyId === 'venus' ? createTextureCanvas(1536, 768) : null
  const glintCanvas = bodyId === 'earth' ? createTextureCanvas(1536, 768) : null
  const nightCanvas = bodyId === 'earth' ? createTextureCanvas(1536, 768) : null

  const colorContext = colorCanvas.getContext('2d')
  const bumpContext = bumpCanvas.getContext('2d')
  const roughnessContext = roughnessCanvas.getContext('2d')
  const alphaContext = alphaCanvas?.getContext('2d') ?? null
  const glintContext = glintCanvas?.getContext('2d') ?? null
  const nightContext = nightCanvas?.getContext('2d') ?? null

  if (!colorContext || !bumpContext || !roughnessContext) {
    return {
      map: createCanvasTexture(colorCanvas),
    }
  }

  const { width, height } = colorCanvas
  colorContext.clearRect(0, 0, width, height)
  fillCanvas(bumpContext, '#6d6d6d', width, height)
  fillCanvas(roughnessContext, '#9d9d9d', width, height)

  if (alphaContext) {
    fillCanvas(alphaContext, '#000000', width, height)
  }

  if (glintContext) {
    fillCanvas(glintContext, '#ffffff', width, height)
  }

  if (nightContext) {
    fillCanvas(nightContext, '#000000', width, height)
  }

  if (bodyId === 'earth') {
    const ocean = colorContext.createLinearGradient(0, 0, 0, height)
    ocean.addColorStop(0, '#8ae2ff')
    ocean.addColorStop(0.38, '#2d7fba')
    ocean.addColorStop(0.7, '#15496f')
    ocean.addColorStop(1, '#0c253d')
    colorContext.fillStyle = ocean
    colorContext.fillRect(0, 0, width, height)

    const northIce = colorContext.createLinearGradient(0, 0, 0, 140)
    northIce.addColorStop(0, 'rgba(235,245,255,0.95)')
    northIce.addColorStop(1, 'rgba(235,245,255,0)')
    colorContext.fillStyle = northIce
    colorContext.fillRect(0, 0, width, 132)

    const southIce = colorContext.createLinearGradient(0, height, 0, height - 150)
    southIce.addColorStop(0, 'rgba(240,247,255,0.95)')
    southIce.addColorStop(1, 'rgba(240,247,255,0)')
    colorContext.fillStyle = southIce
    colorContext.fillRect(0, height - 146, width, 146)

    colorContext.fillStyle = '#4d9460'
    colorContext.beginPath()
    colorContext.moveTo(92, 192)
    colorContext.bezierCurveTo(218, 66, 360, 94, 402, 224)
    colorContext.bezierCurveTo(366, 336, 264, 380, 172, 326)
    colorContext.bezierCurveTo(78, 290, 34, 236, 92, 192)
    colorContext.fill()

    colorContext.beginPath()
    colorContext.moveTo(554, 172)
    colorContext.bezierCurveTo(702, 108, 852, 172, 864, 286)
    colorContext.bezierCurveTo(820, 382, 670, 418, 558, 346)
    colorContext.bezierCurveTo(488, 290, 488, 206, 554, 172)
    colorContext.fill()

    colorContext.beginPath()
    colorContext.moveTo(1088, 220)
    colorContext.bezierCurveTo(1226, 184, 1352, 230, 1398, 314)
    colorContext.bezierCurveTo(1360, 394, 1240, 426, 1126, 382)
    colorContext.bezierCurveTo(1026, 338, 1008, 260, 1088, 220)
    colorContext.fill()

    if (glintContext) {
      glintContext.fillStyle = '#000000'
      glintContext.beginPath()
      glintContext.moveTo(92, 192)
      glintContext.bezierCurveTo(218, 66, 360, 94, 402, 224)
      glintContext.bezierCurveTo(366, 336, 264, 380, 172, 326)
      glintContext.bezierCurveTo(78, 290, 34, 236, 92, 192)
      glintContext.fill()

      glintContext.beginPath()
      glintContext.moveTo(554, 172)
      glintContext.bezierCurveTo(702, 108, 852, 172, 864, 286)
      glintContext.bezierCurveTo(820, 382, 670, 418, 558, 346)
      glintContext.bezierCurveTo(488, 290, 488, 206, 554, 172)
      glintContext.fill()

      glintContext.beginPath()
      glintContext.moveTo(1088, 220)
      glintContext.bezierCurveTo(1226, 184, 1352, 230, 1398, 314)
      glintContext.bezierCurveTo(1360, 394, 1240, 426, 1126, 382)
      glintContext.bezierCurveTo(1026, 338, 1008, 260, 1088, 220)
      glintContext.fill()

      paintEllipse(glintContext, 282, 252, 118, 48, -0.18, '#2d2d2d', 0.74)
      paintEllipse(glintContext, 744, 276, 132, 42, 0.1, '#343434', 0.7)
      paintEllipse(glintContext, 1174, 298, 128, 48, -0.12, '#434343', 0.62)
    }

    colorContext.fillStyle = 'rgba(194, 173, 108, 0.44)'
    paintEllipse(colorContext, 282, 252, 118, 48, -0.18, 'rgba(194, 173, 108, 0.44)')
    paintEllipse(colorContext, 744, 276, 132, 42, 0.1, 'rgba(190, 166, 99, 0.4)')
    paintEllipse(colorContext, 1174, 298, 128, 48, -0.12, 'rgba(203, 182, 120, 0.34)')

    colorContext.strokeStyle = 'rgba(147, 214, 255, 0.12)'
    colorContext.lineWidth = 10
    for (let index = 0; index < 7; index += 1) {
      const y = 110 + (index * 82)
      colorContext.beginPath()
      colorContext.moveTo(0, y + (seededUnit(index + 2) * 20))
      colorContext.bezierCurveTo(width * 0.18, y - 24, width * 0.42, y + 16, width * 0.62, y - 12)
      colorContext.bezierCurveTo(width * 0.78, y - 30, width * 0.92, y + 24, width, y + (seededUnit(index + 20) * 18))
      colorContext.stroke()
    }

    fillCanvas(bumpContext, '#252525', width, height)
    fillCanvas(roughnessContext, '#202020', width, height)
    bumpContext.fillStyle = '#9a9a9a'
    roughnessContext.fillStyle = '#c7c7c7'
    ;[
      [
        [92, 192],
        [218, 66],
        [360, 94],
        [402, 224],
      ],
      [
        [554, 172],
        [702, 108],
        [852, 172],
        [864, 286],
      ],
      [
        [1088, 220],
        [1226, 184],
        [1352, 230],
        [1398, 314],
      ],
    ].forEach((continent, index) => {
      bumpContext.beginPath()
      bumpContext.moveTo(continent[0]?.[0] ?? 0, continent[0]?.[1] ?? 0)
      bumpContext.bezierCurveTo(
        continent[1]?.[0] ?? 0,
        continent[1]?.[1] ?? 0,
        continent[2]?.[0] ?? 0,
        continent[2]?.[1] ?? 0,
        continent[3]?.[0] ?? 0,
        continent[3]?.[1] ?? 0,
      )
      bumpContext.bezierCurveTo(
        (continent[3]?.[0] ?? 0) - 44,
        (continent[3]?.[1] ?? 0) + 98,
        (continent[1]?.[0] ?? 0) - 106,
        (continent[1]?.[1] ?? 0) + 208,
        (continent[0]?.[0] ?? 0) + 24,
        (continent[0]?.[1] ?? 0) + 112,
      )
      bumpContext.fill()

      roughnessContext.beginPath()
      roughnessContext.moveTo(continent[0]?.[0] ?? 0, continent[0]?.[1] ?? 0)
      roughnessContext.bezierCurveTo(
        continent[1]?.[0] ?? 0,
        continent[1]?.[1] ?? 0,
        continent[2]?.[0] ?? 0,
        continent[2]?.[1] ?? 0,
        continent[3]?.[0] ?? 0,
        continent[3]?.[1] ?? 0,
      )
      roughnessContext.bezierCurveTo(
        (continent[3]?.[0] ?? 0) - 44,
        (continent[3]?.[1] ?? 0) + 98,
        (continent[1]?.[0] ?? 0) - 106,
        (continent[1]?.[1] ?? 0) + 208,
        (continent[0]?.[0] ?? 0) + 24,
        (continent[0]?.[1] ?? 0) + 112,
      )
      roughnessContext.fill()

      const x = index === 0 ? 282 : index === 1 ? 744 : 1174
      const y = index === 0 ? 252 : index === 1 ? 276 : 298
      paintEllipse(bumpContext, x, y, 102, 36, -0.08, '#d8d8d8', 0.66)
      paintEllipse(roughnessContext, x, y, 118, 42, -0.08, '#a7a7a7', 0.58)
    })

    if (alphaContext) {
      alphaContext.fillStyle = 'rgba(255,255,255,0.42)'
      for (let index = 0; index < 18; index += 1) {
        const x = seededUnit(index + 10) * width
        const y = 110 + (seededUnit(index + 50) * (height - 220))
        const rx = 90 + (seededUnit(index + 80) * 150)
        const ry = 18 + (seededUnit(index + 120) * 30)
        paintEllipse(alphaContext, x, y, rx, ry, (seededUnit(index + 150) - 0.5) * 0.8, '#ffffff', 0.46)
      }

      alphaContext.strokeStyle = 'rgba(255,255,255,0.3)'
      alphaContext.lineWidth = 28
      alphaContext.lineCap = 'round'
      alphaContext.beginPath()
      alphaContext.moveTo(width * 0.04, height * 0.32)
      alphaContext.bezierCurveTo(width * 0.22, height * 0.12, width * 0.42, height * 0.18, width * 0.62, height * 0.4)
      alphaContext.bezierCurveTo(width * 0.82, height * 0.56, width * 0.92, height * 0.58, width * 0.98, height * 0.48)
      alphaContext.stroke()
    }

    if (nightContext) {
      const lightClusters = [
        [176, 212, 34, '#ffd693'],
        [248, 238, 28, '#ffb86e'],
        [314, 260, 26, '#ffcc7d'],
        [604, 224, 38, '#ffd18c'],
        [704, 258, 34, '#ffb06b'],
        [782, 292, 32, '#ffd694'],
        [1138, 258, 34, '#ffd48b'],
        [1218, 286, 30, '#ffba75'],
        [1292, 312, 28, '#ffd894'],
      ] as const

      lightClusters.forEach(([x, y, radius, color]) => {
        paintRadialGlow(nightContext, x, y, radius * 1.9, color)
        paintRadialGlow(nightContext, x, y, radius * 0.7, '#fff3c2')
      })

      for (let index = 0; index < 90; index += 1) {
        const x = 96 + (seededUnit(index + 600) * 1320)
        const y = 150 + (seededUnit(index + 900) * 260)
        const radius = 3 + (seededUnit(index + 1200) * 5)
        const color = index % 4 === 0 ? '#ffe29f' : index % 3 === 0 ? '#ffbf74' : '#ffd48b'
        paintRadialGlow(nightContext, x, y, radius, color)
      }
    }
  } else if (bodyId === 'venus') {
    const base = colorContext.createLinearGradient(0, 0, 0, height)
    base.addColorStop(0, '#f6deaa')
    base.addColorStop(0.28, '#d5a15f')
    base.addColorStop(0.68, '#97501e')
    base.addColorStop(1, '#482111')
    colorContext.fillStyle = base
    colorContext.fillRect(0, 0, width, height)

    for (let index = 0; index < 20; index += 1) {
      const y = (index / 19) * height
      const bandHeight = 22 + (seededUnit(index + 12) * 16)
      colorContext.fillStyle = index % 2 === 0 ? 'rgba(255,238,201,0.16)' : 'rgba(120,53,14,0.14)'
      colorContext.fillRect(0, y, width, bandHeight)
    }

    colorContext.strokeStyle = 'rgba(255,241,214,0.2)'
    colorContext.lineWidth = 22
    colorContext.lineCap = 'round'
    for (let index = 0; index < 4; index += 1) {
      const y = height * (0.22 + (index * 0.18))
      colorContext.beginPath()
      colorContext.moveTo(0, y)
      colorContext.bezierCurveTo(width * 0.18, y - 96, width * 0.44, y - 54, width * 0.66, y + 54)
      colorContext.bezierCurveTo(width * 0.82, y + 128, width * 0.92, y + 110, width, y + 48)
      colorContext.stroke()
    }

    fillCanvas(bumpContext, '#747474', width, height)
    fillCanvas(roughnessContext, '#cfcfcf', width, height)
    for (let index = 0; index < 24; index += 1) {
      const y = (index / 23) * height
      const bumpAlpha = 0.1 + (seededUnit(index + 30) * 0.1)
      paintEllipse(bumpContext, width * 0.5, y, width * 0.58, 10 + (seededUnit(index + 36) * 18), 0, '#c9c9c9', bumpAlpha)
    }

    if (alphaContext) {
      for (let index = 0; index < 22; index += 1) {
        const x = seededUnit(index + 70) * width
        const y = seededUnit(index + 110) * height
        const rx = 130 + (seededUnit(index + 150) * 180)
        const ry = 18 + (seededUnit(index + 190) * 30)
        paintEllipse(alphaContext, x, y, rx, ry, (seededUnit(index + 220) - 0.5) * 0.7, '#ffffff', 0.26)
      }

      alphaContext.strokeStyle = 'rgba(255,255,255,0.24)'
      alphaContext.lineWidth = 36
      alphaContext.lineCap = 'round'
      alphaContext.beginPath()
      alphaContext.moveTo(width * 0.06, height * 0.34)
      alphaContext.bezierCurveTo(width * 0.22, height * 0.08, width * 0.38, height * 0.16, width * 0.64, height * 0.44)
      alphaContext.bezierCurveTo(width * 0.82, height * 0.66, width * 0.9, height * 0.72, width * 0.98, height * 0.62)
      alphaContext.stroke()
    }
  } else if (bodyId === 'mars') {
    const base = colorContext.createLinearGradient(0, 0, 0, height)
    base.addColorStop(0, '#ebb38c')
    base.addColorStop(0.42, '#bb6540')
    base.addColorStop(0.78, '#7b3223')
    base.addColorStop(1, '#3e160f')
    colorContext.fillStyle = base
    colorContext.fillRect(0, 0, width, height)

    paintEllipse(colorContext, 340, 250, 224, 92, -0.16, 'rgba(93,32,23,0.38)')
    paintEllipse(colorContext, 1128, 386, 278, 110, 0.06, 'rgba(82,27,18,0.34)')
    paintEllipse(colorContext, 936, 168, 158, 58, 0.18, 'rgba(150,84,58,0.18)')

    colorContext.strokeStyle = 'rgba(232,176,143,0.2)'
    colorContext.lineWidth = 10
    colorContext.beginPath()
    colorContext.moveTo(0, height * 0.58)
    colorContext.bezierCurveTo(width * 0.22, height * 0.42, width * 0.46, height * 0.5, width * 0.76, height * 0.72)
    colorContext.stroke()

    const northCap = colorContext.createLinearGradient(0, 0, 0, 90)
    northCap.addColorStop(0, 'rgba(255,243,230,0.82)')
    northCap.addColorStop(1, 'rgba(255,243,230,0)')
    colorContext.fillStyle = northCap
    colorContext.fillRect(0, 0, width, 84)

    fillCanvas(bumpContext, '#777777', width, height)
    fillCanvas(roughnessContext, '#b2b2b2', width, height)
    paintEllipse(bumpContext, 340, 250, 218, 88, -0.16, '#a4a4a4', 0.44)
    paintEllipse(bumpContext, 1128, 386, 268, 104, 0.06, '#8f8f8f', 0.38)
    paintEllipse(roughnessContext, 936, 168, 158, 58, 0.18, '#878787', 0.48)
  } else if (bodyId === 'saturn') {
    const base = colorContext.createLinearGradient(0, 0, 0, height)
    base.addColorStop(0, '#f1ddb3')
    base.addColorStop(0.28, '#cfab72')
    base.addColorStop(0.66, '#9f6f39')
    base.addColorStop(1, '#53351b')
    colorContext.fillStyle = base
    colorContext.fillRect(0, 0, width, height)

    for (let index = 0; index < 30; index += 1) {
      const y = (index / 29) * height
      const bandHeight = 10 + (seededUnit(index + 260) * 10)
      colorContext.fillStyle = index % 4 === 0
        ? 'rgba(255,247,223,0.18)'
        : index % 2 === 0
          ? 'rgba(152,99,42,0.14)'
          : 'rgba(255,228,184,0.1)'
      colorContext.fillRect(0, y, width, bandHeight)
    }

    paintEllipse(colorContext, width * 0.72, height * 0.42, 128, 34, -0.08, 'rgba(255,236,194,0.18)')
    paintEllipse(colorContext, width * 0.34, height * 0.56, 88, 26, 0.04, 'rgba(148,95,44,0.18)')

    fillCanvas(bumpContext, '#6f6f6f', width, height)
    fillCanvas(roughnessContext, '#9c9c9c', width, height)
    for (let index = 0; index < 26; index += 1) {
      const y = (index / 25) * height
      const bandHeight = 10 + (seededUnit(index + 310) * 8)
      bumpContext.fillStyle = index % 3 === 0 ? 'rgba(190,190,190,0.14)' : 'rgba(84,84,84,0.08)'
      roughnessContext.fillStyle = index % 2 === 0 ? 'rgba(138,138,138,0.14)' : 'rgba(110,110,110,0.08)'
      bumpContext.fillRect(0, y, width, bandHeight)
      roughnessContext.fillRect(0, y, width, bandHeight)
    }
  } else {
    const base = colorContext.createLinearGradient(0, 0, 0, height)
    base.addColorStop(0, '#e2ba8f')
    base.addColorStop(0.48, '#90603b')
    base.addColorStop(1, '#372116')
    colorContext.fillStyle = base
    colorContext.fillRect(0, 0, width, height)

    fillCanvas(bumpContext, '#838383', width, height)
    fillCanvas(roughnessContext, '#c4c4c4', width, height)

    for (let index = 0; index < 26; index += 1) {
      const x = seededUnit(index + 6) * width
      const y = seededUnit(index + 60) * height
      const radius = 20 + (seededUnit(index + 120) * 70)
      paintEllipse(colorContext, x, y, radius, radius * (0.78 + (seededUnit(index + 180) * 0.28)), seededUnit(index + 200), 'rgba(67,39,25,0.4)')
      paintEllipse(colorContext, x, y, radius * 0.54, radius * 0.42, seededUnit(index + 230), 'rgba(194,156,112,0.18)')

      paintEllipse(bumpContext, x, y, radius, radius * 0.84, 0, '#d2d2d2', 0.22)
      paintEllipse(bumpContext, x, y, radius * 0.48, radius * 0.4, 0, '#3d3d3d', 0.44)
      paintEllipse(roughnessContext, x, y, radius * 0.6, radius * 0.46, 0, '#8a8a8a', 0.22)
    }
  }

  return {
    map: createCanvasTexture(colorCanvas),
    bumpMap: createCanvasTexture(bumpCanvas, THREE.RepeatWrapping, THREE.ClampToEdgeWrapping, THREE.NoColorSpace),
    roughnessMap: createCanvasTexture(roughnessCanvas, THREE.RepeatWrapping, THREE.ClampToEdgeWrapping, THREE.NoColorSpace),
    alphaMap: alphaCanvas ? createCanvasTexture(alphaCanvas, THREE.RepeatWrapping, THREE.ClampToEdgeWrapping, THREE.NoColorSpace) : undefined,
    glintMap: glintCanvas ? createCanvasTexture(glintCanvas, THREE.RepeatWrapping, THREE.ClampToEdgeWrapping, THREE.NoColorSpace) : undefined,
    nightMap: nightCanvas ? createCanvasTexture(nightCanvas) : undefined,
  }
}

function createSaturnRingTextureSet(): RingTextureSet {
  const mapCanvas = createTextureCanvas(1024, 1024)
  const alphaCanvas = createTextureCanvas(1024, 1024)
  const mapContext = mapCanvas.getContext('2d')
  const alphaContext = alphaCanvas.getContext('2d')

  if (!mapContext || !alphaContext) {
    return {
      map: createCanvasTexture(mapCanvas, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping),
      alphaMap: createCanvasTexture(alphaCanvas, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.NoColorSpace),
    }
  }

  const size = mapCanvas.width
  const center = size / 2
  const inner = size * 0.31
  const outer = size * 0.48

  mapContext.clearRect(0, 0, size, size)
  alphaContext.clearRect(0, 0, size, size)

  for (let index = 0; index < 190; index += 1) {
    const progress = index / 189
    const radius = inner + ((outer - inner) * progress)
    const lineWidth = 1.2 + (seededUnit(index + 420) * 3.4)
    const isCassiniGap = progress > 0.54 && progress < 0.61
    const warm = Math.round(214 + (seededUnit(index + 440) * 24))
    const cool = Math.round(172 + (seededUnit(index + 470) * 28))
    const dark = Math.round(108 + (seededUnit(index + 490) * 30))
    const alpha = isCassiniGap ? 0.06 : 0.24 + (seededUnit(index + 520) * 0.5)

    mapContext.strokeStyle = isCassiniGap
      ? `rgba(${dark}, ${dark - 8}, ${dark - 26}, 0.2)`
      : `rgba(${warm}, ${cool}, ${dark}, ${0.24 + (seededUnit(index + 550) * 0.34)})`
    alphaContext.strokeStyle = `rgba(255,255,255,${alpha})`

    mapContext.lineWidth = lineWidth
    alphaContext.lineWidth = lineWidth
    mapContext.beginPath()
    alphaContext.beginPath()
    mapContext.arc(center, center, radius, 0, Math.PI * 2)
    alphaContext.arc(center, center, radius, 0, Math.PI * 2)
    mapContext.stroke()
    alphaContext.stroke()
  }

  return {
    map: createCanvasTexture(mapCanvas, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping),
    alphaMap: createCanvasTexture(alphaCanvas, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.NoColorSpace),
  }
}

function buildMissionCurve() {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(12, 0, 0),
    new THREE.Vector3(20, 12, -8),
    new THREE.Vector3(32, 24, -18),
    new THREE.Vector3(46, 20, -10),
    new THREE.Vector3(62, 10, 8),
    new THREE.Vector3(74, -2, 18),
    new THREE.Vector3(78, -8, 28),
    new THREE.Vector3(72, -6, 38),
  ])
}

function historyMarkerPosition(index: number) {
  const lane = ARCHIVE_LANES[index % ARCHIVE_LANES.length] ?? ARCHIVE_LANES[0]
  const angle = 18 + ((index * 47) % 320)
  return orbitalPosition(lane.radius, angle, lane.inclination, lane.longitude)
}

function historyKey(missions: StarFocusMissionRecord[]) {
  return missions.map(mission => mission.id).join('|')
}

function createOrbitLine(radius: number, inclination: number, longitude: number, color: number, opacity: number) {
  const geometry = new THREE.BufferGeometry().setFromPoints(buildOrbitPoints(radius, inclination, longitude))
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  })
  return new THREE.LineLoop(geometry, material)
}

function createAtmosphereGlowMaterial({
  color,
  intensity,
  power,
  terminatorColor,
  nightColor,
  twilightStrength = 0.24,
  nightStrength = 0.08,
  daySharpness = 1.35,
}: AtmosphereGlowOptions) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(color) },
      terminatorColor: { value: new THREE.Color(terminatorColor) },
      nightColor: { value: new THREE.Color(nightColor) },
      glowIntensity: { value: intensity },
      glowPower: { value: power },
      glowNightBias: { value: nightStrength },
      glowDaySharpness: { value: daySharpness },
      twilightStrength: { value: twilightStrength },
      lightPosition: { value: new THREE.Vector3(0, 0, 0) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform vec3 terminatorColor;
      uniform vec3 nightColor;
      uniform float glowIntensity;
      uniform float glowPower;
      uniform float glowNightBias;
      uniform float glowDaySharpness;
      uniform float twilightStrength;
      uniform vec3 lightPosition;
      uniform vec3 cameraPosition;

      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec3 normalDirection = normalize(vWorldNormal);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        vec3 lightDirection = normalize(lightPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(normalDirection, viewDirection), 0.0), glowPower);
        float dayGlow = pow(max(dot(normalDirection, lightDirection), 0.0), glowDaySharpness);
        float twilight = pow(1.0 - abs(dot(normalDirection, lightDirection)), 2.2) * twilightStrength;
        float nightGlow = pow(max(-dot(normalDirection, lightDirection), 0.0), 1.4) * glowNightBias;
        float glowTotal = dayGlow + twilight + nightGlow;
        vec3 glowMix = (glowColor * dayGlow) + (terminatorColor * twilight) + (nightColor * nightGlow);
        vec3 finalColor = glowTotal > 0.0 ? glowMix / glowTotal : glowColor;
        float alpha = fresnel * glowTotal * glowIntensity;
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  material.toneMapped = false
  return material
}

function createAtmosphereShellMaterial({
  color,
  opacity,
  terminatorColor,
  nightColor,
  twilightStrength = 0.34,
  nightStrength = 0.1,
  limbPower = 2.2,
  limbStrength = 0.46,
}: AtmosphereShellOptions) {
  return new THREE.ShaderMaterial({
    uniforms: {
      dayColor: { value: new THREE.Color(color) },
      terminatorColor: { value: new THREE.Color(terminatorColor) },
      nightColor: { value: new THREE.Color(nightColor) },
      shellOpacity: { value: opacity },
      twilightStrength: { value: twilightStrength },
      nightStrength: { value: nightStrength },
      limbPower: { value: limbPower },
      limbStrength: { value: limbStrength },
      lightPosition: { value: new THREE.Vector3(0, 0, 0) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 dayColor;
      uniform vec3 terminatorColor;
      uniform vec3 nightColor;
      uniform float shellOpacity;
      uniform float twilightStrength;
      uniform float nightStrength;
      uniform float limbPower;
      uniform float limbStrength;
      uniform vec3 lightPosition;
      uniform vec3 cameraPosition;

      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec3 normalDirection = normalize(vWorldNormal);
        vec3 lightDirection = normalize(lightPosition - vWorldPosition);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);

        float lightDot = dot(normalDirection, lightDirection);
        float day = smoothstep(-0.08, 0.78, lightDot);
        float twilight = pow(1.0 - abs(lightDot), 2.0) * twilightStrength;
        float night = pow(max(-lightDot, 0.0), 1.35) * nightStrength;
        float limb = pow(1.0 - max(dot(normalDirection, viewDirection), 0.0), limbPower) * limbStrength;

        float total = day + twilight + night;
        vec3 mixedColor = total > 0.0
          ? ((dayColor * day) + (terminatorColor * twilight) + (nightColor * night)) / total
          : dayColor;
        float alpha = shellOpacity * clamp((day * 0.16) + (twilight * 0.88) + (night * 0.42) + (limb * (0.7 + twilight)), 0.0, 1.0);
        gl_FragColor = vec4(mixedColor, alpha);
      }
    `,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
  })
}

function createRingScatteringMaterial(
  alphaMap: THREE.Texture,
  baseColor: number,
  scatterColor: number,
  intensity: number,
  forwardPower: number,
) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      alphaMap: { value: alphaMap },
      lightPosition: { value: new THREE.Vector3(0, 0, 0) },
      baseColor: { value: new THREE.Color(baseColor) },
      scatterColor: { value: new THREE.Color(scatterColor) },
      scatterIntensity: { value: intensity },
      forwardPower: { value: forwardPower },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D alphaMap;
      uniform vec3 lightPosition;
      uniform vec3 baseColor;
      uniform vec3 scatterColor;
      uniform float scatterIntensity;
      uniform float forwardPower;
      uniform vec3 cameraPosition;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        float mask = texture2D(alphaMap, vUv).r;
        if (mask < 0.02) {
          discard;
        }

        vec3 normalDirection = normalize(vWorldNormal);
        vec3 lightDirection = normalize(lightPosition - vWorldPosition);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);

        float forwardScatter = pow(max(dot(-lightDirection, viewDirection), 0.0), forwardPower);
        float grazingLight = 1.0 - abs(dot(normalDirection, lightDirection));
        float edgeView = 1.0 - abs(dot(normalDirection, viewDirection));
        float scatterMix = clamp((forwardScatter * 0.86) + (grazingLight * 0.42), 0.0, 1.0);
        vec3 color = mix(baseColor, scatterColor, scatterMix);
        float alpha = mask * scatterIntensity * (forwardScatter * 0.72 + grazingLight * 0.34 + edgeView * 0.08);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  material.toneMapped = false
  return material
}

function createNightLightsMaterial(nightMap: THREE.Texture, intensity: number) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      nightMap: { value: nightMap },
      lightPosition: { value: new THREE.Vector3(0, 0, 0) },
      glowIntensity: { value: intensity },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D nightMap;
      uniform vec3 lightPosition;
      uniform float glowIntensity;
      uniform vec3 cameraPosition;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec4 nightSample = texture2D(nightMap, vUv);
        float lightLuma = dot(nightSample.rgb, vec3(0.2126, 0.7152, 0.0722));
        if (lightLuma < 0.02) {
          discard;
        }

        vec3 normalDirection = normalize(vWorldNormal);
        vec3 lightDirection = normalize(lightPosition - vWorldPosition);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);

        float nightMask = pow(max(-dot(normalDirection, lightDirection), 0.0), 1.55);
        float horizon = pow(1.0 - max(dot(normalDirection, viewDirection), 0.0), 1.4);
        float alpha = lightLuma * nightMask * (0.42 + horizon * 0.28) * glowIntensity;
        gl_FragColor = vec4(nightSample.rgb, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  material.toneMapped = false
  return material
}

function createSurfaceGlintMaterial(glintMap: THREE.Texture, color: number, intensity: number, power: number) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      glintMap: { value: glintMap },
      lightPosition: { value: new THREE.Vector3(0, 0, 0) },
      glintColor: { value: new THREE.Color(color) },
      glintIntensity: { value: intensity },
      glintPower: { value: power },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D glintMap;
      uniform vec3 lightPosition;
      uniform vec3 glintColor;
      uniform float glintIntensity;
      uniform float glintPower;
      uniform vec3 cameraPosition;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        float mask = texture2D(glintMap, vUv).r;
        if (mask < 0.02) {
          discard;
        }

        vec3 normalDirection = normalize(vWorldNormal);
        vec3 lightDirection = normalize(lightPosition - vWorldPosition);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        vec3 reflected = reflect(-lightDirection, normalDirection);

        float daylight = smoothstep(0.08, 0.38, dot(normalDirection, lightDirection));
        float specular = pow(max(dot(reflected, viewDirection), 0.0), glintPower);
        float fresnel = pow(1.0 - max(dot(normalDirection, viewDirection), 0.0), 3.0);
        float alpha = mask * daylight * (specular * glintIntensity + specular * fresnel * glintIntensity * 0.32);
        gl_FragColor = vec4(glintColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  material.toneMapped = false
  return material
}

function createPhaseRimMaterial(
  color: number,
  intensity: number,
  power: number,
  nightBoost: number,
  terminatorTightness: number,
) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      lightPosition: { value: new THREE.Vector3(0, 0, 0) },
      rimColor: { value: new THREE.Color(color) },
      rimIntensity: { value: intensity },
      rimPower: { value: power },
      nightBoost: { value: nightBoost },
      terminatorTightness: { value: terminatorTightness },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 lightPosition;
      uniform vec3 rimColor;
      uniform float rimIntensity;
      uniform float rimPower;
      uniform float nightBoost;
      uniform float terminatorTightness;
      uniform vec3 cameraPosition;

      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec3 normalDirection = normalize(vWorldNormal);
        vec3 lightDirection = normalize(lightPosition - vWorldPosition);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);

        float fresnel = pow(1.0 - max(dot(normalDirection, viewDirection), 0.0), rimPower);
        float nightSide = pow(max(-dot(normalDirection, lightDirection), 0.0), 1.2) * nightBoost;
        float terminator = pow(max(1.0 - abs(dot(normalDirection, lightDirection)), 0.0), terminatorTightness) * 0.22;
        float alpha = fresnel * (nightSide + terminator) * rimIntensity;
        gl_FragColor = vec4(rimColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  material.toneMapped = false
  return material
}

function createCloudShellMaterial(
  alphaMap: THREE.Texture,
  {
    color,
    opacity,
    nightColor,
    terminatorColor,
    scatterColor,
    scatterStrength = 0.48,
    rimPower = 2.6,
  }: CloudShellOptions,
) {
  return new THREE.ShaderMaterial({
    uniforms: {
      alphaMap: { value: alphaMap },
      lightPosition: { value: new THREE.Vector3(0, 0, 0) },
      cloudColor: { value: new THREE.Color(color) },
      nightColor: { value: new THREE.Color(nightColor) },
      terminatorColor: { value: new THREE.Color(terminatorColor) },
      scatterColor: { value: new THREE.Color(scatterColor) },
      cloudOpacity: { value: opacity },
      scatterStrength: { value: scatterStrength },
      rimPower: { value: rimPower },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D alphaMap;
      uniform vec3 lightPosition;
      uniform vec3 cloudColor;
      uniform vec3 nightColor;
      uniform vec3 terminatorColor;
      uniform vec3 scatterColor;
      uniform float cloudOpacity;
      uniform float scatterStrength;
      uniform float rimPower;
      uniform vec3 cameraPosition;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        float cloudMask = texture2D(alphaMap, vUv).r;
        if (cloudMask < 0.05) {
          discard;
        }

        vec3 normalDirection = normalize(vWorldNormal);
        vec3 lightDirection = normalize(lightPosition - vWorldPosition);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);

        float lightDot = dot(normalDirection, lightDirection);
        float day = smoothstep(0.04, 0.78, lightDot);
        float night = 1.0 - smoothstep(-0.22, 0.12, lightDot);
        float twilight = pow(1.0 - abs(lightDot), 2.3);
        float fresnel = pow(1.0 - max(dot(normalDirection, viewDirection), 0.0), rimPower);
        float forwardScatter = pow(max(dot(-lightDirection, viewDirection), 0.0), 5.6) * twilight;
        float silver = forwardScatter * (0.38 + (fresnel * 0.62)) * scatterStrength;

        vec3 color = mix(nightColor, cloudColor, day);
        color = mix(color, terminatorColor, twilight * 0.52);
        color += scatterColor * silver;

        float density = smoothstep(0.1, 0.76, cloudMask);
        float alpha = density * cloudOpacity * clamp(
          0.22 + (day * 0.56) + (twilight * 0.18) + (night * 0.08) + (silver * 0.42),
          0.0,
          1.0
        );
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
  })
}

function createCloudShadowMaterial(
  alphaMap: THREE.Texture,
  color: number,
  opacity: number,
  offsetScale: number,
) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      alphaMap: { value: alphaMap },
      lightPosition: { value: new THREE.Vector3(0, 0, 0) },
      bodyCenter: { value: new THREE.Vector3(0, 0, 0) },
      shadowColor: { value: new THREE.Color(color) },
      shadowOpacity: { value: opacity },
      shadowOffset: { value: offsetScale },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D alphaMap;
      uniform vec3 lightPosition;
      uniform vec3 bodyCenter;
      uniform vec3 shadowColor;
      uniform float shadowOpacity;
      uniform float shadowOffset;
      uniform vec3 cameraPosition;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec3 normalDirection = normalize(vWorldNormal);
        vec3 lightDirection = normalize(lightPosition - vWorldPosition);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        mat3 worldToLocal = transpose(mat3(modelMatrix));
        vec3 localLight = normalize(worldToLocal * normalize(lightPosition - bodyCenter));

        vec2 sampleUv = vec2(
          fract(vUv.x - (localLight.x * shadowOffset)),
          clamp(vUv.y + (localLight.y * shadowOffset * 0.65), 0.02, 0.98)
        );
        float cloudMask = texture2D(alphaMap, sampleUv).r;
        if (cloudMask < 0.05) {
          discard;
        }

        float daylight = smoothstep(0.08, 0.78, dot(normalDirection, lightDirection));
        float limb = 1.0 - smoothstep(0.28, 0.96, max(dot(normalDirection, viewDirection), 0.0));
        float density = smoothstep(0.1, 0.74, cloudMask);
        float alpha = density * daylight * shadowOpacity * (0.86 + (limb * 0.14));
        gl_FragColor = vec4(shadowColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
  })
  material.toneMapped = false
  return material
}

function createMoonTransitShadowMaterial(opacity: number, softness: number) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      lightPosition: { value: new THREE.Vector3(0, 0, 0) },
      bodyCenter: { value: new THREE.Vector3(0, 0, 0) },
      occluderPosition: { value: new THREE.Vector3(0, 0, 0) },
      occluderCosRadius: { value: 0.995 },
      shadowOpacity: { value: opacity },
      shadowSoftness: { value: softness },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 lightPosition;
      uniform vec3 bodyCenter;
      uniform vec3 occluderPosition;
      uniform float occluderCosRadius;
      uniform float shadowOpacity;
      uniform float shadowSoftness;

      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec3 normalDirection = normalize(vWorldNormal);
        vec3 lightDirection = normalize(lightPosition - vWorldPosition);
        vec3 occluderDirection = normalize(occluderPosition - bodyCenter);

        float daylight = smoothstep(0.08, 0.56, dot(normalDirection, lightDirection));
        float alignment = smoothstep(0.94, 0.998, dot(lightDirection, occluderDirection));
        float disc = smoothstep(occluderCosRadius - shadowSoftness, occluderCosRadius + shadowSoftness, dot(normalDirection, occluderDirection));
        float alpha = daylight * alignment * disc * shadowOpacity;
        gl_FragColor = vec4(vec3(0.018, 0.024, 0.04), alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
  })
  material.toneMapped = false
  return material
}

function createRingShadowMaterial(opacity: number, width: number, softness: number) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      lightPosition: { value: new THREE.Vector3(0, 0, 0) },
      bodyCenter: { value: new THREE.Vector3(0, 0, 0) },
      planeNormal: { value: new THREE.Vector3(0, 1, 0) },
      shadowOpacity: { value: opacity },
      shadowWidth: { value: width },
      shadowSoftness: { value: softness },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 lightPosition;
      uniform vec3 bodyCenter;
      uniform vec3 planeNormal;
      uniform float shadowOpacity;
      uniform float shadowWidth;
      uniform float shadowSoftness;

      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec3 lightDirection = normalize(lightPosition - vWorldPosition);
        vec3 normalDirection = normalize(vWorldNormal);
        float planeDistance = abs(dot(vWorldPosition - bodyCenter, normalize(planeNormal)));
        float band = 1.0 - smoothstep(shadowWidth, shadowWidth + shadowSoftness, planeDistance);
        float daylight = smoothstep(0.04, 0.92, dot(normalDirection, lightDirection));
        float alpha = band * daylight * shadowOpacity;
        gl_FragColor = vec4(vec3(0.02, 0.012, 0.008), alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
  })
  material.toneMapped = false
  return material
}

function createPointSpriteTexture() {
  const canvas = createTextureCanvas(64, 64)
  const context = canvas.getContext('2d')
  if (!context) return createCanvasTexture(canvas)

  const glow = context.createRadialGradient(32, 32, 0, 32, 32, 31)
  glow.addColorStop(0, 'rgba(255,255,255,1)')
  glow.addColorStop(0.28, 'rgba(255,255,255,0.9)')
  glow.addColorStop(0.62, 'rgba(255,255,255,0.28)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = glow
  context.fillRect(0, 0, 64, 64)

  return createCanvasTexture(canvas, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping)
}

function createStarfieldLayer({
  count,
  radiusMin,
  radiusMax,
  verticalScale,
  size,
  opacity,
  palette,
  blending = THREE.NormalBlending,
}: StarfieldLayerOptions) {
  const pointTexture = createPointSpriteTexture()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const color = new THREE.Color()

  for (let index = 0; index < count; index += 1) {
    const radius = THREE.MathUtils.randFloat(radiusMin, radiusMax)
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2)
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2))
    const paletteIndex = Math.min(
      palette.length - 1,
      Math.floor(seededUnit(index + radiusMin) * palette.length),
    )
    const brightness = 0.72 + (seededUnit(index + radiusMax) * 0.36)

    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[(index * 3) + 1] = radius * Math.cos(phi) * verticalScale
    positions[(index * 3) + 2] = radius * Math.sin(phi) * Math.sin(theta)

    color.setStyle(palette[paletteIndex] ?? '#fff5d1')
    colors[index * 3] = color.r * brightness
    colors[(index * 3) + 1] = color.g * brightness
    colors[(index * 3) + 2] = color.b * brightness
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size,
      sizeAttenuation: true,
      map: pointTexture,
      alphaTest: 0.025,
      vertexColors: true,
      transparent: true,
      opacity,
      depthWrite: false,
      blending,
    }),
  )
}

function createDustBandLayer(count: number) {
  const pointTexture = createPointSpriteTexture()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const color = new THREE.Color()

  for (let index = 0; index < count; index += 1) {
    const radius = THREE.MathUtils.randFloat(34, 188)
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2)
    const height = THREE.MathUtils.randFloatSpread(18)
    const warmth = 0.58 + (seededUnit(index + 900) * 0.24)

    positions[index * 3] = Math.cos(theta) * radius
    positions[(index * 3) + 1] = height
    positions[(index * 3) + 2] = Math.sin(theta) * radius

    color.setStyle(index % 3 === 0 ? '#ffd8a1' : index % 2 === 0 ? '#ffe8c6' : '#f1c88a')
    colors[index * 3] = color.r * warmth
    colors[(index * 3) + 1] = color.g * warmth
    colors[(index * 3) + 2] = color.b * warmth
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 1.65,
      sizeAttenuation: true,
      map: pointTexture,
      alphaTest: 0.025,
      vertexColors: true,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
}

function createNebulaSpriteTexture(seed: number, palette: readonly string[]) {
  const canvas = createTextureCanvas(640, 640)
  const context = canvas.getContext('2d')
  if (!context) {
    return createCanvasTexture(canvas, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping)
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  const baseIndex = Math.floor(seededUnit(seed + 1) * palette.length)
  const accentIndex = Math.floor(seededUnit(seed + 2) * palette.length)
  const baseColor = palette[baseIndex] ?? '#f8d8a8'
  const accentColor = palette[accentIndex] ?? '#dfe9ff'

  paintRadialGlow(
    context,
    canvas.width * 0.5,
    canvas.height * 0.5,
    240 + (seededUnit(seed + 3) * 90),
    baseColor,
  )
  paintRadialGlow(
    context,
    canvas.width * (0.32 + (seededUnit(seed + 4) * 0.36)),
    canvas.height * (0.28 + (seededUnit(seed + 5) * 0.44)),
    140 + (seededUnit(seed + 6) * 80),
    accentColor,
  )

  for (let index = 0; index < 8; index += 1) {
    const x = canvas.width * (0.14 + (seededUnit(seed + (index * 7) + 10) * 0.72))
    const y = canvas.height * (0.12 + (seededUnit(seed + (index * 11) + 20) * 0.76))
    const radiusX = 90 + (seededUnit(seed + (index * 13) + 30) * 170)
    const radiusY = 26 + (seededUnit(seed + (index * 17) + 40) * 72)
    const rotation = (seededUnit(seed + (index * 19) + 50) - 0.5) * 1.4
    const color = index % 3 === 0 ? baseColor : accentColor
    paintEllipse(context, x, y, radiusX, radiusY, rotation, color, 0.08 + (seededUnit(seed + (index * 23) + 60) * 0.08))
  }

  return createCanvasTexture(canvas, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping)
}

function createSolarFlareTexture(seed: number, palette: readonly string[]) {
  const canvas = createTextureCanvas(720, 720)
  const context = canvas.getContext('2d')
  if (!context) {
    return createCanvasTexture(canvas, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping)
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  const warm = palette[Math.floor(seededUnit(seed + 1) * palette.length)] ?? 'rgba(255, 224, 178, 0.48)'
  const hot = palette[Math.floor(seededUnit(seed + 2) * palette.length)] ?? 'rgba(255, 170, 94, 0.38)'

  paintRadialGlow(context, canvas.width * 0.5, canvas.height * 0.5, 220, warm)
  paintRadialGlow(context, canvas.width * 0.5, canvas.height * 0.5, 112, hot)

  context.save()
  context.translate(canvas.width * 0.5, canvas.height * 0.5)
  for (let index = 0; index < 6; index += 1) {
    context.save()
    context.rotate(((Math.PI * 2) / 6) * index + ((seededUnit(seed + index + 4) - 0.5) * 0.18))
    const gradient = context.createLinearGradient(-260, 0, 260, 0)
    gradient.addColorStop(0, 'rgba(0,0,0,0)')
    gradient.addColorStop(0.18, warm)
    gradient.addColorStop(0.5, hot)
    gradient.addColorStop(0.82, warm)
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    context.fillStyle = gradient
    context.globalAlpha = 0.08 + (seededUnit(seed + index + 20) * 0.08)
    context.fillRect(-260, -10 - (seededUnit(seed + index + 30) * 10), 520, 20 + (seededUnit(seed + index + 40) * 24))
    context.restore()
  }
  context.restore()

  return createCanvasTexture(canvas, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping)
}

function createNebulaSpriteField({
  count,
  radiusMin,
  radiusMax,
  verticalScale,
  scaleMin,
  scaleMax,
  opacity,
  palette,
  blending = THREE.AdditiveBlending,
  seedOffset = 0,
}: NebulaFieldOptions) {
  const group = new THREE.Group()

  for (let index = 0; index < count; index += 1) {
    const seed = seedOffset + index + 1
    const radius = THREE.MathUtils.randFloat(radiusMin, radiusMax)
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2)
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2))
    const texture = createNebulaSpriteTexture(seed * 37, palette)
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: opacity * (0.72 + (seededUnit(seed + 90) * 0.4)),
      depthWrite: false,
      blending,
    })
    material.toneMapped = false

    const sprite = new THREE.Sprite(material)
    const scale = THREE.MathUtils.randFloat(scaleMin, scaleMax)
    sprite.position.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi) * verticalScale,
      radius * Math.sin(phi) * Math.sin(theta),
    )
    sprite.scale.set(scale, scale * (0.58 + (seededUnit(seed + 120) * 0.62)), 1)
    group.add(sprite)
  }

  return group
}

function createDustVeilTexture(seed: number, palette: readonly string[]) {
  const canvas = createTextureCanvas(1400, 700)
  const context = canvas.getContext('2d')
  if (!context) {
    return createCanvasTexture(canvas, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping)
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  const primary = palette[Math.floor(seededUnit(seed + 4) * palette.length)] ?? '#f3c48d'
  const secondary = palette[Math.floor(seededUnit(seed + 7) * palette.length)] ?? '#ffe3b6'

  for (let index = 0; index < 12; index += 1) {
    const x = canvas.width * (0.08 + (seededUnit(seed + (index * 9) + 10) * 0.84))
    const y = canvas.height * (0.36 + (seededUnit(seed + (index * 13) + 20) * 0.28))
    const radiusX = 180 + (seededUnit(seed + (index * 17) + 30) * 300)
    const radiusY = 24 + (seededUnit(seed + (index * 19) + 40) * 52)
    const rotation = (seededUnit(seed + (index * 23) + 50) - 0.5) * 0.42
    const color = index % 2 === 0 ? primary : secondary
    paintEllipse(context, x, y, radiusX, radiusY, rotation, color, 0.06 + (seededUnit(seed + (index * 29) + 60) * 0.08))
  }

  paintRadialGlow(context, canvas.width * 0.5, canvas.height * 0.5, 260, 'rgba(255, 226, 186, 0.22)')

  return createCanvasTexture(canvas, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping)
}

function createDustVeilLayer(
  texture: THREE.Texture,
  width: number,
  height: number,
  opacity: number,
  color: number,
) {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  material.toneMapped = false
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1, 1), material)
}

function createSolarFlareSprite(
  texture: THREE.Texture,
  width: number,
  height: number,
  opacity: number,
  color: number,
) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  material.toneMapped = false
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(width, height, 1)
  return sprite
}

function createMaskedShadowMaterials(alphaMap: THREE.Texture, alphaTest: number) {
  return {
    customDistanceMaterial: new THREE.MeshDistanceMaterial({
      alphaMap,
      alphaTest,
    }),
    customDepthMaterial: new THREE.MeshDepthMaterial({
      alphaMap,
      alphaTest,
      depthPacking: THREE.RGBADepthPacking,
    }),
  }
}

function disposeMaterialTextures(material: THREE.Material) {
  const textureKeys = ['map', 'alphaMap', 'bumpMap', 'roughnessMap', 'emissiveMap', 'normalMap'] as const

  textureKeys.forEach(key => {
    const texture = (material as Record<string, unknown>)[key]
    if (texture instanceof THREE.Texture) {
      texture.dispose()
    }
  })

  if (material instanceof THREE.ShaderMaterial) {
    Object.values(material.uniforms).forEach(uniform => {
      if (uniform?.value instanceof THREE.Texture) {
        uniform.value.dispose()
      }
    })
  }
}

function disposeObjectResources(root: THREE.Object3D) {
  root.traverse(object => {
    if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry) {
      object.geometry.dispose()
    }

    if ('material' in object) {
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach(material => {
        if (material instanceof THREE.Material) {
          disposeMaterialTextures(material)
          material.dispose()
        }
      })
    }

    if ('customDistanceMaterial' in object && object.customDistanceMaterial instanceof THREE.Material) {
      disposeMaterialTextures(object.customDistanceMaterial)
      object.customDistanceMaterial.dispose()
    }

    if ('customDepthMaterial' in object && object.customDepthMaterial instanceof THREE.Material) {
      disposeMaterialTextures(object.customDepthMaterial)
      object.customDepthMaterial.dispose()
    }
  })
}

function createBodyRuntime(definition: BodyDefinition, anisotropy: number) {
  const group = new THREE.Group()
  const textureSet = createPlanetTextureSet(definition.id)
  const geometry = new THREE.SphereGeometry(definition.radius, 48, 48)
  const material = new THREE.MeshPhysicalMaterial({
    color: definition.color,
    emissive: definition.emissive,
    emissiveIntensity: definition.id === 'earth' ? 0.18 : 0.24,
    roughness: definition.id === 'earth' ? 0.42 : definition.id === 'saturn' ? 0.82 : 0.74,
    metalness: 0,
    map: textureSet.map,
    bumpMap: textureSet.bumpMap,
    bumpScale: definition.id === 'earth' ? 0.18 : definition.id === 'saturn' ? 0.04 : 0.12,
    roughnessMap: textureSet.roughnessMap,
    clearcoat: definition.id === 'earth' ? 0.3 : definition.id === 'venus' ? 0.14 : 0.08,
    clearcoatRoughness: definition.id === 'earth' ? 0.36 : 0.58,
  })
  material.map.anisotropy = anisotropy
  material.bumpMap?.repeat.set(1, 1)
  material.bumpMap && (material.bumpMap.anisotropy = anisotropy)
  material.roughnessMap && (material.roughnessMap.anisotropy = anisotropy)

  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.z = THREE.MathUtils.degToRad(definition.axialTilt)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)

  let atmosphere: BodyRuntime['atmosphere']
  let atmosphereGlow: BodyRuntime['atmosphereGlow']
  let phaseRim: BodyRuntime['phaseRim']
  if (definition.atmosphereColor) {
    atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(definition.radius * 1.025, 40, 40),
      createAtmosphereShellMaterial({
        color: definition.id === 'earth'
          ? 0x9ddfff
          : definition.id === 'venus'
            ? 0xffdfb6
            : definition.id === 'mars'
              ? 0xf2b08a
              : definition.atmosphereColor,
        opacity: (definition.atmosphereOpacity ?? 0.12) * 0.48,
        terminatorColor: definition.id === 'earth'
          ? 0xffd2a8
          : definition.id === 'venus'
            ? 0xffbb7a
            : definition.id === 'mars'
              ? 0xff936c
              : 0xffd8ae,
        nightColor: definition.id === 'earth'
          ? 0x20496c
          : definition.id === 'venus'
            ? 0x5f2810
            : definition.id === 'mars'
              ? 0x4e2118
              : 0x382313,
        twilightStrength: definition.id === 'earth' ? 0.34 : definition.id === 'venus' ? 0.42 : definition.id === 'mars' ? 0.26 : 0.18,
        nightStrength: definition.id === 'venus' ? 0.18 : definition.id === 'earth' ? 0.08 : definition.id === 'mars' ? 0.06 : 0.04,
        limbPower: definition.id === 'venus' ? 1.95 : definition.id === 'earth' ? 2.3 : 2.55,
        limbStrength: definition.id === 'venus' ? 0.58 : definition.id === 'earth' ? 0.46 : 0.34,
      }),
    )
    atmosphere.rotation.z = THREE.MathUtils.degToRad(definition.axialTilt)
    atmosphere.renderOrder = 1
    group.add(atmosphere)

    atmosphereGlow = new THREE.Mesh(
      new THREE.SphereGeometry(definition.radius * 1.08, 32, 32),
      createAtmosphereGlowMaterial({
        color: definition.atmosphereColor,
        intensity: (definition.atmosphereOpacity ?? 0.12) * 1.55,
        power: definition.id === 'mars' ? 3.6 : definition.id === 'venus' ? 2.7 : 3.1,
        terminatorColor: definition.id === 'earth'
          ? 0xffb782
          : definition.id === 'venus'
            ? 0xffbc72
            : definition.id === 'mars'
              ? 0xff8966
              : 0xffd4a2,
        nightColor: definition.id === 'earth'
          ? 0x2b6a9d
          : definition.id === 'venus'
            ? 0x6c2c11
            : definition.id === 'mars'
              ? 0x522117
              : 0x382313,
        twilightStrength: definition.id === 'earth' ? 0.34 : definition.id === 'venus' ? 0.44 : 0.26,
        nightStrength: definition.id === 'venus' ? 0.22 : definition.id === 'earth' ? 0.08 : 0.05,
        daySharpness: definition.id === 'venus' ? 0.95 : definition.id === 'earth' ? 1.45 : 1.8,
      }),
    )
    atmosphereGlow.rotation.z = THREE.MathUtils.degToRad(definition.axialTilt)
    atmosphereGlow.renderOrder = 2
    group.add(atmosphereGlow)
  }

  if (definition.id === 'venus' || definition.id === 'mars' || definition.id === 'mercury') {
    phaseRim = new THREE.Mesh(
      new THREE.SphereGeometry(definition.radius * (definition.id === 'venus' ? 1.05 : 1.018), 40, 40),
      createPhaseRimMaterial(
        definition.id === 'venus' ? 0xffdca8 : definition.id === 'mars' ? 0xf2a47f : 0xc7d3dc,
        definition.id === 'venus' ? 0.72 : definition.id === 'mars' ? 0.2 : 0.12,
        definition.id === 'venus' ? 3.4 : 3.1,
        definition.id === 'venus' ? 1.18 : definition.id === 'mars' ? 0.62 : 0.48,
        definition.id === 'venus' ? 2.5 : 2.1,
      ),
    )
    phaseRim.rotation.z = THREE.MathUtils.degToRad(definition.axialTilt)
    phaseRim.renderOrder = 2
    group.add(phaseRim)
  }

  let cloudShadow: BodyRuntime['cloudShadow']
  let clouds: BodyRuntime['clouds']
  if (definition.clouds && textureSet.alphaMap) {
    cloudShadow = new THREE.Mesh(
      new THREE.SphereGeometry(definition.radius * 1.002, 42, 42),
      createCloudShadowMaterial(
        textureSet.alphaMap,
        definition.id === 'earth' ? 0x11243a : 0x2a1209,
        definition.id === 'earth' ? 0.2 : 0.14,
        definition.id === 'earth' ? 0.018 : 0.012,
      ),
    )
    cloudShadow.rotation.z = THREE.MathUtils.degToRad(definition.axialTilt)
    cloudShadow.renderOrder = 1
    group.add(cloudShadow)

    textureSet.alphaMap.anisotropy = anisotropy
    clouds = new THREE.Mesh(
      new THREE.SphereGeometry(definition.radius * definition.clouds.altitude, 42, 42),
      createCloudShellMaterial(textureSet.alphaMap, {
        color: definition.clouds.color,
        opacity: definition.clouds.opacity,
        nightColor: definition.id === 'earth' ? 0x345671 : 0x6d4423,
        terminatorColor: definition.id === 'earth' ? 0xf5f0e4 : 0xffd8ac,
        scatterColor: definition.id === 'earth' ? 0xdff6ff : 0xffefc8,
        scatterStrength: definition.id === 'earth' ? 0.42 : 0.56,
        rimPower: definition.id === 'earth' ? 2.8 : 2.25,
      }),
    )
    clouds.rotation.z = THREE.MathUtils.degToRad(definition.axialTilt)
    clouds.renderOrder = 2
    const cloudShadowMaterials = createMaskedShadowMaterials(textureSet.alphaMap, 0.14)
    clouds.customDistanceMaterial = cloudShadowMaterials.customDistanceMaterial
    clouds.customDepthMaterial = cloudShadowMaterials.customDepthMaterial
    clouds.castShadow = true
    clouds.receiveShadow = true
    group.add(clouds)
  }

  let glint: BodyRuntime['glint']
  if (definition.id === 'earth' && textureSet.glintMap) {
    glint = new THREE.Mesh(
      new THREE.SphereGeometry(definition.radius * 1.01, 42, 42),
      createSurfaceGlintMaterial(textureSet.glintMap, 0xbfe8ff, 1.7, 92),
    )
    glint.rotation.z = THREE.MathUtils.degToRad(definition.axialTilt)
    glint.renderOrder = 1
    group.add(glint)
  }

  let nightLights: BodyRuntime['nightLights']
  if (definition.id === 'earth' && textureSet.nightMap) {
    nightLights = new THREE.Mesh(
      new THREE.SphereGeometry(definition.radius * 1.006, 42, 42),
      createNightLightsMaterial(textureSet.nightMap, 1.9),
    )
    nightLights.rotation.z = THREE.MathUtils.degToRad(definition.axialTilt)
    nightLights.renderOrder = 1
    group.add(nightLights)
  }

  let moonTransitShadow: BodyRuntime['moonTransitShadow']
  if (definition.id === 'earth' && definition.moon) {
    moonTransitShadow = new THREE.Mesh(
      new THREE.SphereGeometry(definition.radius * 1.008, 42, 42),
      createMoonTransitShadowMaterial(0.32, 0.0036),
    )
    moonTransitShadow.rotation.z = THREE.MathUtils.degToRad(definition.axialTilt)
    moonTransitShadow.renderOrder = 1
    group.add(moonTransitShadow)
  }

  let earthshineLight: BodyRuntime['earthshineLight']
  if (definition.id === 'earth') {
    earthshineLight = new THREE.PointLight(0x7cbcff, 0.12, 34, 2)
    earthshineLight.position.set(0, 0, 0)
    group.add(earthshineLight)
  }

  let ring: BodyRuntime['ring']
  let ringGlow: BodyRuntime['ringGlow']
  let ringShadow: BodyRuntime['ringShadow']
  if (definition.ring) {
    const ringTextures = createSaturnRingTextureSet()
    const ringGroup = new THREE.Group()
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: ringTextures.map,
      alphaMap: ringTextures.alphaMap,
      transparent: true,
      opacity: 0.92,
      alphaTest: 0.16,
      side: THREE.DoubleSide,
      roughness: 0.86,
      metalness: 0.02,
      emissive: 0x44301c,
      emissiveIntensity: 0.08,
      depthWrite: false,
    })
    ringMaterial.map.anisotropy = anisotropy
    ringMaterial.alphaMap.anisotropy = anisotropy

    ring = new THREE.Mesh(
      new THREE.RingGeometry(definition.ring.inner, definition.ring.outer, 240, 12),
      ringMaterial,
    )
    const ringShadowMaterials = createMaskedShadowMaterials(ringTextures.alphaMap, 0.16)
    ring.customDistanceMaterial = ringShadowMaterials.customDistanceMaterial
    ring.customDepthMaterial = ringShadowMaterials.customDepthMaterial
    ring.castShadow = true
    ring.receiveShadow = true

    ringGlow = new THREE.Mesh(
      new THREE.RingGeometry(definition.ring.inner * 0.98, definition.ring.outer * 1.04, 200, 8),
      createRingScatteringMaterial(
        ringTextures.alphaMap,
        0xffd6a0,
        0xfff0c5,
        0.16,
        4.6,
      ),
    )

    ring.rotation.x = Math.PI / 2
    ringGlow.rotation.x = Math.PI / 2
    ringGroup.rotation.z = THREE.MathUtils.degToRad(definition.ring.tilt)
    ringGroup.add(ringGlow, ring)
    group.add(ringGroup)

    ringShadow = new THREE.Mesh(
      new THREE.SphereGeometry(definition.radius * 1.01, 48, 48),
      createRingShadowMaterial(0.26, definition.radius * 0.12, definition.radius * 0.1),
    )
    ringShadow.rotation.z = THREE.MathUtils.degToRad(definition.axialTilt)
    ringShadow.renderOrder = 1
    group.add(ringShadow)
  }

  let moonOrbit: BodyRuntime['moonOrbit']
  let moonMesh: BodyRuntime['moonMesh']
  let moonPhaseRim: BodyRuntime['moonPhaseRim']
  let moonLine: BodyRuntime['moonLine']

  if (definition.moon) {
    moonOrbit = new THREE.Group()
    moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(definition.moon.radius, 24, 24),
      new THREE.MeshStandardMaterial({
        color: definition.moon.color,
        emissive: 0x1a1510,
        roughness: 0.94,
        metalness: 0,
      }),
    )
    moonMesh.castShadow = true
    moonMesh.receiveShadow = true
    moonOrbit.add(moonMesh)

    moonPhaseRim = new THREE.Mesh(
      new THREE.SphereGeometry(definition.moon.radius * 1.03, 28, 28),
      createPhaseRimMaterial(0xe8edf7, 0.28, 3.5, 0.88, 2.3),
    )
    moonPhaseRim.renderOrder = 2
    moonOrbit.add(moonPhaseRim)

    moonLine = createOrbitLine(definition.moon.distance, 28, 16, 0x98a8c9, 0.18)
    group.add(moonLine)
    group.add(moonOrbit)
  }

  return {
    definition,
    group,
    mesh,
    atmosphere,
    atmosphereGlow,
    phaseRim,
    cloudShadow,
    clouds,
    glint,
    nightLights,
    moonTransitShadow,
    ring,
    ringGlow,
    ringShadow,
    earthshineLight,
    moonOrbit,
    moonMesh,
    moonPhaseRim,
    moonLine,
  }
}

export function StarFocusOrbitalMap3D({
  className,
  liveLabel,
  destinationLabel,
  missionHistory,
  activeSession,
  activeSnapshot,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const activeSessionRef = useRef(activeSession)
  const activeSnapshotRef = useRef(activeSnapshot)
  const missionHistoryRef = useRef(missionHistory)
  const [camera, setCamera] = useState(DEFAULT_CAMERA)
  const cameraRef = useRef(DEFAULT_CAMERA)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<DragState | null>(null)
  const latestMission = missionHistory[0] ?? null
  const hasLiveFlight = Boolean(activeSession && activeSnapshot)
  const topHud = destinationLabel
    ? { label: hasLiveFlight ? 'Destination' : 'Next stop', value: destinationLabel }
    : hasLiveFlight
      ? { label: 'Track', value: activeSnapshot?.isPaused ? 'Hold' : liveLabel }
      : latestMission
        ? { label: 'Latest', value: latestMission.vehicleCode }
        : { label: 'Grid', value: 'Standby' }
  const bottomHud = hasLiveFlight && activeSnapshot
    ? { label: 'T-Remain', value: formatClock(activeSnapshot.remainingMs) }
    : missionHistory.length
      ? { label: 'Archive', value: `${missionHistory.length} retained` }
      : { label: 'Archive', value: 'Empty' }
  const tiltMode = camera.tilt > 0.2 ? 'above' : camera.tilt < -0.2 ? 'below' : 'level'

  useEffect(() => {
    activeSessionRef.current = activeSession
  }, [activeSession])

  useEffect(() => {
    activeSnapshotRef.current = activeSnapshot
  }, [activeSnapshot])

  useEffect(() => {
    missionHistoryRef.current = missionHistory
  }, [missionHistory])

  useEffect(() => {
    if (!mountRef.current) return

    const mount = mountRef.current
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.className = 'starmap-3d-canvas'
    renderer.domElement.setAttribute('aria-hidden', 'true')

    mount.innerHTML = ''
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x060302, 120, 340)

    const world = new THREE.Group()
    scene.add(world)

    const camera3D = new THREE.PerspectiveCamera(38, 1, 0.1, 1000)

    const ambientLight = new THREE.AmbientLight(0x9a8763, 0.7)
    const hemisphereLight = new THREE.HemisphereLight(0x87c8ff, 0x1b110a, 0.52)
    const sunLight = new THREE.PointLight(0xffd390, 2.6, 420, 2)
    sunLight.position.set(0, 0, 0)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.set(1536, 1536)
    sunLight.shadow.camera.near = 8
    sunLight.shadow.camera.far = 220
    sunLight.shadow.bias = -0.00055
    sunLight.shadow.normalBias = 0.024
    sunLight.shadow.radius = 2.2
    const rimLight = new THREE.DirectionalLight(0x84cfff, 0.36)
    rimLight.position.set(-80, 42, -54)
    scene.add(ambientLight, hemisphereLight, sunLight, rimLight)

    const sunGroup = new THREE.Group()
    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(12, 40, 40),
      new THREE.MeshBasicMaterial({
        color: 0xffc861,
      }),
    )
    const sunCoronaMaterial = new THREE.MeshBasicMaterial({
      color: 0xffa84a,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const sunCorona = new THREE.Mesh(
      new THREE.SphereGeometry(18, 32, 32),
      sunCoronaMaterial,
    )
    const sunHaloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe4a6,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const sunHalo = new THREE.Mesh(
      new THREE.SphereGeometry(24, 28, 28),
      sunHaloMaterial,
    )
    const solarFlareTexture = createSolarFlareTexture(7, [
      'rgba(255, 234, 194, 0.42)',
      'rgba(255, 181, 97, 0.34)',
      'rgba(255, 208, 144, 0.3)',
    ])
    const solarFlareBloom = createSolarFlareSprite(solarFlareTexture, 108, 108, 0.18, 0xffdfb3)
    const solarFlareStreak = createSolarFlareSprite(solarFlareTexture, 178, 40, 0.11, 0xffc98d)
    const solarFlareCross = createSolarFlareSprite(solarFlareTexture, 82, 160, 0.08, 0xffd8aa)
    const solarScatterVeil = createDustVeilLayer(
      createDustVeilTexture(44, [
        'rgba(255, 214, 152, 0.2)',
        'rgba(255, 240, 210, 0.12)',
        'rgba(255, 165, 82, 0.1)',
      ]),
      172,
      84,
      0.24,
      0xffcd8d,
    )
    solarScatterVeil.rotation.x = -Math.PI / 2
    solarScatterVeil.rotation.z = THREE.MathUtils.degToRad(14)
    solarScatterVeil.position.y = 0.4
    sunGroup.add(solarScatterVeil, solarFlareBloom, solarFlareStreak, solarFlareCross, sunHalo, sunCorona, sunCore)
    world.add(sunGroup)

    const farStars = createStarfieldLayer({
      count: FAR_STAR_COUNT,
      radiusMin: 190,
      radiusMax: 340,
      verticalScale: 0.84,
      size: 1.05,
      opacity: 0.5,
      palette: ['#fef2d2', '#d8eeff', '#fff0c7', '#ffd9b0'],
    })
    const nearStars = createStarfieldLayer({
      count: NEAR_STAR_COUNT,
      radiusMin: 118,
      radiusMax: 236,
      verticalScale: 0.72,
      size: 1.75,
      opacity: 0.82,
      palette: ['#fff4d7', '#cde6ff', '#ffe1bf'],
      blending: THREE.AdditiveBlending,
    })
    const dustBand = createDustBandLayer(DUST_MOTE_COUNT)
    const farNebulae = createNebulaSpriteField({
      count: FAR_NEBULA_COUNT,
      radiusMin: 220,
      radiusMax: 360,
      verticalScale: 0.76,
      scaleMin: 64,
      scaleMax: 118,
      opacity: 0.12,
      palette: ['rgba(255, 212, 158, 0.34)', 'rgba(210, 227, 255, 0.22)', 'rgba(255, 241, 210, 0.28)'],
      seedOffset: 100,
    })
    const nearNebulae = createNebulaSpriteField({
      count: NEAR_NEBULA_COUNT,
      radiusMin: 142,
      radiusMax: 248,
      verticalScale: 0.64,
      scaleMin: 42,
      scaleMax: 82,
      opacity: 0.14,
      palette: ['rgba(255, 226, 186, 0.3)', 'rgba(183, 212, 255, 0.2)', 'rgba(255, 205, 156, 0.24)'],
      seedOffset: 300,
    })
    const warmDustVeil = createDustVeilLayer(
      createDustVeilTexture(11, ['rgba(255, 209, 152, 0.16)', 'rgba(255, 235, 196, 0.12)', 'rgba(255, 173, 110, 0.1)']),
      320,
      154,
      0.32,
      0xf6cb8e,
    )
    warmDustVeil.rotation.x = -Math.PI / 2
    warmDustVeil.rotation.z = THREE.MathUtils.degToRad(9)

    const coolDustVeil = createDustVeilLayer(
      createDustVeilTexture(27, ['rgba(186, 214, 255, 0.12)', 'rgba(255, 228, 192, 0.08)', 'rgba(138, 176, 255, 0.08)']),
      360,
      188,
      0.14,
      0xa7c8ff,
    )
    coolDustVeil.rotation.x = -Math.PI / 2
    coolDustVeil.rotation.z = THREE.MathUtils.degToRad(-18)
    coolDustVeil.position.y = -4

    scene.add(farNebulae, nearNebulae, warmDustVeil, coolDustVeil, farStars, nearStars, dustBand)

    const orbitGroup = new THREE.Group()
    BODY_DEFINITIONS.forEach(definition => {
      orbitGroup.add(createOrbitLine(definition.orbitRadius, definition.orbitInclination, definition.orbitLongitude, 0x9fd1ff, definition.id === 'saturn' ? 0.16 : 0.1))
    })
    world.add(orbitGroup)

    const bodyRuntimes = BODY_DEFINITIONS.map(definition => createBodyRuntime(definition, renderer.capabilities.getMaxAnisotropy()))
    bodyRuntimes.forEach(runtime => {
      world.add(runtime.group)
    })

    const archiveOrbitGroup = new THREE.Group()
    ARCHIVE_LANES.forEach(lane => {
      archiveOrbitGroup.add(createOrbitLine(lane.radius, lane.inclination, lane.longitude, 0xffd68a, 0.06))
    })
    world.add(archiveOrbitGroup)

    const archiveMarkersGroup = new THREE.Group()
    world.add(archiveMarkersGroup)

    const missionCurve = buildMissionCurve()
    const guideTrailMaterial = new THREE.LineBasicMaterial({
      color: 0x8dcfff,
      transparent: true,
      opacity: 0.14,
    })
    const guideTrail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(missionCurve.getPoints(TRAIL_SAMPLE_COUNT)),
      guideTrailMaterial,
    )
    world.add(guideTrail)

    const liveTrailMaterial = new THREE.LineBasicMaterial({
      color: 0xffc56c,
      transparent: true,
      opacity: 0.88,
    })
    const liveTrail = new THREE.Line(new THREE.BufferGeometry(), liveTrailMaterial)
    world.add(liveTrail)

    const craftGroup = new THREE.Group()
    const craftBody = new THREE.Mesh(
      new THREE.ConeGeometry(1.7, 5.4, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffcc72,
        emissive: 0x6c3e10,
        emissiveIntensity: 0.52,
        roughness: 0.28,
        metalness: 0.16,
      }),
    )
    craftBody.rotation.z = -Math.PI / 2
    craftBody.castShadow = true
    craftBody.receiveShadow = true
    const craftCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.96, 20, 20),
      new THREE.MeshBasicMaterial({
        color: 0xfff3d2,
      }),
    )
    craftCore.castShadow = true
    craftCore.receiveShadow = true
    const craftFlame = new THREE.Mesh(
      new THREE.ConeGeometry(1.05, 3.2, 8),
      new THREE.MeshBasicMaterial({
        color: 0xffb467,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    craftFlame.rotation.z = Math.PI / 2
    craftFlame.position.x = -2.8
    craftGroup.add(craftFlame, craftBody, craftCore)
    craftGroup.visible = false
    world.add(craftGroup)

    const resize = () => {
      const width = Math.max(mount.clientWidth, 1)
      const height = Math.max(mount.clientHeight, 1)
      renderer.setSize(width, height, false)
      camera3D.aspect = width / height
      camera3D.updateProjectionMatrix()
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)
    resize()

    const target = new THREE.Vector3(0, 0, 0)
    const orbitVector = new THREE.Vector3()
    const viewVector = new THREE.Vector3()
    const lightVector = new THREE.Vector3()
    const bodyWorldPosition = new THREE.Vector3()
    const bodyToMoonVector = new THREE.Vector3()
    const moonDirection = new THREE.Vector3()
    const moonWorldPosition = new THREE.Vector3()
    const shadowAxisVector = new THREE.Vector3()
    const radialShadowVector = new THREE.Vector3()
    const ringNormal = new THREE.Vector3()
    const ringQuaternion = new THREE.Quaternion()
    const moonBaseColor = new THREE.Color()
    const moonEclipseColor = new THREE.Color(0x8a3f2c)
    const archiveMarkerGeometry = new THREE.SphereGeometry(0.85, 16, 16)
    const archiveHaloGeometry = new THREE.SphereGeometry(1.8, 16, 16)
    let renderedHistoryKey = ''

    const clearArchiveMarkers = () => {
      archiveMarkersGroup.children.forEach(marker => {
        marker.traverse(object => {
          if (object instanceof THREE.Mesh) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose())
            } else {
              object.material.dispose()
            }
          }
        })
      })
      archiveMarkersGroup.clear()
    }

    const syncArchiveMarkers = () => {
      renderedHistoryKey = historyKey(missionHistoryRef.current)
      clearArchiveMarkers()

      missionHistoryRef.current.slice(0, 12).forEach((mission, index) => {
        const marker = new THREE.Group()
        const core = new THREE.Mesh(
          archiveMarkerGeometry,
          new THREE.MeshBasicMaterial({
            color: index === 0 ? 0xffd08b : 0x9fcfff,
          }),
        )
        const halo = new THREE.Mesh(
          archiveHaloGeometry,
          new THREE.MeshBasicMaterial({
            color: index === 0 ? 0xffd08b : 0x7abfff,
            transparent: true,
            opacity: index === 0 ? 0.18 : 0.08,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        )
        marker.position.copy(historyMarkerPosition(mission.orbitIndex))
        marker.add(halo, core)
        archiveMarkersGroup.add(marker)
      })
    }

    syncArchiveMarkers()

    const clock = new THREE.Clock()
    let animationFrame = 0

    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const elapsed = clock.elapsedTime

      const currentCamera = cameraRef.current
      orbitVector.set(
        Math.cos(currentCamera.tilt) * Math.cos(currentCamera.yaw),
        Math.sin(currentCamera.tilt) * 0.84,
        Math.cos(currentCamera.tilt) * Math.sin(currentCamera.yaw),
      ).normalize().multiplyScalar(currentCamera.distance)
      camera3D.position.copy(orbitVector)
      camera3D.lookAt(target)

      const phase = activeSnapshotRef.current?.phase ?? 'idle'
      const phaseTone = PHASE_COLORS[phase]
      const phaseAtmosphereBoost = phase === 'heating' ? 1.32 : phase === 'ignition' ? 1.18 : phase === 'orbit' ? 0.92 : 1
      const phaseGlowBoost = phase === 'heating' ? 1.18 : phase === 'ignition' ? 1.12 : phase === 'orbit' ? 0.88 : 1
      sunLight.color.setHex(phaseTone.accent)
      sunLight.intensity = phase === 'heating' ? 3.0 : phase === 'ignition' ? 2.8 : phase === 'orbit' ? 2.4 : 2.6
      ambientLight.intensity = phase === 'orbit' ? 0.62 : 0.7
      rimLight.intensity = phase === 'heating' ? 0.48 : phase === 'orbit' ? 0.3 : 0.36
      guideTrailMaterial.color.setHex(phaseTone.soft)
      liveTrailMaterial.color.setHex(phaseTone.accent)
      sunCoronaMaterial.color.setHex(phaseTone.accent)
      sunCoronaMaterial.opacity = phase === 'heating' ? 0.24 : phase === 'ignition' ? 0.2 : 0.16
      sunHaloMaterial.opacity = phase === 'heating' ? 0.12 : 0.08
      sunCore.scale.setScalar(phase === 'heating' ? 1.04 : 1)
      solarFlareBloom.material.opacity = phase === 'heating' ? 0.24 : phase === 'ignition' ? 0.21 : phase === 'orbit' ? 0.16 : 0.18
      solarFlareBloom.material.color.setHex(phase === 'orbit' ? 0xffe4c5 : phaseTone.accent)
      solarFlareBloom.scale.setScalar((phase === 'heating' ? 114 : phase === 'ignition' ? 111 : 108) + (Math.sin(elapsed * 0.7) * 4))
      solarFlareStreak.material.opacity = phase === 'heating' ? 0.16 : phase === 'ignition' ? 0.13 : 0.11
      solarFlareStreak.material.color.setHex(phase === 'heating' ? 0xffb36d : 0xffc98d)
      solarFlareStreak.scale.set(176 + (Math.sin(elapsed * 0.48) * 10), 40 + (Math.cos(elapsed * 0.52) * 3), 1)
      solarFlareCross.material.opacity = phase === 'heating' ? 0.11 : 0.08
      solarFlareCross.scale.set(82 + (Math.cos(elapsed * 0.44) * 6), 158 + (Math.sin(elapsed * 0.39) * 8), 1)
      solarScatterVeil.material.opacity = (phase === 'heating' ? 0.31 : phase === 'ignition' ? 0.27 : 0.24) + (Math.sin(elapsed * 0.18) * 0.016)
      solarScatterVeil.rotation.z = THREE.MathUtils.degToRad(14) + (Math.sin(elapsed * 0.16) * 0.05)

      bodyRuntimes.forEach(runtime => {
        const { definition, group, mesh, atmosphere, atmosphereGlow, phaseRim, cloudShadow, clouds, glint, nightLights, moonTransitShadow, ring, ringGlow, ringShadow, earthshineLight, moonOrbit, moonMesh, moonPhaseRim } = runtime
        const angle = definition.baseAngle + (elapsed * definition.orbitSpeed * 180 / Math.PI)
        group.position.copy(
          orbitalPosition(
            definition.orbitRadius,
            angle,
            definition.orbitInclination,
            definition.orbitLongitude,
          ),
        )
        group.getWorldPosition(bodyWorldPosition)
        lightVector.copy(bodyWorldPosition).normalize().multiplyScalar(-1)

        mesh.rotation.y += delta * definition.spinSpeed
        mesh.material.emissiveIntensity = definition.id === 'earth'
          ? 0.18 + (phase === 'heating' ? 0.03 : 0)
          : definition.id === 'saturn'
            ? 0.22 + (phase === 'ignition' ? 0.03 : 0)
            : 0.24 + (phase === 'ignition' ? 0.04 : 0)

        if (atmosphere) {
          atmosphere.material.uniforms.shellOpacity.value = (definition.atmosphereOpacity ?? 0.12) * 0.48 * phaseAtmosphereBoost
          atmosphere.rotation.y += delta * definition.spinSpeed * 0.18
        }

        if (atmosphereGlow) {
          atmosphereGlow.material.uniforms.glowIntensity.value = (definition.atmosphereOpacity ?? 0.12) * 1.55 * phaseGlowBoost
          atmosphereGlow.rotation.y += delta * definition.spinSpeed * 0.1
        }

        if (phaseRim) {
          phaseRim.rotation.y += delta * definition.spinSpeed
        }

        if (cloudShadow && definition.clouds) {
          cloudShadow.material.uniforms.bodyCenter.value.copy(bodyWorldPosition)
          cloudShadow.material.uniforms.shadowOpacity.value = (definition.id === 'earth' ? 0.2 : 0.14) * (phase === 'heating' ? 1.08 : 1)
          cloudShadow.rotation.y += delta * definition.clouds.speed
        }

        if (clouds && definition.clouds) {
          clouds.material.uniforms.cloudOpacity.value = definition.clouds.opacity * (phase === 'heating' ? 1.06 : 1)
          clouds.material.uniforms.scatterStrength.value = (definition.id === 'earth' ? 0.42 : 0.56) * (phase === 'heating' ? 1.08 : 1)
          clouds.rotation.y += delta * definition.clouds.speed
        }

        if (glint) {
          glint.rotation.y += delta * definition.spinSpeed
          glint.material.uniforms.glintIntensity.value = phase === 'heating' ? 1.84 : 1.7
        }

        if (nightLights) {
          nightLights.rotation.y += delta * definition.spinSpeed
          nightLights.material.uniforms.glowIntensity.value = phase === 'heating' ? 2.05 : 1.9
        }

        if (ring && ringGlow) {
          ring.getWorldQuaternion(ringQuaternion)
          ringNormal.set(0, 0, 1).applyQuaternion(ringQuaternion).normalize()
          viewVector.copy(camera3D.position).sub(bodyWorldPosition).normalize()
          const ringFace = Math.abs(ringNormal.dot(viewVector))
          const ringLight = Math.abs(ringNormal.dot(lightVector))
          ring.material.opacity = 0.32 + (ringFace * 0.28) + (ringLight * 0.24)
          ring.material.emissiveIntensity = 0.04 + (ringLight * 0.12)
          ringGlow.material.uniforms.scatterIntensity.value = 0.04 + (ringFace * 0.08) + (ringLight * 0.18)
        }

        if (ringShadow) {
          ringShadow.material.uniforms.bodyCenter.value.copy(bodyWorldPosition)
          ringShadow.material.uniforms.planeNormal.value.copy(ringNormal)
        }

        if (moonOrbit && definition.moon) {
          const moonAngle = definition.moon.baseAngle + (elapsed * definition.moon.speed * 180 / Math.PI)
          moonOrbit.position.copy(orbitalPosition(definition.moon.distance, moonAngle, 28, 16))
          moonOrbit.getWorldPosition(moonWorldPosition)
          bodyToMoonVector.copy(moonWorldPosition).sub(bodyWorldPosition)
          const moonDistance = bodyToMoonVector.length()
          moonDirection.copy(bodyToMoonVector).normalize()

          if (earthshineLight) {
            earthshineLight.intensity = 0.08 + (Math.max(moonDirection.dot(lightVector), 0) * 0.18)
          }

          if (moonTransitShadow) {
            moonTransitShadow.material.uniforms.bodyCenter.value.copy(bodyWorldPosition)
            moonTransitShadow.material.uniforms.occluderPosition.value.copy(moonWorldPosition)
            moonTransitShadow.material.uniforms.occluderCosRadius.value = Math.cos(Math.atan(definition.moon.radius / moonDistance))
          }

          if (moonMesh) {
            moonMesh.rotation.y += delta * 0.05
          }

          if (moonPhaseRim) {
            moonPhaseRim.rotation.y += delta * 0.05
          }

          if (moonMesh) {
            shadowAxisVector.copy(lightVector).multiplyScalar(-1)
            const shadowDepth = bodyToMoonVector.dot(shadowAxisVector)
            radialShadowVector.copy(shadowAxisVector).multiplyScalar(shadowDepth)
            radialShadowVector.copy(bodyToMoonVector).sub(radialShadowVector)
            const radialDistance = radialShadowVector.length()
            const eclipseDepth = shadowDepth <= 0
              ? 0
              : THREE.MathUtils.smoothstep(shadowDepth, definition.moon.distance * 0.1, definition.moon.distance * 0.55)
                * (1 - THREE.MathUtils.smoothstep(radialDistance, definition.radius * 0.72, definition.radius * 1.14))

            moonBaseColor.setHex(definition.moon.color)
            moonMesh.material.color.copy(moonBaseColor).lerp(moonEclipseColor, eclipseDepth * 0.88)
            moonMesh.material.emissive.setRGB(0.34 * eclipseDepth, 0.08 * eclipseDepth, 0.05 * eclipseDepth)
            moonMesh.material.emissiveIntensity = eclipseDepth * 0.58
          }
        } else if (earthshineLight) {
          earthshineLight.intensity = 0.12
          if (moonMesh && definition.moon) {
            moonMesh.material.color.setHex(definition.moon.color)
            moonMesh.material.emissive.setRGB(0, 0, 0)
            moonMesh.material.emissiveIntensity = 0
          }
        }
      })

      if (renderedHistoryKey !== historyKey(missionHistoryRef.current)) {
        syncArchiveMarkers()
      }

      if (activeSessionRef.current && activeSnapshotRef.current) {
        const snapshot = activeSnapshotRef.current
        const progress = clamp(snapshot.progress, 0, 1)
        const trailPoints = missionCurve.getPoints(Math.max(3, Math.round(progress * TRAIL_SAMPLE_COUNT)))
        liveTrail.geometry.setFromPoints(trailPoints)
        craftGroup.visible = true
        craftFlame.visible = !snapshot.isPaused

        const point = missionCurve.getPoint(progress)
        const tangent = missionCurve.getTangent(progress).normalize()
        craftGroup.position.copy(point)
        craftGroup.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tangent)

        const pulseScale = snapshot.isPaused ? 0.96 : 1 + (Math.sin(elapsed * 14) * 0.06)
        craftFlame.scale.set(pulseScale, pulseScale, pulseScale)
      } else {
        craftGroup.visible = false
        liveTrail.geometry.setFromPoints([])
      }

      world.rotation.y = Math.sin(elapsed * 0.08) * 0.04
      farNebulae.rotation.y += delta * 0.0005
      farNebulae.rotation.x = Math.sin(elapsed * 0.018) * 0.05
      farNebulae.rotation.z = Math.sin(elapsed * 0.012) * 0.04
      nearNebulae.rotation.y -= delta * 0.0012
      nearNebulae.rotation.x = Math.sin(elapsed * 0.026) * 0.06
      warmDustVeil.rotation.z = THREE.MathUtils.degToRad(9) + (Math.sin(elapsed * 0.022) * 0.06)
      warmDustVeil.material.opacity = 0.28 + (Math.sin(elapsed * 0.034) * 0.02)
      coolDustVeil.rotation.z = THREE.MathUtils.degToRad(-18) - (Math.sin(elapsed * 0.018) * 0.05)
      coolDustVeil.material.opacity = 0.12 + (Math.cos(elapsed * 0.028) * 0.015)
      farStars.rotation.y += delta * 0.0012
      farStars.rotation.x = Math.sin(elapsed * 0.032) * 0.04
      nearStars.rotation.y -= delta * 0.0028
      nearStars.rotation.x = Math.sin(elapsed * 0.05) * 0.06
      dustBand.rotation.y = elapsed * 0.005
      dustBand.rotation.z = Math.sin(elapsed * 0.028) * 0.08
      renderer.render(scene, camera3D)
    }

    animate()

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      clearArchiveMarkers()
      archiveMarkerGeometry.dispose()
      archiveHaloGeometry.dispose()
      disposeObjectResources(scene)
      renderer.dispose()
      mount.innerHTML = ''
    }
  }, [])

  function updateCamera(nextCamera: CameraState | ((previous: CameraState) => CameraState)) {
    setCamera(previous => {
      const resolved = normalizeCamera(typeof nextCamera === 'function' ? nextCamera(previous) : nextCamera)
      cameraRef.current = resolved
      return resolved
    })
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCamera: cameraRef.current,
    }
    setIsDragging(true)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return

    const deltaX = event.clientX - dragRef.current.startX
    const deltaY = event.clientY - dragRef.current.startY

    updateCamera({
      ...dragRef.current.startCamera,
      yaw: dragRef.current.startCamera.yaw + (deltaX * CAMERA_LIMITS.dragYawFactor),
      tilt: dragRef.current.startCamera.tilt - (deltaY * CAMERA_LIMITS.dragTiltFactor),
    })
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    dragRef.current = null
    setIsDragging(false)
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault()
    const distanceDelta = event.deltaY < 0 ? -CAMERA_LIMITS.zoomStep : CAMERA_LIMITS.zoomStep
    updateCamera(previous => ({
      ...previous,
      distance: previous.distance + distanceDelta,
    }))
  }

  function handleZoom(delta: number) {
    updateCamera(previous => ({
      ...previous,
      distance: previous.distance + delta,
    }))
  }

  function handleTilt(tilt: number) {
    updateCamera(previous => ({
      ...previous,
      tilt,
    }))
  }

  function resetCamera() {
    updateCamera(DEFAULT_CAMERA)
  }

  return (
    <div
      className={`starmap-viewport variant-overlay starmap-3d-viewport ${className ?? ''} ${hasLiveFlight ? 'is-live' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      <div
        className="starmap-scene-frame starmap-3d-frame"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onWheel={handleWheel}
        onDoubleClick={resetCamera}
        title="Drag to orbit camera. Scroll to zoom."
      >
        <div className="starmap-grid" />
        <div className="starmap-nebula" />
        <div className="starmap-glow" />
        <div ref={mountRef} className="starmap-3d-stage" />
        <div className="starmap-sweep" />
        <div className="starmap-phase-wash" />
        <div className="starmap-vignette" />
      </div>

      <div className="starmap-controls">
        <div className="starmap-control-row">
          <button className="starmap-control-btn" onClick={() => handleZoom(CAMERA_LIMITS.zoomStep)} title="Zoom out">-</button>
          <span className="starmap-control-readout">{(DEFAULT_CAMERA.distance / camera.distance).toFixed(1)}x</span>
          <button className="starmap-control-btn" onClick={() => handleZoom(-CAMERA_LIMITS.zoomStep)} title="Zoom in">+</button>
        </div>
        <div className="starmap-control-row">
          <button
            className={`starmap-control-btn ${tiltMode === 'above' ? 'active' : ''}`}
            onClick={() => handleTilt(0.64)}
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
            onClick={() => handleTilt(-0.38)}
            title="View from below"
          >
            Below
          </button>
          <button className="starmap-control-btn" onClick={resetCamera} title="Reset camera">Reset</button>
        </div>
      </div>

      <div className="starmap-hud top-left">
        <span>{topHud.label}</span>
        <strong>{topHud.value}</strong>
      </div>

      <div className="starmap-hud bottom-right">
        <span>{bottomHud.label}</span>
        <strong>{bottomHud.value}</strong>
      </div>
    </div>
  )
}
