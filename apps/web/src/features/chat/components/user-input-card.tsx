"use client";

import { ChevronLeft, ChevronRight, CircleQuestion, ListCheck } from "@gravity-ui/icons";
import {
  Button,
  Card,
  Description,
  InputGroup,
  Label,
  ListBox,
  ScrollShadow,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import type { InputRequestedData } from "@pi-harness/agent-runtime/harness-event";
import type {
  EditablePlan,
  UserInputAnswer,
  UserInputSubmission,
} from "@pi-harness/agent-runtime/user-input";
import {
  UserInputRequestKind,
  UserInputResponseAction,
} from "@pi-harness/agent-runtime/user-input";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useRef, useState } from "react";
import { userInputOptionMarker } from "../utils/session-user-input";

interface AnswerDraft {
  selectedOptions?: string[];
  value: string;
}

export function UserInputCard({
  onCancel,
  onResolve,
  request,
}: {
  onCancel: () => Promise<void>;
  onResolve: (submission: UserInputSubmission) => Promise<void>;
  request: InputRequestedData;
}) {
  const titleId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [pageDirection, setPageDirection] = useState(1);
  const shouldReduceMotion = useReducedMotion();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialPlan = useMemo<EditablePlan | null>(
    () =>
      request.plan
        ? {
            ...(request.plan.explanation === undefined
              ? {}
              : { explanation: request.plan.explanation }),
            plan: request.plan.plan,
          }
        : null,
    [request.plan],
  );
  const [plan, setPlan] = useState<EditablePlan | null>(initialPlan);
  const isPlanReview = request.kind === UserInputRequestKind.PLAN_REVIEW && plan !== null;
  const currentQuestion = request.questions[currentQuestionIndex] ?? request.questions[0];
  const shouldShowNextPage =
    currentQuestion?.multiSelect === true && currentQuestionIndex < request.questions.length - 1;
  const changeQuestion = (index: number) => {
    const nextIndex = Math.max(0, Math.min(request.questions.length - 1, index));
    if (nextIndex === currentQuestionIndex) return;
    setPageDirection(nextIndex > currentQuestionIndex ? 1 : -1);
    setCurrentQuestionIndex(nextIndex);
  };
  const hasPlanChanges = useMemo(
    () => initialPlan !== null && JSON.stringify(plan) !== JSON.stringify(initialPlan),
    [initialPlan, plan],
  );

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

  const resolvePlan = (action: UserInputSubmission["action"]) => {
    if (plan === null) return;
    if (plan.plan.some(({ step }) => !step.trim())) {
      toast.warning("计划步骤不能为空");
      return;
    }
    const note = answers[request.questions[0]?.id ?? ""]?.value.trim();
    if (action === UserInputResponseAction.SUBMIT && !note && !hasPlanChanges) {
      toast.warning("请修改计划或补充调整意见");
      return;
    }
    submit({
      action,
      answers: request.questions.map((question) => ({
        questionId: question.id,
        value:
          action === UserInputResponseAction.CONFIRM_PLAN
            ? "确认并开始执行"
            : (note ?? "请按我编辑后的计划继续调整"),
      })),
      plan,
    });
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
          {isPlanReview ? (
            <ListCheck className="size-4 text-accent" />
          ) : (
            <CircleQuestion className="size-4 text-accent" />
          )}
          <Card.Title id={titleId} className="text-sm font-medium">
            {isPlanReview ? "确认执行计划" : "需要你的补充"}
          </Card.Title>
        </div>
        {!isPlanReview && request.questions.length > 1 ? (
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

      <Card.Content className="min-h-0 p-0">
        <ScrollShadow
          ref={scrollRef}
          hideScrollBar
          className="relative max-h-[min(48svh,24rem)] px-0.5 py-1"
        >
          {isPlanReview ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted">{request.questions[0]?.question}</p>
              <TextField>
                <Label>计划说明</Label>
                <TextArea
                  fullWidth
                  maxLength={2_000}
                  placeholder="说明计划的目标和取舍"
                  value={plan.explanation ?? ""}
                  variant="secondary"
                  onChange={(event) =>
                    setPlan((current) =>
                      current ? { ...current, explanation: event.target.value } : current,
                    )
                  }
                />
              </TextField>
              <div className="flex flex-col gap-3">
                {plan.plan.map((step, index) => (
                  <TextField key={`${index}-${step.status}`}>
                    <Label>步骤 {index + 1}</Label>
                    <TextArea
                      fullWidth
                      maxLength={1_000}
                      value={step.step}
                      variant="secondary"
                      onChange={(event) =>
                        setPlan((current) =>
                          current
                            ? {
                                ...current,
                                plan: current.plan.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, step: event.target.value }
                                    : item,
                                ),
                              }
                            : current,
                        )
                      }
                    />
                  </TextField>
                ))}
              </div>
              <TextField>
                <Label>调整意见</Label>
                <TextArea
                  fullWidth
                  maxLength={4_000}
                  placeholder="可选：告诉 Agent 还要怎样调整"
                  value={answers[request.questions[0]?.id ?? ""]?.value ?? ""}
                  variant="secondary"
                  onChange={(event) => {
                    const questionId = request.questions[0]?.id;
                    if (!questionId) return;
                    setAnswers((current) => ({
                      ...current,
                      [questionId]: { value: event.target.value },
                    }));
                  }}
                />
              </TextField>
            </div>
          ) : currentQuestion ? (
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
          {isPlanReview ? (
            <>
              <Button
                isDisabled={isSubmitting || isCancelling}
                size="sm"
                variant="secondary"
                onPress={() => resolvePlan(UserInputResponseAction.SUBMIT)}
              >
                继续修改
              </Button>
              <Button
                isDisabled={
                  isSubmitting || isCancelling || plan.plan.some(({ step }) => !step.trim())
                }
                isPending={isSubmitting}
                size="sm"
                onPress={() => resolvePlan(UserInputResponseAction.CONFIRM_PLAN)}
              >
                确认并开始
              </Button>
            </>
          ) : (
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
          )}
        </div>
      </Card.Footer>
    </Card>
  );
}
