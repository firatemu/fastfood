import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
  transpilePackages: [
    '@fastfood/api-client',
    '@fastfood/config',
    '@fastfood/contracts',
    '@fastfood/domain-types',
  ],
  // Move `experimental.typedRoutes` to the top-level `typedRoutes` field per Next 16.
  typedRoutes: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:4000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
