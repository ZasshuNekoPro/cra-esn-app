/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ['@esn/shared-types', '@esn/shared-utils'],
};

module.exports = nextConfig;
