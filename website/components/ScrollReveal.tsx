"use client";
import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-animate]");

    const reveal = (el: HTMLElement) => {
      const delay = parseFloat(el.dataset.delay ?? "0") * 1000;
      setTimeout(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0) scale(1)";
      }, delay);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target as HTMLElement);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -20px 0px" }
    );

    els.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = el.dataset.animateFrom ?? "translateY(32px)";
      el.style.transition = `opacity 0.65s ease, transform 0.65s cubic-bezier(0.16,1,0.3,1)`;

      // already in viewport → reveal immediately without waiting for scroll
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 20) {
        reveal(el);
      } else {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
