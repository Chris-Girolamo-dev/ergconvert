'use client'

import { useState, useEffect } from 'react'
import { CalibrationProfile, UserProfile } from '@/lib/types'
import { persistence } from '@/lib/persistence'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'

export default function SettingsPage() {
  const { session } = useAuth()
  const [calibrations, setCalibrations] = useState<CalibrationProfile[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [preferredUnits, setPreferredUnits] = useState<'watts' | 'pace' | 'rpm'>('watts')
  const [exportData, setExportData] = useState('')
  const [importData, setImportData] = useState('')
  const [message, setMessage] = useState('')
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load calibration history (sorted by created_at descending)
      const allCalibrations = await persistence.getCalibrationHistory()
      setCalibrations(allCalibrations)

      // Load or create profile
      let userProfile = await persistence.loadProfile('default')
      if (!userProfile) {
        userProfile = {
          id: 'default',
          preferred_units: 'watts',
          last_damper: 5,
          calibrations: []
        }
        await persistence.saveProfile(userProfile)
      }
      setProfile(userProfile)
      setPreferredUnits(userProfile.preferred_units)
    } catch (err) {
      setMessage('Error loading data')
    }
  }

  const savePreferences = async () => {
    if (!profile) return

    const updatedProfile: UserProfile = {
      ...profile,
      preferred_units: preferredUnits
    }

    try {
      await persistence.saveProfile(updatedProfile)
      setProfile(updatedProfile)
      setMessage('Preferences saved!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('Error saving preferences')
    }
  }

  const exportDataHandler = async () => {
    try {
      const data = await persistence.exportData()
      setExportData(data)
      setMessage('Data exported! Copy the JSON below.')
    } catch (err) {
      setMessage('Error exporting data')
    }
  }

  const importDataHandler = async () => {
    if (!importData.trim()) {
      setMessage('Please paste JSON data to import')
      return
    }

    try {
      await persistence.importData(importData)
      setImportData('')
      await loadData()
      setMessage('Data imported successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('Error importing data - please check JSON format')
    }
  }

  const copyExportData = () => {
    navigator.clipboard.writeText(exportData)
    setMessage('Export data copied to clipboard!')
    setTimeout(() => setMessage(''), 3000)
  }

  const downloadExportData = () => {
    const blob = new Blob([exportData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `row-bike-converter-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const deleteCalibration = async (calibration: CalibrationProfile) => {
    if (!confirm('Are you sure you want to delete this calibration? This cannot be undone.')) {
      return
    }

    const localId = calibration.id as number
    const cloudId = typeof calibration.id === 'string' ? calibration.id : null

    // Add to deleting set for loading state
    setDeletingIds(prev => new Set(prev.add(localId)))

    try {
      console.log('🗑️ Starting calibration deletion...', { localId, cloudId, hasSession: !!session })

      // Step 1: Delete from local storage (always do this first for immediate UI feedback)
      await persistence.deleteCalibration(localId)
      console.log('✅ Deleted from local storage')

      // Step 2: If user is signed in and we have a cloud ID, delete from cloud
      if (session?.user?.id && cloudId) {
        console.log('☁️ Attempting cloud deletion...', cloudId)
        try {
          const response = await fetch(`/api/calibrations/${cloudId}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            const errorData = await response.text()
            console.error('❌ Cloud delete failed:', response.status, errorData)
            setMessage('Deleted locally, but cloud delete failed. Will sync next time you\'re online.')
          } else {
            console.log('✅ Successfully deleted from cloud')
            setMessage('Calibration deleted successfully from all devices!')
          }
        } catch (cloudError) {
          console.error('❌ Cloud delete error:', cloudError)
          setMessage('Deleted locally, but cloud delete failed. Will sync next time you\'re online.')
        }
      } else if (session?.user?.id) {
        // User is signed in but calibration doesn't have cloud ID (local-only calibration)
        setMessage('Calibration deleted successfully!')
      } else {
        // User not signed in - local delete only
        setMessage('Calibration deleted locally!')
      }

      setTimeout(() => setMessage(''), 5000)
      
      // Reload calibrations to update UI
      await loadData()
    } catch (err) {
      console.error('❌ Delete calibration error:', err)
      setMessage('Error deleting calibration')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      // Remove from deleting set
      setDeletingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(localId)
        return newSet
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-40"></div>
      
      <div className="relative z-10 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-green-400 to-green-600 p-4 rounded-full">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-3">
              Settings
            </h1>
            <p className="text-gray-300 text-lg max-w-sm mx-auto leading-relaxed">
              Manage your preferences and calibrations
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Preferences */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl p-8">
              <div className="flex items-center mb-6">
                <div className="bg-green-500 p-3 rounded-lg mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Preferences</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    Preferred Units
                  </label>
                  <select
                    value={preferredUnits}
                    onChange={(e) => setPreferredUnits(e.target.value as 'watts' | 'pace' | 'rpm')}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-white backdrop-blur-sm"
                  >
                    <option value="watts" className="text-black">Watts</option>
                    <option value="pace" className="text-black">Pace</option>
                    <option value="rpm" className="text-black">RPM</option>
                  </select>
                </div>

                <button
                  onClick={savePreferences}
                  className="group relative w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Save Preferences</span>
                  </div>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-200"></div>
                </button>
              </div>
            </div>

            {/* Calibrations */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="bg-emerald-500 p-3 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Calibrations</h2>
                </div>
                <Link
                  href="/calibrate"
                  className="group relative bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-2 px-4 rounded-lg font-medium shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add New</span>
                  </div>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-lg transition-opacity duration-200"></div>
                </Link>
              </div>

              {calibrations.length > 0 ? (
                <div className="space-y-4">
                  {calibrations.map((cal, index) => (
                    <div key={cal.id || index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-white font-bold text-lg">Damper {cal.damper}</div>
                            {cal.created_at && (
                              <div className="text-gray-400 text-sm">
                                {new Date(cal.created_at).toLocaleDateString()} {new Date(cal.created_at).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                          <div className="text-gray-300 mb-2">
                            R² = {cal.r2.toFixed(3)} ({cal.samples.length} samples)
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="bg-green-500/20 text-green-300 px-3 py-1 rounded-lg font-mono text-sm">
                              a = {cal.a.toFixed(6)}
                            </div>
                            <div className="bg-green-600/20 text-green-300 px-3 py-1 rounded-lg font-mono text-sm">
                              b = {cal.b.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        {cal.id && (
                          <div className="ml-4">
                            <button
                              onClick={() => deleteCalibration(cal)}
                              disabled={deletingIds.has(cal.id as number)}
                              className="group relative bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={deletingIds.has(cal.id as number) ? "Deleting..." : "Delete calibration"}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-8">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-lg mb-3">No calibrations yet</p>
                    <Link
                      href="/calibrate"
                      className="inline-flex items-center space-x-2 text-emerald-400 hover:text-emerald-300 transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Create your first calibration</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Data Export/Import */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl p-8 lg:col-span-2">
              <div className="flex items-center mb-6">
                <div className="bg-green-600 p-3 rounded-lg mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Data Management</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-emerald-500 p-2 rounded-lg mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white">Export Data</h3>
                  </div>
                  <p className="text-gray-300 mb-4">
                    Create a backup of your calibrations and settings
                  </p>
                  <button
                    onClick={exportDataHandler}
                    className="group relative w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 transform hover:-translate-y-0.5 mb-4"
                  >
                    <div className="flex items-center justify-center space-x-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      <span>Export Data</span>
                    </div>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-200"></div>
                  </button>
                  
                  {exportData && (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <button
                          onClick={copyExportData}
                          className="group relative flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white py-2 px-3 rounded-lg font-medium shadow-lg hover:shadow-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 transform hover:-translate-y-0.5"
                        >
                          <div className="flex items-center justify-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy</span>
                          </div>
                          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-lg transition-opacity duration-200"></div>
                        </button>
                        <button
                          onClick={downloadExportData}
                          className="group relative flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-2 px-3 rounded-lg font-medium shadow-lg hover:shadow-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:-translate-y-0.5"
                        >
                          <div className="flex items-center justify-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Download</span>
                          </div>
                          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-lg transition-opacity duration-200"></div>
                        </button>
                      </div>
                      <textarea
                        value={exportData}
                        readOnly
                        className="w-full h-32 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-xs font-mono text-white backdrop-blur-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-green-700 p-2 rounded-lg mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white">Import Data</h3>
                  </div>
                  <p className="text-gray-300 mb-4">
                    Restore from a backup or import data from another device
                  </p>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste exported JSON data here..."
                    className="w-full h-32 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-xs font-mono mb-4 text-white placeholder-gray-400 backdrop-blur-sm"
                  />
                  <button
                    onClick={importDataHandler}
                    className="group relative w-full bg-gradient-to-r from-green-700 to-green-800 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-green-800 hover:to-green-900 transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-center space-x-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>Import Data</span>
                    </div>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-200"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div className="mt-8 bg-green-500/20 backdrop-blur-sm border border-green-400/30 text-green-300 px-6 py-4 rounded-xl text-center">
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{message}</span>
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
  )
}