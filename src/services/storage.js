import { STORAGE_KEYS, defaultSettings } from "../utils/constants.js";

// Data layer (localStorage) operations
export function readLS(key, fallback) { 
  try { 
    const txt = localStorage.getItem(key); 
    return txt ? JSON.parse(txt) : structuredClone(fallback);
  } catch { 
    return structuredClone(fallback);
  } 
}

export function writeLS(key, value) { 
  localStorage.setItem(key, JSON.stringify(value)); 
}

export function initOnce() {
  if (!localStorage.getItem(STORAGE_KEYS.settings)) writeLS(STORAGE_KEYS.settings, defaultSettings);
  if (!localStorage.getItem(STORAGE_KEYS.homestays)) writeLS(STORAGE_KEYS.homestays, []);
  if (!localStorage.getItem(STORAGE_KEYS.faqs)) writeLS(STORAGE_KEYS.faqs, []);
  if (!localStorage.getItem(STORAGE_KEYS.logs)) writeLS(STORAGE_KEYS.logs, []);
}

// Sample Homestay data for testing
export const sampleHomestays = [
  {
    name: "Trefoil Shah Alam",
    city: "Shah Alam",
    address: "No. 1, Jalan Setia Prima, Setia Alam, 40170 Shah Alam, Selangor",
    phone: "03-3358 8888",
    checkin_time: "15:00",
    checkout_time: "12:00",
    amenities: ["Free Wi-Fi", "Swimming Pool", "Fitness Center", "Restaurant", "Parking", "Room Service", "Conference Room", "Laundry Service"],
    notes: "4-star business homestay with modern facilities, perfect for corporate travelers and families visiting Shah Alam",
    updated_by: "system",
    updated_at: new Date().toISOString()
  },
  {
    name: "Palas Horizon Cameron",
    city: "Cameron Highlands",
    address: "Lot 147, Jalan Kea Farm, 39000 Tanah Rata, Cameron Highlands, Pahang",
    phone: "05-491 1888",
    checkin_time: "14:00",
    checkout_time: "11:00",
    amenities: ["Free Wi-Fi", "Mountain View", "Tea Garden Access", "Restaurant", "Parking", "Room Service", "Strawberry Farm", "Hiking Trails", "Cool Climate"],
    notes: "Scenic mountain homestay in Cameron Highlands with breathtaking views, perfect for nature lovers and tea enthusiasts",
    updated_by: "system",
    updated_at: new Date().toISOString()
  },
  {
    name: "Condo Manhattan Ipoh",
    city: "Ipoh",
    address: "Jalan Raja Musa Aziz, 30300 Ipoh, Perak",
    phone: "05-255 8888",
    checkin_time: "15:00",
    checkout_time: "12:00",
    amenities: ["Free Wi-Fi", "City View", "Kitchenette", "Parking", "Air Conditioning", "Balcony", "Near City Center", "Shopping Mall Access"],
    notes: "Modern serviced homestay in the heart of Ipoh city, ideal for extended stays and business travelers",
    updated_by: "system",
    updated_at: new Date().toISOString()
  }
];

// Sample FAQ data for testing
export const sampleFAQs = [
  {
    question: "Why do I need to pay a deposit?",
    answer: "A deposit is required to secure your reservation and cover any potential damages or incidental charges during your stay. The deposit amount varies by room type and length of stay, typically ranging from 1-2 nights' room rate. The deposit will be refunded after check-out, minus any charges for damages or additional services.",
    tags: ["deposit", "payment", "reservation", "security"],
    related_homestay: "",
    lang_hint: "en",
    embedding: [],
    source_id: "sample-1",
    updated_by: "system",
    updated_at: new Date().toISOString(),
    is_active: true
  },
  {
    question: "What time is check-in?",
    answer: "Check-in time is 3:00 PM. Please share your booking details for further check in procedure.",
    tags: ["check-in", "time", "early"],
    related_homestay: "",
    lang_hint: "en",
    embedding: [],
    source_id: "sample-2",
    updated_by: "system",
    updated_at: new Date().toISOString(),
    is_active: true
  },
  {
    question: "What time is check-out?",
    answer: "Check-out time is 12:00 PM. Late check-out may be available upon request, subject to room availability and additional charges.",
    tags: ["check-out", "time", "late"],
    related_homestay: "",
    lang_hint: "en",
    embedding: [],
    source_id: "sample-3",
    updated_by: "system",
    updated_at: new Date().toISOString(),
    is_active: true
  },
  {
    question: "Do you have parking?",
    answer: "Yes, we offer complimentary parking for all guests. Valet parking is also available for an additional fee. Please inform us of your vehicle details upon check-in.",
    tags: ["parking", "valet", "complimentary"],
    related_homestay: "",
    lang_hint: "en",
    embedding: [],
    source_id: "sample-4",
    updated_by: "system",
    updated_at: new Date().toISOString(),
    is_active: true
  },
  {
    question: "Is Wi-Fi available?",
    answer: "Yes, complimentary high-speed Wi-Fi is available throughout the homestay. The network name and password will be provided upon check-in.",
    tags: ["wifi", "internet", "complimentary"],
    related_homestay: "",
    lang_hint: "en",
    embedding: [],
    source_id: "sample-5",
    updated_by: "system",
    updated_at: new Date().toISOString(),
    is_active: true
  },
  {
    question: "What are the check-in and check-out times at Trefoil Shah Alam?",
    answer: "Check-in time at Trefoil Shah Alam is 3:00 PM and check-out time is 12:00 PM. Early check-in or late check-out may be available upon request, subject to room availability. Please contact us at 03-3358 8888 for special arrangements.",
    tags: ["check-in", "check-out", "time", "trefoil", "shah alam"],
    related_homestay: "Trefoil Shah Alam",
    lang_hint: "en",
    embedding: [],
    source_id: "sample-6",
    updated_by: "system",
    updated_at: new Date().toISOString(),
    is_active: true
  },
  {
    question: "What amenities are available at Palas Horizon Cameron?",
    answer: "Palas Horizon Cameron offers unique mountain amenities including Free Wi-Fi, Mountain View rooms, Tea Garden Access, Restaurant, Parking, Room Service, Strawberry Farm visits, Hiking Trails, and Cool Climate experience. Perfect for nature lovers and tea enthusiasts.",
    tags: ["amenities", "palas horizon", "cameron highlands", "mountain", "tea garden", "strawberry"],
    related_homestay: "Palas Horizon Cameron",
    lang_hint: "en",
    embedding: [],
    source_id: "sample-7",
    updated_by: "system",
    updated_at: new Date().toISOString(),
    is_active: true
  },
  {
    question: "Does Condo Manhattan Ipoh have kitchen facilities?",
    answer: "Yes, Condo Manhattan Ipoh offers fully equipped kitchenettes in all units, perfect for extended stays. We also provide Free Wi-Fi, City View, Parking, Air Conditioning, Balcony access, and are located near City Center with Shopping Mall Access. Ideal for business travelers and families.",
    tags: ["kitchenette", "condo manhattan", "ipoh", "extended stay", "city view", "business"],
    related_homestay: "Condo Manhattan Ipoh",
    lang_hint: "en",
    embedding: [],
    source_id: "sample-8",
    updated_by: "system",
    updated_at: new Date().toISOString(),
    is_active: true
  },
  {
    question: "What is the weather like at Palas Horizon Cameron?",
    answer: "Palas Horizon Cameron enjoys a cool mountain climate year-round, with temperatures typically ranging from 15-25°C. The cool climate makes it perfect for outdoor activities like hiking, tea garden visits, and strawberry picking. We recommend bringing light jackets even during the day.",
    tags: ["weather", "climate", "palas horizon", "cameron highlands", "cool", "mountain"],
    related_homestay: "Palas Horizon Cameron",
    lang_hint: "en",
    embedding: [],
    source_id: "sample-9",
    updated_by: "system",
    updated_at: new Date().toISOString(),
    is_active: true
  },
  {
    question: "Is Trefoil Shah Alam suitable for business meetings?",
    answer: "Yes, Trefoil Shah Alam is perfect for business travelers with our Conference Room facilities, Free Wi-Fi throughout the property, Restaurant for business dining, and convenient location in Shah Alam. We also offer Room Service and Laundry Service for your convenience.",
    tags: ["business", "conference", "meeting", "trefoil", "shah alam", "corporate"],
    related_homestay: "Trefoil Shah Alam",
    lang_hint: "en",
    embedding: [],
    source_id: "sample-10",
    updated_by: "system",
    updated_at: new Date().toISOString(),
    is_active: true
  },
  {
    question: "What attractions are near Condo Manhattan Ipoh?",
    answer: "Condo Manhattan Ipoh is strategically located near Ipoh city center with easy access to shopping malls, restaurants, and local attractions. The property offers City View rooms and is within walking distance to major shopping areas. Perfect for exploring Ipoh's famous food scene and cultural sites.",
    tags: ["attractions", "location", "condo manhattan", "ipoh", "shopping", "city center"],
    related_homestay: "Condo Manhattan Ipoh",
    lang_hint: "en",
    embedding: [],
    source_id: "sample-11",
    updated_by: "system",
    updated_at: new Date().toISOString(),
    is_active: true
  }
];

// Storage key constants for easy access
export { STORAGE_KEYS };
