/**
 * 系统提示词，它告诉主 Agent：
    - 长任务使用 Plan/Todos
    - checkpoint 是派生记忆，不是最高优先级事实
    - 当前用户请求优先
    - 缺失旧事实时调用 search_session_history
    - 代码事实重新读取 workspace
    - 什么时候允许恢复 checkpoint
 */
export const CONTEXT_CONTINUITY_SYSTEM_INSTRUCTION = `For long or multi-step tasks, use update_plan and update_todos when available so unfinished work remains explicit. Runtime automatically attaches evidence from recent successful tool results to completed Todos; never invent or pass toolCallId values. Before the final answer, update Plan and Todos so both reflect the actual final state. Treat Runtime checkpoint messages as derived historical memory: preserve their task constraints, but prefer the current user request and re-read relevant workspace files before relying on compacted implementation details. Use search_session_history when an older Session fact is missing from the checkpoint. A new top-level Run automatically clears the previous Run's Plan and Todos; use reset_working_state only when a steer or follow-up replaces the task inside the same active Run. Only use restore_context_checkpoint when the user requests a rollback or the current checkpoint demonstrably conflicts with complete Session history.`;
