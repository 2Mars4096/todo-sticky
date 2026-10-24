#!/usr/bin/env bash
set -euo pipefail
if [[ $# -ne 2 ]]; then
  printf 'Usage: bash backend/deploy.sh PROJECT_ID REGION\n' >&2
  exit 2
fi
sticky_project="$1"
sticky_region="$2"
sticky_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ ! -f "$sticky_dir/env.yaml" ]]; then
  printf 'Create backend/env.yaml from backend/env.example.yaml first. See docs/account-sync.md.\n' >&2
  exit 2
fi
gcloud run deploy sticky-todo-sync \
  --project "$sticky_project" \
  --region "$sticky_region" \
  --source "$sticky_dir" \
  --service-account "sticky-sync@$sticky_project.iam.gserviceaccount.com" \
  --env-vars-file "$sticky_dir/env.yaml" \
  --allow-unauthenticated \
  --min-instances 0 --max-instances 3 --memory 512Mi --timeout 60
