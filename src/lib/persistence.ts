import { UserProfile, CalibrationProfile, Workout } from './types'

const DB_NAME = 'row-bike-converter'
const DB_VERSION = 2 // Incremented for schema changes
const STORES = {
  profiles: 'profiles',
  calibrations: 'calibrations',
  workouts: 'workouts'
}

// Legacy localStorage keys for migration
const LEGACY_KEYS = {
  profiles: 'row-bike-converter-profiles',
  calibrations: 'row-bike-converter-calibrations',
  workouts: 'row-bike-converter-workouts'
}

class PersistenceManager {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(new Error(`Database initialization failed: ${request.error}`))
      }
      
      request.onsuccess = async () => {
        this.db = request.result
        
        // Handle database errors after opening
        this.db.onerror = (event) => {
          console.error('Database error:', event)
        }
        
        // Migrate legacy localStorage data if this is a new installation
        await this.migrateFromLocalStorage()
        
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const oldVersion = event.oldVersion
        
        console.log(`Upgrading database from version ${oldVersion} to ${DB_VERSION}`)
        
        // Create object stores
        if (!db.objectStoreNames.contains(STORES.profiles)) {
          const profileStore = db.createObjectStore(STORES.profiles, { keyPath: 'id' })
          profileStore.createIndex('last_damper', 'last_damper', { unique: false })
        }
        
        if (!db.objectStoreNames.contains(STORES.calibrations)) {
          const calibStore = db.createObjectStore(STORES.calibrations, { keyPath: 'id', autoIncrement: true })
          calibStore.createIndex('damper', 'damper', { unique: false })
          calibStore.createIndex('created_at', 'created_at', { unique: false })
          calibStore.createIndex('r2', 'r2', { unique: false })
        }
        
        if (!db.objectStoreNames.contains(STORES.workouts)) {
          const workoutStore = db.createObjectStore(STORES.workouts, { keyPath: 'id' })
          workoutStore.createIndex('source_modality', 'source_modality', { unique: false })
          workoutStore.createIndex('target_modality', 'target_modality', { unique: false })
        }
        
        // Handle version-specific upgrades
        if (oldVersion < 2) {
          // Add timestamps to existing calibrations if upgrading from v1
          if (db.objectStoreNames.contains(STORES.calibrations)) {
            const transaction = event.target.transaction
            const calibStore = transaction.objectStore(STORES.calibrations)
            
            calibStore.openCursor().onsuccess = (cursorEvent) => {
              const cursor = cursorEvent.target.result
              if (cursor) {
                const calibration = cursor.value
                if (!calibration.created_at) {
                  calibration.created_at = Date.now()
                  calibration.updated_at = Date.now()
                  cursor.update(calibration)
                }
                cursor.continue()
              }
            }
          }
        }
      }
    })
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.profiles], 'readwrite')
      const store = transaction.objectStore(STORES.profiles)
      const request = store.put(profile)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async loadProfile(id: string): Promise<UserProfile | null> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.profiles], 'readonly')
      const store = transaction.objectStore(STORES.profiles)
      const request = store.get(id)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  async saveCalibration(calibration: CalibrationProfile): Promise<CalibrationProfile> {
    if (!this.db) await this.init()
    
    // Add timestamps
    const now = Date.now()
    const calibrationWithTimestamps = {
      ...calibration,
      created_at: calibration.created_at || now,
      updated_at: now
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([STORES.calibrations], 'readwrite')
        const store = transaction.objectStore(STORES.calibrations)
        const request = store.put(calibrationWithTimestamps)
        
        transaction.onerror = () => {
          console.error('Transaction failed:', transaction.error)
          reject(new Error(`Failed to save calibration: ${transaction.error}`))
        }
        
        request.onerror = () => {
          console.error('Request failed:', request.error)
          reject(new Error(`Failed to save calibration: ${request.error}`))
        }
        
        request.onsuccess = () => {
          // Return the saved calibration with its ID
          const savedCalibration = { ...calibrationWithTimestamps, id: request.result as number }
          console.log('Calibration saved successfully:', savedCalibration)
          resolve(savedCalibration)
        }
      } catch (error) {
        console.error('Error in saveCalibration:', error)
        reject(new Error(`Failed to save calibration: ${error}`))
      }
    })
  }

  async loadCalibrationsByDamper(damper: number): Promise<CalibrationProfile[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.calibrations], 'readonly')
      const store = transaction.objectStore(STORES.calibrations)
      const index = store.index('damper')
      const request = index.getAll(damper)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async exportData(): Promise<string> {
    if (!this.db) await this.init()
    
    const profiles = await this.getAllProfiles()
    const calibrations = await this.getAllCalibrations()
    const workouts = await this.getAllWorkouts()
    
    return JSON.stringify({
      profiles,
      calibrations,
      workouts,
      exportDate: new Date().toISOString()
    }, null, 2)
  }

  async importData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData)
    
    if (data.profiles) {
      for (const profile of data.profiles) {
        await this.saveProfile(profile)
      }
    }
    
    if (data.calibrations) {
      for (const calibration of data.calibrations) {
        await this.saveCalibration(calibration)
      }
    }
    
    if (data.workouts) {
      for (const workout of data.workouts) {
        await this.saveWorkout(workout)
      }
    }
  }

  private async getAllProfiles(): Promise<UserProfile[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.profiles], 'readonly')
      const store = transaction.objectStore(STORES.profiles)
      const request = store.getAll()
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  private async getAllCalibrations(): Promise<CalibrationProfile[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.calibrations], 'readonly')
      const store = transaction.objectStore(STORES.calibrations)
      const request = store.getAll()
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  private async getAllWorkouts(): Promise<Workout[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.workouts], 'readonly')
      const store = transaction.objectStore(STORES.workouts)
      const request = store.getAll()
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  private async saveWorkout(workout: Workout): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.workouts], 'readwrite')
      const store = transaction.objectStore(STORES.workouts)
      const request = store.put(workout)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  // Enhanced calibration methods
  async getLatestCalibrationByDamper(damper: number): Promise<CalibrationProfile | null> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.calibrations], 'readonly')
      const store = transaction.objectStore(STORES.calibrations)
      const index = store.index('damper')
      const request = index.getAll(damper)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const calibrations = request.result
        if (calibrations.length === 0) {
          resolve(null)
        } else {
          // Sort by created_at descending and return the latest
          calibrations.sort((a, b) => b.created_at - a.created_at)
          resolve(calibrations[0])
        }
      }
    })
  }

  async deleteCalibration(id: number): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.calibrations], 'readwrite')
      const store = transaction.objectStore(STORES.calibrations)
      const request = store.delete(id)
      
      request.onerror = () => reject(new Error(`Failed to delete calibration: ${request.error}`))
      request.onsuccess = () => {
        console.log('Calibration deleted successfully:', id)
        resolve()
      }
    })
  }

  async getCalibrationHistory(damper?: number): Promise<CalibrationProfile[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.calibrations], 'readonly')
      const store = transaction.objectStore(STORES.calibrations)
      
      const request = damper 
        ? store.index('damper').getAll(damper)
        : store.getAll()
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const calibrations = request.result
        // Sort by created_at descending (newest first)
        calibrations.sort((a, b) => b.created_at - a.created_at)
        resolve(calibrations)
      }
    })
  }

  // localStorage migration
  private async migrateFromLocalStorage(): Promise<void> {
    try {
      // Check if we already have data in IndexedDB
      const existingProfiles = await this.getAllProfiles()
      if (existingProfiles.length > 0) {
        console.log('IndexedDB already has data, skipping localStorage migration')
        return
      }

      console.log('Checking for localStorage data to migrate...')
      
      // Migrate profiles
      const profilesData = localStorage.getItem(LEGACY_KEYS.profiles)
      if (profilesData) {
        try {
          const profiles = JSON.parse(profilesData)
          for (const profile of profiles) {
            await this.saveProfile(profile)
          }
          console.log(`Migrated ${profiles.length} profiles from localStorage`)
        } catch (error) {
          console.error('Failed to migrate profiles:', error)
        }
      }

      // Migrate calibrations
      const calibrationsData = localStorage.getItem(LEGACY_KEYS.calibrations)
      if (calibrationsData) {
        try {
          const calibrations = JSON.parse(calibrationsData)
          for (const calibration of calibrations) {
            // Add timestamps if missing
            const calibrationWithTimestamps = {
              ...calibration,
              created_at: calibration.created_at || Date.now(),
              updated_at: calibration.updated_at || Date.now()
            }
            await this.saveCalibration(calibrationWithTimestamps)
          }
          console.log(`Migrated ${calibrations.length} calibrations from localStorage`)
        } catch (error) {
          console.error('Failed to migrate calibrations:', error)
        }
      }

      // Migrate workouts
      const workoutsData = localStorage.getItem(LEGACY_KEYS.workouts)
      if (workoutsData) {
        try {
          const workouts = JSON.parse(workoutsData)
          for (const workout of workouts) {
            await this.saveWorkout(workout)
          }
          console.log(`Migrated ${workouts.length} workouts from localStorage`)
        } catch (error) {
          console.error('Failed to migrate workouts:', error)
        }
      }

      // Clear localStorage after successful migration
      if (profilesData || calibrationsData || workoutsData) {
        localStorage.removeItem(LEGACY_KEYS.profiles)
        localStorage.removeItem(LEGACY_KEYS.calibrations)
        localStorage.removeItem(LEGACY_KEYS.workouts)
        console.log('localStorage migration completed and cleaned up')
      }

    } catch (error) {
      console.error('Error during localStorage migration:', error)
    }
  }

  // Utility methods
  async getDatabaseInfo(): Promise<{
    version: number
    stores: string[]
    profileCount: number
    calibrationCount: number
    workoutCount: number
  }> {
    if (!this.db) await this.init()
    
    const profiles = await this.getAllProfiles()
    const calibrations = await this.getAllCalibrations()
    const workouts = await this.getAllWorkouts()
    
    return {
      version: this.db!.version,
      stores: Array.from(this.db!.objectStoreNames),
      profileCount: profiles.length,
      calibrationCount: calibrations.length,
      workoutCount: workouts.length
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.profiles, STORES.calibrations, STORES.workouts], 'readwrite')
      
      const promises = [
        transaction.objectStore(STORES.profiles).clear(),
        transaction.objectStore(STORES.calibrations).clear(),
        transaction.objectStore(STORES.workouts).clear()
      ]
      
      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => {
        console.log('All data cleared from database')
        resolve()
      }
    })
  }
}

export const persistence = new PersistenceManager()