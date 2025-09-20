import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ChakraProvider, extendTheme,
  Box, Heading, Text, Textarea, Button, Select, HStack, VStack, useToast, Divider
} from "@chakra-ui/react";

// ===== in-page function (se inyecta en la pestaña) =====
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
    resume: ["resume", "cv", "cover letter", "about you", "sobre ti", "sobre mí", "sobre mi"]
  };

  const data  = Object.assign({}, payload.profile || {}, payload.extras || {});
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

  console.log(`[Job Autofill Helper] Campos rellenados: ${filledCount}`);

  function setValue(el, val) {
    if (!el || el.disabled || el.readOnly) return;
    if (el.type === "checkbox") el.checked = !!val;
    else if (el.type === "radio") {
      const group = document.querySelectorAll(`input[type="radio"][name="${cssEscape(el.name)}"]`);
      let chosen = null;
      group.forEach((r) => { if (String(r.value).toLowerCase() === String(val).toLowerCase()) chosen = r; });
      if (chosen) chosen.checked = true;
    } else if (el.tagName === "SELECT") {
      const options = Array.from(el.options);
      const lower = String(val).toLowerCase().trim();
      let match = options.find(o => o.value.toLowerCase() === lower || o.textContent.trim().toLowerCase() === lower);
      if (!match) match = options.find(o => o.textContent.trim().toLowerCase().includes(lower));
      if (match) el.value = match.value; else el.value = val;
    } else {
      el.value = String(val);
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  }

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
      const near = lbl.parentElement?.querySelector("input, textarea, select");
      if (near && isFillable(near)) return near;
    }
    return null;
  }
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
    return base.map((s) => s.replace(/\s+/g, " ").trim()).flatMap((s) => [s, s.replace(/\s+/g, "")]);
  }
  function cssEscape(s) { return (s || "").replace(/(["\\.#:[\\]()])/g, "\\$1"); }
}

// ===== Popup UI (Chakra) =====
function App() {
  const toast = useToast();
  const [profileText, setProfileText] = useState("{\n  \"fullName\": \"\",\n  \"email\": \"\",\n  \"phone\": \"\",\n  \"city\": \"\",\n  \"province\": \"\",\n  \"country\": \"\"\n}");
  const [extrasText, setExtrasText] = useState("");
  const [strategy, setStrategy] = useState("smart");

  const theme = useMemo(() => extendTheme({
    fonts: { heading: "system-ui, sans-serif", body: "system-ui, sans-serif" },
    radii: { md: "14px", lg: "16px", xl: "22px", "2xl": "28px" }
  }), []);

  useEffect(() => {
    (async () => {
      const { profile, extras, strategy } = await chrome.storage.local.get(["profile", "extras", "strategy"]);
      if (profile) setProfileText(JSON.stringify(profile, null, 2));
      if (extras)  setExtrasText(Object.entries(extras).map(([k, v]) => `${k}=${v}`).join("\n"));
      if (strategy) setStrategy(strategy);
    })();
  }, []);

  const save = async () => {
    try {
      const profile = JSON.parse(profileText || "{}");
      const extras = parseExtras(extrasText);
      await chrome.storage.local.set({ profile, extras, strategy });
      toast({ title: "Perfil guardado", status: "success", duration: 1500 });
    } catch {
      toast({ title: "JSON inválido en Perfil", status: "error" });
    }
  };

  const load = async () => {
    const { profile, extras, strategy: st } = await chrome.storage.local.get(["profile", "extras", "strategy"]);
    setProfileText(profile ? JSON.stringify(profile, null, 2) : "");
    setExtrasText(extras ? Object.entries(extras).map(([k, v]) => `${k}=${v}`).join("\n") : "");
    setStrategy(st || "smart");
    toast({ title: "Perfil cargado", status: "info", duration: 1200 });
  };

  const fill = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const profile = safeJSON(profileText);
    const extras = parseExtras(extrasText);
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: injectAutofill,
      args: [{ profile, extras, strategy, mode: "fill" }]
    });
  };

  const clear = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: injectAutofill,
      args: [{ mode: "clear" }]
    });
  };

  return (
    <ChakraProvider theme={theme}>
      <Box p={4}>
        <Heading size="md" mb={3}>Job Autofill Helper</Heading>

        <Text fontSize="sm" mb={2}>Perfil (JSON)</Text>
        <Textarea value={profileText} onChange={e => setProfileText(e.target.value)} rows={8} borderRadius="2xl" />

        <HStack mt={3} spacing={3}>
          <Button onClick={save} colorScheme="teal" flex="1">Guardar</Button>
          <Button onClick={load} variant="outline" flex="1">Cargar</Button>
        </HStack>

        <Text fontSize="sm" mt={4} mb={2}>Campos extra (clave=valor, uno por línea)</Text>
        <Textarea value={extrasText} onChange={e => setExtrasText(e.target.value)} rows={4} borderRadius="2xl" />

        <Text fontSize="sm" mt={4} mb={2}>Estrategia de mapeo</Text>
        <Select value={strategy} onChange={e => setStrategy(e.target.value)} borderRadius="xl">
          <option value="smart">Smart (labels/placeholders/aria)</option>
          <option value="name">Sólo por name/id</option>
        </Select>

        <HStack mt={4} spacing={3}>
          <Button onClick={fill} colorScheme="blue" flex="1">Rellenar</Button>
          <Button onClick={clear} variant="outline" flex="1">Limpiar</Button>
        </HStack>

        <Divider my={4} />
        <Text fontSize="xs" color="gray.500">
          Consejos: mantené el envío manual. Respetá los Términos de cada sitio y evitá spam.
        </Text>
      </Box>
    </ChakraProvider>
  );
}

// helpers del popup
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
function safeJSON(s) { try { return JSON.parse(s || "{}"); } catch { return {}; } }

createRoot(document.getElementById("root")).render(<App />);
