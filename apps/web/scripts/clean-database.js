#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy_db";

async function cleanDatabase() {
  console.log('🧹 Starting database cleanup...');
  
  let client;
  
  try {
    // Create connection
    client = postgres(databaseUrl);
    const db = drizzle(client);

    console.log('📋 Dropping all tables...');
    
    // Drop all tables in the public schema
    await client`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `;

    console.log('🗂️ Dropping drizzle schema...');
    
    // Drop drizzle schema
    await client`DROP SCHEMA IF EXISTS drizzle CASCADE`;

    console.log('✅ Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

cleanDatabase();
