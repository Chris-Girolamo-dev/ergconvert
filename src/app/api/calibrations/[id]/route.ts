import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { supabaseService } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const calibrationId = params.id
    
    if (!calibrationId) {
      return NextResponse.json(
        { error: 'Calibration ID is required' },
        { status: 400 }
      )
    }

    const success = await supabaseService.deleteCalibrationProfile(
      session.user.id,
      calibrationId
    )
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete calibration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting calibration:', error)
    return NextResponse.json(
      { error: 'Failed to delete calibration' },
      { status: 500 }
    )
  }
}