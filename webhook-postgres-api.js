// PostgreSQL API endpoints for webhook server
import express from 'express';
import { postgresService } from './src/services/postgresService.js';

const router = express.Router();

// Middleware to parse JSON bodies
router.use(express.json());

// Get all data from a table
router.get('/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { limit, orderBy } = req.query;
    
    const data = await postgresService.getAll(table, orderBy, limit ? parseInt(limit) : null);
    
    res.json({
      success: true,
      data,
      count: data.length,
      source: 'postgresql'
    });
  } catch (error) {
    console.error(`❌ Postgres API: Error getting ${req.params.table}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single record by ID
router.get('/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    const data = await postgresService.getById(table, id);
    
    if (data) {
      res.json({
        success: true,
        data,
        source: 'postgresql'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }
  } catch (error) {
    console.error(`❌ Postgres API: Error getting ${req.params.table}/${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create or update record
router.post('/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { id, ...data } = req.body;
    
    const result = await postgresService.save(table, data, id);
    
    res.json({
      success: true,
      data: result,
      source: 'postgresql'
    });
  } catch (error) {
    console.error(`❌ Postgres API: Error saving to ${req.params.table}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch insert records
router.post('/:table/batch', async (req, res) => {
  try {
    const { table } = req.params;
    const { items } = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'Items must be an array'
      });
    }
    
    const results = await postgresService.batchInsert(table, items);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      source: 'postgresql'
    });
  } catch (error) {
    console.error(`❌ Postgres API: Error batch inserting to ${req.params.table}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete record
router.delete('/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    
    const success = await postgresService.delete(table, id);
    
    if (success) {
      res.json({
        success: true,
        message: 'Record deleted successfully',
        source: 'postgresql'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }
  } catch (error) {
    console.error(`❌ Postgres API: Error deleting ${req.params.table}/${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Query with filters
router.post('/:table/query', async (req, res) => {
  try {
    const { table } = req.params;
    const { filters = {}, orderBy = 'created_at DESC', limit = null } = req.body;
    
    const data = await postgresService.queryWithFilters(table, filters, orderBy, limit);
    
    res.json({
      success: true,
      data,
      count: data.length,
      source: 'postgresql'
    });
  } catch (error) {
    console.error(`❌ Postgres API: Error querying ${req.params.table}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cache statistics
router.get('/stats/cache', async (req, res) => {
  try {
    const stats = postgresService.getCacheStats();
    
    res.json({
      success: true,
      data: stats,
      source: 'postgresql'
    });
  } catch (error) {
    console.error('❌ Postgres API: Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear cache
router.post('/cache/clear', async (req, res) => {
  try {
    const { table } = req.body;
    
    if (table) {
      postgresService.clearCacheForTable(table);
    } else {
      postgresService.clearAllCache();
    }
    
    res.json({
      success: true,
      message: table ? `Cache cleared for ${table}` : 'All cache cleared',
      source: 'postgresql'
    });
  } catch (error) {
    console.error('❌ Postgres API: Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Initialize database tables
router.post('/init', async (req, res) => {
  try {
    await postgresService.initializeTables();
    
    res.json({
      success: true,
      message: 'Database tables initialized successfully',
      source: 'postgresql'
    });
  } catch (error) {
    console.error('❌ Postgres API: Error initializing tables:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Migrate from localStorage to PostgreSQL
router.post('/migrate', async (req, res) => {
  try {
    const totalMigrated = await postgresService.migrateFromLocalStorage();
    
    res.json({
      success: true,
      message: `Migration completed. ${totalMigrated} items migrated to PostgreSQL`,
      totalMigrated,
      source: 'postgresql'
    });
  } catch (error) {
    console.error('❌ Postgres API: Error during migration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    // Try to get a simple table to test connection
    await postgresService.getAll('settings');
    
    res.json({
      success: true,
      message: 'PostgreSQL connection healthy',
      timestamp: new Date().toISOString(),
      source: 'postgresql'
    });
  } catch (error) {
    console.error('❌ Postgres API: Health check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
