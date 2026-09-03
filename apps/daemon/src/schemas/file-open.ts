export const FileOpenMode = {
  ALWAYS: "always",
  ASK: "ask",
} as const;

export type FileOpenMode = (typeof FileOpenMode)[keyof typeof FileOpenMode];

export const FileOpenResultStatus = {
  APPLICATION_REQUIRED: "application-required",
  CANCELLED: "cancelled",
  OPENED: "opened",
} as const;

export type FileOpenResultStatus = (typeof FileOpenResultStatus)[keyof typeof FileOpenResultStatus];
