'use client'

import { CalibrationProfile } from './types'
import { persistence } from './persistence'

export class SyncService {
  private isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  }

  async syncCalibrations(userId: string): Promise<{ 
    uploaded: number; 
    downloaded: number; 
    conflicts: number;
    errors: string[];
  }> {
    if (!this.isOnline()) {
      throw new Error('Cannot sync while offline')
    }

    const result = {
      uploaded: 0,
      downloaded: 0,
      conflicts: 0,
      errors: [] as string[]
    }

    try {
      // Get local calibrations
      console.log('📱 Fetching local calibrations...')
      const localCalibrations = await persistence.getCalibrationHistory()
      console.log(`📱 Found ${localCalibrations.length} local calibrations`)
      
      // Get cloud calibrations
      console.log('☁️ Fetching cloud calibrations...')
      const cloudResponse = await fetch('/api/calibrations')
      console.log(`☁️ Cloud fetch response status: ${cloudResponse.status} ${cloudResponse.statusText}`)
      
      if (!cloudResponse.ok) {
        const errorText = await cloudResponse.text()
        console.error('☁️ Cloud fetch failed:', cloudResponse.status, errorText)
        throw new Error(`Failed to fetch cloud calibrations: ${cloudResponse.statusText}`)
      }
      
      const { calibrations: cloudCalibrations } = await cloudResponse.json()
      console.log(`☁️ Found ${cloudCalibrations.length} cloud calibrations`)
      
      // Create maps for easier comparison
      const localMap = new Map<string, CalibrationProfile>()
      const cloudMap = new Map<string, CalibrationProfile>()
      
      // Index local calibrations by a unique key (damper + samples hash)
      for (const local of localCalibrations) {
        const key = this.generateCalibrationKey(local)
        localMap.set(key, local)
      }
      
      // Index cloud calibrations
      for (const cloud of cloudCalibrations) {
        const key = this.generateCalibrationKey(cloud)
        cloudMap.set(key, cloud)
      }
      
      // Upload local calibrations that don't exist in cloud
      console.log('⬆️ Checking for calibrations to upload...')
      for (const [key, local] of localMap) {
        if (!cloudMap.has(key)) {
          console.log(`⬆️ Uploading calibration: damper ${local.damper}`)
          try {
            await this.uploadCalibration(local)
            result.uploaded++
            console.log(`✅ Uploaded calibration: damper ${local.damper}`)
          } catch (error) {
            console.error(`❌ Upload failed for damper ${local.damper}:`, error)
            result.errors.push(`Failed to upload calibration: ${error}`)
          }
        }
      }
      
      // Download cloud calibrations that don't exist locally
      console.log('⬇️ Checking for calibrations to download...')
      for (const [key, cloud] of cloudMap) {
        if (!localMap.has(key)) {
          console.log(`⬇️ Downloading calibration: damper ${cloud.damper}`)
          try {
            await this.downloadCalibration(cloud)
            result.downloaded++
            console.log(`✅ Downloaded calibration: damper ${cloud.damper}`)
          } catch (error) {
            console.error(`❌ Download failed for damper ${cloud.damper}:`, error)
            result.errors.push(`Failed to download calibration: ${error}`)
          }
        }
      }
      
      return result
    } catch (error) {
      result.errors.push(`Sync failed: ${error}`)
      return result
    }
  }

  private generateCalibrationKey(calibration: CalibrationProfile): string {
    // Generate a unique key based on damper setting and sample data
    const samplesHash = this.hashSamples(calibration.samples)
    return `${calibration.damper}-${samplesHash}`
  }

  private hashSamples(samples: { rpm: number; watts: number }[]): string {
    // Simple hash of samples to detect uniqueness
    const sampleString = samples
      .map(s => `${s.rpm},${s.watts}`)
      .sort()
      .join('|')
    
    let hash = 0
    for (let i = 0; i < sampleString.length; i++) {
      const char = sampleString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return hash.toString(36)
  }

  private async uploadCalibration(calibration: CalibrationProfile): Promise<void> {
    console.log(`📤 Starting upload for damper ${calibration.damper}`)
    
    try {
      const response = await fetch('/api/calibrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calibration)
      })

      console.log(`📤 Upload response status: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        let errorDetails: unknown
        try {
          errorDetails = await response.json()
          console.error(`📤 Upload failed with status ${response.status} - JSON error:`, errorDetails)
        } catch {
          errorDetails = await response.text()
          console.error(`📤 Upload failed with status ${response.status} - Text error:`, errorDetails)
        }
        console.error(`📤 Full response headers:`, Object.fromEntries(response.headers.entries()))
        throw new Error(`Upload failed: ${JSON.stringify(errorDetails)}`)
      }

      const result = await response.json()
      console.log(`📤 Upload successful:`, result)
    } catch (fetchError) {
      console.error(`📤 Fetch error:`, fetchError)
      throw fetchError
    }
  }

  private async downloadCalibration(calibration: CalibrationProfile): Promise<void> {
    // Remove cloud-specific ID and timestamps, let IndexedDB assign new ones
    const localCalibration: CalibrationProfile = {
      damper: calibration.damper,
      a: calibration.a,
      b: calibration.b,
      r2: calibration.r2,
      samples: calibration.samples,
      created_at: Date.now(),
      updated_at: Date.now()
    }

    await persistence.saveCalibration(localCalibration)
  }

  async autoSync(userId: string): Promise<void> {
    console.log('🔄 Auto-sync starting for user:', userId)
    
    if (!this.isOnline()) {
      console.log('⚠️ Skipping auto-sync: offline')
      return
    }

    try {
      console.log('📡 Attempting to sync calibrations...')
      const result = await this.syncCalibrations(userId)
      console.log('✅ Auto-sync completed:', result)
      
      if (result.errors.length > 0) {
        console.warn('⚠️ Auto-sync completed with errors:', result.errors)
      }
    } catch (error) {
      console.error('❌ Auto-sync failed:', error)
    }
  }

  setupAutoSync(userId: string, intervalMinutes: number = 5): () => void {
    // Sync immediately
    this.autoSync(userId)
    
    // Set up periodic sync
    const interval = setInterval(() => {
      this.autoSync(userId)
    }, intervalMinutes * 60 * 1000)
    
    // Sync when coming back online
    const onlineHandler = () => {
      if (this.isOnline()) {
        this.autoSync(userId)
      }
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onlineHandler)
    }
    
    // Return cleanup function
    return () => {
      clearInterval(interval)
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onlineHandler)
      }
    }
  }
}

export const syncService = new SyncService()