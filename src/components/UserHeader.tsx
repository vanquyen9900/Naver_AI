// src/components/UserHeader.tsx
import React from "react";
import { auth } from "../services/firebase";
import { toast } from "react-toastify";
import "../styles/TaskPage.css";

interface Props {
  displayName?: string | null;
  photoURL?: string | null;
}

const UserHeader: React.FC<Props> = ({ displayName, photoURL }) => {
  const handleLogout = async () => {
    await auth.signOut();
    toast.info("Đã đăng xuất!");
  };

  return (
    <div className="tasks-header">
      {photoURL && <img src={photoURL} alt="avatar" className="user-avatar" />}
      <h2 className="user-name">{displayName ?? "Người dùng"}</h2>
      <button className="btn-logout" onClick={handleLogout}>
        Đăng xuất
      </button>
    </div>
  );
};

export default UserHeader;
