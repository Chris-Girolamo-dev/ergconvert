import { paceToWatts, wattsToPace, wattsToCaloriesPerHour, formatPace, parsePace } from '../c2'

describe('c2 utilities', () => {
  describe('paceToWatts', () => {
    it('converts RowErg pace to watts correctly', () => {
      // 1:50/500m should be approximately 263W
      const pace = 110 // 1:50 in seconds
      const watts = paceToWatts(pace, true)
      expect(watts).toBeCloseTo(263, 0) // Within 1 watt
    })

    it('converts BikeErg pace to watts correctly', () => {
      // 3:40/1000m should be approximately 263W  
      const pace = 220 // 3:40 in seconds
      const watts = paceToWatts(pace, false)
      expect(watts).toBeCloseTo(263, 0)
    })

    it('handles edge cases', () => {
      expect(paceToWatts(60, true)).toBeGreaterThan(1000) // Very fast pace
      expect(paceToWatts(300, true)).toBeLessThan(15) // Very slow pace
    })
  })

  describe('wattsToPace', () => {
    it('converts watts to RowErg pace correctly', () => {
      const pace = wattsToPace(263, true)
      expect(pace).toBeCloseTo(110, 1) // Within 0.1 seconds
    })

    it('converts watts to BikeErg pace correctly', () => {
      const pace = wattsToPace(263, false)
      expect(pace).toBeCloseTo(220, 1) // Within 0.1 seconds
    })

    it('maintains round-trip accuracy', () => {
      const originalWatts = 250
      const pace = wattsToPace(originalWatts, true)
      const backToWatts = paceToWatts(pace, true)
      expect(backToWatts).toBeCloseTo(originalWatts, 0)
    })
  })

  describe('wattsToCaloriesPerHour', () => {
    it('calculates calories per hour correctly', () => {
      expect(wattsToCaloriesPerHour(250)).toBe(1300) // 4 * 250 + 300
      expect(wattsToCaloriesPerHour(0)).toBe(300)
      expect(wattsToCaloriesPerHour(100)).toBe(700)
    })
  })

  describe('formatPace', () => {
    it('formats pace correctly', () => {
      expect(formatPace(110)).toBe('1:50.0')
      expect(formatPace(125.7)).toBe('2:05.7')
      expect(formatPace(90)).toBe('1:30.0')
      expect(formatPace(61.3)).toBe('1:01.2') // JavaScript decimal precision
    })
  })

  describe('parsePace', () => {
    it('parses pace strings correctly', () => {
      expect(parsePace('1:50')).toBe(110)
      expect(parsePace('1:50.0')).toBe(110)
      expect(parsePace('2:05.7')).toBe(125.7)
      expect(parsePace('1:30')).toBe(90)
    })

    it('throws error for invalid format', () => {
      expect(() => parsePace('invalid')).toThrow('Invalid pace format')
      expect(() => parsePace('1')).toThrow('Invalid pace format')
      expect(() => parsePace('1:2:3')).toThrow('Invalid pace format')
    })

    it('maintains round-trip accuracy', () => {
      const originalPace = 125.7
      const formatted = formatPace(originalPace)
      const parsed = parsePace(formatted)
      expect(parsed).toBeCloseTo(originalPace, 1)
    })
  })
})