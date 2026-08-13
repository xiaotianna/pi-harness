import { type Static, Type } from "typebox";

/** GitHub OAuth 回调的查询参数。 */
export const GitHubCallbackDtoSchema = Type.Object({
  code: Type.Optional(Type.String({ minLength: 1 })),
  error: Type.Optional(Type.String({ minLength: 1 })),
  state: Type.Optional(Type.String({ minLength: 1 })),
});

export type GitHubCallbackDto = Static<typeof GitHubCallbackDtoSchema>;
