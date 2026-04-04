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
