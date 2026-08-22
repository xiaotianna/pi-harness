import { LineChartGrid, LineChartLine, LineChartRoot, LineChartTooltip, LineChartTooltipContent, LineChartXAxis, LineChartYAxis, } from './line-chart';
export { lineChartVariants } from './line-chart.styles';
export { CartesianGrid as LineChartGrid, Line as LineChartLine, Tooltip as LineChartTooltip, XAxis as LineChartXAxis, YAxis as LineChartYAxis, } from 'recharts';
const LineChart = Object.assign(LineChartRoot, {
    Grid: LineChartGrid,
    Line: LineChartLine,
    Root: LineChartRoot,
    Tooltip: LineChartTooltip,
    TooltipContent: LineChartTooltipContent,
    XAxis: LineChartXAxis,
    YAxis: LineChartYAxis,
});
export { LineChart, LineChartRoot, LineChartTooltipContent };
//# sourceMappingURL=index.js.map