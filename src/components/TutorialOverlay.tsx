"use client";

import { useState, useEffect, useCallback } from "react";

export interface TutorialStep {
  target: string; // data-tutorial attribute value
  title: string;
  description: string;
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface SpotlightPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function TutorialOverlay({
  steps,
  isActive,
  onComplete,
  onSkip,
}: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightPosition | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number; placement: "top" | "bottom" | "left" | "right" }>({ top: 0, left: 0, placement: "bottom" });

  const step = steps[currentStep];

  // Calculate spotlight position
  const updatePositions = useCallback(() => {
    if (!step) return;

    const element = document.querySelector(`[data-tutorial="${step.target}"]`);
    if (!element) {
      // Element not found, skip to next step or complete
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        onComplete();
      }
      return;
    }

    const rect = element.getBoundingClientRect();
    const padding = 8;

    setSpotlight({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });

    // Calculate tooltip position - prefer placing to the side to avoid covering element
    const tooltipWidth = 280;
    const tooltipHeight = 120;
    const margin = 16;

    let placement: "top" | "bottom" | "left" | "right" = "right";
    let top = rect.top + rect.height / 2 - tooltipHeight / 2;
    let left = rect.right + margin;

    // Try right first
    if (left + tooltipWidth > window.innerWidth - margin) {
      // Try left
      placement = "left";
      left = rect.left - tooltipWidth - margin;
    }

    // If left doesn't work either, try bottom
    if (left < margin) {
      placement = "bottom";
      top = rect.bottom + margin;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;

      // Clamp horizontal position
      if (left < margin) left = margin;
      if (left + tooltipWidth > window.innerWidth - margin) {
        left = window.innerWidth - tooltipWidth - margin;
      }

      // If bottom doesn't work, try top
      if (top + tooltipHeight > window.innerHeight - margin) {
        placement = "top";
        top = rect.top - tooltipHeight - margin;
      }
    }

    // Clamp vertical position
    if (top < margin) top = margin;
    if (top + tooltipHeight > window.innerHeight - margin) {
      top = window.innerHeight - tooltipHeight - margin;
    }

    setTooltipPosition({ top, left, placement });
  }, [step, currentStep, steps.length, onComplete]);

  useEffect(() => {
    if (isActive) {
      updatePositions();
      window.addEventListener("resize", updatePositions);
      return () => window.removeEventListener("resize", updatePositions);
    }
  }, [isActive, updatePositions]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case " ":
          e.preventDefault();
          handleNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleBack();
          break;
        case "Escape":
          e.preventDefault();
          onSkip();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleBackdropClick = () => {
    handleNext();
  };

  if (!isActive || !spotlight) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Semi-transparent backdrop with spotlight cutout */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        onClick={handleBackdropClick}
        style={{
          background: `radial-gradient(circle at ${spotlight.left + spotlight.width / 2}px ${spotlight.top + spotlight.height / 2}px, transparent ${Math.max(spotlight.width, spotlight.height) / 2}px, rgba(0,0,0,0.6) ${Math.max(spotlight.width, spotlight.height) / 2 + 50}px)`,
        }}
      />

      {/* Spotlight glow effect */}
      <div
        className="absolute pointer-events-none rounded-lg transition-all duration-300"
        style={{
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
          boxShadow: "0 0 0 4px rgba(99, 102, 241, 0.5), 0 0 30px rgba(99, 102, 241, 0.3)",
        }}
      />

      {/* Tooltip */}
      <div
        className="absolute bg-card border border-card-border rounded-lg shadow-2xl p-4 transition-all duration-300"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          width: 280,
        }}
      >
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-accent"
                    : index < currentStep
                    ? "bg-accent/50"
                    : "bg-foreground/20"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-foreground/50">
            {currentStep + 1}/{steps.length}
          </span>
        </div>

        {/* Content */}
        <h3 className="text-sm font-semibold mb-1">{step.title}</h3>
        <p className="text-xs text-foreground/70 mb-3">{step.description}</p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-xs text-foreground/50 hover:text-foreground/70 transition-colors"
          >
            Skip
          </button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="px-2.5 py-1 text-xs rounded border border-card-border hover:bg-foreground/5 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-3 py-1 text-xs font-medium rounded bg-accent hover:bg-accent-hover text-white transition-colors"
            >
              {currentStep < steps.length - 1 ? "Next" : "Done"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
