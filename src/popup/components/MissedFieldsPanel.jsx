import { useState } from "react";
import { Box, Button, Collapse, HStack, Tag, Text, VStack } from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon, WarningTwoIcon } from "@chakra-ui/icons";

export default function MissedFieldsPanel({ missed, onAddField }) {
  const [open, setOpen] = useState(true);

  if (!missed || missed.length === 0) return null;

  return (
    <Box borderWidth="1.5px" borderRadius="lg" borderColor="orange.300" overflow="hidden">
      <HStack
        px={3} py={2}
        bg="orange.50"
        cursor="pointer"
        justify="space-between"
        onClick={() => setOpen((v) => !v)}
        _hover={{ bg: "orange.100" }}
        transition="background 0.15s"
      >
        <HStack spacing={2}>
          <WarningTwoIcon color="orange.400" boxSize={3.5} />
          <Text fontSize="sm" fontWeight="semibold" color="orange.700">
            {missed.length} campo{missed.length > 1 ? "s" : ""} sin completar
          </Text>
        </HStack>
        <HStack spacing={2}>
          <Text fontSize="xs" color="orange.500">
            {open ? "Ocultar" : "Ver"}
          </Text>
          {open ? <ChevronUpIcon color="orange.400" /> : <ChevronDownIcon color="orange.400" />}
        </HStack>
      </HStack>

      <Collapse in={open} animateOpacity>
        <VStack align="stretch" spacing={0} divider={<Box borderBottomWidth="1px" borderColor="orange.100" />}>
          {missed.map((f, i) => (
            <HStack key={i} px={3} py={2} bg="white" justify="space-between" spacing={2}>
              <VStack align="start" spacing={0} flex="1" minW={0}>
                <Text fontSize="xs" fontWeight="medium" color="gray.700" noOfLines={1}>
                  {f.label || f.suggestedKey}
                </Text>
                {f.label && f.suggestedKey !== f.label && (
                  <Text fontSize="xs" color="gray.400" fontFamily="mono" noOfLines={1}>
                    {f.suggestedKey}
                  </Text>
                )}
              </VStack>
              <HStack spacing={1} flexShrink={0}>
                {f.fieldType === "select" && (
                  <Tag size="sm" colorScheme="purple" variant="subtle" fontSize="10px">select</Tag>
                )}
                <Button
                  size="xs"
                  colorScheme="orange"
                  variant="outline"
                  onClick={() => onAddField(f.suggestedKey)}
                >
                  + Agregar
                </Button>
              </HStack>
            </HStack>
          ))}
        </VStack>
        <Box px={3} py={2} bg="orange.50">
          <Text fontSize="xs" color="orange.600">
            Agregalos a tu perfil para que se rellenen la próxima vez.
          </Text>
        </Box>
      </Collapse>
    </Box>
  );
}
