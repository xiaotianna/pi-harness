import { type Static, Type } from "typebox";

export const SkillConnectionParamsDtoSchema = Type.Object({
  collectionId: Type.String({ minLength: 1, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
});

export type SkillConnectionParamsDto = Static<typeof SkillConnectionParamsDtoSchema>;

export const SkillCollectionSkillParamsDtoSchema = Type.Object({
  collectionId: Type.String({ minLength: 1, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
  skillId: Type.String({ minLength: 1 }),
});

export type SkillCollectionSkillParamsDto = Static<typeof SkillCollectionSkillParamsDtoSchema>;

export const UpdateSkillCollectionSkillDtoSchema = Type.Object({
  isEnabled: Type.Boolean(),
});

export type UpdateSkillCollectionSkillDto = Static<typeof UpdateSkillCollectionSkillDtoSchema>;

export const SkillGatewayParamsDtoSchema = Type.Object({
  "*": Type.String({ maxLength: 2_048, minLength: 1 }),
  collectionId: Type.String({ minLength: 1, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
});

export type SkillGatewayParamsDto = Static<typeof SkillGatewayParamsDtoSchema>;
