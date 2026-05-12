# generate-cinematic (Supabase Edge Function)

This Edge Function builds a Cloudinary concat URL from an array of clips and can prepare (or optionally execute) Wavespeed text-to-video requests for `ltx-2-fast` or `wan`.

Endpoints
- `GET /health` — returns `{ ok: true, warnings: string[] }` where `warnings` lists missing env vars.
- `POST /generate` — accepts JSON with `clips` and optional model fields, returns `{ url, warnings, wavespeed }`.

Environment variables
- `CLOUDINARY_CLOUD_NAME` — required unless you pass `cloudName` in the POST body.
- `CLOUDINARY_NORMALIZE` — optional, default `c_fill,w_1280,h_720`.
- `WAVESPEED_API_KEY` — required only when `executeModelCall=true`.

Notes
- The generated URL is not signed. If your Cloudinary clips are private, adapt this function to sign the URL or generate an authenticated upload and use that public id.
- The `finalPublicId` used in the function is a placeholder (`spliced_result`). Replace with your chosen public id or an uploaded/signed id if you want to persist the final video in Cloudinary.
- Wavespeed calls are disabled by default. This is intentional for your current Pexels/Pixabay/VEO-first workflow.

Deploy
1. Put this folder in your Supabase project's `functions/` directory (it is already in this repo under `supabase/functions/generate-cinematic`).
2. Set the required environment variables in the Supabase dashboard (Settings → API / Function secrets).
3. Deploy with the Supabase CLI or dashboard. Example (locally):

```bash
supabase functions deploy generate-cinematic --project-ref <your-project-ref>
```

Example request
```bash
curl -X POST "https://<your-edge-host>/generate" \
  -H "Content-Type: application/json" \
  -d '{"clips":[{"publicId":"video1"},{"publicId":"video2"}]}'
```

LTX dry-run example (no external call)
```bash
curl -X POST "https://<your-edge-host>/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "clips":[{"publicId":"video1"},{"publicId":"video2"}],
    "model":"ltx-2-fast",
    "prompt":"Action scene! Steampunk airship pirates...",
    "duration":8,
    "generate_audio":true,
    "executeModelCall":false
  }'
```

LTX live-call example (only after you are ready)
```bash
curl -X POST "https://<your-edge-host>/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "clips":[{"publicId":"video1"},{"publicId":"video2"}],
    "model":"ltx-2-fast",
    "prompt":"Action scene! Steampunk airship pirates...",
    "duration":8,
    "generate_audio":true,
    "executeModelCall":true
  }'
```

WAN dry-run example
```bash
curl -X POST "https://<your-edge-host>/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "clips":[{"publicId":"video1"},{"publicId":"video2"}],
    "model":"wan",
    "prompt":"Epic cinematic cloud battle",
    "duration":8,
    "generate_audio":true,
    "executeModelCall":false
  }'
```

Accepted `POST /generate` fields
- `clips` (required): `Array<{ publicId: string }>`
- `cloudName` (optional): Cloudinary cloud override.
- `normalize` (optional): clip normalization transform, default `c_fill,w_1280,h_720`.
- `format` (optional): output format, default `mp4`.
- `model` (optional): `none` | `ltx-2-fast` | `wan`.
- `prompt` (optional): text prompt for Wavespeed request.
- `duration` (optional): defaults to `8`.
- `generate_audio` (optional): defaults to `true`.
- `executeModelCall` (optional): defaults to `false`.
