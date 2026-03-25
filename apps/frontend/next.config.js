/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {},
  transpilePackages: ['@esn/shared-types', '@esn/shared-utils'],
};

module.exports = nextConfig;
