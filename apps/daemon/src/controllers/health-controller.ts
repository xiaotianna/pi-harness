import type { HealthVo } from "../vo/health-vo.js";

/** 处理健康检查请求。 */
export class HealthController {
  public getHealth = async (): Promise<HealthVo> => {
    return { status: "ok" };
  };
}
