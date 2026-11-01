"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="setup-shell">
      <h1>Something went wrong.</h1>
      <p>Saved jobs are safe. Reload the studio and try again.</p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
