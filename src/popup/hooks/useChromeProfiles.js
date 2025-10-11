import { useEffect, useState } from "react";
import { useToast } from "@chakra-ui/react";
import { arrayToObject, objectToArray } from "../utils/kvHelpers";

export function useChromeProfile() {
  const [fields, setFields] = useState([]);
  const [strategy, setStrategy] = useState("smart");
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const { profile, strategy } = await chrome.storage.local.get(["profile", "strategy"]);
      if (profile) setFields(objectToArray(profile));
      if (strategy) setStrategy(strategy);
    })();
  }, []);

  const save = async (nextFields = fields, nextStrategy = strategy) => {
    await chrome.storage.local.set({ profile: arrayToObject(nextFields), strategy: nextStrategy });
    toast({ title: "Perfil guardado", status: "success", duration: 1200 });
  };

  return { fields, setFields, strategy, setStrategy, save };
}
