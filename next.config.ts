import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 生产环境优化
  poweredByHeader: false,
  
  // 静态资源优化
  images: {
    domains: ['ai-menu.tech'],
  },
  
  // 环境变量
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // 输出配置
  output: 'standalone',
};

export default nextConfig;
