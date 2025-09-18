import { convertWorkout, getRestTargets, formatConversionForExport } from '../converter'
import { Workout, CalibrationProfile } from '../types'

describe('converter utilities', () => {
  const mockCalibration: CalibrationProfile = {
    damper: 5,
    a: 0.0026,
    b: 3.2,
    r2: 0.98,
    samples: []
  }

  const sampleWorkout: Workout = {
    id: 'test',
    source_modality: 'row',
    target_modality: 'bike',
    intervals: [
      { distance: 250, target_value: 110 }, // 1:50/500m
      { distance: 500, target_value: 115 }, // 1:55/500m
    ],
    rest: 45,
    target_spec: 'pace_500',
    damper_for_target: 5
  }

  describe('convertWorkout', () => {
    it('converts RowErg to BikeErg workout correctly', () => {
      const result = convertWorkout(sampleWorkout, mockCalibration)
      
      expect(result.intervals).toHaveLength(2)
      expect(result.rest_seconds).toBe(45)
      expect(result.damper).toBe(5)
      
      // First interval: 250m @ 1:50 ≈ 263W ≈ 80 RPM
      const firstInterval = result.intervals[0]
      expect(firstInterval.target_watts).toBeCloseTo(263, 5) // ~263W
      expect(firstInterval.target_rpm).toBeGreaterThanOrEqual(60) // Should be reasonable RPM
      expect(firstInterval.distance_meters).toBe(250)
      
      // Check that all values are reasonable
      expect(firstInterval.target_watts).toBeGreaterThan(200)
      expect(firstInterval.target_watts).toBeLessThan(400)
      expect(firstInterval.target_rpm).toBeGreaterThanOrEqual(60)
      expect(firstInterval.target_rpm).toBeLessThan(120)
    })

    it('converts BikeErg to RowErg workout', () => {
      const bikeWorkout: Workout = {
        ...sampleWorkout,
        source_modality: 'bike',
        target_modality: 'row',
        target_spec: 'rpm',
        intervals: [
          { distance: 1000, target_value: 80 } // 80 RPM
        ]
      }

      const result = convertWorkout(bikeWorkout, mockCalibration)
      
      expect(result.intervals).toHaveLength(1)
      const interval = result.intervals[0]
      
      // 80 RPM should convert to reasonable RowErg pace
      expect(interval.target_pace).toBeGreaterThan(40) // Reasonable pace
      expect(interval.target_pace).toBeLessThan(60) // Reasonable pace
    })

    it('handles watts target spec', () => {
      const wattsWorkout: Workout = {
        ...sampleWorkout,
        target_spec: 'watts',
        intervals: [
          { distance: 250, target_value: 270 }
        ]
      }

      const result = convertWorkout(wattsWorkout, mockCalibration)
      const interval = result.intervals[0]
      
      expect(interval.target_watts).toBe(270)
      expect(interval.target_rpm).toBeGreaterThanOrEqual(60)
    })

    it('falls back to generic calibration when none provided', () => {
      expect(() => convertWorkout(sampleWorkout)).not.toThrow()
      
      const result = convertWorkout(sampleWorkout)
      expect(result.intervals).toHaveLength(2)
      expect(result.intervals[0].target_watts).toBeGreaterThan(0)
      expect(result.intervals[0].target_rpm).toBeGreaterThanOrEqual(60)
    })

    it('calculates duration for distance-based intervals', () => {
      const result = convertWorkout(sampleWorkout, mockCalibration)
      
      result.intervals.forEach(interval => {
        expect(interval.duration_seconds).toBeGreaterThan(0)
        expect(interval.distance_meters).toBeGreaterThan(0)
      })
    })

    it('throws error for RPM conversion without calibration', () => {
      const rpmWorkout: Workout = {
        ...sampleWorkout,
        target_spec: 'rpm',
        intervals: [{ distance: 250, target_value: 80 }]
      }

      expect(() => convertWorkout(rpmWorkout)).toThrow('Calibration required for RPM conversion')
    })
  })

  describe('getRestTargets', () => {
    it('provides reasonable rest targets', () => {
      const targets = getRestTargets(5, mockCalibration)
      
      expect(targets.rpm.min).toBe(60)
      expect(targets.rpm.max).toBe(65)
      expect(targets.watts).toBeGreaterThan(50)
      expect(targets.watts).toBeLessThan(1500) // Easy recovery pace
    })
  })

  describe('formatConversionForExport', () => {
    it('formats text export correctly', () => {
      const result = convertWorkout(sampleWorkout, mockCalibration)
      const text = formatConversionForExport(result, 'text')
      
      expect(text).toContain('BikeErg Workout')
      expect(text).toContain('Damper 5')
      expect(text).toContain('55s') // Duration should be calculated
      expect(text).toContain('RPM')
      expect(text).toContain('Rest:')
    })

    it('formats CSV export correctly', () => {
      const result = convertWorkout(sampleWorkout, mockCalibration)
      const csv = formatConversionForExport(result, 'csv')
      
      expect(csv).toContain('Rep,Target Watts,Target RPM')
      expect(csv).toContain('1,') // First interval
      expect(csv).toContain('2,') // Second interval
      expect(csv).toContain('Rest,') // Rest row
      
      // Should have proper CSV structure
      const lines = csv.split('\n')
      expect(lines[0]).toContain(',') // Header
      expect(lines[1]).toContain(',') // Data
    })
  })

  describe('edge cases', () => {
    it('handles very short intervals', () => {
      const shortWorkout: Workout = {
        ...sampleWorkout,
        intervals: [{ distance: 50, target_value: 110 }]
      }

      const result = convertWorkout(shortWorkout, mockCalibration)
      expect(result.intervals[0].duration_seconds).toBeGreaterThan(0)
    })

    it('handles very long intervals', () => {
      const longWorkout: Workout = {
        ...sampleWorkout,
        intervals: [{ distance: 5000, target_value: 120 }]
      }

      const result = convertWorkout(longWorkout, mockCalibration)
      expect(result.intervals[0].duration_seconds).toBeGreaterThan(600) // Should be > 10 minutes
    })

    it('handles time-based intervals', () => {
      const timeWorkout: Workout = {
        ...sampleWorkout,
        intervals: [{ duration: 300, target_value: 110 }] // 5 minutes
      }

      const result = convertWorkout(timeWorkout, mockCalibration)
      const interval = result.intervals[0]
      
      expect(interval.duration_seconds).toBe(300)
      expect(interval.distance_meters).toBeGreaterThan(0)
    })
  })
})