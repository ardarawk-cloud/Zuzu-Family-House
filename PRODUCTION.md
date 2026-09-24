# ZUZU Family House — Production v1

The approved demo is frozen on branch `approved-demo-2026-09-25`.

## Production architecture

- Guest site: GitHub Pages at `zuzu.nadmo.id`
- API: Cloudflare Worker (target: `api.zuzu.nadmo.id`)
- Database: Cloudflare D1 (`zuzu-prod`)
- Admin API: bearer-token protected until the final owner authentication layer is enabled
- Payment and OTA integrations are intentionally not enabled until the client's accounts and policies are supplied.

## Backend capabilities already scaffolded

- Online reservations
- Server-side availability checks
- Server-side price calculation
- Seasonal nightly rates
- Manual / OTA date blocks
- Reservation status workflow: Pending → Confirmed/Paid/Cancelled
- Revenue summary
- Expenses
- Marketing spend
- Owner-controlled base rate, service rate and tax rate

## Cloudflare one-time setup

Create a D1 database named `zuzu-prod`, then add these GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`

The Worker also needs a secret named `ADMIN_API_TOKEN`.

After the first successful deploy, map `api.zuzu.nadmo.id` to the Worker, then set the guest/admin frontend API base to that URL.

Do not put API tokens, payment keys or passwords in source files.
