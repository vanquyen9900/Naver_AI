import React, { useState, useEffect } from "react";
import "../styles/theme.css";
import {
  saveTaskWithLevel,
  type TaskItem,
  type TaskChild,
  LEVEL_LABELS,
} from "../services/firestore";
import { auth, db } from "../services/firebase";
import { toast } from "react-toastify";
import CreateChildTaskModal from "./CreateChildTaskModal";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

interface TempChildTask {
  task_name: string;
  task_detail: string;
  user_id: string;
  level?: number;
  start_time?: Date | null;
  end_time?: Date | null;
  createdAt?: Date | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  edit: TaskItem | null;
  onSaved: () => void;
  defaultStart?: Date | null;
  defaultEnd?: Date | null;
}

const levels = [
  { value: 1, label: "Rất quan trọng" },
  { value: 2, label: "Quan trọng" },
  { value: 3, label: "Bình thường" },
  { value: 4, label: "Thường ngày" },
  { value: 5, label: "Rảnh rỗi" },
];

const CreateEditTaskModal: React.FC<Props> = ({
  open,
  onClose,
  edit,
  onSaved,
  defaultStart,
  defaultEnd,
}) => {
  const [taskName, setTaskName] = useState("");
  const [taskDetail, setTaskDetail] = useState("");
  const [level, setLevel] = useState(3);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [childTasks, setChildTasks] = useState<(TaskChild | TempChildTask)[]>(
    []
  );
  const [showChildModal, setShowChildModal] = useState(false);

  // Load dữ liệu khi edit
  useEffect(() => {
    if (edit) {
      setTaskName(edit.task_name);
      setTaskDetail(edit.task_detail || "");
      setLevel(edit.level || 3);
      setStartTime(
        edit.start_time
          ? new Date(edit.start_time).toISOString().slice(0, 16)
          : ""
      );
      setEndTime(
        edit.end_time ? new Date(edit.end_time).toISOString().slice(0, 16) : ""
      );
    } else {
      setTaskName("");
      setTaskDetail("");
      setLevel(3);
      setStartTime(defaultStart ? defaultStart.toISOString().slice(0, 16) : "");
      setEndTime(defaultEnd ? defaultEnd.toISOString().slice(0, 16) : "");
    }
  }, [edit, defaultStart, defaultEnd]);

  // Load child tasks
  useEffect(() => {
    const loadChildTasks = async () => {
      if (edit?.task_child?.length) {
        const children = await Promise.all(
          edit.task_child.map(async (id) => {
            const docRef = doc(db, "task_child", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              return {
                id,
                ...data,
                start_time: data.start_time?.toDate(),
                end_time: data.end_time?.toDate(),
                createdAt: data.createdAt?.toDate(),
              } as TaskChild;
            }
            return null;
          })
        );
        setChildTasks(children.filter((c): c is TaskChild => c !== null));
      } else {
        setChildTasks([]);
      }
    };

    if (edit) {
      loadChildTasks();
    } else {
      setChildTasks([]);
    }
  }, [edit]);

  if (!open) return null;

  const handleChildSaved = (newChild: Omit<TaskChild, "id" | "parent_id">) => {
    setChildTasks((current) => [...current, newChild]);
    setShowChildModal(false);
  };

  const handleRemoveChild = (index: number) => {
    setChildTasks((tasks) => tasks.filter((_, i) => i !== index));
    toast.success("Đã xóa công việc con");
  };

  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("Bạn chưa đăng nhập");
      return;
    }
    if (!taskName.trim()) {
      toast.error("Tên lịch không được để trống");
      return;
    }

    try {
      const taskData = {
        id: edit?.id,
        task_name: taskName.trim(),
        task_detail: taskDetail.trim(),
        start_time: startTime ? new Date(startTime) : null,
        end_time: endTime ? new Date(endTime) : null,
        level,
        task_child: edit?.task_child || [],
        user_id: currentUser.uid,
      };

      const mainTaskId = await saveTaskWithLevel(currentUser.uid, taskData);

      // Process child tasks
      const savedChildIds = await Promise.all(
        childTasks.map(async (child) => {
          if ("id" in child) {
            // update existing child
            await updateDoc(doc(db, "task_child", child.id), {
              task_name: child.task_name,
              task_detail: child.task_detail,
              level: child.level,
              start_time: child.start_time ? new Date(child.start_time) : null,
              end_time: child.end_time ? new Date(child.end_time) : null,
              updatedAt: serverTimestamp(),
            });
            return child.id;
          } else {
            // create new child
            const childDoc = await addDoc(collection(db, "task_child"), {
              task_name: child.task_name,
              task_detail: child.task_detail,
              level: child.level,
              start_time: child.start_time ? new Date(child.start_time) : null,
              end_time: child.end_time ? new Date(child.end_time) : null,
              parent_id: mainTaskId,
              user_id: auth.currentUser?.uid,
              createdAt: new Date(),
            });
            return childDoc.id;
          }
        })
      );

      // Update main task with child IDs
      if (savedChildIds.length > 0) {
        await updateDoc(doc(db, "tasks", mainTaskId), {
          task_child: savedChildIds,
        });
      }

      toast.success(edit ? "Cập nhật thành công" : "Thêm mới thành công");
      onClose();
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Lưu thất bại");
    }
  };

  return (
    <div className="modal-overlay animate-fadeIn">
      <div className="modal-box animate-slideIn">
        <div className="modal-header">
          <h2 className="modal-title">
            {edit ? "Chỉnh sửa lịch" : "Thêm lịch mới"}
          </h2>
          <button className="btn-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Form */}
        <div className="form-group">
          <label>Tên lịch *</label>
          <input
            type="text"
            className="input"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="Nhập tên lịch"
          />
        </div>
        <div className="form-group">
          <label>Chi tiết</label>
          <textarea
            className="input"
            value={taskDetail}
            onChange={(e) => setTaskDetail(e.target.value)}
            placeholder="Nhập chi tiết công việc"
            rows={4}
          />
        </div>
        <div className="form-group">
          <label>Mức độ</label>
          <select
            className="input"
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
          >
            {levels.map((lv) => (
              <option key={lv.value} value={lv.value}>
                {lv.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Bắt đầu</label>
          <input
            type="datetime-local"
            className="input"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Kết thúc</label>
          <input
            type="datetime-local"
            className="input"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        {/* Child tasks */}
        <div className="child-tasks-section">
          <div className="section-header">
            <h3>Công việc con</h3>
            <button
              className="btn btn-add-child"
              onClick={() => setShowChildModal(true)}
            >
              ➕ Thêm công việc con
            </button>
          </div>
          <div className="child-tasks-list">
            {childTasks.map((child, index) => (
              <div
                key={"id" in child ? child.id : index}
                className="child-task-item"
              >
                <div className="child-info">
                  <div className="child-header">
                    <span className="child-name">{child.task_name}</span>
                    <span className={`child-level level-${child.level}`}>
                      {child.level
                        ? LEVEL_LABELS[child.level]
                        : "Chưa phân loại"}
                    </span>
                  </div>
                  <div className="child-detail">{child.task_detail}</div>
                </div>
                <button
                  className="btn-remove"
                  onClick={() => handleRemoveChild(index)}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {edit ? "Cập nhật" : "Thêm"}
          </button>
        </div>
      </div>

      <CreateChildTaskModal
        open={showChildModal}
        onClose={() => setShowChildModal(false)}
        onSaved={handleChildSaved}
        parentStartTime={startTime}
        parentEndTime={endTime}
      />
    </div>
  );
};

export default CreateEditTaskModal;
