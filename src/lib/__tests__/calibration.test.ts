import { fitPowerCurve, predictWatts, predictRpm, validateCalibration, getGenericCalibration, clampRpm, getRpmBand } from '../calibration'
import { CalibrationProfile, Sample } from '../types'

describe('calibration utilities', () => {
  const sampleData: Sample[] = [
    { rpm: 70, watts: 150, source: 'manual', timestamp: Date.now() },
    { rpm: 80, watts: 200, source: 'manual', timestamp: Date.now() },
    { rpm: 90, watts: 260, source: 'manual', timestamp: Date.now() },
    { rpm: 100, watts: 330, source: 'manual', timestamp: Date.now() }
  ]

  describe('fitPowerCurve', () => {
    it('fits power curve with good R²', () => {
      const result = fitPowerCurve(sampleData)
      
      expect(result.a).toBeGreaterThan(0)
      expect(result.b).toBeGreaterThan(2) // Power curves typically have exponent 2-4
      expect(result.b).toBeLessThan(4)
      expect(result.r2).toBeGreaterThan(0.95) // Should have good fit for synthetic data
    })

    it('throws error with insufficient samples', () => {
      const twoSamples = sampleData.slice(0, 2)
      expect(() => fitPowerCurve(twoSamples)).toThrow('Need at least 3 samples')
    })

    it('produces consistent results', () => {
      const result1 = fitPowerCurve(sampleData)
      const result2 = fitPowerCurve(sampleData)
      
      expect(result1.a).toBeCloseTo(result2.a, 6)
      expect(result1.b).toBeCloseTo(result2.b, 6)
      expect(result1.r2).toBeCloseTo(result2.r2, 6)
    })
  })

  describe('predictWatts and predictRpm', () => {
    it('makes accurate predictions', () => {
      const { a, b } = fitPowerCurve(sampleData)
      
      // Test prediction accuracy with original data points
      sampleData.forEach(sample => {
        const predictedWatts = predictWatts(sample.rpm!, a, b)
        expect(predictedWatts).toBeCloseTo(sample.watts, -1) // Within 1 watt
        
        const predictedRpm = predictRpm(sample.watts, a, b)
        expect(predictedRpm).toBeCloseTo(sample.rpm!, -1) // Within 1 RPM
      })
    })

    it('maintains round-trip consistency', () => {
      const { a, b } = fitPowerCurve(sampleData)
      const testRpm = 85
      
      const watts = predictWatts(testRpm, a, b)
      const backToRpm = predictRpm(watts, a, b)
      
      expect(backToRpm).toBeCloseTo(testRpm, 1)
    })
  })

  describe('validateCalibration', () => {
    it('validates good calibration', () => {
      const { a, b, r2 } = fitPowerCurve(sampleData)
      const calibration: CalibrationProfile = {
        modality: 'bike',
        damper: 5,
        a, b, r2,
        samples: sampleData,
        created_at: Date.now(),
        updated_at: Date.now()
      }
      
      expect(validateCalibration(calibration)).toBe(true)
    })

    it('rejects poor calibration', () => {
      const calibration: CalibrationProfile = {
        modality: 'bike',
        damper: 5,
        a: 0.001,
        b: 3.0,
        r2: 0.85, // Too low
        samples: sampleData,
        created_at: Date.now(),
        updated_at: Date.now()
      }
      
      expect(validateCalibration(calibration)).toBe(false)
    })

    it('rejects insufficient samples', () => {
      const { a, b, r2 } = fitPowerCurve(sampleData)
      const calibration: CalibrationProfile = {
        modality: 'bike',
        damper: 5,
        a, b, r2,
        samples: sampleData.slice(0, 2), // Too few samples
        created_at: Date.now(),
        updated_at: Date.now()
      }
      
      expect(validateCalibration(calibration)).toBe(false)
    })
  })

  describe('getGenericCalibration', () => {
    it('returns reasonable generic values', () => {
      const generic = getGenericCalibration(5)
      
      expect(generic.a).toBeGreaterThan(0)
      expect(generic.b).toBe(3.2)
    })

    it('adjusts for damper settings', () => {
      const damper3 = getGenericCalibration(3)
      const damper7 = getGenericCalibration(7)
      
      expect(damper7.a).toBeGreaterThan(damper3.a) // Higher damper = higher coefficient
    })
  })

  describe('clampRpm', () => {
    it('clamps RPM to safe range', () => {
      expect(clampRpm(50)).toBe(60)
      expect(clampRpm(130)).toBe(120)
      expect(clampRpm(85)).toBe(85)
    })
  })

  describe('getRpmBand', () => {
    it('creates appropriate RPM bands', () => {
      const band = getRpmBand(80, 2)
      
      expect(band.min).toBe(78)
      expect(band.max).toBe(82)
    })

    it('respects RPM limits', () => {
      const lowBand = getRpmBand(62, 5)
      expect(lowBand.min).toBe(60) // Clamped to minimum
      
      const highBand = getRpmBand(118, 5)
      expect(highBand.max).toBe(120) // Clamped to maximum
    })
  })
})