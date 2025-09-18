import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const nextAuthUrl = process.env.NEXTAUTH_URL
  const nextAuthSecret = process.env.NEXTAUTH_SECRET
  const googleClientId = process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

  // Quick database test
  let databaseTest = { success: false, error: 'Not tested' }
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('calibration_profiles')
        .select('count', { count: 'exact', head: true })
      
      if (error) {
        databaseTest = { 
          success: false, 
          error: `${error.code}: ${error.message}${error.hint ? ' (Hint: ' + error.hint + ')' : ''}` 
        }
      } else {
        databaseTest = { success: true, error: 'Database accessible' }
      }
    } catch (err) {
      databaseTest = { success: false, error: String(err) }
    }
  } else {
    databaseTest = { success: false, error: 'Supabase client not initialized' }
  }

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
    supabaseServiceKey: supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : 'MISSING',
    nextAuthUrl: nextAuthUrl ? `${nextAuthUrl.substring(0, 20)}...` : 'MISSING',
    nextAuthSecret: nextAuthSecret ? `${nextAuthSecret.substring(0, 20)}...` : 'MISSING',
    googleClientId: googleClientId ? `${googleClientId.substring(0, 20)}...` : 'MISSING',
    googleClientSecret: googleClientSecret ? `${googleClientSecret.substring(0, 20)}...` : 'MISSING',
    databaseTest
  })
}