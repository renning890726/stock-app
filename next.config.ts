import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'export',  // 启用静态导出
  // outputFileTracingRoot: path.resolve(__dirname, '../../'),
  /* config options here */
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    unoptimized: true, // GitHub Pages 不支持 Next.js 的图片优化
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lf-coze-web-cdn.coze.cn',
        pathname: '/**',
      },
    ],
  },
  // 如果部署在子路径下（例如 https://user.github.io/repo/），需要设置 basePath
  // basePath: '/repo-name',
  webpack: (config) => {
    // 排除 camelcase 包的 Babel 编译，避免 Unicode 属性错误
    config.module.rules.forEach((rule) => {
      if (rule.test && rule.oneOf) {
        rule.oneOf.forEach((oneOf: any) => {
          if (oneOf.use && oneOf.use.loader && oneOf.use.loader.includes('babel-loader')) {
            if (!oneOf.exclude) {
              oneOf.exclude = [];
            }
            if (typeof oneOf.exclude === 'function') {
              const originalExclude = oneOf.exclude;
              oneOf.exclude = (filePath: string) => {
                if (filePath.includes('camelcase')) {
                  return true;
                }
                return originalExclude(filePath);
              };
            } else {
              (oneOf.exclude as RegExp[]).push(/node_modules[\\/]camelcase/);
            }
          }
        });
      }
    });

    return config;
  },
};

export default nextConfig;
