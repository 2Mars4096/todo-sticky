import type { StarFocusMissionRecord } from './types'

interface JourneyStop {
  name: string
  code: string
  orbit: string
}

export interface StarFocusJourneyLeg {
  orbitIndex: number
  tour: number
  legNumber: number
  legCount: number
  origin: JourneyStop
  destination: JourneyStop
}

const EARTH: JourneyStop = {
  name: 'Earth',
  code: 'HOME',
  orbit: 'Home orbit',
}

const SOLAR_ROUTE: JourneyStop[] = [
  { name: 'Moon', code: 'LUNA', orbit: 'Lunar orbit' },
  { name: 'Venus', code: 'VENUS', orbit: 'Cloud deck' },
  { name: 'Mars', code: 'MARS', orbit: 'Areocentric orbit' },
  { name: 'Saturn', code: 'SATURN', orbit: 'Ring plane' },
  EARTH,
]

export function getJourneyLeg(orbitIndex: number): StarFocusJourneyLeg {
  const safeOrbitIndex = Math.max(0, Math.floor(orbitIndex))
  const routeIndex = safeOrbitIndex % SOLAR_ROUTE.length
  const previousRouteIndex = (routeIndex - 1 + SOLAR_ROUTE.length) % SOLAR_ROUTE.length

  return {
    orbitIndex: safeOrbitIndex,
    tour: Math.floor(safeOrbitIndex / SOLAR_ROUTE.length) + 1,
    legNumber: routeIndex + 1,
    legCount: SOLAR_ROUTE.length,
    origin: routeIndex === 0 ? EARTH : SOLAR_ROUTE[previousRouteIndex],
    destination: SOLAR_ROUTE[routeIndex],
  }
}

export function getNextJourneyLeg(missionHistory: StarFocusMissionRecord[]) {
  const nextOrbitIndex = missionHistory.reduce((highest, mission) => (
    Math.max(highest, mission.orbitIndex)
  ), -1) + 1

  return getJourneyLeg(nextOrbitIndex)
}
