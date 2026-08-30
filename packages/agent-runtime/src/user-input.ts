import type { UserMessage } from "@earendil-works/pi-ai";
import { isPlainObject } from "es-toolkit";

// 上下文引用类型 `@`
export const UserContextReferenceKind = {
  FILE: "file", // 工作区文件
  FOLDER: "folder", // 工作区文件夹
  IMAGE: "image", // 工作区图片
} as const;

export type UserContextReferenceKind =
  (typeof UserContextReferenceKind)[keyof typeof UserContextReferenceKind];

// 用户直接上传的一个附件
export interface RunInputAttachment {
  data: string;
  mimeType: string;
  name: string;
  size: number;
}

// 用户通过 @ 引用的工作区资源
export interface RunInputContextReference {
  kind: UserContextReferenceKind;
  path: string;
}

// 用户发送给 Agent 的完整输入
export interface RunUserInput {
  // 用户从电脑上传的文件，文件内容已经传给后端
  attachments: readonly RunInputAttachment[];
  prompt: string;
  // 用户通过 @ 选择的工作区文件或目录，只传路径，不直接上传内容
  references: readonly RunInputContextReference[];
}

// 保存附件的展示元数据，不再保存完整的 Base64 data
export interface HarnessUserAttachment {
  /**
   * 附件对应消息 content 数组中的位置
   *  const message = {
        content: [
          { type: "text", text: "描述这张图片" }, // 索引 0
          { type: "image", data: "...", mimeType: "image/png" }, // 索引 1
        ],
        attachments: [
          {
            contentIndex: 1,
            mimeType: "image/png",
            name: "diagram.png",
            size: 20480,
          },
        ],
      };
  */
  contentIndex?: number;
  mimeType: string;
  name: string;
  size: number;
}

export interface HarnessUserMessage extends UserMessage {
  // 本次上传附件的元数据
  attachments?: readonly HarnessUserAttachment[];
  // 本次通过 @ 引用的工作区文件或目录
  contextReferences?: readonly RunInputContextReference[];
  // 用户原始输入的文字，用于 Web 界面展示
  displayText: string;
}

export class UserInputContextError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "UserInputContextError";
  }
}

export function isHarnessUserMessage(
  value: unknown,
): value is HarnessUserMessage {
  return (
    isPlainObject(value) &&
    value.role === "user" &&
    typeof value.displayText === "string" &&
    (typeof value.content === "string" || Array.isArray(value.content))
  );
}
