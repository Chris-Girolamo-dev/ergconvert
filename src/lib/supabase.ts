import { createClient } from '@supabase/supabase-js'
import { CalibrationProfile, Sample, UserProfile } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Only create client if environment variables are available
export const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export interface SupabaseCalibrationProfile {
  id: string
  user_id: string
  damper: number
  coefficient_a: number
  coefficient_b: number
  r_squared: number
  created_at: string
  updated_at: string
}

export interface SupabaseCalibrationSample {
  id: string
  calibration_id: string
  rpm: number
  watts: number
  source: 'manual' | 'ble'
  timestamp_recorded: string
  created_at: string
}

export interface SupabaseUserProfile {
  id: string
  preferred_units: 'watts' | 'pace' | 'rpm'
  last_damper: number
  created_at: string
  updated_at: string
}

export class SupabaseService {
  async getUserProfile(userId: string): Promise<SupabaseUserProfile | null> {
    if (!supabase) return null
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  }

  async updateUserProfile(userId: string, updates: Partial<SupabaseUserProfile>): Promise<SupabaseUserProfile | null> {
    if (!supabase) return null
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      return null
    }

    return data
  }

  async getCalibrationProfiles(userId: string): Promise<CalibrationProfile[]> {
    if (!supabase) return []
    
    // Get calibration profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('calibration_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('Error fetching calibration profiles:', profilesError)
      return []
    }

    // Get samples for each profile
    const calibrations: CalibrationProfile[] = []
    
    for (const profile of profiles) {
      const { data: samples, error: samplesError } = await supabase
        .from('calibration_samples')
        .select('*')
        .eq('calibration_id', profile.id)
        .order('timestamp_recorded', { ascending: true })

      if (samplesError) {
        console.error('Error fetching calibration samples:', samplesError)
        continue
      }

      const calibration: CalibrationProfile = {
        id: profile.id,
        damper: profile.damper,
        a: profile.coefficient_a,
        b: profile.coefficient_b,
        r2: profile.r_squared,
        samples: samples.map(sample => ({
          rpm: sample.rpm,
          watts: sample.watts,
          source: sample.source,
          timestamp: new Date(sample.timestamp_recorded).getTime()
        })),
        created_at: new Date(profile.created_at).getTime(),
        updated_at: new Date(profile.updated_at).getTime()
      }

      calibrations.push(calibration)
    }

    return calibrations
  }

  async saveCalibrationProfile(userId: string, calibration: CalibrationProfile): Promise<string | null> {
    if (!supabase) return null
    
    // Insert calibration profile
    const { data: profileData, error: profileError } = await supabase
      .from('calibration_profiles')
      .insert({
        user_id: userId,
        damper: calibration.damper,
        coefficient_a: calibration.a,
        coefficient_b: calibration.b,
        r_squared: calibration.r2
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error saving calibration profile:', profileError)
      return null
    }

    const calibrationId = profileData.id

    // Insert samples
    const sampleInserts = calibration.samples.map(sample => ({
      calibration_id: calibrationId,
      rpm: sample.rpm,
      watts: sample.watts,
      source: sample.source,
      timestamp_recorded: new Date(sample.timestamp).toISOString()
    }))

    const { error: samplesError } = await supabase
      .from('calibration_samples')
      .insert(sampleInserts)

    if (samplesError) {
      console.error('Error saving calibration samples:', samplesError)
      // Clean up the profile if samples failed
      await supabase
        .from('calibration_profiles')
        .delete()
        .eq('id', calibrationId)
      return null
    }

    return calibrationId
  }

  async deleteCalibrationProfile(userId: string, calibrationId: string): Promise<boolean> {
    if (!supabase) return false
    
    // Verify ownership
    const { data: profile, error: verifyError } = await supabase
      .from('calibration_profiles')
      .select('user_id')
      .eq('id', calibrationId)
      .single()

    if (verifyError || profile.user_id !== userId) {
      console.error('Error verifying calibration ownership:', verifyError)
      return false
    }

    // Delete calibration (samples will be deleted via cascade)
    const { error } = await supabase
      .from('calibration_profiles')
      .delete()
      .eq('id', calibrationId)

    if (error) {
      console.error('Error deleting calibration profile:', error)
      return false
    }

    return true
  }
}

export const supabaseService = new SupabaseService()