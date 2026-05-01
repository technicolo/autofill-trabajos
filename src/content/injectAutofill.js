// contenido de página: se inyecta via chrome.scripting.executeScript
export async function injectAutofill(payload) {
  const mode = payload?.mode || "fill";

  if (mode === "clearPreview") {
    document.querySelectorAll('[data-autofill-preview="1"]').forEach((el) => {
      try { el.style.outline = ""; el.removeAttribute("data-autofill-preview"); } catch {}
    });
    return 0;
  }

  if (mode === "clear") {
    document.querySelectorAll("input, textarea, select").forEach((el) => {
      if (el.type === "checkbox" || el.type === "radio") el.checked = false;
      else el.value = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    document.querySelectorAll('[data-autofill-preview="1"]').forEach((el) => {
      try { el.style.outline = ""; el.removeAttribute("data-autofill-preview"); } catch {}
    });
    return 0;
  }

  const DRY = !!payload.dryRun || mode === "preview";

  const alias = {
    fullName:       ["nombre", "name", "full name", "your name", "nombre y apellido"],
    firstName:      ["first name", "nombre"],
    lastName:       ["last name", "apellido"],
    email:          ["email", "correo", "mail", "e-mail"],
    phone:          ["phone", "teléfono", "telefono", "mobile", "celular", "cell phone"],
    city:           ["city", "ciudad", "localidad"],
    province:       ["province", "provincia", "estado", "región", "region"],
    country:        ["country", "país", "pais"],
    linkedin:       ["linkedin", "linked in"],
    github:         ["github", "git hub"],
    portfolio:      ["portfolio", "sitio web", "website", "url"],
    expectedSalary: ["salario", "pretensión", "pretension", "expected salary", "compensation", "salary expectation"],
    position:       ["position", "puesto", "role", "cargo"],
    resume:         ["resume", "cv", "cover letter", "about you", "sobre ti", "sobre mí", "sobre mi"],
    // ── campos de fecha ──────────────────────────────────────────────────────
    startDate:      ["start date", "fecha inicio", "fecha de inicio", "disponible desde",
                     "available from", "fecha disponible", "when can you start",
                     "availability", "availability date", "disponibilidad", "start day",
                     "earliest start", "joining date"],
    availableDate:  ["available date", "fecha disponible", "disponibilidad desde"],
    graduationDate: ["graduation date", "graduation year", "fecha de graduación",
                     "año de graduación", "graduation month", "year of graduation"],
    dateOfBirth:    ["date of birth", "fecha de nacimiento", "fecha nacimiento",
                     "birthdate", "birth date", "dob", "nacimiento"],
    workAuthDate:   ["authorization date", "visa expiry", "work permit expiry"],
  };

  const data = Object.assign({}, payload.profile || {}, payload.extras || {});
  const strat = payload.strategy || "smart";
  let filledCount = 0;
  const filledEls = new Set();

  for (const [key, val] of Object.entries(data)) {
    if (val == null) continue;

    let el = findByNameIdInsensitive(key);
    if (el && isFillable(el)) { await setValue(el, val, key); filledCount++; continue; }

    const tryDirect = async (selector) => {
      const e = document.querySelector(selector);
      if (e && isFillable(e)) { await setValue(e, val, key); filledCount++; return true; }
      return false;
    };

    if (strat !== "smart") {
      (await tryDirect(`input[name="${cssEscape(key)}"], textarea[name="${cssEscape(key)}"], select[name="${cssEscape(key)}"]`))
        || (await tryDirect(`#${cssEscape(key)}`));
      continue;
    }

    if (await tryDirect(`input[name="${cssEscape(key)}"], textarea[name="${cssEscape(key)}"], select[name="${cssEscape(key)}"]`)) continue;
    if (await tryDirect(`#${cssEscape(key)}`)) continue;

    el = findByAttr(["aria-label", "placeholder", "data-testid"], key);
    if (el) { await setValue(el, val, key); filledCount++; continue; }

    el = findByLabel(key, alias[key] || []);
    if (el) { await setValue(el, val, key); filledCount++; continue; }

    el = findComboboxByContext(key, alias[key] || []);
    if (el) { await setValue(el, val, key); filledCount++; continue; }
  }

  console.log(`[Job Autofill Helper] ${DRY ? "Campos detectados" : "Campos rellenados"}: ${filledCount}`);

  if (DRY) return filledCount;
  return { filled: filledCount, missed: collectMissed() };

  // ─── date helpers ────────────────────────────────────────────────────────────

  const MONTH_NAMES_EN = ["January","February","March","April","May","June",
                          "July","August","September","October","November","December"];
  const MONTH_NAMES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                          "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const MONTHS_MAP = {
    enero:0, january:0, jan:0, ene:0,
    febrero:1, february:1, feb:1,
    marzo:2, march:2, mar:2,
    abril:3, april:3, apr:3, abr:3,
    mayo:4, may:4,
    junio:5, june:5, jun:5,
    julio:6, july:6, jul:6,
    agosto:7, august:7, aug:7, ago:7,
    septiembre:8, september:8, sep:8, sept:8,
    octubre:9, october:9, oct:9,
    noviembre:10, november:10, nov:10,
    diciembre:11, december:11, dec:11, dic:11,
  };

  function parseSmartDate(val) {
    const s = String(val).trim();
    const sl = s.toLowerCase();

    // Palabras clave → hoy
    if (["hoy", "today", "ahora", "now", "inmediato", "immediate", "asap", "ya"].includes(sl))
      return new Date();

    // Relativo: "2 semanas", "1 mes", "3 días"
    const relM = sl.match(/^(\d+)\s*(d[ií]a|day|semana|week|mes|month)/i);
    if (relM) {
      const n = parseInt(relM[1]);
      const u = relM[2].toLowerCase();
      const d = new Date();
      if (/^d[ií]a|^day/.test(u)) d.setDate(d.getDate() + n);
      else if (/^semana|^week/.test(u)) d.setDate(d.getDate() + n * 7);
      else if (/^mes|^month/.test(u)) d.setMonth(d.getMonth() + n);
      return d;
    }

    // YYYY-MM-DD (ISO completo)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const d = new Date(s + "T00:00:00");
      return isNaN(d.getTime()) ? null : d;
    }

    // YYYY-MM (año + mes)
    const ymM = s.match(/^(\d{4})-(\d{2})$/);
    if (ymM) return new Date(+ymM[1], +ymM[2] - 1, 1);

    // YYYY (solo año, entre 1900 y 2100)
    if (/^\d{4}$/.test(s)) {
      const y = +s;
      return (y >= 1900 && y <= 2100) ? new Date(y, 0, 1) : null;
    }

    // DD/MM/YYYY o DD-MM-YYYY (formato latinoamericano)
    const dmyM = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyM) return new Date(+dmyM[3], +dmyM[2] - 1, +dmyM[1]);

    // "enero 2025", "January 2025", "jan 2025"
    const mymM = sl.match(/^([a-záéíóúü]+)\s+(\d{4})$/);
    if (mymM && MONTHS_MAP[mymM[1]] !== undefined)
      return new Date(+mymM[2], MONTHS_MAP[mymM[1]], 1);

    return null;
  }

  // Devuelve true si el valor tiene pinta de fecha (para no parsear "Buenos Aires" como fecha)
  function looksLikeDate(val) {
    const s = String(val).trim().toLowerCase();
    if (["hoy","today","ahora","now","inmediato","immediate","asap","ya"].includes(s)) return true;
    if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(s)) return true;
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(s)) return true;
    if (/^\d+\s*(d[ií]a|day|semana|week|mes|month)/i.test(s)) return true;
    if (/^[a-záéíóú]+ \d{4}$/i.test(s)) return true;
    return false;
  }

  function formatForDateText(el, d) {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const ph = (el.getAttribute("placeholder") || "").toLowerCase();
    if (/mm[\/\-]dd[\/\-]yyyy/.test(ph)) return `${m}/${dd}/${y}`;
    if (/dd[\/\-]mm[\/\-]yyyy/.test(ph)) return `${dd}/${m}/${y}`;
    if (/yyyy[\/\-]mm[\/\-]dd/.test(ph)) return `${y}-${m}-${dd}`;
    return `${y}-${m}-${dd}`;  // default ISO
  }

  // Rellena un select o input numérico de mes/día/año con la lista de candidatos
  function fillDateUnit(el, candidates) {
    if (el.tagName === "SELECT") {
      for (const c of candidates) {
        const opts = Array.from(el.options);
        let hit = opts.find((o) => norm(o.value) === norm(c) || norm(o.textContent) === norm(c));
        if (!hit) hit = opts.find((o) => norm(o.textContent).startsWith(norm(c)));
        if (!hit) hit = opts.find((o) => norm(o.textContent).includes(norm(c)));
        if (hit) { el.value = hit.value; dispatchAll(el); filledEls.add(el); return true; }
      }
      return false;
    } else {
      nativeSet(el, candidates[0]);
      dispatchAll(el);
      filledEls.add(el);
      return true;
    }
  }

  // Después de rellenar un campo de fecha, busca selectores de mes/día/año cercanos
  async function fillNearbyDateSelects(contextEl, date) {
    const y  = date.getFullYear();
    const mo = date.getMonth() + 1;
    const d  = date.getDate();

    let container = contextEl.parentElement;
    for (let depth = 0; depth < 4 && container; depth++, container = container.parentElement) {
      let found = 0;

      for (const el of Array.from(container.querySelectorAll("select, input[type='number']"))) {
        if (el === contextEl || filledEls.has(el) || !isFillable(el)) continue;

        const lbl = el.id ? (document.querySelector(`label[for="${cssEscape(el.id)}"]`)?.textContent || "") : "";
        const ctx = [el.name || "", el.id || "", el.getAttribute("aria-label") || "",
                     el.getAttribute("placeholder") || "", lbl].join(" ").toLowerCase();

        if (/\byear\b|\baño\b/.test(ctx)) {
          fillDateUnit(el, [String(y)]); found++;
        } else if (/\bmonth\b|\bmes\b/.test(ctx)) {
          fillDateUnit(el, [String(mo), String(mo).padStart(2,"0"),
                            MONTH_NAMES_EN[mo - 1], MONTH_NAMES_ES[mo - 1]]);
          found++;
        } else if (/\bday\b|\bd[ií]a\b/.test(ctx)) {
          fillDateUnit(el, [String(d), String(d).padStart(2,"0")]); found++;
        }
      }

      if (found > 0) break;
    }
  }

  // ─── core helpers ─────────────────────────────────────────────────────────────

  function collectMissed() {
    const seen = new Set();
    return Array.from(document.querySelectorAll("input, textarea, select"))
      .filter(isFillable)
      .filter((el) => !filledEls.has(el))
      .filter((el) => !el.value && el.offsetParent !== null)
      .map(extractFieldInfo)
      .filter((f) => f.suggestedKey)
      .filter((f) => { if (seen.has(f.suggestedKey)) return false; seen.add(f.suggestedKey); return true; });
  }

  function extractFieldInfo(el) {
    let label = "";
    if (el.id) {
      const lbl = document.querySelector(`label[for="${cssEscape(el.id)}"]`);
      if (lbl) label = lbl.textContent.replace(/[*:]+$/, "").trim();
    }
    if (!label) {
      const lbl = el.closest("label");
      if (lbl) label = lbl.textContent.replace(/[*:]+$/, "").trim();
    }
    if (!label) label = el.getAttribute("aria-label") || el.getAttribute("placeholder") || "";
    label = label.slice(0, 60).trim();
    const raw = el.name || el.id || label;
    const suggestedKey = toCamelCase(raw);
    return { label, suggestedKey, fieldType: el.tagName.toLowerCase() };
  }

  function toCamelCase(s) {
    return String(s).trim()
      .replace(/[^a-zA-Z0-9\s_-]/g, " ")
      .replace(/[-_]+/g, " ")
      .split(/\s+/).filter(Boolean)
      .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join("");
  }

  function norm(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  }

  function ms(n) { return new Promise((r) => setTimeout(r, n)); }

  function nativeSet(el, v) {
    const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    if (desc?.set) desc.set.call(el, v);
    else el.value = v;
  }

  function dispatchAll(el) {
    el.dispatchEvent(new Event("input",  { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur",   { bubbles: true }));
  }

  function isCombobox(el) {
    if (!el || el.tagName !== "INPUT") return false;
    const role  = (el.getAttribute("role") || "").toLowerCase();
    const popup = (el.getAttribute("aria-haspopup") || "").toLowerCase();
    const auto  = (el.getAttribute("aria-autocomplete") || "").toLowerCase();
    return role === "combobox" || popup === "listbox" || popup === "true"
      || auto === "list" || auto === "both";
  }

  function markPreview(el) {
    try { el.setAttribute("data-autofill-preview", "1"); el.style.outline = "2px dashed #66f"; } catch {}
  }

  async function setValue(el, val, key = "") {
    if (!el || el.disabled || el.readOnly) return;
    if (DRY) { markPreview(el); return; }

    const parsedDate = looksLikeDate(val) ? parseSmartDate(val) : null;

    if (parsedDate && el.type === "date") {
      // ── input type="date" → YYYY-MM-DD ──────────────────────────────────────
      const y  = parsedDate.getFullYear();
      const m  = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const d  = String(parsedDate.getDate()).padStart(2, "0");
      nativeSet(el, `${y}-${m}-${d}`);
      dispatchAll(el);

    } else if (parsedDate && el.type === "month") {
      // ── input type="month" → YYYY-MM ─────────────────────────────────────────
      const y = parsedDate.getFullYear();
      const m = String(parsedDate.getMonth() + 1).padStart(2, "0");
      nativeSet(el, `${y}-${m}`);
      dispatchAll(el);

    } else if (el.type === "checkbox") {
      el.checked = !!val;
      dispatchAll(el);

    } else if (el.type === "radio") {
      const group = document.querySelectorAll(`input[type="radio"][name="${cssEscape(el.name)}"]`);
      let chosen = null;
      group.forEach((r) => { if (norm(r.value) === norm(val)) chosen = r; });
      if (chosen) { chosen.checked = true; dispatchAll(chosen); }

    } else if (el.tagName === "SELECT") {
      fillNativeSelect(el, val);

    } else if (isCombobox(el)) {
      await fillCombobox(el, val);

    } else {
      // ── text / textarea ──────────────────────────────────────────────────────
      const formatted = parsedDate ? formatForDateText(el, parsedDate) : String(val);
      nativeSet(el, formatted);
      dispatchAll(el);
    }

    filledEls.add(el);

    // Si se usó una fecha, intentar rellenar selects cercanos de mes/año/día
    if (parsedDate) await fillNearbyDateSelects(el, parsedDate);
  }

  function fillNativeSelect(el, val) {
    const n    = norm(val);
    const opts = Array.from(el.options);
    let hit = opts.find((o) => norm(o.value) === n || norm(o.textContent) === n);
    if (!hit) hit = opts.find((o) => norm(o.textContent).startsWith(n));
    if (!hit) hit = opts.find((o) => norm(o.textContent).includes(n));
    if (!hit) hit = opts.find((o) => n.includes(norm(o.textContent)) && norm(o.textContent).length > 2);
    if (hit) el.value = hit.value; else el.value = val;
    dispatchAll(el);
  }

  async function fillCombobox(el, val) {
    el.focus(); el.click();
    await ms(80);
    nativeSet(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    await ms(80);
    nativeSet(el, val);
    el.dispatchEvent(new Event("input",  { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", keyCode: 40, bubbles: true }));
    await ms(500);
    if (await clickBestOption(el, val)) return;
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  async function clickBestOption(triggerEl, val) {
    const n = norm(val);
    const ownedId = triggerEl.getAttribute("aria-controls") || triggerEl.getAttribute("aria-owns");
    const listboxes = ownedId
      ? [document.getElementById(ownedId)].filter(Boolean)
      : Array.from(document.querySelectorAll('[role="listbox"]')).filter((el) => el.offsetParent !== null);
    for (const box of listboxes) {
      const optEls = Array.from(box.querySelectorAll('[role="option"], li'));
      if (!optEls.length) continue;
      let pick = optEls.find((o) => norm(o.textContent) === n);
      if (!pick) pick = optEls.find((o) => norm(o.textContent).startsWith(n));
      if (!pick) pick = optEls.find((o) => norm(o.textContent).includes(n));
      if (pick) {
        pick.scrollIntoView({ block: "nearest" });
        pick.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        pick.click();
        pick.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        await ms(100);
        return true;
      }
    }
    return false;
  }

  function findComboboxByContext(key, synonyms) {
    const patterns = buildPatterns(key, synonyms);
    const candidates = Array.from(document.querySelectorAll(
      "input[role='combobox'], input[aria-haspopup], input[aria-autocomplete]"
    ));
    for (const el of candidates) {
      if (!isFillable(el)) continue;
      const ctx = [el.getAttribute("aria-label") || "", el.getAttribute("placeholder") || "",
                   el.getAttribute("name") || "", el.getAttribute("id") || ""].join(" ").toLowerCase();
      if (patterns.some((p) => ctx.includes(p))) return el;
      const lblFor = document.querySelector(`label[for="${cssEscape(el.id)}"]`);
      if (lblFor && patterns.some((p) => (lblFor.textContent || "").toLowerCase().includes(p))) return el;
    }
    return null;
  }

  function findByNameIdInsensitive(key) {
    const k = String(key).toLowerCase();
    for (const el of document.querySelectorAll("input, textarea, select")) {
      const n = (el.getAttribute("name") || "").toLowerCase();
      const i = (el.getAttribute("id")   || "").toLowerCase();
      if ((n && n === k) || (i && i === k)) return el;
    }
    return null;
  }

  function findByAttr(attrs, key) {
    const patterns = buildPatterns(key, []);
    for (const a of attrs) {
      const candidates = Array.from(document.querySelectorAll(`[${a}]`))
        .filter(isFillable)
        .filter((el) => patterns.some((p) => (el.getAttribute(a) || "").toLowerCase().includes(p)));
      if (candidates[0]) return candidates[0];
    }
    return null;
  }

  function findByLabel(key, synonyms) {
    const patterns = buildPatterns(key, synonyms);
    for (const lbl of document.querySelectorAll("label")) {
      const text = (lbl.textContent || "").toLowerCase().trim();
      if (!patterns.some((p) => text.includes(p))) continue;
      const forId = lbl.getAttribute("for");
      if (forId) { const el = document.getElementById(forId); if (el && isFillable(el)) return el; }
      const inner = lbl.querySelector("input, textarea, select");
      if (inner && isFillable(inner)) return inner;
      const near = lbl.parentElement
        ? Array.from(lbl.parentElement.querySelectorAll("input, textarea, select")).filter(isFillable)
        : [];
      if (near.length === 1) return near[0];
    }
    return null;
  }

  function isFillable(el) {
    if (!el) return false;
    if (!["input", "textarea", "select"].includes(el.tagName.toLowerCase())) return false;
    const type = (el.getAttribute("type") || "").toLowerCase();
    if (["submit", "button", "file", "hidden", "password"].includes(type)) return false;
    const nameId = ((el.name || "") + " " + (el.id || "")).toLowerCase();
    if (nameId.includes("password") || nameId.includes("card")) return false;
    const ctx = [nameId, (el.getAttribute("placeholder") || "").toLowerCase(),
                 (el.getAttribute("aria-label") || "").toLowerCase()].join(" ");
    const sensitive = ["password","pass","card","credit","debit","cvv","security code",
                       "ssn","social security","dni","document","documento","tarjeta"];
    if (sensitive.some((k) => ctx.includes(k))) return false;
    return true;
  }

  function buildPatterns(key, synonyms) {
    const base = [key, ...synonyms].map((s) => String(s).toLowerCase());
    return base.map((s) => s.replace(/\s+/g, " ").trim())
               .flatMap((s) => [s, s.replace(/\s+/g, "")]);
  }

  function cssEscape(s) {
    const str = String(s || "");
    if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(str);
    return str.replace(/(["\\.#:[\]()])/g, "\\$1");
  }
}
