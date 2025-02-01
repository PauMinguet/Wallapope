/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.wallapop.com',
      },
      {
        protocol: 'https',
        hostname: 'listing-images.autoscout24.ch',
      }
    ],
  },
}

module.exports = nextConfig 