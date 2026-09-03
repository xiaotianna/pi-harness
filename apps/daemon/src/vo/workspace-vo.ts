import { UserContextReferenceKind } from "@pi-harness/agent-runtime/user-input";
import { SkillScope } from "@pi-harness/tools";
import { type Static, Type } from "typebox";
import { FileOpenResultStatus } from "../schemas/file-open.js";

export const WorkspaceVoSchema = Type.Object({
  createdAt: Type.Integer({ minimum: 0 }),
  id: Type.String({ format: "uuid" }),
  isAvailable: Type.Boolean(),
  name: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  rootPath: Type.String({ minLength: 1 }),
  updatedAt: Type.Integer({ minimum: 0 }),
});

export type WorkspaceVo = Static<typeof WorkspaceVoSchema>;

export const WorkspaceListVoSchema = Type.Array(WorkspaceVoSchema);

export const WorkspaceContextItemVoSchema = Type.Object({
  kind: Type.Union([
    Type.Literal(UserContextReferenceKind.FILE),
    Type.Literal(UserContextReferenceKind.FOLDER),
    Type.Literal(UserContextReferenceKind.IMAGE),
  ]),
  path: Type.String({ minLength: 1 }),
});

export const WorkspaceContextItemListVoSchema = Type.Array(WorkspaceContextItemVoSchema);
export type WorkspaceContextItemVo = Static<typeof WorkspaceContextItemVoSchema>;

export const OpenWorkspacePathVoSchema = Type.Object({
  status: Type.Union([
    Type.Literal(FileOpenResultStatus.APPLICATION_REQUIRED),
    Type.Literal(FileOpenResultStatus.CANCELLED),
    Type.Literal(FileOpenResultStatus.OPENED),
  ]),
});

export type OpenWorkspacePathVo = Static<typeof OpenWorkspacePathVoSchema>;

export const WorkspaceSkillVoSchema = Type.Object({
  description: Type.String({ minLength: 1 }),
  directory: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  id: Type.String({ minLength: 1 }),
  isEnabled: Type.Boolean(),
  name: Type.String({ minLength: 1 }),
  scope: Type.Union([
    Type.Literal(SkillScope.SYSTEM),
    Type.Literal(SkillScope.PROJECT),
    Type.Literal(SkillScope.GLOBAL),
  ]),
});

export type WorkspaceSkillVo = Static<typeof WorkspaceSkillVoSchema>;

export const WorkspaceSkillListVoSchema = Type.Array(WorkspaceSkillVoSchema);

export const WorkspaceSkillContentVoSchema = Type.Object({
  content: Type.String({ minLength: 1 }),
});

export type WorkspaceSkillContentVo = Static<typeof WorkspaceSkillContentVoSchema>;

export const WorkspaceSkillInstallVoSchema = Type.Object({
  installedSkillNames: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
});

export type WorkspaceSkillInstallVo = Static<typeof WorkspaceSkillInstallVoSchema>;
