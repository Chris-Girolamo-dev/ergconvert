import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { supabaseService } from '@/lib/supabase'
import { CalibrationProfile } from '@/lib/types'

export async function GET() {
  try {
    console.log('🔍 API GET: Starting GET request')
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('🔍 API GET: No authenticated user')
      return NextResponse.json({ calibrations: [] })
    }
    
    console.log('🔍 API GET: Fetching calibrations for user:', session.user.id)
    const calibrations = await supabaseService.getCalibrationProfiles(session.user.id)
    console.log(`🔍 API GET: Returning ${calibrations.length} calibrations`)
    
    return NextResponse.json({ calibrations })
    
  } catch (error) {
    console.error('🔍 API GET: Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calibrations', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 API POST: Starting POST request')
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('📝 API POST: No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const calibration: CalibrationProfile = await request.json()
    console.log('📝 API POST: Saving calibration for user:', session.user.id)
    console.log('📝 API POST: Calibration data:', { damper: calibration.damper, samples: calibration.samples?.length })
    
    const calibrationId = await supabaseService.saveCalibrationProfile(session.user.id, calibration)
    
    if (!calibrationId) {
      console.error('📝 API POST: Failed to save calibration')
      return NextResponse.json(
        { error: 'Failed to save calibration' },
        { status: 500 }
      )
    }
    
    console.log('📝 API POST: Successfully saved calibration with ID:', calibrationId)
    return NextResponse.json({ success: true, calibrationId })
    
  } catch (error) {
    console.error('📝 API POST: Error:', error)
    return NextResponse.json(
      { error: 'Failed to save calibration', details: String(error) },
      { status: 500 }
    )
  }
}