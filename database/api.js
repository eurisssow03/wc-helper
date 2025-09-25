const express = require('express');
const DatabaseService = require('./databaseService.js');

class DatabaseAPI {
  constructor() {
    this.router = express.Router();
    this.db = new DatabaseService();
    this.setupRoutes();
  }

  async initialize() {
    await this.db.initialize();
  }

  setupRoutes() {
    // Health check
    this.router.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Users API
    this.router.get('/users', async (req, res) => {
      try {
        const users = await this.db.getAllUsers();
        res.json({ success: true, users });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.post('/users', async (req, res) => {
      try {
        const { username, password_hash, role } = req.body;
        const result = await this.db.createUser(username, password_hash, role);
        res.json({ success: true, id: result.id });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.put('/users/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;
        await this.db.updateUser(id, updates);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.delete('/users/:id', async (req, res) => {
      try {
        const { id } = req.params;
        await this.db.deleteUser(id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Homestays API
    this.router.get('/homestays', async (req, res) => {
      try {
        const homestays = await this.db.getAllHomestays();
        res.json({ success: true, homestays });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.post('/homestays', async (req, res) => {
      try {
        const result = await this.db.createHomestay(req.body);
        res.json({ success: true, id: result.id });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.put('/homestays/:id', async (req, res) => {
      try {
        const { id } = req.params;
        await this.db.updateHomestay(id, req.body);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.delete('/homestays/:id', async (req, res) => {
      try {
        const { id } = req.params;
        await this.db.deleteHomestay(id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // FAQs API
    this.router.get('/faqs', async (req, res) => {
      try {
        const faqs = await this.db.getAllFAQs();
        res.json({ success: true, faqs });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.get('/faqs/active', async (req, res) => {
      try {
        const faqs = await this.db.getActiveFAQs();
        res.json({ success: true, faqs });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.post('/faqs', async (req, res) => {
      try {
        const result = await this.db.createFAQ(req.body);
        res.json({ success: true, id: result.id });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.put('/faqs/:id', async (req, res) => {
      try {
        const { id } = req.params;
        await this.db.updateFAQ(id, req.body);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.delete('/faqs/:id', async (req, res) => {
      try {
        const { id } = req.params;
        await this.db.deleteFAQ(id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Settings API
    this.router.get('/settings', async (req, res) => {
      try {
        const settings = await this.db.getAllSettings();
        res.json({ success: true, settings });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.get('/settings/:key', async (req, res) => {
      try {
        const { key } = req.params;
        const value = await this.db.getSetting(key);
        res.json({ success: true, key, value });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.put('/settings/:key', async (req, res) => {
      try {
        const { key } = req.params;
        const { value } = req.body;
        await this.db.setSetting(key, value);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Messages API
    this.router.get('/messages', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const messages = await this.db.getMessages(limit, offset);
        res.json({ success: true, messages });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.post('/messages', async (req, res) => {
      try {
        await this.db.createMessage(req.body);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.get('/messages/phone/:phoneNumber', async (req, res) => {
      try {
        const { phoneNumber } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const messages = await this.db.getMessagesByPhone(phoneNumber, limit);
        res.json({ success: true, messages });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Logs API
    this.router.get('/logs', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const logs = await this.db.getLogs(limit, offset);
        res.json({ success: true, logs });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.post('/logs', async (req, res) => {
      try {
        await this.db.createLog(req.body);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Conversation Memory API
    this.router.get('/conversation/:phoneNumber', async (req, res) => {
      try {
        const { phoneNumber } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const messages = await this.db.getConversationMessages(phoneNumber, limit);
        res.json({ success: true, messages });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.post('/conversation/:phoneNumber', async (req, res) => {
      try {
        const { phoneNumber } = req.params;
        await this.db.addConversationMessage(phoneNumber, req.body);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.delete('/conversation/:phoneNumber', async (req, res) => {
      try {
        const { phoneNumber } = req.params;
        await this.db.clearConversation(phoneNumber);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // General Knowledge API
    this.router.get('/general-knowledge', async (req, res) => {
      try {
        const type = req.query.type || 'homestay';
        const content = await this.db.getGeneralKnowledge(type);
        res.json({ success: true, content });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.router.put('/general-knowledge', async (req, res) => {
      try {
        const { content, type } = req.body;
        await this.db.setGeneralKnowledge(content, type);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Statistics API
    this.router.get('/stats', async (req, res) => {
      try {
        const stats = await this.db.getStats();
        res.json({ success: true, stats });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Migration API - sync localStorage data to database
    this.router.post('/migrate', async (req, res) => {
      try {
        const { data } = req.body;
        let migrated = 0;

        // Migrate users
        if (data.users && Array.isArray(data.users)) {
          for (const user of data.users) {
            try {
              await this.db.createUser(user.username, user.password_hash, user.role);
              migrated++;
            } catch (e) {
              // User might already exist
            }
          }
        }

        // Migrate homestays
        if (data.homestays && Array.isArray(data.homestays)) {
          for (const homestay of data.homestays) {
            try {
              await this.db.createHomestay(homestay);
              migrated++;
            } catch (e) {
              // Homestay might already exist
            }
          }
        }

        // Migrate FAQs
        if (data.faqs && Array.isArray(data.faqs)) {
          for (const faq of data.faqs) {
            try {
              await this.db.createFAQ(faq);
              migrated++;
            } catch (e) {
              // FAQ might already exist
            }
          }
        }

        // Migrate settings
        if (data.settings) {
          for (const [key, value] of Object.entries(data.settings)) {
            try {
              await this.db.setSetting(key, value);
              migrated++;
            } catch (e) {
              // Setting might already exist
            }
          }
        }

        res.json({ success: true, migrated });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  getRouter() {
    return this.router;
  }

  getDatabase() {
    return this.db;
  }
}

module.exports = DatabaseAPI;
