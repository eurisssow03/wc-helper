# Database Setup Guide

This guide will help you set up a database for the WC Helper application to replace localStorage and prevent data loss.

## 🗄️ Database Overview

The application now supports SQLite database for persistent data storage. This provides:
- **Data Persistence**: Data survives browser refreshes and server restarts
- **Better Performance**: Faster data access and queries
- **Data Integrity**: ACID compliance and data validation
- **Scalability**: Easy to migrate to other databases (PostgreSQL, MySQL, etc.)

## 📋 Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- Basic knowledge of SQLite

## 🚀 Quick Setup

### 1. Install Database Dependencies

```bash
cd database
npm install
```

### 2. Start Database-Enabled Webhook Server

```bash
# Option 1: Use the new database-enabled server
node webhook-server-with-db.js

# Option 2: Install dependencies and start
npm install sqlite3 express cors
node webhook-server-with-db.js
```

### 3. Migrate Existing Data

The application will automatically detect if you have localStorage data and offer to migrate it to the database.

## 🏗️ Database Schema

### Tables

1. **users** - User accounts and authentication
2. **homestays** - Homestay property information
3. **faqs** - Frequently Asked Questions
4. **settings** - Application configuration
5. **messages** - All messages (WhatsApp, ChatTester, etc.)
6. **logs** - AI processing logs and system logs
7. **conversation_memory** - Conversation history and context
8. **general_knowledge** - General knowledge base content

### Key Features

- **Auto-incrementing IDs** for all tables
- **JSON storage** for complex data (amenities, tags, etc.)
- **Timestamps** for all records
- **Indexes** for better performance
- **Foreign key relationships** where applicable

## 🔧 Configuration

### Environment Variables

```bash
# Database configuration
DB_PATH=./database/wc-helper.db

# Webhook configuration
WEBHOOK_VERIFY_TOKEN=your_verify_token
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
OPENAI_API_KEY=your_openai_key
```

### Database Location

By default, the database is created at:
- **Development**: `./database/wc-helper.db`
- **Production**: `./database/wc-helper.db`

## 📊 API Endpoints

The database service provides RESTful API endpoints:

### Users
- `GET /api/database/users` - Get all users
- `POST /api/database/users` - Create user
- `PUT /api/database/users/:id` - Update user
- `DELETE /api/database/users/:id` - Delete user

### Homestays
- `GET /api/database/homestays` - Get all homestays
- `POST /api/database/homestays` - Create homestay
- `PUT /api/database/homestays/:id` - Update homestay
- `DELETE /api/database/homestays/:id` - Delete homestay

### FAQs
- `GET /api/database/faqs` - Get all FAQs
- `GET /api/database/faqs/active` - Get active FAQs
- `POST /api/database/faqs` - Create FAQ
- `PUT /api/database/faqs/:id` - Update FAQ
- `DELETE /api/database/faqs/:id` - Delete FAQ

### Settings
- `GET /api/database/settings` - Get all settings
- `GET /api/database/settings/:key` - Get specific setting
- `PUT /api/database/settings/:key` - Update setting

### Messages & Logs
- `GET /api/database/messages` - Get messages
- `POST /api/database/messages` - Create message
- `GET /api/database/logs` - Get logs
- `POST /api/database/logs` - Create log

### Conversation Memory
- `GET /api/database/conversation/:phoneNumber` - Get conversation
- `POST /api/database/conversation/:phoneNumber` - Add message
- `DELETE /api/database/conversation/:phoneNumber` - Clear conversation

### Statistics
- `GET /api/database/stats` - Get database statistics

## 🔄 Migration Process

### Automatic Migration

The application automatically detects localStorage data and offers migration:

1. **Detection**: Checks if database is available and localStorage has data
2. **Migration**: Transfers all data from localStorage to database
3. **Verification**: Confirms successful migration
4. **Fallback**: Falls back to localStorage if database is unavailable

### Manual Migration

```javascript
import migrationService from './src/utils/migrationService.js';

// Check if migration is needed
if (migrationService.isMigrationNeeded()) {
  // Perform migration
  const result = await migrationService.migrateToDatabase();
  console.log('Migration completed:', result);
}
```

## 🛠️ Development

### Database Service

The `DatabaseService` class handles all database operations:

```javascript
import DatabaseService from './database/databaseService.js';

const db = new DatabaseService();
await db.initialize();

// Use database
const users = await db.getAllUsers();
const faqs = await db.getActiveFAQs();
```

### Frontend Integration

The frontend uses `databaseService.js` which automatically:
- Falls back to localStorage if database is unavailable
- Handles API calls to the database
- Provides consistent interface

## 🔍 Troubleshooting

### Common Issues

1. **Database not found**
   - Ensure SQLite3 is installed: `npm install sqlite3`
   - Check file permissions for database directory

2. **Migration fails**
   - Check console for specific error messages
   - Verify database is accessible
   - Try manual migration

3. **Performance issues**
   - Check database indexes
   - Monitor query performance
   - Consider database optimization

### Debug Mode

Enable debug logging:

```javascript
// In databaseService.js
console.log('🔍 Database query:', sql, params);
```

## 📈 Performance

### Optimization Tips

1. **Use indexes** for frequently queried columns
2. **Batch operations** for multiple inserts
3. **Connection pooling** for high traffic
4. **Regular maintenance** (VACUUM, ANALYZE)

### Monitoring

Monitor database performance:

```sql
-- Check database size
SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();

-- Check table sizes
SELECT name, (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as rows FROM sqlite_master m WHERE type='table';
```

## 🔒 Security

### Best Practices

1. **Input validation** for all user inputs
2. **SQL injection prevention** using parameterized queries
3. **Access control** for database operations
4. **Regular backups** of database files

### Backup

```bash
# Create backup
cp wc-helper.db wc-helper-backup-$(date +%Y%m%d).db

# Restore backup
cp wc-helper-backup-20240120.db wc-helper.db
```

## 🚀 Production Deployment

### Environment Setup

1. **Install dependencies**:
   ```bash
   npm install sqlite3 express cors
   ```

2. **Set environment variables**:
   ```bash
   export DB_PATH=/path/to/production/database.db
   export WEBHOOK_VERIFY_TOKEN=your_production_token
   ```

3. **Start server**:
   ```bash
   node webhook-server-with-db.js
   ```

### Database Maintenance

- **Regular backups** (daily/weekly)
- **Monitor disk space**
- **Performance tuning**
- **Security updates**

## 📚 Additional Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Node.js SQLite3](https://github.com/mapbox/node-sqlite3)
- [Express.js](https://expressjs.com/)
- [CORS](https://github.com/expressjs/cors)

## 🤝 Support

If you encounter issues:

1. Check the troubleshooting section
2. Review console logs
3. Verify database connectivity
4. Check file permissions

For additional help, please refer to the main application documentation.
