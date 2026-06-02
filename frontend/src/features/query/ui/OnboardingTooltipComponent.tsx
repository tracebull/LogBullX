import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  targetRef: React.RefObject<HTMLElement | null>;
  show: boolean;
}

export const OnboardingTooltipComponent: React.FC<Props> = ({ targetRef, show }) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setTargetRect(rect);
      // Trigger animation after a small delay
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [show, targetRef]);

  if (!show || !targetRect) {
    return null;
  }

  const padding = 8;
  const borderRadius = 12;
  const spotlightLeft = targetRect.left - padding;
  const spotlightTop = targetRect.top - padding;
  const spotlightWidth = targetRect.width + padding * 2;
  const spotlightHeight = targetRect.height + padding * 2;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ pointerEvents: 'none' }}
    >
      {/* Dark overlay using four divs to create a frame around the spotlight */}

      {/* Top overlay */}
      <div
        className="absolute top-0 right-0 left-0 bg-black/70"
        style={{
          height: `${spotlightTop}px`,
          pointerEvents: 'auto',
        }}
      />

      {/* Left overlay */}
      <div
        className="absolute left-0 bg-black/70"
        style={{
          top: `${spotlightTop}px`,
          width: `${spotlightLeft}px`,
          height: `${spotlightHeight}px`,
          pointerEvents: 'auto',
        }}
      />

      {/* Right overlay */}
      <div
        className="absolute right-0 bg-black/70"
        style={{
          top: `${spotlightTop}px`,
          left: `${spotlightLeft + spotlightWidth}px`,
          height: `${spotlightHeight}px`,
          pointerEvents: 'auto',
        }}
      />

      {/* Bottom overlay */}
      <div
        className="absolute right-0 bottom-0 left-0 bg-black/70"
        style={{
          top: `${spotlightTop + spotlightHeight}px`,
          pointerEvents: 'auto',
        }}
      />

      {/* Corner pieces with radial gradient to create rounded cutout effect */}
      {/* Top-left corner */}
      <div
        className="absolute"
        style={{
          left: `${spotlightLeft}px`,
          top: `${spotlightTop}px`,
          width: `${borderRadius}px`,
          height: `${borderRadius}px`,
          background: `radial-gradient(circle at bottom right, transparent ${borderRadius}px, rgba(0, 0, 0, 0.7) ${borderRadius}px)`,
          pointerEvents: 'auto',
        }}
      />

      {/* Top-right corner */}
      <div
        className="absolute"
        style={{
          left: `${spotlightLeft + spotlightWidth - borderRadius}px`,
          top: `${spotlightTop}px`,
          width: `${borderRadius}px`,
          height: `${borderRadius}px`,
          background: `radial-gradient(circle at bottom left, transparent ${borderRadius}px, rgba(0, 0, 0, 0.7) ${borderRadius}px)`,
          pointerEvents: 'auto',
        }}
      />

      {/* Bottom-left corner */}
      <div
        className="absolute"
        style={{
          left: `${spotlightLeft}px`,
          top: `${spotlightTop + spotlightHeight - borderRadius}px`,
          width: `${borderRadius}px`,
          height: `${borderRadius}px`,
          background: `radial-gradient(circle at top right, transparent ${borderRadius}px, rgba(0, 0, 0, 0.7) ${borderRadius}px)`,
          pointerEvents: 'auto',
        }}
      />

      {/* Bottom-right corner */}
      <div
        className="absolute"
        style={{
          left: `${spotlightLeft + spotlightWidth - borderRadius}px`,
          top: `${spotlightTop + spotlightHeight - borderRadius}px`,
          width: `${borderRadius}px`,
          height: `${borderRadius}px`,
          background: `radial-gradient(circle at top left, transparent ${borderRadius}px, rgba(0, 0, 0, 0.7) ${borderRadius}px)`,
          pointerEvents: 'auto',
        }}
      />

      {/* Spotlight border with rounded corners - allows clicks to pass through to button */}
      <div
        className="absolute border-4 border-white shadow-lg"
        style={{
          left: `${spotlightLeft}px`,
          top: `${spotlightTop}px`,
          width: `${spotlightWidth}px`,
          height: `${spotlightHeight}px`,
          borderRadius: `${borderRadius}px`,
          pointerEvents: 'none',
        }}
      />

      {/* Tooltip with arrow */}
      <div
        className={`absolute rounded-lg bg-card px-4 py-3 shadow-xl transition-all duration-500 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}
        style={{
          left: `${targetRect.left + targetRect.width / 2}px`,
          top: `${targetRect.bottom + 20}px`,
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
        }}
      >
        <div className="text-center text-sm font-medium text-emerald-600">Click here</div>
        {/* Arrow pointing up */}
        <div
          className="absolute -top-2 left-1/2 h-0 w-0 -translate-x-1/2 border-8 border-transparent border-b-card"
          style={{
            borderTopWidth: 0,
          }}
        />
      </div>
    </div>,
    document.body,
  );
};
