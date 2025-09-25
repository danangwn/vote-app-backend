# Vote App Backend

This is the backend service for the Vote App built with **Express.js** and **MongoDB**.

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/danangwn/vote-app-backend.git
cd vote-app-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy the example environment file and update the values:
```bash
cp env.example .env
```

Edit `.env`:
```env
JWT_SECRET=your_strong_secret
JWT_EXPIRES_IN=1h
PORT=4000
MONGODB_URI=mongodb://localhost:27017/vote-app
```

### 4. Run the app locally
```bash
node server.js
```

App will start on:
```
http://localhost:4000
```

---

## 🐳 Run with Docker

The easiest way to run the backend with MongoDB is via Docker Compose.

1. Copy env file:
```bash
cp env.example .env
```

2. Build and start services:
```bash
docker-compose up --build -d
```

3. Stop services:
```bash
docker-compose down
```

---

## ✅ Notes

- The app will automatically create **two main voting options** if they don’t exist.  
- Use the `.env` file to set your own `JWT_SECRET`.  
- The MongoDB database is persisted in a Docker volume (`mongo_data`). Use `docker-compose down -v` to wipe it.  
