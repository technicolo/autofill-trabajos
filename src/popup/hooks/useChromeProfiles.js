import { useEffect, useState } from "react";
import { useToast } from "@chakra-ui/react";
import { arrayToObject, objectToArray } from "../utils/kvHelpers";

const makeEmptySlots = () =>
  Array.from({ length: 4 }, (_, i) => ({ name: `Perfil ${i + 1}`, fields: {}, strategy: "smart" }));

export function useChromeProfile() {
  const [fields, setFields] = useState([]);
  const [strategy, setStrategy] = useState("smart");
  const [savedProfiles, setSavedProfiles] = useState(makeEmptySlots);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const { profile, strategy, savedProfiles } = await chrome.storage.local.get(["profile", "strategy", "savedProfiles"]);
      if (profile) setFields(objectToArray(profile));
      if (strategy) setStrategy(strategy);
      if (savedProfiles) {
        const defaults = makeEmptySlots();
        setSavedProfiles(defaults.map((def, i) => savedProfiles[i] ?? def));
      }
    })();
  }, []);

  const save = async (nextFields = fields, nextStrategy = strategy) => {
    await chrome.storage.local.set({ profile: arrayToObject(nextFields), strategy: nextStrategy });
    toast({ title: "Perfil guardado", status: "success", duration: 1200 });
  };

  const saveToSlot = async (idx, nextFields, nextStrategy, currentProfiles) => {
    const base = currentProfiles ?? savedProfiles;
    const updated = base.map((slot, i) =>
      i === idx ? { ...slot, fields: arrayToObject(nextFields), strategy: nextStrategy } : slot
    );
    setSavedProfiles(updated);
    await chrome.storage.local.set({ savedProfiles: updated });
    toast({ title: `Guardado en "${updated[idx].name}"`, status: "success", duration: 1200 });
  };

  const loadFromSlot = (idx) => {
    const slot = savedProfiles[idx];
    if (!slot?.fields || Object.keys(slot.fields).length === 0) return null;
    return { fields: objectToArray(slot.fields), strategy: slot.strategy || "smart" };
  };

  const renameSlot = async (idx, name) => {
    const updated = savedProfiles.map((slot, i) => (i === idx ? { ...slot, name } : slot));
    setSavedProfiles(updated);
    await chrome.storage.local.set({ savedProfiles: updated });
  };

  return { fields, setFields, strategy, setStrategy, save, savedProfiles, saveToSlot, loadFromSlot, renameSlot };
}
