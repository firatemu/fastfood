import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  transpilePackages: [
    '@fastfood/api-client',
    '@fastfood/config',
    '@fastfood/contracts',
    '@fastfood/domain-types',
  ],
  typedRoutes: true,
  // Keep hot reload responsive when filesystem notifications are unreliable
  // (WSL / NFS / network mounts).
  watchOptions: {
    poll: 1000,
    aggregateTimeout: 200,
  },
};

export default nextConfig;
