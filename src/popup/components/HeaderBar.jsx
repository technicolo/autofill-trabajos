import { HStack, Heading, IconButton, Tooltip } from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";

export default function HeaderBar({ onAdd }) {
  return (
    <HStack justify="space-between" mb={2}>
      <Heading size="md">Job Autofill Helper</Heading>
      <Tooltip label="Añadir campo">
        <IconButton aria-label="add" icon={<AddIcon />} onClick={onAdd} borderRadius="full" colorScheme="teal" size="sm" />
      </Tooltip>
    </HStack>
  );
}
