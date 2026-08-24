export class ApiRequestError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function apiRequest(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init?.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(init?.method === undefined || init.method === "GET"
        ? {}
        : { "X-PI-Harness-Request": "1" }),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      code?: unknown;
      message?: unknown;
    } | null;
    throw new ApiRequestError(
      response.status,
      typeof body?.code === "string" ? body.code : null,
      typeof body?.message === "string" ? body.message : `请求失败，状态码：${response.status}`,
    );
  }

  return response;
}
