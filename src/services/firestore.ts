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
  //   deleteDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";

/** level labels */
export const LEVEL_LABELS: Record<number, string> = {
  1: "Rất quan trọng",
  2: "Quan trọng",
  3: "Bình thường",
  4: "Thường ngày",
  5: "Rảnh rỗi",
};

export interface TaskItem {
  id: string;
  task_name: string;
  task_detail?: string;
  task_child?: string | null;
  start_time?: Date | null;
  end_time?: Date | null;
  createdAt?: Date | null;
  user_id: string;
  level?: number | null;
}

/** create user doc if not exists (uid as doc id) */
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

/**
 * createTask (old style)
 * NOTE: prefer saveTaskWithLevel for atomic create
 */
export const createTask = async (
  uid: string,
  taskName: string,
  taskDetail: string,
  startTime: Date,
  endTime: Date,
  level: number
) => {
  // keep for backward compatibility, but better to use saveTaskWithLevel
  const taskRef = await addDoc(collection(db, "tasks"), {
    task_name: taskName,
    task_detail: taskDetail,
    task_child: null,
    start_time: startTime,
    end_time: endTime,
    createdAt: serverTimestamp(),
    user_id: uid,
  });

  await addDoc(collection(db, "task_levels"), {
    task_id: taskRef.id,
    level,
  });

  return taskRef.id;
};

/** update task (update fields only) */
export const updateTask = async (
  taskId: string,
  data: Partial<{
    task_name: string;
    task_detail: string;
    start_time: Date | null;
    end_time: Date | null;
  }>
) => {
  const ref = doc(db, "tasks", taskId);
  // updateDoc would throw if doc doesn't exist; update only provided fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateDoc(ref, data as any);
};

/** update level (if exists update, else create) */
export const upsertTaskLevel = async (taskId: string, level: number) => {
  const q = query(
    collection(db, "task_levels"),
    where("task_id", "==", taskId)
  );
  const snap = await getDocs(q);
  if (snap.docs.length > 0) {
    const lvlRef = snap.docs[0].ref;
    await updateDoc(lvlRef, { level });
    return;
  }
  await addDoc(collection(db, "task_levels"), { task_id: taskId, level });
};

/** delete task and its level docs (atomic using writeBatch) */
export const deleteTask = async (taskId: string) => {
  const batch = writeBatch(db);
  const taskRef = doc(db, "tasks", taskId);
  batch.delete(taskRef);

  const q = query(
    collection(db, "task_levels"),
    where("task_id", "==", taskId)
  );
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    batch.delete(d.ref);
  }

  await batch.commit();
};

/**
 * saveTaskWithLevel
 * - if task.id exists -> update task + update/create level (atomic)
 * - if no id -> create task + create level (atomic)
 * returns taskId
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
  }
): Promise<string> => {
  if (task.id) {
    // update existing task + level
    // find existing level doc for task
    const levelQ = query(
      collection(db, "task_levels"),
      where("task_id", "==", task.id)
    );
    const levelSnap = await getDocs(levelQ);

    const batch = writeBatch(db);
    const taskRef = doc(db, "tasks", task.id);

    // prepare update fields (omit undefined)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFields: any = {};
    if (task.task_name !== undefined) updateFields.task_name = task.task_name;
    if (task.task_detail !== undefined)
      updateFields.task_detail = task.task_detail;
    if (task.start_time !== undefined)
      updateFields.start_time = task.start_time ?? null;
    if (task.end_time !== undefined)
      updateFields.end_time = task.end_time ?? null;

    if (Object.keys(updateFields).length > 0) {
      batch.update(taskRef, updateFields);
    }

    if (levelSnap.docs.length > 0) {
      batch.update(levelSnap.docs[0].ref, { level: task.level });
    } else {
      const newLevelRef = doc(collection(db, "task_levels"));
      batch.set(newLevelRef, { task_id: task.id, level: task.level });
    }

    await batch.commit();
    return task.id;
  } else {
    // create new task + level in one batch with generated ids
    const batch = writeBatch(db);
    const taskRef = doc(collection(db, "tasks")); // new doc ref with id
    const levelRef = doc(collection(db, "task_levels"));

    batch.set(taskRef, {
      task_name: task.task_name,
      task_detail: task.task_detail ?? "",
      task_child: null,
      start_time: task.start_time ?? new Date(),
      end_time: task.end_time ?? new Date(),
      createdAt: serverTimestamp(),
      user_id: uid,
    });

    batch.set(levelRef, {
      task_id: taskRef.id,
      level: task.level,
    });

    await batch.commit();
    return taskRef.id;
  }
};

/**
 * getTasksWithLevelsByUser
 * - fetch tasks of user
 * - batch-fetch levels for tasks using "in" queries (chunked by 10)
 * - merge level into tasks result
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

  // map id -> task object (without level)
  const tasksMap: Record<string, TaskItem> = {};
  const ids: string[] = [];

  for (const t of tasksRaw) {
    ids.push(t.id);
    const data = t.data;
    const start_time =
      data.start_time && typeof data.start_time.toDate === "function"
        ? data.start_time.toDate()
        : data.start_time
        ? new Date(data.start_time)
        : null;
    const end_time =
      data.end_time && typeof data.end_time.toDate === "function"
        ? data.end_time.toDate()
        : data.end_time
        ? new Date(data.end_time)
        : null;

    tasksMap[t.id] = {
      id: t.id,
      task_name: data.task_name,
      task_detail: data.task_detail ?? "",
      task_child: data.task_child ?? null,
      start_time,
      end_time,
      createdAt:
        data.createdAt && typeof data.createdAt.toDate === "function"
          ? data.createdAt.toDate()
          : null,
      user_id: data.user_id,
      level: null,
    };
  }

  // chunk ids into groups of up to 10 (Firestore 'in' supports max 10)
  const chunkSize = 10;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
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
      if (tasksMap[tid]) tasksMap[tid].level = lvl;
    }
  }

  // return array preserving original order
  const result: TaskItem[] = ids.map((id) => tasksMap[id]);
  return result;
};
