# Recipe Data Collection and API Development

A full-stack application that parses recipe data from JSON, stores it in a PostgreSQL database, exposes REST APIs, and provides a React frontend for browsing and filtering recipes.

## 🏗️ Tech Stack

- **Frontend**: React (via CDN), Tailwind CSS, Font Awesome
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Additional Libraries**: Axios, pg (PostgreSQL client)

## 📋 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## 🚀 Setup Instructions

### 1. Database Setup

#### Install and Start PostgreSQL
```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# On macOS (using Homebrew)
brew install postgresql
brew services start postgresql

# On Windows, download and install from https://www.postgresql.org/download/
```

#### Create Database and User
```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Create database and user
CREATE DATABASE recipes_db;
CREATE USER recipe_user WITH PASSWORD 'recipe_password';
GRANT ALL PRIVILEGES ON DATABASE recipes_db TO recipe_user;
\q
```

#### Run Database Schema Setup
```bash
# Connect to your database
psql -U recipe_user -d recipes_db -h localhost

# Or run the setup script directly
psql -U recipe_user -d recipes_db -h localhost -f setup_database.sql
```

### 2. Backend Setup

#### Install Dependencies
```bash
# Navigate to backend directory
cd backend
npm install express cors pg dotenv nodemon
```

#### Environment Configuration
Create a `.env` file in the backend directory:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recipes_db
DB_USER=recipe_user
DB_PASSWORD=recipe_password
PORT=3001
```

#### Add Your Recipe Data
Place your `US_recipes.json` file in the backend root directory. The server will automatically parse and load this data on startup.

#### Start the Backend Server
```bash
# Development mode with auto-restart
npm run dev

# Or production mode
npm start
```

The server will start on `http://localhost:3001` and automatically:
- Initialize the database schema
- Parse and insert recipe data from `US_recipes.json`
- Create necessary indexes for optimal performance

### 3. Frontend Setup

The frontend is a single HTML file that can be served statically or through a simple HTTP server.

#### Option 1: Direct File Opening
Open `index.html` directly in your browser. Note: You may encounter CORS issues with this method.

#### Option 2: Simple HTTP Server
```bash
# Using Python 3
python -m http.server 3000

# Using Python 2
python -m SimpleHTTPServer 3000

# Using Node.js http-server (install globally first)
npm install -g http-server
http-server -p 3000

# Using PHP
php -S localhost:3000
```

Access the frontend at `http://localhost:3000`

## 📡 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Endpoints

#### 1. Get All Recipes (Paginated & Sorted)
```http
GET /api/recipes?page={page}&limit={limit}
```

**Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)

**Example Request:**
```bash
curl "http://localhost:3001/api/recipes?page=1&limit=10"
```

**Example Response:**
```json
{
  "page": 1,
  "limit": 10,
  "total": 8450,
  "data": [
    {
      "id": 1,
      "title": "Sweet Potato Pie",
      "cuisine": "Southern Recipes",
      "rating": 4.8,
      "prep_time": 15,
      "cook_time": 100,
      "total_time": 115,
      "description": "Shared from a Southern recipe...",
      "nutrients": {
        "calories": "389 kcal",
        "carbohydrateContent": "48 g",
        "proteinContent": "5 g"
      },
      "serves": "8 servings"
    }
  ]
}
```

#### 2. Search Recipes
```http
GET /api/recipes/search?{filters}
```

**Available Filters:**
- `title`: Partial text match (e.g., `pie`)
- `cuisine`: Cuisine type (e.g., `Southern Recipes`)
- `rating`: Rating filter (e.g., `>=4.5`, `<=3.0`, `=4.0`)
- `total_time`: Time filter in minutes (e.g., `<=120`, `>=30`)
- `calories`: Calorie filter (e.g., `<=400`, `>=200`)
- `page`: Page number for pagination
- `limit`: Items per page

**Example Requests:**
```bash
# Search for pie recipes with high rating
curl "http://localhost:3001/api/recipes/search?title=pie&rating=>=4.5"

# Search for low-calorie, quick recipes
curl "http://localhost:3001/api/recipes/search?calories=<=400&total_time=<=60"

# Search Southern recipes
curl "http://localhost:3001/api/recipes/search?cuisine=Southern"
```

#### 3. Health Check
```http
GET /health
```

Returns server status information.

## 🖥️ Frontend Features

### Main Features
1. **Recipe Table Display**
   - Title (truncated if too long)
   - Cuisine (displayed as badges)
   - Rating (star-based visualization)
   - Total cooking time
   - Number of servings

2. **Detailed Recipe View**
   - Right-side drawer with complete recipe information
   - Expandable timing details (prep time, cook time)
   - Comprehensive nutrition information table
   - Responsive design

3. **Advanced Filtering**
   - Cell-level filters for all displayable columns
   - Real-time search using the `/search` API
   - Support for comparison operators (>=, <=, =)
   - Filter clearing functionality

4. **Pagination & Customization**
   - Customizable results per page (15, 25, 35, 50)
   - Page navigation with smart page number display
   - Total results information

5. **User Experience**
   - Loading states with spinners
   - Error handling and retry functionality
   - "No results found" fallback screens
   - Responsive design for mobile and desktop

### Filter Examples
- **Title**: `chocolate cake`, `soup`
- **Cuisine**: `Italian`, `Mexican`, `Southern`
- **Rating**: `>=4.0`, `<=3.5`, `=5.0`
- **Time**: `<=30` (30 minutes or less), `>=120` (2 hours or more)
- **Calories**: `<=300`, `>=500`

## 🧪 Testing the API

### Using cURL

```bash
# Test basic endpoint
curl -X GET "http://localhost:3001/api/recipes?page=1&limit=5"

# Test search functionality
curl -X GET "http://localhost:3001/api/recipes/search?title=chicken&rating=>=4.0"

# Test complex search
curl -X GET "http://localhost:3001/api/recipes/search?calories=<=400&total_time=<=60&cuisine=Italian"

# Health check
curl -X GET "http://localhost:3001/health"
```

### Using Postman

1. Import the following requests:

**Get Recipes**
- Method: GET
- URL: `http://localhost:3001/api/recipes`
- Params: `page=1&limit=10`

**Search Recipes**
- Method: GET  
- URL: `http://localhost:3001/api/recipes/search`
- Params: `title=pie&rating=>=4.5&calories=<=400`

### Sample Test Cases

1. **Pagination Test**: Verify different page sizes (15, 25, 35, 50)
2. **Sorting Test**: Confirm recipes are sorted by rating (descending)
3. **Filter Test**: Test individual and combined filters
4. **Edge Cases**: Empty results, invalid parameters, NaN handling
5. **Performance Test**: Large dataset queries with indexes

## 🚦 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### Recipe Data Not Loading
- Ensure `US_recipes.json` is in the backend root directory
- Check file permissions
- Verify JSON format validity
- Check server logs for parsing errors

#### CORS Errors in Frontend
- Use a local HTTP server instead of opening HTML directly
- Ensure backend server is running on port 3001
- Check browser developer tools for specific error messages

#### Port Already in Use
```bash
# Kill process using port 3001
sudo lsof -t -i:3001 | xargs kill -9

# Or use a different port in .env file
PORT=3002
```

### Database Reset
```sql
-- If you need to reset the database
DROP TABLE IF EXISTS recipes CASCADE;
-- Then re-run the setup script
```

## 📊 Performance Optimizations

- Database indexes on frequently queried columns
- Efficient pagination with LIMIT/OFFSET
- JSONB storage for flexible nutrient data
- Connection pooling for database efficiency
- Frontend loading states for better UX

## 🔄 Data Handling

### NaN Value Processing
The application handles NaN values by:
- Converting `NaN` strings to `null` during parsing
- Using conditional checks (`isNaN()`) before database insertion  
- Graceful fallbacks in the frontend for missing data

### Nutrition Data
- Stored as JSONB for flexibility
- Supports dynamic nutrient fields
- Handles missing or malformed nutrition information

## 📝 Project Structure

```
recipe-api/
├── backend/
│   ├── server.js              # Main server file
│   ├── package.json           # Dependencies
│   ├── .env                   # Environment variables
│   └── US_recipes.json        # Recipe data (user-provided)
├── frontend/
│   └── index.html             # React frontend
├── database/
│   └── setup_database.sql     # Database schema
└── README.md                  # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
