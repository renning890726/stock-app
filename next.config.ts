import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // outputFileTracingRoot: path.resolve(__dirname, '../../'),
  /* config options here */
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lf-coze-web-cdn.coze.cn',
        pathname: '/**',
      },
    ],
  },
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
