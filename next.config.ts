import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['ws']
  },
  webpack: (config: any) => {
    config.externals.push({
      'ws': 'commonjs ws',
      'bufferutil': 'commonjs bufferutil',
      'utf-8-validate': 'commonjs utf-8-validate'
    })
    return config
  }
};

export default nextConfig;
