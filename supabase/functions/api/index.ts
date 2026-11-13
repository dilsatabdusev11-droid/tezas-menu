// TEZAS — API заказов (Supabase Edge Function, Deno).
//
// Маршруты (все под /functions/v1/api):
//   GET  /config                     — режим оплаты для сайта
//   POST /orders                     — создать заказ (цены считает сервер по menu.json)
//   GET  /orders/:id                 — статус заказа для гостя
//   POST /halyk/postlink?s=…         — уведомление Halyk об оплате
//   GET  /kitchen/orders             — заказы на сегодня (заголовок x-kitchen-pin)
//   POST /kitchen/orders/:id         — сменить статус   (заголовок x-kitchen-pin)
//
// Персональные данные (имя, телефон, e-mail, IP, данные карты) не сохраняются.
//
// Секреты (Supabase → Edge Functions → Secrets):
//   KITCHEN_PIN          — PIN экрана кухни (обязательно)
//   HALYK_MODE           — "test" (по умолчанию) или "prod"
//   HALYK_CLIENT_ID, HALYK_CLIENT_SECRET, HALYK_TERMINAL — боевые ключи Halyk ePay (для prod)
//   HALYK_QR_CLIENT_ID, HALYK_QR_CLIENT_SECRET, HALYK_QR_TERMINAL — ключи QR-оплаты (Homebank),
//                        если Halyk выдал для неё отдельный терминал; иначе берутся ключи выше
//   POSTLINK_SECRET      — случайная строка для защиты адреса уведомлений Halyk
//   SITE_URL             — адрес сайта, по умолчанию https://tezas-menu.vercel.app
//   MENU_URL             — адрес menu.json, по умолчанию SITE_URL/menu.json

import { createClient } from "npm:@supabase/supabase-js@2";

const env = (k: string) => Deno.env.get(k) ?? "";
const SITE_URL = (env("SITE_URL") || "https://tezas-menu.vercel.app").replace(/\/$/, "");
const MENU_URL = env("MENU_URL") || `${SITE_URL}/menu.json`;
const FUNCTION_URL = `${env("SUPABASE_URL")}/functions/v1/api`;

function serviceKey() {
  try {
    const keys = JSON.parse(env("SUPABASE_SECRET_KEYS") || "{}");
    if (keys.default) return keys.default as string;
  } catch { /* старый формат ключей */ }
  return env("SUPABASE_SERVICE_ROLE_KEY");
}
const db = createClient(env("SUPABASE_URL"), serviceKey(), { auth: { persistSession: false } });

// ---------- Halyk ePay ----------
// Тестовые данные — публичные, из документации epayment.kz/docs/Test-credentials.
const HALYK_TEST = {
  oauth: "https://test-epay-oauth.epayment.kz/oauth2/token",
  api: "https://test-epay-api.epayment.kz",
  script: "https://test-epay.epayment.kz/payform/payment-api.js",
  clientId: "test",
  clientSecret: "yF587AV9Ms94qN2QShFzVR3vFnWkhjbAK3sG",
  terminal: "67e34d63-102f-4bd1-898e-370781d0074d",
};
const HALYK_PROD = {
  oauth: "https://epay-oauth.homebank.kz/oauth2/token",
  api: "https://epay-api.homebank.kz",
  script: "https://epay.homebank.kz/payform/payment-api.js",
  clientId: env("HALYK_CLIENT_ID"),
  clientSecret: env("HALYK_CLIENT_SECRET"),
  terminal: env("HALYK_TERMINAL"),
};
// QR-оплата в приложении Homebank: тестовые ключи QR-терминала из той же документации.
const HALYK_QR_TEST = { ...HALYK_TEST, clientId: "EPAY-TEST-PAYMENT", clientSecret: "gG1uIMT$cTZJS&Lm", terminal: "5f7bdf8b-f34c-4aed-bd0c-47fa1e323496" };
const HALYK_QR_PROD = {
  ...HALYK_PROD,
  clientId: env("HALYK_QR_CLIENT_ID") || env("HALYK_CLIENT_ID"),
  clientSecret: env("HALYK_QR_CLIENT_SECRET") || env("HALYK_CLIENT_SECRET"),
  terminal: env("HALYK_QR_TERMINAL") || env("HALYK_TERMINAL"),
};
const halykMode = () => (env("HALYK_MODE") === "prod" ? "prod" : "test");
const halyk = () => (halykMode() === "prod" ? HALYK_PROD : HALYK_TEST);
const halykQr = () => (halykMode() === "prod" ? HALYK_QR_PROD : HALYK_QR_TEST);
const HALYK_SCOPE = "webapi usermanagement email_send verification statement statistics payment";

async function halykToken(extra: Record<string, string> = {}, h = halyk()) {
  const form = new FormData();
  const fields: Record<string, string> = {
    grant_type: "client_credentials",
    scope: HALYK_SCOPE,
    client_id: h.clientId,
    client_secret: h.clientSecret,
    terminal: h.terminal,
    ...extra,
  };
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const r = await fetch(h.oauth, { method: "POST", body: form });
  if (!r.ok) throw new Error(`halyk_token_${r.status}`);
  const tok = await r.json();
  if (!tok.access_token) throw new Error("halyk_token_empty");
  return tok;
}

// Проверка статуса платежа у банка. Возвращает "paid" | "failed" | "pending".
async function halykCheck(invoiceId: string, h = halyk()): Promise<{ state: "paid" | "failed" | "pending"; ref?: string; amount?: number }> {
  const tok = await halykToken({}, h);
  const r = await fetch(`${h.api}/check-status/payment/transaction/${invoiceId}`, {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  });
  if (!r.ok) return { state: "pending" };
  const j = await r.json();
  if (j.resultCode === "100" && j.transaction) {
    const s = String(j.transaction.statusName || "").toUpperCase();
    const amount = Number(j.transaction.amount);
    if (s === "CHARGE" || s === "AUTH") return { state: "paid", ref: j.transaction.id, amount };
    if (["FAILED", "REJECT", "3D", "CANCEL", "CANCEL_OLD", "REFUND"].includes(s)) return { state: "failed" };
    return { state: "pending" };
  }
  if (j.resultCode === "101") return { state: "failed" };
  return { state: "pending" };
}

// Homebank: создать QR-счёт. Возвращает ссылку в приложение (с суммой) и строку QR-кода.
async function homebankCreate(invoiceId: string, amount: number, number: number, lang: string) {
  const h = halykQr();
  const tok = await halykToken({ invoiceID: invoiceId, amount: String(amount), currency: "KZT" }, h);
  const postLink = `${FUNCTION_URL}/halyk/postlink?s=${encodeURIComponent(env("POSTLINK_SECRET"))}`;
  const r = await fetch(`${h.api}/payment/qr/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tok.access_token}`, "content-type": "application/json" },
    body: JSON.stringify({ postLink, failurePostLink: postLink, description: `TEZAS order ${number}`, language: lang === "kk" ? "kz" : "ru" }),
  });
  if (!r.ok) throw new Error(`homebank_qr_${r.status}`);
  const j = await r.json();
  if (!j.homebankLink || !j.qrcode) throw new Error("homebank_qr_empty");
  return { token: tok.access_token as string, link: j.homebankLink as string, qrcode: j.qrcode as string };
}

// Homebank: статус QR-счёта по токену, выданному при создании (живёт 20 минут).
async function homebankStatus(token: string): Promise<{ state: "paid" | "failed" | "pending"; amount?: number }> {
  const r = await fetch(`${halykQr().api}/qr`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return { state: "pending" };
  const j = await r.json();
  const s = String(j.status || "").toUpperCase();
  if (s === "PAID") return { state: "paid", amount: Number(j.amount) };
  if (["REJECTED", "CLOSED", "RETURN"].includes(s)) return { state: "failed" };
  return { state: "pending" };
}

// Проверка оплаты Homebank: сначала живой статус QR, затем подтверждение транзакции у банка.
async function homebankCheck(o: { invoice_id: string; qr_token: string | null }) {
  if (o.qr_token) {
    const s = await homebankStatus(o.qr_token);
    if (s.state !== "paid") return s;
  }
  return await halykCheck(o.invoice_id, halykQr());
}

// ---------- Меню и цены ----------
type Sku = { id: string; price: number; ru: string; kk: string; size?: string; note_ru?: string; note_kk?: string; combo?: boolean };
let menuCache: { at: number; promo: number; skus: Map<string, Sku> } | null = null;

async function menu() {
  if (menuCache && Date.now() - menuCache.at < 60_000) return menuCache;
  const r = await fetch(MENU_URL, { headers: { "cache-control": "no-cache" } });
  if (!r.ok) throw new Error("menu_unavailable");
  const m = await r.json();
  const skus = new Map<string, Sku>();
  for (const c of m.categories) {
    for (const it of c.items) {
      const base = { ru: it.ru, kk: it.kk, note_ru: it.note?.ru, note_kk: it.note?.kk, combo: c.id === "combo" };
      if (it.variants) for (const v of it.variants) skus.set(v.id, { ...base, id: v.id, price: v.price, size: v.size });
      else skus.set(it.id, { ...base, id: it.id, price: it.price });
    }
  }
  menuCache = { at: Date.now(), promo: m.promoThreshold, skus };
  return menuCache;
}

// ---------- Утилиты ----------
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, x-kitchen-pin, authorization, apikey",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });
const fail = (code: string, status = 400) => json({ error: code }, status);

function randomToken(bytes = 24) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...a)).replace(/[+/=]/g, "").slice(0, 32);
}
function safeEqual(a: string, b: string) {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// То, что видит гость и кухня. Без секретов и служебных полей.
function publicOrder(o: Record<string, unknown>) {
  const pay = o.provider === "homebank" && o.status === "awaiting_payment" && o.qr_link
    ? { link: o.qr_link, qrcode: o.qr_code } : null;
  return {
    id: o.id, number: o.number, status: o.status, mode: o.mode, table_no: o.table_no,
    items: o.items, total: o.total, gift: o.gift, provider: o.provider, lang: o.lang,
    created_at: o.created_at, paid_at: o.paid_at, updated_at: o.updated_at, pay,
  };
}

async function markPaid(id: string, ref?: string) {
  await db.from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString(), provider_ref: ref ?? null })
    .eq("id", id).eq("status", "awaiting_payment");
}
async function markFailed(id: string) {
  await db.from("orders").update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("id", id).eq("status", "awaiting_payment");
}

// ---------- Обработчики ----------
async function createOrder(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return fail("bad_json"); }
  const mode = body.mode === "pickup" ? "pickup" : body.mode === "table" ? "table" : null;
  const provider = ["kaspi", "halyk", "homebank"].includes(body.provider) ? body.provider as string : null;
  const lang = body.lang === "kk" ? "kk" : "ru";
  if (!mode) return fail("bad_mode");
  if (!provider) return fail("bad_provider");
  let tableNo: number | null = null;
  if (mode === "table") {
    tableNo = Number(body.table);
    if (!Number.isInteger(tableNo) || tableNo < 1 || tableNo > 200) return fail("bad_table");
  }
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 40) return fail("bad_items");

  const m = await menu();
  const items: unknown[] = [];
  let total = 0, count = 0;
  for (const line of body.items) {
    const sku = m.skus.get(String(line?.id));
    const qty = Number(line?.qty);
    if (!sku) return fail("unknown_item");
    if (!Number.isInteger(qty) || qty < 1 || qty > 30) return fail("bad_qty");
    count += qty;
    total += sku.price * qty;
    items.push({ id: sku.id, qty, price: sku.price, ru: sku.ru, kk: sku.kk, size: sku.size ?? null,
      note_ru: sku.note_ru ?? null, note_kk: sku.note_kk ?? null, combo: sku.combo || false });
  }
  if (count > 60 || total > 500_000) return fail("too_large");
  const gift = total >= m.promo;
  const secretHash = provider === "halyk" ? randomToken() : null;

  const { data: order, error } = await db.rpc("create_order", {
    p_mode: mode, p_table_no: tableNo, p_items: items, p_total: total, p_gift: gift,
    p_provider: provider, p_lang: lang, p_secret_hash: secretHash,
  });
  if (error || !order) { console.error(error); return fail("db_error", 500); }

  if (provider === "kaspi") {
    return json({ order: publicOrder(order), payment: { type: "kaspi_counter" } });
  }

  if (provider === "homebank") {
    try {
      const qr = await homebankCreate(order.invoice_id, total, order.number, lang);
      const { data: saved } = await db.from("orders")
        .update({ qr_token: qr.token, qr_link: qr.link, qr_code: qr.qrcode })
        .eq("id", order.id).select("*").single();
      return json({ order: publicOrder(saved ?? order), payment: { type: "homebank", link: qr.link, qrcode: qr.qrcode, mode: halykMode() } });
    } catch (e) {
      console.error(e);
      await markFailed(order.id);
      return fail("homebank_unavailable", 502);
    }
  }

  // Halyk: токен на конкретный счёт + объект для платёжной страницы
  const postLink = `${FUNCTION_URL}/halyk/postlink?s=${encodeURIComponent(env("POSTLINK_SECRET"))}`;
  let auth;
  try {
    auth = await halykToken({
      invoiceID: order.invoice_id, secret_hash: secretHash!, amount: String(total), currency: "KZT",
      postLink, failurePostLink: postLink,
    });
  } catch (e) {
    console.error(e);
    await markFailed(order.id);
    return fail("halyk_unavailable", 502);
  }
  const back = `${SITE_URL}/order.html?id=${order.id}`;
  const h = halyk();
  return json({
    order: publicOrder(order),
    payment: {
      type: "halyk",
      mode: halykMode(),
      script: h.script,
      paymentObject: {
        invoiceId: order.invoice_id,
        backLink: back,
        failureBackLink: `${back}&fail=1`,
        postLink,
        failurePostLink: postLink,
        language: lang === "kk" ? "kaz" : "rus",
        description: `TEZAS order ${order.number}`,
        terminal: h.terminal,
        amount: total,
        currency: "KZT",
        auth,
      },
    },
  });
}

async function getOrder(id: string) {
  if (!UUID.test(id)) return fail("not_found", 404);
  let { data: o } = await db.from("orders").select("*").eq("id", id).maybeSingle();
  if (!o) return fail("not_found", 404);

  // Если уведомление от банка не дошло — сами спрашиваем статус.
  // Карта — не чаще раза в 8 секунд; QR Homebank показывает живой статус, его спрашиваем раз в 3 секунды.
  const age = Date.now() - new Date(o.created_at).getTime();
  const online = o.provider === "halyk" || o.provider === "homebank";
  const minGap = o.provider === "homebank" ? 3000 : 8000;
  const due = !o.last_check_at || Date.now() - new Date(o.last_check_at).getTime() > minGap;
  if (online && o.status === "awaiting_payment" && o.invoice_id && due && age > 3000) {
    await db.from("orders").update({ last_check_at: new Date().toISOString() }).eq("id", o.id);
    try {
      const c = o.provider === "homebank" ? await homebankCheck(o) : await halykCheck(o.invoice_id);
      if (c.state === "paid" && c.amount === o.total) await markPaid(o.id, c.ref);
      // QR Homebank живёт 20 минут, ссылка на карту — до 30
      else if (c.state === "failed" || age > (o.provider === "homebank" ? 21 : 30) * 60_000) await markFailed(o.id);
    } catch (e) { console.error(e); }
    ({ data: o } = await db.from("orders").select("*").eq("id", id).maybeSingle());
  }
  return json({ order: publicOrder(o!) });
}

async function halykPostlink(req: Request, url: URL) {
  const expected = env("POSTLINK_SECRET");
  if (expected && !safeEqual(url.searchParams.get("s") ?? "", expected)) return fail("forbidden", 403);
  let body: any = {};
  const text = await req.text();
  try { body = JSON.parse(text); } catch { body = Object.fromEntries(new URLSearchParams(text)); }
  // Из уведомления берём только номер счёта и secret_hash. Телефон, IP, e-mail и маску карты не сохраняем.
  const invoiceId = String(body.invoiceId ?? body.invoiceID ?? "");
  const secretHash = String(body.secret_hash ?? "");
  if (!invoiceId) return fail("bad_request");
  const { data: o } = await db.from("orders").select("id, total, status, secret_hash, provider, invoice_id, qr_token").eq("invoice_id", invoiceId).maybeSingle();
  if (!o) return json({ ok: true }); // чужой или старый счёт — просто подтверждаем получение
  // У QR-счетов Homebank нет secret_hash: для них единственная проверка — запрос статуса у банка ниже
  if (o.provider !== "homebank" && (!o.secret_hash || !safeEqual(secretHash, o.secret_hash))) return fail("forbidden", 403);
  if (o.status !== "awaiting_payment") return json({ ok: true });

  // Не верим телу уведомления на слово — перепроверяем у банка
  const c = o.provider === "homebank" ? await homebankCheck(o) : await halykCheck(invoiceId);
  if (c.state === "paid" && c.amount === o.total) await markPaid(o.id, c.ref);
  else if (c.state === "failed") await markFailed(o.id);
  return json({ ok: true });
}

// ---------- Кухня ----------
const NEXT: Record<string, string[]> = {
  awaiting_payment: ["paid", "cancelled"], // только Kaspi: касса подтверждает оплату вручную
  paid: ["cooking", "cancelled"],
  cooking: ["ready", "paid"],
  ready: ["done", "cooking"],
  done: ["ready"],
};

async function kitchenAuth(req: Request) {
  const pin = env("KITCHEN_PIN");
  if (!pin) return fail("pin_not_set", 503);
  if (!safeEqual(req.headers.get("x-kitchen-pin") ?? "", pin)) {
    await new Promise((r) => setTimeout(r, 600));
    return fail("bad_pin", 401);
  }
  return null;
}

async function kitchenList() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Oral" }).format(new Date());
  const since = new Date(Date.now() - 40 * 60_000).toISOString();
  const { data, error } = await db.from("orders").select("*").eq("day", today)
    .or(`status.in.(paid,cooking,ready),and(provider.eq.kaspi,status.eq.awaiting_payment),and(status.eq.done,updated_at.gte.${since})`)
    .order("number", { ascending: true });
  if (error) { console.error(error); return fail("db_error", 500); }
  return json({ orders: (data ?? []).map(publicOrder), server_time: new Date().toISOString() });
}

async function kitchenUpdate(req: Request, id: string) {
  if (!UUID.test(id)) return fail("not_found", 404);
  let body: any;
  try { body = await req.json(); } catch { return fail("bad_json"); }
  const to = String(body.status ?? "");
  const { data: o } = await db.from("orders").select("id, status, provider").eq("id", id).maybeSingle();
  if (!o) return fail("not_found", 404);
  if (!(NEXT[o.status] ?? []).includes(to)) return fail("bad_transition", 409);
  if (o.status === "awaiting_payment" && o.provider !== "kaspi") return fail("bad_transition", 409);
  const patch: Record<string, unknown> = { status: to, updated_at: new Date().toISOString() };
  if (to === "paid" && o.status === "awaiting_payment") patch.paid_at = new Date().toISOString();
  const { data, error } = await db.from("orders").update(patch).eq("id", id).eq("status", o.status).select("*").maybeSingle();
  if (error) { console.error(error); return fail("db_error", 500); }
  if (!data) return fail("conflict", 409);
  return json({ order: publicOrder(data) });
}

// ---------- Маршрутизация ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*?\/api(?=\/|$)/, "") || "/";
  try {
    if (req.method === "GET" && path === "/config") {
      return json({ halyk: halykMode(), kaspi: "counter", kitchen: Boolean(env("KITCHEN_PIN")) });
    }
    if (req.method === "POST" && path === "/orders") return await createOrder(req);
    let m = path.match(/^\/orders\/([^/]+)$/);
    if (req.method === "GET" && m) return await getOrder(m[1]);
    if (req.method === "POST" && path === "/halyk/postlink") return await halykPostlink(req, url);

    if (path.startsWith("/kitchen/")) {
      const denied = await kitchenAuth(req);
      if (denied) return denied;
      if (req.method === "GET" && path === "/kitchen/orders") return await kitchenList();
      m = path.match(/^\/kitchen\/orders\/([^/]+)$/);
      if (req.method === "POST" && m) return await kitchenUpdate(req, m[1]);
    }
    return fail("not_found", 404);
  } catch (e) {
    console.error(e);
    return fail(e instanceof Error && e.message === "menu_unavailable" ? "menu_unavailable" : "server_error", 500);
  }
});
