import { useState } from "react";
import { Box, Grid, HStack, Input, Text, Button, VStack } from "@chakra-ui/react";
import { EditIcon } from "@chakra-ui/icons";

const DEFAULT_NAMES = ["Perfil 1", "Perfil 2", "Perfil 3", "Perfil 4"];

export default function ProfileSlots({ slots, activeSlot, onLoad, onSave, onRename }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editName, setEditName] = useState("");

  const startEdit = (idx, e) => {
    e.stopPropagation();
    setEditingIdx(idx);
    setEditName(slots[idx]?.name || DEFAULT_NAMES[idx]);
  };

  const confirmEdit = (idx) => {
    onRename(idx, editName.trim() || DEFAULT_NAMES[idx]);
    setEditingIdx(null);
  };

  return (
    <VStack align="stretch" spacing={2}>
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide">
        Perfiles guardados
      </Text>
      <Grid templateColumns="1fr 1fr" gap={2}>
        {slots.map((slot, idx) => {
          const isActive = activeSlot === idx;
          const name = slot?.name || DEFAULT_NAMES[idx];
          return (
            <Box
              key={idx}
              borderWidth="1.5px"
              borderRadius="lg"
              p={2}
              borderColor={isActive ? "blue.400" : "gray.200"}
              bg={isActive ? "blue.50" : "gray.50"}
              transition="all 0.15s"
            >
              <HStack spacing={1} mb={1} minH="24px">
                {editingIdx === idx ? (
                  <Input
                    size="xs"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => confirmEdit(idx)}
                    onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(idx); if (e.key === "Escape") setEditingIdx(null); }}
                    autoFocus
                    borderRadius="md"
                  />
                ) : (
                  <>
                    <Text fontSize="xs" fontWeight="semibold" flex="1" noOfLines={1} color={isActive ? "blue.700" : "gray.700"}>
                      {name}
                    </Text>
                    <Box
                      as="button"
                      onClick={(e) => startEdit(idx, e)}
                      color="gray.400"
                      _hover={{ color: "gray.600" }}
                      p="1px"
                      title="Renombrar"
                    >
                      <EditIcon boxSize={3} />
                    </Box>
                  </>
                )}
              </HStack>
              <HStack spacing={1}>
                <Button
                  size="xs"
                  flex="1"
                  onClick={() => onLoad(idx)}
                  colorScheme="blue"
                  variant={isActive ? "solid" : "outline"}
                >
                  Cargar
                </Button>
                <Button
                  size="xs"
                  flex="1"
                  onClick={() => onSave(idx)}
                  colorScheme="teal"
                  variant="outline"
                >
                  Guardar
                </Button>
              </HStack>
            </Box>
          );
        })}
      </Grid>
    </VStack>
  );
}
