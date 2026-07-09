"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import styles from "./DemoVideoModal.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DemoVideoModal({ open, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";

    if (!open) {
      videoRef.current?.pause();
      if (videoRef.current) videoRef.current.currentTime = 0;
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Salon Central demo video"
        onClick={(e) => e.stopPropagation()}
      >
        <button className={styles.close} onClick={onClose} aria-label="Close demo video">
          <X size={18} />
        </button>

        <video
          ref={videoRef}
          className={styles.video}
          src="/salon central demo.mp4"
          controls
          autoPlay
          playsInline
          preload="metadata"
        />
      </div>
    </div>,
    document.body
  );
}
