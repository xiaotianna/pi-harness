import { SkillScope } from "@pi-harness/tools";
import { type Static, Type } from "typebox";

export const WorkspaceParamsDtoSchema = Type.Object({
  workspaceId: Type.String({ format: "uuid" }),
});

export type WorkspaceParamsDto = Static<typeof WorkspaceParamsDtoSchema>;

export const WorkspaceSkillParamsDtoSchema = Type.Object({
  name: Type.String({ maxLength: 64, minLength: 1, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
  scope: Type.Union([
    Type.Literal(SkillScope.SYSTEM),
    Type.Literal(SkillScope.PROJECT),
    Type.Literal(SkillScope.GLOBAL),
  ]),
  workspaceId: Type.String({ format: "uuid" }),
});

export type WorkspaceSkillParamsDto = Static<typeof WorkspaceSkillParamsDtoSchema>;

export const WritableWorkspaceSkillParamsDtoSchema = Type.Object({
  name: Type.String({ maxLength: 64, minLength: 1, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
  scope: Type.Union([Type.Literal(SkillScope.PROJECT), Type.Literal(SkillScope.GLOBAL)]),
  workspaceId: Type.String({ format: "uuid" }),
});

export type WritableWorkspaceSkillParamsDto = Static<typeof WritableWorkspaceSkillParamsDtoSchema>;

export const UpdateWorkspaceSkillDtoSchema = Type.Object({
  isEnabled: Type.Boolean(),
});

export type UpdateWorkspaceSkillDto = Static<typeof UpdateWorkspaceSkillDtoSchema>;

export const InstallWorkspaceSkillDtoSchema = Type.Object({
  skillName: Type.Optional(
    Type.String({ maxLength: 64, minLength: 1, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
  ),
  source: Type.String({ maxLength: 2_048, minLength: 1 }),
});

export type InstallWorkspaceSkillDto = Static<typeof InstallWorkspaceSkillDtoSchema>;

export const OpenWorkspacePathDtoSchema = Type.Object({
  path: Type.String({ maxLength: 4_096, minLength: 1 }),
});

export type OpenWorkspacePathDto = Static<typeof OpenWorkspacePathDtoSchema>;

export const ReorderWorkspacesDtoSchema = Type.Object({
  workspaceIds: Type.Array(Type.String({ format: "uuid" }), {
    maxItems: 1_000,
    uniqueItems: true,
  }),
});

export type ReorderWorkspacesDto = Static<typeof ReorderWorkspacesDtoSchema>;

export const UpdateWorkspaceDtoSchema = Type.Object({
  name: Type.String({ maxLength: 200, minLength: 1 }),
});

export type UpdateWorkspaceDto = Static<typeof UpdateWorkspaceDtoSchema>;
