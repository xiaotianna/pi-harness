import { Cell, Label, Pie, Tooltip } from 'recharts';
import { ChartTooltipContent as PieChartTooltipContent } from '../chart-tooltip/chart-tooltip-content';
import { PieChartRoot } from './pie-chart';
export { pieChartVariants } from './pie-chart.styles';
export { Cell as PieChartCell, Label as PieChartLabel, Pie as PieChartPie, Tooltip as PieChartTooltip, } from 'recharts';
const PieChart = Object.assign(PieChartRoot, {
    Cell,
    Label,
    Pie,
    Root: PieChartRoot,
    Tooltip,
    TooltipContent: PieChartTooltipContent,
});
export { PieChart, PieChartRoot, PieChartTooltipContent };
//# sourceMappingURL=index.js.map