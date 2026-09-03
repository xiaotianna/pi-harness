import { Tabs } from "@heroui/react";
import type { AgentTraceRecord } from "../../types/agent-trace";
import { TraceDetailCode, TraceDetailText } from "./trace-detail-content";

export function ContextTraceDetails({ record }: { record: AgentTraceRecord }) {
  return (
    <Tabs
      className="flex min-h-0 flex-1 flex-col gap-0!"
      defaultSelectedKey="summary"
      variant="secondary"
    >
      <Tabs.ListContainer className="shrink-0 px-2">
        <Tabs.List aria-label="上下文轨迹详情分类">
          <Tabs.Tab className="text-xs" id="summary">
            摘要
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab className="text-xs" id="checkpoint">
            Checkpoint
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab className="text-xs" id="raw">
            原始数据
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>
      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="summary">
        <TraceDetailText>{`${record.summary}\n\n${record.preview}`}</TraceDetailText>
      </Tabs.Panel>
      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto p-2" id="checkpoint">
        <TraceDetailCode
          ariaLabel="复制上下文 Checkpoint"
          code={record.raw.checkpoint ?? {}}
          name="Checkpoint"
        />
      </Tabs.Panel>
      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto p-2" id="raw">
        <TraceDetailCode
          ariaLabel="复制原始上下文轨迹数据"
          code={record.raw}
          name={`${record.id}.json`}
        />
      </Tabs.Panel>
    </Tabs>
  );
}
