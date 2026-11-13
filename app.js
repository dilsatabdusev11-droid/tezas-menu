(async () => {
  let D;
  try {
    D = await (await fetch("menu.json", { cache: "no-cache" })).json();
  } catch {
    document.getElementById("menu").innerHTML =
      '<p class="loadfail">Мәзір жүктелмеді. Бетті жаңартыңыз.<br>Меню не загрузилось. Обновите страницу.</p>';
    return;
  }
  const API = window.TEZAS_API;
  const T = {
    kk: {
      slogan: "Қайта-қайта татқың келетін дәм!",
      promo: "2 500 ₸ және одан жоғары тапсырысқа 0,4 л лимонад сыйлыққа беріледі",
      note: "Бағалар теңгемен көрсетілген.",
      add: "Қосу",
      combo: "+ фри + Pepsi 0,4 л",
      listTitle: "Менің тізімім",
      total: "Барлығы",
      clear: "Тізімді тазалау",
      close: "Жабу",
      showCashier: "Бұл тапсырыс емес. Тізімді кассада көрсетіңіз.",
      left: (n) => `Лимонадқа дейін тағы ${n}`,
      gift: "Лимонад 0,4 л — сыйлыққа!",
      giftPending: (n) => `Тағы ${n} қосыңыз — 0,4 л лимонад сыйлыққа беріледі.`,
      giftDone: "0,4 л лимонад тапсырысқа сыйлық ретінде қосылады.",
      items: (n) => `${n} позиция`,
      tabsLabel: "Санаттар",
      remove: "Азайту",
      more: "Көбейту",
      whereEat: "Қайда жейсіз?",
      atTable: "Үстел басында",
      takeaway: "Алып кету",
      tableNo: "Үстел нөмірі",
      payment: "Төлем",
      kaspiSub: "Кассада Kaspi QR арқылы",
      cardOnline: "Кез келген банк картасы",
      cardSub: "Visa, Mastercard, Apple Pay, Google Pay",
      homebankSub: "Halyk қосымшасы сомамен бірге ашылады",
      payApp: (n) => `Homebank-те ${n} төлеу`,
      testMode: "Тест режимі: ақша есептен шығарылмайды.",
      payCard: (n) => `${n} төлеу`,
      sendKaspi: "Тапсырыс беру",
      sending: "Жіберілуде…",
      needTable: "Үстел нөмірін енгізіңіз (1–200).",
      errNet: "Байланыс жоқ. Қайталап көріңіз.",
      errGeneric: "Тапсырыс жіберілмеді. Қайталап көріңіз.",
      errHalyk: "Төлем беті ашылмады. Kaspi-ді таңдаңыз немесе кейінірек қайталаңыз.",
      myOrder: (n) => `Тапсырыс №${n}`,
      st: { awaiting_payment: "төлем күтілуде", paid: "қабылданды", cooking: "дайындалуда", ready: "дайын!" }
    },
    ru: {
      slogan: "Вкус, который хочется повторить!",
      promo: "При заказе от 2 500 ₸ — лимонад 0,4 л в подарок",
      note: "Цены указаны в тенге.",
      add: "Добавить",
      combo: "+ фри + Pepsi 0,4 л",
      listTitle: "Мой список",
      total: "Итого",
      clear: "Очистить список",
      close: "Закрыть",
      showCashier: "Это не заказ. Покажите список на кассе.",
      left: (n) => `Ещё ${n} до лимонада в подарок`,
      gift: "Лимонад 0,4 л — в подарок!",
      giftPending: (n) => `Добавьте ещё на ${n} — и лимонад 0,4 л в подарок.`,
      giftDone: "Лимонад 0,4 л добавим к заказу в подарок.",
      items: (n) => `${n} ${plural(n, "позиция", "позиции", "позиций")}`,
      tabsLabel: "Категории",
      remove: "Убрать одну",
      more: "Добавить ещё",
      whereEat: "Где будете есть?",
      atTable: "За столиком",
      takeaway: "Навынос",
      tableNo: "Номер столика",
      payment: "Оплата",
      kaspiSub: "На кассе по Kaspi QR",
      cardOnline: "Картой любого банка",
      cardSub: "Visa, Mastercard, Apple Pay, Google Pay",
      homebankSub: "Откроется приложение Halyk с суммой",
      payApp: (n) => `Оплатить ${n} в Homebank`,
      testMode: "Тестовый режим: деньги не списываются.",
      payCard: (n) => `Оплатить ${n}`,
      sendKaspi: "Оформить заказ",
      sending: "Отправляем…",
      needTable: "Укажите номер столика (1–200).",
      errNet: "Нет связи. Попробуйте ещё раз.",
      errGeneric: "Не удалось оформить заказ. Попробуйте ещё раз.",
      errHalyk: "Страница оплаты не открылась. Выберите Kaspi или попробуйте позже.",
      myOrder: (n) => `Заказ №${n}`,
      st: { awaiting_payment: "ждёт оплаты", paid: "принят", cooking: "готовится", ready: "готов!" }
    }
  };
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = (n) => n.toLocaleString("ru-RU").replace(/\s/g, " ") + " ₸";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const plusIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

  // Все позиции, которые можно добавить (варианты — отдельно)
  const sku = {};
  D.categories.forEach((c) => c.items.forEach((it) => {
    if (it.variants) it.variants.forEach((v) => (sku[v.id] = { item: it, cat: c, size: v.size, price: v.price }));
    else sku[it.id] = { item: it, cat: c, price: it.price };
  }));

  // ---------- Язык ----------
  let lang = localStorage.getItem("tezas-lang") ||
    ((navigator.language || "").toLowerCase().startsWith("kk") ? "kk" : "ru");

  // ---------- Список (сохраняется на устройстве) ----------
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem("tezas-cart") || "{}"); } catch { cart = {}; }
  Object.keys(cart).forEach((k) => { if (!sku[k] || !(cart[k] > 0)) delete cart[k]; });
  const save = () => localStorage.setItem("tezas-cart", JSON.stringify(cart));

  // ---------- Столик из QR-кода: ?table=5 ----------
  const qs = new URLSearchParams(location.search);
  const tableFromUrl = parseInt(qs.get("table") || qs.get("t") || "", 10);
  if (tableFromUrl >= 1 && tableFromUrl <= 200) sessionStorage.setItem("tezas-table", String(tableFromUrl));

  let orders = [];
  try { orders = JSON.parse(localStorage.getItem("tezas-orders") || "[]"); } catch { orders = []; }

  // ---------- Рендер ----------
  function addBtn(id, label) {
    const n = cart[id];
    return `<button type="button" class="add" data-add="${id}" aria-label="${esc(T[lang].add)}: ${esc(label)}"${n ? ` data-count="${n}"` : ""}>${plusIcon}</button>`;
  }
  function noteOf(it) { return it.note ? it.note[lang] : ""; }

  function renderMenu() {
    const t = T[lang];
    let html = "";
    let lists = "";
    D.categories.forEach((c) => {
      const title = `<h2 class="cat__title">${esc(c[lang])}</h2>`;
      if (c.layout === "grid") {
        html += `<section class="cat" id="${c.id}" aria-labelledby="h-${c.id}">${title.replace("<h2", `<h2 id="h-${c.id}"`)}<ul class="grid">` +
          c.items.map((it, i) => {
            const name = it[lang], note = noteOf(it);
            return `<li class="dish reveal" style="--i:${i % 4}">
              <div class="dish__photo"><img src="img/${it.img}.webp" alt="" loading="lazy" decoding="async" width="600" height="500"></div>
              <h3 class="dish__name">${esc(name)}</h3>${note ? `<p class="dish__note">${esc(note)}</p>` : ""}
              <div class="dish__foot"><span class="price">${money(it.price)}</span>${addBtn(it.id, name + (note ? ", " + note : ""))}</div>
            </li>`;
          }).join("") + `</ul></section>`;
      } else if (c.layout === "combo") {
        html += `<section class="cat" id="${c.id}" aria-labelledby="h-${c.id}">${title.replace("<h2", `<h2 id="h-${c.id}"`)}<ul class="combo">` +
          c.items.map((it, i) => `<li class="reveal" style="--i:${i % 4}">
              <img src="img/${it.img}.webp" alt="" loading="lazy" decoding="async" width="600" height="480">
              <div><h3 class="dish__name">${esc(it[lang])}</h3><p class="with">${t.combo}</p></div>
              <div class="side"><span class="price">${money(it.price)}</span>${addBtn(it.id, "Комбо: " + it[lang])}</div>
            </li>`).join("") + `</ul></section>`;
      } else {
        lists += `<section class="cat" id="${c.id}" aria-labelledby="h-${c.id}">${title.replace("<h2", `<h2 id="h-${c.id}"`)}<ul class="list">` +
          c.items.map((it, i) => {
            const name = it[lang], note = noteOf(it);
            const right = it.variants
              ? `<div class="vars">${it.variants.map((v) => `<span class="var"><small>${v.size}</small><span class="price">${money(v.price)}</span>${addBtn(v.id, name + " " + v.size)}</span>`).join("")}</div>`
              : `<span class="price">${money(it.price)}</span>${addBtn(it.id, name + (note ? " " + note : ""))}`;
            return `<li class="reveal" style="--i:${i % 6}"><div class="grow"><h3 class="dish__name">${esc(name)}</h3>${note ? `<p class="dish__note">${esc(note)}</p>` : ""}</div>${right}</li>`;
          }).join("") + `</ul></section>`;
      }
    });
    $("#menu").innerHTML = html + `<div class="lists">${lists}</div>`;

    $("#tabs").innerHTML = `<span class="tabs__pill" aria-hidden="true"></span>` +
      D.categories.map((c) => `<a class="tab" href="#${c.id}" data-tab="${c.id}">${esc(c[lang])}</a>`).join("");
    $(".tabs").setAttribute("aria-label", t.tabsLabel);
    observeSections();
    observeReveal();
  }

  function renderStatic() {
    const t = T[lang];
    document.documentElement.lang = lang;
    $$("[data-t]").forEach((el) => (el.textContent = t[el.dataset.t]));
    $$("[data-t-label]").forEach((el) => el.setAttribute("aria-label", t[el.dataset.tLabel]));
    $$(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    $("#addr").textContent = D.address[lang];
    $("#gis").href = D.gis;
    $("#ig").href = "https://instagram.com/" + D.instagram;
  }

  // ---------- Подсчёт ----------
  const totals = () => Object.entries(cart).reduce((a, [id, n]) => ({ sum: a.sum + sku[id].price * n, count: a.count + n }), { sum: 0, count: 0 });

  let prevSum = 0;
  let pendingGift = false;
  function renderTray() {
    const t = T[lang];
    const { sum, count } = totals();
    $("#tray").hidden = count === 0;
    if (!count) { prevSum = 0; closeSheet(); return; }
    const left = D.promoThreshold - sum;
    const goal = $("#trayGoal");
    goal.textContent = left > 0 ? t.left(money(left)) : t.gift;
    goal.classList.toggle("done", left <= 0);
    $("#trayCount").textContent = t.items(count);
    const sumEl = $("#traySum");
    if (sumEl.textContent && sumEl.textContent !== money(sum)) pop(sumEl);
    sumEl.textContent = money(sum);
    if (prevSum < D.promoThreshold && sum >= D.promoThreshold) {
      // салют — в момент, когда блюдо долетит до стаканчика; без полёта — сразу
      pendingGift = true;
      setTimeout(() => { if (pendingGift) { pendingGift = false; celebrate(); } }, 900);
    }
    prevSum = sum;
    const p = Math.min(sum / D.promoThreshold, 1);
    $("#cupFill").setAttribute("y", String(40 - 31 * p));

    $("#sheetSum").textContent = money(sum);
    updateCheckout();
    const gift = $("#sheetGift");
    gift.textContent = left > 0 ? t.giftPending(money(left)) : t.giftDone;
    gift.classList.toggle("pending", left > 0);
    $("#sheetList").innerHTML = Object.entries(cart).map(([id, n]) => {
      const s = sku[id];
      const name = (s.cat.id === "combo" ? "Комбо: " : "") + s.item[lang];
      const sub = [s.size, noteOf(s.item)].filter(Boolean).join(", ");
      return `<li>
        <span class="nm">${esc(name)}${sub ? `<small>${esc(sub)}</small>` : ""}</span>
        <span class="lt">${money(s.price * n)}</span>
        <span class="qty">
          <button type="button" data-dec="${id}" aria-label="${esc(t.remove)}: ${esc(name)}">−</button>
          <output aria-live="polite">${n}</output>
          <button type="button" data-inc="${id}" aria-label="${esc(t.more)}: ${esc(name)}">+</button>
        </span>
      </li>`;
    }).join("");
  }

  function syncButtons() {
    $$("[data-add]").forEach((b) => {
      const n = cart[b.dataset.add];
      n ? b.setAttribute("data-count", n) : b.removeAttribute("data-count");
    });
  }

  function change(id, d) {
    cart[id] = (cart[id] || 0) + d;
    if (cart[id] <= 0) delete cart[id];
    save(); syncButtons(); renderTray();
  }

  // ---------- Шторка ----------
  let lastFocus = null;
  function openSheet() {
    lastFocus = document.activeElement;
    $("#sheet").hidden = false;
    $("#trayOpen").setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    $("#sheet [data-close].icon-btn").focus();
  }
  function closeSheet() {
    const sh = $("#sheet");
    if (sh.hidden || sh.classList.contains("closing")) return;
    const done = () => {
      sh.classList.toggle("closing", false);
      sh.hidden = true;
      $("#trayOpen").setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    };
    if (reduced()) return done();
    sh.classList.add("closing");
    setTimeout(done, 190);
  }

  // ---------- Активная вкладка при прокрутке ----------
  let io;
  function setActive(id) {
    $$(".tab").forEach((a) => {
      const on = a.dataset.tab === id;
      a.toggleAttribute("aria-current", false);
      if (on) {
        a.setAttribute("aria-current", "true");
        movePill(a);
        const track = $("#tabs");
        const x = a.offsetLeft - track.clientWidth / 2 + a.clientWidth / 2;
        track.scrollTo({ left: x, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
    });
  }
  function observeSections() {
    io && io.disconnect();
    const visible = new Map();
    io = new IntersectionObserver((entries) => {
      entries.forEach((e) => visible.set(e.target.id, e.isIntersecting));
      const first = D.categories.find((c) => visible.get(c.id));
      if (first) setActive(first.id);
    }, { rootMargin: "-80px 0px -55% 0px" });
    D.categories.forEach((c) => io.observe(document.getElementById(c.id)));
  }

  // ---------- Оформление заказа ----------
  let config = { halyk: "test" };
  let sending = false;
  const form = $("#checkout");
  const fieldVal = (name) => (form.querySelector(`[name="${name}"]:checked`) || {}).value;

  function updateCheckout() {
    const t = T[lang];
    const { sum } = totals();
    const mode = fieldVal("mode"), provider = fieldVal("provider");
    $("#tableField").hidden = mode !== "table";
    $("#testMode").hidden = !(provider !== "kaspi" && config.halyk === "test");
    $("#submitLabel").textContent = sending ? t.sending
      : provider === "halyk" ? t.payCard(money(sum))
      : provider === "homebank" ? t.payApp(money(sum))
      : t.sendKaspi;
    $("#submitOrder").disabled = sending;
    form.classList.toggle("busy", sending);
  }

  function showError(msg) {
    const el = $("#checkoutError");
    el.textContent = msg || "";
    if (msg && !reduced()) el.animate([{ transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "none" }], { duration: 260 });
  }

  function loadScript(src) {
    return new Promise((ok, bad) => {
      const sc = document.createElement("script");
      sc.src = src; sc.onload = ok; sc.onerror = bad;
      document.head.appendChild(sc);
    });
  }

  function rememberOrder(o) {
    orders = [{ id: o.id, number: o.number, at: Date.now() }, ...orders.filter((x) => x.id !== o.id)].slice(0, 5);
    localStorage.setItem("tezas-orders", JSON.stringify(orders));
  }

  async function submitOrder(e) {
    e.preventDefault();
    if (sending) return;
    const t = T[lang];
    showError("");
    const mode = fieldVal("mode"), provider = fieldVal("provider");
    const table = parseInt($("#tableNo").value, 10);
    if (mode === "table" && !(table >= 1 && table <= 200)) { showError(t.needTable); $("#tableNo").focus(); return; }
    sessionStorage.setItem("tezas-table", mode === "table" ? String(table) : sessionStorage.getItem("tezas-table") || "");

    sending = true; updateCheckout();
    try {
      const r = await fetch(`${API}/orders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode, provider, lang, table: mode === "table" ? table : null,
          items: Object.entries(cart).map(([id, qty]) => ({ id, qty }))
        })
      });
      const res = await r.json().catch(() => ({}));
      if (!r.ok || !res.order) throw new Error(res.error || "http_" + r.status);
      rememberOrder(res.order);
      if (res.payment && res.payment.type === "homebank") {
        // Страница заказа сама откроет приложение Homebank и покажет QR для компьютера
        location.href = `order.html?id=${res.order.id}&open=1`;
        return;
      }
      if (res.payment && res.payment.type === "halyk") {
        try {
          await loadScript(res.payment.script);
          window.halyk.pay(res.payment.paymentObject);
        } catch {
          showError(t.errHalyk);
          sending = false; updateCheckout();
        }
        return;
      }
      location.href = `order.html?id=${res.order.id}`;
    } catch (err) {
      showError(err instanceof TypeError ? t.errNet : /^(halyk|homebank)_unavailable$/.test(err.message) ? t.errHalyk : t.errGeneric);
      sending = false; updateCheckout();
    }
  }

  form.addEventListener("change", () => { showError(""); updateCheckout(); });
  form.addEventListener("submit", submitOrder);
  $("#tableNo").value = sessionStorage.getItem("tezas-table") || "";
  $("#tableNo").addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 3); });
  // Вернулись с платёжной страницы кнопкой «назад» — снять блокировку
  addEventListener("pageshow", () => { sending = false; updateCheckout(); });

  // Заказ с сайта включается, только когда кухня готова (задан PIN экрана кухни).
  // Оплата картой видна гостям только в боевом режиме Halyk; тест — по ссылке с ?test=1.
  const testFlag = qs.has("test");
  fetch(`${API}/config`).then((r) => r.json()).then((c) => {
    config = c;
    const ordering = Boolean(c.kitchen) || testFlag;
    form.hidden = !ordering;
    $("#cashierHint").hidden = ordering;
    const online = c.halyk === "prod" || testFlag;
    $$("[data-online]").forEach((el) => (el.hidden = !online));
    form.querySelector(".pay").classList.toggle("single", !online);
    updateCheckout();
  }).catch(() => {});

  // Плашка «Заказ №12 — готовится» для последнего заказа за 3 часа
  async function showMyOrder() {
    const last = orders.find((o) => Date.now() - o.at < 3 * 3600_000);
    const chip = $("#myOrder");
    if (!last) { chip.hidden = true; return; }
    try {
      const r = await fetch(`${API}/orders/${last.id}`);
      if (!r.ok) return;
      const { order } = await r.json();
      const st = T[lang].st[order.status];
      if (!st) { chip.hidden = true; return; }
      chip.href = `order.html?id=${order.id}`;
      chip.innerHTML = `<b>${esc(T[lang].myOrder(order.number))}</b><span>${esc(st)}</span>`;
      chip.classList.toggle("ready", order.status === "ready");
      chip.hidden = false;
    } catch { /* нет связи — просто не показываем */ }
  }

  // ---------- Анимации ----------
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPRING = "cubic-bezier(.34, 1.56, .64, 1)";
  const detach = (el) => el.parentNode && el.parentNode.removeChild(el);

  function pop(el) {
    if (reduced() || !el) return;
    el.animate([{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(1)" }],
      { duration: 360, easing: SPRING });
  }
  function popQty(id) {
    const b = document.querySelector(`[data-inc="${id}"]`);
    if (b) pop(b.parentElement.querySelector("output"));
  }

  // Блюда «приземляются» на бумагу, когда доходят до экрана
  let revealIO;
  let revealAll = false;
  function observeReveal() {
    revealIO && revealIO.disconnect();
    const items = $$(".reveal, .cat__title");
    if (reduced() || revealAll || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in", "settled"));
      return;
    }
    revealIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        revealIO.unobserve(e.target);
        setTimeout(() => e.target.classList.add("settled"), 1400);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    items.forEach((el) => revealIO.observe(el));
  }

  function movePill(tab) {
    const pill = $(".tabs__pill");
    if (!pill) return;
    pill.style.width = tab.offsetWidth + "px";
    pill.style.transform = `translateX(${tab.offsetLeft}px)`;
    pill.classList.add("on");
  }

  // Фото блюда летит по дуге в полоску с суммой
  function flyToTray(btn, firstAdd) {
    if (reduced()) return;
    const card = btn.closest("li");
    const img = card && card.querySelector("img");
    const run = () => {
      const target = $(".tray__cup").getBoundingClientRect();
      const from = (img || btn).getBoundingClientRect();
      const w = img ? Math.min(from.width, 150) : 40;
      const h = img ? w * 0.8 : 40;
      const ghost = img ? img.cloneNode() : document.createElement("span");
      ghost.className = img ? "fly" : "fly fly--dot";
      if (!img) ghost.textContent = "+1";
      ghost.removeAttribute && ghost.removeAttribute("loading");
      Object.assign(ghost.style, {
        width: w + "px", height: h + "px",
        left: from.left + from.width / 2 - w / 2 + "px",
        top: from.top + from.height / 2 - h / 2 + "px"
      });
      document.body.appendChild(ghost);
      const dx = target.left + target.width / 2 - (from.left + from.width / 2);
      const dy = target.top + target.height / 2 - (from.top + from.height / 2);
      const lift = Math.min(160, Math.abs(dy) * 0.3 + 70);
      const a = ghost.animate([
        { transform: "translate(0,0) scale(1) rotate(0)", opacity: 1 },
        { transform: `translate(${dx * 0.4}px, ${dy * 0.2 - lift}px) scale(.8) rotate(-14deg)`, opacity: 1, offset: 0.42 },
        { transform: `translate(${dx}px, ${dy}px) scale(.12) rotate(-32deg)`, opacity: 0.5 }
      ], { duration: 660, easing: "cubic-bezier(.45, 0, .2, 1)" });
      a.onfinish = () => {
        detach(ghost);
        if (pendingGift) { pendingGift = false; celebrate(); }
        $(".tray__bar").animate([{ transform: "scale(1)" }, { transform: "scale(1.04)" }, { transform: "scale(1)" }],
          { duration: 320, easing: SPRING });
        $(".tray__cup").animate([{ transform: "rotate(0)" }, { transform: "rotate(-14deg)" }, { transform: "rotate(9deg)" }, { transform: "rotate(0)" }],
          { duration: 480, easing: "ease-out" });
      };
    };
    // первая позиция: дождаться, пока полоска выедет снизу
    firstAdd ? setTimeout(run, 260) : run();
  }

  // Набрали на подарок: салют из лимонадных брызг
  function celebrate() {
    if (navigator.vibrate) navigator.vibrate([16, 40, 16]);
    if (reduced()) return;
    const r = $(".tray__cup").getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const colors = ["#ffc20e", "#e2231a", "#ffffff", "#ffc20e", "#000000"];
    for (let k = 0; k < 26; k++) {
      const sp = document.createElement("i");
      sp.className = "spark";
      sp.style.background = colors[k % colors.length];
      sp.style.left = cx + "px"; sp.style.top = cy + "px";
      if (k % 3 === 0) sp.style.borderRadius = "50%";
      document.body.appendChild(sp);
      const ang = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 1.25;
      const dist = 70 + Math.random() * 120;
      const x = Math.cos(ang) * dist, y = Math.sin(ang) * dist;
      sp.animate([
        { transform: "translate(-50%,-50%) scale(1) rotate(0)", opacity: 1 },
        { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(calc(-50% + ${x * 1.1}px), calc(-50% + ${y + 90}px)) scale(.4) rotate(${Math.random() * 720}deg)`, opacity: 0 }
      ], { duration: 950 + Math.random() * 400, easing: "cubic-bezier(.15, .7, .3, 1)" }).onfinish = () => detach(sp);
    }
    $("#trayGoal").animate([{ transform: "scale(1)" }, { transform: "scale(1.12) rotate(-2deg)" }, { transform: "scale(1)" }],
      { duration: 520, easing: SPRING });
  }

  // ---------- События ----------
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      const first = totals().count === 0;
      change(add.dataset.add, 1);
      add.classList.toggle("bump", false); void add.offsetWidth; add.classList.add("bump");
      if (navigator.vibrate) navigator.vibrate(8);
      flyToTray(add, first);
      return;
    }
    const inc = e.target.closest("[data-inc]"); if (inc) { change(inc.dataset.inc, 1); return popQty(inc.dataset.inc); }
    const dec = e.target.closest("[data-dec]"); if (dec) { change(dec.dataset.dec, -1); return popQty(dec.dataset.dec); }
    const l = e.target.closest("[data-lang]");
    if (l && l.dataset.lang !== lang) {
      lang = l.dataset.lang; localStorage.setItem("tezas-lang", lang);
      revealAll = true;
      renderStatic(); renderMenu(); renderTray(); showMyOrder();
      return;
    }
    if (e.target.closest("#trayOpen")) return openSheet();
    if (e.target.closest("[data-close]")) return closeSheet();
    if (e.target.closest("#clearAll")) { cart = {}; save(); syncButtons(); renderTray(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
    if (e.key === "Tab" && !$("#sheet").hidden) {
      const f = $$("#sheet button").filter((b) => b.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  renderStatic();
  renderMenu();
  prevSum = totals().sum;
  renderTray();
  showMyOrder();
  addEventListener("resize", () => { const a = $('.tab[aria-current="true"]'); a && movePill(a); });
})();
