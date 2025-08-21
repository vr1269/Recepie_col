-- Database Setup Script for Recipe API
-- This script creates the necessary database and tables for the recipe application

-- Create database (run this as a superuser)
-- CREATE DATABASE recipes_db;

-- Connect to the recipes_db database before running the following commands
\c recipes_db;

-- Create the recipes table
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
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_rating ON recipes(rating);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_recipes_total_time ON recipes(total_time);
CREATE INDEX IF NOT EXISTS idx_recipes_nutrients_calories ON recipes USING gin(nutrients);

-- Create a view for easier querying with extracted calories
CREATE OR REPLACE VIEW recipes_with_calories AS
SELECT 
    id,
    cuisine,
    title,
    rating,
    prep_time,
    cook_time,
    total_time,
    description,
    nutrients,
    serves,
    created_at,
    CASE 
        WHEN nutrients->>'calories' ~ '^\d+(\.\d+)?'
        THEN CAST(REGEXP_REPLACE(nutrients->>'calories', '[^\d.]', '', 'g') AS FLOAT)
        ELSE NULL 
    END as calories_numeric
FROM recipes;

-- Sample queries to test the setup

-- Get top rated recipes
-- SELECT title, cuisine, rating FROM recipes WHERE rating IS NOT NULL ORDER BY rating DESC LIMIT 10;

-- Search by calories (example: recipes with <= 400 calories)
-- SELECT title, nutrients->>'calories' as calories FROM recipes_with_calories WHERE calories_numeric <= 400 ORDER BY calories_numeric;

-- Search by title (partial match)
-- SELECT title, cuisine, rating FROM recipes WHERE title ILIKE '%pie%' ORDER BY rating DESC;

-- Get recipes by cuisine
-- SELECT title, rating, total_time FROM recipes WHERE cuisine = 'Southern Recipes' ORDER BY rating DESC;

-- Complex search example
-- SELECT title, cuisine, rating, total_time, nutrients->>'calories' as calories 
-- FROM recipes_with_calories 
-- WHERE calories_numeric <= 400 
-- AND title ILIKE '%pie%' 
-- AND rating >= 4.5 
-- ORDER BY rating DESC;