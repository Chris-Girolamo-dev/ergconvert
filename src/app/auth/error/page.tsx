'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const errorMessages: { [key: string]: string } = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'Access denied. You do not have permission to sign in.',
  Verification: 'The verification token has expired or has already been used.',
  Default: 'An unexpected error occurred during authentication.',
}

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Default'
  const errorMessage = errorMessages[error] || errorMessages.Default

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-red-400 to-red-600 p-4 rounded-full">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-3">
            Authentication Error
          </h1>
          <p className="text-gray-300 text-base">
            {errorMessage}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20">
          <div className="space-y-4">
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="text-red-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-red-300 font-semibold text-sm">Error Code: {error}</h3>
                  <p className="text-red-200/80 text-xs mt-1">{errorMessage}</p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Link
                href="/auth/signin"
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-lg font-semibold text-center shadow-lg hover:shadow-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Try Again
              </Link>
              <Link
                href="/"
                className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white py-3 px-4 rounded-lg font-semibold text-center shadow-lg hover:shadow-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-400 text-sm">
            If this problem persists, please contact support
          </p>
        </div>
      </div>
    </div>
  )
}