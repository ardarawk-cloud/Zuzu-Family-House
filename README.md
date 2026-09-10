# ZUZU Family House — Booking MVP

A zero-SaaS-cost browser prototype for ZUZU Family House, Pererenan, Badung, Bali.

## Included
- Responsive single-property guest website
- Direct booking request form
- Booking price calculator
- Admin/owner dashboard
- Reservation status management
- Revenue, expenses and net calculation
- Meta / Instagram / Google ad-spend entry and ROAS
- Configurable nightly rate, service rate and tax rate
- CSV export
- UTM source/campaign capture

## Run locally
Open `index.html` directly, or run:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` and `http://localhost:8080/admin.html`.

## Important MVP limitation
This prototype stores data in browser `localStorage`. It is for design/flow validation only. Production should replace localStorage with a real backend/database, authenticated admin, payment gateway webhooks, server-side conversion tracking, backups and access control.

## Production roadmap
1. Supabase/PostgreSQL database and auth
2. Property/availability/pricing tables
3. Payment gateway integration
4. Email / WhatsApp confirmations
5. Meta Pixel + Conversions API and GA4
6. Finance ledger + tax reports
7. Owner/admin roles
8. Production hosting/domain/SSL/backup
