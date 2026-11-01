export const RATES = { American: 250, Wavy: 350, Double: 550 } as const;
export type Style = keyof typeof RATES;
export type WindowItem = {
  id: string;
  room: string;
  width: string;
  height: string;
  style: Style;
  confirmed: boolean;
};
export type Job = {
  version?: number;
  id: string;
  number: string;
  customer: string;
  phone: string;
  notes: string;
  windows: WindowItem[];
  status: "Draft" | "Approved";
  updatedAt: string;
  rates: Record<Style, number>;
};
export function lineTotal(widthCm: string, rate: number): number {
  // Decimal integer arithmetic avoids half-cent floating-point errors.
  if (
    !/^\d+(\.\d{1,4})?$/.test(widthCm) ||
    !Number.isFinite(rate) ||
    rate < 0 ||
    !Number.isSafeInteger(Math.round(rate * 100))
  )
    return 0;
  const [whole, fraction = ""] = widthCm.split(".");
  const widthUnits = BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, "0"));
  if (widthUnits <= 0n) return 0;
  const cents =
    (widthUnits * BigInt(Math.round(rate * 100)) + 500000n) / 1000000n;
  const amount = Number(cents) / 100;
  return Number.isFinite(amount) ? amount : 0;
}
export function total(job: Job): number {
  return (
    Math.round(
      job.windows.reduce(
        (sum, item) => sum + lineTotal(item.width, job.rates[item.style]),
        0,
      ) * 100,
    ) / 100
  );
}
export function issues(job: Job): string[] {
  const errors: string[] = [];
  if (!job.customer.trim()) errors.push("Add a customer name.");
  if (!job.windows.length) errors.push("Add at least one window.");
  job.windows.forEach((item, i) => {
    if (!item.room.trim()) errors.push(`Window ${i + 1}: add a room name.`);
    if (!Number.isFinite(Number(item.width)) || Number(item.width) <= 0)
      errors.push(`Window ${i + 1}: enter a valid width.`);
    if (!Number.isFinite(Number(item.height)) || Number(item.height) <= 0)
      errors.push(`Window ${i + 1}: enter a valid height.`);
    if (!item.confirmed)
      errors.push(`Window ${i + 1}: confirm the measurements.`);
  });
  return errors;
}
export function isSavedJob(value: unknown): value is Job {
  if (!value || typeof value !== "object") return false;
  const j = value as Record<string, unknown>;
  if (
    !["id", "number", "customer", "phone", "notes", "updatedAt"].every(
      (k) => typeof j[k] === "string",
    )
  )
    return false;
  if (j.status !== "Draft" && j.status !== "Approved") return false;
  if (!j.rates || typeof j.rates !== "object") return false;
  const rates = j.rates as Record<string, unknown>;
  if (
    !Object.keys(RATES).every(
      (k) =>
        typeof rates[k] === "number" &&
        Number.isFinite(rates[k]) &&
        (rates[k] as number) >= 0,
    )
  )
    return false;
  return (
    Array.isArray(j.windows) &&
    j.windows.every(
      (w) =>
        w &&
        typeof w === "object" &&
        ["id", "room", "width", "height"].every(
          (k) => typeof w[k] === "string",
        ) &&
        Object.hasOwn(RATES, w.style) &&
        typeof w.confirmed === "boolean",
    )
  );
}
