import { UserProfile, CalibrationProfile, Workout } from './types'

const DB_NAME = 'row-bike-converter'
const DB_VERSION = 1
const STORES = {
  profiles: 'profiles',
  calibrations: 'calibrations',
  workouts: 'workouts'
}

class PersistenceManager {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create object stores
        if (!db.objectStoreNames.contains(STORES.profiles)) {
          db.createObjectStore(STORES.profiles, { keyPath: 'id' })
        }
        
        if (!db.objectStoreNames.contains(STORES.calibrations)) {
          const calibStore = db.createObjectStore(STORES.calibrations, { keyPath: 'id', autoIncrement: true })
          calibStore.createIndex('damper', 'damper', { unique: false })
        }
        
        if (!db.objectStoreNames.contains(STORES.workouts)) {
          db.createObjectStore(STORES.workouts, { keyPath: 'id' })
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

  async saveCalibration(calibration: CalibrationProfile): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.calibrations], 'readwrite')
      const store = transaction.objectStore(STORES.calibrations)
      const request = store.put(calibration)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
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
}

export const persistence = new PersistenceManager()