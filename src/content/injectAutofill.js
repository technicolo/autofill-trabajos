// contenido de página: se inyecta via chrome.scripting.executeScript
export function injectAutofill(payload) {
  const mode = payload?.mode || "fill";

  // limpiar resaltados de previsualización
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
    fullName: ["nombre", "name", "full name", "your name", "nombre y apellido"],
    firstName: ["first name", "nombre"],
    lastName: ["last name", "apellido"],
    email: ["email", "correo", "mail", "e-mail","Email","E-mail"],
    phone: ["phone", "teléfono", "telefono", "mobile", "celular","Phone","cell phone"],
    city: ["city", "ciudad", "localidad"],
    province: ["province", "provincia", "estado", "región", "region"],
    country: ["country", "país", "pais"],
    linkedin: ["linkedin", "linked in"],
    github: ["github", "git hub"],
    portfolio: ["portfolio", "sitio web", "website", "url"],
    expectedSalary: ["salario","pretensión","pretension","expected salary","compensation"],
    position: ["position", "puesto", "role", "cargo"],
    resume: ["resume","cv","cover letter","about you","sobre ti","sobre mí","sobre mi"],
  };

  const data = Object.assign({}, payload.profile || {}, payload.extras || {});
  const strat = payload.strategy || "smart";
  let filledCount = 0;

  const entries = Object.entries(data);
  entries.forEach(([key, val]) => {
    if (val == null) return;

    let el = findByNameIdInsensitive(key);
    if (el && isFillable(el)) { setValue(el, val); filledCount++; return; }

    const tryDirect = (selector) => {
      const e = document.querySelector(selector);
      if (e && isFillable(e)) { setValue(e, val); filledCount++; return true; }
      return false;
    };

    if (strat !== "smart") {
      tryDirect(`input[name="${cssEscape(key)}"], textarea[name="${cssEscape(key)}"], select[name="${cssEscape(key)}"]`)
        || tryDirect(`#${cssEscape(key)}`);
      return;
    }

    if (tryDirect(`input[name="${cssEscape(key)}"], textarea[name="${cssEscape(key)}"], select[name="${cssEscape(key)}"]`)) return;
    if (tryDirect(`#${cssEscape(key)}`)) return;

    el = findByAttr(["aria-label", "placeholder", "data-testid"], key);
    if (el) { setValue(el, val); filledCount++; return; }

    el = findByLabel(key, alias[key] || []);
    if (el) { setValue(el, val); filledCount++; return; }
  });

  console.log(`[Job Autofill Helper] ${DRY ? "Campos detectados" : "Campos rellenados"}: ${filledCount}`);
  return filledCount;

  // helpers internos
  function markPreview(el) {
    try { el.setAttribute("data-autofill-preview", "1"); el.style.outline = "2px dashed #66f"; } catch {}
  }
  function setValue(el, val) {
    if (!el || el.disabled || el.readOnly) return;
    if (DRY) { markPreview(el); return; }
    if (el.type === "checkbox") el.checked = !!val;
    else if (el.type === "radio") {
      const group = document.querySelectorAll(`input[type="radio"][name="${cssEscape(el.name)}"]`);
      let chosen = null; group.forEach((r) => { if (String(r.value).toLowerCase() === String(val).toLowerCase()) chosen = r; });
      if (chosen) chosen.checked = true;
    } else if (el.tagName === "SELECT") {
      const options = Array.from(el.options);
      const lower = String(val).toLowerCase().trim();
      let match = options.find((o) => o.value.toLowerCase() === lower || o.textContent.trim().toLowerCase() === lower);
      if (!match) match = options.find((o) => o.textContent.trim().toLowerCase().includes(lower));
      if (match) el.value = match.value; else el.value = val;
    } else el.value = String(val);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  }
  function findByNameIdInsensitive(key) {
    const k = String(key).toLowerCase();
    const nodes = document.querySelectorAll("input, textarea, select");
    for (const el of nodes) {
      const n = (el.getAttribute("name") || "").toLowerCase();
      const i = (el.getAttribute("id") || "").toLowerCase();
      if ((n && n === k) || (i && i === k)) return el;
    }
    return null;
  }
  function findByAttr(attrs, key) {
    const patterns = buildPatterns(key, []);
    for (const a of attrs) {
      const candidates = Array.from(document.querySelectorAll(`[${a}]`))
        .filter(isFillable)
        .filter((el) => {
          const attrVal = (el.getAttribute(a) || "").toLowerCase();
          return patterns.some((p) => attrVal.includes(p));
        });
      if (candidates[0]) return candidates[0];
    }
    return null;
  }
  function findByLabel(key, synonyms) {
    const patterns = buildPatterns(key, synonyms);
    const labels = Array.from(document.querySelectorAll("label"));
    for (const lbl of labels) {
      const text = (lbl.textContent || "").toLowerCase().trim();
      if (!patterns.some((p) => text.includes(p))) continue;
      const forId = lbl.getAttribute("for");
      if (forId) {
        const el = document.getElementById(forId);
        if (el && isFillable(el)) return el;
      }
      const inner = lbl.querySelector("input, textarea, select");
      if (inner && isFillable(inner)) return inner;
      const near = lbl.parentElement ? Array.from(lbl.parentElement.querySelectorAll("input, textarea, select")).filter(isFillable) : [];
      if (near.length === 1) return near[0];
    }
    return null;
  }
  function isFillable(el) {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (!["input", "textarea", "select"].includes(tag)) return false;
    const type = (el.getAttribute("type") || "").toLowerCase();
    if (["submit", "button", "file", "hidden", "password"].includes(type)) return false;
    const nameId = ((el.name || "") + " " + (el.id || "")).toLowerCase();
    if (nameId.includes("password") || nameId.includes("card")) return false;
    const textAround = [
      nameId,
      (el.getAttribute("placeholder") || "").toLowerCase(),
      (el.getAttribute("aria-label") || "").toLowerCase(),
    ].join(" ");
    const sensitive = ["password","pass","card","credit","debit","cvv","security code","ssn","social security","dni","document","documento","tarjeta"];
    if (sensitive.some((k) => textAround.includes(k))) return false;
    return true;
  }
  function buildPatterns(key, synonyms) {
    const base = [key, ...synonyms].map((s) => String(s).toLowerCase());
    return base.map((s) => s.replace(/\s+/g, " ").trim()).flatMap((s) => [s, s.replace(/\s+/g, "")]);
  }
  function cssEscape(s) {
    const str = String(s || "");
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(str);
    return str.replace(/(["\\.#:[\]()])/g, "\\$1");
  }
}
