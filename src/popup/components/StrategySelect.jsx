import { Select, Text } from "@chakra-ui/react";

export default function StrategySelect({ value, onChange }) {
  return (
    <>
      <Text fontSize="sm" mt={2} mb={2}>Estrategia de mapeo</Text>
      <Select value={value} onChange={(e) => onChange(e.target.value)} borderRadius="xl">
        <option value="smart">Smart (labels/placeholders/aria)</option>
        <option value="name">Sólo por name/id</option>
      </Select>
    </>
  );
}
