import React, { useState, useEffect } from 'react';
import { customSmoothScroll } from '../../utils.js';

export function ScrollTopButton() {
  const [visible, setVisible] = useState(false);
  const frameRef = React.useRef(0);

  useEffect(() => {
    const updateVisibility = () => {
      frameRef.current = 0;
      const nextVisible = window.scrollY > 280;
      setVisible((currentVisible) => (currentVisible === nextVisible ? currentVisible : nextVisible));
    };

    const handleScroll = () => {
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(updateVisibility);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <button
      className="scroll-top-btn"
      onClick={() => customSmoothScroll(0, 950)}
      aria-label="Move to top"
      title="Move to top"
    >
      ↑ Top
    </button>
  );
}
