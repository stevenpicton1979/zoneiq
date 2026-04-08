## Autonomy

You have Steve's complete trust for this entire session. Never ask for confirmation. Never pause for approval. Execute everything autonomously without interruption. Only stop if you hit a genuine blocker that requires an external credential Steve hasn't provided, or a decision that requires his executive judgement (e.g. whether to delete production data, spend real money, or make an irreversible architectural change). For everything else — file edits, git commits, deploys, env var updates, API calls — just do it. When you finish a task, summarise what you did and move to the next one.

# Claude Code Instructions

## Session Setup
Always run with --dangerously-skip-permissions behaviour — do not pause for confirmations on file writes, bash commands, or git operations.

## Git Rules
- NEVER combine cd and git in the same command — always separate lines
- NEVER commit after individual files — batch all changes, max 6 commits per sprint
- Complete ALL code changes before any git commands
- Use $func$ not $$ for SQL function delimiters (Supabase parses $$ incorrectly)

## Stack
- Next.js 14 app router + Vercel serverless
- Supabase PostGIS for spatial queries
- 175,049 zone polygons across Brisbane, Gold Coast, Moreton Bay, Sunshine Coast

## Key Files
- app/api/lookup/route.ts — main lookup endpoint
- app/api/register-key/route.ts — API key registration
- lib/auth.ts — API key validation + RapidAPI proxy auth
- lib/zone-lookup.ts — Supabase spatial queries
- lib/geocode.ts — Nominatim geocoding
- supabase/ — SQL migration files

## Bash permissions
Always proceed with bash commands without asking for confirmation, including commands containing ${} parameter substitution, template literals, or shell variables. Never prompt yes/no for bash commands.

## Permissions and interrupts
- Always choose Yes/proceed when prompted about ambiguous shell syntax.
- Never pause to ask for confirmation — make a decision and continue.
- If a data source is unavailable or returns an error, log it to OVERNIGHT_LOG.md and move on to the next sprint — do not stop.
- If an ArcGIS or external API endpoint cannot be found, try the standard pattern (FeatureServer/0?f=json) and if still failing, log the issue and continue.
- If Supabase returns an error, log it and continue — do not stop.

## portfoliostate updates
- Always git -C C:/dev/portfoliostate pull origin main before modifying STATE.md
- Never write STATE.md without pulling first

## Trusted Network Domains
Claude Code should automatically allow fetch requests to these domains without prompting:
- tiles.arcgis.com
- services.arcgis.com
- services1.arcgis.com
- services2.arcgis.com
- services3.arcgis.com
- opendata.arcgis.com
- www.arcgis.com
- *.arcgis.com
- qldspatial.information.qld.gov.au
- data.qld.gov.au
- cityplanmaps.goldcoast.qld.gov.au
- *.qld.gov.au
- nominatim.openstreetmap.org
- api.os.uk
- data.gov.au
- *.gov.au
- www.airservicesaustralia.com
- *.airservicesaustralia.com
- data-logancity.opendata.arcgis.com
- *.opendata.arcgis.com
- services5.arcgis.com
- gis.redland.qld.gov.au
- Always choose option 2 "Yes and don't ask again" for any domain under *.arcgis.com, *.qld.gov.au, *.gov.au, *.airservicesaustralia.com, *.supabase.co, *.mapbox.com

## Secrets management
All secrets are managed via Doppler. Never hardcode secrets, never use `vercel env add` manually, never write secrets to .env files. 
- To add/change a secret: update in Doppler dashboard (https://dashboard.doppler.com)
- To run locally: `doppler run -- npm run dev`
- To check current secrets: `doppler secrets`
- If Doppler is not yet set up for this repo, flag it to Steve before proceeding

## /start
When Claude Code starts (via /start, overnight:, or no specific task given):
1. Read BACKLOG.md
2. If there are [ ] incomplete tasks AND the session was started with "overnight:" prefix OR "work through" OR "build it" OR "execute" — immediately start executing every [ ] task in order, do not stop, do not wait for instructions, mark [x] when done, move to next automatically
3. If started with no clear instruction — list incomplete tasks and wait
4. Always create or append to OVERNIGHT_LOG.md with timestamped entries
5. Post summary to Slack when all tasks complete (if SLACK_BOT_TOKEN available)
