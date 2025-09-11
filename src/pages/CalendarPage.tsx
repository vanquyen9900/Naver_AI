import React, { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  momentLocalizer,
  Views,
  type SlotInfo,
  type View,
  type Event,
} from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../styles/CalendarPage.css";
import { auth } from "../services/firebase";
import { getTasksWithLevelsByUser } from "../services/firestore";
import CreateEditTaskModal from "../components/CreateEditTaskModal";
import { toast } from "react-toastify";
import UserHeader from "../components/UserHeader";
import TaskActions from "../components/TaskActions";

const localizer = momentLocalizer(moment);

interface CalendarEvent extends Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  level?: number;
}

interface EventProps {
  event: CalendarEvent;
}

const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultStart, setDefaultStart] = useState<Date | null>(null);
  const [defaultEnd, setDefaultEnd] = useState<Date | null>(null);
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const loadTasks = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const tasks = await getTasksWithLevelsByUser(auth.currentUser.uid);
      const calendarEvents = tasks.map((task) => ({
        id: task.id,
        title: task.task_name,
        start: task.start_time ?? new Date(),
        end: task.end_time ?? new Date(),
        allDay: false,
        level: task.level,
      }));
      setEvents(calendarEvents);
    } catch (error) {
      console.error("Failed to load tasks:", error);
      toast.error("Không thể tải danh sách công việc");
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setDefaultStart(slotInfo.start as Date);
    setDefaultEnd(slotInfo.end as Date);
    setModalOpen(true);
  }, []);

  const levelColors: Record<number, string> = {
    5: "#2ecc71",
    4: "#27ae60",
    3: "#f1c40f",
    2: "#e67e22",
    1: "#e74c3c",
  };

  const isFullDayEvent = useCallback((event: CalendarEvent) => {
    return (
      moment(event.start)
        .startOf("day")
        .isSame(moment(event.end).startOf("day")) &&
      moment(event.start).format("HH:mm") === "00:00" &&
      moment(event.end).format("HH:mm") === "23:59"
    );
  }, []);

  const eventPropGetter = useCallback(
    (event: CalendarEvent) => {
      const level = Number(event.level ?? 0);
      const color = levelColors[level] || "#3498db";
      const isFullDay = isFullDayEvent(event);
      const currentDateMoment = moment(currentDate);
      const isStart = currentDateMoment.isSame(event.start, "day");
      const isEnd = currentDateMoment.isSame(event.end, "day");
      const isMiddleDay =
        !isStart &&
        !isEnd &&
        currentDateMoment.isBetween(event.start, event.end, "day", "[]");

      let className = "";
      if (isFullDay) className = "full-day";
      else if (isMiddleDay) className = "middle-day";
      else if (isStart) className = "start-day";
      else if (isEnd) className = "end-day";

      return {
        className: `event-base ${className}`,
        style: {
          backgroundColor: isFullDay ? "transparent" : color,
          borderColor: color,
          color: isFullDay ? "#2c3e50" : "#fff",
        },
      };
    },
    [currentDate, isFullDayEvent, levelColors]
  );

  const EventComponent = useCallback(
    ({ event }: EventProps) => {
      const currentDateMoment = moment(currentDate);
      const isFullDay = isFullDayEvent(event);
      const isStart = currentDateMoment.isSame(event.start, "day");
      const isEnd = currentDateMoment.isSame(event.end, "day");
      const isMiddleDay =
        !isStart &&
        !isEnd &&
        currentDateMoment.isBetween(event.start, event.end, "day", "[]");

      if (isFullDay) {
        return (
          <div className="event-content full-day">
            <span className="event-title">{event.title}</span>
          </div>
        );
      }

      if (isMiddleDay) {
        return (
          <div className="event-content middle-day">
            <span className="event-title">{event.title}</span>
          </div>
        );
      }

      return (
        <div className="event-content">
          {isStart && (
            <div className="event-time start-time">
              {moment(event.start).format("HH:mm")}
            </div>
          )}
          <span className="event-title">{event.title}</span>
          {isEnd && (
            <div className="event-time end-time">
              {moment(event.end).format("HH:mm")}
            </div>
          )}
        </div>
      );
    },
    [currentDate, isFullDayEvent]
  );

  return (
    <div className="calendar-container">
      <UserHeader
        displayName={auth.currentUser?.displayName || ""}
        photoURL={auth.currentUser?.photoURL || ""}
      />
      <h2>📅 Lịch của bạn</h2>
      <TaskActions onCreate={() => setModalOpen(true)} onReload={loadTasks} />

      <Calendar<CalendarEvent>
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={currentView}
        onView={setCurrentView}
        date={currentDate}
        onNavigate={setCurrentDate}
        defaultView={Views.MONTH}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        style={{ height: 600 }}
        selectable
        onSelectSlot={handleSelectSlot}
        popup
        formats={{
          dayFormat: "DD",
          dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
            `${moment(start).format("DD/MM")} - ${moment(end).format(
              "DD/MM/YYYY"
            )}`,
        }}
        components={{
          event: EventComponent,
        }}
        eventPropGetter={eventPropGetter}
      />

      <CreateEditTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        edit={null}
        onSaved={loadTasks}
        defaultStart={defaultStart ?? undefined}
        defaultEnd={defaultEnd ?? undefined}
      />
    </div>
  );
};

export default React.memo(CalendarPage);
