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
