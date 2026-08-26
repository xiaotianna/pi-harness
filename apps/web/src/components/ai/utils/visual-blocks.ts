import { type Static, Type } from "typebox";
import { Value } from "typebox/value";

const ChartBlockDataSchema = Type.Object(
  {
    data: Type.Array(
      Type.Object(
        {
          label: Type.String({ maxLength: 64, minLength: 1 }),
          value: Type.Number(),
        },
        { additionalProperties: false },
      ),
      { maxItems: 24, minItems: 1 },
    ),
    title: Type.String({ maxLength: 120, minLength: 1 }),
  },
  { additionalProperties: false },
);

const FlowBlockDataSchema = Type.Object(
  {
    steps: Type.Array(Type.String({ maxLength: 80, minLength: 1 }), {
      maxItems: 12,
      minItems: 2,
    }),
    title: Type.String({ maxLength: 120, minLength: 1 }),
  },
  { additionalProperties: false },
);

export type ChartBlockData = Static<typeof ChartBlockDataSchema>;
export type FlowBlockData = Static<typeof FlowBlockDataSchema>;

function parseJson(source: string): unknown {
  if (source.length > 20_000) return null;

  try {
    return JSON.parse(source) as unknown;
  } catch {
    return null;
  }
}

export function parseChartBlock(source: string): ChartBlockData | null {
  const value = parseJson(source);
  return Value.Check(ChartBlockDataSchema, value) ? value : null;
}

export function parseFlowBlock(source: string): FlowBlockData | null {
  const value = parseJson(source);
  return Value.Check(FlowBlockDataSchema, value) ? value : null;
}
