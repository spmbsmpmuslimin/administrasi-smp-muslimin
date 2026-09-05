// components/ui/useConfirmDialog.js
import { useState, useCallback, useRef } from "react";

// ⭐ Hook buat manggil ConfirmDialog secara promise-based, MIRIP
// window.confirm() ("await confirm(...)" balikin true/false) tapi pake
// modal custom yang bisa di-style (lihat ConfirmDialog.js).
//
// Pemakaian di komponen:
//
//   import ConfirmDialog from "../components/ui/ConfirmDialog";
//   import { useConfirmDialog } from "../components/ui/useConfirmDialog";
//
//   const { confirm, confirmDialogProps } = useConfirmDialog();
//
//   const handleReset = async () => {
//     const ok = await confirm({
//       title: "Reset Pembagian",
//       message: "Reset pembagian 32 siswa? Semua kelas akan direset.",
//       variant: "danger",
//       confirmText: "Ya, Reset",
//     });
//     if (!ok) return;
//     // ...lanjut proses
//   };
//
//   return (
//     <>
//       ...
//       <ConfirmDialog {...confirmDialogProps} />
//     </>
//   );
//
// Kalau `confirm` mau dioper ke fungsi di luar komponen (misal
// ClassOperations.js), tinggal oper `confirm` itu sendiri sebagai
// parameter -- fungsi tujuan tinggal `await confirmFn({ message: "..." })`,
// gak perlu tau soal state/modal-nya sama sekali.
export function useConfirmDialog() {
  const [state, setState] = useState({ isOpen: false });
  const resolveRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ isOpen: true, ...options });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false }));
    if (resolveRef.current) resolveRef.current(true);
  }, []);

  const handleCancel = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false }));
    if (resolveRef.current) resolveRef.current(false);
  }, []);

  return {
    confirm,
    confirmDialogProps: {
      ...state,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}
