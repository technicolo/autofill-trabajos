import { Button, Divider, HStack, Text, VStack } from "@chakra-ui/react";

export default function ActionsRow({
  onFill, onPreview, onClear, onLoad, onSave, onWipe, fields, strategy
}) {
  return (
    <VStack align="stretch" spacing={3} mt={4}>
      <HStack spacing={3}>
        <Button onClick={onFill} colorScheme="blue" flex="1">Rellenar</Button>
        <Button onClick={onPreview} variant="outline" flex="1">Previsualizar</Button>
      </HStack>

      <HStack spacing={3}>
        <Button onClick={onClear} variant="outline" flex="1">Limpiar</Button>
        <Button onClick={onLoad} flex="1">Cargar</Button>
      </HStack>

      <HStack spacing={3}>
        <Button onClick={() => onSave(fields, strategy)} colorScheme="teal" variant="solid" flex="1">Guardar perfil</Button>
        <Button onClick={onWipe} colorScheme="red" variant="solid" flex="1">Borrar datos locales</Button>
      </HStack>

      <Divider />
      <Text fontSize="xs" color="gray.500">
        Consejo: mantené el envío manual. Respetá los Términos de cada sitio y evitá spam.
      </Text>
    </VStack>
  );
}
