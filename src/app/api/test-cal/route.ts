import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'

export async function POST() {
  try {
    console.log('🧪 Testing calibration save without auth...')
    
    // Test calibration data
    const testCalibration = {
      damper: 999,
      a: 1.23,
      b: 4.56, 
      r2: 0.95,
      samples: [
        { rpm: 100, watts: 50, source: 'manual' as const, timestamp: Date.now() },
        { rpm: 200, watts: 100, source: 'manual' as const, timestamp: Date.now() }
      ],
      created_at: Date.now(),
      updated_at: Date.now()
    }
    
    console.log('🧪 Attempting to save test calibration...')
    const result = await supabaseService.saveCalibrationProfile('test-user-999', testCalibration)
    
    return NextResponse.json({
      success: !!result,
      calibrationId: result,
      message: result ? 'Test calibration saved successfully' : 'Failed to save test calibration',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('🧪 Test calibration error:', error)
    return NextResponse.json({
      success: false,
      error: String(error),
      message: 'Exception during test calibration save',
      timestamp: new Date().toISOString()
    })
  }
}