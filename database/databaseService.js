const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseService {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, 'wc-helper.db');
  }

  // Initialize database connection
  async initialize() {
    return new Promise((resolve, reject) => {
      // Ensure database directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Database connection error:', err);
          reject(err);
        } else {
          console.log('✅ Database connected successfully');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  // Create tables from schema
  async createTables() {
    return new Promise((resolve, reject) => {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      this.db.exec(schema, (err) => {
        if (err) {
          console.error('❌ Error creating tables:', err);
          reject(err);
        } else {
          console.log('✅ Database tables created successfully');
          resolve();
        }
      });
    });
  }

  // Generic query method
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ Query error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Generic run method for INSERT/UPDATE/DELETE
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('❌ Run error:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // Users operations
  async createUser(username, passwordHash, role = 'admin') {
    const sql = 'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)';
    return this.run(sql, [username, passwordHash, role]);
  }

  async getUserByUsername(username) {
    const sql = 'SELECT * FROM users WHERE username = ?';
    const users = await this.query(sql, [username]);
    return users[0] || null;
  }

  async updateUser(id, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    const sql = `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    return this.run(sql, [...values, id]);
  }

  async deleteUser(id) {
    const sql = 'DELETE FROM users WHERE id = ?';
    return this.run(sql, [id]);
  }

  async getAllUsers() {
    const sql = 'SELECT id, username, role, created_at, updated_at FROM users ORDER BY created_at DESC';
    return this.query(sql);
  }

  // Homestays operations
  async createHomestay(homestayData) {
    const { name, location, amenities, description } = homestayData;
    const sql = 'INSERT INTO homestays (name, location, amenities, description) VALUES (?, ?, ?, ?)';
    return this.run(sql, [name, location, JSON.stringify(amenities), description]);
  }

  async updateHomestay(id, homestayData) {
    const { name, location, amenities, description } = homestayData;
    const sql = 'UPDATE homestays SET name = ?, location = ?, amenities = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    return this.run(sql, [name, location, JSON.stringify(amenities), description, id]);
  }

  async deleteHomestay(id) {
    const sql = 'DELETE FROM homestays WHERE id = ?';
    return this.run(sql, [id]);
  }

  async getAllHomestays() {
    const sql = 'SELECT * FROM homestays ORDER BY created_at DESC';
    const homestays = await this.query(sql);
    return homestays.map(h => ({
      ...h,
      amenities: JSON.parse(h.amenities || '[]')
    }));
  }

  // FAQs operations
  async createFAQ(faqData) {
    const { question, answer, tags, is_active } = faqData;
    const sql = 'INSERT INTO faqs (question, answer, tags, is_active) VALUES (?, ?, ?, ?)';
    return this.run(sql, [question, answer, JSON.stringify(tags || []), is_active ? 1 : 0]);
  }

  async updateFAQ(id, faqData) {
    const { question, answer, tags, is_active } = faqData;
    const sql = 'UPDATE faqs SET question = ?, answer = ?, tags = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    return this.run(sql, [question, answer, JSON.stringify(tags || []), is_active ? 1 : 0, id]);
  }

  async deleteFAQ(id) {
    const sql = 'DELETE FROM faqs WHERE id = ?';
    return this.run(sql, [id]);
  }

  async getAllFAQs() {
    const sql = 'SELECT * FROM faqs ORDER BY created_at DESC';
    const faqs = await this.query(sql);
    return faqs.map(f => ({
      ...f,
      tags: JSON.parse(f.tags || '[]'),
      is_active: Boolean(f.is_active)
    }));
  }

  async getActiveFAQs() {
    const sql = 'SELECT * FROM faqs WHERE is_active = 1 ORDER BY created_at DESC';
    const faqs = await this.query(sql);
    return faqs.map(f => ({
      ...f,
      tags: JSON.parse(f.tags || '[]'),
      is_active: Boolean(f.is_active)
    }));
  }

  // Settings operations
  async getSetting(key) {
    const sql = 'SELECT value FROM settings WHERE key = ?';
    const rows = await this.query(sql, [key]);
    if (rows.length > 0) {
      try {
        return JSON.parse(rows[0].value);
      } catch (e) {
        return rows[0].value;
      }
    }
    return null;
  }

  async setSetting(key, value) {
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    const sql = 'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)';
    return this.run(sql, [key, valueStr]);
  }

  async getAllSettings() {
    const sql = 'SELECT key, value FROM settings';
    const rows = await this.query(sql);
    const settings = {};
    rows.forEach(row => {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch (e) {
        settings[row.key] = row.value;
      }
    });
    return settings;
  }

  // Messages operations
  async createMessage(messageData) {
    const { id, phone_number, message_text, message_type, ai_response, confidence, matched_question, processing_time, source, status } = messageData;
    const sql = 'INSERT INTO messages (id, phone_number, message_text, message_type, ai_response, confidence, matched_question, processing_time, source, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    return this.run(sql, [id, phone_number, message_text, message_type, ai_response, confidence, matched_question, processing_time, source, status]);
  }

  async getMessages(limit = 100, offset = 0) {
    const sql = 'SELECT * FROM messages ORDER BY created_at DESC LIMIT ? OFFSET ?';
    return this.query(sql, [limit, offset]);
  }

  async getMessagesByPhone(phoneNumber, limit = 50) {
    const sql = 'SELECT * FROM messages WHERE phone_number = ? ORDER BY created_at DESC LIMIT ?';
    return this.query(sql, [phoneNumber, limit]);
  }

  // Logs operations
  async createLog(logData) {
    const { id, channel, incoming_text, matched_question, confidence, answer, processing_time, source, ai_processing, conversation_memory } = logData;
    const sql = 'INSERT INTO logs (id, channel, incoming_text, matched_question, confidence, answer, processing_time, source, ai_processing, conversation_memory) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    return this.run(sql, [id, channel, incoming_text, matched_question, confidence, answer, processing_time, source, JSON.stringify(ai_processing), JSON.stringify(conversation_memory)]);
  }

  async getLogs(limit = 100, offset = 0) {
    const sql = 'SELECT * FROM logs ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const logs = await this.query(sql, [limit, offset]);
    return logs.map(log => ({
      ...log,
      ai_processing: log.ai_processing ? JSON.parse(log.ai_processing) : null,
      conversation_memory: log.conversation_memory ? JSON.parse(log.conversation_memory) : null
    }));
  }

  // Conversation memory operations
  async addConversationMessage(phoneNumber, messageData) {
    const { message_id, message_text, is_from_customer, context, metadata } = messageData;
    const sql = 'INSERT INTO conversation_memory (phone_number, message_id, message_text, is_from_customer, context, metadata) VALUES (?, ?, ?, ?, ?, ?)';
    return this.run(sql, [phoneNumber, message_id, message_text, is_from_customer ? 1 : 0, JSON.stringify(context), JSON.stringify(metadata)]);
  }

  async getConversationMessages(phoneNumber, limit = 20) {
    const sql = 'SELECT * FROM conversation_memory WHERE phone_number = ? ORDER BY created_at DESC LIMIT ?';
    const messages = await this.query(sql, [phoneNumber, limit]);
    return messages.map(msg => ({
      ...msg,
      is_from_customer: Boolean(msg.is_from_customer),
      context: msg.context ? JSON.parse(msg.context) : {},
      metadata: msg.metadata ? JSON.parse(msg.metadata) : {}
    }));
  }

  async clearConversation(phoneNumber) {
    const sql = 'DELETE FROM conversation_memory WHERE phone_number = ?';
    return this.run(sql, [phoneNumber]);
  }

  // General knowledge operations
  async setGeneralKnowledge(content, type = 'homestay') {
    const sql = 'INSERT OR REPLACE INTO general_knowledge (id, content, type, updated_at) VALUES (1, ?, ?, CURRENT_TIMESTAMP)';
    return this.run(sql, [content, type]);
  }

  async getGeneralKnowledge(type = 'homestay') {
    const sql = 'SELECT content FROM general_knowledge WHERE type = ? ORDER BY updated_at DESC LIMIT 1';
    const rows = await this.query(sql, [type]);
    return rows.length > 0 ? rows[0].content : '';
  }

  // Statistics
  async getStats() {
    const stats = {};
    
    // Count users
    const userCount = await this.query('SELECT COUNT(*) as count FROM users');
    stats.totalUsers = userCount[0].count;
    
    // Count homestays
    const homestayCount = await this.query('SELECT COUNT(*) as count FROM homestays');
    stats.totalHomestays = homestayCount[0].count;
    
    // Count FAQs
    const faqCount = await this.query('SELECT COUNT(*) as count FROM faqs');
    stats.totalFAQs = faqCount[0].count;
    
    const activeFaqCount = await this.query('SELECT COUNT(*) as count FROM faqs WHERE is_active = 1');
    stats.activeFAQs = activeFaqCount[0].count;
    
    // Count messages
    const messageCount = await this.query('SELECT COUNT(*) as count FROM messages');
    stats.totalMessages = messageCount[0].count;
    
    // Count logs
    const logCount = await this.query('SELECT COUNT(*) as count FROM logs');
    stats.totalLogs = logCount[0].count;
    
    // Count conversations
    const conversationCount = await this.query('SELECT COUNT(DISTINCT phone_number) as count FROM conversation_memory');
    stats.totalConversations = conversationCount[0].count;
    
    return stats;
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('❌ Error closing database:', err);
        } else {
          console.log('✅ Database connection closed');
        }
      });
    }
  }
}

module.exports = DatabaseService;
