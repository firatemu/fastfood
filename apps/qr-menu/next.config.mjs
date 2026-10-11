/** @type {import('next').NextConfig} */

// Product media is served by the local API on localhost:4000. Next 16's image
// optimizer resolves that host to 127.0.0.1 and rejects it as a private address
// (SSRF protection), so the opt-in is required for the menu to show pictures.
//
// It is deliberately scoped to non-production builds: the URLs come from our
// own catalog, but a production build must not proxy arbitrary private IPs.
const allowLocalMediaHost = process.env.NODE_ENV !== 'production';

const nextConfig = {
  reactStrictMode: true,
  images: {
    dangerouslyAllowLocalIP: allowLocalMediaHost,
    remotePatterns: [
      // Local API media proxy (MinIO-backed product images in development).
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media.finedinemenu.com',
        pathname: '/**',
      },
    ],
  },
  transpilePackages: ['@fastfood/contracts'],
  typedRoutes: true,
};

export default nextConfig;