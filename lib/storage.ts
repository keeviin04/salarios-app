// Helpers genéricos para persistir el estado en localStorage de forma segura.

export function loadFromStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage lleno o deshabilitado: degradación silenciosa.
  }
}

export function clearStorage(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}
