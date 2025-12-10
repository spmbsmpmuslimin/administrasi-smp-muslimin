import React, { useState, useEffect } from "react";
import { X, Bell, Calendar } from "lucide-react";
import { supabase } from "../supabaseClient";

const AnnouncementPopup = ({ userId, userRole }) => {
  const [announcement, setAnnouncement] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (userId && userRole) {
      checkForNewAnnouncement();
    }
  }, [userId, userRole]);

  const checkForNewAnnouncement = async () => {
    try {
      const now = new Date().toISOString();
      const today = new Date().toISOString().split("T")[0];

      // 1. Ambil pengumuman terbaru yang aktif
      const { data: announcements, error: fetchError } = await supabase
        .from("announcement")
        .select("*")
        .eq("is_active", true)
        .lte("effective_from", now)
        .gte("effective_until", now)
        .or(`target_role.eq.${userRole},target_role.eq.semua`)
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error("Error fetching announcements:", fetchError);
        return;
      }

      if (!announcements || announcements.length === 0) {
        return;
      }

      const latestAnnouncement = announcements[0];

      // 2. 🆕 Cek apakah user sudah baca pengumuman ini HARI INI
      const { data: readStatus, error: readError } = await supabase
        .from("announcement_reads")
        .select("*")
        .eq("announcement_id", latestAnnouncement.id)
        .eq("user_id", userId)
        .gte("read_at", today + "T00:00:00")
        .maybeSingle();

      if (readError) {
        console.error("Error checking read status:", readError);
        return;
      }

      // 3. Tampilkan popup jika belum dibaca hari ini
      if (!readStatus) {
        setAnnouncement(latestAnnouncement);
        setShowPopup(true);
      }
    } catch (error) {
      console.error("Error checking announcement:", error);
    }
  };

  const handleClose = async () => {
    if (!announcement || !userId) return;

    try {
      const { error } = await supabase.from("announcement_reads").insert({
        announcement_id: announcement.id,
        user_id: userId,
        read_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error marking announcement as read:", error);
      }
    } catch (error) {
      console.error("Error in handleClose:", error);
    } finally {
      setShowPopup(false);
      setAnnouncement(null);
    }
  };

  if (!showPopup || !announcement) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-2 sm:p-3 md:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] md:max-h-[80vh] overflow-hidden mx-2 sm:mx-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-800 text-white p-3 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            <h2 className="text-lg sm:text-xl font-bold">📢 Pengumuman</h2>
          </div>
          <button
            onClick={handleClose}
            className="hover:bg-blue-700 dark:hover:bg-blue-900 rounded-full p-1.5 sm:p-1 transition-colors touch-target min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Tutup pengumuman">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 md:p-6 overflow-y-auto max-h-[calc(90vh-180px)] sm:max-h-[calc(85vh-180px)] md:max-h-[60vh]">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3 sm:mb-4">
            {announcement.title}
          </h3>

          <div className="prose max-w-none dark:prose-invert">
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
              {announcement.content}
            </p>
          </div>

          {/* Timestamp */}
          <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>
                {new Date(announcement.created_at).toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800 p-3 sm:p-4 flex justify-end border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleClose}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-800 dark:hover:to-indigo-800 text-white px-5 sm:px-6 py-2.5 sm:py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base touch-target min-h-[44px] w-full sm:w-auto"
            aria-label="Tutup pengumuman">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementPopup;
