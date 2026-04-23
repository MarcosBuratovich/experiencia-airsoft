"use client";

import { useEffect } from "react";

export function ScrollFx() {
  useEffect(() => {
    const nav = document.getElementById("nav");
    if (!nav) return;

    const onScroll = () => {
      if (window.scrollY > 32) nav.classList.add("nav-scrolled");
      else nav.classList.remove("nav-scrolled");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements = document.querySelectorAll<HTMLElement>(".reveal");
    document.documentElement.classList.add("js-reveal");

    if (reduced) {
      elements.forEach((el) => el.classList.add("in"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
      );
      elements.forEach((el) => io.observe(el));

      return () => {
        window.removeEventListener("scroll", onScroll);
        io.disconnect();
      };
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
