import { type Static, Type } from "typebox";

/** 健康检查的响应结构。 */
export const HealthVoSchema = Type.Object({
  status: Type.Literal("ok"),
});

export type HealthVo = Static<typeof HealthVoSchema>;
