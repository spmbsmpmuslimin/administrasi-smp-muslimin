//[file name]: KonselingMain.js
import React from "react";
import Konseling from "./Konseling";
import HomeVisit from "./home-visit/HomeVisit";

// ============================================================
// Pintu masuk tunggal buat modul Konseling.
// App.js cukup import & render KonselingMain SEKALI, tinggal
// nambah case initialTab baru tiap ada sub-fitur baru
// (Konseling saat ini: "konseling" & "home-visit").
//
// Catatan: Konseling.js butuh props (user, onShowToast, darkMode),
// sedangkan HomeVisit.js saat ini cuma butuh (darkMode) — jadi
// setiap komponen dikasih props sesuai kebutuhannya masing-masing.
// ============================================================

const KonselingMain = ({ user, onShowToast, darkMode, initialTab = "konseling" }) => {
  switch (initialTab) {
    case "home-visit":
      return <HomeVisit darkMode={darkMode} />;
    case "konseling":
    default:
      return <Konseling user={user} onShowToast={onShowToast} darkMode={darkMode} />;
  }
};

export default KonselingMain;
