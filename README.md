# Spendwise — Smart Expense Tracker

A responsive expense tracker built with a React frontend, an Express API, and MongoDB for persistent storage. The UI is served by Vite during development; the API validates and stores expense records through Mongoose.

## Requirements

- Node.js 18 or newer
- MongoDB running locally, or a MongoDB Atlas connection string

## Run locally

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env` and set `MONGODB_URI` to your MongoDB connection string. During local development, the API generates a temporary session secret if `SESSION_SECRET` is unset; set a random value of at least 32 characters to keep sessions across restarts. In PowerShell, generate one with:

   ```powershell
   $bytes = New-Object byte[] 48
   $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
   $rng.GetBytes($bytes)
   [Convert]::ToBase64String($bytes)
   ```

   Production requires an explicit `SESSION_SECRET`.

3. Start the API and frontend:

   ```sh
   npm run dev
   ```

4. Open the Vite URL shown in the terminal (usually `http://localhost:5173`), then create an account or sign in.

Accounts use hashed passwords and MongoDB-backed sessions. Each account can only view and manage its own expenses. The API listens on port `5000` by default. `GET /api/health` reports API and database connection status. Authentication routes are under `/api/auth`; expenses are available through `GET` and `POST /api/expenses`, `PATCH /api/expenses/:id`, and `DELETE /api/expenses/:id`.

## Production build

Run `npm run build` to generate the frontend in `dist/`. Start the API with `npm start`. Configure your web server to serve the generated frontend and proxy `/api` requests to the API server.
