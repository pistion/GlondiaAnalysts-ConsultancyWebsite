import sqlite3 from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Deploy-safe storage paths
const runtimeDataRoot = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : __dirname;
const dbPath = process.env.SQLITE_PATH
  ? path.resolve(process.env.SQLITE_PATH)
  : path.join(runtimeDataRoot, "website_data.sqlite");
const dataDirPath = process.env.ARTICLE_DATA_DIR
  ? path.resolve(process.env.ARTICLE_DATA_DIR)
  : path.join(runtimeDataRoot, "data");
const articleCommentsPath = process.env.ARTICLE_COMMENTS_PATH
  ? path.resolve(process.env.ARTICLE_COMMENTS_PATH)
  : path.join(dataDirPath, "article-comments.json");

function ensureDirectory(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

function ensureDataDir() {
  ensureDirectory(dataDirPath);
}

function ensureDbDir() {
  ensureDirectory(path.dirname(dbPath));
}

// Ensure database file exists
ensureDbDir();
if (!fs.existsSync(dbPath)) {
  console.log("📁 Creating new SQLite database at:", dbPath);
  fs.writeFileSync(dbPath, "");
}

// Initialize database
let db;
try {
  db = new sqlite3(dbPath);
  console.log(`✅ Connected to SQLite database at ${dbPath}`);
} catch (err) {
  console.error("❌ Failed to connect to SQLite DB:", err.message);
  process.exit(1);
}

// Create tables if missing
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    message TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS service_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT,
    businessName TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    serviceRequest TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT,
    email TEXT,
    position TEXT,
    resume_path TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS article_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_slug TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS article_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_slug TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    reaction TEXT NOT NULL CHECK (reaction IN ('up', 'down')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(article_slug, ip_address)
  );

  CREATE TABLE IF NOT EXISTS article_share_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_slug TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    network TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(article_slug, ip_address, network)
  );

  CREATE INDEX IF NOT EXISTS idx_article_comments_slug_created
    ON article_comments(article_slug, created_at DESC, id DESC);

  CREATE INDEX IF NOT EXISTS idx_article_reactions_slug
    ON article_reactions(article_slug);

  CREATE INDEX IF NOT EXISTS idx_article_share_actions_slug
    ON article_share_actions(article_slug);

  CREATE TABLE IF NOT EXISTS article_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_slug TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(article_slug, ip_address)
  );

  CREATE INDEX IF NOT EXISTS idx_article_views_slug
    ON article_views(article_slug);
`);

console.log("✅ Tables verified/created successfully.");

function writeArticleCommentsStore(store) {
  ensureDataDir();
  fs.writeFileSync(articleCommentsPath, JSON.stringify(store, null, 2));
}

function ensureArticleCommentsStore() {
  ensureDataDir();

  if (fs.existsSync(articleCommentsPath)) {
    return;
  }

  writeArticleCommentsStore({
    nextId: 1,
    comments: [],
  });
}

function readArticleCommentsStore() {
  ensureArticleCommentsStore();

  try {
    const raw = fs.readFileSync(articleCommentsPath, "utf8");
    const parsed = JSON.parse(raw);
    const comments = Array.isArray(parsed?.comments) ? parsed.comments : [];
    const nextId = Number.isInteger(parsed?.nextId) && parsed.nextId > 0
      ? parsed.nextId
      : (comments.reduce((maxId, comment) => Math.max(maxId, Number(comment.id) || 0), 0) + 1);

    return {
      nextId,
      comments: comments.map(comment => ({
        id: Number(comment.id) || 0,
        articleSlug: typeof comment.articleSlug === "string" ? comment.articleSlug : "",
        name: typeof comment.name === "string" ? comment.name : "",
        email: typeof comment.email === "string" ? comment.email : "",
        message: typeof comment.message === "string" ? comment.message : "",
        ipAddress: typeof comment.ipAddress === "string" ? comment.ipAddress : "",
        createdAt: typeof comment.createdAt === "string" ? comment.createdAt : "",
        updatedAt: typeof comment.updatedAt === "string" ? comment.updatedAt : "",
      })),
    };
  } catch (error) {
    const fallbackStore = {
      nextId: 1,
      comments: [],
    };

    writeArticleCommentsStore(fallbackStore);
    return fallbackStore;
  }
}

function sortArticleComments(comments) {
  return [...comments].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime() || 0;
    const rightTime = new Date(right.createdAt).getTime() || 0;

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return (Number(right.id) || 0) - (Number(left.id) || 0);
  });
}

ensureArticleCommentsStore();

// Export helpers
export const dbOps = {
  // Contact messages
  saveMessage: (name, email, message) => {
    return db.prepare("INSERT INTO messages (name, email, message) VALUES (?, ?, ?)").run(name, email, message);
  },
  getMessages: () => {
    return db.prepare("SELECT * FROM messages ORDER BY id DESC").all();
  },

  // Service applications
  saveServiceApplication: (data) => {
    const { fullName, businessName, address, phone, email, serviceRequest } = data;
    return db.prepare(
      "INSERT INTO service_applications (fullName, businessName, address, phone, email, serviceRequest) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(fullName, businessName, address, phone, email, serviceRequest);
  },
  getServiceApplications: () => {
    return db.prepare("SELECT * FROM service_applications ORDER BY id DESC").all();
  },

  // Job applications
  saveJobApplication: (full_name, email, position, resume_path = null) => {
    return db.prepare(
      "INSERT INTO applications (full_name, email, position, resume_path) VALUES (?, ?, ?, ?)"
    ).run(full_name, email, position, resume_path);
  },
  getJobApplications: () => {
    return db.prepare("SELECT * FROM applications ORDER BY id DESC").all();
  },

  // Article comments
  getArticleComments: (articleSlug) => {
    const store = readArticleCommentsStore();
    return sortArticleComments(
      store.comments.filter(comment => comment.articleSlug === articleSlug)
    );
  },
  getArticleCommentById: (articleSlug, commentId) => {
    const store = readArticleCommentsStore();
    return store.comments.find(comment => (
      comment.articleSlug === articleSlug &&
      Number(comment.id) === Number(commentId)
    )) || null;
  },
  createArticleComment: (articleSlug, name, email, message, ipAddress) => {
    const store = readArticleCommentsStore();
    const timestamp = new Date().toISOString();
    const comment = {
      id: store.nextId,
      articleSlug,
      name,
      email,
      message,
      ipAddress,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    store.comments.push(comment);
    store.nextId += 1;
    writeArticleCommentsStore(store);
    return comment;
  },
  updateArticleComment: (articleSlug, commentId, name, email, message) => {
    const store = readArticleCommentsStore();
    const index = store.comments.findIndex(comment => (
      comment.articleSlug === articleSlug &&
      Number(comment.id) === Number(commentId)
    ));

    if (index === -1) return null;

    store.comments[index] = {
      ...store.comments[index],
      name,
      email,
      message,
      updatedAt: new Date().toISOString(),
    };

    writeArticleCommentsStore(store);
    return store.comments[index];
  },
  deleteArticleComment: (articleSlug, commentId) => {
    const store = readArticleCommentsStore();
    const before = store.comments.length;
    store.comments = store.comments.filter(comment => !(
      comment.articleSlug === articleSlug &&
      Number(comment.id) === Number(commentId)
    ));

    writeArticleCommentsStore(store);
    return { changes: before - store.comments.length };
  },

  // Article reactions
  getArticleReactionForIp: (articleSlug, ipAddress) => {
    const row = db.prepare(`
      SELECT reaction
      FROM article_reactions
      WHERE article_slug = ? AND ip_address = ?
    `).get(articleSlug, ipAddress);

    return row?.reaction || "";
  },
  setArticleReaction: (articleSlug, ipAddress, reaction) => {
    const existing = db.prepare(`
      SELECT id, reaction
      FROM article_reactions
      WHERE article_slug = ? AND ip_address = ?
    `).get(articleSlug, ipAddress);

    if (existing?.reaction === reaction) {
      db.prepare(`
        DELETE FROM article_reactions
        WHERE article_slug = ? AND ip_address = ?
      `).run(articleSlug, ipAddress);
      return "";
    }

    if (existing) {
      db.prepare(`
        UPDATE article_reactions
        SET reaction = ?, updated_at = CURRENT_TIMESTAMP
        WHERE article_slug = ? AND ip_address = ?
      `).run(reaction, articleSlug, ipAddress);
      return reaction;
    }

    db.prepare(`
      INSERT INTO article_reactions (article_slug, ip_address, reaction)
      VALUES (?, ?, ?)
    `).run(articleSlug, ipAddress, reaction);
    return reaction;
  },
  getArticleReactionCounts: (articleSlug) => {
    const rows = db.prepare(`
      SELECT reaction, COUNT(*) AS count
      FROM article_reactions
      WHERE article_slug = ?
      GROUP BY reaction
    `).all(articleSlug);

    const counts = { up: 0, down: 0 };
    rows.forEach(row => {
      if (row.reaction === "up" || row.reaction === "down") {
        counts[row.reaction] = Number(row.count) || 0;
      }
    });

    return counts;
  },

  // Article shares
  trackArticleShare: (articleSlug, ipAddress, network) => {
    return db.prepare(`
      INSERT OR IGNORE INTO article_share_actions (article_slug, ip_address, network)
      VALUES (?, ?, ?)
    `).run(articleSlug, ipAddress, network);
  },
  getArticleShareCount: (articleSlug) => {
    const row = db.prepare(`
      SELECT COUNT(*) AS count
      FROM article_share_actions
      WHERE article_slug = ?
    `).get(articleSlug);

    return Number(row?.count) || 0;
  },

  // Article views
  trackArticleView: (articleSlug, ipAddress) => {
    return db.prepare(`
      INSERT OR IGNORE INTO article_views (article_slug, ip_address)
      VALUES (?, ?)
    `).run(articleSlug, ipAddress);
  },
  getArticleUniqueViewCount: (articleSlug) => {
    const row = db.prepare(`
      SELECT COUNT(*) AS count
      FROM article_views
      WHERE article_slug = ?
    `).get(articleSlug);

    return Number(row?.count) || 0;
  }
};

export default db;
