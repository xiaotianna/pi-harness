import { SkillScope } from "@pi-harness/tools";
import { type Static, Type } from "typebox";

export const WorkspaceVoSchema = Type.Object({
  createdAt: Type.Integer({ minimum: 0 }),
  id: Type.String({ format: "uuid" }),
  name: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  rootPath: Type.String({ minLength: 1 }),
  updatedAt: Type.Integer({ minimum: 0 }),
});

export type WorkspaceVo = Static<typeof WorkspaceVoSchema>;

export const WorkspaceListVoSchema = Type.Array(WorkspaceVoSchema);

export const WorkspaceSkillVoSchema = Type.Object({
  description: Type.String({ minLength: 1 }),
  directory: Type.String({ minLength: 1 }),
  id: Type.String({ minLength: 1 }),
  isEnabled: Type.Boolean(),
  name: Type.String({ minLength: 1 }),
  scope: Type.Union([Type.Literal(SkillScope.PROJECT), Type.Literal(SkillScope.GLOBAL)]),
});

export type WorkspaceSkillVo = Static<typeof WorkspaceSkillVoSchema>;

export const WorkspaceSkillListVoSchema = Type.Array(WorkspaceSkillVoSchema);

export const WorkspaceSkillContentVoSchema = Type.Object({
  content: Type.String({ minLength: 1 }),
});

export type WorkspaceSkillContentVo = Static<typeof WorkspaceSkillContentVoSchema>;
