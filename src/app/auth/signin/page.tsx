'use client'

import { signIn, getProviders } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function SignIn() {
  const [providers, setProviders] = useState<any>(null)

  useEffect(() => {
    const getProvidersData = async () => {
      const res = await getProviders()
      setProviders(res)
    }
    getProvidersData()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-green-400 to-green-600 p-4 rounded-full">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 3v12a2 2 0 002 2h6a2 2 0 002-2V7M7 7h10M9 11h6m-6 4h6" />
                </svg>
              </div>
            </div>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-3">
            Sign in to Row↔Bike Converter
          </h1>
          <p className="text-gray-300 text-base">
            Sign in to sync your calibration data across devices
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20">
          {providers && Object.values(providers).map((provider: any) => (
            <div key={provider.name} className="mb-4 last:mb-0">
              <button
                onClick={() => signIn(provider.id, { callbackUrl: '/' })}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-lg font-semibold text-center shadow-lg hover:shadow-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center space-x-3"
              >
                {provider.id === 'google' && (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span>Sign in with {provider.name}</span>
              </button>
            </div>
          ))}
          
          <div className="mt-6 text-center">
            <Link 
              href="/"
              className="text-green-400 hover:text-green-300 text-sm font-medium"
            >
              ← Back to app
            </Link>
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-400 text-sm">
            Your data is securely stored and synced across your devices
          </p>
        </div>
      </div>
    </div>
  )
}