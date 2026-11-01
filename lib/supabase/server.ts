import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicAuthConfig } from './config';
export async function serverAuth() {
  const { url, key } = publicAuthConfig();
  const jar = await cookies();
  return createServerClient(url, key, { cookieOptions:{secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/'}, cookies: {
    getAll: () => jar.getAll(),
    setAll(values) { try { values.forEach(({name,value,options})=>jar.set(name,value,options)); } catch { /* Middleware refreshes cookies for Server Components. */ } },
  } });
}
