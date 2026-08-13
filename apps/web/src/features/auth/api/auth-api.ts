import { type Static, Type } from "typebox";
import { Value } from "typebox/value";

const AuthSessionResponseSchema = Type.Union([
  Type.Object({ authenticated: Type.Literal(false) }),
  Type.Object({
    authenticated: Type.Literal(true),
    user: Type.Object({
      id: Type.String({ minLength: 1 }),
      username: Type.String({ minLength: 1 }),
      displayName: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
      avatarUrl: Type.String({ format: "uri" }),
      profileUrl: Type.String({ format: "uri" }),
    }),
  }),
]);

export type AuthSessionResponse = Static<typeof AuthSessionResponseSchema>;

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getAuthSession(): Promise<AuthSessionResponse> {
  const body = await fetchJson("/api/auth/session");
  if (!Value.Check(AuthSessionResponseSchema, body)) {
    throw new Error("The daemon returned an invalid auth session response");
  }
  return body;
}

export async function logout(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "X-PI-Workbench-Request": "1",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
}
