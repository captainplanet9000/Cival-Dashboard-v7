# Trading Farm Supabase Integration

This directory contains the Supabase migrations and configuration for the Trading Farm dashboard.

## Database Schema

The database schema includes the following tables:

- `file_uploads`: Stores metadata for all uploaded files
- `agent_permissions`: Defines permissions and capabilities for trading agents
- `file_access_permissions`: Controls which agents can access which files

## Running Migrations

To apply the migrations to your Supabase project, follow these steps:

1. Install the Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Login to your Supabase account:
   ```bash
   npx supabase login
   ```

3. Apply the migrations:
   ```bash
   npx supabase migration up
   ```

4. Generate TypeScript types after applying migrations:
   ```bash
   npx supabase gen types typescript --local > src/types/database.types.ts
   ```

## Security

The database uses Row Level Security (RLS) policies to ensure that:

- Users can only access their own files
- Only authenticated users can view agent permissions
- Only admin users can modify agent permissions
- Users can only grant/revoke file access for their own uploads

## Storage

The migration creates a storage bucket called `file_uploads` for storing user files. 
Storage policies ensure that users can only access their own files.