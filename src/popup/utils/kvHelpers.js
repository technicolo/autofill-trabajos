export function arrayToObject(arr) {
  const out = {};
  (arr || []).forEach((f) => {
    if (!f) return;
    const k = String(f.key || "").trim();
    if (!k) return;
    out[k] = f.value ?? "";
  });
  return out;
}

export function objectToArray(obj) {
  return Object.entries(obj || {}).map(([key, value]) => ({ key, value }));
}
