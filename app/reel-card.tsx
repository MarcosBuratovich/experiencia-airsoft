"use client";

import { useRef, useState } from "react";

type Props = {
  title: string;
  index: string;
  image: string;
  alt: string;
  video: string;
  delayClass: string;
};

export function ReelCard({ title, index, image, alt, video, delayClass }: Props) {
  const [active, setActive] = useState(false);
  const vidRef = useRef<HTMLVideoElement | null>(null);

  const handleActivate = () => {
    const v = vidRef.current;
    if (!v) return;
    setActive(true);
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  };

  return (
    <div
      className={`group relative block imgcard aspect-[9/16] bg-carbon clip-notch reveal ${delayClass}`}
    >
      <video
        ref={vidRef}
        src={video}
        poster={image}
        preload="none"
        controls={active}
        playsInline
        className="absolute inset-0 w-full h-full object-cover bg-ink"
      />
      {!active && (
        <button
          type="button"
          onClick={handleActivate}
          className="absolute inset-0 w-full h-full text-left cursor-pointer"
          aria-label={`Reproducir: ${title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={alt}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent pointer-events-none"></div>
          <div className="absolute top-3 left-3 font-mono fluid-xs tracking-[.28em] uppercase text-bone/80 bg-ink/60 px-2 py-1 pointer-events-none">
            REEL · {index}
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-orange/90 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-[0_10px_40px_-10px_rgba(255,107,26,.7)]">
              <svg
                viewBox="0 0 24 24"
                className="w-7 h-7 md:w-8 md:h-8 text-ink translate-x-[1px]"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 p-4 md:p-5 pointer-events-none">
            <h3 className="font-display fluid-xl uppercase text-bone leading-tight">
              {title}
            </h3>
            <div className="mt-2 flex items-center gap-2 font-mono fluid-xs tracking-[.25em] uppercase text-orange">
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              Ver reel
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
