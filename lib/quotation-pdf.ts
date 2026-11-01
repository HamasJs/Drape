import { jsPDF } from "jspdf";
import { lineTotal, total, type Job } from "./pricing.ts";
import { DEFAULT_PROFILE, type Profile } from "./job-validation.ts";
const money = (n: number) =>
  n.toLocaleString("en-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export function quotationPdf(
  job: Job,
  branding: Profile = DEFAULT_PROFILE,
): ArrayBuffer {
  const doc = new jsPDF();
  let y = 25;
  function room(height = 10) {
    if (y + height > 270) {
      doc.addPage();
      y = 25;
    }
  }
  function write(
    text: string,
    size = 11,
    bold = false,
    color: [number, number, number] = [48, 36, 72],
  ) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, 170) as string[];
    for (const line of lines) {
      room(size * 0.5 + 4);
      doc.text(line, 20, y);
      y += size * 0.45 + 4;
    }
  }
  doc.setFillColor(48, 36, 72);
  doc.rect(0, 0, 210, 7, "F");
  write(branding.businessName, 23, true);
  if (branding.contact) write(branding.contact, 10);
  if (branding.address) write(branding.address, 10);
  y += 8;
  write("CURTAIN QUOTATION", 12, true, [104, 69, 214]);
  write(`${job.number} | Revision ${job.version || 1}`, 9);
  write(`Issued: ${new Date(job.updatedAt).toLocaleDateString("en-GB")}`, 9);
  y += 6;
  write(`Prepared for ${job.customer}`, 14, true);
  if (job.phone) write(job.phone, 10);
  y += 7;
  job.windows.forEach((w, i) => {
    room(40);
    doc.setDrawColor(231, 224, 239);
    doc.line(20, y - 3, 190, y - 3);
    y += 5;
    write(`${i + 1}. ${w.room} / ${w.style}`, 12, true);
    write(`${w.width} cm wide x ${w.height} cm high`, 10);
    write(
      `${Number(w.width) / 100} m x SAR ${job.rates[w.style]}/m = SAR ${money(lineTotal(w.width, job.rates[w.style]))}`,
      10,
    );
    y += 5;
  });
  room(42);
  y += 5;
  write(`TOTAL   SAR ${money(total(job))}`, 19, true);
  write("Final customer price. No additional charges.", 10);
  write(
    "Height does not affect pricing. Double includes sheer/chiffon + blackout.",
    9,
  );
  if (job.notes) {
    y += 8;
    write("CUSTOMER NOTES", 10, true);
    write(job.notes, 10);
  }
  if (branding.terms) {
    y += 8;
    write("QUOTATION TERMS", 10, true);
    write(branding.terms, 10);
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 135, 166);
    doc.text(`${job.number} | ${page} / ${pages}`, 20, 285);
  }
  return doc.output("arraybuffer");
}
