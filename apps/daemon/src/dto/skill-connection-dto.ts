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

export const SkillCollectionAppParamsDtoSchema = Type.Object({
  appId: Type.String({ minLength: 1, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
  collectionId: Type.String({ minLength: 1, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
});

export type SkillCollectionAppParamsDto = Static<typeof SkillCollectionAppParamsDtoSchema>;

export const UpdateSkillCollectionAppDtoSchema = Type.Object({
  isEnabled: Type.Boolean(),
});

export type UpdateSkillCollectionAppDto = Static<typeof UpdateSkillCollectionAppDtoSchema>;

export const PutSkillCollectionAppCredentialDtoSchema = Type.Object({
  values: Type.Record(
    Type.String({ maxLength: 128, minLength: 1 }),
    Type.String({ maxLength: 16_384 }),
    { maxProperties: 64 },
  ),
});

export type PutSkillCollectionAppCredentialDto = Static<
  typeof PutSkillCollectionAppCredentialDtoSchema
>;

export const SkillGatewayParamsDtoSchema = Type.Object({
  "*": Type.String({ maxLength: 2_048, minLength: 1 }),
  collectionId: Type.String({ minLength: 1, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
});

export type SkillGatewayParamsDto = Static<typeof SkillGatewayParamsDtoSchema>;
