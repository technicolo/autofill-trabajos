import { Box, Button, HStack, IconButton, Input, Text, Tooltip } from "@chakra-ui/react";
import { DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { useState } from "react";

export default function FieldRow({ item, onChange, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [k, setK] = useState(item.key);
  const [v, setV] = useState(item.value ?? "");

  const save = () => {
    setEditing(false);
    onChange({ oldKey: item.key, key: k.trim(), value: v });
  };

  return (
    <HStack w="full" spacing={2}>
      {editing ? (
        <>
          <Input value={k} onChange={(e) => setK(e.target.value)} maxW="40%" />
          <Input value={v} onChange={(e) => setV(e.target.value)} />
          <Button size="sm" colorScheme="teal" onClick={save}>Guardar</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
        </>
      ) : (
        <>
          <Box flex="1" p={2} borderWidth="1px" borderRadius="lg">
            <Text fontSize="xs" color="gray.500" noOfLines={1}>{item.key}</Text>
            <Text fontWeight="medium" noOfLines={1}>{String(item.value ?? "").trim() || "—"}</Text>
          </Box>
          <Tooltip label="Editar">
            <IconButton aria-label="edit" icon={<EditIcon />} size="sm" onClick={() => setEditing(true)} variant="ghost" />
          </Tooltip>
          <Tooltip label="Eliminar">
            <IconButton aria-label="delete" icon={<DeleteIcon />} size="sm" onClick={onRemove} variant="ghost" />
          </Tooltip>
        </>
      )}
    </HStack>
  );
}
