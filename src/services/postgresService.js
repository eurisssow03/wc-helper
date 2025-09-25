// PostgreSQL service for WC Helper
import { pool } from '../../postgres-config.js';
import { readLS, writeLS, STORAGE_KEYS } from './storage.js';

class PostgresService {
  constructor() {
    this.pool = pool;
    this.cache = new Map(); // In-memory cache to reduce database queries
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout
    
    console.log('🐘 PostgresService: Initialized with connection pooling');
  }

  // Execute query with error handling
  async query(text, params = []) {
    const client = await this.pool.connect();
    try {
      const start = Date.now();
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      console.log(`🐘 Postgres: Query executed in ${duration}ms`, { text: text.substring(0, 50) + '...', rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('❌ Postgres: Query error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get all records from a table
  async getAll(tableName, orderBy = 'created_at DESC', limit = null) {
    const cacheKey = `all_${tableName}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`🐘 Postgres: Using cached data for ${tableName}`);
      return cached;
    }

    try {
      let query = `SELECT * FROM ${tableName}`;
      const params = [];
      
      if (orderBy) {
        query += ` ORDER BY ${orderBy}`;
      }
      
      if (limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }

      const result = await this.query(query, params);
      const data = result.rows;
      
      // Cache the result
      this.setCache(cacheKey, data);
      
      console.log(`🐘 Postgres: Retrieved ${data.length} records from ${tableName}`);
      return data;
    } catch (error) {
      console.error(`❌ Postgres: Error getting all from ${tableName}:`, error);
      throw error;
    }
  }

  // Get single record by ID
  async getById(tableName, id) {
    try {
      const result = await this.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
      
      if (result.rows.length === 0) {
        console.log(`🐘 Postgres: No record found with id ${id} in ${tableName}`);
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`❌ Postgres: Error getting record ${id} from ${tableName}:`, error);
      throw error;
    }
  }

  // Create or update record
  async save(tableName, data, id = null) {
    try {
      if (id) {
        // Update existing record
        const fields = Object.keys(data).filter(key => key !== 'id');
        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
        const values = [id, ...fields.map(field => data[field])];
        
        const result = await this.query(
          `UPDATE ${tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
          values
        );
        
        // Clear cache
        this.clearCacheForTable(tableName);
        
        console.log(`🐘 Postgres: Updated record ${id} in ${tableName}`);
        return result.rows[0];
      } else {
        // Create new record
        const fields = Object.keys(data);
        const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
        const values = fields.map(field => data[field]);
        
        const result = await this.query(
          `INSERT INTO ${tableName} (${fields.join(', ')}, created_at, updated_at) VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
          values
        );
        
        // Clear cache
        this.clearCacheForTable(tableName);
        
        console.log(`🐘 Postgres: Created record ${result.rows[0].id} in ${tableName}`);
        return result.rows[0];
      }
    } catch (error) {
      console.error(`❌ Postgres: Error saving to ${tableName}:`, error);
      throw error;
    }
  }

  // Delete record
  async delete(tableName, id) {
    try {
      const result = await this.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
      
      // Clear cache
      this.clearCacheForTable(tableName);
      
      console.log(`🐘 Postgres: Deleted record ${id} from ${tableName}`);
      return result.rowCount > 0;
    } catch (error) {
      console.error(`❌ Postgres: Error deleting ${id} from ${tableName}:`, error);
      throw error;
    }
  }

  // Batch insert
  async batchInsert(tableName, records) {
    if (records.length === 0) return [];
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const record of records) {
        const fields = Object.keys(record);
        const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
        const values = fields.map(field => record[field]);
        
        const result = await client.query(
          `INSERT INTO ${tableName} (${fields.join(', ')}, created_at, updated_at) VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
          values
        );
        
        results.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      
      // Clear cache
      this.clearCacheForTable(tableName);
      
      console.log(`🐘 Postgres: Batch inserted ${results.length} records into ${tableName}`);
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Postgres: Error batch inserting into ${tableName}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Query with filters
  async queryWithFilters(tableName, filters = {}, orderBy = 'created_at DESC', limit = null) {
    try {
      let query = `SELECT * FROM ${tableName}`;
      const params = [];
      const conditions = [];
      
      // Add filters
      Object.entries(filters).forEach(([key, value], index) => {
        if (value !== undefined && value !== null) {
          conditions.push(`${key} = $${params.length + 1}`);
          params.push(value);
        }
      });
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      if (orderBy) {
        query += ` ORDER BY ${orderBy}`;
      }
      
      if (limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }

      const result = await this.query(query, params);
      console.log(`🐘 Postgres: Query returned ${result.rows.length} records from ${tableName}`);
      return result.rows;
    } catch (error) {
      console.error(`❌ Postgres: Error querying ${tableName}:`, error);
      throw error;
    }
  }

  // Cache management
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCacheForTable(tableName) {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(tableName));
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🐘 Postgres: Cleared cache for ${tableName}`);
  }

  clearAllCache() {
    this.cache.clear();
    console.log('🐘 Postgres: Cleared all cache');
  }

  // Get cache statistics
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      cacheKeys: Array.from(this.cache.keys()),
      cacheTimeout: this.cacheTimeout
    };
  }

  // Initialize database tables
  async initializeTables() {
    try {
      console.log('🐘 Postgres: Initializing database tables...');
      
      // Create tables if they don't exist
      const createTablesQuery = `
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Homestays table
        CREATE TABLE IF NOT EXISTS homestays (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            location VARCHAR(255),
            amenities TEXT[],
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- FAQs table
        CREATE TABLE IF NOT EXISTS faqs (
            id SERIAL PRIMARY KEY,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            tags TEXT[],
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Settings table
        CREATE TABLE IF NOT EXISTS settings (
            id SERIAL PRIMARY KEY,
            key VARCHAR(255) UNIQUE NOT NULL,
            value JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- General Knowledge table
        CREATE TABLE IF NOT EXISTS general_knowledge (
            id SERIAL PRIMARY KEY,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      await this.query(createTablesQuery);
      
      // Insert default data
      await this.insertDefaultData();
      
      console.log('✅ Postgres: Database tables initialized successfully');
    } catch (error) {
      console.error('❌ Postgres: Error initializing tables:', error);
      throw error;
    }
  }

  // Insert default data
  async insertDefaultData() {
    try {
      // Insert default admin user
      await this.query(`
        INSERT INTO users (username, password_hash, role) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (username) DO NOTHING
      `, ['admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'admin']);

      // Insert default settings
      const defaultSettings = [
        { key: 'aiProvider', value: { value: 'OpenAI' } },
        { key: 'confidenceThreshold', value: { value: 0.6 } },
        { key: 'similarityThreshold', value: { value: 0.3 } },
        { key: 'aiRules', value: { 
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
        }},
        { key: 'businessHours', value: {
          alwaysOn: true,
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
        }}
      ];

      for (const setting of defaultSettings) {
        await this.query(`
          INSERT INTO settings (key, value) 
          VALUES ($1, $2) 
          ON CONFLICT (key) DO NOTHING
        `, [setting.key, setting.value]);
      }

      // Insert default general knowledge
      await this.query(`
        INSERT INTO general_knowledge (content) 
        VALUES ($1) 
        ON CONFLICT DO NOTHING
      `, ['Our homestay service provides comfortable accommodations with modern amenities. We offer 24/7 customer support and strive to make your stay enjoyable. Please feel free to ask any questions about our properties, booking process, or local attractions.']);

      console.log('✅ Postgres: Default data inserted successfully');
    } catch (error) {
      console.error('❌ Postgres: Error inserting default data:', error);
      throw error;
    }
  }

  // Migrate from localStorage to PostgreSQL (only essential tables)
  async migrateFromLocalStorage() {
    try {
      console.log('🐘 Postgres: Starting migration from localStorage...');
      
      const collections = [
        'users',
        'homestays', 
        'faqs',
        'settings'
      ];
      
      let totalMigrated = 0;
      
      for (const collectionName of collections) {
        try {
          const storageKey = STORAGE_KEYS[collectionName] || collectionName;
          const localData = readLS(storageKey, []);
          
          if (localData.length > 0) {
            console.log(`🐘 Postgres: Migrating ${localData.length} items from ${collectionName}`);
            
            // Use batch insert for efficiency
            const migrated = await this.batchInsert(collectionName, localData);
            totalMigrated += migrated.length;
            
            console.log(`✅ Postgres: Migrated ${migrated.length} items to ${collectionName}`);
          }
        } catch (error) {
          console.error(`❌ Postgres: Error migrating ${collectionName}:`, error);
        }
      }
      
      // Migrate general knowledge separately
      try {
        const generalKnowledge = readLS('wc_homestay_general_knowledge', '');
        if (generalKnowledge) {
          await this.save('general_knowledge', { content: generalKnowledge });
          totalMigrated += 1;
          console.log('✅ Postgres: Migrated general knowledge');
        }
      } catch (error) {
        console.error('❌ Postgres: Error migrating general knowledge:', error);
      }
      
      console.log(`🐘 Postgres: Migration completed. Total items migrated: ${totalMigrated}`);
      return totalMigrated;
    } catch (error) {
      console.error('❌ Postgres: Error during migration:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const postgresService = new PostgresService();
export default postgresService;
