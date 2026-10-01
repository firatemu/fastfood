/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
