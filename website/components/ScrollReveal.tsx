"use client";
import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-animate]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = el.dataset.delay ?? "0";
            setTimeout(() => {
              el.style.opacity = "1";
              el.style.transform = "translateY(0) scale(1)";
            }, parseFloat(delay) * 1000);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );

    els.forEach((el) => {
      // set initial hidden state
      el.style.opacity = "0";
      el.style.transform = el.dataset.animateFrom ?? "translateY(32px)";
      el.style.transition = `opacity 0.65s ease, transform 0.65s cubic-bezier(0.16,1,0.3,1)`;
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
