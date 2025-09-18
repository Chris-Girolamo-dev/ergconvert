'use client'

import { createContext, useContext, ReactNode, useEffect, useRef } from 'react'
import { SessionProvider, useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { syncService } from './sync'

interface AuthContextType {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

function AuthContextProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const cleanupRef = useRef<(() => void) | null>(null)
  
  useEffect(() => {
    // Cleanup previous sync when session changes
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    
    // Setup sync when user signs in
    if (session?.user?.id && status === 'authenticated') {
      console.log('Setting up auto-sync for user:', session.user.id)
      cleanupRef.current = syncService.setupAutoSync(session.user.id)
    }
    
    // Cleanup on unmount or when user signs out
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [session?.user?.id, status])
  
  return (
    <AuthContext.Provider 
      value={{
        session,
        loading: status === 'loading',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextProvider>
        {children}
      </AuthContextProvider>
    </SessionProvider>
  )
}