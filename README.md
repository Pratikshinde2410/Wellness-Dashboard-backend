# Wellness Healthcare Dashboard

A production-oriented MERN stack healthcare dashboard with separate **User** and **Admin** portals, JWT authentication with refresh tokens, RBAC, MongoDB indexing, CSV import, and deployment-ready environment configuration.

## Architecture

```
Browser → Vercel (React) → Render (Express API) → MongoDB Atlas
```

JWT flow: login returns a short-lived access token (Authorization header) and stores a refresh token in an httpOnly cookie. The frontend Axios interceptor automatically refreshes expired access tokens.

> An architecture diagram (`docs/architecture-diagram.png`) can be drawn separately in draw.io showing the above flow with JWT annotations.

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React (Vite), React Router, Axios   |
| Backend  | Node.js, Express.js                 |
| Database | MongoDB Atlas, Mongoose             |
| Auth     | JWT (access + refresh), bcrypt      |
| Validation | Zod                             |

## Project Structure

```
/backend          Express API, models, seed script
/frontend         React Vite SPA
/docs             Technical docs, Postman collection
```

## Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier)
- npm

## Local Setup

### 1. MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user and whitelist your IP (or `0.0.0.0/0` for dev)
3. Copy the connection string

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET
npm install
npm run convert-data -- "../path/to/healthcare dataset.xlsx"   # if CSV not yet generated
npm run seed        # loads clients.csv + health_reports.csv (5000 clients, ~25k reports)
npm run dev         # starts on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:5000/api
npm install
npm run dev         # starts on http://localhost:5173
```

### Demo Credentials

| Role  | Email                  | Password     |
|-------|------------------------|--------------|
| Admin | user1@example.com      | Password@123 |
| User  | user2@example.com      | Password@123 |

All seeded clients use `Password@123`.

## API Endpoints

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/refresh` | Cookie |
| POST | `/api/auth/logout` | Public |
| GET | `/api/users/me` | User |
| GET | `/api/users/me/reports/latest` | User |
| GET | `/api/users/me/reports` | User |
| GET | `/api/admin/clients` | Admin |
| GET | `/api/admin/clients/:id` | Admin |
| GET | `/api/admin/clients/:id/reports` | Admin |
| POST | `/api/admin/reports/upload-csv` | Admin |

## Deployment

### MongoDB Atlas

Use the same cluster; set `MONGODB_URI` in Render.

### Backend → Render

1. Connect your GitHub repo
2. Root directory: `backend`
3. Build command: `npm install`
4. Start command: `npm start`
5. Environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET` (min 32 chars)
   - `JWT_REFRESH_SECRET` (min 32 chars)
   - `CORS_ORIGIN` = your Vercel URL
   - `NODE_ENV` = `production`
6. Run seed once via Render shell: `npm run seed`

### Frontend → Vercel

1. Root directory: `frontend`
2. Framework: Vite
3. Environment variable:
   - `VITE_API_BASE_URL` = `https://your-render-app.onrender.com/api`
4. Deploy

## CSV Upload Format

Upload `health_reports.csv` with columns:

```
report_id,client_id,report_date,hemoglobin,vitamin_d,cholesterol,blood_sugar_fasting,creatinine,urine_protein,bmi,doctor_notes
```

- `client_id` must match a numeric `client_id` in the clients collection
- `urine_protein` must be `Negative`, `Trace`, or `Positive`
- Invalid rows are rejected individually with per-row error details

## Postman

Import `docs/postman_collection.json` for all endpoints with example bodies and auth headers.

## License

MIT
