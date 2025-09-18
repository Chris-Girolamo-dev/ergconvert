/**
 * Concept2 pace <-> watts conversion utilities
 * Based on Concept2's standard formulas
 */

export function paceToWatts(paceSeconds: number, isRowErg: boolean = true): number {
  // Concept2 formula: Watts = 2.8 / (pace/500)³
  // For RowErg: pace per 500m
  // For BikeErg: pace per 1000m, so convert to equivalent 500m pace
  const pacePer500 = isRowErg ? paceSeconds : (paceSeconds / 2)
  
  return 2.8 / Math.pow(pacePer500 / 500, 3)
}

export function wattsToPace(watts: number, isRowErg: boolean = true): number {
  // Inverse of the pace to watts formula
  // pace/500 = (2.8 / watts)^(1/3)
  const pacePer500Ratio = Math.pow(2.8 / watts, 1/3)
  const pacePer500 = pacePer500Ratio * 500
  
  if (isRowErg) {
    return pacePer500
  } else {
    // Convert to pace per 1000m for BikeErg
    return pacePer500 * 2
  }
}

export function wattsToCaloriesPerHour(watts: number): number {
  // C2 approximation: Cal/hr ≈ 4 * Watts + 300
  return 4 * watts + 300
}

export function formatPace(paceSeconds: number): string {
  const minutes = Math.floor(paceSeconds / 60)
  const seconds = Math.floor(paceSeconds % 60)
  const tenths = Math.floor((paceSeconds % 1) * 10)
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`
}

export function parsePace(paceString: string): number {
  // Parse format like "1:50.0" or "1:50"
  const parts = paceString.split(':')
  if (parts.length !== 2) throw new Error('Invalid pace format')
  
  const minutes = parseInt(parts[0])
  const secondsPart = parts[1].split('.')
  const seconds = parseInt(secondsPart[0])
  const tenths = secondsPart.length > 1 ? parseInt(secondsPart[1]) : 0
  
  return minutes * 60 + seconds + tenths / 10
}