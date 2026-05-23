import { Client } from 'pg';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from backend folder
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

import Faq from '../backend/models/Faq.js';
import ChatLog from '../backend/models/ChatLog.js';
import ScrapedPage from '../backend/models/ScrapedPage.js';
import CrawlJob from '../backend/models/CrawlJob.js';
import User from '../backend/models/User.js';

// Configuration
const PG_CONNECTION_STRING = process.env.DATABASE_URL; // Supabase Postgres URL
const MONGODB_URI = process.env.MONGODB_URI;

async function migrateData() {
  if (!PG_CONNECTION_STRING || !MONGODB_URI) {
    console.error("Missing DATABASE_URL or MONGODB_URI in environment variables.");
    process.exit(1);
  }

  const pgClient = new Client({
    connectionString: PG_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to PostgreSQL (Supabase)...");
    await pgClient.connect();
    
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);

    // 1. Migrate Users & Profiles
    console.log("\n--- Migrating Users & Profiles ---");
    const { rows: pgUsers } = await pgClient.query(`
      SELECT u.id, u.email, p.full_name, p.branch, p.semester, p.hostel, 
             u.created_at, u.updated_at,
             COALESCE((SELECT role FROM public.user_roles r WHERE r.user_id = u.id LIMIT 1), 'student') as role
      FROM auth.users u
      LEFT JOIN public.profiles p ON u.id = p.id
    `);
    
    console.log(`Found ${pgUsers.length} users.`);
    
    // Create a mapping of Supabase UUIDs to MongoDB ObjectIDs
    const userMap = {};
    
    for (const pu of pgUsers) {
      try {
        // Since we can't migrate the actual bcrypt password hashes from Supabase's internal auth.users table easily,
        // we'll set a default dummy password. Users will need to use a "Forgot Password" or re-register.
        const dummyPassword = "ResetMe123!"; 
        
        let user = await User.findOne({ email: pu.email.toLowerCase() });
        if (!user) {
          user = new User({
            email: pu.email.toLowerCase(),
            password: dummyPassword,
            fullName: pu.full_name || pu.email.split('@')[0],
            role: pu.role,
            branch: pu.branch,
            semester: pu.semester,
            hostel: pu.hostel,
          });
          
          // Bypass pre-save hook for password to avoid re-hashing if we imported a hash, 
          // but since it's a dummy, let the pre-save hook hash it normally.
          await user.save();
        }
        
        userMap[pu.id] = user._id;
      } catch (err) {
        console.error(`Error migrating user ${pu.email}:`, err.message);
      }
    }
    console.log(`Migrated users. Note: passwords reset to "ResetMe123!".`);

    // 2. Migrate FAQs
    console.log("\n--- Migrating FAQs ---");
    const { rows: pgFaqs } = await pgClient.query("SELECT * FROM public.faqs");
    console.log(`Found ${pgFaqs.length} FAQs.`);
    
    let faqCount = 0;
    for (const pf of pgFaqs) {
      const exists = await Faq.findOne({ question: pf.question });
      if (!exists) {
        await Faq.create({
          question: pf.question,
          answer: pf.answer,
          keywords: pf.keywords || [],
          category: pf.category || 'general',
          createdBy: pf.created_by ? userMap[pf.created_by] : null,
          createdAt: pf.created_at,
          updatedAt: pf.updated_at
        });
        faqCount++;
      }
    }
    console.log(`Inserted ${faqCount} new FAQs.`);

    // 3. Migrate Chat Logs
    console.log("\n--- Migrating Chat Logs ---");
    const { rows: pgLogs } = await pgClient.query("SELECT * FROM public.chat_logs");
    console.log(`Found ${pgLogs.length} chat logs.`);
    
    let logCount = 0;
    for (const pl of pgLogs) {
      const userId = userMap[pl.user_id];
      if (userId) {
        await ChatLog.create({
          userId: userId,
          question: pl.question,
          answer: pl.answer,
          source: pl.source || 'ai',
          createdAt: pl.created_at
        });
        logCount++;
      }
    }
    console.log(`Inserted ${logCount} chat logs.`);

    // 4. Migrate Scraped Pages
    console.log("\n--- Migrating Scraped Pages ---");
    // Fetch embeddings as array representation using pgvector function or text cast
    const { rows: pgPages } = await pgClient.query(`
      SELECT id, url, title, description, markdown, content_hash, 
             embedding::text as embedding_str, token_count, scraped_at, updated_at 
      FROM public.scraped_pages
    `);
    console.log(`Found ${pgPages.length} scraped pages.`);
    
    let pageCount = 0;
    for (const pp of pgPages) {
      const exists = await ScrapedPage.findOne({ url: pp.url });
      if (!exists) {
        // Parse the pgvector string format "[0.1, 0.2, ...]" into a JS array
        let embeddingArray = null;
        if (pp.embedding_str) {
          try {
            embeddingArray = JSON.parse(pp.embedding_str);
          } catch (e) {
            console.error(`Failed to parse embedding for URL ${pp.url}`);
          }
        }

        await ScrapedPage.create({
          url: pp.url,
          title: pp.title,
          description: pp.description,
          markdown: pp.markdown,
          contentHash: pp.content_hash,
          embedding: embeddingArray,
          tokenCount: pp.token_count,
          scrapedAt: pp.scraped_at
        });
        pageCount++;
      }
    }
    console.log(`Inserted ${pageCount} scraped pages.`);

    // 5. Migrate Crawl Jobs
    console.log("\n--- Migrating Crawl Jobs ---");
    const { rows: pgJobs } = await pgClient.query("SELECT * FROM public.crawl_jobs");
    console.log(`Found ${pgJobs.length} crawl jobs.`);
    
    let jobCount = 0;
    for (const pj of pgJobs) {
      const exists = await CrawlJob.findOne({ firecrawlJobId: pj.firecrawl_job_id });
      if (!exists) {
        await CrawlJob.create({
          firecrawlJobId: pj.firecrawl_job_id,
          sourceUrl: pj.source_url,
          status: pj.status,
          pagesDiscovered: pj.pages_discovered,
          pagesScraped: pj.pages_scraped,
          pagesEmbedded: pj.pages_embedded,
          faqsGenerated: pj.faqs_generated,
          nextCursor: pj.next_cursor,
          error: pj.error,
          startedBy: pj.started_by ? userMap[pj.started_by] : null,
          startedAt: pj.started_at
        });
        jobCount++;
      }
    }
    console.log(`Inserted ${jobCount} crawl jobs.`);

    console.log("\n✅ Migration completed successfully!");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await pgClient.end();
    await mongoose.disconnect();
  }
}

migrateData();
