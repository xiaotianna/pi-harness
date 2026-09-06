"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleQuestion,
  Pencil,
  Xmark as X,
} from "@gravity-ui/icons";
import {
  Button,
  Card,
  Description,
  InputGroup,
  Label,
  ListBox,
  ScrollShadow,
  TextField,
  Tooltip,
  toast,
} from "@heroui/react";
import type { InputRequestedData } from "@pi-harness/agent-runtime/harness-event";
import type { UserInputAnswer, UserInputSubmission } from "@pi-harness/agent-runtime/user-input";
import {
  UserInputRequestKind,
  UserInputResponseAction,
  type UserInputResponseActionValue,
} from "@pi-harness/agent-runtime/user-input";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState } from "react";
import { userInputOptionMarker } from "../utils/session-user-input";

interface AnswerDraft {
  selectedOptions?: string[];
  value: string;
}

type UserInputCardProps = {
  onCancel: () => Promise<void>;
  onResolve: (submission: UserInputSubmission) => Promise<void>;
  request: InputRequestedData;
};

function PlanReviewInputCard({ onCancel, onResolve, request }: UserInputCardProps) {
  const titleId = useId();
  const [feedback, setFeedback] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [pendingAction, setPendingAction] = useState<UserInputResponseActionValue | null>(null);
  const question = request.questions[0];

  const submit = (action: UserInputResponseActionValue, value: string) => {
    if (!question) return;
    setPendingAction(action);
    void onResolve({
      action,
      answers: [{ questionId: question.id, value }],
    }).catch((error: unknown) => {
      setPendingAction(null);
      toast.danger(error instanceof Error ? error.message : "提交计划反馈失败");
    });
  };

  return (
    <Card aria-labelledby={titleId} aria-modal="true" className="w-full gap-2 p-3" role="dialog">
      <Card.Header className="flex-row items-center justify-between gap-2">
        <Card.Title id={titleId} className="text-sm font-medium">
          实施此计划？
        </Card.Title>
        <Tooltip delay={0}>
          <Button
            isIconOnly
            aria-label="停止任务"
            className="size-7 min-w-7 p-0"
            isDisabled={pendingAction !== null || isCancelling}
            isPending={isCancelling}
            size="sm"
            variant="ghost"
            onPress={() => {
              setIsCancelling(true);
              void onCancel().catch((error: unknown) => {
                setIsCancelling(false);
                toast.danger(error instanceof Error ? error.message : "停止任务失败");
              });
            }}
          >
            <X className="size-4" />
          </Button>
          <Tooltip.Content>停止任务</Tooltip.Content>
        </Tooltip>
      </Card.Header>
      <Card.Content className="flex flex-col gap-1 p-0">
        <Button
          fullWidth
          className="min-h-10 justify-start gap-2 px-2"
          isDisabled={pendingAction !== null || isCancelling}
          isPending={pendingAction === UserInputResponseAction.CONFIRM_PLAN}
          variant="secondary"
          onPress={() => submit(UserInputResponseAction.CONFIRM_PLAN, "是，实施此计划")}
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs text-muted">
            1
          </span>
          <span className="text-sm">是，实施此计划</span>
          <span className="ml-auto mr-1 flex size-7 shrink-0 items-center justify-center">
            <ArrowRight className="size-4 text-muted" />
          </span>
        </Button>
        <TextField isDisabled={pendingAction !== null || isCancelling}>
          <Label className="sr-only">计划修改意见</Label>
          <InputGroup fullWidth className="min-h-10 rounded-full" variant="secondary">
            <InputGroup.Prefix className="border-0 px-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
                <Pencil className="size-3.5" />
              </span>
            </InputGroup.Prefix>
            <InputGroup.Input
              maxLength={4_000}
              placeholder="否，并告诉 AI 应该如何做得不同"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || !feedback.trim()) return;
                event.preventDefault();
                submit(UserInputResponseAction.SUBMIT, feedback.trim());
              }}
            />
            <InputGroup.Suffix className="border-0 pr-3">
              <Tooltip delay={0}>
                <Button
                  isIconOnly
                  aria-label="提交计划修改意见"
                  className="size-7 min-w-7 p-0"
                  isDisabled={!feedback.trim() || pendingAction !== null || isCancelling}
                  isPending={pendingAction === UserInputResponseAction.SUBMIT}
                  size="sm"
                  variant="ghost"
                  onPress={() => submit(UserInputResponseAction.SUBMIT, feedback.trim())}
                >
                  <ArrowRight className="size-4" />
                </Button>
                <Tooltip.Content>提交修改意见</Tooltip.Content>
              </Tooltip>
            </InputGroup.Suffix>
          </InputGroup>
        </TextField>
      </Card.Content>
    </Card>
  );
}

function QuestionInputCard({ onCancel, onResolve, request }: UserInputCardProps) {
  const titleId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [pageDirection, setPageDirection] = useState(1);
  const shouldReduceMotion = useReducedMotion();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentQuestion = request.questions[currentQuestionIndex] ?? request.questions[0];
  const shouldShowNextPage =
    currentQuestion?.multiSelect === true && currentQuestionIndex < request.questions.length - 1;
  const changeQuestion = (index: number) => {
    const nextIndex = Math.max(0, Math.min(request.questions.length - 1, index));
    if (nextIndex === currentQuestionIndex) return;
    setPageDirection(nextIndex > currentQuestionIndex ? 1 : -1);
    setCurrentQuestionIndex(nextIndex);
  };

  const submit = (submission: UserInputSubmission) => {
    setIsSubmitting(true);
    void onResolve(submission).catch((error: unknown) => {
      setIsSubmitting(false);
      toast.danger(error instanceof Error ? error.message : "提交回答失败");
    });
  };

  const readAnswers = (): UserInputAnswer[] | null => {
    const result = request.questions.map((question) => {
      const answer = answers[question.id];
      if (!answer?.value.trim()) return null;
      const selectedOption = answer.selectedOptions?.[0];
      return {
        questionId: question.id,
        ...(answer.selectedOptions !== undefined && selectedOption !== undefined
          ? question.multiSelect
            ? { selectedOptions: answer.selectedOptions }
            : { selectedOption }
          : {}),
        value: answer.value.trim(),
      } satisfies UserInputAnswer;
    });
    return result.every((answer) => answer !== null) ? result : null;
  };

  return (
    <Card
      aria-labelledby={titleId}
      aria-modal="true"
      className="max-h-[min(68svh,34rem)] w-full gap-2 overflow-hidden p-3"
      role="dialog"
    >
      <Card.Header className="shrink-0 flex-row items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <CircleQuestion className="size-4 text-accent" />
          <Card.Title id={titleId} className="text-sm font-medium">
            需要你的补充
          </Card.Title>
        </div>
        {request.questions.length > 1 ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              isIconOnly
              aria-label="上一题"
              className="size-7 min-w-7 p-0"
              isDisabled={currentQuestionIndex === 0 || isSubmitting || isCancelling}
              size="sm"
              variant="ghost"
              onPress={() => changeQuestion(currentQuestionIndex - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-8 text-center text-xs tabular-nums text-muted">
              {currentQuestionIndex + 1}/{request.questions.length}
            </span>
            <Button
              isIconOnly
              aria-label="下一题"
              className="size-7 min-w-7 p-0"
              isDisabled={
                currentQuestionIndex === request.questions.length - 1 ||
                isSubmitting ||
                isCancelling
              }
              size="sm"
              variant="ghost"
              onPress={() => changeQuestion(currentQuestionIndex + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </Card.Header>

      <Card.Content className="min-h-0 overflow-hidden p-0">
        <ScrollShadow
          ref={scrollRef}
          hideScrollBar
          className="relative max-h-[min(48svh,24rem)] overflow-y-auto overscroll-y-contain px-0.5 py-1"
          orientation="vertical"
        >
          {currentQuestion ? (
            <AnimatePresence
              initial={false}
              custom={pageDirection}
              mode="popLayout"
              onExitComplete={() => {
                // 旧页移除只改变 scrollHeight，ScrollShadow 的容器 ResizeObserver 不会捕获它。
                requestAnimationFrame(() => scrollRef.current?.dispatchEvent(new Event("scroll")));
              }}
            >
              <motion.section
                className="flex flex-col gap-2"
                key={currentQuestion.id}
                custom={pageDirection}
                initial="enter"
                animate="center"
                exit="exit"
                variants={{
                  enter: (direction: number) => ({
                    opacity: 0,
                    x: shouldReduceMotion ? 0 : direction * 40,
                  }),
                  center: { opacity: 1, x: 0 },
                  exit: (direction: number) => ({
                    opacity: 0,
                    x: shouldReduceMotion ? 0 : direction * -40,
                    pointerEvents: "none",
                  }),
                }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: "easeOut" }}
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <Label className="text-sm">{currentQuestion.header}</Label>
                  {currentQuestion.multiSelect ? (
                    <Description className="text-xs">可多选</Description>
                  ) : null}
                  <Description className="text-xs">{currentQuestion.question}</Description>
                </div>
                <div>
                  <ListBox
                    aria-label={currentQuestion.question}
                    className="p-0"
                    selectedKeys={new Set(answers[currentQuestion.id]?.selectedOptions ?? [])}
                    selectionMode={currentQuestion.multiSelect ? "multiple" : "single"}
                    selectionBehavior="toggle"
                    disabledKeys={
                      isSubmitting || isCancelling
                        ? currentQuestion.options.map(({ label }) => label)
                        : []
                    }
                    onSelectionChange={(keys) => {
                      const selectedOptions = currentQuestion.options
                        .filter(({ label }) => keys === "all" || keys.has(label))
                        .map(({ label }) => label);
                      setAnswers((current) => ({
                        ...current,
                        [currentQuestion.id]: {
                          selectedOptions,
                          value: selectedOptions.join("、"),
                        },
                      }));
                      if (!currentQuestion.multiSelect && selectedOptions.length > 0) {
                        changeQuestion(currentQuestionIndex + 1);
                      }
                    }}
                  >
                    {currentQuestion.options.map((option, index) => (
                      <ListBox.Item
                        className="min-h-10 gap-2 px-2 py-1 data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent-soft-foreground"
                        id={option.label}
                        key={option.label}
                        textValue={`${option.label} ${option.description ?? ""}`}
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-surface-secondary text-[11px] font-medium text-muted">
                          {userInputOptionMarker(index)}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <Label className="shrink-0 text-sm">{option.label}</Label>
                          {option.description ? (
                            <Description className="text-xs">{option.description}</Description>
                          ) : null}
                        </div>
                        <ListBox.ItemIndicator className="text-accent-soft-foreground" />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                  {currentQuestion.allowCustomInput !== false ? (
                    <TextField
                      aria-label="自己输入"
                      className="mt-1"
                      isDisabled={isSubmitting || isCancelling}
                      onFocus={() =>
                        setAnswers((current) => ({
                          ...current,
                          [currentQuestion.id]: {
                            value: current[currentQuestion.id]?.selectedOptions?.length
                              ? ""
                              : (current[currentQuestion.id]?.value ?? ""),
                          },
                        }))
                      }
                    >
                      <InputGroup fullWidth className="min-h-10" variant="secondary">
                        <InputGroup.Prefix className="border-0 px-2">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-surface-secondary text-[11px] font-medium text-muted">
                            {userInputOptionMarker(currentQuestion.options.length)}
                          </span>
                        </InputGroup.Prefix>
                        <InputGroup.Input
                          maxLength={4_000}
                          placeholder="自己输入"
                          value={
                            answers[currentQuestion.id]?.selectedOptions?.length
                              ? ""
                              : (answers[currentQuestion.id]?.value ?? "")
                          }
                          onChange={(event) =>
                            setAnswers((current) => ({
                              ...current,
                              [currentQuestion.id]: { value: event.target.value },
                            }))
                          }
                        />
                      </InputGroup>
                    </TextField>
                  ) : null}
                </div>
              </motion.section>
            </AnimatePresence>
          ) : null}
        </ScrollShadow>
      </Card.Content>

      <Card.Footer className="shrink-0 justify-between gap-2">
        <Button
          isDisabled={isSubmitting || isCancelling}
          isPending={isCancelling}
          size="sm"
          variant="ghost"
          onPress={() => {
            setIsCancelling(true);
            void onCancel().catch((error: unknown) => {
              setIsCancelling(false);
              toast.danger(error instanceof Error ? error.message : "停止任务失败");
            });
          }}
        >
          停止任务
        </Button>
        <div className="flex items-center gap-2">
          <Button
            isDisabled={
              isSubmitting ||
              isCancelling ||
              (shouldShowNextPage
                ? !answers[currentQuestion.id]?.value.trim()
                : readAnswers() === null)
            }
            isPending={isSubmitting}
            size="sm"
            onPress={() => {
              if (shouldShowNextPage) {
                changeQuestion(currentQuestionIndex + 1);
                return;
              }
              const resolvedAnswers = readAnswers();
              if (resolvedAnswers) {
                submit({
                  action: UserInputResponseAction.SUBMIT,
                  answers: resolvedAnswers,
                });
              }
            }}
          >
            {shouldShowNextPage ? "下一页" : "提交回答"}
          </Button>
        </div>
      </Card.Footer>
    </Card>
  );
}

export function UserInputCard(props: UserInputCardProps) {
  return props.request.kind === UserInputRequestKind.PLAN_REVIEW ? (
    <PlanReviewInputCard {...props} />
  ) : (
    <QuestionInputCard {...props} />
  );
}
