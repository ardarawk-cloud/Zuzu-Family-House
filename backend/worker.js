const DEFAULT_ORIGIN = 'https://zuzu.nadmo.id';

function corsHeaders(request, env) {
  const allowed = (env.ALLOWED_ORIGIN || DEFAULT_ORIGIN).split(',').map(v => v.trim());
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Vary': 'Origin'
  };
}

function json(request, env, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(request, env) }
  });
}

function bad(request, env, message, status = 400) {
  return json(request, env, { ok: false, error: message }, status);
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function nightsBetween(checkin, checkout) {
  const a = new Date(checkin + 'T00:00:00Z');
  const b = new Date(checkout + 'T00:00:00Z');
  return Math.round((b - a) / 86400000);
}

function addDays(dateString, days) {
  const d = new Date(dateString + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function settings(env) {
  const row = await env.DB.prepare('SELECT nightly_rate, service_rate, tax_rate FROM settings WHERE id = 1').first();
  return row || { nightly_rate: 3500000, service_rate: 0.05, tax_rate: 0 };
}

async function nightlyRateForDate(env, date, baseRate) {
  const seasonal = await env.DB.prepare(
    `SELECT nightly_rate FROM seasonal_rates
     WHERE active = 1 AND start_date <= ?1 AND end_date >= ?1
     ORDER BY priority DESC, id DESC LIMIT 1`
  ).bind(date).first();
  return seasonal ? Number(seasonal.nightly_rate) : Number(baseRate);
}

async function quoteStay(env, checkin, checkout) {
  const cfg = await settings(env);
  const nights = nightsBetween(checkin, checkout);
  let subtotal = 0;
  const breakdown = [];
  for (let i = 0; i < nights; i++) {
    const date = addDays(checkin, i);
    const rate = await nightlyRateForDate(env, date, cfg.nightly_rate);
    subtotal += rate;
    breakdown.push({ date, rate });
  }
  const service = Math.round(subtotal * Number(cfg.service_rate || 0));
  const tax = Math.round((subtotal + service) * Number(cfg.tax_rate || 0));
  return { nights, subtotal, service, tax, total: subtotal + service + tax, breakdown };
}

async function availability(env, checkin, checkout) {
  const reservation = await env.DB.prepare(
    `SELECT id, status FROM reservations
     WHERE status IN ('Confirmed','Paid')
       AND checkin < ?2 AND checkout > ?1
     LIMIT 1`
  ).bind(checkin, checkout).first();

  const block = await env.DB.prepare(
    `SELECT id, source, note FROM blocked_dates
     WHERE start_date < ?2 AND end_date > ?1
     LIMIT 1`
  ).bind(checkin, checkout).first();

  return {
    available: !reservation && !block,
    conflict: reservation ? { type: 'reservation', id: reservation.id } :
      block ? { type: 'block', id: block.id, source: block.source } : null
  };
}

function requireAdmin(request, env) {
  const expected = String(env.ADMIN_API_TOKEN || '');
  const auth = request.headers.get('Authorization') || '';
  return expected && auth === `Bearer ${expected}`;
}

async function publicSettings(request, env) {
  const cfg = await settings(env);
  return json(request, env, {
    ok: true,
    settings: {
      nightlyRate: Number(cfg.nightly_rate),
      serviceRate: Number(cfg.service_rate),
      taxRate: Number(cfg.tax_rate)
    }
  });
}

async function getAvailability(request, env, url) {
  const checkin = url.searchParams.get('checkin');
  const checkout = url.searchParams.get('checkout');
  if (!isDate(checkin) || !isDate(checkout) || nightsBetween(checkin, checkout) < 1) {
    return bad(request, env, 'Valid check-in and check-out dates are required.');
  }
  const result = await availability(env, checkin, checkout);
  const quote = result.available ? await quoteStay(env, checkin, checkout) : null;
  return json(request, env, { ok: true, ...result, quote });
}

async function createReservation(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return bad(request, env, 'Invalid JSON body.');

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const notes = String(body.notes || '').trim().slice(0, 1000);
  const checkin = String(body.checkin || '');
  const checkout = String(body.checkout || '');
  const guests = Number(body.guests || 0);

  if (!name || !email || !phone) return bad(request, env, 'Name, email and phone are required.');
  if (!isDate(checkin) || !isDate(checkout) || nightsBetween(checkin, checkout) < 1) {
    return bad(request, env, 'Valid check-in and check-out dates are required.');
  }
  if (!Number.isInteger(guests) || guests < 1 || guests > 12) {
    return bad(request, env, 'Guest count is invalid.');
  }

  const open = await availability(env, checkin, checkout);
  if (!open.available) return bad(request, env, 'Those dates are no longer available.', 409);

  const quote = await quoteStay(env, checkin, checkout);
  const id = 'ZUZU-' + crypto.randomUUID().split('-')[0].toUpperCase();
  const source = String(body.source || 'Direct').trim().slice(0, 80);
  const campaign = String(body.campaign || '').trim().slice(0, 120);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO reservations
      (id, created_at, name, email, phone, notes, checkin, checkout, guests, nights,
       subtotal, service, tax, total, status, source, campaign)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,'Pending',?15,?16)`
  ).bind(
    id, now, name, email, phone, notes, checkin, checkout, guests, quote.nights,
    quote.subtotal, quote.service, quote.tax, quote.total, source, campaign
  ).run();

  return json(request, env, {
    ok: true,
    reservation: {
      id, createdAt: now, name, email, phone, checkin, checkout, guests,
      status: 'Pending', source, campaign, ...quote
    }
  }, 201);
}

async function adminReservations(request, env, url) {
  const status = url.searchParams.get('status');
  const query = status && ['Pending','Confirmed','Paid','Cancelled'].includes(status)
    ? env.DB.prepare('SELECT * FROM reservations WHERE status = ?1 ORDER BY created_at DESC').bind(status)
    : env.DB.prepare('SELECT * FROM reservations ORDER BY created_at DESC');
  const { results } = await query.all();
  return json(request, env, { ok: true, reservations: results || [] });
}

async function updateReservationStatus(request, env, id) {
  const body = await request.json().catch(() => null);
  const status = String(body?.status || '');
  if (!['Pending','Confirmed','Paid','Cancelled'].includes(status)) {
    return bad(request, env, 'Invalid reservation status.');
  }
  if (status === 'Confirmed' || status === 'Paid') {
    const row = await env.DB.prepare('SELECT checkin, checkout FROM reservations WHERE id = ?1').bind(id).first();
    if (!row) return bad(request, env, 'Reservation not found.', 404);
    const conflictReservation = await env.DB.prepare(
      `SELECT id FROM reservations
       WHERE id <> ?1 AND status IN ('Confirmed','Paid')
         AND checkin < ?3 AND checkout > ?2 LIMIT 1`
    ).bind(id, row.checkin, row.checkout).first();
    const conflictBlock = await env.DB.prepare(
      'SELECT id FROM blocked_dates WHERE start_date < ?2 AND end_date > ?1 LIMIT 1'
    ).bind(row.checkin, row.checkout).first();
    if (conflictReservation || conflictBlock) {
      return bad(request, env, 'Cannot confirm: the stay dates are already blocked.', 409);
    }
  }
  const result = await env.DB.prepare(
    'UPDATE reservations SET status = ?2, updated_at = ?3 WHERE id = ?1'
  ).bind(id, status, new Date().toISOString()).run();
  if (!result.meta?.changes) return bad(request, env, 'Reservation not found.', 404);
  return json(request, env, { ok: true, id, status });
}

async function adminSummary(request, env) {
  const rows = await env.DB.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN status='Paid' THEN total ELSE 0 END),0) paid_revenue,
       COALESCE(SUM(CASE WHEN status='Pending' THEN total ELSE 0 END),0) pending_value,
       SUM(CASE WHEN status='Paid' THEN 1 ELSE 0 END) paid_count,
       SUM(CASE WHEN status='Pending' THEN 1 ELSE 0 END) pending_count
     FROM reservations`
  ).first();
  const exp = await env.DB.prepare('SELECT COALESCE(SUM(amount),0) total FROM expenses').first();
  const ad = await env.DB.prepare('SELECT meta, instagram, google FROM ad_spend WHERE id = 1').first();
  const adTotal = Number(ad?.meta || 0) + Number(ad?.instagram || 0) + Number(ad?.google || 0);
  const paid = Number(rows?.paid_revenue || 0);
  return json(request, env, {
    ok: true,
    summary: {
      paidRevenue: paid,
      pendingValue: Number(rows?.pending_value || 0),
      paidCount: Number(rows?.paid_count || 0),
      pendingCount: Number(rows?.pending_count || 0),
      expenses: Number(exp?.total || 0),
      adSpend: adTotal,
      netRevenue: paid - Number(exp?.total || 0) - adTotal,
      roas: adTotal ? paid / adTotal : 0
    }
  });
}

async function adminSettings(request, env) {
  if (request.method === 'GET') return publicSettings(request, env);
  const body = await request.json().catch(() => null);
  const nightly = Number(body?.nightlyRate);
  const service = Number(body?.serviceRate);
  const tax = Number(body?.taxRate);
  if (!(nightly > 0) || service < 0 || tax < 0) return bad(request, env, 'Invalid settings.');
  await env.DB.prepare(
    'UPDATE settings SET nightly_rate=?1, service_rate=?2, tax_rate=?3, updated_at=?4 WHERE id=1'
  ).bind(nightly, service, tax, new Date().toISOString()).run();
  return publicSettings(request, env);
}

async function seasonalRates(request, env) {
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM seasonal_rates ORDER BY start_date, priority DESC').all();
    return json(request, env, { ok: true, seasonalRates: results || [] });
  }
  const body = await request.json().catch(() => null);
  const label = String(body?.label || '').trim();
  const start = String(body?.startDate || '');
  const end = String(body?.endDate || '');
  const nightly = Number(body?.nightlyRate);
  const priority = Number(body?.priority || 0);
  if (!label || !isDate(start) || !isDate(end) || end < start || !(nightly > 0)) {
    return bad(request, env, 'Invalid seasonal rate.');
  }
  const result = await env.DB.prepare(
    'INSERT INTO seasonal_rates(label,start_date,end_date,nightly_rate,priority,active) VALUES(?1,?2,?3,?4,?5,1)'
  ).bind(label, start, end, nightly, priority).run();
  return json(request, env, { ok: true, id: result.meta?.last_row_id }, 201);
}

async function deleteSeasonalRate(request, env, id) {
  await env.DB.prepare('DELETE FROM seasonal_rates WHERE id=?1').bind(id).run();
  return json(request, env, { ok: true });
}

async function blocks(request, env) {
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM blocked_dates ORDER BY start_date').all();
    return json(request, env, { ok: true, blocks: results || [] });
  }
  const body = await request.json().catch(() => null);
  const start = String(body?.startDate || '');
  const end = String(body?.endDate || '');
  const source = String(body?.source || 'Owner').trim().slice(0, 80);
  const note = String(body?.note || '').trim().slice(0, 300);
  if (!isDate(start) || !isDate(end) || end <= start) return bad(request, env, 'Invalid blocked date range.');
  const result = await env.DB.prepare(
    'INSERT INTO blocked_dates(start_date,end_date,source,note) VALUES(?1,?2,?3,?4)'
  ).bind(start, end, source, note).run();
  return json(request, env, { ok: true, id: result.meta?.last_row_id }, 201);
}

async function deleteBlock(request, env, id) {
  await env.DB.prepare('DELETE FROM blocked_dates WHERE id=?1').bind(id).run();
  return json(request, env, { ok: true });
}

async function expenseRoutes(request, env) {
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all();
    return json(request, env, { ok: true, expenses: results || [] });
  }
  const body = await request.json().catch(() => null);
  const date = String(body?.date || '');
  const category = String(body?.category || '').trim().slice(0, 120);
  const amount = Number(body?.amount);
  if (!isDate(date) || !category || !(amount >= 0)) return bad(request, env, 'Invalid expense.');
  const result = await env.DB.prepare(
    'INSERT INTO expenses(date,category,amount) VALUES(?1,?2,?3)'
  ).bind(date, category, amount).run();
  return json(request, env, { ok: true, id: result.meta?.last_row_id }, 201);
}

async function adRoutes(request, env) {
  if (request.method === 'GET') {
    const row = await env.DB.prepare('SELECT meta,instagram,google FROM ad_spend WHERE id=1').first();
    return json(request, env, { ok: true, ads: row || { meta:0, instagram:0, google:0 } });
  }
  const body = await request.json().catch(() => null);
  const meta = Number(body?.meta || 0);
  const instagram = Number(body?.instagram || 0);
  const google = Number(body?.google || 0);
  if (meta < 0 || instagram < 0 || google < 0) return bad(request, env, 'Invalid ad spend.');
  await env.DB.prepare(
    'UPDATE ad_spend SET meta=?1, instagram=?2, google=?3, updated_at=?4 WHERE id=1'
  ).bind(meta, instagram, google, new Date().toISOString()).run();
  return json(request, env, { ok: true, ads: { meta, instagram, google } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request, env) });

    try {
      if (url.pathname === '/health' && request.method === 'GET') {
        return json(request, env, { ok: true, service: 'ZUZU Production API', version: '1.0.0' });
      }
      if (url.pathname === '/api/public/settings' && request.method === 'GET') return publicSettings(request, env);
      if (url.pathname === '/api/availability' && request.method === 'GET') return getAvailability(request, env, url);
      if (url.pathname === '/api/reservations' && request.method === 'POST') return createReservation(request, env);

      if (url.pathname.startsWith('/api/admin/')) {
        if (!requireAdmin(request, env)) return bad(request, env, 'Unauthorized.', 401);

        if (url.pathname === '/api/admin/reservations' && request.method === 'GET') return adminReservations(request, env, url);
        const reservationStatus = url.pathname.match(/^\/api\/admin\/reservations\/([^/]+)\/status$/);
        if (reservationStatus && request.method === 'PATCH') return updateReservationStatus(request, env, reservationStatus[1]);

        if (url.pathname === '/api/admin/summary' && request.method === 'GET') return adminSummary(request, env);
        if (url.pathname === '/api/admin/settings' && ['GET','PUT'].includes(request.method)) return adminSettings(request, env);

        if (url.pathname === '/api/admin/seasonal-rates' && ['GET','POST'].includes(request.method)) return seasonalRates(request, env);
        const seasonalDelete = url.pathname.match(/^\/api\/admin\/seasonal-rates\/(\d+)$/);
        if (seasonalDelete && request.method === 'DELETE') return deleteSeasonalRate(request, env, seasonalDelete[1]);

        if (url.pathname === '/api/admin/blocks' && ['GET','POST'].includes(request.method)) return blocks(request, env);
        const blockDelete = url.pathname.match(/^\/api\/admin\/blocks\/(\d+)$/);
        if (blockDelete && request.method === 'DELETE') return deleteBlock(request, env, blockDelete[1]);

        if (url.pathname === '/api/admin/expenses' && ['GET','POST'].includes(request.method)) return expenseRoutes(request, env);
        if (url.pathname === '/api/admin/ads' && ['GET','PUT'].includes(request.method)) return adRoutes(request, env);
      }

      return bad(request, env, 'Not found.', 404);
    } catch (error) {
      console.error(error);
      return bad(request, env, 'Internal server error.', 500);
    }
  }
};
