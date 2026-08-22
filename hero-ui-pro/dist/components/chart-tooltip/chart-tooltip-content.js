'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChartTooltipHeader, ChartTooltipIndicator, ChartTooltipItem, ChartTooltipLabel, ChartTooltipRoot, ChartTooltipValue, } from './chart-tooltip';
// ── Component ────────────────────────────────────────────────────────────────
export const ChartTooltipContent = ({ active, className, hideHeader = false, indicator, label, labelFormatter, payload, valueFormatter, }) => {
    if (!active || !payload?.length)
        return null;
    const headerLabel = labelFormatter ? labelFormatter(label ?? '') : label;
    return (_jsxs(ChartTooltipRoot, { active: active, className: className, indicator: indicator, children: [!hideHeader && headerLabel != null && headerLabel !== '' && (_jsx(ChartTooltipHeader, { children: headerLabel })), payload.map((entry, index) => {
                const color = entry.stroke ||
                    entry.color ||
                    entry.fill ||
                    entry.payload?.fill;
                const displayValue = valueFormatter
                    ? valueFormatter(entry.value ?? '')
                    : entry.value;
                return (_jsxs(ChartTooltipItem, { children: [_jsx(ChartTooltipIndicator, { color: color }), _jsx(ChartTooltipLabel, { children: entry.name ?? entry.dataKey }), _jsx(ChartTooltipValue, { children: displayValue })] }, `${entry.dataKey ?? entry.name ?? 'series'}-${index}`));
            })] }));
};
//# sourceMappingURL=chart-tooltip-content.js.map