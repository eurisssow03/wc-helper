import { useState } from "react";

export function useToast() {
  const [toast, setToast] = useState(null);
  
  const show = (msg) => { 
    setToast(msg); 
    setTimeout(() => setToast(null), 1400); 
  };
  
  const node = toast ? (
    <div style={{ 
      position: "fixed", 
      right: 20, 
      bottom: 20, 
      background: "#111827", 
      color: "white", 
      padding: "10px 14px", 
      borderRadius: 8, 
      boxShadow: "0 8px 24px rgba(0,0,0,0.2)" 
    }}>
      {toast}
    </div>
  ) : null;
  
  return { show, node };
}
