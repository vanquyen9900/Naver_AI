// src/pages/TasksPage.tsx
import React, { useEffect, useState } from "react";
import { auth, onAuthStateChanged } from "../services/firebase";
import {
  getTasksWithLevelsByUser,
  type TaskItem,
  deleteTask,
} from "../services/firestore";
import CreateEditTaskModal from "../components/CreateEditTaskModal";
import ConfirmModal from "../components/ConfirmModal";
import TaskList from "../components/TaskList";
import { toast, ToastContainer } from "react-toastify";
import { motion } from "framer-motion";
import "react-toastify/dist/ReactToastify.css";
import "../styles/TaskPage.css";
import UserHeader from "../components/UserHeader";
import TaskActions from "../components/TaskActions";

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<null | TaskItem>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<null | TaskItem>(null);
  const [user, setUser] = useState(auth.currentUser);

  const loadTasks = async () => {
    if (!auth.currentUser) return setTasks([]);
    setLoading(true);
    try {
      const list = await getTasksWithLevelsByUser(auth.currentUser.uid);
      setTasks(list);
    } catch (err) {
      console.error(err);
      toast.error("Tải lịch thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) loadTasks();
      else setTasks([]);
    });
    return () => unsub();
  }, []);

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (t: TaskItem) => {
    setEditing(t);
    setModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteTask(toDelete.id);
      toast.success("Xóa thành công");
      setConfirmOpen(false);
      setToDelete(null);
      loadTasks();
    } catch (err) {
      console.error(err);
      toast.error("Xóa thất bại");
    }
  };

  return (
    <motion.div
      className="tasks-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <ToastContainer position="top-right" />

      {/* Header */}
      <UserHeader
        displayName={user?.displayName}
        photoURL={user?.photoURL ?? ""}
      />

      <p className="welcome-text">
        Chào mừng bạn đã đến lịch hoạt động của bạn ✨
      </p>

      {/* Actions */}
      <TaskActions onCreate={handleCreate} onReload={loadTasks} />

      {/* Task list */}
      <div className="tasks-list">
        {loading ? (
          <p>Đang tải...</p>
        ) : (
          <TaskList tasks={tasks} onEdit={handleEdit} />
        )}
      </div>

      <CreateEditTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        edit={editing}
        onSaved={loadTasks}
      />
      <ConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        message="Bạn có muốn xóa lịch này không? Hành động không thể hoàn tác."
      />
    </motion.div>
  );
};

export default TasksPage;
