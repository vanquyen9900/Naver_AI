// src/components/TaskActions.tsx
import React from "react";
import "../styles/TaskPage.css";
import { useNavigate } from "react-router-dom";

interface Props {
  onCreate: () => void;
  onReload: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TaskActions: React.FC<Props> = ({ onCreate, onReload }) => {
  const navigate = useNavigate();
  return (
    <div className="tasks-actions">
      <button className="btn-primary" onClick={onCreate}>
        ➕ Thêm tasks
      </button>
      {/* <button className="btn-secondary" onClick={onReload}>
        🔄 Tải lại
      </button> */}
      <button className="btn-calendar" onClick={() => navigate("/calendar")}>
        📅 Xem lịch
      </button>
      <button className="btn-task" onClick={() => navigate("/tasks")}>
        📋 Danh sách tasks
      </button>
      <button className="btn-history" onClick={() => navigate("/history")}>
        📜 Lịch sử tasks
      </button>
      <button className="btn-analytics" onClick={() => navigate("/analytics")}>
        📊 Phân tích dữ liệu
      </button>
    </div>
  );
};

export default TaskActions;
