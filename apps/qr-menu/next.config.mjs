import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */

// Product media is served by the local API on localhost:4000. Next 16's image
// optimizer resolves that host to 127.0.0.1 and rejects it as a private address
// (SSRF protection), so the opt-in is required for the menu to show pictures.
//
// It is deliberately scoped to non-production builds: the URLs come from our
// own catalog, but a production build must not proxy arbitrary private IPs.
const allowLocalMediaHost = process.env.NODE_ENV !== 'production';

// Deployed builds serve media from the public API origin (ADR-021). The image
// config is frozen at build time, so this must be provided as a build argument.
const mediaOrigin = process.env.QR_MENU_MEDIA_ORIGIN
  ? new URL(process.env.QR_MENU_MEDIA_ORIGIN)
  : null;

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
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
      ...(mediaOrigin
        ? [
            {
              protocol: mediaOrigin.protocol.replace(':', ''),
              hostname: mediaOrigin.hostname,
              ...(mediaOrigin.port ? { port: mediaOrigin.port } : {}),
              pathname: '/**',
            },
          ]
        : []),
    ],
  },
  transpilePackages: ['@fastfood/contracts'],
  typedRoutes: true,
};

export default nextConfig;
