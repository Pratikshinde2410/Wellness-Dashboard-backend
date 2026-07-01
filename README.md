# Wellness Healthcare Dashboard Backend

A backend service for a healthcare dashboard with JWT authentication, role-based access control, MongoDB persistence, CSV import support, audit logging, and admin analytics endpoints.

## Tech Stack

- Node.js
- Express.js
- MongoDB Atlas + Mongoose
- JWT (access + refresh tokens)
- bcrypt
- Zod validation
- Multer for CSV uploads

## Project Structure

```text
src/
  config/       environment and database setup
  controllers/   request handlers
  middleware/    auth, validation, error handling
  models/        Mongoose models
  routes/        API routes
  utils/         helpers for audit, CSV parsing, vitals
  validators/    request schemas
scripts/         seed and CSV conversion scripts
```

## Prerequisites

- Node.js 18+
- MongoDB Atlas account
- npm

## Local Setup

1. Create a MongoDB Atlas cluster and database user.
2. Create a `.env` file with the required environment variables:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
CORS_ORIGIN=http://localhost:5173
PORT=5000
NODE_ENV=development
```

3. Install dependencies and start the backend:

```bash
npm install
npm run seed
npm run dev
```

The API will run on `http://localhost:5000`.

## Demo Credentials

| Role  | Email                  | Password     |
|-------|------------------------|--------------|
| Admin | user1@example.com      | Password@123 |
| User  | user2@example.com      | Password@123 |

All seeded users use `Password@123`.

## API Endpoints

Base URL: `/api`

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/api/health` | Public | Health check |
| POST | `/api/auth/login` | Public | Login with email/password |
| POST | `/api/auth/refresh` | Cookie | Refresh access token |
| POST | `/api/auth/logout` | Public | Clear auth cookie |
| GET | `/api/users/me` | User | Get current user profile |
| PATCH | `/api/users/me` | User | Update profile |
| POST | `/api/users/me/change-password` | User | Change password |
| GET | `/api/users/me/reports/trends` | User | Get report trend data |
| GET | `/api/users/me/reports/latest` | User | Get latest report |
| GET | `/api/users/me/reports` | User | List own reports with pagination |
| GET | `/api/admin/dashboard/stats` | Admin | Dashboard summary stats |
| GET | `/api/admin/analytics` | Admin | Analytics overview |
| GET | `/api/admin/clients/export` | Admin | Export clients data |
| GET | `/api/admin/clients` | Admin | List clients |
| POST | `/api/admin/clients` | Admin | Create a client |
| GET | `/api/admin/clients/:id` | Admin | Get client details |
| PATCH | `/api/admin/clients/:id` | Admin | Update client |
| GET | `/api/admin/clients/:id/reports` | Admin | List reports for a client |
| POST | `/api/admin/clients/:id/reports` | Admin | Create a report for a client |
| GET | `/api/admin/reports` | Admin | List all reports |
| PATCH | `/api/admin/reports/:reportId` | Admin | Update a report |
| DELETE | `/api/admin/reports/:reportId` | Admin | Delete a report |
| GET | `/api/admin/upload-history` | Admin | View CSV upload history |
| GET | `/api/admin/audit-log` | Admin | View audit log |
| POST | `/api/admin/reports/upload-csv` | Admin | Upload health reports CSV |

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
