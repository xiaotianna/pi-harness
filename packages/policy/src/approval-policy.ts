export const ApprovalPolicy = {
  AUTO_APPROVE: "auto_approve",
  FULL_ACCESS: "full_access",
  REQUEST_APPROVAL: "request_approval",
} as const;

export type ApprovalPolicy = (typeof ApprovalPolicy)[keyof typeof ApprovalPolicy];

export function isApprovalPolicy(value: unknown): value is ApprovalPolicy {
  return Object.values(ApprovalPolicy).some((policy) => policy === value);
}
