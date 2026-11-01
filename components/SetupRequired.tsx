import Link from "next/link";
export default function SetupRequired() {
  return (
    <main className="setup-shell">
      <span className="eyebrow">DRAPE / ACCOUNT SETUP</span>
      <h1>
        Your studio is
        <br />
        <em>getting ready.</em>
      </h1>
      <section className="card">
        <h2>Connect accounts and storage</h2>
        <p>
          This release requires Supabase authentication and a database. Access
          stays locked until setup is complete.
        </p>
        <ol>
          <li>Create a Supabase project.</li>
          <li>
            Run <code>supabase/migrations/001_production.sql</code> in its SQL
            editor.
          </li>
          <li>
            Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>.
          </li>
          <li>Set email confirmation and reset templates, then redeploy.</li>
        </ol>
        <p>
          Full instructions: <code>docs/PRODUCTION.md</code>.
        </p>
        <Link href="/sign-in">Go to sign in →</Link>
      </section>
    </main>
  );
}
