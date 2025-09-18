import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

// Check if environment variables are available
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

export const authOptions: NextAuthOptions = {
  providers: googleClientId && googleClientSecret ? [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ] : [],
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user && account) {
        // Use Google's sub (subject) as consistent user ID
        token.sub = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
        // Store Google ID for cloud sync
        token.googleId = account.providerAccountId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        // Use Google ID as consistent user identifier for cloud sync
        session.user.id = token.googleId as string || token.sub as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}