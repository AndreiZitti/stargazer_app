"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { DeepSkyObject } from "@/lib/types";

interface FeaturedDSOCardProps {
  dso: DeepSkyObject;
  imagePath: string;
  month: string;
  year: number;
}

// Modal component
function DSOModal({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:p-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal content */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-card border border-card-border rounded-2xl shadow-2xl mt-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white/80 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}

// Type icons
const TypeIcons: Record<string, React.ReactNode> = {
  Gal: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="6" ry="2.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  SNR: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="8" strokeDasharray="3 2" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  ),
  EN: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3C8 3 4 7 4 12s4 9 8 9 8-5 8-9-4-9-8-9z" />
      <circle cx="10" cy="10" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  ),
  OC: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="8" r="2" />
      <circle cx="8" cy="14" r="1.5" />
      <circle cx="16" cy="13" r="1.5" />
      <circle cx="11" cy="17" r="1" />
      <circle cx="15" cy="17" r="1" />
    </svg>
  ),
};

// Equipment icons
const EquipmentIcons: Record<string, { icon: React.ReactNode; label: string }> = {
  naked_eye: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      </svg>
    ),
    label: "Naked eye",
  },
  binoculars: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7" cy="14" r="4" />
        <circle cx="17" cy="14" r="4" />
        <path d="M7 10V6M17 10V6M11 14h2" />
      </svg>
    ),
    label: "Binoculars",
  },
  small_telescope: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 6l-8 8M3 18l6-6M13 8l-2 2" />
        <circle cx="19" cy="5" r="2" />
      </svg>
    ),
    label: "Telescope",
  },
};

// Difficulty styles
const difficultyConfig: Record<string, { bg: string; text: string; label: string }> = {
  easy: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Easy" },
  moderate: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Moderate" },
  challenging: { bg: "bg-rose-500/20", text: "text-rose-400", label: "Challenging" },
};

export default function FeaturedDSOCard({ dso, imagePath, month, year }: FeaturedDSOCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSkyView, setShowSkyView] = useState(false);

  const difficulty = difficultyConfig[dso.visibility.difficulty] || difficultyConfig.moderate;
  const equipment = EquipmentIcons[dso.visibility.equipment_minimum] || EquipmentIcons.binoculars;
  const typeIcon = TypeIcons[dso.physical.type_short] || TypeIcons.EN;

  // Build Stellarium URL
  const getStellariumUrl = () => {
    const skysourceId = dso.stellarium?.skysource_id || dso.id;
    const fov = dso.stellarium?.default_fov || 30;
    const monthNum = month === "December" ? 12 : 1;
    const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-15T22:00`;

    const url = new URL(`https://stellarium-web.org/skysource/${encodeURIComponent(skysourceId)}`);
    url.searchParams.set("date", dateStr);
    url.searchParams.set("lat", "48");
    url.searchParams.set("lng", "11");
    url.searchParams.set("fov", String(fov));
    return url.toString();
  };

  return (
    <>
      {/* Card Preview */}
      <article
        className="bg-card border border-card-border rounded-2xl overflow-hidden transition-all duration-300 hover:border-accent/40 cursor-pointer group"
        onClick={() => setIsModalOpen(true)}
      >
        {/* Hero Image + Overlay */}
        <div className="relative aspect-[16/9] overflow-hidden">
          <Image
            src={imagePath}
            alt={dso.names.primary}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />

          {/* Quick stats overlay - top right */}
          <div className="absolute top-4 right-4 flex gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${difficulty.bg} ${difficulty.text} backdrop-blur-sm`}>
              {difficulty.label}
            </span>
          </div>

          {/* Title overlay - bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="flex items-center gap-2 text-foreground/60 text-sm mb-1">
              <span className="text-accent">{typeIcon}</span>
              <span>{dso.physical.type}</span>
              <span className="text-foreground/30">in</span>
              <span>{dso.physical.constellation}</span>
            </div>
            <h3 className="text-2xl font-bold text-foreground">{dso.names.primary}</h3>
            <p className="text-foreground/50 text-sm">{dso.id} {dso.names.catalog?.[0] && `/ ${dso.names.catalog[0]}`}</p>
          </div>
        </div>

        {/* Quick Info Bar */}
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            {/* Equipment needed */}
            <div className="flex items-center gap-2 text-foreground/60">
              <span className="text-foreground/40">{equipment.icon}</span>
              <span>{equipment.label}</span>
            </div>
            {/* Distance */}
            <div className="text-foreground/60 hidden sm:block">
              {dso.physical.distance_ly >= 1000000
                ? `${(dso.physical.distance_ly / 1000000).toFixed(1)}M ly`
                : `${dso.physical.distance_ly.toLocaleString()} ly`}
            </div>
          </div>

          {/* Learn more indicator */}
          <div className="flex items-center gap-1.5 text-accent text-sm font-medium group-hover:gap-2 transition-all">
            <span>Explore</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </article>

      {/* Modal */}
      <DSOModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setShowSkyView(false); }}>
        {/* Modal Hero */}
        <div className="relative aspect-[21/9] overflow-hidden">
          <Image
            src={imagePath}
            alt={dso.names.primary}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-center gap-2 text-foreground/60 text-sm mb-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${difficulty.bg} ${difficulty.text}`}>
                {difficulty.label}
              </span>
              <span className="text-accent">{typeIcon}</span>
              <span>{dso.physical.type}</span>
              <span className="text-foreground/30">in</span>
              <span>{dso.physical.constellation}</span>
            </div>
            <h2 className="text-3xl font-bold text-foreground">{dso.names.primary}</h2>
            <p className="text-foreground/50">{dso.id} {dso.names.catalog?.[0] && `/ ${dso.names.catalog[0]}`}</p>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Quick stats */}
          <div className="flex flex-wrap gap-4 text-sm pb-4 border-b border-card-border/50">
            <div className="flex items-center gap-2 text-foreground/70">
              <span className="text-foreground/40">{equipment.icon}</span>
              <span>{equipment.label} minimum</span>
            </div>
            <div className="text-foreground/70">
              <span className="text-foreground/40 mr-1.5">Distance:</span>
              {dso.physical.distance_ly >= 1000000
                ? `${(dso.physical.distance_ly / 1000000).toFixed(1)} million ly`
                : `${dso.physical.distance_ly.toLocaleString()} ly`}
            </div>
            {dso.physical.magnitude_visual && (
              <div className="text-foreground/70">
                <span className="text-foreground/40 mr-1.5">Magnitude:</span>
                {dso.physical.magnitude_visual}
              </div>
            )}
            {dso.physical.size_arcmin && (
              <div className="text-foreground/70">
                <span className="text-foreground/40 mr-1.5">Size:</span>
                {dso.physical.size_arcmin}&apos;
              </div>
            )}
          </div>

          {/* Short description */}
          <p className="text-foreground/80 leading-relaxed text-lg">{dso.science.short_description}</p>

          {/* The Story */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-foreground/40 font-medium mb-3">The Story</h4>
            <p className="text-foreground/70 leading-relaxed">{dso.science.full_description}</p>
          </div>

          {/* What You'll See */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-foreground/40 font-medium mb-3">What You&apos;ll See</h4>
            <div className="grid gap-3">
              {dso.observation.naked_eye !== "Not visible" && (
                <div className="flex gap-3 p-3 bg-foreground/5 rounded-lg">
                  <div className="text-foreground/40 shrink-0 mt-0.5">{EquipmentIcons.naked_eye.icon}</div>
                  <div>
                    <div className="text-xs text-foreground/50 mb-0.5">Naked Eye</div>
                    <p className="text-sm text-foreground/70">{dso.observation.naked_eye}</p>
                  </div>
                </div>
              )}
              <div className="flex gap-3 p-3 bg-foreground/5 rounded-lg">
                <div className="text-foreground/40 shrink-0 mt-0.5">{EquipmentIcons.binoculars.icon}</div>
                <div>
                  <div className="text-xs text-foreground/50 mb-0.5">Binoculars</div>
                  <p className="text-sm text-foreground/70">{dso.observation.binoculars}</p>
                </div>
              </div>
              <div className="flex gap-3 p-3 bg-foreground/5 rounded-lg">
                <div className="text-foreground/40 shrink-0 mt-0.5">{EquipmentIcons.small_telescope.icon}</div>
                <div>
                  <div className="text-xs text-foreground/50 mb-0.5">Telescope</div>
                  <p className="text-sm text-foreground/70">{dso.observation.small_telescope}</p>
                </div>
              </div>
            </div>
          </div>

          {/* How to Find It */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-foreground/40 font-medium mb-3">How to Find It</h4>
            <p className="text-foreground/70 leading-relaxed mb-4">{dso.finding.naked_eye_guide}</p>

            {/* Star hop steps */}
            <div className="space-y-2">
              {dso.finding.star_hop?.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs shrink-0 font-medium">
                    {step.step}
                  </span>
                  <span className="text-foreground/60 text-sm pt-0.5">{step.instruction}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fun Facts */}
          {dso.science.interesting_facts?.length > 0 && (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
              <h4 className="text-xs uppercase tracking-wider text-accent/70 font-medium mb-3">Did You Know?</h4>
              <ul className="space-y-2">
                {dso.science.interesting_facts.map((fact, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/70">
                    <span className="text-accent shrink-0">*</span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sky View */}
          <div>
            <button
              onClick={() => setShowSkyView(!showSkyView)}
              className="flex items-center gap-2 px-4 py-3 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-xl text-accent transition-colors w-full justify-center font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0 1 0 20" strokeDasharray="4 4" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
              <span>{showSkyView ? "Hide Night Sky View" : "Find It in the Night Sky"}</span>
            </button>

            {showSkyView && (
              <div className="mt-4 rounded-xl overflow-hidden border border-card-border">
                <div className="bg-card-border/30 px-4 py-2.5 text-sm text-foreground/60 flex items-center justify-between">
                  <span>{month} 15, {year} at 10:00 PM</span>
                  <a
                    href={getStellariumUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    Open fullscreen
                  </a>
                </div>
                <iframe
                  src={getStellariumUrl()}
                  className="w-full border-0"
                  style={{ height: "400px" }}
                  allow="fullscreen"
                  title={`Sky view of ${dso.names.primary}`}
                />
              </div>
            )}
          </div>
        </div>
      </DSOModal>
    </>
  );
}
