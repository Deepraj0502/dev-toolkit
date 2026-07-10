export async function loadTextAsset(path: string): Promise<string> {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load asset ${path}: ${response.statusText} (${response.status})`);
  }
  return response.text();
}
