'use client'

import { useState, useEffect } from 'react'
import { Workout, CalibrationProfile, ConversionResult } from '@/lib/types'
import { convertWorkout, formatConversionForExport, getRestTargets } from '@/lib/converter'
import { persistence } from '@/lib/persistence'
import { formatPace, parsePace } from '@/lib/c2'
import Link from 'next/link'

// Helper functions for MM:SS format
const formatTimeToMMSS = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const parseMMSSToSeconds = (mmss: string): number => {
  if (!mmss.includes(':')) return parseFloat(mmss) || 0
  const [mins, secs] = mmss.split(':')
  return parseInt(mins) * 60 + parseInt(secs)
}

export default function ConvertPage() {
  const [sourceModality, setSourceModality] = useState<'row' | 'bike'>('row')
  const [targetModality, setTargetModality] = useState<'row' | 'bike'>('bike')
  const [targetSpec, setTargetSpec] = useState<'pace_500' | 'pace_1000' | 'watts' | 'rpm'>('pace_500')
  const [damper, setDamper] = useState(5)
  const [intervals, setIntervals] = useState([{ distance: 250, target_value: 110, target_display: '1:50' }]) // 1:50 pace = 110 seconds
  const [rest, setRest] = useState(45)
  const [calibrations, setCalibrations] = useState<CalibrationProfile[]>([])
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCalibrations()
  }, [damper])

  useEffect(() => {
    // Update display format when target spec changes
    const updated = intervals.map(interval => {
      if (targetSpec.includes('pace')) {
        const displayValue = formatTimeToMMSS(interval.target_value)
        return { ...interval, target_display: displayValue }
      } else {
        return { ...interval, target_display: interval.target_value.toString() }
      }
    })
    setIntervals(updated)
  }, [targetSpec])

  const loadCalibrations = async () => {
    try {
      const cals = await persistence.loadCalibrationsByDamper(damper)
      setCalibrations(cals)
    } catch (err) {
      console.error('Error loading calibrations:', err)
    }
  }

  const getTargetLabel = () => {
    switch (targetSpec) {
      case 'pace_500': return 'Pace (/500m)'
      case 'pace_1000': return 'Pace (/1000m)'
      case 'watts': return 'Watts'
      case 'rpm': return 'RPM'
    }
  }

  const getTargetPlaceholder = () => {
    switch (targetSpec) {
      case 'pace_500': return '1:50'
      case 'pace_1000': return '3:40'
      case 'watts': return '180'
      case 'rpm': return '75'
    }
  }

  const addInterval = () => {
    const newInterval = { distance: 250, target_value: 110, target_display: '1:50' }
    setIntervals([...intervals, newInterval])
  }

  const removeInterval = (index: number) => {
    if (intervals.length > 1) {
      setIntervals(intervals.filter((_, i) => i !== index))
    }
  }

  const updateInterval = (index: number, field: string, value: string | number) => {
    const updated = [...intervals]
    if (field === 'target_value') {
      if (targetSpec.includes('pace')) {
        // Handle MM:SS format
        const seconds = parseMMSSToSeconds(value.toString())
        updated[index].target_value = seconds
        updated[index].target_display = value.toString()
      } else {
        updated[index].target_value = typeof value === 'string' ? parseFloat(value) : value
        updated[index].target_display = value.toString()
      }
    } else {
      // Handle other fields like distance
      if (field === 'distance') {
        updated[index].distance = typeof value === 'string' ? parseFloat(value) : value
      }
    }
    setIntervals(updated)
  }

  const convertWorkoutHandler = async () => {
    try {
      setError('')
      
      // Get calibration for BikeErg target workouts
      let calibrationProfile: CalibrationProfile | undefined
      if (targetModality === 'bike') {
        const cals = await persistence.loadCalibrationsByDamper(damper)
        calibrationProfile = cals[0] // Use most recent calibration for this damper
      }

      const workout: Workout = {
        id: Date.now().toString(), // Generate a simple ID
        source_modality: sourceModality,
        target_modality: targetModality,
        target_spec: targetSpec,
        damper_for_target: damper,
        intervals: intervals.map(interval => ({
          distance: interval.distance || undefined,
          target_value: interval.target_value
        })),
        rest: rest
      }

      const conversionResult = convertWorkout(workout, calibrationProfile)
      setResult(conversionResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const downloadCSV = (csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'workout-conversion.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-40"></div>
      
      <div className="relative z-10 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center mb-6">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent ml-6">
                Workout Converter
              </h1>
            </div>
            <p className="text-gray-300 text-lg">
              Convert between RowErg and BikeErg workouts with precision
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <svg className="w-6 h-6 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                Workout Setup
              </h2>
            
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-3">
                      Source Equipment
                    </label>
                    <select
                      value={sourceModality}
                      onChange={(e) => setSourceModality(e.target.value as 'row' | 'bike')}
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm"
                    >
                      <option value="row" className="bg-gray-800 text-white">RowErg</option>
                      <option value="bike" className="bg-gray-800 text-white">BikeErg</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-3">
                      Target Equipment
                    </label>
                    <select
                      value={targetModality}
                      onChange={(e) => setTargetModality(e.target.value as 'row' | 'bike')}
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm"
                    >
                      <option value="row" className="bg-gray-800 text-white">RowErg</option>
                      <option value="bike" className="bg-gray-800 text-white">BikeErg</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    Target Units
                  </label>
                  <select
                    value={targetSpec}
                    onChange={(e) => setTargetSpec(e.target.value as 'pace_500' | 'pace_1000' | 'watts' | 'rpm')}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm"
                  >
                    <option value="pace_500" className="bg-gray-800 text-white">Pace (/500m)</option>
                    <option value="pace_1000" className="bg-gray-800 text-white">Pace (/1000m)</option>
                    <option value="watts" className="bg-gray-800 text-white">Watts</option>
                    <option value="rpm" className="bg-gray-800 text-white">RPM</option>
                  </select>
                </div>

                {targetModality === 'bike' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-3">
                      Damper Setting
                    </label>
                    <select
                      value={damper}
                      onChange={(e) => setDamper(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => (
                        <option key={d} value={d} className="bg-gray-800 text-white">Damper {d}</option>
                      ))}
                    </select>
                    {calibrations.length === 0 && (
                      <p className="text-xs text-amber-300 mt-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        No calibration for damper {damper} - <Link href="/calibrate" className="underline hover:text-white">calibrate now</Link>
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    Rest Between Intervals (seconds)
                  </label>
                  <input
                    type="number"
                    value={rest}
                    onChange={(e) => setRest(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-semibold text-gray-200">
                      Intervals
                    </label>
                    <button
                      onClick={addInterval}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Interval
                    </button>
                  </div>
                  <div className="space-y-3">
                    {intervals.map((interval, index) => (
                      <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-300 mb-1">Distance (m)</label>
                            <input
                              type="number"
                              placeholder="1000"
                              value={interval.distance || ''}
                              onChange={(e) => updateInterval(index, 'distance', Number(e.target.value))}
                              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-400 backdrop-blur-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-300 mb-1">{getTargetLabel()}</label>
                            <input
                              type={targetSpec.includes('pace') ? 'text' : 'number'}
                              placeholder={getTargetPlaceholder()}
                              value={targetSpec.includes('pace') ? (interval.target_display || '') : interval.target_value}
                              onChange={(e) => updateInterval(index, 'target_value', targetSpec.includes('pace') ? e.target.value : Number(e.target.value))}
                              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-400 backdrop-blur-sm"
                            />
                          </div>
                          <div className="flex justify-end md:justify-center">
                            <button
                              onClick={() => removeInterval(index)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all duration-200"
                              disabled={intervals.length === 1}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Target in {getTargetLabel().toLowerCase()}
                    {targetSpec.includes('pace') && ' (MM:SS format)'}
                  </p>
                </div>

                <button
                  onClick={convertWorkoutHandler}
                  className="group relative w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>Convert Workout</span>
                  </div>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-200"></div>
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl p-8">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-6">Conversion Result</h2>
              
              {result ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 backdrop-blur-sm rounded-xl border border-emerald-400/30 p-6">
                    <div className="flex items-center mb-4">
                      <div className="bg-emerald-500 p-2 rounded-lg mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        {targetModality === 'bike' ? 'BikeErg' : 'RowErg'} Workout
                        {targetModality === 'bike' && ` (Damper ${result.damper})`}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {result.intervals.map((interval, index) => (
                        <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-200 font-medium">
                              {interval.rep}. {interval.distance_meters ? 
                                `${interval.distance_meters}m` : 
                                interval.duration_seconds ? 
                                  `${Math.floor(interval.duration_seconds / 60)}:${(interval.duration_seconds % 60).toString().padStart(2, '0')}` :
                                  'Interval'
                              }
                            </span>
                            <div className="flex items-center space-x-4">
                              <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg font-mono text-sm">
                                {interval.target_rpm} RPM
                              </span>
                              <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-lg font-mono text-sm">
                                {interval.target_watts}W
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 border-t-2 border-t-gray-400">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-200 font-medium">Rest Period:</span>
                          <div className="flex items-center space-x-4">
                            <span className="bg-gray-500/20 text-gray-300 px-3 py-1 rounded-lg font-mono text-sm">
                              {result.rest_seconds}s
                            </span>
                            <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg font-mono text-sm">
                              {getRestTargets(result.damper).rpm.min}-{getRestTargets(result.damper).rpm.max} RPM
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => copyToClipboard(formatConversionForExport(result, 'text'))}
                      className="group relative flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white py-3 px-4 rounded-xl font-medium shadow-lg hover:shadow-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 transform hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copy Text</span>
                      </div>
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-200"></div>
                    </button>
                    <button
                      onClick={() => downloadCSV(formatConversionForExport(result, 'csv'))}
                      className="group relative flex-1 bg-gradient-to-r from-green-700 to-green-800 text-white py-3 px-4 rounded-xl font-medium shadow-lg hover:shadow-xl hover:from-green-800 hover:to-green-900 transition-all duration-200 transform hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Download CSV</span>
                      </div>
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-200"></div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-8">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-lg">Convert a workout to see results here</p>
                    <p className="text-gray-500 text-sm mt-2">Fill out the form above and click Convert Workout</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-300 px-6 py-4 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}