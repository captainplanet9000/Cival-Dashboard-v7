/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  serverExternalPackages: ['ioredis'],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  env: {
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: process.env.REDIS_PORT || '6379',
    TRADING_API_URL: process.env.TRADING_API_URL || 'http://localhost:3001',
    MCP_API_URL: process.env.MCP_API_URL || 'http://localhost:3000',
    VAULT_API_URL: process.env.VAULT_API_URL || 'http://localhost:3002',
  },
  async rewrites() {
    return [
      {
        source: '/api/trading/:path*',
        destination: `${process.env.TRADING_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
      {
        source: '/api/agents/:path*',
        destination: `${process.env.AGENTS_API_URL || 'http://localhost:3000'}/api/agents/:path*`,
      },
      {
        source: '/api/vault/:path*',
        destination: `${process.env.VAULT_API_URL || 'http://localhost:3002'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig; 