#!/usr/bin/env bash
# One-time setup for the Cloud Run job animation-recorder (.github/workflows/deploy-animation-recorder.yml):
# GCP APIs and roles for the Vertex service account, the three GitHub secrets the workflow needs, the
# same RENDER_SECRET in Supabase, then a deploy. Run from the repo root, signed in to gcloud, gh and supabase.
# Needs vertex-ai-veo-key.json (gitignored) and SUPABASE_ANON_KEY in .env. Prints no secret.
set -euo pipefail

PROJECT=curios-vertex
SA=veo-video-generator@curios-vertex.iam.gserviceaccount.com

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project "$PROJECT"
for ROLE in roles/run.developer roles/iam.serviceAccountUser roles/cloudbuild.builds.editor roles/artifactregistry.admin roles/storage.admin roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$SA" --role="$ROLE" --condition=None --quiet >/dev/null
  echo "granted $ROLE"
done

gh secret set GCP_SA_KEY < vertex-ai-veo-key.json
gh secret set SUPABASE_ANON_KEY --body "$(grep '^SUPABASE_ANON_KEY=' .env | cut -d= -f2- | tr -d '"')"
RS=$(openssl rand -hex 32)
gh secret set RENDER_SECRET --body "$RS"
supabase secrets set RENDER_SECRET="$RS"
unset RS

gh workflow run "Deploy animation recorder" --ref main
echo "Deploy started: gh run watch"
