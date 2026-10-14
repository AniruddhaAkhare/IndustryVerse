/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,

  // Speed up compilation significantly by optimizing heavy barrel imports
  experimental: {
    optimizePackageImports: [
      "@react-three/drei",
      "@react-three/fiber",
      "three",
      "lucide-react",
      "recharts",
      "framer-motion",
    ],
  },

  // Webpack pass-through
  webpack(config) {
    return config;
  },
};

module.exports = nextConfig;
