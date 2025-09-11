import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { auth, loginWithGoogle } from "../services/firebase";
import { createUserIfNotExists } from "../services/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { toast } from "react-toastify";
import "../styles/About.css";

const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await createUserIfNotExists(
            currentUser.uid,
            currentUser.displayName || "User",
            currentUser.email || ""
          );
        } catch (error) {
          console.error("Error creating user:", error);
          toast.error("Có lỗi xảy ra khi tạo người dùng");
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleExperience = useCallback(async () => {
    try {
      if (user) {
        navigate("/tasks");
        return;
      }

      const loggedInUser = await loginWithGoogle();
      if (loggedInUser) {
        await createUserIfNotExists(
          loggedInUser.uid,
          loggedInUser.displayName || "User",
          loggedInUser.email || ""
        );
        toast.success(`Xin chào ${loggedInUser.displayName}!`);
        navigate("/tasks");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Đăng nhập thất bại, vui lòng thử lại.");
    }
  }, [user, navigate]);

  const titleVariants: Variants = {
    hidden: { opacity: 0, y: -50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  const descriptionVariants: Variants = {
    hidden: { opacity: 0, x: -100 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.8,
        delay: 0.3,
        ease: "easeOut",
      },
    },
  };

  const buttonVariants: Variants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        delay: 0.6,
        ease: "backOut",
      },
    },
    hover: {
      scale: 1.05,
      boxShadow: "0px 0px 20px rgba(255,255,255,0.3)",
      transition: {
        duration: 0.2,
      },
    },
    tap: {
      scale: 0.95,
    },
  };

  return (
    <motion.div
      className="about-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="gradient-bg">
        <motion.h1
          className="about-title"
          variants={titleVariants}
          initial="hidden"
          animate="visible"
        >
          <span className="gradient-text">Chào mừng tới Task Manager</span>
        </motion.h1>

        <motion.div
          className="about-desc"
          variants={descriptionVariants}
          initial="hidden"
          animate="visible"
        >
          <p className="desc-line">
            Đây là trang web lập lịch và quản lý thời gian dành cho sinh viên.
          </p>
          <p className="desc-line highlight">
            Hãy trải nghiệm ngay để sắp xếp ngày học tập và làm việc khoa học
            hơn!
          </p>
        </motion.div>

        <motion.button
          className="btn-experience"
          variants={buttonVariants}
          initial="hidden"
          animate="visible"
          whileHover="hover"
          whileTap="tap"
          onClick={handleExperience}
        >
          <span className="btn-text">Trải nghiệm ngay</span>
          <span className="btn-icon">→</span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default React.memo(AboutPage);
