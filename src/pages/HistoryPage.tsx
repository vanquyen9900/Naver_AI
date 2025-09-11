import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  getTasksWithLevelsByUser,
  getChildTasksByParentId,
  type TaskItem,
  type TaskChild,
} from "../services/firestore";
import { TaskStatus, getTaskProgress } from "../services/taskProgress";
import { auth } from "../services/firebase";
import TaskHistoryItem from "../components/TaskHistoryItem";
import UserHeader from "../components/UserHeader";
import TaskActions from "../components/TaskActions";
import { toast } from "react-toastify";
import "../styles/TaskHistory.css";

const HistoryPage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [childTasks, setChildTasks] = useState<Record<string, TaskChild[]>>({});
  const [taskStatuses, setTaskStatuses] = useState<Record<string, TaskStatus>>(
    {}
  );
  const [childStatuses, setChildStatuses] = useState<
    Record<string, TaskStatus>
  >({});
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const loadHistory = useCallback(async () => {
    if (!auth.currentUser) return;

    try {
      setLoading(true);
      const mainTasks = await getTasksWithLevelsByUser(auth.currentUser.uid);
      setTasks(mainTasks);

      const loadTaskData = async (tasks: TaskItem[]) => {
        const taskStatusMap: Record<string, TaskStatus> = {};
        const childTasksMap: Record<string, TaskChild[]> = {};
        const childStatusMap: Record<string, TaskStatus> = {};

        await Promise.all(
          tasks.map(async (task) => {
            // Load task status
            const status = await getTaskProgress(task.id);
            taskStatusMap[task.id] =
              status?.task_status || TaskStatus.NOT_STARTED;

            // Load child tasks if they exist
            if (task.task_child?.length) {
              const children = await getChildTasksByParentId(task.id);
              childTasksMap[task.id] = children;

              // Load child statuses
              await Promise.all(
                children.map(async (child) => {
                  const childStatus = await getTaskProgress(child.id);
                  childStatusMap[child.id] =
                    childStatus?.task_status || TaskStatus.NOT_STARTED;
                })
              );
            }
          })
        );

        return { taskStatusMap, childTasksMap, childStatusMap };
      };

      const { taskStatusMap, childTasksMap, childStatusMap } =
        await loadTaskData(mainTasks);

      setTaskStatuses(taskStatusMap);
      setChildTasks(childTasksMap);
      setChildStatuses(childStatusMap);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Không thể tải lịch sử công việc");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    return tasks.filter((task) => {
      const nameMatch = task.task_name
        .toLowerCase()
        .includes(searchName.toLowerCase());

      let dateMatch = true;
      if (searchStartDate || searchEndDate) {
        const taskStart = task.start_time?.getTime() || 0;
        const taskEnd = task.end_time?.getTime() || 0;
        const searchStart = searchStartDate
          ? new Date(searchStartDate).getTime()
          : 0;
        const searchEnd = searchEndDate
          ? new Date(searchEndDate).getTime()
          : Infinity;

        dateMatch = taskStart <= searchEnd && taskEnd >= searchStart;
      }

      let statusMatch = true;
      if (selectedStatus !== "all") {
        statusMatch = taskStatuses[task.id] === Number(selectedStatus);
      }

      return nameMatch && dateMatch && statusMatch;
    });
  }, [
    tasks,
    searchName,
    searchStartDate,
    searchEndDate,
    selectedStatus,
    taskStatuses,
  ]);

  return (
    <div className="history-page">
      <UserHeader
        displayName={auth.currentUser?.displayName}
        photoURL={auth.currentUser?.photoURL || ""}
      />
      <div className="history-header">
        <h2>Lịch sử công việc</h2>
        <TaskActions
          onCreate={() => {}}
          onReload={() => window.location.reload()}
        />
      </div>

      <div className="search-filters">
        <div className="search-group">
          <label htmlFor="searchName">
            <i className="fas fa-search"></i> Tìm kiếm theo tên:
          </label>
          <input
            id="searchName"
            type="text"
            className="search-input"
            placeholder="Nhập tên công việc..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>

        <div className="search-date-range">
          <div className="search-group">
            <label htmlFor="searchStartDate">
              <i className="far fa-calendar-alt"></i> Từ ngày:
            </label>
            <input
              id="searchStartDate"
              type="datetime-local"
              className="search-input"
              value={searchStartDate}
              onChange={(e) => setSearchStartDate(e.target.value)}
            />
          </div>
          <div className="search-group">
            <label htmlFor="searchEndDate">
              <i className="far fa-calendar-alt"></i> Đến ngày:
            </label>
            <input
              id="searchEndDate"
              type="datetime-local"
              className="search-input"
              value={searchEndDate}
              onChange={(e) => setSearchEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="search-group">
          <label htmlFor="statusFilter">
            <i className="fas fa-filter"></i> Lọc theo trạng thái:
          </label>
          <select
            id="statusFilter"
            className="search-input"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value={TaskStatus.NOT_STARTED}>Chưa bắt đầu</option>
            <option value={TaskStatus.IN_PROGRESS}>Đang thực hiện</option>
            <option value={TaskStatus.COMPLETED}>Đã hoàn thành</option>
            <option value={TaskStatus.CANCELLED}>Đã huỷ bỏ</option>
          </select>
        </div>
      </div>

      <div className="history-container">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Đang tải lịch sử công việc...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="empty-state">
            <i className="far fa-folder-open"></i>
            <p>Không tìm thấy công việc nào phù hợp.</p>
          </div>
        ) : (
          <div className="history-list">
            {filteredTasks.map((task) => (
              <TaskHistoryItem
                key={task.id}
                task={task}
                childTasks={childTasks[task.id] || []}
                taskStatus={taskStatuses[task.id]}
                childStatuses={childStatuses}
                onStatusUpdate={loadHistory}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
