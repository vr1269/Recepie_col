const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'recipes_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Initialize database schema
const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    // Create recipes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        cuisine VARCHAR(100),
        title VARCHAR(255),
        rating FLOAT,
        prep_time INTEGER,
        cook_time INTEGER,
        total_time INTEGER,
        description TEXT,
        nutrients JSONB,
        serves VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index for better search performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_recipes_rating ON recipes(rating);
      CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes(cuisine);
      CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes USING gin(to_tsvector('english', title));
    `);
    
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
  }
};

// Parse and insert JSON data
const parseAndInsertRecipes = async (jsonFilePath) => {
  try {
    const rawData = fs.readFileSync(jsonFilePath, 'utf8');
    const recipesData = JSON.parse(rawData);
    
    const client = await pool.connect();
    
    // Check if data already exists
    const countResult = await client.query('SELECT COUNT(*) FROM recipes');
    if (parseInt(countResult.rows[0].count) > 0) {
      console.log('Recipes already exist in database');
      client.release();
      return;
    }
    
    console.log('Inserting recipes into database...');
    let insertedCount = 0;
    
    for (const [key, recipe] of Object.entries(recipesData)) {
      try {
        // Handle NaN values by converting them to null
        const rating = isNaN(recipe.rating) || recipe.rating === 'NaN' ? null : parseFloat(recipe.rating);
        const prepTime = isNaN(recipe.prep_time) || recipe.prep_time === 'NaN' ? null : parseInt(recipe.prep_time);
        const cookTime = isNaN(recipe.cook_time) || recipe.cook_time === 'NaN' ? null : parseInt(recipe.cook_time);
        const totalTime = isNaN(recipe.total_time) || recipe.total_time === 'NaN' ? null : parseInt(recipe.total_time);
        
        // Clean nutrients data - remove any NaN values
        let nutrients = recipe.nutrients || {};
        if (typeof nutrients === 'object') {
          for (const [key, value] of Object.entries(nutrients)) {
            if (value === 'NaN' || isNaN(value)) {
              delete nutrients[key];
            }
          }
        }
        
        await client.query(`
          INSERT INTO recipes (cuisine, title, rating, prep_time, cook_time, total_time, description, nutrients, serves)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          recipe.cuisine || null,
          recipe.title || null,
          rating,
          prepTime,
          cookTime,
          totalTime,
          recipe.description || null,
          JSON.stringify(nutrients),
          recipe.serves || null
        ]);
        
        insertedCount++;
        if (insertedCount % 100 === 0) {
          console.log(`Inserted ${insertedCount} recipes...`);
        }
      } catch (err) {
        console.error(`Error inserting recipe: ${recipe.title}`, err.message);
      }
    }
    
    client.release();
    console.log(`Successfully inserted ${insertedCount} recipes`);
  } catch (err) {
    console.error('Error parsing and inserting recipes:', err);
  }
};

// API Endpoints

// Get all recipes with pagination and sorting
app.get('/api/recipes', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;
    
    const client = await pool.connect();
    
    // Get total count
    const countResult = await client.query('SELECT COUNT(*) FROM recipes');
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated recipes sorted by rating (descending)
    const recipesResult = await client.query(`
      SELECT * FROM recipes 
      ORDER BY rating DESC NULLS LAST, id ASC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    client.release();
    
    res.json({
      page,
      limit,
      total,
      data: recipesResult.rows
    });
  } catch (err) {
    console.error('Error fetching recipes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search recipes
app.get('/api/recipes/search', async (req, res) => {
  try {
    const { calories, title, cuisine, total_time, rating, page = 1, limit = 10 } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;
    
    // Build dynamic query based on filters
    if (title) {
      paramCount++;
      whereConditions.push(`title ILIKE $${paramCount}`);
      queryParams.push(`%${title}%`);
    }
    
    if (cuisine) {
      paramCount++;
      whereConditions.push(`cuisine ILIKE $${paramCount}`);
      queryParams.push(`%${cuisine}%`);
    }
    
    if (rating) {
      paramCount++;
      if (rating.startsWith('>=')) {
        whereConditions.push(`rating >= $${paramCount}`);
        queryParams.push(parseFloat(rating.substring(2)));
      } else if (rating.startsWith('<=')) {
        whereConditions.push(`rating <= $${paramCount}`);
        queryParams.push(parseFloat(rating.substring(2)));
      } else if (rating.startsWith('>')) {
        whereConditions.push(`rating > $${paramCount}`);
        queryParams.push(parseFloat(rating.substring(1)));
      } else if (rating.startsWith('<')) {
        whereConditions.push(`rating < $${paramCount}`);
        queryParams.push(parseFloat(rating.substring(1)));
      } else if (rating.startsWith('=')) {
        whereConditions.push(`rating = $${paramCount}`);
        queryParams.push(parseFloat(rating.substring(1)));
      } else {
        whereConditions.push(`rating = $${paramCount}`);
        queryParams.push(parseFloat(rating));
      }
    }
    
    if (total_time) {
      paramCount++;
      if (total_time.startsWith('>=')) {
        whereConditions.push(`total_time >= $${paramCount}`);
        queryParams.push(parseInt(total_time.substring(2)));
      } else if (total_time.startsWith('<=')) {
        whereConditions.push(`total_time <= $${paramCount}`);
        queryParams.push(parseInt(total_time.substring(2)));
      } else if (total_time.startsWith('>')) {
        whereConditions.push(`total_time > $${paramCount}`);
        queryParams.push(parseInt(total_time.substring(1)));
      } else if (total_time.startsWith('<')) {
        whereConditions.push(`total_time < $${paramCount}`);
        queryParams.push(parseInt(total_time.substring(1)));
      } else if (total_time.startsWith('=')) {
        whereConditions.push(`total_time = $${paramCount}`);
        queryParams.push(parseInt(total_time.substring(1)));
      } else {
        whereConditions.push(`total_time = $${paramCount}`);
        queryParams.push(parseInt(total_time));
      }
    }
    
    if (calories) {
      paramCount++;
      const caloriesValue = calories.match(/\d+/)?.[0];
      if (caloriesValue) {
        if (calories.startsWith('>=')) {
          whereConditions.push(`CAST(nutrients->>'calories' AS INTEGER) >= $${paramCount}`);
        } else if (calories.startsWith('<=')) {
          whereConditions.push(`CAST(nutrients->>'calories' AS INTEGER) <= $${paramCount}`);
        } else if (calories.startsWith('>')) {
          whereConditions.push(`CAST(nutrients->>'calories' AS INTEGER) > $${paramCount}`);
        } else if (calories.startsWith('<')) {
          whereConditions.push(`CAST(nutrients->>'calories' AS INTEGER) < $${paramCount}`);
        } else if (calories.startsWith('=')) {
          whereConditions.push(`CAST(nutrients->>'calories' AS INTEGER) = $${paramCount}`);
        } else {
          whereConditions.push(`CAST(nutrients->>'calories' AS INTEGER) = $${paramCount}`);
        }
        queryParams.push(parseInt(caloriesValue));
      }
    }
    
    const client = await pool.connect();
    
    let query = 'SELECT * FROM recipes';
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    query += ' ORDER BY rating DESC NULLS LAST, id ASC';
    
    // Add pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 50);
    const offset = (pageNum - 1) * limitNum;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(limitNum);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);
    
    const result = await client.query(query, queryParams);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM recipes';
    if (whereConditions.length > 0) {
      countQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    const countResult = await client.query(countQuery, queryParams.slice(0, -2)); // Remove LIMIT and OFFSET params
    const total = parseInt(countResult.rows[0].count);
    
    client.release();
    
    res.json({
      page: pageNum,
      limit: limitNum,
      total,
      data: result.rows
    });
  } catch (err) {
    console.error('Error searching recipes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Initialize and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    // Check if JSON file exists and load data
    const jsonFilePath = path.join(__dirname, 'US_recipes.json');
    if (fs.existsSync(jsonFilePath)) {
      await parseAndInsertRecipes(jsonFilePath);
    } else {
      console.log('US_recipes.json not found. Please add the JSON file to load recipe data.');
    }
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

startServer();