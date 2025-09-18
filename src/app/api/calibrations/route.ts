import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { supabaseService } from '@/lib/supabase'
import { CalibrationProfile } from '@/lib/types'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    console.log('🔍 API: Checking session:', session?.user?.id)
    
    if (!session?.user?.id) {
      console.log('❌ API: No user ID in session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`🔍 API: Fetching calibrations for user: ${session.user.id}`)
    const calibrations = await supabaseService.getCalibrationProfiles(session.user.id)
    console.log(`✅ API: Found ${calibrations.length} calibrations`)
    
    return NextResponse.json({ calibrations })
  } catch (error) {
    console.error('❌ API: Error fetching calibrations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calibrations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    console.log('📝 API POST: Checking session:', session?.user?.id)
    
    if (!session?.user?.id) {
      console.log('❌ API POST: No user ID in session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const calibration: CalibrationProfile = await request.json()
    console.log(`📝 API POST: Saving calibration for user ${session.user.id}, damper ${calibration.damper}`)
    
    // Validate required fields
    if (!calibration.damper || !calibration.a || !calibration.b || !calibration.r2 || !calibration.samples) {
      return NextResponse.json(
        { error: 'Missing required calibration fields' },
        { status: 400 }
      )
    }

    // Validate samples
    if (!Array.isArray(calibration.samples) || calibration.samples.length === 0) {
      return NextResponse.json(
        { error: 'Calibration must have at least one sample' },
        { status: 400 }
      )
    }

    const calibrationId = await supabaseService.saveCalibrationProfile(
      session.user.id,
      calibration
    )
    
    if (!calibrationId) {
      return NextResponse.json(
        { error: 'Failed to save calibration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      calibrationId 
    })
  } catch (error) {
    console.error('Error saving calibration:', error)
    return NextResponse.json(
      { error: 'Failed to save calibration' },
      { status: 500 }
    )
  }
}