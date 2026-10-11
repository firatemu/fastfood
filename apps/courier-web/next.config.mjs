import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
  transpilePackages: [
    '@fastfood/api-client',
    '@fastfood/contracts',
    '@fastfood/design-tokens',
    '@fastfood/ui-web',
  ],
  typedRoutes: true,
  experimental: {
    optimizePackageImports: ['@fastfood/ui-web'],
  },
};

export default nextConfig;
