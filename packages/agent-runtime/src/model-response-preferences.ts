import type { Api, Model } from "@earendil-works/pi-ai";
import { isPlainObject } from "es-toolkit";

export const OutputDetail = {
  HIGH: "high",
  LOW: "low",
  MEDIUM: "medium",
  MODEL_DEFAULT: "model_default",
} as const;

export type OutputDetail = (typeof OutputDetail)[keyof typeof OutputDetail];

export const ReasoningSummary = {
  AUTO: "auto",
  CONCISE: "concise",
  DETAILED: "detailed",
} as const;

export type ReasoningSummary = (typeof ReasoningSummary)[keyof typeof ReasoningSummary];

export function isOutputDetail(value: string): value is OutputDetail {
  return Object.values(OutputDetail).includes(value as OutputDetail);
}

export function isReasoningSummary(value: string): value is ReasoningSummary {
  return Object.values(ReasoningSummary).includes(value as ReasoningSummary);
}

export function applyModelResponsePreferences(
  payload: unknown,
  model: Model<Api>,
  outputDetail: OutputDetail,
  reasoningSummary: ReasoningSummary,
  isReasoningEnabled: boolean,
): unknown {
  if (!isPlainObject(payload)) return payload;

  let nextPayload = payload;
  if (model.api === "openai-codex-responses" && outputDetail !== OutputDetail.MODEL_DEFAULT) {
    nextPayload = {
      ...nextPayload,
      text: {
        ...(isPlainObject(nextPayload.text) ? nextPayload.text : {}),
        verbosity: outputDetail,
      },
    };
  }

  if (
    isReasoningEnabled &&
    reasoningSummary !== ReasoningSummary.AUTO &&
    (model.api === "openai-codex-responses" ||
      model.api === "openai-responses" ||
      model.api === "azure-openai-responses") &&
    isPlainObject(nextPayload.reasoning)
  ) {
    nextPayload = {
      ...nextPayload,
      reasoning: { ...nextPayload.reasoning, summary: reasoningSummary },
    };
  }

  return nextPayload;
}
