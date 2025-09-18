import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { supabaseService } from '@/lib/supabase'
import { CalibrationProfile } from '@/lib/types'

export async function GET() {
  try {
    console.log('🔍 API GET: Starting GET request - NEW VERSION')
    
    // Quick test: return empty calibrations to isolate issue
    return NextResponse.json({ 
      calibrations: [],
      message: 'GET route working - returning empty calibrations for testing'
    })
    
  } catch (error) {
    console.error('🔍 API GET: Catch block error:', error)
    return NextResponse.json(
      { error: 'GET route catch error', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 API POST: Starting POST request - NEW VERSION')
    
    // Quick test: return success immediately to isolate issue
    return NextResponse.json({ 
      success: true, 
      calibrationId: 'test-123',
      message: 'POST route working - Supabase disabled for testing'
    })
    
  } catch (error) {
    console.error('📝 API POST: Catch block error:', error)
    return NextResponse.json(
      { error: 'POST route catch error', details: String(error) },
      { status: 500 }
    )
  }
}