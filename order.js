(() => {
  const API = window.TEZAS_API;
  const $ = (s) => document.querySelector(s);
  const money = (n) => n.toLocaleString("ru-RU").replace(/\s/g, " ") + " ₸";
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  const T = {
    kk: {
      loading: "Тапсырыс жүктелуде…",
      notFound: "Тапсырыс табылмады.",
      back: "Мәзірге оралу",
      retry: "Мәзірге оралып, қайталау",
      order: "Тапсырыс",
      table: (n) => `${n}-үстел`,
      pickup: "Алып кету",
      steps: ["Төлем", "Дайындалуда", "Дайын"],
      gift: "+ Лимонад 0,4 л — сыйлық",
      total: "Барлығы",
      paidBy: { kaspi: "Kaspi", halyk: "Карта", homebank: "Homebank" },
      openApp: "Homebank-ті ашу",
      scanHint: "Немесе бұл QR-ды Homebank қосымшасында сканерлеңіз",
      st: {
        awaiting_payment_homebank: (o) => ["Homebank-те төлеңіз", `Halyk қосымшасы ${money(o.total)} сомамен ашылады. Төлегеннен кейін осы бетке оралыңыз — тапсырыс өзі асханаға кетеді.`],
        awaiting_payment_kaspi: (o) => ["Кассада төлеңіз", `Кассаға барып, №${o.number} нөмірін айтыңыз және ${money(o.total)} соманы Kaspi QR арқылы төлеңіз. Төлемнен кейін тапсырыс асханаға жіберіледі.`],
        awaiting_payment_halyk: () => ["Төлемді тексерудеміз…", "Бірнеше секунд күтіңіз."],
        failed: () => ["Төлем өтпеді", "Ақша есептен шығарылмады. Мәзірге оралып, қайталап көріңіз."],
        cancelled: () => ["Тапсырыс жойылды", "Ақша есептен шығарылған болса, кассаға жүгініңіз."],
        paid: () => ["Төленді!", "Тапсырыс асханаға жіберілді."],
        cooking: () => ["Дайындап жатырмыз", "Тапсырысыңыз дайындалуда."],
        ready_table: (o) => ["Дайын!", `Жақын арада ${o.table_no}-үстелге әкелеміз.`],
        ready_pickup: (o) => ["Дайын!", `Беру орнынан №${o.number} тапсырысты алыңыз.`],
        done: () => ["Ас болсын!", "TEZAS-ты таңдағаныңызға рақмет."]
      }
    },
    ru: {
      loading: "Загружаем заказ…",
      notFound: "Заказ не найден.",
      back: "Вернуться в меню",
      retry: "Вернуться в меню и попробовать снова",
      order: "Заказ",
      table: (n) => `Столик ${n}`,
      pickup: "Навынос",
      steps: ["Оплата", "Готовится", "Готово"],
      gift: "+ Лимонад 0,4 л в подарок",
      total: "Итого",
      paidBy: { kaspi: "Kaspi", halyk: "Карта", homebank: "Homebank" },
      openApp: "Открыть Homebank",
      scanHint: "Или отсканируйте этот QR в приложении Homebank",
      st: {
        awaiting_payment_homebank: (o) => ["Оплатите в Homebank", `Приложение Halyk откроется уже с суммой ${money(o.total)}. После оплаты вернитесь на эту страницу — заказ сам уйдёт на кухню.`],
        awaiting_payment_kaspi: (o) => ["Оплатите на кассе", `Подойдите к кассе, назовите номер ${o.number} и оплатите ${money(o.total)} по Kaspi QR. После оплаты заказ уйдёт на кухню.`],
        awaiting_payment_halyk: () => ["Проверяем оплату…", "Подождите несколько секунд."],
        failed: () => ["Оплата не прошла", "Деньги не списаны. Вернитесь в меню и попробуйте ещё раз."],
        cancelled: () => ["Заказ отменён", "Если деньги списались, обратитесь на кассу."],
        paid: () => ["Оплачено!", "Заказ передан на кухню."],
        cooking: () => ["Готовим", "Ваш заказ уже на кухне."],
        ready_table: (o) => ["Готово!", `Скоро принесём к столику ${o.table_no}.`],
        ready_pickup: (o) => ["Готово!", `Заберите заказ №${o.number} на выдаче.`],
        done: () => ["Приятного аппетита!", "Спасибо, что выбрали TEZAS."]
      }
    }
  };

  let lang = localStorage.getItem("tezas-lang") || "ru";
  const id = new URLSearchParams(location.search).get("id") || "";
  let order = null;
  let lastStatus = null;
  let timer = null;

  const STEP = { awaiting_payment: 0, paid: 1, cooking: 1, ready: 2, done: 3 };
  const FINAL = ["done", "cancelled", "failed"];

  function statusText(o) {
    const st = T[lang].st;
    if (o.status === "awaiting_payment") return st[`awaiting_payment_${o.provider}`](o);
    if (o.status === "ready") return st[o.mode === "table" ? "ready_table" : "ready_pickup"](o);
    return (st[o.status] || st.paid)(o);
  }

  function render() {
    const t = T[lang];
    document.documentElement.lang = lang;
    document.querySelectorAll(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    if (!order) return;
    const o = order;
    const [title, text] = statusText(o);
    const step = STEP[o.status];
    const bad = o.status === "failed" || o.status === "cancelled";
    const steps = t.steps.map((name, i) => {
      const cls = bad ? "" : i < step ? "done" : i === step ? "now" : "";
      return `<li class="${cls}"><span>${i + 1}</span>${esc(name)}</li>`;
    }).join("");
    const items = o.items.map((it) => {
      const sub = [it.size, it[`note_${lang}`]].filter(Boolean).join(", ");
      const name = (it.combo ? "Комбо: " : "") + it[lang];
      return `<li><span class="q">${it.qty}×</span><span class="n">${esc(name)}${sub ? `<small>${esc(sub)}</small>` : ""}</span><span class="p">${money(it.price * it.qty)}</span></li>`;
    }).join("");

    $("#ticket").innerHTML = `
      <section class="ticket__head ${esc(o.status)}">
        <p class="ticket__label">${esc(t.order)}</p>
        <p class="ticket__num">№${o.number}</p>
        <p class="ticket__where">${esc(o.mode === "table" ? t.table(o.table_no) : t.pickup)}</p>
      </section>
      ${bad ? "" : `<ol class="steps">${steps}</ol>`}
      <section class="state ${esc(o.status)}">
        ${o.status === "awaiting_payment" && o.provider === "halyk" ? '<span class="spinner" aria-hidden="true"></span>' : ""}
        <h1>${esc(title)}</h1>
        <p>${esc(text)}</p>
        ${bad ? `<a class="cta cta--link" href="./">${esc(t.retry)}</a>` : ""}
        ${o.pay ? `<a class="cta cta--link cta--app" href="${esc(o.pay.link)}">${esc(t.openApp)}</a>
          <div class="qrbox"><div class="qr" id="payQr"></div><p>${esc(t.scanHint)}</p></div>` : ""}
      </section>
      <ul class="lines">${items}</ul>
      ${o.gift ? `<p class="giftline">${esc(t.gift)}</p>` : ""}
      <p class="sumline"><span>${esc(t.total)}</span><strong>${money(o.total)}</strong></p>
      <p class="paidby">${esc(t.paidBy[o.provider] || "")}</p>
      <a class="backlink" href="./">${esc(t.back)}</a>`;
    drawQr(o);
  }

  function drawQr(o) {
    const box = document.getElementById("payQr");
    if (!box || !o.pay || !window.qrcode) return;
    const q = window.qrcode(0, "M");
    q.addData(o.pay.qrcode);
    q.make();
    box.innerHTML = q.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
  }

  // Пришли с оформления заказа на телефоне — сразу открываем приложение Homebank (один раз)
  let autoOpened = false;
  function maybeOpenApp(o) {
    const qs = new URLSearchParams(location.search);
    if (autoOpened || !qs.has("open") || !o.pay || o.status !== "awaiting_payment") return;
    autoOpened = true;
    qs.delete("open");
    history.replaceState(null, "", `${location.pathname}?${qs}`);
    if (matchMedia("(pointer: coarse)").matches) location.href = o.pay.link;
  }

  function celebrate(kind) {
    if (navigator.vibrate) navigator.vibrate(kind === "ready" ? [30, 60, 30, 60, 30] : 20);
    if (reduced()) return;
    const head = $(".ticket__head");
    head && head.animate([{ transform: "scale(1)" }, { transform: "scale(1.06) rotate(-1deg)" }, { transform: "scale(1)" }],
      { duration: 600, easing: "cubic-bezier(.34, 1.56, .64, 1)" });
  }

  async function load() {
    clearTimeout(timer);
    try {
      const r = await fetch(`${API}/orders/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (r.status === 404) { $("#ticket").innerHTML = `<p class="ticket__loading">${esc(T[lang].notFound)}</p><a class="backlink" href="./">${esc(T[lang].back)}</a>`; return; }
      const res = await r.json();
      order = res.order;
      if (lastStatus && lastStatus !== order.status) celebrate(order.status);
      // Оплачено — список в меню больше не нужен
      if (["paid", "cooking", "ready", "done"].includes(order.status)) {
        const key = `tezas-cleared-${order.id}`;
        if (!localStorage.getItem(key)) { localStorage.removeItem("tezas-cart"); localStorage.setItem(key, "1"); }
      }
      lastStatus = order.status;
      render();
      maybeOpenApp(order);
    } catch { /* нет связи — повторим */ }
    const fast = order && order.provider === "homebank" && order.status === "awaiting_payment";
    if (!order || !FINAL.includes(order.status)) timer = setTimeout(load, document.hidden ? 15000 : fast ? 3000 : 4000);
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lang]");
    if (b && b.dataset.lang !== lang) { lang = b.dataset.lang; localStorage.setItem("tezas-lang", lang); render(); }
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && order && !FINAL.includes(order.status)) load(); });

  $("#loading").textContent = T[lang].loading;
  render();
  load();
})();
