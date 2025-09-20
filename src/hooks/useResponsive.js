import { useState, useEffect } from 'react';
import { breakpoints, getScreenSize } from '../utils/styles.js';

export function useResponsive() {
  const [screenSize, setScreenSize] = useState(() => getScreenSize());

  useEffect(() => {
    const handleResize = () => {
      setScreenSize(getScreenSize());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    screenSize,
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: ['desktop', 'wide'].includes(screenSize),
    isWide: screenSize === 'wide'
  };
}

// Responsive style helpers
export const getResponsiveStyles = (responsive) => {
  const { isMobile, isTablet, isDesktop } = responsive;
  
  return {
    // Layout styles
    app: {
      display: "flex",
      height: "100vh",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Helvetica, Arial",
      flexDirection: isMobile ? "column" : "row"
    },
    sidebar: {
      width: isMobile ? "100%" : "260px",
      minHeight: isMobile ? "60px" : "100vh",
      background: "#0ea5e9",
      color: "white",
      padding: 16,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      position: isMobile ? "relative" : "fixed",
      left: isMobile ? "auto" : 0,
      top: isMobile ? "auto" : 0,
      zIndex: isMobile ? "auto" : 1000
    },
    content: {
      flex: 1,
      background: "#f8fafc",
      display: "flex",
      flexDirection: "column",
      marginLeft: isMobile ? 0 : "260px"
    },
    // Grid styles
    grid: {
      display: "grid",
      gap: isMobile ? 8 : 16,
      gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)"
    },
    // Form styles
    formGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
      gap: isMobile ? 8 : 12
    },
    // Flex styles
    flexRow: {
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      gap: isMobile ? 8 : 16,
      alignItems: isMobile ? "stretch" : "center"
    },
    // Typography
    fontSize: {
      small: isMobile ? "12px" : "14px",
      medium: isMobile ? "14px" : "16px",
      large: isMobile ? "16px" : "18px",
      xlarge: isMobile ? "20px" : "24px"
    },
    // Spacing
    padding: {
      small: isMobile ? 8 : 12,
      medium: isMobile ? 12 : 16,
      large: isMobile ? 16 : 20
    }
  };
};
