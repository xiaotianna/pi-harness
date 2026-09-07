import { SkillType } from "@pi-harness/tools";
import { type Static, Type } from "typebox";

const SkillTypeSchema = Type.Union([Type.Literal(SkillType.NONE), Type.Literal(SkillType.OAUTH)]);

const SkillCollectionItemVoSchema = Type.Object({
  description: Type.String({ minLength: 1 }),
  icon: Type.Union([
    Type.String({ maxLength: 400_000, pattern: "^data:image/svg\\+xml;base64," }),
    Type.Null(),
  ]),
  id: Type.String({ minLength: 1 }),
  isEnabled: Type.Boolean(),
  name: Type.String({ minLength: 1 }),
  type: SkillTypeSchema,
});

export const SkillCollectionVoSchema = Type.Object({
  category: Type.Union([Type.Literal("developer"), Type.Literal("productivity")]),
  description: Type.String({ minLength: 1 }),
  id: Type.String({ minLength: 1 }),
  isInstalled: Type.Boolean(),
  logo: Type.Union([
    Type.String({ maxLength: 400_000, pattern: "^data:image/svg\\+xml;base64," }),
    Type.Null(),
  ]),
  name: Type.String({ minLength: 1 }),
  skills: Type.Array(SkillCollectionItemVoSchema, { minItems: 1 }),
  type: SkillTypeSchema,
});

export const SkillCollectionListVoSchema = Type.Array(SkillCollectionVoSchema);
export type SkillCollectionVo = Static<typeof SkillCollectionVoSchema>;

export const SkillCollectionSkillContentVoSchema = Type.Object({
  content: Type.String({ minLength: 1 }),
});

export type SkillCollectionSkillContentVo = Static<typeof SkillCollectionSkillContentVoSchema>;

const SkillConnectionAccountVoSchema = Type.Object({
  avatarUrl: Type.Union([Type.String({ format: "uri" }), Type.Null()]),
  displayName: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  id: Type.String({ minLength: 1 }),
  username: Type.String({ minLength: 1 }),
});

export const SkillConnectionStatusVoSchema = Type.Object({
  account: Type.Union([SkillConnectionAccountVoSchema, Type.Null()]),
  collectionId: Type.String({ minLength: 1 }),
  isConnected: Type.Boolean(),
});

export type SkillConnectionStatusVo = Static<typeof SkillConnectionStatusVoSchema>;

export const SkillOAuthStartVoSchema = Type.Object({
  authorizationUrl: Type.String({ format: "uri" }),
});

export type SkillOAuthStartVo = Static<typeof SkillOAuthStartVoSchema>;
