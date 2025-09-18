import { Workout, ConversionResult, ConvertedInterval, CalibrationProfile, Interval } from './types'
import { paceToWatts, wattsToPace } from './c2'
import { predictRpm, getGenericCalibration, clampRpm } from './calibration'

/**
 * Helper functions for cross-modality conversions
 */

function getSourcePace(interval: Interval, workout: Workout): number {
  // Get the pace from the source workout specification
  switch (workout.target_spec) {
    case 'pace_500':
      // Input is pace per 500m, return as-is
      return interval.target_value
    case 'pace_1000':
      // Input is pace per 1000m, convert to equivalent pace per 500m for RowErg calculations
      if (workout.source_modality === 'row') {
        // Convert 1000m pace to 500m pace: divide by 2
        return interval.target_value / 2
      } else {
        // BikeErg source, return as-is
        return interval.target_value
      }
    case 'watts':
      // Convert watts back to pace for source modality
      return wattsToPace(interval.target_value, workout.source_modality === 'row')
    case 'rpm':
      // Convert RPM to watts, then to pace (requires calibration)
      throw new Error('RPM to pace conversion requires calibration context')
    default:
      throw new Error(`Unsupported target spec for source pace: ${workout.target_spec}`)
  }
}

function calculateTimeFromDistance(distance: number, pace: number, isRowErg: boolean): number {
  // Calculate time in seconds from distance and pace
  const paceUnit = isRowErg ? 500 : 1000 // meters per pace unit
  const pacePerMeter = pace / paceUnit
  return Math.round(distance * pacePerMeter)
}

/**
 * Main workout conversion orchestration
 */

export function convertWorkout(
  workout: Workout,
  calibrationProfile?: CalibrationProfile
): ConversionResult {
  const { a, b } = calibrationProfile || getGenericCalibration(workout.damper_for_target || 5)
  
  const convertedIntervals: ConvertedInterval[] = workout.intervals.map((interval, index) => {
    // Step 1: Convert source target to watts
    let targetWatts: number
    
    switch (workout.target_spec) {
      case 'pace_500':
        targetWatts = paceToWatts(interval.target_value, true) // RowErg
        break
      case 'pace_1000':
        targetWatts = paceToWatts(interval.target_value, false) // BikeErg
        break
      case 'watts':
        targetWatts = interval.target_value
        break
      case 'rpm':
        // Convert from source RPM to watts using calibration
        if (!calibrationProfile) {
          throw new Error('Calibration required for RPM conversion')
        }
        targetWatts = a * Math.pow(interval.target_value, b)
        break
      default:
        throw new Error(`Unsupported target spec: ${workout.target_spec}`)
    }
    
    // Step 2: Convert watts to target modality units
    const isTargetRow = workout.target_modality === 'row'
    const targetPace = wattsToPace(targetWatts, isTargetRow)
    const targetRpm = predictRpm(targetWatts, a, b)
    
    // Calculate duration and distance based on modality conversion
    let durationSeconds: number | undefined
    let distanceMeters: number | undefined
    
    const isSourceRow = workout.source_modality === 'row'
    const isCrossModalityConversion = isSourceRow !== isTargetRow
    
    if (interval.distance) {
      if (isCrossModalityConversion) {
        // Cross-modality: Convert based on time duration, not distance
        // First calculate the time it takes on source modality
        const sourcePace = getSourcePace(interval, workout)
        const sourceTimeSeconds = calculateTimeFromDistance(interval.distance, sourcePace, isSourceRow)
        
        // Use that time duration for target modality
        durationSeconds = sourceTimeSeconds
        // Don't set distance for cross-modality - it's time-based
        distanceMeters = undefined
      } else {
        // Same modality: Keep distance, calculate duration
        distanceMeters = interval.distance
        const pacePerMeter = targetPace / (isTargetRow ? 500 : 1000)
        durationSeconds = Math.round(interval.distance * pacePerMeter)
      }
    } else if (interval.duration) {
      durationSeconds = interval.duration
      if (!isCrossModalityConversion) {
        // Same modality: Calculate distance from duration
        const metersPerSecond = (isTargetRow ? 500 : 1000) / targetPace
        distanceMeters = Math.round(interval.duration * metersPerSecond)
      }
      // Cross-modality with duration input: keep duration, no distance
    }
    
    return {
      rep: index + 1,
      target_watts: Math.round(targetWatts),
      target_rpm: Math.round(clampRpm(targetRpm)),
      target_pace: Math.round(targetPace * 10) / 10, // Round to nearest 0.1s
      duration_seconds: durationSeconds,
      distance_meters: distanceMeters
    }
  })
  
  return {
    intervals: convertedIntervals,
    rest_seconds: workout.rest,
    damper: workout.damper_for_target || 5
  }
}

export function getRestTargets(damper: number, calibrationProfile?: CalibrationProfile): {
  rpm: { min: number; max: number }
  watts: number
} {
  // Easy recovery targets (approximately 60-65% of max sustainable)
  const { a, b } = calibrationProfile || getGenericCalibration(damper)
  
  const easyRpmMin = 60
  const easyRpmMax = 65
  const easyWatts = Math.round(a * Math.pow(62.5, b)) // Average of range
  
  return {
    rpm: { min: easyRpmMin, max: easyRpmMax },
    watts: easyWatts
  }
}

export function formatConversionForExport(result: ConversionResult, format: 'text' | 'csv'): string {
  const restTargets = getRestTargets(result.damper)
  
  if (format === 'csv') {
    const header = 'Rep,Target Watts,Target RPM,Target Pace,Duration (s),Distance (m)\n'
    const rows = result.intervals.map(interval => 
      `${interval.rep},${interval.target_watts},${interval.target_rpm},${interval.target_pace},${interval.duration_seconds || ''},${interval.distance_meters || ''}`
    ).join('\n')
    const restRow = `Rest,${restTargets.watts},${restTargets.rpm.min}-${restTargets.rpm.max},Easy,${result.rest_seconds},`
    
    return header + rows + '\n' + restRow
  } else {
    // Text format
    const intervals = result.intervals.map(interval => {
      const duration = interval.duration_seconds ? `${Math.floor(interval.duration_seconds / 60)}:${(interval.duration_seconds % 60).toString().padStart(2, '0')}` : ''
      const distance = interval.distance_meters ? `${interval.distance_meters}m` : ''
      const work = duration || distance || 'Interval'
      return `${interval.rep}. ${work} @ ${interval.target_rpm} RPM (${interval.target_watts}W)`
    }).join('\n')
    
    const rest = `Rest: ${result.rest_seconds}s @ ${restTargets.rpm.min}-${restTargets.rpm.max} RPM (${restTargets.watts}W)`
    
    return `BikeErg Workout (Damper ${result.damper}):\n\n${intervals}\n\n${rest}`
  }
}