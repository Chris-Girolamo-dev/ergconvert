import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  console.log('🧪 Database connectivity test starting...')
  
  if (!supabase) {
    return NextResponse.json({
      success: false,
      error: 'Supabase client not initialized',
      timestamp: new Date().toISOString()
    })
  }

  try {
    // Test 1: Basic connectivity
    console.log('🧪 Test 1: Testing basic Supabase connectivity...')
    const { data: authData, error: authError } = await supabase.auth.getSession()
    console.log('🧪 Auth test result:', { authData: !!authData, authError })

    // Test 2: Check if tables exist
    console.log('🧪 Test 2: Testing table existence...')
    const { data: tables, error: tablesError } = await supabase
      .from('calibration_profiles')
      .select('count', { count: 'exact', head: true })

    if (tablesError) {
      console.error('🧪 Tables test error:', tablesError)
      return NextResponse.json({
        success: false,
        error: 'Table access failed',
        details: {
          code: tablesError.code,
          message: tablesError.message,
          hint: tablesError.hint,
          details: tablesError.details
        },
        timestamp: new Date().toISOString()
      })
    }

    // Test 3: Try to insert a test record
    console.log('🧪 Test 3: Testing insert operation...')
    const testRecord = {
      user_id: 'test-user-123',
      damper: 999,
      coefficient_a: 1.0,
      coefficient_b: 2.0,
      r_squared: 0.95
    }

    const { data: insertData, error: insertError } = await supabase
      .from('calibration_profiles')
      .insert(testRecord)
      .select()

    if (insertError) {
      console.error('🧪 Insert test error:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Insert operation failed',
        details: {
          code: insertError.code,
          message: insertError.message,
          hint: insertError.hint,
          details: insertError.details
        },
        timestamp: new Date().toISOString()
      })
    }

    // Test 4: Clean up test record
    console.log('🧪 Test 4: Cleaning up test record...')
    if (insertData && insertData.length > 0) {
      await supabase
        .from('calibration_profiles')
        .delete()
        .eq('id', insertData[0].id)
    }

    console.log('🧪 All tests passed!')
    return NextResponse.json({
      success: true,
      message: 'All database tests passed',
      tests: {
        connectivity: true,
        tableAccess: true,
        insertOperation: true,
        cleanup: true
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('🧪 Unexpected error during database test:', error)
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: String(error),
      timestamp: new Date().toISOString()
    })
  }
}