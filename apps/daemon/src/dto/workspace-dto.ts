import { type Static, Type } from "typebox";

export const WorkspaceParamsDtoSchema = Type.Object({
  workspaceId: Type.String({ format: "uuid" }),
});

export type WorkspaceParamsDto = Static<typeof WorkspaceParamsDtoSchema>;

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
