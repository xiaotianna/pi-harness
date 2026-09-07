export const SkillConnectionErrorCode = {
  BAD_GATEWAY_PATH: "SKILL_GATEWAY_PATH_INVALID",
  COLLECTION_NOT_FOUND: "SKILL_COLLECTION_NOT_FOUND",
  NOT_CONNECTED: "SKILL_CONNECTION_REQUIRED",
  NOT_INSTALLED: "SKILL_COLLECTION_NOT_INSTALLED",
  SKILL_NOT_FOUND: "SKILL_NOT_FOUND",
  OAUTH_FAILED: "SKILL_OAUTH_FAILED",
  OAUTH_STATE_INVALID: "SKILL_OAUTH_STATE_INVALID",
  UPSTREAM_FAILED: "SKILL_GATEWAY_UPSTREAM_FAILED",
} as const;

export type SkillConnectionErrorCode =
  (typeof SkillConnectionErrorCode)[keyof typeof SkillConnectionErrorCode];

export class SkillConnectionError extends Error {
  public constructor(
    public readonly code: SkillConnectionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SkillConnectionError";
  }
}

export interface SkillConnectionStatus {
  account: {
    avatarUrl: string | null;
    displayName: string | null;
    id: string;
    username: string;
  } | null;
  collectionId: string;
  isConnected: boolean;
}

export interface SkillGatewayResponse {
  body: Buffer;
  contentType: string;
  statusCode: number;
}
