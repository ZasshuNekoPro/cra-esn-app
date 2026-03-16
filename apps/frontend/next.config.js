/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  transpilePackages: ['@esn/shared-types', '@esn/shared-utils'],
};

module.exports = nextConfig;
