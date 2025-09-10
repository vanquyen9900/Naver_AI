import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export const TaskStatus = {
  NOT_STARTED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  CANCELLED: 4,
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.NOT_STARTED]: "Chưa làm",
  [TaskStatus.IN_PROGRESS]: "Đang hoàn thành",
  [TaskStatus.COMPLETED]: "Đã hoàn thành",
  [TaskStatus.CANCELLED]: "Huỷ bỏ",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.NOT_STARTED]: "#6c757d",
  [TaskStatus.IN_PROGRESS]: "#ffc107",
  [TaskStatus.COMPLETED]: "#28a745",
  [TaskStatus.CANCELLED]: "#dc3545",
};

interface TaskProgress {
  task_id: string;
  task_status: TaskStatus;
  updated_at: Date;
}

export const updateTaskProgress = async (
  taskId: string,
  status: TaskStatus
) => {
  const progressRef = doc(db, "task_progress", taskId);
  await setDoc(progressRef, {
    task_id: taskId,
    task_status: status,
    updated_at: new Date(),
  });
};

export const getTaskProgress = async (
  taskId: string
): Promise<TaskProgress | null> => {
  const progressRef = doc(db, "task_progress", taskId);
  const snap = await getDoc(progressRef);
  if (!snap.exists()) return null;
  return snap.data() as TaskProgress;
};

export const getMultipleTaskProgress = async (
  taskIds: string[]
): Promise<Record<string, TaskProgress>> => {
  const q = query(
    collection(db, "task_progress"),
    where("task_id", "in", taskIds)
  );
  const querySnapshot = await getDocs(q);

  const result: Record<string, TaskProgress> = {};
  querySnapshot.forEach((doc) => {
    result[doc.data().task_id] = doc.data() as TaskProgress;
  });
  return result;
};
