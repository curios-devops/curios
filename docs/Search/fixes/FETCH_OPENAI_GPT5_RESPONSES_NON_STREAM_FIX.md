# FETCH_OPENAI GPT-5 Responses Non-Stream Fix

## Context
Regular non-stream requests to `fetch-openai` with `gpt-5-mini` were intermittently failing or returning truncated output.

Affected endpoint:
- `https://gpfccicfqynahflehpqo.supabase.co/functions/v1/fetch-openai`

Primary file:
- `supabase/functions/fetch-openai/index.ts`

## Root Cause
For GPT-5 models, the function correctly routed requests to the Responses API, but non-stream payloads could return:
- `status: "incomplete"`
- `incomplete_details.reason: "max_output_tokens"`
- heavy reasoning token usage before final text emission

This produced either:
- empty extracted text, or
- partial extracted text when token cap was reached.

## Implemented Changes

### 1) Responses non-stream parsing hardening
Added robust extraction logic to support multiple Responses shapes:
- `output_text` as string
- `output_text` as array
- nested text fields inside `output` / `content`
- fallback recursive text/value extraction

Helper used:
- `extractResponsesOutputText(...)`

### 2) GPT-5 compatibility defaults
For GPT-5 + Responses requests:
- keep `max_output_tokens`
- set `reasoning: { effort: 'low' }` by default

### 3) Retry strategy for incomplete responses
If response is incomplete because of token cap (`max_output_tokens`):
- perform first retry with scaled budget (`x2`, minimum `160`)
- if still incomplete, perform second retry with the same scaling rule
- keep best available content if second retry does not improve

Helpers/flow:
- `shouldRetryForIncompleteMaxTokens(...)`
- local `runRetry(...)` in non-stream branch

### 4) Production clean-up
Removed noisy `console.log` debug traces while preserving:
- error logging (`console.error`)
- retry warnings (`console.warn`)

## Final Runtime Validation

### Non-stream test (PASS)
Command:
```zsh
ANON_KEY="$(grep '^VITE_SUPABASE_ANON_KEY=' /Users/marcelo/Documents/Curios/.env | cut -d '=' -f2- | tr -d '\r')"

curl --max-time 30 -sS -X POST "https://gpfccicfqynahflehpqo.supabase.co/functions/v1/fetch-openai" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"{\"model\":\"gpt-5-mini\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply in exactly four words.\"}],\"max_output_tokens\":80}"}'
```

Observed:
- `text: "Understood. I will comply."`
- final status: `completed`
- model: `gpt-5-mini-2025-08-07`
- retry cap reached `max_output_tokens: 320`

### Stream test (PASS)
Command:
```zsh
curl --max-time 30 -sS -N -X POST "https://gpfccicfqynahflehpqo.supabase.co/functions/v1/fetch-openai" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"stream":true,"prompt":"{\"model\":\"gpt-5-mini\",\"messages\":[{\"role\":\"user\",\"content\":\"Say hello in one short sentence.\"}],\"max_output_tokens\":120}"}'
```

Observed SSE:
- `data: {"content":"Hello"}`
- `data: {"content":"!"}`
- `data: [DONE]`

## Git
Committed and pushed to `main`:
- Commit: `038e298`
- Message: `fix(fetch-openai): harden gpt-5 responses non-stream retries and parsing`

## Notes for Future Tuning
If non-stream outputs still truncate for some prompts:
- increase retry minimum from `160` to `256` or `320`, or
- add one more retry stage with a hard upper cap.
