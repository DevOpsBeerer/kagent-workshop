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


export type FetchUsersResult =
  | { kind: "ok"; logins: string[] }
  | { kind: "error"; message: string }
  | { kind: "aborted" };

export async function fetchUsers(signal?: AbortSignal): Promise<FetchUsersResult> {
  try {
    const response = await fetch("/api/users", { signal });
    if (!response.ok) {
      return { kind: "error", message: `HTTP ${response.status}` };
    }
    const data = (await response.json()) as string[];
    return { kind: "ok", logins: data };
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


export type CreateUserResult =
  | { kind: "ok" }
  | { kind: "duplicate" }
  | { kind: "invalid"; message: string }
  | { kind: "error"; message: string };

export async function createUser(login: string): Promise<CreateUserResult> {
  try {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login }),
    });
    if (response.status === 201) return { kind: "ok" };
    if (response.status === 409) return { kind: "duplicate" };
    if (response.status === 400) {
      return { kind: "invalid", message: "Login invalide" };
    }
    return { kind: "error", message: `HTTP ${response.status}` };
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "unknown",
    };
  }
}


export type DeleteUserResult =
  | { kind: "ok" }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

export async function deleteUser(login: string): Promise<DeleteUserResult> {
  try {
    const response = await fetch(`/api/users/${encodeURIComponent(login)}`, {
      method: "DELETE",
    });
    if (response.status === 204) return { kind: "ok" };
    if (response.status === 404) return { kind: "not-found" };
    return { kind: "error", message: `HTTP ${response.status}` };
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "unknown",
    };
  }
}


export type ResetBulbsResult =
  | { kind: "ok" }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

export async function resetBulbs(login?: string): Promise<ResetBulbsResult> {
  const url = login
    ? `/api/bulbs/reset?user=${encodeURIComponent(login)}`
    : `/api/bulbs/reset`;
  try {
    const response = await fetch(url, { method: "POST" });
    if (response.status === 204) return { kind: "ok" };
    if (response.status === 404) return { kind: "not-found" };
    return { kind: "error", message: `HTTP ${response.status}` };
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "unknown",
    };
  }
}
