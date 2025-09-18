'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-40"></div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-green-400 to-green-600 p-4 rounded-full">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 3v12a2 2 0 002 2h6a2 2 0 002-2V7M7 7h10M9 11h6m-6 4h6" />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-3">
              Row↔Bike Converter
            </h1>
            <p className="text-gray-300 text-lg max-w-sm mx-auto leading-relaxed">
              Convert workouts between Concept2 RowErg and BikeErg with personalized calibration
            </p>
          </div>

          {/* Main Actions */}
          <div className="space-y-4">
            <Link 
              href="/convert"
              className="group relative block w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-xl font-semibold text-center shadow-lg hover:shadow-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Convert a Workout</span>
              </div>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-200"></div>
            </Link>
            
            <Link 
              href="/calibrate"
              className="group relative block w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-4 px-6 rounded-xl font-semibold text-center shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Calibrate BikeErg</span>
              </div>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-200"></div>
            </Link>
            
            <Link 
              href="/settings"
              className="group relative block w-full bg-gradient-to-r from-green-800 to-green-900 text-white py-4 px-6 rounded-xl font-semibold text-center shadow-lg hover:shadow-xl hover:from-green-900 hover:to-green-950 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                <span>Settings</span>
              </div>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-200"></div>
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="text-blue-400 mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-sm">Watts Based</h3>
              <p className="text-gray-300 text-xs">Metabolic ground truth</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="text-emerald-400 mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-sm">Personalized</h3>
              <p className="text-gray-300 text-xs">Your power curve</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-6">
            <p className="text-gray-400 text-sm">
              Professional workout conversion for serious athletes
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
