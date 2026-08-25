export const PathPolicyErrorCode = {
  INVALID: "PATH_INVALID",
  OUTSIDE_WORKSPACE: "PATH_OUTSIDE_WORKSPACE",
  PROTECTED: "PATH_PROTECTED",
} as const;

export type PathPolicyErrorCode = (typeof PathPolicyErrorCode)[keyof typeof PathPolicyErrorCode];

export class PathPolicyError extends Error {
  public constructor(
    public readonly code: PathPolicyErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PathPolicyError";
  }
}

export function invalidPath(message: string): PathPolicyError {
  return new PathPolicyError(PathPolicyErrorCode.INVALID, message);
}
