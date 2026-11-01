import type { NextConfig } from 'next';
const config: NextConfig = {
  // Use the standard production output expected by Vercel.
  // Isolate local development so production checks do not overwrite it.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
};
export default config;
