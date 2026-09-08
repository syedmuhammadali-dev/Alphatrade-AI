/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@alphatrade/ui", "@alphatrade/shared-types"],
};

export default nextConfig;
