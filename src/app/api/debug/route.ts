import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const nextAuthUrl = process.env.NEXTAUTH_URL
  const nextAuthSecret = process.env.NEXTAUTH_SECRET
  const googleClientId = process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

  // Simple database test without heavy imports
  let databaseTest = { success: false, error: 'Supabase import disabled for 502 debugging' }
  
  // Basic connectivity test
  try {
    if (supabaseUrl && supabaseServiceKey) {
      // Try a basic fetch to test if the URL is reachable
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        }
      })
      
      if (response.ok) {
        databaseTest = { success: true, error: 'Basic Supabase endpoint accessible' }
      } else {
        databaseTest = { success: false, error: `Supabase endpoint returned ${response.status}` }
      }
    } else {
      databaseTest = { success: false, error: 'Missing Supabase environment variables' }
    }
  } catch (err) {
    databaseTest = { success: false, error: `Fetch error: ${String(err)}` }
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