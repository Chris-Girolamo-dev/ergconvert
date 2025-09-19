'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { signIn, signOut } from 'next-auth/react'
import { CalibrationProfile } from '@/lib/types'
import { persistence } from '@/lib/persistence'
import { convertWorkout } from '@/lib/converter'
import { paceToWatts, wattsToPace } from '@/lib/c2'

export default function Home() {
  const { session, loading } = useAuth()

  // Conversion state
  const [sourceModality, setSourceModality] = useState<'row' | 'bike'>('row')
  const [targetModality, setTargetModality] = useState<'row' | 'bike'>('bike')
  const [workoutType, setWorkoutType] = useState<'distance' | 'time'>('distance')
  const [inputValue, setInputValue] = useState('250')
  const [targetPace, setTargetPace] = useState('1:50')
  const [result, setResult] = useState<{watts: number, rpm: number, pace: string, totalTime?: string} | null>(null)
  const [calibrations, setCalibrations] = useState<{row: CalibrationProfile[], bike: CalibrationProfile[]}>({row: [], bike: []})
  const [selectedDamper, setSelectedDamper] = useState<number>(5)
  const [distance, setDistance] = useState<number>(500)
  const [inputPaceFormat, setInputPaceFormat] = useState<500 | 1000>(500)
  const [intervals, setIntervals] = useState<Array<{
    id: number
    distance: number
    pace: string
    inputFormat: 500 | 1000
    roundNumber?: number
    restTime?: string
    damper?: number
    result?: {watts: number, rpm: number, pace: string, totalTime?: string}
  }>>([])
  const [showIntervals, setShowIntervals] = useState(false)
  const [numberOfRounds, setNumberOfRounds] = useState<number>(1)
  const [restTime, setRestTime] = useState<string>('2:00')

  // Check if authentication is properly configured
  const isAuthConfigured = typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0

  // Load calibrations on mount
  useEffect(() => {
    loadCalibrations()
  }, [])

  // Test calibration data
  const testCalibrations = {
    bike: [
      {
        id: 1,
        modality: 'bike' as const,
        damper: 5,
        a: 0.00018895192514459947,
        b: 3.2251860885800876,
        r2: 0.9997930693713766,
        samples: [
          { rpm: 70, watts: 169, source: 'manual' as const, timestamp: 1758153189694 },
          { rpm: 75, watts: 210, source: 'manual' as const, timestamp: 1758153268807 },
          { rpm: 80, watts: 260, source: 'manual' as const, timestamp: 1758153378488 }
        ],
        created_at: 1758193424890,
        updated_at: 1758193424890
      },
      {
        id: 2,
        modality: 'bike' as const,
        damper: 4,
        a: 0.00025629255589648,
        b: 3.09428147594641,
        r2: 0.999794785515299,
        samples: [
          { rpm: 70, watts: 131, source: 'manual' as const, timestamp: 1758153189694 },
          { rpm: 75, watts: 168, source: 'manual' as const, timestamp: 1758153268807 },
          { rpm: 80, watts: 210, source: 'manual' as const, timestamp: 1758153378488 }
        ],
        created_at: 1758193424890,
        updated_at: 1758193424890
      }
    ],
    row: [
      {
        id: 3,
        modality: 'row' as const,
        damper: 4,
        a: 0.145,
        b: 0.342,
        r2: 0.9892,
        samples: [
          { pace_500: 130, watts: 150, source: 'manual' as const, timestamp: 1758153189694 }, // 2:10/500m, 20 SPM equivalent
          { pace_500: 125, watts: 170, source: 'manual' as const, timestamp: 1758153268807 }, // 2:05/500m, 22 SPM equivalent
          { pace_500: 120, watts: 190, source: 'manual' as const, timestamp: 1758153378488 }  // 2:00/500m, 24 SPM equivalent
        ],
        created_at: 1758193424890,
        updated_at: 1758193424890
      },
      {
        id: 4,
        modality: 'row' as const,
        damper: 6,
        a: 0.158,
        b: 0.338,
        r2: 0.9915,
        samples: [
          { pace_500: 120, watts: 180, source: 'manual' as const, timestamp: 1758153189694 }, // 2:00/500m, 24 SPM equivalent
          { pace_500: 115, watts: 210, source: 'manual' as const, timestamp: 1758153268807 }, // 1:55/500m, 26 SPM equivalent
          { pace_500: 110, watts: 240, source: 'manual' as const, timestamp: 1758153378488 }  // 1:50/500m, 28 SPM equivalent
        ],
        created_at: 1758193424890,
        updated_at: 1758193424890
      }
    ]
  }

  const loadCalibrations = async () => {
    try {
      // Load real calibrations from persistence
      const rowCals = await persistence.loadCalibrationsByModality('row')
      const bikeCals = await persistence.loadCalibrationsByModality('bike')

      // If no real calibrations exist, fall back to test data
      if (rowCals.length === 0 && bikeCals.length === 0) {
        console.log('No calibrations found, using test data')
        setCalibrations(testCalibrations)
      } else {
        setCalibrations({ row: rowCals, bike: bikeCals })
      }
    } catch (err) {
      console.error('Error loading calibrations:', err)
      // Fall back to test data on error
      setCalibrations(testCalibrations)
    }
  }

  // Toggle conversion direction
  const toggleDirection = () => {
    setSourceModality(targetModality)
    setTargetModality(sourceModality)
    performConversion()
  }

  // Interval management functions
  const addInterval = () => {
    if (!result) return // Don't add if no conversion result

    const newIntervals = []
    for (let round = 1; round <= numberOfRounds; round++) {
      const newInterval = {
        id: Date.now() + round, // Ensure unique IDs
        distance: distance,
        pace: targetPace,
        inputFormat: inputPaceFormat,
        roundNumber: round,
        restTime: restTime,
        damper: selectedDamper, // Store damper for both BikeErg and RowErg
        result: result
      }
      newIntervals.push(newInterval)
    }
    setIntervals([...intervals, ...newIntervals])
    setShowIntervals(true)
  }

  const removeInterval = (id: number) => {
    setIntervals(intervals.filter(interval => interval.id !== id))
    if (intervals.length <= 1) {
      setShowIntervals(false)
    }
  }

  const getTotalWorkTime = () => {
    if (intervals.length === 0) return null
    const workSeconds = intervals.reduce((total, interval) => {
      return total + parseMMSSToSeconds(interval.result?.totalTime || '0:00')
    }, 0)
    return formatSecondsToMMSS(workSeconds)
  }

  const getTotalRestTime = () => {
    if (intervals.length === 0) return null
    const restSeconds = intervals.reduce((total, interval, index) => {
      // Add rest time for all intervals except the last one
      if (index < intervals.length - 1 && interval.restTime) {
        return total + parseMMSSToSeconds(interval.restTime)
      }
      return total
    }, 0)
    return restSeconds > 0 ? formatSecondsToMMSS(restSeconds) : null
  }

  const getTotalWorkoutTime = () => {
    if (intervals.length === 0) return null

    // Calculate work time
    const workSeconds = intervals.reduce((total, interval) => {
      return total + parseMMSSToSeconds(interval.result?.totalTime || '0:00')
    }, 0)

    // Calculate rest time (rest between intervals, not after the last one)
    const restSeconds = intervals.reduce((total, interval, index) => {
      // Add rest time for all intervals except the last one
      if (index < intervals.length - 1 && interval.restTime) {
        return total + parseMMSSToSeconds(interval.restTime)
      }
      return total
    }, 0)

    const totalSeconds = workSeconds + restSeconds
    return formatSecondsToMMSS(totalSeconds)
  }

  const getAverageWatts = () => {
    if (intervals.length === 0) return null
    const totalWatts = intervals.reduce((total, interval) => {
      return total + (interval.result?.watts || 0)
    }, 0)
    return Math.round(totalWatts / intervals.length)
  }

  const getAverageRPM = () => {
    if (intervals.length === 0) return null
    const totalRPM = intervals.reduce((total, interval) => {
      return total + (interval.result?.rpm || 0)
    }, 0)
    return Math.round(totalRPM / intervals.length)
  }

  // Perform quick conversion
  const performConversion = () => {
    try {
      const inputPaceSeconds = parseMMSSToSeconds(targetPace)

      // Convert input pace to 500m equivalent for watts calculation
      const pace500m = inputPaceFormat === 1000 ? inputPaceSeconds / 2 : inputPaceSeconds

      const watts = paceToWatts(pace500m, sourceModality === 'row')
      const targetPace_raw = wattsToPace(watts, targetModality === 'row')

      // Format target pace for display (always show as per 500m for consistency)
      const targetPace500m = targetModality === 'bike' ? targetPace_raw / 2 : targetPace_raw
      const targetPaceString = formatSecondsToMMSS(targetPace500m)

      // Calculate total time for the selected workout distance
      const intervals = distance / 500 // How many 500m intervals
      const totalTimeSeconds = targetPace500m * intervals
      const totalTimeString = formatSecondsToMMSS(totalTimeSeconds)

      // Get calibration for target modality and selected damper
      const targetCals = calibrations[targetModality]
      const calibration = targetCals.find(cal => cal.damper === selectedDamper) ||
        (targetCals.length > 0 ? targetCals[0] : undefined)

      let rpm = 60 // Default fallback
      if (calibration) {
        rpm = Math.pow(watts / calibration.a, 1 / calibration.b)
        if (targetModality === 'row') {
          rpm = Math.max(18, Math.min(32, rpm)) // Stroke rate range
        } else {
          rpm = Math.max(60, Math.min(120, rpm)) // RPM range
        }
      }

      setResult({
        watts: Math.round(watts),
        rpm: Math.round(rpm),
        pace: targetPaceString,
        totalTime: totalTimeString
      })
    } catch (err) {
      console.error('Conversion error:', err)
    }
  }

  const parseMMSSToSeconds = (mmss: string): number => {
    const parts = mmss.split(':')
    if (parts.length !== 2) return 110 // Default 1:50
    const mins = parseInt(parts[0])
    const secs = parseInt(parts[1])
    return mins * 60 + secs
  }

  const formatSecondsToMMSS = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Set inputPaceFormat based on sourceModality
  useEffect(() => {
    if (sourceModality === 'row') {
      setInputPaceFormat(500)
    } else if (sourceModality === 'bike') {
      setInputPaceFormat(1000)
    }
  }, [sourceModality])

  // Update conversion when inputs change
  useEffect(() => {
    performConversion()
  }, [sourceModality, targetModality, targetPace, calibrations, selectedDamper, distance, inputPaceFormat])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-40 pointer-events-none"></div>
      
      {/* Navigation Header */}
      <div className="relative z-20 pt-4 sm:pt-6 px-4 sm:px-6 lg:px-8 pointer-events-auto">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Left Navigation */}
          <div className="flex items-center space-x-3">
            {/* Home Button */}
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-emerald-400 hover:text-emerald-300 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Home</span>
            </Link>
            {/* Settings Button */}
            <Link
              href="/settings"
              className="inline-flex items-center space-x-2 text-emerald-400 hover:text-emerald-300 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </Link>
          </div>

          {/* Right Authentication Section */}
          {isAuthConfigured && !loading && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 pointer-events-auto">
              {session ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {session.user?.image && (
                      <img 
                        src={session.user.image} 
                        alt="Profile" 
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <span className="text-white text-sm">
                      {session.user?.name || session.user?.email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Sign Out clicked!')
                      signOut()
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm cursor-pointer relative z-30"
                    style={{ position: 'relative', zIndex: 9999 }}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    console.log('Sign In with Google clicked!')
                    signIn('google')
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 cursor-pointer relative z-30"
                  style={{ position: 'relative', zIndex: 9999 }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 min-h-screen py-12 px-4 sm:px-6 lg:px-8 pt-20">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-green-400 to-green-600 p-3 rounded-full">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 3v12a2 2 0 002 2h6a2 2 0 002-2V7M7 7h10M9 11h6m-6 4h6" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
              Concept2 Converter
            </h1>
            <p className="text-green-400 text-lg font-medium mb-6">
              Row↔Bike
            </p>
            <p className="text-gray-400 text-sm">
              Precision workout conversion with precision
            </p>
          </div>

          {/* Direction Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-1 border border-white/10">
              <button
                onClick={toggleDirection}
                className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
                  sourceModality === 'row' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Row to Bike
              </button>
              <button
                onClick={toggleDirection}
                className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
                  sourceModality === 'bike' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Bike to Row
              </button>
            </div>
          </div>

          {/* Main Conversion Grid */}
          <div className="flex justify-center mb-8">
            {/* Interval Summary */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 w-full max-w-md">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-white font-semibold text-sm">Workout Summary</h3>
              </div>
              {intervals.length > 0 ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Intervals:</span>
                    <span className="text-white">{intervals.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Work Time:</span>
                    <span className="text-white font-mono">{getTotalWorkTime()}</span>
                  </div>
                  {getTotalRestTime() && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Rest Time:</span>
                      <span className="text-white font-mono">{getTotalRestTime()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Total Time:</span>
                    <span className="text-white font-mono">{getTotalWorkoutTime()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Total Distance:</span>
                    <span className="text-white">{intervals.reduce((sum, int) => sum + int.distance, 0)}m</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Average Watts:</span>
                    <span className="text-white">{getAverageWatts()}W</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Average {targetModality === 'row' ? 'SPM' : 'RPM'}:</span>
                    <span className="text-white">{getAverageRPM()}{targetModality === 'row' ? 'spm' : 'rpm'}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Add intervals to see workout summary</p>
              )}
            </div>



          </div>

          {/* Conversion */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <h3 className="text-white font-semibold text-sm">Conversion</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs text-gray-300 mb-1">Distance</label>
                <select
                  value={distance}
                  onChange={(e) => setDistance(Number(e.target.value))}
                  className="w-full bg-white/20 border border-white/30 rounded-lg px-2 py-1 text-white text-sm"
                >
                  <option value={250} className="bg-slate-800">250m</option>
                  <option value={500} className="bg-slate-800">500m</option>
                  <option value={1000} className="bg-slate-800">1000m</option>
                  <option value={2000} className="bg-slate-800">2000m</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-gray-300">
                    {sourceModality === 'row' ? 'RowErg 500m Pace' : 'BikeErg 1000m Pace'}
                  </label>
                </div>
                <input
                  type="text"
                  value={targetPace}
                  onChange={(e) => setTargetPace(e.target.value)}
                  className="w-full bg-white/20 border border-white/30 rounded-lg px-2 py-1 text-white placeholder-gray-400 text-sm"
                  placeholder="1:50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Number of Rounds</label>
                <input
                  type="number"
                  min="1"
                  value={numberOfRounds}
                  onChange={(e) => setNumberOfRounds(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white/20 border border-white/30 rounded-lg px-2 py-1 text-white placeholder-gray-400 text-sm"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Rest Time</label>
                <input
                  type="text"
                  value={restTime}
                  onChange={(e) => setRestTime(e.target.value)}
                  className="w-full bg-white/20 border border-white/30 rounded-lg px-2 py-1 text-white placeholder-gray-400 text-sm"
                  placeholder="2:00"
                />
              </div>
              {/* Damper Selection (BikeErg target only) */}
              {targetModality === 'bike' && (
                <div>
                  <label className="block text-xs text-gray-300 mb-1">Damper Setting</label>
                  <select
                    value={selectedDamper}
                    onChange={(e) => {
                      if (e.target.value === 'create-new') {
                        window.location.href = '/calibrate'
                      } else {
                        setSelectedDamper(Number(e.target.value))
                      }
                    }}
                    className="w-full bg-white/20 border border-white/30 rounded-lg px-2 py-1 text-white text-sm"
                  >
                    {Array.from(new Set(calibrations.bike.map(cal => cal.damper))).sort().map(damper => (
                      <option key={damper} value={damper} className="bg-slate-800">
                        Damper {damper}
                      </option>
                    ))}
                    {calibrations.bike.length === 0 && (
                      <option value={5} className="bg-slate-800">Damper 5 (Default)</option>
                    )}
                    <option value="create-new" className="bg-slate-800">Create New</option>
                  </select>
                </div>
              )}
              {/* Damper Selection (RowErg target only) */}
              {sourceModality === 'bike' && targetModality === 'row' && (
                <div>
                  <label className="block text-xs text-gray-300 mb-1">RowErg Damper Setting</label>
                  <select
                    value={selectedDamper}
                    onChange={(e) => {
                      if (e.target.value === 'create-new') {
                        window.location.href = '/calibrate-rower'
                      } else {
                        setSelectedDamper(Number(e.target.value))
                      }
                    }}
                    className="w-full bg-white/20 border border-white/30 rounded-lg px-2 py-1 text-white text-sm"
                  >
                    {Array.from(new Set(calibrations.row.map(cal => cal.damper))).sort().map(damper => (
                      <option key={damper} value={damper} className="bg-slate-800">
                        Damper {damper}
                      </option>
                    ))}
                    {calibrations.row.length === 0 && (
                      <option value={5} className="bg-slate-800">Damper 5 (Default)</option>
                    )}
                    <option value="create-new" className="bg-slate-800">Create New Calibration</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-white font-semibold text-sm">Conversion Result</h3>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              {result ? (
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1">
                      {targetModality === 'row' ? 'RowErg' : 'BikeErg'} Target
                    </div>
                    <div className="text-lg text-gray-300">
                      {result.pace}/500m • {result.totalTime} total
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-green-500/20 rounded-lg p-3 border border-green-400/30">
                      <div className="text-lg font-bold text-white">{result.watts}W</div>
                      <div className="text-xs text-green-300">Power</div>
                    </div>
                    <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-400/30">
                      <div className="text-lg font-bold text-white">{result.rpm}</div>
                      <div className="text-xs text-blue-300">{targetModality === 'row' ? 'Stroke Rate' : 'RPM'}</div>
                    </div>
                    <div className="bg-purple-500/20 rounded-lg p-3 border border-purple-400/30">
                      <div className="text-lg font-bold text-white">{selectedDamper}</div>
                      <div className="text-xs text-purple-300">Damper</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-gray-400 text-lg mb-2">Enter pace to see results</div>
                  <div className="text-gray-500 text-sm">
                    Fill in the {sourceModality === 'row' ? 'RowErg 500m pace' : 'BikeErg 1000m pace'} above to get your conversion
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Add Interval Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={addInterval}
              disabled={!result}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                result
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Interval</span>
            </button>
          </div>

          {/* Interval List */}
          {showIntervals && intervals.length > 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Workout Intervals</h3>
                <span className="text-sm text-gray-300">{intervals.length} interval{intervals.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-3">
                {intervals.map((interval, index) => (
                  <div key={interval.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-gray-300 w-8">#{index + 1}</span>
                      <div className="text-sm">
                        <div className="text-white font-medium">
                          {interval.distance}m @ {interval.pace}/{interval.inputFormat}m
                          {interval.damper && (
                            <span className="text-purple-300 ml-2">Damper {interval.damper}</span>
                          )}
                          {interval.roundNumber && (
                            <span className="text-blue-300 ml-2">(Round {interval.roundNumber})</span>
                          )}
                        </div>
                        <div className="text-gray-300 text-xs">
                          {interval.result?.pace}/500m • {interval.result?.totalTime} • {interval.result?.watts}W • {interval.result?.rpm}{targetModality === 'row' ? 'spm' : 'rpm'}
                          {interval.restTime && index < intervals.length - 1 && (
                            <span className="text-orange-300"> • Rest: {interval.restTime}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeInterval(interval.id)}
                      className="text-red-400 hover:text-red-300 transition-colors p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-6">
            <p className="text-gray-400 text-xs">
              Powered by Metabolic Science
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
