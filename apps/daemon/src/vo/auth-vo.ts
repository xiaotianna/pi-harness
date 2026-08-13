import { Type } from "typebox";

const AuthUserVoSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  username: Type.String({ minLength: 1 }),
  displayName: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  avatarUrl: Type.String({ format: "uri" }),
  profileUrl: Type.String({ format: "uri" }),
});

/** 当前登录会话的响应结构。 */
export const AuthSessionVoSchema = Type.Union([
  Type.Object({ authenticated: Type.Literal(false) }),
  Type.Object({ authenticated: Type.Literal(true), user: AuthUserVoSchema }),
]);

/** API 错误的统一响应结构。 */
export const ApiErrorVoSchema = Type.Object({
  code: Type.String({ minLength: 1 }),
  message: Type.String({ minLength: 1 }),
});
