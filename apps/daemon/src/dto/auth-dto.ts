import { type Static, Type } from "typebox";

/** 插件 OAuth 回调的查询参数。 */
export const SkillOAuthCallbackDtoSchema = Type.Object({
  code: Type.Optional(Type.String({ minLength: 1 })),
  error: Type.Optional(Type.String({ minLength: 1 })),
  state: Type.Optional(Type.String({ minLength: 1 })),
});

export type SkillOAuthCallbackDto = Static<typeof SkillOAuthCallbackDtoSchema>;

export const GitHubCallbackDtoSchema = SkillOAuthCallbackDtoSchema;
export type GitHubCallbackDto = SkillOAuthCallbackDto;

export const GitHubDeviceDtoSchema = Type.Object({
  state: Type.String({ minLength: 43, maxLength: 43 }),
});
export type GitHubDeviceDto = Static<typeof GitHubDeviceDtoSchema>;
