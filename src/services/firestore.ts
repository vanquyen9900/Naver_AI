// src/services/firestore.ts
import {
  collection,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  getDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";

/** level labels */
export const LEVEL_LABELS: Record<number, string> = {
  1: "Very Important",
  2: "Important",
  3: "Normal",
  4: "Daily",
  5: "Leisure",
};

interface BaseTask {
  id: string;
  task_name: string;
  task_detail: string;
  start_time?: Date | null;
  end_time?: Date | null;
  user_id: string;
  level?: number;
  createdAt?: Date | null;
}

/** task chính */
export interface TaskItem extends BaseTask {
  task_child?: string[] | null;
}

/** task con */
export interface TaskChild extends BaseTask {
  parent_id: string;
}

/** ---------- Helpers ---------- */

/** Normalize date fields: keep Date or null (never undefined) */
const normalizeDate = (d: unknown): Date | null => {
  if (!d && d !== 0) return null;
  if (d instanceof Date) return d;
  // if Firestore Timestamp object (server), it may have toDate()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (d as any)?.toDate === "function") return (d as any).toDate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = new Date(d as any);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/** Remove undefined properties from object (Firestore rejects undefined) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cleanForFirestore = (obj: Record<string, any>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
};

/** ---------- Child tasks (task_child) ---------- */

/**
 * Create child task and append child's id to parent task.task_child array.
 * Will validate parent exists and belongs to uid.
 */
export const createChildTask = async (
  uid: string,
  parentId: string,
  childTask: {
    task_name: string;
    task_detail?: string;
    start_time?: Date | null;
    end_time?: Date | null;
    level?: number;
  }
): Promise<string> => {
  // Validate parent exists and owner
  const parentRef = doc(db, "tasks", parentId);
  const parentSnap = await getDoc(parentRef);
  if (!parentSnap.exists()) {
    throw new Error("Parent task does not exist");
  }
  const parentData = parentSnap.data();
  if (parentData.user_id !== uid) {
    throw new Error("You do not have permission to add a subtask to this task");
  }

  // Create child
  const childDocRef = await addDoc(collection(db, "task_child"), {
    task_name: childTask.task_name,
    task_detail: childTask.task_detail ?? "",
    start_time: childTask.start_time ?? null,
    end_time: childTask.end_time ?? null,
    level: childTask.level ?? null,
    parent_id: parentId,
    user_id: uid,
    createdAt: serverTimestamp(),
  });

  // Update parent.task_child array (atomic-ish single update)
  // Use the server doc's existing array then update - this might race but acceptable for small apps.
  const currentChildren = parentData.task_child ?? [];
  await updateDoc(parentRef, {
    task_child: Array.isArray(currentChildren)
      ? [...currentChildren, childDocRef.id]
      : [childDocRef.id],
  });

  return childDocRef.id;
};

export const getChildTasksByParentId = async (
  parentId: string
): Promise<TaskChild[]> => {
  const q = query(
    collection(db, "task_child"),
    where("parent_id", "==", parentId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs
    .map((d) => {
      const data = d.data() as DocumentData;
      return {
        id: d.id,
        task_name: data.task_name,
        task_detail: data.task_detail ?? "",
        start_time: normalizeDate(data.start_time),
        end_time: normalizeDate(data.end_time),
        user_id: data.user_id,
        level: typeof data.level === "number" ? data.level : undefined,
        parent_id: data.parent_id,
        createdAt: data.createdAt ? normalizeDate(data.createdAt) : null,
      } as TaskChild;
    })
    .filter(Boolean);
};

export const updateChildTask = async (
  childId: string,
  data: Partial<Omit<TaskChild, "id" | "parent_id" | "user_id" | "createdAt">>
) => {
  const childRef = doc(db, "task_child", childId);
  const payload = cleanForFirestore({
    ...data,
    start_time: data.start_time ?? null,
    end_time: data.end_time ?? null,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(childRef, payload);
};

export const deleteChildTask = async (childId: string, parentId: string) => {
  const batch = writeBatch(db);
  const childRef = doc(db, "task_child", childId);
  batch.delete(childRef);

  // Update parent's task_child array
  const parentRef = doc(db, "tasks", parentId);
  const parentSnap = await getDoc(parentRef);
  if (parentSnap.exists()) {
    const currentChildren = parentSnap.data().task_child || [];
    batch.update(parentRef, {
      task_child: currentChildren.filter((id: string) => id !== childId),
    });
  }

  await batch.commit();
};

/** ---------- Users ---------- */

export const createUserIfNotExists = async (
  uid: string,
  username?: string | null,
  email?: string | null
) => {
  const userRef = doc(db, "users", uid);
  await setDoc(
    userRef,
    {
      username: username ?? null,
      email: email ?? null,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
};

/** ---------- Tasks & Levels ---------- */

/**
 * Atomic save:
 * - create/update task doc in `tasks`
 * - create/update corresponding doc in `task_levels`
 *
 * Improvements:
 * - never write `undefined` to Firestore
 * - store `level` also inside `tasks` for faster reads (keeps task_levels as source-of-truth too)
 * - convert Date-like input to either Date or null
 */
export const saveTaskWithLevel = async (
  uid: string,
  task: {
    id?: string;
    task_name: string;
    task_detail?: string;
    start_time?: Date | null;
    end_time?: Date | null;
    level: number;
    task_child?: string[] | null;
  }
): Promise<string> => {
  // normalize input
  const normalized = {
    task_name: task.task_name,
    task_detail: task.task_detail ?? "",
    start_time: normalizeDate(task.start_time),
    end_time: normalizeDate(task.end_time),
    level: typeof task.level === "number" ? task.level : 0,
    task_child: Array.isArray(task.task_child) ? task.task_child : null,
  };

  if (task.id) {
    // update path
    const levelQ = query(
      collection(db, "task_levels"),
      where("task_id", "==", task.id)
    );
    const levelSnap = await getDocs(levelQ);

    const batch = writeBatch(db);
    const taskRef = doc(db, "tasks", task.id);

    // prepare update fields (no undefined)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFields: Record<string, any> = {};
    if (normalized.task_name !== undefined)
      updateFields.task_name = normalized.task_name;
    if (normalized.task_detail !== undefined)
      updateFields.task_detail = normalized.task_detail;
    // explicitly allow set null for start/end
    updateFields.start_time = normalized.start_time ?? null;
    updateFields.end_time = normalized.end_time ?? null;
    // update level inside tasks for faster reads
    updateFields.level = normalized.level;
    if (normalized.task_child !== undefined)
      updateFields.task_child = normalized.task_child;

    // remove any undefined keys (just in case)
    const cleanFields = cleanForFirestore(updateFields);
    if (Object.keys(cleanFields).length > 0) {
      batch.update(taskRef, cleanFields);
    }

    if (levelSnap.docs.length > 0) {
      // update first found level doc
      batch.update(levelSnap.docs[0].ref, { level: normalized.level });
    } else {
      const newLevelRef = doc(collection(db, "task_levels"));
      batch.set(newLevelRef, { task_id: task.id, level: normalized.level });
    }

    // debug log
    console.debug(
      "[saveTaskWithLevel] updating task",
      task.id,
      cleanFields,
      "level:",
      normalized.level
    );

    await batch.commit();
    return task.id;
  } else {
    // create path
    const batch = writeBatch(db);
    const taskRef = doc(collection(db, "tasks")); // generate id client side
    const levelRef = doc(collection(db, "task_levels"));

    const taskPayload = cleanForFirestore({
      task_name: normalized.task_name,
      task_detail: normalized.task_detail,
      task_child: normalized.task_child ?? null,
      start_time: normalized.start_time ?? null,
      end_time: normalized.end_time ?? null,
      createdAt: serverTimestamp(),
      user_id: uid,
      level: normalized.level, // store level in task doc to speed up reads
    });

    const levelPayload = {
      task_id: taskRef.id,
      level: normalized.level,
    };

    // debug
    console.debug(
      "[saveTaskWithLevel] creating task",
      taskRef.id,
      taskPayload,
      "levelPayload:",
      levelPayload
    );

    batch.set(taskRef, taskPayload);
    batch.set(levelRef, levelPayload);

    await batch.commit();
    return taskRef.id;
  }
};

/** delete task and its level docs (atomic using writeBatch) */
export const deleteTask = async (taskId: string) => {
  const batch = writeBatch(db);
  const taskRef = doc(db, "tasks", taskId);

  // Get task to check children
  const taskSnap = await getDoc(taskRef);
  const taskData = taskSnap.data();
  const childIds = taskData?.task_child || [];

  // Delete all child tasks and their levels
  for (const childId of childIds) {
    const childRef = doc(db, "task_child", childId);
    batch.delete(childRef);

    const childLevelQ = query(
      collection(db, "task_levels"),
      where("task_id", "==", childId)
    );
    const childLevelSnap = await getDocs(childLevelQ);
    childLevelSnap.docs.forEach((d) => {
      batch.delete(d.ref);
    });
  }

  // Delete main task and its level docs
  batch.delete(taskRef);
  const levelQ = query(
    collection(db, "task_levels"),
    where("task_id", "==", taskId)
  );
  const snap = await getDocs(levelQ);
  snap.docs.forEach((d) => batch.delete(d.ref));

  await batch.commit();
};

/** fetch single task by id (include level if present in task doc or fallback to task_levels) */
export const getTaskById = async (taskId: string): Promise<TaskItem | null> => {
  const tRef = doc(db, "tasks", taskId);
  const tSnap = await getDoc(tRef);
  if (!tSnap.exists()) return null;
  const data = tSnap.data() as DocumentData;

  // try to read level from tasks doc (we write it on save), else fallback to task_levels
  let lvl: number | undefined = undefined;
  if (typeof data.level === "number") lvl = data.level;
  else {
    const levelQ = query(
      collection(db, "task_levels"),
      where("task_id", "==", taskId)
    );
    const levelSnap = await getDocs(levelQ);
    if (levelSnap.docs.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lvl = (levelSnap.docs[0].data() as any).level;
    }
  }

  return {
    id: tSnap.id,
    task_name: data.task_name,
    task_detail: data.task_detail ?? "",
    task_child: data.task_child ?? null,
    start_time: normalizeDate(data.start_time),
    end_time: normalizeDate(data.end_time),
    createdAt: data.createdAt ? normalizeDate(data.createdAt) : null,
    user_id: data.user_id,
    level: typeof lvl === "number" ? lvl : undefined,
  } as TaskItem;
};

/**
 * getTasksWithLevelsByUser
 * - fetch tasks of user
 * - because we store `level` inside tasks (see saveTaskWithLevel) we can read level directly
 * - fallback to task_levels join if not present
 */
export const getTasksWithLevelsByUser = async (
  uid: string
): Promise<TaskItem[]> => {
  const tasksQ = query(collection(db, "tasks"), where("user_id", "==", uid));
  const tasksSnap = await getDocs(tasksQ);
  const tasksRaw = tasksSnap.docs.map((d) => ({
    id: d.id,
    data: d.data() as DocumentData,
  }));

  if (tasksRaw.length === 0) return [];

  // build map
  const tasks: TaskItem[] = tasksRaw.map((t) => {
    const data = t.data;
    return {
      id: t.id,
      task_name: data.task_name,
      task_detail: data.task_detail ?? "",
      task_child: data.task_child ?? null,
      start_time: normalizeDate(data.start_time),
      end_time: normalizeDate(data.end_time),
      createdAt: data.createdAt ? normalizeDate(data.createdAt) : null,
      user_id: data.user_id,
      level: typeof data.level === "number" ? data.level : undefined,
    } as TaskItem;
  });

  // if some tasks are missing level field, batch-fetch from task_levels
  const missingIds = tasks
    .filter((t) => t.level === undefined)
    .map((t) => t.id);
  if (missingIds.length > 0) {
    // chunk by 10
    const chunkSize = 10;
    for (let i = 0; i < missingIds.length; i += chunkSize) {
      const chunk = missingIds.slice(i, i + chunkSize);
      const levelQ = query(
        collection(db, "task_levels"),
        where("task_id", "in", chunk)
      );
      const levelSnap = await getDocs(levelQ);
      for (const ld of levelSnap.docs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ldData = ld.data() as any;
        const tid = ldData.task_id as string;
        const lvl = ldData.level as number;
        const idx = tasks.findIndex((x) => x.id === tid);
        if (idx >= 0) tasks[idx].level = lvl;
      }
    }
  }

  return tasks;
};
