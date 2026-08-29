"use client";

import type { UseKanbanReturn } from "@agile-avocation/ui-pro/kanban";
import { Kanban, useKanban, useKanbanColumn } from "@agile-avocation/ui-pro/kanban";
import { Ellipsis, Plus } from "@gravity-ui/icons";
import { Avatar, Button, ProgressBar, ScrollShadow } from "@heroui/react";
import { useState } from "react";

interface ProjectTask {
  assignees: Array<{ avatar: string; name: string }>;
  category: string;
  categoryColor: string;
  dueDate?: string;
  id: string;
  status: string;
  subtasksCompleted?: number;
  subtasksTotal?: number;
  title: string;
}

const avatars = {
  alex: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg",
  emily: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/white.jpg",
  jake: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/black.jpg",
  maria: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg",
  sam: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/red.jpg",
  sarah: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg",
};

const projectTasks: ProjectTask[] = [
  {
    assignees: [{ avatar: avatars.sam, name: "Sam" }],
    category: "Research",
    categoryColor: "#8b5cf6",
    id: "p1",
    status: "Backlog",
    title: "Research competitor onboarding patterns",
  },
  {
    assignees: [{ avatar: avatars.alex, name: "Alex" }],
    category: "Engineering",
    categoryColor: "#3b82f6",
    id: "p2",
    status: "Backlog",
    title: "Audit analytics event naming",
  },
  {
    assignees: [
      { avatar: avatars.emily, name: "Emily" },
      { avatar: avatars.maria, name: "Maria" },
    ],
    category: "UX",
    categoryColor: "#ef4444",
    dueDate: "Jun 18",
    id: "p3",
    status: "To Do",
    title: "Design empty states for dashboard widgets",
  },
  {
    assignees: [
      { avatar: avatars.jake, name: "Jake" },
      { avatar: avatars.sarah, name: "Sarah" },
    ],
    category: "Engineering",
    categoryColor: "#3b82f6",
    dueDate: "Jun 20",
    id: "p4",
    status: "To Do",
    title: "Set up CI/CD for staging environment",
  },
  {
    assignees: [{ avatar: avatars.maria, name: "Maria" }],
    category: "UX",
    categoryColor: "#ef4444",
    dueDate: "Jun 15",
    id: "p5",
    status: "In Progress",
    subtasksCompleted: 3,
    subtasksTotal: 7,
    title: "Redesign onboarding flow",
  },
  {
    assignees: [{ avatar: avatars.jake, name: "Jake" }],
    category: "Engineering",
    categoryColor: "#3b82f6",
    id: "p6",
    status: "In Progress",
    subtasksCompleted: 3,
    subtasksTotal: 5,
    title: "API rate limiting implementation",
  },
  {
    assignees: [{ avatar: avatars.sam, name: "Sam" }],
    category: "Research",
    categoryColor: "#8b5cf6",
    id: "p7",
    status: "In Progress",
    title: "Create user interview script for v2.5",
  },
  {
    assignees: [
      { avatar: avatars.sarah, name: "Sarah" },
      { avatar: avatars.emily, name: "Emily" },
    ],
    category: "UX",
    categoryColor: "#ef4444",
    id: "p8",
    status: "In Review",
    title: "Push notification permission flow",
  },
  {
    assignees: [
      { avatar: avatars.jake, name: "Jake" },
      { avatar: avatars.alex, name: "Alex" },
      { avatar: avatars.maria, name: "Maria" },
    ],
    category: "Engineering",
    categoryColor: "#3b82f6",
    id: "p9",
    status: "In Review",
    title: "Database migration script for v2.4",
  },
  {
    assignees: [{ avatar: avatars.sam, name: "Sam" }],
    category: "Docs",
    categoryColor: "#06b6d4",
    id: "p10",
    status: "In Review",
    title: "Write release notes for v2.4",
  },
  {
    assignees: [{ avatar: avatars.maria, name: "Maria" }],
    category: "Engineering",
    categoryColor: "#3b82f6",
    id: "p11",
    status: "Done",
    title: "Implement dark mode toggle",
  },
  {
    assignees: [
      { avatar: avatars.emily, name: "Emily" },
      { avatar: avatars.sarah, name: "Sarah" },
    ],
    category: "Engineering",
    categoryColor: "#3b82f6",
    id: "p12",
    status: "Done",
    title: "Fix pagination bug on search results",
  },
  {
    assignees: [{ avatar: avatars.alex, name: "Alex" }],
    category: "UX",
    categoryColor: "#ef4444",
    id: "p13",
    status: "Done",
    title: "Add skeleton loaders to dashboard",
  },
];

const columnMeta: Record<string, string> = {
  Backlog: "var(--default)",
  Done: "var(--success)",
  "In Progress": "var(--warning)",
  "In Review": "var(--danger)",
  "To Do": "var(--accent)",
};

const projectColumns = ["Backlog", "To Do", "In Progress", "In Review", "Done"];

function ProjectColumn({
  column,
  kanban,
}: {
  column: string;
  kanban: UseKanbanReturn<ProjectTask>;
}) {
  const { dragAndDropHooks, items } = useKanbanColumn(kanban, column);

  return (
    <Kanban.Column className="min-h-0 overflow-hidden">
      <Kanban.ColumnHeader>
        <Kanban.ColumnIndicator
          style={{ backgroundColor: columnMeta[column] ?? "var(--default)" }}
        />
        <Kanban.ColumnTitle>{column}</Kanban.ColumnTitle>
        <Kanban.ColumnCount>{items.length}</Kanban.ColumnCount>
        <Kanban.ColumnActions>
          <Button isIconOnly aria-label="Add task" size="sm" variant="ghost">
            <Plus />
          </Button>
          <Button isIconOnly aria-label="More options" size="sm" variant="ghost">
            <Ellipsis />
          </Button>
        </Kanban.ColumnActions>
      </Kanban.ColumnHeader>
      <Kanban.ColumnBody className="min-h-0 overflow-hidden">
        <ScrollShadow
          className="min-h-0 flex-1 overscroll-y-contain"
          hideScrollBar
          orientation="vertical"
        >
          <Kanban.CardList
            aria-label={column}
            dragAndDropHooks={dragAndDropHooks}
            items={items}
            renderEmptyState={() => "No tasks."}
          >
            {(task) => (
              <Kanban.Card textValue={task.title}>
                <span
                  className={`font-semibold leading-snug text-foreground ${
                    column === "Done" ? "line-through opacity-60" : ""
                  }`}
                >
                  {task.title}
                </span>

                <span className="flex items-center gap-1.5">
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: task.categoryColor }}
                  />
                  <span className="text-xs text-muted">{task.category}</span>
                </span>

                {task.subtasksTotal != null && (
                  <div className="flex items-center gap-2">
                    <ProgressBar
                      aria-label="Subtasks"
                      className="flex-1"
                      color="accent"
                      size="sm"
                      value={((task.subtasksCompleted ?? 0) / task.subtasksTotal) * 100}
                    >
                      <ProgressBar.Track>
                        <ProgressBar.Fill />
                      </ProgressBar.Track>
                    </ProgressBar>
                    <span className="text-xs tabular-nums text-muted">
                      {task.subtasksCompleted}/{task.subtasksTotal}
                    </span>
                  </div>
                )}

                <div className="mt-0.5 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {task.assignees.slice(0, 3).map((assignee) => (
                      <Avatar
                        key={assignee.name}
                        className="size-5 border-2 border-background"
                        size="sm"
                      >
                        <Avatar.Image alt={assignee.name} src={assignee.avatar} />
                        <Avatar.Fallback>{assignee.name[0]}</Avatar.Fallback>
                      </Avatar>
                    ))}
                    {task.assignees.length > 3 && (
                      <Avatar className="size-5 border-2 border-background" size="sm">
                        <Avatar.Fallback className="text-xs">
                          +{task.assignees.length - 3}
                        </Avatar.Fallback>
                      </Avatar>
                    )}
                  </div>
                  {!!task.dueDate && <span className="text-xs text-muted">{task.dueDate}</span>}
                </div>
              </Kanban.Card>
            )}
          </Kanban.CardList>
        </ScrollShadow>
      </Kanban.ColumnBody>
    </Kanban.Column>
  );
}

export function BoardPage() {
  const [isScrolledFromStart, setIsScrolledFromStart] = useState(false);
  const [isScrolledToEnd, setIsScrolledToEnd] = useState(false);
  const kanban = useKanban<ProjectTask>({
    getColumn: (item) => item.status,
    initialItems: projectTasks,
    setColumn: (item, column) => ({ ...item, status: column }),
  });

  return (
    <div className="h-full min-h-0 overflow-hidden pb-6 pr-6 pl-9! sm:pt-4 sm:pb-6">
      <div className="relative h-full min-h-0">
        <Kanban
          className="session-scrollbar session-scrollbars h-full"
          onScroll={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const firstColumnLeft =
              event.currentTarget.firstElementChild?.getBoundingClientRect().left;
            const lastColumnRight =
              event.currentTarget.lastElementChild?.getBoundingClientRect().right;
            setIsScrolledFromStart(firstColumnLeft != null && firstColumnLeft < bounds.left - 1);
            setIsScrolledToEnd(lastColumnRight != null && lastColumnRight <= bounds.right + 1);
          }}
        >
          {projectColumns.map((column) => (
            <ProjectColumn key={column} column={column} kanban={kanban} />
          ))}
        </Kanban>
        {isScrolledFromStart && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-2 left-0 z-10 w-6 bg-linear-to-r from-background to-transparent"
          />
        )}
        {!isScrolledToEnd && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 right-0 bottom-2 z-10 w-6 bg-linear-to-l from-background to-transparent"
          />
        )}
      </div>
    </div>
  );
}
