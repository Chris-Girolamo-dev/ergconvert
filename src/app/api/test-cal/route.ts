import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'

export async function POST() {
  console.log('🧪 Testing calibration save without auth...')
  
  // First test: Try direct table access
  try {
    const { supabase } = await import('@/lib/supabase')
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Supabase client not available',
        step: 'client_initialization',
        timestamp: new Date().toISOString()
      })
    }

    console.log('🧪 Step 1: Testing basic table access...')
    const { data: tableCheck, error: tableError } = await supabase
      .from('calibration_profiles')
      .select('count', { count: 'exact', head: true })

    if (tableError) {
      console.error('🧪 Table access error:', tableError)
      return NextResponse.json({
        success: false,
        error: `Table access failed: ${tableError.code} - ${tableError.message}`,
        hint: tableError.hint,
        details: tableError.details,
        step: 'table_access',
        timestamp: new Date().toISOString()
      })
    }

    console.log('🧪 Step 2: Testing insert operation...')
    const testRecord = {
      user_id: 'test-user-999',
      damper: 999,
      coefficient_a: 1.23,
      coefficient_b: 4.56,
      r_squared: 0.95
    }

    const { data: insertData, error: insertError } = await supabase
      .from('calibration_profiles')
      .insert(testRecord)
      .select()

    if (insertError) {
      console.error('🧪 Insert error:', insertError)
      return NextResponse.json({
        success: false,
        error: `Insert failed: ${insertError.code} - ${insertError.message}`,
        hint: insertError.hint,
        details: insertError.details,
        step: 'insert_operation',
        timestamp: new Date().toISOString()
      })
    }

    // Clean up test record
    if (insertData && insertData.length > 0) {
      await supabase
        .from('calibration_profiles')
        .delete()
        .eq('id', insertData[0].id)
    }

    return NextResponse.json({
      success: true,
      message: 'Direct database test successful',
      insertedId: insertData?.[0]?.id,
      step: 'completed',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('🧪 Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: String(error),
      step: 'exception',
      timestamp: new Date().toISOString()
    })
  }
}