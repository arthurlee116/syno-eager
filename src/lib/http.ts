export function toSearchParams(params: Record<string, string>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) sp.set(k, v);
  return sp.toString();
}

export async function readErrorMessage(res: Response): Promise<string | undefined> {
  try {
    const data: unknown = await res.clone().json();
    if (data && typeof data === "object") {
      const err = (data as Record<string, unknown>).error;
      if (typeof err === "string" && err.trim()) return err.trim();
    }
  } catch {
    // ignore
  }

  try {
    const txt = await res.clone().text();
    if (txt && txt.trim()) return txt.trim().slice(0, 300);
  } catch {
    // ignore
  }

  return undefined;
}

