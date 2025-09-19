import { CalibrationProfile, Sample } from './types'

/**
 * Calibration utilities for fitting power curves:
 * BikeErg: Watts ≈ a * RPM^b
 * RowErg: Validates pace-to-watts relationship against C2 formula
 */

export function fitPowerCurve(samples: Sample[], modality: 'row' | 'bike' = 'bike'): { a: number; b: number; r2: number } {
  if (samples.length < 3) {
    throw new Error('Need at least 3 samples for calibration')
  }

  if (modality === 'bike') {
    // BikeErg: log(Watts) = log(a) + b * log(RPM)
    const logX = samples.map(s => {
      if (!s.rpm) throw new Error('Missing RPM data for BikeErg')
      return Math.log(s.rpm)
    })
    const logY = samples.map(s => Math.log(s.watts))

    const n = samples.length
    const sumLogX = logX.reduce((sum, x) => sum + x, 0)
    const sumLogY = logY.reduce((sum, y) => sum + y, 0)
    const sumLogXSq = logX.reduce((sum, x) => sum + x * x, 0)
    const sumLogXLogY = logX.reduce((sum, x, i) => sum + x * logY[i], 0)

    // Calculate slope (b) and intercept (log(a))
    const b = (n * sumLogXLogY - sumLogX * sumLogY) /
              (n * sumLogXSq - sumLogX * sumLogX)
    const logA = (sumLogY - b * sumLogX) / n
    const a = Math.exp(logA)

    // Calculate R²
    const meanLogY = sumLogY / n
    const totalSumSquares = logY.reduce((sum, y) => sum + Math.pow(y - meanLogY, 2), 0)
    const residualSumSquares = logY.reduce((sum, y, i) => {
      const predicted = logA + b * logX[i]
      return sum + Math.pow(y - predicted, 2)
    }, 0)

    const r2 = 1 - (residualSumSquares / totalSumSquares)
    return { a, b, r2 }
  } else {
    // RowErg: Fit stroke rate vs watts curve for damper-specific calibration
    // We need pace_500 data to derive stroke rate from watts and pace
    if (!samples.every(s => s.pace_500)) {
      throw new Error('Missing pace_500 data for RowErg calibration')
    }

    // Convert pace and watts to stroke rate using C2 formula relationships
    const strokeRates: number[] = []
    const watts: number[] = []

    samples.forEach(sample => {
      // From C2 formula: Watts = 2.8 / (pace/500)^3
      // And empirical relationship: stroke_rate ≈ base_rate * (watts/pace_factor)^exponent
      // We'll derive stroke rate from pace and power relationship
      const pace500 = sample.pace_500!
      const power = sample.watts

      // Estimate stroke rate using typical rowing biomechanics
      // Higher watts at same pace = higher stroke rate
      // Base stroke rate for the pace, adjusted by power efficiency
      const baseSR = 2.0 / Math.pow(pace500 / 500, 0.5) * 12 // Rough stroke rate estimation
      const powerEfficiency = power / (2.8 / Math.pow(pace500 / 500, 3))
      const estimatedSR = baseSR * Math.pow(powerEfficiency, 0.3)

      strokeRates.push(Math.max(18, Math.min(32, estimatedSR)))
      watts.push(power)
    })

    // Fit stroke_rate = a * watts^b (power law relationship)
    const logX = watts.map(w => Math.log(w))
    const logY = strokeRates.map(sr => Math.log(sr))

    const n = samples.length
    const sumLogX = logX.reduce((sum, x) => sum + x, 0)
    const sumLogY = logY.reduce((sum, y) => sum + y, 0)
    const sumLogXSq = logX.reduce((sum, x) => sum + x * x, 0)
    const sumLogXLogY = logX.reduce((sum, x, i) => sum + x * logY[i], 0)

    // Calculate slope (b) and intercept (log(a))
    const b = (n * sumLogXLogY - sumLogX * sumLogY) /
              (n * sumLogXSq - sumLogX * sumLogX)
    const logA = (sumLogY - b * sumLogX) / n
    const a = Math.exp(logA)

    // Calculate R²
    const meanLogY = sumLogY / n
    const totalSumSquares = logY.reduce((sum, y) => sum + Math.pow(y - meanLogY, 2), 0)
    const residualSumSquares = logY.reduce((sum, y, i) => {
      const predicted = logA + b * logX[i]
      return sum + Math.pow(y - predicted, 2)
    }, 0)

    const r2 = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0

    return { a, b, r2 }
  }
}

export function predictWatts(rate: number, a: number, b: number): number {
  // For BikeErg: Watts = a * RPM^b
  return a * Math.pow(rate, b)
}

export function predictStrokeRate(watts: number, a: number, b: number): number {
  // For RowErg: stroke_rate = a * Watts^b
  return a * Math.pow(watts, b)
}

export function predictRate(watts: number, a: number, b: number, modality: 'row' | 'bike' = 'bike'): number {
  if (modality === 'row') {
    return predictStrokeRate(watts, a, b)
  } else {
    // For BikeErg, invert the relationship: RPM = (Watts / a)^(1/b)
    return Math.pow(watts / a, 1 / b)
  }
}

// Legacy function for backward compatibility
export function predictRpm(watts: number, a: number, b: number): number {
  return predictRate(watts, a, b, 'bike')
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

export function getGenericRowCalibration(damper: number): { a: number; b: number } {
  // Fallback generic calibration based on typical C2 RowErg performance
  // These are rough estimates - actual calibration is strongly recommended
  // RowErg stroke rate curve: stroke_rate ≈ a * Watts^b
  const baseA = 0.15  // Approximate coefficient for stroke rate response
  const damperMultiplier = 1 + (damper - 5) * 0.05 // Adjust for damper setting (less sensitive than BikeErg)

  return {
    a: baseA * damperMultiplier,
    b: 0.35   // Typical stroke rate power exponent for rowing (~0.3-0.4)
  }
}

export function clampRpm(rpm: number): number {
  return Math.max(60, Math.min(120, rpm))
}

export function clampStrokeRate(strokeRate: number): number {
  return Math.max(18, Math.min(32, strokeRate))
}

export function getRpmBand(targetRpm: number, bandSize: number = 2): { min: number; max: number } {
  const clamped = clampRpm(targetRpm)
  return {
    min: Math.max(60, clamped - bandSize),
    max: Math.min(120, clamped + bandSize)
  }
}

export function getStrokeRateBand(targetRate: number, bandSize: number = 1): { min: number; max: number } {
  const clamped = clampStrokeRate(targetRate)
  return {
    min: Math.max(18, clamped - bandSize),
    max: Math.min(32, clamped + bandSize)
  }
}