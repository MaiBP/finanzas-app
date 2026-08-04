export function normalizeSpaceName(value: FormDataEntryValue | null, maxLength: number) {
  const name = String(value ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > maxLength) throw new Error(`El nombre debe tener entre 2 y ${maxLength} caracteres.`);
  return name;
}
