# Set up Million Searches with your own accounts

This copy comes with no accounts, data or credentials. Part 1 gets the app running. Part 2 adds the optional monthly pipeline, which fills the **Monthly Insights** tabs marked "Monthly publish" in the README.

## What you need

| Account | Needed for | Cost |
|---|---|---|
| [Cloudflare](https://dash.cloudflare.com/) | Hosting the app and its database | Workers Paid plan required |
| [DataForSEO](https://dataforseo.com/) | Rankings, keyword data and AI answers | Paid per request |
| [Google Cloud](https://console.cloud.google.com/) | Connecting Search Console and Google Analytics; running the pipeline | Pipeline usage is billed |
| [OpenRouter](https://openrouter.ai/) | The in-app agent (optional) | Paid per request |

You also need Node.js and pnpm. For Part 2, you need [uv](https://docs.astral.sh/uv/) and the `gcloud` and `bq` command-line tools.

## Part 1: The app

### 1. Prepare your Cloudflare account

In the Cloudflare dashboard:

1. Upgrade to **Workers Paid**. Website research makes more than 50 outside calls per request, which is the free plan's limit.
2. Claim a **workers.dev subdomain** (Workers & Pages).
3. Enable **Zero Trust** (the Free plan is enough).
4. Activate **R2**.

### 2. Log in to Cloudflare

Create an API token under **My Profile → API Tokens** with these Account permissions:

- **Edit:** Workers Scripts, Workers KV Storage, Workers R2 Storage, D1, Secrets Store, Browser Rendering, Access: Apps and Policies, Access: Organizations, Identity Providers, and Groups
- **Read:** Account Settings

From this repo, create your settings file and log in:

```bash
pnpm install
```

```bash
cp deploy/.env.selfhost.example .env.selfhost
```

```bash
pnpm alchemy login deploy/alchemy/alchemy.run.ts --env-file .env.selfhost --configure
```

Choose **API Token or API Key**, paste the token, and enter your Cloudflare account ID. Then run:

```bash
pnpm alchemy cloudflare bootstrap
```

### 3. Fill in `.env.selfhost`

This file is git-ignored, so your values stay out of the repo. Set at least:

- `DATAFORSEO_API_KEY`: the Base64 credential from [DataForSEO's API access page](https://app.dataforseo.com/api-access). See [DATAFORSEO_API_KEY.md](./DATAFORSEO_API_KEY.md).
- `ACCESS_ALLOWED_EMAILS`: a comma-separated list of the emails allowed to sign in.

To turn off anonymized telemetry, set `OPENSEO_TELEMETRY_DISABLED=1`.

### 4. Deploy

```bash
pnpm deploy:selfhost --yes
```

This builds the app, creates the database, and deploys the Workers and Cloudflare Access. To find the app's URL, go to Cloudflare's **Workers & Pages → open-seo-selfhost**. Sign in with an allowed email.

### 5. Add your sites

Create one project per site in the app, then add your competitors and AI prompts. Enter competitor names the way people actually write them, because AI mention matching is literal.

### 6. Connect Search Console and Google Analytics

Create your own Google OAuth client and consent screen, then add these redirect URIs, using your app's URL:

- `https://YOUR-APP-URL/api/gsc/oauth/callback`
- `https://YOUR-APP-URL/api/ga4/oauth/callback`

Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `BETTER_AUTH_SECRET` to `.env.selfhost`, then deploy again. Details: [Search Console](./SELF_HOSTING_GOOGLE_SEARCH_CONSOLE.md) and [Google Analytics](./SELF_HOSTING_GOOGLE_ANALYTICS.md).

## Part 2: The monthly pipeline (optional)

These steps run in the `seo-pipeline` repo.

### 1. Replace the placeholder config

Everything in `config/` is a placeholder:

| File | What to enter |
|---|---|
| `domains.toml` | Your domains, Search Console properties, export dataset names and Shopping seller names |
| `brand_terms.csv` | Patterns that mark a search as branded for each domain |
| `competitors.toml` | Your competitors, their seller names and brand terms |
| `shopping_terms.csv` | The product searches to check in ads and Google Shopping |

The tests in `tests/` assert on the placeholder values. If you run them after editing `config/`, `test_brand_matching_examples`, `test_domains_config` and the owner-matching tests need your values too.

### 2. Create the Google Cloud resources

Link a billing account to your project, then run the commands below. There's no default project or account, so these values are required.

```bash
export GCP_PROJECT=YOUR_PROJECT
```

```bash
export CLOUDFLARE_ACCOUNT_ID=YOUR_CLOUDFLARE_ACCOUNT_ID
```

```bash
./deploy/setup_gcp.sh
```

### 3. Give the pipeline access to Search Console

In each Search Console property:

1. Add `seo-pipeline@YOUR_PROJECT.iam.gserviceaccount.com` as a user. Restricted access is enough.
2. Turn on **Settings → Bulk data export**, using your project, location **US**, and the dataset name from `config/domains.toml`.

### 4. Add the secrets

Each command waits for you to paste the value. Paste it, press Enter, then press Ctrl-D.

```bash
gcloud secrets versions add DATAFORSEO_API_KEY --data-file=- --project "$GCP_PROJECT"
```

```bash
gcloud secrets versions add CLOUDFLARE_D1_TOKEN --data-file=- --project "$GCP_PROJECT"
```

`CLOUDFLARE_D1_TOKEN` is a Cloudflare API token with **D1 Edit** permission.

### 5. Deploy the jobs

```bash
./deploy/deploy_jobs.sh
```

This deploys every job and the monthly schedules, which run on the 3rd and 4th of each month. The time zone defaults to UTC; set `TZ_NAME` to change it.

### 6. Load your history

Run these one at a time, waiting for each to finish, because loading jobs share a staging table:

```bash
gcloud run jobs execute seo-gsc-backfill --region us-central1 --project "$GCP_PROJECT" --args=gsc-backfill --wait
```

```bash
gcloud run jobs execute seo-dfs-rank-history --region us-central1 --project "$GCP_PROJECT" --wait
```

```bash
gcloud run jobs execute seo-build-models --region us-central1 --project "$GCP_PROJECT" --wait
```

```bash
gcloud run jobs execute seo-publish-insights --region us-central1 --project "$GCP_PROJECT" --wait
```

The Monthly Insights tabs match data to a project by its bare domain, so a project's domain must match `config/domains.toml`.

For Looker Studio, see `docs/LOOKER_STUDIO.md` in `seo-pipeline`.

## Keeping up with open-seo

To pull in updates from the original project, add it as a remote with pushing turned off:

```bash
git remote add upstream https://github.com/every-app/open-seo.git
```

```bash
git remote set-url --push upstream no_push
```

A fresh copy shares no history with open-seo, so the first merge needs `--allow-unrelated-histories` and will produce conflicts to resolve by hand.

If upstream changes the `ai_*`, `rank_*` or `projects` tables, update `seo_pipeline/jobs/openseo_sync.py` and `sql/` in `seo-pipeline` to match.

## Troubleshooting

- **Worker logs:** Cloudflare dashboard → Workers & Pages → `open-seo-selfhost` → Logs. Search for `error detail` to find upstream API errors.
- **Pipeline deploy stops with "Set GCP_PROJECT…":** export the values from Part 2, step 2 in that terminal.
- **Website research fails:** confirm the account is on Workers Paid.
