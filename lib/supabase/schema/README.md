# Supabase Schema Setup

This directory contains the SQL files needed to set up the database schema for SoundReal. The files should be executed in the following order:

1. `01-tables.sql` - Creates the main tables
2. `02-indexes.sql` - Sets up performance indexes
3. `03-policies.sql` - Configures Row Level Security policies
4. `04-functions.sql` - Creates utility functions
5. `05-migrations.sql` - Tracks applied migrations

## How to Apply

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Execute each file in order
4. Verify the tables and policies are created correctly
5. Run the migrations file to track applied changes

## Schema Overview

### Tables

1. **transformations**
   - Stores text transformation history
   - Links to user accounts
   - Tracks AI scores and metadata

2. **usage_tracking**
   - Monitors user usage limits
   - Tracks daily and total usage
   - Handles usage reset dates

3. **schema_migrations**
   - Tracks applied database changes
   - Records migration timestamps
   - Ensures change history

### Security

- Row Level Security enabled
- User-specific access policies
- Secure function definitions

### Performance

- Indexed on frequently queried columns
- Optimized for common operations
- Efficient usage tracking

## Making Changes

When making changes to the database schema:

1. Create a new SQL file with the next sequential number
2. Document the changes in the file
3. Test the changes in a development environment
4. Apply the changes in production
5. Update the migrations table

## Best Practices

1. **Version Control**
   - Keep all schema changes in version control
   - Use meaningful commit messages
   - Document major changes

2. **Testing**
   - Test changes in development first
   - Verify data integrity
   - Check performance impact

3. **Backup**
   - Take database backups before major changes
   - Keep backup copies for reference
   - Document backup procedures 