import { ChakraProvider, Box, Text, VStack, Divider, useToast } from "@chakra-ui/react";
import { theme } from "./utils/chakraTheme";
import { useMemo, useState } from "react";
import { useChromeProfile } from "./hooks/useChromeProfiles";
import { arrayToObject } from "./utils/kvHelpers";
import HeaderBar from "./components/HeaderBar";
import AddFieldModal from "./components/AddFieldModal";
import FieldRow from "./components/FieldRow";
import StrategySelect from "./components/StrategySelect";
import ActionsRow from "./components/ActionsRow";
import { injectAutofill } from "../content/injectAutofill"; // sólo para tipado/consistencia

export default function Popup() {
  const toast = useToast();
  const { fields, setFields, strategy, setStrategy, save } = useChromeProfile();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const existingKeys = useMemo(() => fields.map((f) => f.key), [fields]);

  const upsertField = (next) => {
    setFields((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex((f) => f.key === (next.oldKey || next.key));
      const final = { key: (next.key || next.oldKey).trim(), value: next.value };
      if (!final.key) return copy;
      if (idx >= 0) copy[idx] = final;
      else copy.push(final);
      // dedupe keys (keep last)
      const map = new Map();
      copy.forEach((f) => map.set(f.key, f.value));
      return Array.from(map.entries()).map(([key, value]) => ({ key, value }));
    });
  };

  const removeField = (key) => setFields((prev) => prev.filter((f) => f.key !== key));

  const load = async () => {
    const { profile, strategy: st } = await chrome.storage.local.get(["profile", "strategy"]);
    setFields(Object.entries(profile || {}).map(([key, value]) => ({ key, value })));
    setStrategy(st || "smart");
    toast({ title: "Perfil cargado", status: "info", duration: 1200 });
  };

  const wipeLocal = async () => {
    await chrome.storage.local.clear();
    setFields([]); setStrategy("smart");
    toast({ title: "Datos locales borrados", status: "success", duration: 1200 });
  };

  const runOnActiveTab = async (args) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isHttps = tab.url?.startsWith("https:");
    if (!isHttps) { toast({ title: "Solo en HTTPS", status: "warning" }); return null; }
    const [{ result = 0 } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectAutofill,
      args,
    });
    return result;
  };

  const preview = async () => {
    await runOnActiveTab([{ mode: "clearPreview" }]);
    const result = await runOnActiveTab([{
      profile: arrayToObject(fields), extras: {}, strategy, mode: "preview", dryRun: true,
    }]);
    toast({
      title: `Previsualización: ${result || 0} campo(s) detectado(s)`,
      description: "Se resaltaron con borde punteado.",
      status: "info", duration: 2000,
    });
  };

  const fill = async () => {
    const result = await runOnActiveTab([{ profile: arrayToObject(fields), extras: {}, strategy, mode: "fill" }]);
    if (result != null) toast({ title: `Rellenados ${result} campo(s)`, status: "success" });
  };

  const clear = async () => {
    await runOnActiveTab([{ mode: "clear" }]);
    toast({ title: "Campos limpiados", status: "info", duration: 1200 });
  };

  return (
    <ChakraProvider theme={theme}>
      <Box p={4} minW={360}>
        <HeaderBar onAdd={() => setIsAddOpen(true)} />

        <Text fontSize="sm" color="gray.600" mb={2}>
          Tu perfil (clic en ✎ para editar, 🗑️ para borrar)
        </Text>

        <VStack align="stretch" spacing={2}>
          {fields.length === 0 && (
            <Box p={3} borderWidth="1px" borderRadius="lg" color="gray.500">
              Aún no agregaste campos. Tocá el <b>+ </b> para empezar.
            </Box>
          )}
          {fields.map((f) => (
            <FieldRow key={f.key} item={f} onChange={upsertField} onRemove={() => removeField(f.key)} />
          ))}
        </VStack>

        <Divider my={4} />

        <StrategySelect value={strategy} onChange={setStrategy} />

        <ActionsRow
          onFill={fill}
          onPreview={preview}
          onClear={clear}
          onLoad={load}
          onSave={save}
          onWipe={wipeLocal}
          fields={fields}
          strategy={strategy}
        />
      </Box>

      <AddFieldModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={(f) => upsertField(f)}
        existingKeys={existingKeys}
      />
    </ChakraProvider>
  );
}
