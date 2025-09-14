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

/** Status enum */
export const TaskStatus = {
  NOT_STARTED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  CANCELLED: 4,
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.NOT_STARTED]: "Not Started",
  [TaskStatus.IN_PROGRESS]: "In Progress",
  [TaskStatus.COMPLETED]: "Completed",
  [TaskStatus.CANCELLED]: "Cancelled",

};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.NOT_STARTED]: "#6c757d",
  [TaskStatus.IN_PROGRESS]: "#ffc107",
  [TaskStatus.COMPLETED]: "#28a745",
  [TaskStatus.CANCELLED]: "#dc3545",
};

/** Giống như start_time/end_time: luôn là Date */
export interface TaskProgress {
  task_id: string;
  task_status: TaskStatus;
  updated_at: Date;
}

/** --- Helper --- */
const normalizeDate = (d: unknown): Date => {
  if (!d && d !== 0) return new Date(); // fallback hiện tại
  if (d instanceof Date) return d;
  // Firestore Timestamp
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (d as any)?.toDate === "function") return (d as any).toDate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = new Date(d as any);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

/** --- CRUD --- */
export const updateTaskProgress = async (
  taskId: string,
  status: TaskStatus
) => {
  const progressRef = doc(db, "task_progress", taskId);
  await setDoc(progressRef, {
    task_id: taskId,
    task_status: status,
    updated_at: new Date(), // lưu thẳng Date
  });
};

export const getTaskProgress = async (
  taskId: string
): Promise<TaskProgress | null> => {
  const progressRef = doc(db, "task_progress", taskId);
  const snap = await getDoc(progressRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    task_id: data.task_id,
    task_status: data.task_status,
    updated_at: normalizeDate(data.updated_at),
  };
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
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    result[data.task_id] = {
      task_id: data.task_id,
      task_status: data.task_status,
      updated_at: normalizeDate(data.updated_at),
    };
  });
  return result;
};
