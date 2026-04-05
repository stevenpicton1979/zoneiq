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
- Always choose option 2 "Yes and don't ask again" for any domain under *.arcgis.com, *.qld.gov.au, *.gov.au, *.airservicesaustralia.com, *.supabase.co, *.mapbox.com
