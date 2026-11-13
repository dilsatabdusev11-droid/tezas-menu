(() => {
  const D = window.TEZAS;
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
      giftDone: "Сізге 0,4 л лимонад сыйлыққа беріледі. Кассада атап өтіңіз.",
      items: (n) => `${n} позиция`,
      tabsLabel: "Санаттар",
      remove: "Азайту",
      more: "Көбейту"
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
      giftDone: "Вам положен лимонад 0,4 л в подарок. Напомните на кассе.",
      items: (n) => `${n} ${plural(n, "позиция", "позиции", "позиций")}`,
      tabsLabel: "Категории",
      remove: "Убрать одну",
      more: "Добавить ещё"
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
          c.items.map((it) => {
            const name = it[lang], note = noteOf(it);
            return `<li class="dish">
              <div class="dish__photo"><img src="img/${it.img}.webp" alt="" loading="lazy" decoding="async" width="600" height="500"></div>
              <h3 class="dish__name">${esc(name)}</h3>${note ? `<p class="dish__note">${esc(note)}</p>` : ""}
              <div class="dish__foot"><span class="price">${money(it.price)}</span>${addBtn(it.id, name + (note ? ", " + note : ""))}</div>
            </li>`;
          }).join("") + `</ul></section>`;
      } else if (c.layout === "combo") {
        html += `<section class="cat" id="${c.id}" aria-labelledby="h-${c.id}">${title.replace("<h2", `<h2 id="h-${c.id}"`)}<ul class="combo">` +
          c.items.map((it) => `<li>
              <img src="img/${it.img}.webp" alt="" loading="lazy" decoding="async" width="600" height="480">
              <div><h3 class="dish__name">${esc(it[lang])}</h3><p class="with">${t.combo}</p></div>
              <div class="side"><span class="price">${money(it.price)}</span>${addBtn(it.id, "Комбо: " + it[lang])}</div>
            </li>`).join("") + `</ul></section>`;
      } else {
        lists += `<section class="cat" id="${c.id}" aria-labelledby="h-${c.id}">${title.replace("<h2", `<h2 id="h-${c.id}"`)}<ul class="list">` +
          c.items.map((it) => {
            const name = it[lang], note = noteOf(it);
            const right = it.variants
              ? `<div class="vars">${it.variants.map((v) => `<span class="var"><small>${v.size}</small><span class="price">${money(v.price)}</span>${addBtn(v.id, name + " " + v.size)}</span>`).join("")}</div>`
              : `<span class="price">${money(it.price)}</span>${addBtn(it.id, name + (note ? " " + note : ""))}`;
            return `<li><div class="grow"><h3 class="dish__name">${esc(name)}</h3>${note ? `<p class="dish__note">${esc(note)}</p>` : ""}</div>${right}</li>`;
          }).join("") + `</ul></section>`;
      }
    });
    $("#menu").innerHTML = html + `<div class="lists">${lists}</div>`;

    $("#tabs").innerHTML = D.categories.map((c) => `<a class="tab" href="#${c.id}" data-tab="${c.id}">${esc(c[lang])}</a>`).join("");
    $(".tabs").setAttribute("aria-label", t.tabsLabel);
    observeSections();
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

  function renderTray() {
    const t = T[lang];
    const { sum, count } = totals();
    $("#tray").hidden = count === 0;
    if (!count) { closeSheet(); return; }
    const left = D.promoThreshold - sum;
    const goal = $("#trayGoal");
    goal.textContent = left > 0 ? t.left(money(left)) : t.gift;
    goal.classList.toggle("done", left <= 0);
    $("#trayCount").textContent = t.items(count);
    $("#traySum").textContent = money(sum);
    const p = Math.min(sum / D.promoThreshold, 1);
    $("#cupFill").setAttribute("y", String(40 - 31 * p));

    $("#sheetSum").textContent = money(sum);
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
    if ($("#sheet").hidden) return;
    $("#sheet").hidden = true;
    $("#trayOpen").setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  // ---------- Активная вкладка при прокрутке ----------
  let io;
  function setActive(id) {
    $$(".tab").forEach((a) => {
      const on = a.dataset.tab === id;
      a.toggleAttribute("aria-current", false);
      if (on) {
        a.setAttribute("aria-current", "true");
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

  // ---------- События ----------
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      change(add.dataset.add, 1);
      add.classList.remove("bump"); void add.offsetWidth; add.classList.add("bump");
      return;
    }
    const inc = e.target.closest("[data-inc]"); if (inc) return change(inc.dataset.inc, 1);
    const dec = e.target.closest("[data-dec]"); if (dec) return change(dec.dataset.dec, -1);
    const l = e.target.closest("[data-lang]");
    if (l && l.dataset.lang !== lang) {
      lang = l.dataset.lang; localStorage.setItem("tezas-lang", lang);
      renderStatic(); renderMenu(); renderTray();
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
  renderTray();
})();
