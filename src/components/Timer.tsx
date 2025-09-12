import { useState, useEffect, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../styles/Timer.css";

interface TimerProps {
  taskName: string;
  endTime: Date;
  onClose: () => void;
}

interface NotificationPoint {
  percentage: number;
  message: string;
  soundType: "alert" | "warning" | "complete";
}

const Timer = ({ taskName, endTime, onClose }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [customTime, setCustomTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  //   const [setLastNotificationPercentage] = useState<number>(0);

  const notificationPoints: NotificationPoint[] = [
    { percentage: 50, message: "Còn 50% thời gian!", soundType: "warning" },
    { percentage: 90, message: "Sắp hết giờ - còn 10%!", soundType: "alert" },
    { percentage: 100, message: "Hết giờ!", soundType: "complete" },
  ];

  const playSound = (type: "alert" | "warning" | "complete") => {
    const context = new (window.AudioContext ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    switch (type) {
      case "warning": // 50% remaining
        oscillator.frequency.value = 440;
        oscillator.type = "sine";
        gainNode.gain.value = 0.3;

        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          context.close();
        }, 800);
        break;

      case "alert": // 10% remaining
        oscillator.frequency.value = 880;
        oscillator.type = "square";
        gainNode.gain.value = 0.4;

        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          context.close();
        }, 1000);
        break;

      case "complete": {
        oscillator.type = "sine";
        oscillator.frequency.value = 1200;
        gainNode.gain.value = 0.4;

        const oscillator2 = context.createOscillator();
        oscillator2.connect(gainNode);
        oscillator2.type = "sine";
        oscillator2.frequency.value = 1500;

        oscillator.start();
        oscillator2.start();

        setTimeout(() => oscillator2.stop(), 200);
        setTimeout(() => {
          oscillator.stop();
          context.close();
        }, 400);
        break;
      }
    }
  };

  const notify = (
    message: string,
    soundType: "alert" | "warning" | "complete"
  ) => {
    switch (soundType) {
      case "alert":
        toast.error(`${taskName}: ${message}`);
        break;
      case "warning":
        toast.warning(`${taskName}: ${message}`);
        break;
      case "complete":
        toast.success(`${taskName}: ${message}`);
        break;
    }
    playSound(soundType);
  };

  const lastNotificationPercentageRef = useRef<number>(0);

  useEffect(() => {
    const maxTime = endTime.getTime() - Date.now();
    const initialTime = Math.min(customTime || maxTime, maxTime);
    setTimeLeft(initialTime);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          notify("Hết giờ!", "complete");
          return 0;
        }

        const percentageComplete = ((initialTime - prev) / initialTime) * 100;

        notificationPoints.forEach((point) => {
          if (
            percentageComplete >= point.percentage &&
            lastNotificationPercentageRef.current < point.percentage
          ) {
            notify(point.message, point.soundType);
            lastNotificationPercentageRef.current = point.percentage;
          }
        });

        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [customTime, endTime]);

  const formatTime = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const handleCustomTime = (minutes: number) => {
    const maxMinutes = Math.floor((endTime.getTime() - Date.now()) / 60000);
    if (minutes > maxMinutes) {
      toast.warning(`Thời gian tối đa cho phép là ${maxMinutes} phút`, {
        position: "top-right",
      });
      return;
    }
    setCustomTime(minutes * 60000);
    // setLastNotificationPercentage(0); // Reset notification tracking for new timer
  };

  return (
    <div className="timer-modal">
      <div className="timer-content">
        <h3>{taskName}</h3>
        <div className="time-display">{formatTime(timeLeft)}</div>

        <div className="timer-controls">
          <input
            type="number"
            placeholder="Đặt số phút"
            min="1"
            max={Math.floor((endTime.getTime() - Date.now()) / 60000)}
            onChange={(e) => handleCustomTime(parseInt(e.target.value))}
          />
          <button onClick={onClose} className="close-button">
            Đóng
          </button>
        </div>

        <audio ref={audioRef} />
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default Timer;
