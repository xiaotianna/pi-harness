import { queryOptions } from "@tanstack/react-query";
import { listBoardTasks } from "./board-task-api";

export const boardTaskQueryKeys = {
  all: ["board-tasks"] as const,
  list: () => [...boardTaskQueryKeys.all, "list"] as const,
};

export const boardTaskListQueryOptions = () =>
  queryOptions({
    queryFn: ({ signal }) => listBoardTasks(signal),
    queryKey: boardTaskQueryKeys.list(),
    refetchInterval: 2_000,
  });
