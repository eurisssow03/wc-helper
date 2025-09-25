// Storage service for localStorage operations
import { STORAGE_KEYS } from '../utils/constants.js';

// Re-export STORAGE_KEYS for other services
export { STORAGE_KEYS };

// Sample data for initialization
export const sampleFAQs = [
  {
    id: "faq-001",
    question: "What are your check-in and check-out times?",
    answer: "Check-in is at 3:00 PM and check-out is at 11:00 AM. Early check-in or late check-out may be available upon request, subject to availability.",
    tags: ["check-in", "check-out", "timing", "arrival", "departure"],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "faq-002", 
    question: "Do you provide free WiFi?",
    answer: "Yes, we provide complimentary high-speed WiFi throughout the property. The network name and password will be provided upon check-in.",
    tags: ["wifi", "internet", "connectivity", "free", "amenities"],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "faq-003",
    question: "Is parking available?",
    answer: "Yes, we offer free parking for our guests. Please let us know if you need parking when making your reservation.",
    tags: ["parking", "free", "reservation", "amenities"],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const sampleHomestays = [
  {
    id: "homestay-001",
    name: "Trefoil Homestay",
    location: "Kuala Lumpur, Malaysia",
    amenities: ["WiFi", "Air Conditioning", "Parking", "Kitchen", "Laundry"],
    description: "A cozy homestay in the heart of Kuala Lumpur with modern amenities and excellent connectivity to the city center.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "homestay-002",
    name: "Palas Homestay", 
    location: "Petaling Jaya, Malaysia",
    amenities: ["WiFi", "Air Conditioning", "Parking", "Swimming Pool", "Gym"],
    description: "Luxurious homestay with premium facilities including a swimming pool and fitness center.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "homestay-003",
    name: "Manhattan Homestay",
    location: "Klang Valley, Malaysia", 
    amenities: ["WiFi", "Air Conditioning", "Parking", "Balcony", "City View"],
    description: "Modern homestay with stunning city views and convenient access to shopping and dining areas.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Initialize default data
export async function initOnce() {
  console.log('🔧 Storage: Initializing default data...');
  
  // Initialize settings if not exists
  if (!localStorage.getItem(STORAGE_KEYS.settings)) {
    const defaultSettings = {
      alwaysOn: true,
      businessHours: { 
        tz: "Asia/Kuala_Lumpur", 
        start: "09:00", 
        end: "18:00",
        monday: { enabled: true, start: "09:00", end: "18:00" },
        tuesday: { enabled: true, start: "09:00", end: "18:00" },
        wednesday: { enabled: true, start: "09:00", end: "18:00" },
        thursday: { enabled: true, start: "09:00", end: "18:00" },
        friday: { enabled: true, start: "09:00", end: "18:00" },
        saturday: { enabled: true, start: "09:00", end: "18:00" },
        sunday: { enabled: true, start: "09:00", end: "18:00" }
      },
      aiProvider: "OpenAI",
      confidenceThreshold: 0.6,
      similarityThreshold: 0.3,
      aiRules: {
        responseTemplates: {
          en: {
            greeting: "Hello! Welcome to our homestay service. How can I help you today?",
            fallback: "Sorry, I couldn't understand your question. We will have someone contact you soon."
          },
          zh: {
            greeting: "您好！欢迎来到我们的民宿服务。我今天能为您提供什么帮助？",
            fallback: "抱歉，我无法理解您的问题。我们将尽快安排专人与您联系。"
          }
        }
      }
    };
    writeLS(STORAGE_KEYS.settings, defaultSettings);
    console.log('✅ Storage: Default settings created');
  }
  
  // Initialize other data
  if (!localStorage.getItem(STORAGE_KEYS.homestays)) {
    writeLS(STORAGE_KEYS.homestays, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.faqs)) {
    writeLS(STORAGE_KEYS.faqs, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.logs)) {
    writeLS(STORAGE_KEYS.logs, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.conversationMemory)) {
    writeLS(STORAGE_KEYS.conversationMemory, {});
  }
  if (!localStorage.getItem(STORAGE_KEYS.homestayGeneralKnowledge)) {
    writeLS(STORAGE_KEYS.homestayGeneralKnowledge, '');
  }
  
  console.log('✅ Storage: Default data initialized');
}

// Read from localStorage with fallback
export function readLS(key, fallback) { 
  try { 
    const txt = localStorage.getItem(key); 
    return txt ? JSON.parse(txt) : fallback;
  } catch (error) {
    console.error(`❌ Storage: Error reading ${key}:`, error);
    return fallback;
  }
}

// Write to localStorage
export function writeLS(key, value) { 
  try {
  localStorage.setItem(key, JSON.stringify(value)); 
    return true;
  } catch (error) {
    console.error(`❌ Storage: Error writing ${key}:`, error);
    return false;
  }
}

// Remove from localStorage
export function removeLS(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`❌ Storage: Error removing ${key}:`, error);
    return false;
  }
}

// Clear all application data
export function clearAllData() {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('✅ Storage: All application data cleared');
    return true;
  } catch (error) {
    console.error('❌ Storage: Error clearing all data:', error);
    return false;
  }
}

// Get storage statistics
export function getStorageStats() {
  try {
    const stats = {
      totalKeys: 0,
      totalSize: 0,
      keys: {}
    };
    
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      const value = localStorage.getItem(key);
      if (value) {
        stats.totalKeys++;
        stats.totalSize += value.length;
        stats.keys[name] = {
          key,
          size: value.length,
          hasData: true
        };
      } else {
        stats.keys[name] = {
          key,
          size: 0,
          hasData: false
        };
      }
    });
    
    return stats;
  } catch (error) {
    console.error('❌ Storage: Error getting storage stats:', error);
    return null;
  }
}