import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { SupabaseAdapter } from '@auth/supabase-adapter'
import { createClient } from '@supabase/supabase-js'

// Check if Supabase environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

// Only create Supabase client if environment variables are present
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export const authOptions: NextAuthOptions = {
  providers: googleClientId && googleClientSecret ? [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ] : [],
  // Only use Supabase adapter if both Supabase and Google credentials are available
  ...(supabase && googleClientId && googleClientSecret ? {
    adapter: SupabaseAdapter({
      url: supabaseUrl!,
      secret: supabaseServiceKey!,
    }),
    session: {
      strategy: 'database' as const,
    },
    callbacks: {
      async session({ session, user }) {
        // Add user ID to session
        if (session.user) {
          session.user.id = user.id
        }
        return session
      },
    },
  } : {
    session: {
      strategy: 'jwt' as const,
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.sub = user.id
        }
        return token
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.sub as string
        }
        return session
      },
    },
  }),
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}