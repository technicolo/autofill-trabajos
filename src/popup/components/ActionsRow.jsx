import { Button, Divider, HStack, Text, VStack } from "@chakra-ui/react";
import ProfileSlots from "./ProfileSlots";

export default function ActionsRow({
  onFill, onPreview, onClear, onSave, onWipe, fields, strategy,
  savedProfiles, activeSlot, onLoadSlot, onSaveSlot, onRenameSlot,
}) {
  return (
    <VStack align="stretch" spacing={3} mt={4}>
      <HStack spacing={3}>
        <Button onClick={onFill} colorScheme="blue" flex="1">Rellenar</Button>
        <Button onClick={onPreview} variant="outline" flex="1">Previsualizar</Button>
      </HStack>

      <HStack spacing={3}>
        <Button onClick={onClear} variant="outline" flex="1">Limpiar</Button>
        <Button onClick={() => onSave(fields, strategy)} colorScheme="teal" variant="solid" flex="1">Guardar perfil</Button>
      </HStack>

      <Button onClick={onWipe} colorScheme="red" variant="solid" w="full">Borrar datos locales</Button>

      <Divider />

      <ProfileSlots
        slots={savedProfiles}
        activeSlot={activeSlot}
        onLoad={onLoadSlot}
        onSave={onSaveSlot}
        onRename={onRenameSlot}
      />

      <Divider />
      <Text fontSize="xs" color="gray.500">
        Consejo: mantené el envío manual. Respetá los Términos de cada sitio y evitá spam.
      </Text>
    </VStack>
  );
}
