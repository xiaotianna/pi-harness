export const SandboxProfile = {
  READ_ONLY: "read_only",
  WORKSPACE_WRITE: "workspace_write",
} as const;

export type SandboxProfile = (typeof SandboxProfile)[keyof typeof SandboxProfile];
