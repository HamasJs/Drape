import Link from 'next/link';
export default function Page(){return <main className="setup-shell"><h1>That link has expired.</h1><p>Request a new email link, or sign in if your account is already verified.</p><Link href="/forgot-password">Request a password reset</Link><p><Link href="/sign-in">Back to sign in</Link></p></main>;}
