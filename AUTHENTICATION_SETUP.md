# Authentication & Cloud Sync Setup Guide

## Overview

The Row↔Bike Converter now includes Google authentication and cloud data synchronization using NextAuth.js and Supabase. This allows users to sync their calibration data across devices.

## Setup Required

### 1. Environment Variables

Copy `.env.local.template` to `.env.local` and fill in the required values:

```bash
cp .env.local.template .env.local
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3005/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
7. Copy Client ID and Client Secret to `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

### 3. Supabase Setup

1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Go to Project Settings → API
4. Copy the values to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

### 4. Database Schema

1. In your Supabase project, go to SQL Editor
2. Run the SQL commands from `supabase-schema.sql` to create the required tables:
   - `user_profiles`
   - `calibration_profiles` 
   - `calibration_samples`

### 5. NextAuth Secret

Generate a random secret for NextAuth:

```bash
openssl rand -base64 32
```

Add it to `.env.local`:
```
NEXTAUTH_SECRET=your-generated-secret
NEXTAUTH_URL=http://localhost:3005
```

## Features Implemented

### Authentication
- ✅ Google OAuth login/logout
- ✅ Session management with NextAuth.js
- ✅ User profile creation on signup
- ✅ Protected API routes
- ✅ Authentication UI components

### Cloud Sync
- ✅ Automatic sync when user signs in
- ✅ Bidirectional sync (upload local → cloud, download cloud → local)
- ✅ Conflict detection based on calibration uniqueness
- ✅ Periodic auto-sync every 5 minutes
- ✅ Sync when coming back online
- ✅ Row Level Security (RLS) for data protection

### Database Schema
- ✅ User profiles with preferences
- ✅ Calibration profiles with coefficients and metadata
- ✅ Calibration samples with RPM/Watts data
- ✅ Automatic timestamps and foreign key relationships
- ✅ Database triggers for updated_at fields

### API Endpoints
- ✅ `GET /api/calibrations` - Fetch user's calibrations
- ✅ `POST /api/calibrations` - Save new calibration
- ✅ `DELETE /api/calibrations/[id]` - Delete calibration
- ✅ `GET/POST /api/auth/[...nextauth]` - Authentication endpoints

## Architecture

### Data Flow
1. **Local First**: App works offline with IndexedDB storage
2. **Background Sync**: When authenticated, data syncs automatically
3. **Conflict Resolution**: Unique calibrations detected by damper + sample hash
4. **Progressive Enhancement**: Authentication is optional, app works without it

### Security
- Row Level Security (RLS) ensures users only see their own data
- JWT tokens for API authentication
- Environment variables for sensitive keys
- HTTPS required in production

### Sync Logic
- Compares local IndexedDB data with cloud Supabase data
- Uploads missing local calibrations to cloud
- Downloads missing cloud calibrations to local
- Uses calibration fingerprinting to avoid duplicates

## Testing

To test the authentication and sync:

1. Start the dev server: `npm run dev`
2. Visit `http://localhost:3005`
3. Click "Sign in with Google" in the top-right
4. Create a calibration on one device
5. Sign in on another device to see data sync

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts    # NextAuth configuration
│   │   └── calibrations/
│   │       ├── route.ts                   # GET/POST calibrations
│   │       └── [id]/route.ts              # DELETE calibration
│   ├── auth/
│   │   ├── signin/page.tsx                # Sign-in page
│   │   └── error/page.tsx                 # Auth error page
│   └── layout.tsx                         # Root layout with AuthProvider
├── lib/
│   ├── auth.tsx                           # Authentication context
│   ├── supabase.ts                        # Supabase client & service
│   └── sync.ts                            # Sync service logic
└── .env.local.template                    # Environment variables template
```

## Next Steps

Once environment variables are configured:
1. The app will start successfully without Supabase errors
2. Users can sign in with Google
3. Calibration data will automatically sync across devices
4. The home page shows sync status when authenticated