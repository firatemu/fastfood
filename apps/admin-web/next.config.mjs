/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@fastfood/api-client',
    '@fastfood/config',
    '@fastfood/contracts',
    '@fastfood/design-tokens',
    '@fastfood/domain-types',
    '@fastfood/ui-web',
  ],
  // Move `experimental.typedRoutes` to the top-level `typedRoutes` field per Next 16.
  typedRoutes: true,
  // The dev server needs full filesystem read access to the workspace
  // to walk client component graphs; explicit ignore keeps builds fast.
  experimental: {
    optimizePackageImports: ['@fastfood/ui-web'],
  },
};

export default nextConfig;
