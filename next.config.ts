import type { NextConfig } from 'next';
const development=process.env.NODE_ENV==='development';
const config:NextConfig={
 distDir:development?'.next-dev':'.next',
 poweredByHeader:false,
 async headers(){return [{source:'/:path*',headers:[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Referrer-Policy',value:'no-referrer'},
  {key:'Permissions-Policy',value:'camera=(), geolocation=(), microphone=(self)'},
  {key:'Content-Security-Policy',value:`default-src 'self'; script-src 'self' 'unsafe-inline'${development?" 'unsafe-eval'":''}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co${development?' ws://localhost:* ws://127.0.0.1:*':''}; media-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`},
  ...(!development?[{key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'}]:[]),
 ]},{source:'/api/:path*',headers:[{key:'Cache-Control',value:'private, no-store'}]}];},
};
export default config;
