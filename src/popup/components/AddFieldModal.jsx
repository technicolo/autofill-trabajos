import {
  Button, HStack, VStack, Input, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Tag, TagLabel, Text, SimpleGrid
} from "@chakra-ui/react";
import { useEffect, useState } from "react";

const COMMON_FIELDS = [
  { key: "fullName", label: "Nombre completo" },
  { key: "firstName", label: "Nombre" },
  { key: "lastName", label: "Apellido" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Teléfono" },
  { key: "city", label: "Ciudad" },
  { key: "province", label: "Provincia/Estado" },
  { key: "country", label: "País" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "github", label: "GitHub" },
  { key: "portfolio", label: "Portfolio / Website" },
  { key: "position", label: "Puesto / Rol" },
  { key: "expectedSalary", label: "Pretensión salarial" },
  { key: "resume", label: "Resumen / Sobre mí" },
];

export default function AddFieldModal({ isOpen, onClose, onAdd, existingKeys = [] }) {
  const [mode, setMode] = useState("common"); // common | custom
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setMode("common"); setSearch(""); setSelectedKey(""); setCustomKey(""); setValue("");
    }
  }, [isOpen]);

  const pool = COMMON_FIELDS.filter(
    (f) =>
      !existingKeys.includes(f.key) &&
      (f.label.toLowerCase().includes(search.toLowerCase()) ||
        f.key.toLowerCase().includes(search.toLowerCase()))
  );

  const finalKey = mode === "custom" ? customKey.trim() : selectedKey.trim();

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="2xl">
        <ModalHeader>Añadir campo</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <HStack mb={3} spacing={3}>
            <Button variant={mode === "common" ? "solid" : "outline"} onClick={() => setMode("common")} size="sm">
              Predeterminados
            </Button>
            <Button variant={mode === "custom" ? "solid" : "outline"} onClick={() => setMode("custom")} size="sm">
              Personalizado
            </Button>
          </HStack>

          {mode === "common" ? (
            <VStack align="stretch" spacing={3}>
              <Input placeholder="Buscar campo (email, LinkedIn, ciudad...)" value={search} onChange={(e) => setSearch(e.target.value)} />
              <SimpleGrid columns={2} spacing={2} maxH="240px" overflowY="auto">
                {pool.map((f) => (
                  <Tag key={f.key} cursor="pointer" onClick={() => setSelectedKey(f.key)}
                    colorScheme={selectedKey === f.key ? "teal" : "gray"}
                    variant={selectedKey === f.key ? "solid" : "subtle"}>
                    <TagLabel>{f.label}</TagLabel>
                  </Tag>
                ))}
                {pool.length === 0 && <Text fontSize="sm">Sin resultados</Text>}
              </SimpleGrid>
              <Input placeholder="Valor" value={value} onChange={(e) => setValue(e.target.value)} />
            </VStack>
          ) : (
            <VStack align="stretch" spacing={3}>
              <Input placeholder="Clave (ej: twitter, stackOverflow, seniority)" value={customKey} onChange={(e) => setCustomKey(e.target.value)} />
              <Input placeholder="Valor" value={value} onChange={(e) => setValue(e.target.value)} />
            </VStack>
          )}
        </ModalBody>
        <ModalFooter>
          <HStack spacing={3}>
            <Button onClick={onClose} variant="ghost">Cancelar</Button>
            <Button colorScheme="teal" onClick={() => { if (!finalKey) return; onAdd({ key: finalKey, value }); onClose(); }}>
              Agregar
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
