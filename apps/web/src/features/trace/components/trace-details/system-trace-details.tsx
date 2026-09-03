import { Wrench } from "@gravity-ui/icons";
import { Disclosure, Tabs } from "@heroui/react";
import type { AgentTraceRecord } from "../../types/agent-trace";
import { TraceDetailCode, TraceDetailMarkdown } from "./trace-detail-content";

export function SystemTraceDetails({ record }: { record: AgentTraceRecord }) {
  const details = record.systemPrompt;

  return (
    <Tabs
      className="flex min-h-0 flex-1 flex-col gap-0!"
      defaultSelectedKey="system-prompt"
      variant="secondary"
    >
      <Tabs.ListContainer className="w-full shrink-0 px-2">
        <Tabs.List aria-label="System prompt details">
          <Tabs.Tab className="w-auto! flex-none px-4 text-xs" id="system-prompt">
            System Prompt
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab className="w-auto! flex-none px-4 text-xs" id="tools">
            Tools
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>

      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="system-prompt">
        <TraceDetailMarkdown>
          {details?.content || "该历史 Run 未记录系统提示词。"}
        </TraceDetailMarkdown>
      </Tabs.Panel>

      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto p-0!" id="tools">
        {details?.tools.length ? (
          <div className="divide-y divide-separator">
            {details.tools.map((tool) => (
              <Disclosure key={tool.name}>
                <Disclosure.Heading>
                  <Disclosure.Trigger className="group relative z-0 flex min-h-8 w-full min-w-0 items-center gap-2 px-2 py-2 text-left hover:z-10 hover:bg-default hover:shadow-surface data-[focus-visible=true]:z-10 data-[focus-visible=true]:bg-default data-[focus-visible=true]:shadow-surface">
                    <Disclosure.Indicator className="shrink-0 text-muted" />
                    <Wrench className="size-3 shrink-0 text-muted" />
                    <code className="shrink-0 text-[13px] text-foreground">{tool.name}</code>
                    <span className="min-w-0 truncate text-[13px] text-muted">
                      {tool.description}
                    </span>
                  </Disclosure.Trigger>
                </Disclosure.Heading>
                <Disclosure.Content>
                  <Disclosure.Body className="px-2 pt-0 pb-2">
                    <p className="mb-2 text-[13px] leading-5 text-muted">{tool.description}</p>
                    <TraceDetailCode
                      ariaLabel={`复制 ${tool.name} 参数 Schema`}
                      code={tool.parameters}
                      isHeaderHidden
                      name="参数 Schema"
                    />
                  </Disclosure.Body>
                </Disclosure.Content>
              </Disclosure>
            ))}
          </div>
        ) : (
          <p className="px-4 py-3 text-[13px] text-muted">
            {details ? "本次 Run 没有向模型提供工具。" : "该历史 Run 未记录工具定义。"}
          </p>
        )}
      </Tabs.Panel>
    </Tabs>
  );
}
