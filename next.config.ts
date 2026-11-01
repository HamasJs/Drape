import type { NextConfig } from 'next';
const config: NextConfig = {
  // Keep production verification from overwriting a running development preview.
  distDir: process.env.NODE_ENV === 'production' ? '.next-production' : '.next',
};
export default config;
