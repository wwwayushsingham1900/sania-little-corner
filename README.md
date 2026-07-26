# Sania Tracker

A full-stack web application designed for the interactive "for Sania" page. It tracks user interactions in real-time, stores them in a Postgres database, and provides a protected admin dashboard.

## Features

- **Robust Tracking**: Tracks page events, button clicks, slider interactions, book reading progress, autosaves textarea thoughts, and good things lists.
- **Debounced Logging**: Text autosaves and slider changes are properly debounced.
- **Protected Dashboard**: An admin dashboard protected by a token to view, filter, and export the logged events (JSON/CSV).
- **Vercel Ready**: Pre-configured with `vercel.json` and Postgres to deploy completely for free.

## Setup & Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and configure `ADMIN_TOKEN` and your Postgres `DATABASE_URL`.

3. Start the server locally:
   ```bash
   npm start
   ```

## Deploying to Vercel (Free)

1. **Create a Database**: Go to [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com) and create a free Postgres database. Copy the connection string.
2. **Push to GitHub**: Push this repository to a GitHub account.
3. **Deploy**: Go to [Vercel.com](https://vercel.com), import the GitHub repository.
4. **Environment Variables**: During the Vercel setup, add two environment variables:
   - `ADMIN_TOKEN`: Your secret password for the dashboard.
   - `DATABASE_URL`: The Postgres connection string from Step 1.
5. Click **Deploy**. Vercel will automatically run the API and serve the frontend!

## Usage

- **Frontend**: Access the interactive page at the root URL (e.g. `http://localhost:3000` or your Vercel URL).
- **Admin Dashboard**: Access the tracking dashboard at `/admin`. You will be prompted to enter the `ADMIN_TOKEN`.
