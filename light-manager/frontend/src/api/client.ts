import type { BulbDto, UserStateDto } from "../types";

export type FetchBulbsResult =
  | { kind: "ok"; bulbs: BulbDto[] }
  | { kind: "not-found" }
  | { kind: "error"; message: string }
  | { kind: "aborted" };

export async function fetchBulbs(
  login: string,
  signal?: AbortSignal,
): Promise<FetchBulbsResult> {
  const url = `/api/bulbs?user=${encodeURIComponent(login)}`;
  try {
    const response = await fetch(url, { signal });
    if (response.status === 404) {
      return { kind: "not-found" };
    }
    if (!response.ok) {
      return { kind: "error", message: `HTTP ${response.status}` };
    }
    const data = (await response.json()) as BulbDto[];
    return { kind: "ok", bulbs: data };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { kind: "aborted" };
    }
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "unknown",
    };
  }
}


export type FetchStateResult =
  | { kind: "ok"; users: UserStateDto[] }
  | { kind: "error"; message: string }
  | { kind: "aborted" };

export async function fetchState(signal?: AbortSignal): Promise<FetchStateResult> {
  try {
    const response = await fetch("/api/state", { signal });
    if (!response.ok) {
      return { kind: "error", message: `HTTP ${response.status}` };
    }
    const data = (await response.json()) as UserStateDto[];
    return { kind: "ok", users: data };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { kind: "aborted" };
    }
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "unknown",
    };
  }
}
