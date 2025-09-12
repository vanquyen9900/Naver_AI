import {
  type TaskItem,
  type TaskChild,
  getTaskById,
  getChildTasksByParentId,
  LEVEL_LABELS,
} from "./firestore";
import {
  type TaskProgress,
  TaskStatus,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  getTaskProgress,
  getMultipleTaskProgress,
} from "./taskProgress";

export interface AggregatedTaskProgress {
  status: TaskStatus;
  statusLabel: string;
  statusColor: string;
  updatedAt: Date;
}

export interface AggregatedTask {
  // Base task info
  id: string;
  taskName: string;
  taskDetail: string;
  startTime?: Date | null;
  endTime?: Date | null;
  userId: string;

  // Level info
  level?: number;
  levelLabel?: string;

  // Progress info
  progress?: AggregatedTaskProgress;

  // Child tasks
  children?: AggregatedChildTask[];
  createdAt?: Date | null;
}

export interface AggregatedChildTask extends Omit<AggregatedTask, "children"> {
  parentId: string;
}

const mapTaskProgress = (
  progress: TaskProgress | null
): AggregatedTaskProgress | undefined => {
  if (!progress) return undefined;

  return {
    status: progress.task_status,
    statusLabel: TASK_STATUS_LABELS[progress.task_status],
    statusColor: TASK_STATUS_COLORS[progress.task_status],
    updatedAt: progress.updated_at,
  };
};

const mapToAggregatedTask = (
  task: TaskItem,
  progress?: TaskProgress | null,
  children?: AggregatedChildTask[]
): AggregatedTask => {
  return {
    id: task.id,
    taskName: task.task_name,
    taskDetail: task.task_detail,
    startTime: task.start_time,
    endTime: task.end_time,
    userId: task.user_id,
    level: task.level,
    levelLabel: task.level ? LEVEL_LABELS[task.level] : undefined,
    progress: progress ? mapTaskProgress(progress) : undefined,
    children,
    createdAt: task.createdAt,
  };
};

const mapToAggregatedChildTask = (
  child: TaskChild,
  progress?: TaskProgress | null
): AggregatedChildTask => {
  return {
    id: child.id,
    taskName: child.task_name,
    taskDetail: child.task_detail,
    startTime: child.start_time,
    endTime: child.end_time,
    userId: child.user_id,
    level: child.level,
    levelLabel: child.level ? LEVEL_LABELS[child.level] : undefined,
    progress: progress ? mapTaskProgress(progress) : undefined,
    parentId: child.parent_id,
    createdAt: child.createdAt,
  };
};

export const getAggregatedTask = async (
  taskId: string
): Promise<AggregatedTask | null> => {
  // Get main task
  const task = await getTaskById(taskId);
  if (!task) return null;

  // Get task progress
  const progress = await getTaskProgress(taskId);

  // Get child tasks if any
  let children: AggregatedChildTask[] = [];
  if (task.task_child && task.task_child.length > 0) {
    const childTasks = await getChildTasksByParentId(taskId);
    const childProgressMap = await getMultipleTaskProgress(task.task_child);

    children = childTasks.map((child) =>
      mapToAggregatedChildTask(child, childProgressMap[child.id])
    );
  }

  return mapToAggregatedTask(task, progress, children);
};

export const getMultipleAggregatedTasks = async (
  taskIds: string[]
): Promise<AggregatedTask[]> => {
  const tasks = await Promise.all(taskIds.map((id) => getAggregatedTask(id)));
  return tasks.filter((t): t is AggregatedTask => t !== null);
};
