# 🚀 Deployment Guide

This guide covers multiple deployment options for the Recipe API application.

## 📁 Project Structure

```
recipe-collection-api/
├── backend/
│   ├── server.js                 # Main application server
│   ├── package.json              # Node.js dependencies
│   ├── .env.example              # Environment variables template
│   ├── Dockerfile                # Docker configuration
│   └── US_recipes.json           # Recipe data (add your file here)
├── frontend/
│   └── index.html                # React frontend application
├── database/
│   └── setup_database.sql        # Database schema and setup
├── tests/
│   ├── test_api.js               # Automated API tests
│   └── Recipe_API_Tests.postman_collection.json
├── docker-compose.yml            # Docker Compose configuration
├── README.md                     # Main documentation
└── DEPLOYMENT.md                # This file
```

## 🐳 Docker Deployment (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- Your `US_recipes.json` file in the backend directory

### Quick Start
```bash
# Clone or download the project
# Add your US_recipes.json to the backend/ directory

# Start all services
docker-compose up -d

# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f recipe-api
```

### Services
- **PostgreSQL**: `localhost:5432`
- **Recipe API**: `localhost:3001`
- **Frontend**: `localhost:3000`

### Docker Commands
```bash
# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up --build -d

# View database logs
docker-compose logs postgres

# Connect to database
docker-compose exec postgres psql -U recipe_user -d recipes_db
```

## 🖥️ Local Development Setup

### 1. Database Setup
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE recipes_db;
CREATE USER recipe_user WITH PASSWORD 'recipe_password';
GRANT ALL PRIVILEGES ON DATABASE recipes_db TO recipe_user;
\q

# Run database setup
psql -U recipe_user -d recipes_db -h localhost -f database/setup_database.sql
```

### 2. Backend Setup
```bash
cd backend/
npm install

# Create environment file
cp .env.example .env

# Add your US_recipes.json file to this directory

# Start development server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend/

# Option 1: Simple HTTP server
python3 -m http.server 3000

# Option 2: Node.js http-server
npm install -g http-server
http-server -p 3000 -c-1

# Option 3: PHP server
php -S localhost:3000
```

## ☁️ Cloud Deployment Options

### Heroku Deployment

#### Backend (API)
```bash
# Install Heroku CLI
# Create Heroku app
heroku create recipe-api-backend

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production

# Deploy
git subtree push --prefix backend heroku main
```

#### Frontend (Static Hosting)
Deploy `frontend/index.html` to:
- **Netlify**: Drag and drop the frontend folder
- **Vercel**: Connect GitHub repo, set build directory to `frontend`
- **GitHub Pages**: Push frontend folder to gh-pages branch

### AWS Deployment

#### Using AWS RDS + EC2
```bash
# 1. Create RDS PostgreSQL instance
# 2. Create EC2 instance (t2.micro for free tier)
# 3. SSH into EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# 4. Install Node.js and PM2
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
sudo npm install -g pm2

# 5. Clone your code and setup
git clone your-repo
cd recipe-collection-api/backend
npm install --production

# 6. Configure environment variables
export DB_HOST=your-rds-endpoint
export DB_PASSWORD=your-rds-password

# 7. Start with PM2
pm2 start server.js --name recipe-api
pm2 startup
pm2 save
```

#### Using AWS Elastic Beanstalk
```bash
# Install EB CLI
pip install awsebcli

# Initialize and deploy
eb init
eb create recipe-api-env
eb deploy
```

### Digital Ocean Deployment

#### Using App Platform
1. Create account on Digital Ocean
2. Go to App Platform
3. Connect your GitHub repository
4. Configure:
   - **Source**: Your repository
   - **Branch**: main
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
   - **Environment Variables**: Add database credentials
5. Add managed PostgreSQL database
6. Deploy

#### Using Droplets
```bash
# Create droplet with Ubuntu 22.04
# SSH into droplet
ssh root@your-droplet-ip

# Install Node.js and PostgreSQL
apt update
apt install -y nodejs npm postgresql postgresql-contrib nginx

# Setup database and application
# Configure nginx reverse proxy
# Use PM2 for process management
```

## 🔧 Environment Configuration

### Production Environment Variables
```env
# Database
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=recipes_db
DB_USER=your-db-user
DB_PASSWORD=your-secure-password

# Server
PORT=3001
NODE_ENV=production

# Security (add for production)
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=https://your-frontend-domain.com
```

### Frontend Configuration for Production
Update the API URL in `frontend/index.html`:
```javascript
// Change this line for production
const BASE_URL = 'https://your-api-domain.com';
```

## 🌐 Nginx Configuration (for VPS deployment)

Create `/etc/nginx/sites-available/recipe-api`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/recipe-frontend;
        index index.html;
        try_files $uri $uri/ =404;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/recipe-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 📊 Performance Optimization

### Database Optimization
```sql
-- Additional indexes for production
CREATE INDEX CONCURRENTLY idx_recipes_cuisine_rating ON recipes(cuisine, rating);
CREATE INDEX CONCURRENTLY idx_recipes_total_time_rating ON recipes(total_time, rating);

-- Analyze table statistics
ANALYZE recipes;

-- Monitor query performance
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM recipes WHERE rating >= 4.5 ORDER BY rating DESC LIMIT 10;
```

### API Optimization
```javascript
// Add to server.js for production
const compression = require('compression');
const helmet = require('helmet');

app.use(compression());
app.use(helmet());

// Add caching headers
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    next();
});
```

### Frontend Optimization
- Minify CSS and JavaScript for production
- Enable gzip compression on server
- Use CDN for static assets
- Implement lazy loading for large datasets

## 🔒 Security Considerations

### Production Security Checklist
- [ ] Use HTTPS (Let's Encrypt for free SSL)
- [ ] Set secure environment variables
- [ ] Enable CORS with specific origins
- [ ] Use helmet.js for security headers
- [ ] Validate and sanitize all inputs
- [ ] Implement rate limiting
- [ ] Regular security updates
- [ ] Database connection encryption

### Security Headers
```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "unpkg.com", "cdnjs.cloudflare.com"],
        },
    },
}));
```

## 📈 Monitoring and Maintenance

### Health Checks
```bash
# API health check
curl http://your-domain.com/health

# Database health check
docker-compose exec postgres pg_isready -U recipe_user
```

### Log Management
```bash
# PM2 logs
pm2 logs recipe-api

# Docker logs
docker-compose logs -f --tail=100 recipe-api

# System logs
journalctl -u nginx -f
```

### Backup Strategy
```bash
# Database backup
pg_dump -U recipe_user -h localhost recipes_db > backup_$(date +%Y%m%d).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U recipe_user recipes_db | gzip > $BACKUP_DIR/recipes_backup_$DATE.sql.gz
find $BACKUP_DIR -name "recipes_backup_*.sql.gz" -mtime +7 -delete
```

## 🚨 Troubleshooting

### Common Issues

#### "Cannot connect to database"
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check connection settings
psql -U recipe_user -d recipes_db -h localhost

# Check environment variables
echo $DB_HOST $DB_USER $DB_PASSWORD
```

#### "Port already in use"
```bash
# Find process using port 3001
sudo lsof -i :3001

# Kill process
sudo kill -9 <PID>
```

#### "CORS errors in browser"
- Ensure backend CORS is configured correctly
- Use proper HTTP server for frontend (not file://)
- Check browser developer tools for specific errors

#### "Out of memory errors"
```bash
# Check memory usage
free -h
docker stats

# Increase swap space
sudo fallocate -l 2G /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Performance Issues
```bash
# Monitor database performance
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

# Check slow queries
tail -f /var/log/postgresql/postgresql-*.log | grep "slow query"
```

## 📞 Support and Maintenance

### Regular Maintenance Tasks
1. **Weekly**: Check logs for errors
2. **Monthly**: Update dependencies (`npm audit`)
3. **Quarterly**: Database maintenance (`VACUUM ANALYZE`)
4. **Bi-annually**: Security audit and updates

### Scaling Considerations
- **Horizontal scaling**: Load balancer + multiple API instances
- **Database scaling**: Read replicas, connection pooling
- **Caching**: Redis for frequently accessed data
- **CDN**: For static assets and API responses