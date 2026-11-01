"use client";
import Link from "next/link";
import PublicNav from "./PublicNav";
import { useState } from "react";
import { RATES, lineTotal, type Style } from "../lib/pricing";
export default function PublicDemo() {
  const [width, setWidth] = useState("240");
  const [style, setStyle] = useState<Style>("Wavy");
  const [confirmed, setConfirmed] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  async function samplePdf() {
    const { quotationPdf } = await import("../lib/quotation-pdf");
    const bytes = quotationPdf({ id: "demo", number: "SAMPLE-QT-2026-0012", customer: "Ahmed · sample customer", phone: "", notes: "Sample quotation. No order has been placed.", status: "Approved", updatedAt: new Date().toISOString(), rates: RATES, windows: [{ id: "sample-window", room: "Lounge", width, height: "280", style, confirmed: true }] });
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const a = document.createElement("a"); a.href = url; a.download = "Drape-sample-quotation.pdf"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setDownloaded(true);
  }
  return <main className="showcase">
    <PublicNav />
    <div className="demo-heading"><span className="public-kicker">TRY IT / NO ACCOUNT NEEDED</span><h1>Your first quote.<br /><em>On the house.</em></h1><p>A fictional customer, a real calculation. Change the width or curtain style and see the price update.</p></div>
    <section className="sample-workspace" aria-label="Sample quotation workspace">
      <div className="sample-editor"><span className="public-kicker">01 / THE REQUEST</span><blockquote>“Ahmed needs curtains for his lounge. The window is 2.4 meters wide and 2.8 meters high.”</blockquote><span className="pill">Sample data · stays in this browser</span><hr /><label>Window width (cm)<input type="number" min="0.01" max="100000" step="0.01" value={width} onChange={e => { setWidth(e.target.value); setConfirmed(false); }} /></label><label>Curtain style<select value={style} onChange={e => { setStyle(e.target.value as Style); setConfirmed(false); }}>{Object.keys(RATES).map(s => <option key={s}>{s}</option>)}</select></label><p>Height: 280 cm. Price uses exact window width; height does not change the rate.</p></div>
      <div className="sample-receipt"><span className="public-kicker">02 / THE QUOTE</span><p>SAMPLE · QT-2026-0012</p><h2>Ahmed’s lounge</h2><p>{style} · {Number(width) / 100 || 0} m × SAR {RATES[style]}/m</p><div className="sample-price"><small>SAR</small> {lineTotal(width, RATES[style]).toFixed(2)}</div><p>Sample terms: installation and delivery included. No other charges.</p><label className="sample-confirm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> I checked the sample measurements and quantity.</label><p><strong>{confirmed ? "Ready to send" : "Draft"}</strong> · Customer acceptance is not recorded.</p><button className="primary" disabled={!confirmed || !Number.isFinite(Number(width)) || Number(width) <= 0 || Number(width) > 100000 || !/^\d+(\.\d{1,4})?$/.test(width)} onClick={samplePdf}>Download sample PDF ↗</button>{downloaded && <p role="status">Sample PDF generated. Your browser handles the download.</p>}</div>
    </section><p className="demo-disclaimer">This demo uses sample rates and local calculations. The signed-in studio adds voice input, Gemini extraction, your shop’s pricing and private saved quotes.</p><Link className="public-cta" href="/sign-up">Create your own studio ↗</Link>
  </main>;
}
