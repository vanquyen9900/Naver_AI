import React, { useEffect, useState } from "react";
import {
  Calendar,
  momentLocalizer,
  Views,
  type SlotInfo,
  type View,
} from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../styles/CalendarPage.css";
import { auth } from "../services/firebase";
import { getTasksWithLevelsByUser, type TaskItem } from "../services/firestore";
import CreateEditTaskModal from "../components/CreateEditTaskModal";
import { toast } from "react-toastify";
import UserHeader from "../components/UserHeader";
import TaskActions from "../components/TaskActions";

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  level?: number;
}

const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultStart, setDefaultStart] = useState<Date | null>(null);
  const [defaultEnd, setDefaultEnd] = useState<Date | null>(null);

  // ★ quản lý view hiện tại để biết có đang ở AGENDA hay không
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);

  const loadTasks = async () => {
    if (!auth.currentUser) return;
    try {
      const list: TaskItem[] = await getTasksWithLevelsByUser(
        auth.currentUser.uid
      );
      const mapped: CalendarEvent[] = list.map((t) => ({
        id: t.id,
        title: t.task_name,
        start: t.start_time ?? new Date(),
        end: t.end_time ?? new Date(),
        allDay: false,
        level: t.level != null ? t.level : undefined,
      }));
      setEvents(mapped);
      // debug nếu cần:
      // console.debug("[CalendarPage] Loaded events:", mapped);
    } catch (err) {
      console.error(err);
      toast.error("Không tải được dữ liệu lịch");
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setDefaultStart(slotInfo.start as Date);
    setDefaultEnd(slotInfo.end as Date);
    setModalOpen(true);
  };

  // màu cho từng level (1..5)
  const levelColors: Record<number, string> = {
    5: "#2ecc71",
    4: "#27ae60",
    3: "#f1c40f",
    2: "#e67e22",
    1: "#e74c3c",
  };

  const eventPropGetter = (event: CalendarEvent) => {
    // nếu đang ở Agenda view -> trả về style "trong suốt" (không phủ màu)
    if (currentView === Views.AGENDA) {
      return {
        style: {
          backgroundColor: "transparent",
          color: "#333",
          border: "none",
          boxShadow: "none",
        },
      };
    }

    // ngược lại (Month/Week/Day) => gán màu theo level
    const level = Number(event.level ?? 0);
    const color = levelColors[level] || "#3498db";
    return {
      style: {
        backgroundColor: color,
        borderRadius: "6px",
        opacity: 0.95,
        color: "#fff",
        border: "0px",
        display: "block",
      },
    };
  };

  return (
    <div className="calendar-container">
      <UserHeader
        displayName={auth.currentUser?.displayName}
        photoURL={auth.currentUser?.photoURL ?? ""}
      />
      <h2>📅 Lịch tháng của bạn</h2>
      <TaskActions onCreate={() => setModalOpen(true)} onReload={loadTasks} />

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={currentView} // dùng state
        onView={(v) => setCurrentView(v)} // cập nhật khi người dùng bấm toolbar
        defaultView={Views.MONTH}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        style={{ height: 600 }}
        selectable
        onSelectSlot={handleSelectSlot}
        popup
        eventPropGetter={eventPropGetter}
      />

      <CreateEditTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        edit={null}
        onSaved={loadTasks}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
      />
    </div>
  );
};

export default CalendarPage;
