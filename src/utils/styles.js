// Responsive breakpoints
export const breakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1200
};

// Screen size detection utility
export const getScreenSize = () => {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < breakpoints.mobile) return 'mobile';
  if (width < breakpoints.tablet) return 'tablet';
  if (width < breakpoints.desktop) return 'desktop';
  return 'wide';
};

// Responsive utility functions
export const isMobile = () => getScreenSize() === 'mobile';
export const isTablet = () => getScreenSize() === 'tablet';
export const isDesktop = () => ['desktop', 'wide'].includes(getScreenSize());

// Base styles for the application
export const baseStyles = {
  app: { 
    display: "flex", 
    height: "100vh", 
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Helvetica, Arial",
    flexDirection: "column" // Mobile first: stack vertically
  },
  sidebar: { 
    width: "100%",
    minHeight: "60px",
    background: "#0ea5e9", 
    color: "white", 
    padding: 16, 
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column"
  },
  brand: { 
    fontWeight: 800, 
    marginBottom: 16, 
    letterSpacing: 0.5,
    fontSize: "16px"
  },
  navItem: isActive => ({ 
    padding: "10px 12px", 
    borderRadius: 8, 
    cursor: "pointer", 
    marginBottom: 6, 
    background: isActive ? "rgba(255,255,255,0.25)" : "transparent",
    fontSize: "14px"
  }),
  content: { 
    flex: 1, 
    background: "#f8fafc", 
    display: "flex", 
    flexDirection: "column"
  },
  header: { 
    padding: 16, 
    background: "white", 
    borderBottom: "1px solid #e2e8f0", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "space-between",
    flexWrap: "wrap"
  },
  page: { 
    padding: 16, 
    overflow: "auto"
  },
  card: { 
    background: "white", 
    border: "1px solid #e2e8f0", 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16
  },
  input: { 
    padding: "10px 12px", 
    borderRadius: 10, 
    border: "1px solid #cbd5e1", 
    outline: "none", 
    width: "100%", 
    boxSizing: "border-box" 
  },
  select: { 
    padding: "10px 12px", 
    borderRadius: 10, 
    border: "1px solid #cbd5e1", 
    outline: "none", 
    width: "100%", 
    boxSizing: "border-box", 
    background: "white" 
  },
  label: { 
    fontSize: 13, 
    fontWeight: 600, 
    marginBottom: 6 
  },
  btnPrimary: { 
    background: "#0ea5e9", 
    color: "white", 
    border: 0, 
    padding: "10px 14px", 
    borderRadius: 10, 
    cursor: "pointer" 
  },
  btnGhost: { 
    background: "transparent", 
    color: "#0ea5e9", 
    border: "1px solid #0ea5e9", 
    padding: "10px 14px", 
    borderRadius: 10, 
    cursor: "pointer" 
  },
  table: { 
    width: "100%", 
    borderCollapse: "collapse"
  },
  th: { 
    textAlign: "left", 
    borderBottom: "1px solid #e2e8f0", 
    padding: 10, 
    fontSize: 13, 
    color: "#475569"
  },
  td: { 
    borderBottom: "1px solid #f1f5f9", 
    padding: 10, 
    fontSize: 14, 
    verticalAlign: "top"
  },
  tag: { 
    display: "inline-block", 
    padding: "2px 8px", 
    background: "#e2e8f0", 
    borderRadius: 999, 
    fontSize: 12, 
    marginRight: 6, 
    marginBottom: 6 
  },
  badge: { 
    padding: "3px 8px", 
    background: "#dbeafe", 
    color: "#1e40af", 
    borderRadius: 999, 
    fontSize: 12 
  },
  link: { 
    color: "#0ea5e9", 
    textDecoration: "underline", 
    cursor: "pointer" 
  },
  // Responsive utility classes
  mobileOnly: {
    display: "none"
  },
  desktopOnly: {
    display: "block"
  },
  // Responsive grid utilities
  gridResponsive: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))"
  },
  // Responsive flex utilities
  flexResponsive: {
    display: "flex",
    flexDirection: "row",
    gap: 16
  }
};
