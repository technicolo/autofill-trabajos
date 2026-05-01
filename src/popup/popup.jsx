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
import MissedFieldsPanel from "./components/MissedFieldsPanel";
import { injectAutofill } from "../content/injectAutofill";

export default function Popup() {
  const toast = useToast();
  const { fields, setFields, strategy, setStrategy, save, savedProfiles, saveToSlot, loadFromSlot, renameSlot } = useChromeProfile();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  const [missedFields, setMissedFields] = useState([]);
  const [pendingKey, setPendingKey] = useState("");

  const existingKeys = useMemo(() => fields.map((f) => f.key), [fields]);

  const upsertField = (next) => {
    setFields((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex((f) => f.key === (next.oldKey || next.key));
      const final = { key: (next.key || next.oldKey).trim(), value: next.value };
      if (!final.key) return copy;
      if (idx >= 0) copy[idx] = final;
      else copy.push(final);
      const map = new Map();
      copy.forEach((f) => map.set(f.key, f.value));
      return Array.from(map.entries()).map(([key, value]) => ({ key, value }));
    });
  };

  const removeField = (key) => setFields((prev) => prev.filter((f) => f.key !== key));

  const wipeLocal = async () => {
    await chrome.storage.local.clear();
    setFields([]); setStrategy("smart"); setActiveSlot(null); setMissedFields([]);
    toast({ title: "Datos locales borrados", status: "success", duration: 1200 });
  };

  const runOnActiveTab = async (args) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isHttps = tab.url?.startsWith("https:");
    if (!isHttps) { toast({ title: "Solo en HTTPS", status: "warning" }); return null; }
    const [{ result } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectAutofill,
      args,
    });
    return result ?? null;
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
    setMissedFields([]);
    const raw = await runOnActiveTab([{ profile: arrayToObject(fields), extras: {}, strategy, mode: "fill" }]);
    if (raw == null) return;
    const { filled = 0, missed = [] } = typeof raw === "object" ? raw : { filled: raw };

    // Filtrar los que ya están en el perfil (problema de matching, no de datos faltantes)
    const newMissed = missed.filter(
      (f) => !fields.some((pf) => pf.key.toLowerCase() === f.suggestedKey.toLowerCase())
    );
    setMissedFields(newMissed);

    toast({
      title: `Rellenados ${filled} campo(s)`,
      description: newMissed.length > 0 ? `${newMissed.length} campo(s) sin completar` : undefined,
      status: filled > 0 ? "success" : "warning",
    });
  };

  const clear = async () => {
    await runOnActiveTab([{ mode: "clear" }]);
    setMissedFields([]);
    toast({ title: "Campos limpiados", status: "info", duration: 1200 });
  };

  const handleAddFromMissed = (suggestedKey) => {
    setPendingKey(suggestedKey);
    setIsAddOpen(true);
  };

  const handleModalClose = () => {
    setIsAddOpen(false);
    setPendingKey("");
  };

  const handleLoadSlot = (idx) => {
    const data = loadFromSlot(idx);
    if (data) {
      setFields(data.fields);
      setStrategy(data.strategy);
      setActiveSlot(idx);
      setMissedFields([]);
      toast({ title: `"${savedProfiles[idx].name}" cargado`, status: "info", duration: 1200 });
    } else {
      toast({ title: "Slot vacío", description: "Guardá datos en este slot primero.", status: "warning", duration: 1500 });
    }
  };

  const handleSaveSlot = (idx) => {
    saveToSlot(idx, fields, strategy, savedProfiles);
    setActiveSlot(idx);
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
          onSave={save}
          onWipe={wipeLocal}
          fields={fields}
          strategy={strategy}
          savedProfiles={savedProfiles}
          activeSlot={activeSlot}
          onLoadSlot={handleLoadSlot}
          onSaveSlot={handleSaveSlot}
          onRenameSlot={renameSlot}
        />

        {missedFields.length > 0 && (
          <Box mt={3}>
            <MissedFieldsPanel missed={missedFields} onAddField={handleAddFromMissed} />
          </Box>
        )}
      </Box>

      <AddFieldModal
        isOpen={isAddOpen}
        onClose={handleModalClose}
        onAdd={(f) => upsertField(f)}
        existingKeys={existingKeys}
        defaultKey={pendingKey}
      />
    </ChakraProvider>
  );
}
