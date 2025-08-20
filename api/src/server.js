const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const log4js = require('log4js');
const { v4: uuidv4 } = require('uuid');

// Configure logging
log4js.configure({
  appenders: {
    console: { 
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: '%d{ISO8601} [%p] %c - %m'
      }
    }
  },
  categories: {
    default: { appenders: ['console'], level: 'info' }
  }
});

const logger = log4js.getLogger('api');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const clientIP = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                   '127.0.0.1';
  
  req.clientIP = clientIP;
  logger.info(JSON.stringify({
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: clientIP,
    userAgent: req.headers['user-agent']
  }));
  next();
});

// Database connection with connection pooling and reconnection
const dbConfig = {
  host: process.env.DB_HOST || 'tidb',
  port: process.env.DB_PORT || 4000,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  connectionLimit: 10,
  queueLimit: 0
};

let db;

// Create database connection pool
async function createDbPool() {
  try {
    logger.info('Creating database connection pool...');
    db = mysql.createPool(dbConfig);
    
    // Test the connection
    await db.execute('SELECT 1');
    logger.info('Database pool connected successfully');
    
    return db;
  } catch (error) {
    logger.error('Database pool creation failed:', error);
    throw error;
  }
}

// Initialize database with retry logic
async function initDatabase() {
  const maxRetries = 10;
  const retryDelay = 5000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Attempting database connection (${attempt}/${maxRetries})...`);
      
      // First connect without database to create it
      const tempConfig = { ...dbConfig };
      delete tempConfig.database;
      const tempDb = await mysql.createConnection(tempConfig);
      
      // Create database if not exists
      await tempDb.execute('CREATE DATABASE IF NOT EXISTS sre_test');
      await tempDb.end();
      
      // Now create pool with database specified
      dbConfig.database = 'sre_test';
      await createDbPool();
      
      logger.info('Connected to TiDB server');
      await initSchema();
      await createDefaultUser();
      
      return; // Success, exit retry loop
      
    } catch (error) {
      logger.error(`Database connection attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        logger.error('Max database connection attempts reached. Exiting...');
        process.exit(1);
      }
      
      logger.info(`Retrying in ${retryDelay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

// Initialize database schema
async function initSchema() {
  try {
    logger.info('Initializing database schema...');
    
    // Create users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username)
      )
    `);
    
    // Create user_tokens table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_token_hash (token_hash),
        INDEX idx_user_id (user_id),
        INDEX idx_expires_at (expires_at)
      )
    `);
    
    // Create user_activities table for logging
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        additional_data JSON,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_action (action),
        INDEX idx_timestamp (timestamp)
      )
    `);
    
    logger.info('Database schema initialized successfully');
  } catch (error) {
    logger.error('Schema initialization failed:', error);
    throw error;
  }
}

// Create default user
async function createDefaultUser() {
  try {
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', ['admin@test.com']);
    
    if (existing.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.execute(
        'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)',
        ['admin@test.com', 'admin', hashedPassword]
      );
      logger.info('Default user created: admin@test.com / admin123');
    } else {
      logger.info('Default user already exists');
    }
  } catch (error) {
    logger.error('Failed to create default user:', error);
    throw error;
  }
}

// Authentication middleware
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
    
    // Check if token exists in database and is not expired
    const [tokenRows] = await db.execute(`
      SELECT ut.*, u.email, u.username 
      FROM user_tokens ut 
      JOIN users u ON ut.user_id = u.id 
      WHERE ut.token_hash = ? AND ut.expires_at > NOW()
    `, [token]);

    if (tokenRows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      id: decoded.userId,
      email: tokenRows[0].email,
      username: tokenRows[0].username
    };
    
    next();
  } catch (error) {
    logger.error('Token authentication failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key-here',
      { expiresIn: '24h' }
    );

    // Store token in database
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    await db.execute(
      'INSERT INTO user_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );

    // Log user activity
    await db.execute(
      'INSERT INTO user_activities (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
      [user.id, 'login', req.clientIP, req.headers['user-agent']]
    );

    // Structured logging for user login
    logger.info(JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: user.id,
      action: 'login',
      ipAddress: req.clientIP,
      userAgent: req.headers['user-agent'],
      email: user.email
    }));

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    logger.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Remove token from database
    await db.execute('DELETE FROM user_tokens WHERE token_hash = ?', [token]);

    // Log user activity
    await db.execute(
      'INSERT INTO user_activities (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
      [req.user.id, 'logout', req.clientIP, req.headers['user-agent']]
    );

    logger.info(JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: req.user.id,
      action: 'logout',
      ipAddress: req.clientIP,
      email: req.user.email
    }));

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout failed:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    logger.error('Get profile failed:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  await initDatabase();
  
  app.listen(port, () => {
    logger.info(`API server running on port ${port}`);
  });
}

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;
