-- WC Helper Database Schema
-- SQLite database for persistent data storage

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Homestays table
CREATE TABLE IF NOT EXISTS homestays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    amenities TEXT, -- JSON string
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- FAQs table
CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    tags TEXT, -- JSON string array
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    phone_number TEXT,
    message_text TEXT,
    message_type TEXT, -- 'incoming' or 'outgoing'
    ai_response TEXT,
    confidence REAL,
    matched_question TEXT,
    processing_time INTEGER,
    source TEXT, -- 'webhook', 'chat_tester', etc.
    status TEXT, -- 'processed', 'error', 'pending'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    channel TEXT,
    incoming_text TEXT,
    matched_question TEXT,
    confidence REAL,
    answer TEXT,
    processing_time INTEGER,
    source TEXT,
    ai_processing TEXT, -- JSON string
    conversation_memory TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Conversation memory table
CREATE TABLE IF NOT EXISTS conversation_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT NOT NULL,
    message_id TEXT,
    message_text TEXT NOT NULL,
    is_from_customer BOOLEAN NOT NULL,
    context TEXT, -- JSON string
    metadata TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- General knowledge table
CREATE TABLE IF NOT EXISTS general_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'homestay', -- 'homestay', 'general', etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_phone_number ON messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_channel ON logs(channel);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_phone ON conversation_memory(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_created_at ON conversation_memory(created_at);
CREATE INDEX IF NOT EXISTS idx_faqs_active ON faqs(is_active);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value) VALUES 
('ai_config', '{"aiProvider":"OpenAI","confidenceThreshold":0.6,"similarityThreshold":0.3}'),
('business_hours', '{"tz":"Asia/Kuala_Lumpur","start":"09:00","end":"18:00","alwaysOn":true}'),
('ai_rules', '{"responseTemplates":{"en":{"greeting":"Hello! Welcome to our homestay service. How can I help you today?","fallback":"Sorry, I could not understand your question. We will have someone contact you soon."}}}'),
('whatsapp_config', '{"businessNumber":"","webhookToken":"","apiToken":""}');

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO users (username, password_hash, role) VALUES 
('admin', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'admin');
