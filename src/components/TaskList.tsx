// src/components/TaskList.tsx
import React from "react";
import { type TaskItem, LEVEL_LABELS } from "../services/firestore";

interface Props {
  tasks: TaskItem[];
  onEdit: (t: TaskItem) => void;
  onDelete: (t: TaskItem) => void;
}

const TaskList: React.FC<Props> = ({ tasks, onEdit, onDelete }) => {
  if (!tasks.length) return <div>Không có lịch nào. Hãy tạo lịch mới.</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {tasks.map((t) => (
        <div
          key={t.id}
          style={{
            padding: 12,
            borderRadius: 8,
            border: "1px solid #eee",
            background: "#fff",
            boxShadow: "0 6px 18px rgba(20,20,20,0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{t.task_name}</div>
              <div style={{ color: "#555" }}>{t.task_detail}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "#888" }}>
                {t.start_time ? new Date(t.start_time).toLocaleString() : ""}
              </div>
              <div style={{ fontSize: 12, color: "#888" }}>
                {t.end_time ? new Date(t.end_time).toLocaleString() : ""}
              </div>
              <div style={{ marginTop: 6, fontWeight: 600 }}>
                {t.level ? LEVEL_LABELS[t.level] : "Chưa phân loại"}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button onClick={() => onEdit(t)}>Sửa</button>
            <button
              onClick={() => onDelete(t)}
              style={{ background: "#e53e3e", color: "#fff" }}
            >
              Xóa
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskList;
