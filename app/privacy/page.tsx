import Link from "next/link";
export default function Page() {
  return (
    <main className="setup-shell privacy-page">
      <Link href="/">← Drape</Link>
      <h1>
        Your work.
        <br />
        <em>Your data.</em>
      </h1>
      <section className="card">
        <h2>What this app stores</h2>
        <p>
          Your account email, business profile, customer details, measurements,
          saved quotations, and quotation revisions are stored in Supabase.
          Access is restricted to your account.
        </p>
        <h2>When AI is used</h2>
        <p>
          Get details sends your description to Google Gemini. Audio stays on
          your device until you choose Transcribe audio, which sends the
          recording to Gemini. Review all extracted measurements before
          approval. Audio is not written to application storage; provider
          retention follows the service settings and terms.
        </p>
        <h2>Export and retention</h2>
        <p>
          Export your current jobs from Settings. Revisions remain in the
          database while your account exists. Ask the business operating this
          deployment about account removal, retention, backups, and support. The
          operator must publish their contact details and applicable privacy
          terms before inviting customers.
        </p>
        <h2>Cookies</h2>
        <p>
          Essential authentication cookies keep you signed in. This app does not
          include advertising or analytics trackers.
        </p>
      </section>
    </main>
  );
}
