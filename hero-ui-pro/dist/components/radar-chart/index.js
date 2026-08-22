import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, Tooltip, } from 'recharts';
import { ChartTooltipContent as RadarChartTooltipContent } from '../chart-tooltip/chart-tooltip-content';
import { RadarChartRoot } from './radar-chart';
export { radarChartVariants } from './radar-chart.styles';
export { PolarAngleAxis as RadarChartAngleAxis, PolarGrid as RadarChartGrid, Radar as RadarChartRadar, PolarRadiusAxis as RadarChartRadiusAxis, Tooltip as RadarChartTooltip, } from 'recharts';
const RadarChart = Object.assign(RadarChartRoot, {
    AngleAxis: PolarAngleAxis,
    Grid: PolarGrid,
    Radar,
    RadiusAxis: PolarRadiusAxis,
    Root: RadarChartRoot,
    Tooltip,
    TooltipContent: RadarChartTooltipContent,
});
export { RadarChart, RadarChartRoot, RadarChartTooltipContent };
//# sourceMappingURL=index.js.map