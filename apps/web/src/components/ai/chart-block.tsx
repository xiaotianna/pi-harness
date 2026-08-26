import { BarChart } from "@agile-avocation/ui-pro/bar-chart";
import { Surface } from "@heroui/react";
import type { ChartBlockData } from "./utils/visual-blocks";

export function ChartBlock({ data }: { data: ChartBlockData }) {
  return (
    <Surface className="mb-3 rounded-2xl p-4" variant="secondary">
      <figure>
        <figcaption className="mb-3 text-sm font-medium text-foreground">{data.title}</figcaption>
        <BarChart data={data.data} height={220} margin={{ bottom: 0, left: -16, right: 8, top: 8 }}>
          <BarChart.Grid vertical={false} />
          <BarChart.XAxis dataKey="label" />
          <BarChart.YAxis />
          <BarChart.Bar
            dataKey="value"
            fill="var(--accent)"
            isAnimationActive={false}
            radius={[6, 6, 0, 0]}
          />
          <BarChart.Tooltip content={<BarChart.TooltipContent />} />
        </BarChart>
      </figure>
    </Surface>
  );
}
