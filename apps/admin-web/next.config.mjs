/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@fastfood/api-client',
    '@fastfood/config',
    '@fastfood/contracts',
    '@fastfood/domain-types',
  ],
  // Move `experimental.typedRoutes` to the top-level `typedRoutes` field per Next 16.
  typedRoutes: true,
};

export default nextConfig;
