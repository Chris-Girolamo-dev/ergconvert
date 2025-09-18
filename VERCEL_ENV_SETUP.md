# Vercel Environment Variables Setup for ergconvert

## Required Environment Variables for Production

Add these environment variables in your Vercel dashboard:

### 1. NextAuth Configuration (REQUIRED)
```
NEXTAUTH_URL=https://ergconvert.vercel.app
NEXTAUTH_SECRET=U2vTVP7yLw9O6KaJ2gTGZhmNGPi0KzP5X0ZVF7n4z6k=
```

### 2. Google OAuth (OPTIONAL - for cloud sync)
```
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

**Note**: If you want Google authentication, you'll need to:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Update your OAuth redirect URLs to include: `https://ergconvert.vercel.app/api/auth/callback/google`
3. Copy your Client ID and Secret to these variables

### 3. Supabase Database (OPTIONAL - for cloud sync)
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

**Note**: If you want cloud database sync, set up a Supabase project and add these values.

## How to Add Variables in Vercel

1. Go to your project dashboard on Vercel
2. Click "Settings" tab
3. Click "Environment Variables" 
4. Add each variable name and value
5. Set Environment to "Production" (and optionally Preview/Development)
6. Click "Save"

## App Functionality Without Optional Variables

The app works perfectly without Google OAuth or Supabase:
- ✅ Core features (Convert, Calibrate, Settings) work offline
- ✅ Calibration data saved locally in browser (IndexedDB)
- ✅ No authentication UI shown when credentials not configured
- ✅ Professional, clean experience

Optional cloud features only activate when properly configured.

## Testing the Production Build

After deployment, test these features:
1. **Core Functionality**: Convert workouts, create calibrations
2. **Data Persistence**: Calibrations save locally between sessions  
3. **Responsive Design**: Works on mobile and desktop
4. **Performance**: Fast loading with global CDN