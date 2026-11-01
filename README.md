# Drape — Curtain Quote Studio

Local-first manual quotation MVP built with Next.js, React and TypeScript.

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. Run `npm test`, `npm run typecheck`, and `npm run build` for verification.

## Pricing

Exact window width in centimeters / 100 × rate per meter. American: SAR 250; Wavy: SAR 350; Double (sheer/chiffon + blackout): SAR 550. Height never affects price. Each window is calculated separately; monetary amounts round to two decimal places. Final customer rates have no additional fees.

## Workflow

Describe the job with Gemini or enter compact window rows manually. Confirm all measurements and quantities once, then choose Generate quote PDF to approve, save, and download in one action. Save drafts and reopen jobs from Overview. PDF generation is blocked until required details and measurement confirmation are complete. Editing an approved quote returns it to draft and requires approval again. Each saved job snapshots its rate list.

## Current limits

Jobs and business name are saved in browser localStorage on the current device/origin. There is no account, server database, cross-device sync, revision history or automatic draft saving yet. Save explicitly before starting another quote. PDF download is available after approval; sharing uses your usual messaging/email app. AI extraction and voice transcription require server-side setup described below. Customer descriptions and audio are sent to Google Gemini only through explicit assistant actions.

## Gemini extraction and voice setup

1. Copy `.env.example` to `.env.local`.
2. Set `GEMINI_API_KEY` locally. Never paste keys into the app or commit them.
3. Restart `npm run dev`.

The default extraction model is `gemini-3.8-flash`; transcription uses `gemini-3.8-flash`. Override `GEMINI_EXTRACTION_MODEL` and `GEMINI_TRANSCRIPTION_MODEL` for models supported by your account. Google Gemini API access/billing is separate from this app. Keys stay in server endpoints; no `NEXT_PUBLIC_` secret is used. Implementation uses the documented Google Gemini REST endpoints with native fetch, without extra SDK dependencies.

Type a description, choose **Extract details**, review/edit the result and warnings, then explicitly apply it. Choose a style for every extracted window. Missing measurements can be filled in the main form. Existing windows can be retained (append) or explicitly replaced. Applying resets approval; every new window requires measurement confirmation. Model output is schema-validated on both sides and cannot set prices, rates or approvals.

For voice, choose **Record**, stop, listen locally, then **Transcribe audio**. Only that action uploads audio to Google Gemini. The editable transcript is appended to your text; extraction is a separate action. Cancel recording discards it. Limits: 2 minutes, 10 MB, 8,000 description characters, 50 extracted windows. Transient audio is not saved to browser storage or server files. Description/transcript are temporary assistant state; save relevant details in the quotation form. Provider retention follows your Google Gemini account settings; the app does not write uploaded audio to disk.

When no key is configured, the app shows setup instructions and manual quoting remains available. Automated API tests mock Google Gemini and do not spend credits. Real extraction accuracy and microphone/transcription quality must be checked after configuration with representative business examples.

This is a localhost app. Before hosting for others, add authentication, per-user rate limits, shared storage and deployment-level request limits. The current server checks same-origin requests and a custom header, but those are not user authentication.

Official API references: [Structured outputs](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), [Speech to text](https://ai.google.dev/gemini-api/docs/generate-content/audio).

Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). Both features use Gemini generateContent: extraction uses JSON Schema; transcription submits inline base64 audio and validates the returned transcript. Models are configurable independently. Older OpenAI environment variables, if present locally, are ignored.
