(() => {
  const API = window.TEZAS_API;
  const $ = (s) => document.querySelector(s);
  const money = (n) => n.toLocaleString("ru-RU").replace(/\s/g, " ") + " ₸";
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  let pin = sessionStorage.getItem("tezas-kitchen-pin") || "";
  let orders = [];
  let known = null;          // id заказов, которые уже видели (для звука)
  let skew = 0;              // разница часов сервера и планшета
  let timer = null;
  let sound = localStorage.getItem("tezas-kitchen-sound") !== "off";
  let audio = null;
  let wakeLock = null;

  const COLS = [
    { key: "kaspi", title: "Ждут оплаты · Kaspi", match: (o) => o.status === "awaiting_payment" },
    { key: "new", title: "Новые", match: (o) => o.status === "paid" },
    { key: "cooking", title: "Готовятся", match: (o) => o.status === "cooking" },
    { key: "ready", title: "Готовы", match: (o) => o.status === "ready" }
  ];
  const ACTIONS = {
    awaiting_payment: [["paid", "Оплачено", "go"], ["cancelled", "Отменить", "bad"]],
    paid: [["cooking", "Начать готовить", "go"], ["cancelled", "Отменить", "bad small"]],
    cooking: [["ready", "Готово", "go"]],
    ready: [["done", "Выдан", "go"]]
  };
  const NAMES = { paid: "Новый", cooking: "Готовится", ready: "Готов", done: "Выдан", cancelled: "Отменён", awaiting_payment: "Ждёт оплаты" };

  async function api(path, opts = {}) {
    const r = await fetch(`${API}${path}`, { ...opts, headers: { "content-type": "application/json", "x-kitchen-pin": pin, ...(opts.headers || {}) } });
    const res = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(res.error || `http_${r.status}`); e.status = r.status; throw e; }
    return res;
  }

  // ---------- Звук нового заказа ----------
  function beep() {
    if (!sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const now = audio.currentTime;
      [0, 0.22, 0.44].forEach((t, i) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = "square"; o.frequency.value = i === 2 ? 1320 : 880;
        g.gain.setValueAtTime(0.0001, now + t);
        g.gain.exponentialRampToValueAtTime(0.25, now + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.18);
        o.connect(g).connect(audio.destination);
        o.start(now + t); o.stop(now + t + 0.2);
      });
    } catch { /* браузер без звука */ }
  }

  // ---------- Вход ----------
  async function login(e) {
    e && e.preventDefault();
    const err = $("#pinErr");
    if (e) pin = $("#pin").value.trim();
    if (!pin) return;
    err.textContent = "";
    try {
      // клик по «Войти» разрешает браузеру звук
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const res = await api("/kitchen/orders");
      sessionStorage.setItem("tezas-kitchen-pin", pin);
      $("#login").hidden = true; $("#board").hidden = false;
      apply(res);
      keepAwake();
      schedule();
    } catch (x) {
      sessionStorage.removeItem("tezas-kitchen-pin");
      $("#login").hidden = false; $("#board").hidden = true;
      err.textContent = x.status === 401 ? "Неверный PIN." : x.message === "pin_not_set"
        ? "PIN ещё не задан: добавьте секрет KITCHEN_PIN в Supabase." : "Нет связи с сервером. Попробуйте ещё раз.";
    }
  }

  async function keepAwake() {
    try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch { /* не поддерживается */ }
  }

  // ---------- Данные ----------
  function apply(res) {
    orders = res.orders;
    skew = Date.parse(res.server_time) - Date.now();
    const fresh = orders.filter((o) => ["paid", "awaiting_payment"].includes(o.status));
    if (known) {
      const isNew = fresh.some((o) => !known.has(o.id));
      if (isNew) beep();
    }
    known = new Set([...(known || []), ...orders.map((o) => o.id)]);
    render();
  }

  async function poll() {
    try {
      apply(await api("/kitchen/orders"));
      $("#net").hidden = true;
    } catch (x) {
      if (x.status === 401) { pin = ""; sessionStorage.removeItem("tezas-kitchen-pin"); location.reload(); return; }
      $("#net").hidden = false;
    }
    schedule();
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(poll, 4000); }

  // ---------- Отрисовка ----------
  function mins(o) {
    const from = Date.parse(o.paid_at || o.created_at);
    return Math.max(0, Math.floor((Date.now() + skew - from) / 60000));
  }

  function card(o) {
    const m = mins(o);
    const late = o.status !== "ready" && o.status !== "awaiting_payment" && m >= 15;
    const items = o.items.map((it) => {
      const sub = [it.size, it.note_ru].filter(Boolean).join(", ");
      return `<li><b>${it.qty}×</b> ${esc((it.combo ? "Комбо: " : "") + it.ru)}${sub ? ` <small>${esc(sub)}</small>` : ""}${it.combo ? '<small class="combo">+ фри + Pepsi 0,4 л</small>' : ""}</li>`;
    }).join("");
    const acts = (ACTIONS[o.status] || []).map(([to, label, cls]) =>
      `<button type="button" class="act ${cls}" data-id="${o.id}" data-to="${to}">${label}</button>`).join("");
    return `<article class="card ${late ? "late" : ""}" data-card="${o.id}">
      <header>
        <p class="num">№${o.number}</p>
        <p class="where ${o.mode}">${o.mode === "table" ? `Столик ${o.table_no}` : "Навынос"}</p>
        <p class="age">${m} мин</p>
      </header>
      <ul class="items">${items}</ul>
      ${o.gift ? '<p class="gift">+ Лимонад 0,4 л в подарок</p>' : ""}
      <p class="meta">${money(o.total)} · ${({ kaspi: "Kaspi", homebank: "Homebank", halyk: "Карта" })[o.provider] || o.provider}</p>
      <div class="acts">${acts}</div>
    </article>`;
  }

  function render() {
    $("#cols").innerHTML = COLS.map((c) => {
      const list = orders.filter(c.match);
      if (c.key === "kaspi" && !list.length) return "";
      return `<section class="col col--${c.key}">
        <h2>${c.title} <span>${list.length}</span></h2>
        ${list.length ? list.map(card).join("") : '<p class="empty">Пусто</p>'}
      </section>`;
    }).join("");
  }

  // ---------- Действия ----------
  let undo = null;
  async function move(id, to, from) {
    const o = orders.find((x) => x.id === id);
    if (to === "cancelled" && (!o || !confirm(`Отменить заказ №${o.number}?`))) return;
    try {
      const { order } = await api(`/kitchen/orders/${id}`, { method: "POST", body: JSON.stringify({ status: to }) });
      orders = orders.map((x) => (x.id === id ? order : x)).filter((x) => x.status !== "done" && x.status !== "cancelled");
      render();
      const back = { cooking: "paid", ready: "cooking", done: "ready" }[to];
      toast(`№${order.number} → ${NAMES[to]}`, back && !from ? () => move(id, back, true) : null);
    } catch (x) {
      toast(x.message === "bad_transition" || x.message === "conflict" ? "Статус уже изменился — обновляем" : "Не получилось. Нет связи?");
      poll();
    }
  }

  function toast(text, onUndo) {
    const el = $("#toast");
    clearTimeout(undo);
    el.innerHTML = `<span>${esc(text)}</span>${onUndo ? '<button type="button" id="undoBtn">Вернуть</button>' : ""}`;
    el.hidden = false;
    if (onUndo) $("#undoBtn").onclick = () => { el.hidden = true; onUndo(); };
    undo = setTimeout(() => (el.hidden = true), 5000);
  }

  // ---------- События ----------
  $("#pinForm").addEventListener("submit", login);
  $("#cols").addEventListener("click", (e) => {
    const b = e.target.closest(".act");
    if (b) move(b.dataset.id, b.dataset.to);
  });
  $("#logout").addEventListener("click", () => { sessionStorage.removeItem("tezas-kitchen-pin"); location.reload(); });
  const soundBtn = $("#soundBtn");
  const syncSound = () => { soundBtn.textContent = `Звук: ${sound ? "вкл" : "выкл"}`; soundBtn.setAttribute("aria-pressed", String(sound)); };
  soundBtn.addEventListener("click", () => { sound = !sound; localStorage.setItem("tezas-kitchen-sound", sound ? "on" : "off"); syncSound(); if (sound) beep(); });
  syncSound();
  document.addEventListener("visibilitychange", () => { if (!document.hidden && pin && !$("#board").hidden) { keepAwake(); poll(); } });
  setInterval(() => {
    $("#clock").textContent = new Date(Date.now() + skew).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Oral" });
    if (!$("#board").hidden) document.querySelectorAll("[data-card]").forEach((el) => {
      const o = orders.find((x) => x.id === el.dataset.card);
      if (o) el.querySelector(".age").textContent = `${mins(o)} мин`;
    });
  }, 15000);
  $("#clock").textContent = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Oral" });

  if (pin) login(); else $("#pin").focus();
})();
