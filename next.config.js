/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static optimization for better performance
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'next-auth']
  },
  
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },

  // Enable compression
  compress: true,

  // Optimize for production
  poweredByHeader: false,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig