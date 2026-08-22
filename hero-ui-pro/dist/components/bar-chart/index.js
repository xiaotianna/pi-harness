import { Bar, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltipContent as BarChartTooltipContent } from '../chart-tooltip/chart-tooltip-content';
import { BarChartRoot } from './bar-chart';
export { barChartVariants } from './bar-chart.styles';
export { Bar as BarChartBar, CartesianGrid as BarChartGrid, Tooltip as BarChartTooltip, XAxis as BarChartXAxis, YAxis as BarChartYAxis, } from 'recharts';
export const BarChart = Object.assign(BarChartRoot, {
    Bar,
    Grid: CartesianGrid,
    Root: BarChartRoot,
    Tooltip,
    TooltipContent: BarChartTooltipContent,
    XAxis,
    YAxis,
});
export { BarChartRoot, BarChartTooltipContent };
//# sourceMappingURL=index.js.map