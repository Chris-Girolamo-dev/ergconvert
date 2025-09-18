'use client'

import { useState, useEffect } from 'react'
import { CalibrationProfile, Sample } from '@/lib/types'
import { fitPowerCurve, validateCalibration } from '@/lib/calibration'
import { persistence } from '@/lib/persistence'
import Link from 'next/link'

const CALIBRATION_STEPS = [
  { rpm: 70, label: 'Step 1: 70 RPM' },
  { rpm: 75, label: 'Step 2: 75 RPM' },
  { rpm: 80, label: 'Step 3: 80 RPM' },
]

export default function CalibratePage() {
  const [damper, setDamper] = useState(5)
  const [currentStep, setCurrentStep] = useState(-1) // -1 = not started, 0-2 = steps, 3 = complete
  const [samples, setSamples] = useState<Sample[]>([])
  const [currentSample, setCurrentSample] = useState({ rpm: '', watts: '' })
  const [calibrationResult, setCalibrationResult] = useState<{ a: number; b: number; r2: number } | null>(null)
  const [timer, setTimer] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

  const startCalibration = () => {
    setCurrentStep(0)
    setSamples([])
    setError('')
    setCalibrationResult(null)
    setTimer(0)
    setIsTimerRunning(false)
    setCurrentSample({ rpm: CALIBRATION_STEPS[0].rpm.toString(), watts: '' })
  }

  const recordSample = () => {
    const rpm = parseFloat(currentSample.rpm)
    const watts = parseFloat(currentSample.watts)

    if (isNaN(rpm) || isNaN(watts)) {
      setError('Please enter valid numbers for RPM and Watts')
      return
    }

    if (rpm < 60 || rpm > 120) {
      setError('RPM must be between 60 and 120')
      return
    }

    if (watts < 50 || watts > 1000) {
      setError('Watts must be between 50 and 1000')
      return
    }

    const newSample: Sample = {
      rpm,
      watts,
      source: 'manual',
      timestamp: Date.now()
    }

    const newSamples = [...samples, newSample]
    setSamples(newSamples)
    setError('')

    if (currentStep < CALIBRATION_STEPS.length - 1) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      setCurrentSample({ rpm: CALIBRATION_STEPS[nextStep].rpm.toString(), watts: '' })
      setTimer(0)
      setIsTimerRunning(false)
    } else {
      // Calibration complete
      setCurrentSample({ rpm: '', watts: '' })
      finishCalibration(newSamples)
    }
  }

  const finishCalibration = async (finalSamples: Sample[]) => {
    try {
      const result = fitPowerCurve(finalSamples)
      setCalibrationResult(result)

      if (result.r2 >= 0.95) {
        const calibration: CalibrationProfile = {
          damper,
          a: result.a,
          b: result.b,
          r2: result.r2,
          samples: finalSamples
        }

        await persistence.saveCalibration(calibration)
        setCurrentStep(3) // Complete
      } else {
        setError(`Low R² (${result.r2.toFixed(3)}). Consider adding another sample for better accuracy.`)
        setCurrentStep(2) // Allow retry
      }
    } catch (err) {
      setError('Error processing calibration data')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-40"></div>
      
      <div className="relative z-10 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 p-4 rounded-full">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-3">
              BikeErg Calibration
            </h1>
            <p className="text-gray-300 text-lg max-w-sm mx-auto leading-relaxed">
              3-step protocol to fit your personal power curve
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl p-8">
            {currentStep === -1 && (
              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    Damper Setting
                  </label>
                  <select
                    value={damper}
                    onChange={(e) => setDamper(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-white backdrop-blur-sm"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => (
                      <option key={d} value={d} className="text-black">Damper {d}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-emerald-500/20 backdrop-blur-sm rounded-xl border border-emerald-400/30 p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-emerald-500 p-2 rounded-lg mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white">Calibration Protocol</h3>
                  </div>
                  <ol className="text-emerald-200 space-y-3">
                    <li className="flex items-start">
                      <span className="bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                      <span>Warm up for a few minutes on your own</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                      <span>Get to target RPM (70, 75, 80) and hold steady</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                      <span>Once stable, record the Watts shown on PM5</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
                      <span>Repeat for all three RPM targets</span>
                    </li>
                  </ol>
                </div>

                <button
                  onClick={startCalibration}
                  className="group relative w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Start Calibration</span>
                  </div>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-200"></div>
                </button>
              </div>
            )}

            {currentStep >= 0 && currentStep < 3 && (
              <div className="space-y-8">
                <div className="text-center">
                  <div className="bg-green-500/20 backdrop-blur-sm rounded-xl border border-green-400/30 p-6 mb-6">
                    <h3 className="text-2xl font-bold text-white mb-3">
                      {CALIBRATION_STEPS[currentStep]?.label}
                    </h3>
                    <p className="text-green-200 text-lg">
                      Get to {CALIBRATION_STEPS[currentStep]?.rpm} RPM and hold steady
                    </p>
                  </div>
                </div>

                <div className="bg-green-500/20 backdrop-blur-sm rounded-xl border border-green-400/30 p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-green-500 p-2 rounded-lg mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      Instructions for {CALIBRATION_STEPS[currentStep]?.rpm} RPM
                    </h3>
                  </div>
                  <ol className="text-green-200 space-y-3">
                    <li className="flex items-start">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                      <span>Gradually increase your pace to reach {CALIBRATION_STEPS[currentStep]?.rpm} RPM</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                      <span>Hold steady at {CALIBRATION_STEPS[currentStep]?.rpm} RPM for 10-15 seconds</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                      <span>Look at your PM5 display and note the Watts value</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
                      <span>Enter both values below when you have a stable reading</span>
                    </li>
                  </ol>
                </div>

                <div className="bg-emerald-500/20 backdrop-blur-sm rounded-xl border border-emerald-400/30 p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-emerald-500 p-2 rounded-lg mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      Record your steady-state values
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-emerald-200 mb-3">
                        RPM (actual)
                      </label>
                      <input
                        type="number"
                        value={currentSample.rpm}
                        onChange={(e) => setCurrentSample(prev => ({ ...prev, rpm: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-white placeholder-gray-400 backdrop-blur-sm"
                        placeholder="70"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-emerald-200 mb-3">
                        Watts (from PM5)
                      </label>
                      <input
                        type="number"
                        value={currentSample.watts}
                        onChange={(e) => setCurrentSample(prev => ({ ...prev, watts: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-white placeholder-gray-400 backdrop-blur-sm"
                        placeholder="180"
                      />
                    </div>
                  </div>
                  <button
                    onClick={recordSample}
                    disabled={!currentSample.rpm.trim() || !currentSample.watts.trim()}
                    className="group relative w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-800 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5 disabled:transform-none"
                  >
                    <div className="flex items-center justify-center space-x-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={currentStep < CALIBRATION_STEPS.length - 1 ? "M13 7l5 5m0 0l-5 5m5-5H6" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                      </svg>
                      <span>{currentStep < CALIBRATION_STEPS.length - 1 ? 'Record Sample & Continue' : 'Complete Calibration'}</span>
                    </div>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-200"></div>
                  </button>
                </div>

                {samples.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Recorded Samples:</h3>
                    <div className="space-y-3">
                      {samples.map((sample, index) => (
                        <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-200 font-medium">Step {index + 1}</span>
                            <div className="flex items-center space-x-3">
                              <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-lg font-mono text-sm">
                                {sample.rpm} RPM
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-lg font-mono text-sm">
                                {sample.watts} W
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && calibrationResult && (
              <div className="space-y-8 text-center">
                <div className="bg-emerald-500/20 backdrop-blur-sm rounded-xl border border-emerald-400/30 p-8">
                  <div className="text-emerald-400 mb-4">
                    <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-2">Calibration Complete!</h3>
                  <p className="text-emerald-200">Your personal power curve has been fitted successfully</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                  <h4 className="text-xl font-bold text-white mb-4">Your Power Curve (Damper {damper}):</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-500/20 backdrop-blur-sm rounded-lg p-4 border border-green-400/30">
                      <div className="text-green-300 text-sm font-medium mb-1">Coefficient (a)</div>
                      <div className="text-white text-lg font-mono">{calibrationResult.a.toFixed(6)}</div>
                    </div>
                    <div className="bg-green-600/20 backdrop-blur-sm rounded-lg p-4 border border-green-500/30">
                      <div className="text-green-300 text-sm font-medium mb-1">Exponent (b)</div>
                      <div className="text-white text-lg font-mono">{calibrationResult.b.toFixed(2)}</div>
                    </div>
                    <div className="bg-emerald-500/20 backdrop-blur-sm rounded-lg p-4 border border-emerald-400/30">
                      <div className="text-emerald-300 text-sm font-medium mb-1">R² (fit quality)</div>
                      <div className="text-white text-lg font-mono">{calibrationResult.r2.toFixed(3)}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setCurrentStep(-1)}
                    className="group relative flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-center space-x-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Calibrate Another Damper</span>
                    </div>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-200"></div>
                  </button>
                  <Link
                    href="/convert"
                    className="group relative flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-xl font-semibold text-center shadow-lg hover:shadow-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-center space-x-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <span>Convert Workouts</span>
                    </div>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-200"></div>
                  </Link>
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

            <div className="mt-8 text-center">
              <Link
                href="/"
                className="inline-flex items-center space-x-2 text-green-400 hover:text-green-300 transition-colors duration-200"
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
    </div>
  )
}