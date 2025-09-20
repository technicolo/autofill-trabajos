// popup.js — versión con mejoras: (1) case-insensitive en name/id, (2) evita campos sensibles,
// (3) fallback parcial en <select>, (4) usa chrome.storage.local y wrapper para evitar dobles binds.

(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const profileEl  = document.getElementById("profile");
    const extrasEl   = document.getElementById("extras");
    const strategyEl = document.getElementById("strategy");
    const hintsEl    = document.getElementById("hints");

    const $ = (id) => document.getElementById(id);

    // Guarda en LOCAL (más seguro que sync para datos sensibles)
    $("save").addEventListener("click", async () => {
      try {
        const profile = JSON.parse(profileEl.value || "{}");
        const extras  = parseExtras(extrasEl.value);
        await chrome.storage.local.set({
          profile,
          extras,
          strategy: strategyEl.value,
        });
        hintsEl.textContent = "Perfil guardado.";
      } catch (e) {
        hintsEl.textContent = "Error: JSON inválido en Perfil.";
      }
    });

    $("load").addEventListener("click", async () => {
      const { profile, extras, strategy } = await chrome.storage.local.get([
        "profile",
        "extras",
        "strategy",
      ]);
      profileEl.value  = profile ? JSON.stringify(profile, null, 2) : "";
      extrasEl.value   = extras ? extrasToText(extras) : "";
      strategyEl.value = strategy || "smart";
      hintsEl.textContent = "Perfil cargado.";
    });

    $("autofill").addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const profile = safeJSON(profileEl.value);
      const extras  = parseExtras(extrasEl.value);
      const payload = { profile, extras, strategy: strategyEl.value, mode: "fill" };

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: injectAutofill,
        args: [payload],
      });
    });

    $("clear").addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: injectAutofill,
        args: [{ mode: "clear" }],
      });
    });

    // ===== Helpers del popup =====
    function parseExtras(text) {
      const obj = {};
      (text || "").split("\n").forEach((line) => {
        const t = line.trim();
        if (!t) return;
        const i = t.indexOf("=");
        if (i === -1) return;
        const k = t.slice(0, i).trim();
        const v = t.slice(i + 1).trim();
        if (k) obj[k] = v;
      });
      return obj;
    }
    function extrasToText(o) {
      return Object.entries(o).map(([k, v]) => `${k}=${v}`).join("\n");
    }
    function safeJSON(s) {
      try { return JSON.parse(s || "{}"); } catch { return {}; }
    }
  });

  // ======= Esta función corre dentro de la página =======
  function injectAutofill(payload) {
    const mode = payload?.mode || "fill";

    if (mode === "clear") {
      document.querySelectorAll("input, textarea, select").forEach((el) => {
        if (el.type === "checkbox" || el.type === "radio") el.checked = false;
        else el.value = "";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });
      return;
    }

    const data  = Object.assign({}, payload.profile || {}, payload.extras || {});
    const strat = payload.strategy || "smart";

    /** Mapea claves comunes -> posibles patrones de búsqueda */
    const alias = {
      fullName: ["nombre", "name", "full name", "your name", "nombre y apellido"],
      firstName: ["first name", "nombre"],
      lastName: ["last name", "apellido"],
      email: ["email", "correo", "mail", "e-mail"],
      phone: ["phone", "teléfono", "telefono", "mobile", "celular"],
      city: ["city", "ciudad", "localidad"],
      province: ["province", "provincia", "estado", "región", "region"],
      country: ["country", "país", "pais"],
      linkedin: ["linkedin", "linked in"],
      github: ["github", "git hub"],
      portfolio: ["portfolio", "sitio web", "website", "url"],
      expectedSalary: ["salario", "pretensión", "pretension", "expected salary", "compensation"],
      position: ["position", "puesto", "role", "cargo"],
      resume: ["resume", "cv", "cover letter", "about you", "sobre ti", "sobre mí", "sobre mi"],
      /*campos a tener en cuenta : 
      sexo:(masculino o femenino)
      documento: (quizas es muy personal)
      pais de residencia:
      */
    };

    let filledCount = 0;

    // ====== Loop principal ======
    const entries = Object.entries(data);
    entries.forEach(([key, val]) => {
      if (val == null) return;

      // (1) Case-insensitive en name / id
      let el = findByNameIdInsensitive(key);
      if (el && isFillable(el)) {
        setValue(el, val);
        filledCount++;
        return;
      }

      // (original) Directo por name/id exactos (por si el anterior no encontró)
      const tryDirect = (selector) => {
        const e = document.querySelector(selector);
        if (e && isFillable(e)) {
          setValue(e, val);
          filledCount++;
          return true;
        }
        return false;
      };

      if (strat !== "smart") {
        tryDirect(`input[name="${cssEscape(key)}"], textarea[name="${cssEscape(key)}"], select[name="${cssEscape(key)}"]`)
          || tryDirect(`#${cssEscape(key)}`);
        return;
      }

      // Smart: name/id exacto
      if (tryDirect(`input[name="${cssEscape(key)}"], textarea[name="${cssEscape(key)}"], select[name="${cssEscape(key)}"]`)) return;
      if (tryDirect(`#${cssEscape(key)}`)) return;

      // Smart: aria-label / placeholder / data-testid
      el = findByAttr(["aria-label", "placeholder", "data-testid"], key);
      if (el) { setValue(el, val); filledCount++; return; }

      // Smart: label cercana
      el = findByLabel(key, alias[key] || []);
      if (el) { setValue(el, val); filledCount++; return; }
    });

    console.log(`[Job Autofill Helper] Campos rellenados: ${filledCount}`);

    // ======= Helpers dentro de la página =======
    function setValue(el, val) {
      if (!el || el.disabled || el.readOnly) return;

      if (el.type === "checkbox") {
        el.checked = !!val;
      } else if (el.type === "radio") {
        const group = document.querySelectorAll(`input[type="radio"][name="${cssEscape(el.name)}"]`);
        let chosen = null;
        group.forEach((r) => {
          if (String(r.value).toLowerCase() === String(val).toLowerCase()) chosen = r;
        });
        if (chosen) chosen.checked = true;
      } else if (el.tagName === "SELECT") {
        const options = Array.from(el.options);
        const lower = String(val).toLowerCase().trim();
        // Match exacto por value o texto
        let match = options.find(
          (o) => o.value.toLowerCase() === lower || o.textContent.trim().toLowerCase() === lower
        );
        // (3) Fallback: match parcial por texto visible
        if (!match) {
          match = options.find((o) => o.textContent.trim().toLowerCase().includes(lower));
        }
        if (match) el.value = match.value;
        else el.value = val; // fallback duro
      } else {
        el.value = String(val);
      }

      el.dispatchEvent(new Event("input",  { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("blur",   { bubbles: true }));
    }

    // (1) Case-insensitive name/id
    function findByNameIdInsensitive(key) {
      const k = String(key).toLowerCase();
      const nodes = document.querySelectorAll("input, textarea, select");
      for (const el of nodes) {
        const n = (el.getAttribute("name") || "").toLowerCase();
        const i = (el.getAttribute("id")   || "").toLowerCase();
        if ((n && n === k) || (i && i === k)) return el;
      }
      return null;
    }

    function findByAttr(attrs, key) {
      const patterns = buildPatterns(key, alias[key] || []);
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

        // for="id"
        const forId = lbl.getAttribute("for");
        if (forId) {
          const el = document.getElementById(forId);
          if (el && isFillable(el)) return el;
        }
        // label > input/textarea/select
        const inner = lbl.querySelector("input, textarea, select");
        if (inner && isFillable(inner)) return inner;

        // cercano
        const near = lbl.parentElement?.querySelector("input, textarea, select");
        if (near && isFillable(near)) return near;
      }
      return null;
    }

    // (2) Evita campos sensibles
    function isFillable(el) {
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      if (!["input", "textarea", "select"].includes(tag)) return false;

      const type = (el.getAttribute("type") || "").toLowerCase();
      if (["submit", "button", "file", "hidden", "password", "number"].includes(type)) return false;

      const nameId = ((el.name || "") + " " + (el.id || "")).toLowerCase();
      if (nameId.includes("password") || nameId.includes("card")) return false;

      return true;
    }

    function buildPatterns(key, synonyms) {
      const base = [key, ...synonyms].map((s) => String(s).toLowerCase());
      return base
        .map((s) => s.replace(/\s+/g, " ").trim())
        .flatMap((s) => [s, s.replace(/\s+/g, "")]);
    }

    function cssEscape(s) {
      return (s || "").replace(/(["\\.#:[\]()])/g, "\\$1");
    }
  }
})();
