import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth-config'

export async function GET() {
  try {
    return NextResponse.json({
      status: 'OK',
      authConfigExists: !!authOptions,
      providersCount: authOptions.providers?.length || 0,
      hasGoogleProvider: authOptions.providers?.some((p: any) => p.id === 'google') || false,
      sessionStrategy: authOptions.session?.strategy || 'unknown',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      status: 'ERROR',
      error: String(error),
      timestamp: new Date().toISOString()
    })
  }
}