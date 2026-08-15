"use client";

import { Disclosure } from "@heroui/react";
import {
  Check,
  ChevronDown,
  Circle,
  CircleCheck,
  Globe2,
  ImageIcon,
  LoaderCircle,
  Search,
} from "lucide-react";
import styles from "./aicss-components.module.css";

export interface ThinkingStateProps {
  label?: string;
}

export function ThinkingState({ label = "Thinking" }: ThinkingStateProps) {
  return <span className={styles.shimmer}>{label}</span>;
}

export interface ThinkingReasoningProps {
  defaultExpanded?: boolean;
  isStreaming?: boolean;
  steps: ReadonlyArray<{ content: string; label: string }>;
  trigger: string;
}

export function ThinkingReasoning({
  defaultExpanded = false,
  isStreaming = false,
  steps,
  trigger,
}: ThinkingReasoningProps) {
  return (
    <Disclosure className={styles.reasoning ?? ""} defaultExpanded={defaultExpanded || isStreaming}>
      <Disclosure.Heading>
        <Disclosure.Trigger className={styles.reasoningTrigger ?? ""}>
          <span className={isStreaming ? styles.shimmer : styles.reasoningLabel}>
            {isStreaming ? "Thinking…" : trigger}
          </span>
          {!isStreaming ? <ChevronDown className={styles.chevron} /> : null}
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body className={styles.reasoningBody ?? ""}>
          {steps.map((step) => (
            <div className={styles.reasoningStep} key={step.label}>
              <span className={styles.reasoningStepLabel}>{step.label}</span>
              <p>{step.content}</p>
            </div>
          ))}
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}

export interface OrbsProps {
  label: string;
}

export function Orbs({ label }: OrbsProps) {
  return (
    <div aria-label={label} className={styles.orbs} role="status">
      <span />
      <span />
      <span />
      <span className={styles.orbsLabel}>{label}</span>
    </div>
  );
}

export type WebSearchSource = {
  domain: string;
  status: "pending" | "resolved";
  title: string;
  url: string;
};

export interface WebSearchProps {
  isSearching?: boolean;
  query: string;
  sources: readonly WebSearchSource[];
}

export function WebSearch({ isSearching = false, query, sources }: WebSearchProps) {
  return (
    <section className={styles.webSearch}>
      <div className={styles.webSearchHeader}>
        <Search aria-hidden className={styles.statusIcon} />
        {isSearching ? (
          <ThinkingState label={`Searching “${query}”`} />
        ) : (
          <span>搜索了“{query}”</span>
        )}
      </div>
      <ul className={styles.webSearchSources}>
        {sources.map((source) => (
          <li key={source.url}>
            {source.status === "resolved" ? (
              <CircleCheck aria-hidden className={styles.resolvedIcon} />
            ) : (
              <Globe2 aria-hidden className={styles.pendingIcon} />
            )}
            <a href={source.url} rel="noreferrer" target="_blank">
              <span>{source.title}</span>
              <small>{source.domain}</small>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export interface ImageGenerationProps {
  alt?: string;
  imageUrl?: string;
  isGenerating?: boolean;
  prompt: string;
}

export function ImageGeneration({
  alt = "AI 生成图片",
  imageUrl,
  isGenerating = false,
  prompt,
}: ImageGenerationProps) {
  return (
    <figure className={styles.imageGeneration}>
      <div className={styles.imageCanvas}>
        {imageUrl ? (
          <img alt={alt} src={imageUrl} />
        ) : (
          <div aria-label="图片生成中" className={styles.imagePlaceholder} role="status">
            <ImageIcon aria-hidden />
          </div>
        )}
      </div>
      <figcaption>
        {isGenerating ? <ThinkingState label="Generating image" /> : <span>已生成图片</span>}
        <small>“{prompt}”</small>
      </figcaption>
    </figure>
  );
}

export type TaskListItem = {
  label: string;
  status: "completed" | "in-progress" | "pending";
};

export interface TaskListProps {
  defaultExpanded?: boolean;
  items: readonly TaskListItem[];
  title?: string;
}

export function TaskList({ defaultExpanded = true, items, title = "To-dos" }: TaskListProps) {
  const completed = items.filter((item) => item.status === "completed").length;

  return (
    <Disclosure className={styles.taskList ?? ""} defaultExpanded={defaultExpanded}>
      <Disclosure.Heading>
        <Disclosure.Trigger className={styles.taskListTrigger ?? ""}>
          <span className={styles.taskListLeading}>
            {completed === items.length ? (
              <CircleCheck aria-hidden className={styles.completedIcon} />
            ) : (
              <ChevronDown aria-hidden className={styles.chevron} />
            )}
            <span>{title}</span>
          </span>
          <span className={styles.taskCount}>
            {completed}/{items.length}
          </span>
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body>
          <ul className={styles.tasks}>
            {items.map((item) => (
              <li className={styles[item.status]} key={item.label}>
                {item.status === "completed" ? <Check aria-hidden /> : null}
                {item.status === "in-progress" ? <LoaderCircle aria-hidden /> : null}
                {item.status === "pending" ? <Circle aria-hidden /> : null}
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}
