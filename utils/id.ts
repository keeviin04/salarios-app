// Generador de IDs estable en cliente sin dependencias externas.
// Para producción con Supabase se usarán UUIDs nativos.

export function generateId(prefix = ""): string {
  const random = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return prefix ? `${prefix}-${time}-${random}` : `${time}-${random}`;
}
