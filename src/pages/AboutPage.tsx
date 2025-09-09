// src/pages/AboutPage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { auth, loginWithGoogle } from "../services/firebase";
import { createUserIfNotExists } from "../services/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { toast } from "react-toastify";
import "../styles/About.css";

const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // tạo user nếu chưa có
        await createUserIfNotExists(
          currentUser.uid,
          currentUser.displayName,
          currentUser.email
        );
      }
    });
    return () => unsubscribe();
  }, []);

  const handleExperience = async () => {
    if (user) {
      navigate("/tasks");
    } else {
      const loggedInUser = await loginWithGoogle();
      if (loggedInUser) {
        await createUserIfNotExists(
          loggedInUser.uid,
          loggedInUser.displayName,
          loggedInUser.email
        );

        toast.success(`Xin chào ${loggedInUser.displayName}!`);
        navigate("/tasks");
      } else {
        toast.error("Đăng nhập thất bại, vui lòng thử lại.");
      }
    }
  };

  return (
    <motion.div
      className="about-container"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <h1 className="about-title">Chào mừng tới Task Manager</h1>
      <p className="about-desc">
        Đây là trang web lập lịch và quản lý thời gian dành cho sinh viên.{" "}
        <br />
        Hãy trải nghiệm ngay để sắp xếp ngày học tập và làm việc khoa học hơn!
      </p>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="btn-experience"
        onClick={handleExperience}
      >
        Trải nghiệm ngay
      </motion.button>
    </motion.div>
  );
};

export default AboutPage;
