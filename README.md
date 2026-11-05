<picture>
  <source media="(prefers-color-scheme: dark)" srcset="src/public/brand/million-searches-logo-light.svg">
  <img src="src/public/brand/million-searches-logo-dark.svg" alt="Million Searches" width="320">
</picture>

Million Searches is a self-hosted SEO and AI visibility platform. It tracks organic rankings, competitors, AI answers and paid search for the sites you add.

It's built on [every-app/open-seo](https://github.com/every-app/open-seo) and used under its [MIT license](./LICENSE). This copy comes with no accounts or data, so you connect your own.

**To install it, follow [docs/SETUP.md](./docs/SETUP.md).**

## What's in the app

From open-seo:

- Keyword research and saved keywords
- Rank tracking
- Domain overview, backlinks and site audits
- Prompt tracking and research for AI visibility
- Search Console and Google Analytics connections
- Reports

Added here, under **Monthly Insights** in the sidebar:

| Tab | What it shows | Data comes from |
|---|---|---|
| Ranking trends | Top 10/20/50/100 keyword counts over time, branded and non-branded | Monthly publish |
| Competitors | Your sites vs. competitors: keyword counts, estimated traffic, share of top 10 | Monthly publish |
| AI visibility | Visibility, share of voice, position and citations for your brand and competitors | Live, from tracker answers |
| AI traffic | Sessions from ChatGPT, Gemini, Copilot, Perplexity and other assistants | Live, from Google Analytics |
| Traffic value | What your organic traffic would cost as paid clicks | Monthly publish |
| Fan-out gaps | The searches ChatGPT runs, and whether you rank for them | Monthly publish |
| Ads & Shopping | Competitor Google Ads keywords and Google Shopping sellers | Monthly publish |

Also added: the Google AI Mode engine, ChatGPT query fan-out capture, and automatic retries for scheduled AI runs that fail.

## How it fits together

- **This repo** is the web app, running on Cloudflare Workers with a D1 database.
- **`seo-pipeline`** is the optional monthly data pipeline. It loads Search Console, DataForSEO and app data into BigQuery, feeds Looker Studio, and publishes the tabs marked "Monthly publish". Without it, those tabs stay empty and the rest of the app works.

Data comes from [DataForSEO](https://dataforseo.com/), paid per request, plus Search Console and Google Analytics.

## Documentation

| Topic | Where |
|---|---|
| Install and connect your accounts | [docs/SETUP.md](./docs/SETUP.md) |
| Whole-system architecture and schedule | `docs/ARCHITECTURE.md` in seo-pipeline |
| Working in this repo | [AGENTS.md](./AGENTS.md) |
| Local development | [docs/LOCAL_DEVELOPMENT.md](./docs/LOCAL_DEVELOPMENT.md) |
| Logo files | [src/public/brand/](./src/public/brand/) |

## Naming

The `open-seo` name remains in the database and Worker resource names and in upstream's docs. Tables prefixed `alh_` hold the Monthly Insights data.
