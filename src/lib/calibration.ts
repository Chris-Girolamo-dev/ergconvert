import { CalibrationProfile, Sample } from './types'

/**
 * Calibration utilities for fitting power curves: Watts ≈ a * RPM^b
 */

export function fitPowerCurve(samples: Sample[]): { a: number; b: number; r2: number } {
  if (samples.length < 3) {
    throw new Error('Need at least 3 samples for calibration')
  }

  // Log-linear regression: log(W) = log(a) + b * log(RPM)
  const logRpm = samples.map(s => Math.log(s.rpm))
  const logWatts = samples.map(s => Math.log(s.watts))
  
  const n = samples.length
  const sumLogRpm = logRpm.reduce((sum, x) => sum + x, 0)
  const sumLogWatts = logWatts.reduce((sum, y) => sum + y, 0)
  const sumLogRpmSq = logRpm.reduce((sum, x) => sum + x * x, 0)
  const sumLogRpmLogWatts = logRpm.reduce((sum, x, i) => sum + x * logWatts[i], 0)
  
  // Calculate slope (b) and intercept (log(a))
  const b = (n * sumLogRpmLogWatts - sumLogRpm * sumLogWatts) / 
            (n * sumLogRpmSq - sumLogRpm * sumLogRpm)
  const logA = (sumLogWatts - b * sumLogRpm) / n
  const a = Math.exp(logA)
  
  // Calculate R²
  const meanLogWatts = sumLogWatts / n
  const totalSumSquares = logWatts.reduce((sum, y) => sum + Math.pow(y - meanLogWatts, 2), 0)
  const residualSumSquares = logWatts.reduce((sum, y, i) => {
    const predicted = logA + b * logRpm[i]
    return sum + Math.pow(y - predicted, 2)
  }, 0)
  
  const r2 = 1 - (residualSumSquares / totalSumSquares)
  
  return { a, b, r2 }
}

export function predictWatts(rpm: number, a: number, b: number): number {
  return a * Math.pow(rpm, b)
}

export function predictRpm(watts: number, a: number, b: number): number {
  return Math.pow(watts / a, 1 / b)
}

export function validateCalibration(calibration: CalibrationProfile): boolean {
  return calibration.r2 >= 0.95 && calibration.samples.length >= 3
}

export function getGenericCalibration(damper: number): { a: number; b: number } {
  // Fallback generic calibration based on typical C2 BikeErg performance
  // These are rough estimates - actual calibration is strongly recommended
  const baseA = 0.0026 // Approximate coefficient
  const damperMultiplier = 1 + (damper - 5) * 0.1 // Adjust for damper setting
  
  return {
    a: baseA * damperMultiplier,
    b: 3.2 // Typical power curve exponent
  }
}

export function clampRpm(rpm: number): number {
  return Math.max(60, Math.min(120, rpm))
}

export function getRpmBand(targetRpm: number, bandSize: number = 2): { min: number; max: number } {
  const clamped = clampRpm(targetRpm)
  return {
    min: Math.max(60, clamped - bandSize),
    max: Math.min(120, clamped + bandSize)
  }
}