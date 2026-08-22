import { Area, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltipContent as AreaChartTooltipContent } from '../chart-tooltip/chart-tooltip-content';
import { AreaChartRoot } from './area-chart';
export { areaChartVariants } from './area-chart.styles';
export { Area as AreaChartArea, CartesianGrid as AreaChartGrid, Tooltip as AreaChartTooltip, XAxis as AreaChartXAxis, YAxis as AreaChartYAxis, } from 'recharts';
export const AreaChart = Object.assign(AreaChartRoot, {
    Area,
    Grid: CartesianGrid,
    Root: AreaChartRoot,
    Tooltip,
    TooltipContent: AreaChartTooltipContent,
    XAxis,
    YAxis,
});
export { AreaChartRoot, AreaChartTooltipContent };
//# sourceMappingURL=index.js.map