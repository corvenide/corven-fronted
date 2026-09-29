import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Default Virtual Files
const initialFiles = [
  {
    path: "cmd/main.go",
    name: "main.go",
    language: "go",
    content: `package main

import (
    "log"
    "os"
    "fiber-app/internal/api"
    "fiber-app/pkg/db"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/logger"
    "github.com/gofiber/fiber/v2/middleware/cors"
)

func main() {
    // Initialize Database
    database := db.InitDB()
    defer database.Close()

    app := fiber.New(fiber.Config{
        AppName: "FiberDev Microservice v1.2",
    })

    // Middleware
    app.Use(logger.New())
    app.Use(cors.New())

    // Base route
    app.Get("/", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{
            "status": "online",
            "message": "Welcome to FiberDev high-performance blockchain node api",
            "version": "1.2.0",
        })
    })

    // API Routes Group
    v1 := app.Group("/api/v1")
    
    // Posts routes
    v1.Post("/posts", api.CreatePost)
    v1.Get("/posts", api.GetPosts)
    v1.Get("/posts/:id", api.GetPostByID)

    // User routes
    v1.Post("/users", api.CreateUser)
    v1.Get("/users/:id", api.GetUserByID)

    // Run Server
    port := os.Getenv("PORT")
    if port == "" {
        port = "3000"
    }

    log.Printf("Starting Fiber server on port %s", port)
    if err := app.Listen(":" + port); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}`
  },
  {
    path: "internal/api/post.go",
    name: "post.go",
    language: "go",
    content: `package api

import (
    "net/http"
    "strconv"
    "fiber-app/internal/models"
    "fiber-app/pkg/db"

    "github.com/gofiber/fiber/v2"
)

// CreatePost handles POST /api/v1/posts
func CreatePost(c *fiber.Ctx) error {
    post := new(models.Post)

    // Parse request body
    if err := c.BodyParser(post); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Cannot parse JSON payload",
        })
    }

    // Simple validation
    if post.Title == "" || post.Content == "" {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Title and Content are required fields",
        })
    }

    // Save to simulated database
    db.SavePost(post)

    return c.Status(fiber.StatusCreated).JSON(post)
}

// GetPosts handles GET /api/v1/posts
func GetPosts(c *fiber.Ctx) error {
    posts := db.GetAllPosts()
    return c.JSON(posts)
}

// GetPostByID handles GET /api/v1/posts/:id
func GetPostByID(c *fiber.Ctx) error {
    id, err := strconv.Atoi(c.Params("id"))
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid post ID format",
        })
    }

    post, found := db.GetPostByID(id)
    if !found {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
            "error": "Post not found in database",
        })
    }

    return c.JSON(post)
}`
  },
  {
    path: "internal/api/user.go",
    name: "user.go",
    language: "go",
    content: `package api

import (
    "fiber-app/internal/models"
    "fiber-app/pkg/db"

    "github.com/gofiber/fiber/v2"
)

// CreateUser handles POST /api/v1/users
func CreateUser(c *fiber.Ctx) error {
    user := new(models.User)

    if err := c.BodyParser(user); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Cannot parse JSON",
        })
    }

    if user.Username == "" || user.Email == "" {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Username and Email are required",
        })
    }

    db.SaveUser(user)
    return c.Status(fiber.StatusCreated).JSON(user)
}

// GetUserByID handles GET /api/v1/users/:id
func GetUserByID(c *fiber.Ctx) error {
    id := c.Params("id")
    user, found := db.GetUserByUsername(id)
    if !found {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
            "error": "User not found",
        })
    }

    return c.JSON(user)
}`
  },
  {
    path: "internal/models/post.go",
    name: "post.go",
    language: "go",
    content: `package models

import "time"

// Post represents a blog post model
type Post struct {
    ID        int       \`json:"id"\`
    Title     string    \`json:"title"\`
    Content   string    \`json:"content"\`
    AuthorID  int       \`json:"author_id"\`
    CreatedAt time.Time \`json:"created_at"\`
}`
  },
  {
    path: "internal/models/user.go",
    name: "user.go",
    language: "go",
    content: `package models

// User represents a system user model
type User struct {
    ID       int    \`json:"id"\`
    Username string \`json:"username"\`
    Email    string \`json:"email"\`
    Role     string \`json:"role"\`
}`
  },
  {
    path: "pkg/db/db.go",
    name: "db.go",
    language: "go",
    content: `package db

import (
    "log"
    "sync"
    "time"
    "fiber-app/internal/models"
)

type Database struct {
    mu    sync.RWMutex
    posts map[int]*models.Post
    users map[string]*models.User
}

var (
    instance *Database
    once     sync.Once
)

// InitDB initializes a singleton mock database
func InitDB() *Database {
    once.Do(func() {
        instance = &Database{
            posts: make(map[int]*models.Post),
            users: make(map[string]*models.User),
        }
        
        // Seed some data
        instance.posts[1] = &models.Post{
            ID:        1,
            Title:     "Building ultra high performance APIs",
            Content:   "Go and Fiber represent an exceptional combination for speed and lightweight memory foot print...",
            AuthorID:  101,
            CreatedAt: time.Now().Add(-2 * time.Hour),
        }
        
        instance.users["johndoe"] = &models.User{
            ID:       101,
            Username: "johndoe",
            Email:    "john@fiberdev.io",
            Role:     "Core Developer",
        }
        
        log.Println("Database connection established successfully")
    })
    return instance
}

func (db *Database) Close() {
    log.Println("Database connection closed cleanly")
}

func SavePost(post *models.Post) {
    instance.mu.Lock()
    defer instance.mu.Unlock()
    
    post.ID = len(instance.posts) + 1
    post.CreatedAt = time.Now()
    instance.posts[post.ID] = post
}

func GetAllPosts() []*models.Post {
    instance.mu.RLock()
    defer instance.mu.RUnlock()
    
    var list []*models.Post
    for _, p := range instance.posts {
        list = append(list, p)
    }
    return list
}

func GetPostByID(id int) (*models.Post, bool) {
    instance.mu.RLock()
    defer instance.mu.RUnlock()
    
    post, found := instance.posts[id]
    return post, found
}

func SaveUser(user *models.User) {
    instance.mu.Lock()
    defer instance.mu.Unlock()
    
    user.ID = len(instance.users) + 1
    instance.users[user.Username] = user
}

func GetUserByUsername(username string) (*models.User, bool) {
    instance.mu.RLock()
    defer instance.mu.RUnlock()
    
    user, found := instance.users[username]
    return user, found
}`
  },
  {
    path: "go.mod",
    name: "go.mod",
    language: "makefile",
    content: `module fiber-app

go 1.22

require (
	github.com/gofiber/fiber/v2 v2.52.2
	github.com/google/uuid v1.6.0
)`
  },
  {
    path: "go.sum",
    name: "go.sum",
    language: "makefile",
    content: `github.com/gofiber/fiber/v2 v2.52.2 h1:7y139H156XyC/80f7PZ6S...
github.com/google/uuid v1.6.0 h1:NI9v...`
  },
  {
    path: "README.md",
    name: "README.md",
    language: "markdown",
    content: `# FiberDev Blockchain API Service

A professional, high-performance Go microservice running on top of **Fiber v2** and custom high-speed blockchain network layers.

## Features
- **Express-level simplicity** with native Go concurrency.
- **Embedded virtual in-memory store** utilizing thread-safe maps and read-write locks (\`sync.RWMutex\`).
- **Fully containerized pipeline** ready to deploy onto FiberDev testnets or mainnets in 1 click.

## API Endpoints
- \`GET /\` - Health check & server status.
- \`POST /api/v1/posts\` - Create post.
- \`GET /api/v1/posts\` - Retrieve all posts.
- \`GET /api/v1/posts/:id\` - Find post by ID.`
  }
];

// Lazy Gemini API Client
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return geminiClient;
}

// In-Memory Virtual File System
let vfs = [...initialFiles];

// In-Memory Node Simulator State
let nodeStatus: 'Operational' | 'Restarting' | 'Resetting' | 'Synchronizing' = 'Operational';
let blockHeight = 18234012;
let uptimeSeconds = 1052542; // ~12 days
let peers = [
  { id: "fiber-node-99a1", address: "154.22.102.1", latency: 12, region: "US-West", client: "Fiber/v1.0.4" },
  { id: "ether-sentinel-22", address: "92.11.45.182", latency: 45, region: "EU-Central", client: "Geth/v1.12.0" },
  { id: "node-berlin-881", address: "201.5.12.99", latency: 102, region: "EU-West", client: "Fiber/v1.0.3" }
];

let blocks = [
  {
    number: 18234012,
    hash: "0x92fa88e723ab8b2100cbde12c8b093f18eefc8290192a9192bcf72de28394a12",
    parentHash: "0x14bd99f2eb5cf473bc4102ff93f18ea002d9c02e185cf38bce674839deff6e01",
    timestamp: new Date().toISOString(),
    txCount: 3,
    size: "14.2 KB",
    gasUsed: 124500,
    transactions: [
      "0x92f...a12c8b transferred 1.45 FIBER to 0x14b...f2e",
      "0xcc4...121 deployed FiberToken contract at 0xf5b...9e1",
      "0x77d...1bc called 'mint' on 0xf5b...9e1 (25,000,000 Token)"
    ]
  },
  {
    number: 18234011,
    hash: "0x14bd99f2eb5cf473bc4102ff93f18ea002d9c02e185cf38bce674839deff6e01",
    parentHash: "0xcc4918e9d22cc615006693000a121bfda93eef250009ac1e4dff8a7a8fbc0311",
    timestamp: new Date(Date.now() - 12000).toISOString(),
    txCount: 1,
    size: "8.4 KB",
    gasUsed: 21000,
    transactions: [
      "0x14b...f2e transferred 0.12 FIBER to 0x77d...1bc"
    ]
  },
  {
    number: 18234010,
    hash: "0xcc4918e9d22cc615006693000a121bfda93eef250009ac1e4dff8a7a8fbc0311",
    parentHash: "0x77d8811bc917af5299fa00a112cd9e8c3b4cf7f2898991bc2e89fa3c4cf7f2aa",
    timestamp: new Date(Date.now() - 24000).toISOString(),
    txCount: 2,
    size: "11.6 KB",
    gasUsed: 62000,
    transactions: [
      "0xcc4...121 transferred 50.00 FIBER to 0x88f...f23",
      "0x88f...f23 initialized staking pool for 1,000 FIBER"
    ]
  },
  {
    number: 18234009,
    hash: "0x77d8811bc917af5299fa00a112cd9e8c3b4cf7f2898991bc2e89fa3c4cf7f2aa",
    parentHash: "0x28991bc2e89fa3c4cf7f2a1b9d10e0ddccff00a112cd9e8c3b4cf7f289ab7234",
    timestamp: new Date(Date.now() - 36000).toISOString(),
    txCount: 0,
    size: "4.1 KB",
    gasUsed: 0,
    transactions: []
  }
];

let nodeLogs = [
  `[${new Date().toISOString().slice(0, 10)} 14:21:40] INFO: Initializing P2P network...`,
  `[${new Date().toISOString().slice(0, 10)} 14:21:42] INFO: Connected to beacon node at 127.0.0.1:9000`,
  `[${new Date().toISOString().slice(0, 10)} 14:21:45] WARN: Reorg detected at depth 2, resolving...`,
  `[${new Date().toISOString().slice(0, 10)} 14:21:50] SUCCESS: Canonical chain tip updated to 18,234,011`,
  `[${new Date().toISOString().slice(0, 10)} 14:21:55] INFO: Broadcasted transaction 0x12...ff0 to 24 peers`,
  `[${new Date().toISOString().slice(0, 10)} 14:22:00] INFO: Received new block #18,234,012 from peer 154.22.102.1`,
  `[${new Date().toISOString().slice(0, 10)} 14:22:02] INFO: Validating signatures for block #18,234,012`,
  `[${new Date().toISOString().slice(0, 10)} 14:22:04] SUCCESS: Canonical chain tip updated to 18,234,012`
];

let metrics = {
  cpu: 12,
  memory: "1.4GB",
  network: 42,
  bandwidth: "89 Mbps"
};

const registeredUsers = [
  { email: "john@fiberdev.io", username: "johndoe", password: "password123", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=johndoe", provider: "credentials" }
];
let currentUserSession: any = null;

// Start Server Loop
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Block generation loop in background
  setInterval(() => {
    uptimeSeconds += 4;
    if (nodeStatus === 'Operational' || nodeStatus === 'Synchronizing') {
      // 35% chance of generating a block every 4 seconds
      if (Math.random() < 0.35) {
        blockHeight++;
        const txCount = Math.floor(Math.random() * 5);
        const sizeKb = (Math.random() * 20 + 3).toFixed(1);
        const gasUsed = txCount * 21000 + Math.floor(Math.random() * 100000);
        const hash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        const parentHash = blocks[0]?.hash || "0x77d8811bc917af5299fa00a112cd9e8c3b4cf7f2898991bc2e89fa3c4cf7f2aa";

        const possibleTxs = [
          `0x${hash.slice(2, 5)}...${hash.slice(-4)} transferred ${(Math.random() * 10).toFixed(2)} FIBER`,
          `0x${hash.slice(6, 9)}...${hash.slice(-5)} updated contract state`,
          `0x${hash.slice(10, 13)}...${hash.slice(-3)} triggered event 'Transfer'`,
          `0x${hash.slice(3, 6)}...${hash.slice(-4)} called FiberToken 'mint'`
        ];

        const txs = Array.from({ length: txCount }, () => possibleTxs[Math.floor(Math.random() * possibleTxs.length)]);

        const newBlock = {
          number: blockHeight,
          hash,
          parentHash,
          timestamp: new Date().toISOString(),
          txCount,
          size: `${sizeKb} KB`,
          gasUsed,
          transactions: txs
        };

        blocks.unshift(newBlock);
        if (blocks.length > 50) blocks.pop();

        nodeLogs.push(`[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] SUCCESS: Canonical chain tip updated to ${blockHeight} (hash: ${hash.slice(0, 12)}...)`);
        if (nodeLogs.length > 200) nodeLogs.shift();
      }

      // Fluctuating Metrics
      metrics.cpu = Math.floor(Math.random() * 25) + 8; // 8% - 33%
      metrics.network = Math.floor(Math.random() * 40) + 30; // 30% - 70%
      const rawMem = (Math.random() * 0.3 + 1.3).toFixed(1);
      metrics.memory = `${rawMem}GB`;
    }
  }, 4000);

  // Health route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", nodeStatus, blockHeight });
  });

  // Authenticaton Endpoints
  app.post("/api/auth/signup", (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const exists = registeredUsers.some(u => u.email === email || u.username === username);
    if (exists) {
      return res.status(400).json({ error: "User with this email or username already exists" });
    }
    const newUser = {
      email,
      username,
      password,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
      provider: "credentials"
    };
    registeredUsers.push(newUser);
    currentUserSession = { email: newUser.email, username: newUser.username, avatar: newUser.avatar, provider: "credentials" };
    res.json({ success: true, user: currentUserSession });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = registeredUsers.find(u => u.email === email && u.password === password);
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    currentUserSession = { email: user.email, username: user.username, avatar: user.avatar, provider: user.provider };
    res.json({ success: true, user: currentUserSession });
  });

  app.post("/api/auth/logout", (req, res) => {
    currentUserSession = null;
    res.json({ success: true });
  });

  app.get("/api/auth/me", (req, res) => {
    res.json({ user: currentUserSession });
  });

  app.get("/api/auth/github/url", (req, res) => {
    if (process.env.GITHUB_CLIENT_ID) {
      const redirectUri = `${req.protocol}://${req.get('host')}/auth/callback`;
      const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: 'read:user user:email',
      });
      res.json({ url: `https://github.com/login/oauth/authorize?${params}` });
    } else {
      res.json({ url: "/api/auth/github/popup-simulator" });
    }
  });

  app.get("/api/auth/github/popup-simulator", (req, res) => {
    res.send(`
      <html>
        <head>
          <title>Sign in to GitHub · GitHub</title>
          <style>
            body {
              background-color: #0d1117;
              color: #c9d1d9;
              font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";
              font-size: 14px;
              line-height: 1.5;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
            .box {
              background-color: #161b22;
              border: 1px solid #30363d;
              border-radius: 6px;
              width: 340px;
              padding: 24px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            }
            .logo {
              text-align: center;
              margin-bottom: 24px;
            }
            .logo svg {
              fill: #f0f6fc;
            }
            h1 {
              font-size: 24px;
              font-weight: 300;
              letter-spacing: -0.5px;
              text-align: center;
              margin: 0 0 20px 0;
              color: #f0f6fc;
            }
            label {
              display: block;
              margin-bottom: 8px;
              font-weight: 400;
              color: #f0f6fc;
            }
            input[type="text"], input[type="password"] {
              width: 100%;
              padding: 5px 12px;
              font-size: 14px;
              line-height: 20px;
              color: #c9d1d9;
              background-color: #0d1117;
              border: 1px solid #30363d;
              border-radius: 6px;
              box-sizing: border-box;
              margin-bottom: 15px;
            }
            input[type="text"]:focus {
              border-color: #58a6ff;
              outline: none;
              box-shadow: 0 0 0 3px rgba(56,139,253,0.3);
            }
            .btn {
              color: #ffffff;
              background-color: #238636;
              border: 1px solid rgba(240,246,252,0.1);
              border-radius: 6px;
              padding: 5px 16px;
              font-size: 14px;
              font-weight: 500;
              line-height: 20px;
              white-space: nowrap;
              vertical-align: middle;
              cursor: pointer;
              width: 100%;
              box-sizing: border-box;
            }
            .btn:hover {
              background-color: #2ea043;
            }
            .desc {
              font-size: 11px;
              color: #8b949e;
              margin-top: 15px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="logo">
              <svg height="48" viewBox="0 0 16 16" version="1.1" width="48" aria-hidden="true"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
            </div>
            <h1>Authorize Studio App</h1>
            <form action="/auth/callback" method="GET">
              <label for="login_field">Simulated Username</label>
              <input type="text" name="username" id="login_field" value="github-coder" required />
              
              <label for="email_field">Simulated Email</label>
              <input type="text" name="email" id="email_field" value="developer@github.com" required />
              
              <button class="btn" type="submit">Authorize & Continue</button>
            </form>
            <div class="desc">
              FiberDev Studio Developer Sandbox. This is an interactive mockup of GitHub OAuth authorization.
            </div>
          </div>
        </body>
      </html>
    `);
  });

  app.get(["/auth/callback", "/auth/callback/"], (req, res) => {
    const { username, email } = req.query;

    const userNameStr = (username as string) || "github-coder";
    const emailStr = (email as string) || "coder@github.com";

    currentUserSession = {
      email: emailStr,
      username: userNameStr,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(userNameStr)}`,
      provider: "github"
    };

    if (!registeredUsers.some(u => u.email === emailStr)) {
      registeredUsers.push({
        email: emailStr,
        username: userNameStr,
        password: "oauth-password-secured",
        avatar: currentUserSession.avatar,
        provider: "github"
      });
    }

    res.send(`
      <html>
        <body style="background-color: #0d1117; color: #c9d1d9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center; border: 1px solid #30363d; padding: 2rem; border-radius: 6px; background-color: #161b22; max-width: 400px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
            <div style="font-size: 40px; margin-bottom: 1rem;">🚀</div>
            <h2 style="margin: 0 0 10px 0; color: #f0f6fc;">OAuth Connection Complete</h2>
            <p style="font-size: 13px; color: #8b949e; margin-bottom: 20px;">Successfully linked with GitHub account <strong>${userNameStr}</strong>.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: ${JSON.stringify(currentUserSession)} }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  });

  // VFS File Endpoints
  app.get("/api/files", (req, res) => {
    res.json(vfs);
  });

  app.post("/api/files", (req, res) => {
    const { path: filePath, content } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "File path required" });
    }
    const idx = vfs.findIndex(f => f.path === filePath);
    if (idx !== -1) {
      vfs[idx].content = content;
      res.json({ success: true, file: vfs[idx] });
    } else {
      // Create new file
      const name = filePath.split("/").pop() || filePath;
      const ext = name.split(".").pop() || "go";
      const newFile = { path: filePath, name, content, language: ext === 'go' ? 'go' : ext === 'md' ? 'markdown' : 'go' };
      vfs.push(newFile);
      res.json({ success: true, file: newFile });
    }
  });

  // Node State Endpoints
  app.get("/api/node", (req, res) => {
    // Format Uptime
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const mins = Math.floor((uptimeSeconds % 3600) / 60);
    const secs = uptimeSeconds % 60;
    const uptimeStr = `${days}d ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;

    res.json({
      status: nodeStatus,
      version: "v1.0.4-stable",
      uptime: uptimeStr,
      blockHeight,
      syncProgress: nodeStatus === 'Synchronizing' ? 82 : 100,
      peers,
      blocks,
      metrics,
      logs: nodeLogs
    });
  });

  // Action: Restart Node
  app.post("/api/node/restart", (req, res) => {
    nodeStatus = "Restarting";
    nodeLogs.push(`[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] INFO: Restart requested. Initiating safe node shutdown...`);

    setTimeout(() => {
      nodeStatus = "Synchronizing";
      nodeLogs.push(`[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] INFO: Loading persistent blockchain databases...`);
      uptimeSeconds = 0; // reset uptime
    }, 2000);

    setTimeout(() => {
      nodeStatus = "Operational";
      nodeLogs.push(`[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] SUCCESS: Node fully synchronized and operational at block height ${blockHeight}`);
    }, 5000);

    res.json({ success: true, status: nodeStatus });
  });

  // Action: Reset Node
  app.post("/api/node/reset", (req, res) => {
    nodeStatus = "Resetting";
    nodeLogs.push(`[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] WARN: Hard reset requested. Purging local chain database...`);

    setTimeout(() => {
      blockHeight = 0;
      uptimeSeconds = 0;
      blocks = [
        {
          number: 0,
          hash: "0xgenesis000000000000000000000000000000000000000000000000000000000",
          parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          timestamp: new Date().toISOString(),
          txCount: 0,
          size: "1.2 KB",
          gasUsed: 0,
          transactions: []
        }
      ];
      nodeStatus = "Operational";
      nodeLogs.push(`[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] SUCCESS: Local testnet genesis loaded successfully. Node running.`);
    }, 3000);

    res.json({ success: true, status: nodeStatus });
  });

  // Action: Connect Peer
  app.post("/api/node/connect-peer", (req, res) => {
    const peerNames = ["sentinel-alpha", "node-tokyo-03", "validator-pro-8", "edge-london-44", "peer-singapore-1"];
    const name = peerNames[Math.floor(Math.random() * peerNames.length)] + "-" + Math.floor(Math.random() * 1000);
    const ip = `${Math.floor(Math.random() * 220 + 20)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
    const region = ["US-East", "AP-Southeast", "EU-Central", "AP-Northeast", "SA-East"][Math.floor(Math.random() * 5)];
    const client = ["Fiber/v1.0.4", "Geth/v1.12.0", "Fiber/v1.0.3"][Math.floor(Math.random() * 3)];

    const newPeer = {
      id: name,
      address: ip,
      latency: Math.floor(Math.random() * 120 + 8),
      region,
      client
    };

    peers.push(newPeer);
    nodeLogs.push(`[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] SUCCESS: Discovered and handshaked with new peer ${name} (${ip})`);

    res.json({ success: true, peer: newPeer, peers });
  });

  // Action: Disconnect Peer
  app.post("/api/node/disconnect-peer", (req, res) => {
    const { id } = req.body;
    if (id) {
      peers = peers.filter(p => p.id !== id);
      nodeLogs.push(`[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] WARN: Disconnected P2P socket for peer: ${id}`);
    }
    res.json({ success: true, peers });
  });

  // Action: Deploy Go Workspace Build / Deploy Contract
  app.post("/api/node/deploy", (req, res) => {
    const { filename, fileContent } = req.body;
    const cleanName = filename || "main.go";

    nodeLogs.push(`[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] INFO: Compiling workspace source files...`);
    nodeLogs.push(`[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] INFO: Building Go package: fiber-app (target: linux/amd64)`);

    setTimeout(() => {
      nodeLogs.push(`[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] SUCCESS: Build successful. Output bundle: fiber-app.bin (4.85 MB)`);
      nodeLogs.push(`[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] INFO: Signing deploying transaction with default dev key 0xDevKey...`);
    }, 1500);

    setTimeout(() => {
      // Add custom transaction to node mempool & push to logs
      const txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      nodeLogs.push(`[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] SUCCESS: Contract transaction ${txHash.slice(0, 16)}... submitted to local node mempool`);

      // Inject transaction into active block immediately
      blockHeight++;
      const newBlock = {
        number: blockHeight,
        hash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        parentHash: blocks[0]?.hash || "0x77d8811bc917af5299fa00a112cd9e8c3b4cf7f2898991bc2e89fa3c4cf7f2aa",
        timestamp: new Date().toISOString(),
        txCount: 1,
        size: "6.2 KB",
        gasUsed: 420000,
        transactions: [
          `0xDevKey deployed contract from ${cleanName} (Tx: ${txHash.slice(0, 12)}...)`
        ]
      };
      blocks.unshift(newBlock);
      nodeLogs.push(`[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] SUCCESS: Block #${blockHeight} mined containing contract deploy transaction (gas: 420,000)`);
    }, 3000);

    res.json({ success: true, currentBlock: blockHeight });
  });

  // Action: Gemini AI Assistant Endpoint
  app.post("/api/ai/chat", async (req, res) => {
    const { prompt, currentFile, fileContent, mode } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    try {
      // Try to initialize Gemini API client. Handle missing key gracefully!
      let ai;
      try {
        ai = getGemini();
      } catch (err: any) {
        console.warn("Gemini client initialization failed (likely missing API key):", err.message);

        // Mock fallback responses so the app is 100% functional even without a key
        let mockReply = "";
        if (mode === "explain") {
          mockReply = `### Local Fiber Assistant (Simulated Offline Mode)

Since a Gemini API key is not currently active, I have prepared a structural explanation of your active file **${currentFile || "post.go"}**:

1. **Fiber Route Handler**: It defines the endpoint logic for Creating and Fetching Posts using Go Fiber's Context pointer (\`*fiber.Ctx\`).
2. **Body Parsing**: It utilizes \`c.BodyParser()\` to dynamically unmarshal the JSON payload into your Go models.
3. **Database Integration**: It connects to your mock storage layer, validating inputs and committing changes thread-safely via singletons.

*Configure your key in **Settings > Secrets** to enable the live full-context Gemini AI.*`;
        } else if (mode === "generate") {
          mockReply = `// Local Fiber Assistant (Simulated Offline Mode)
// Setup your GEMINI_API_KEY for dynamic real-time generation

package api

import (
    "github.com/gofiber/fiber/v2"
)

// GeneratedHandler represents a custom high-performance endpoint
func GeneratedHandler(c *fiber.Ctx) error {
    return c.Status(fiber.StatusOK).JSON(fiber.Map{
        "status":  "success",
        "message": "Handler successfully auto-generated offline",
    })
}`;
        } else {
          mockReply = `I am running in offline mode because the Gemini API key is not set. 

Please go to **Settings > Secrets** and declare a **GEMINI_API_KEY** environment variable to unlock high-fidelity AI reviews, smart contract code completions, and automated transaction troubleshooting!`;
        }
        return res.json({ response: mockReply });
      }

      // Build context and system instruction
      let systemInstruction = "You are an expert Go backend engineer and senior core blockchain compiler specialist. You write hyper-optimized, clean, safe, high-performance web APIs using the github.com/gofiber/fiber/v2 framework. Keep your replies structured, clear, professional, and focus primarily on executable code segments and direct annotations.";

      let contents = "";
      if (mode === "explain") {
        contents = `Please explain the following Go file "${currentFile || "post.go"}":\n\n\`\`\`go\n${fileContent || ""}\n\`\`\`\n\nPrompt: ${prompt}`;
      } else if (mode === "generate") {
        contents = `Generate code based on this request. The active file is "${currentFile || "post.go"}" with content:\n\n\`\`\`go\n${fileContent || ""}\n\`\`\`\n\nRequest: ${prompt}\n\nMake sure to return the Go code nicely formatted inside markdown blocks.`;
      } else {
        contents = `The user is editing a project inside FiberDev Studio. The active file is "${currentFile || "post.go"}" with content:\n\n\`\`\`go\n${fileContent || ""}\n\`\`\`\n\nUser request: ${prompt}`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ response: response.text || "No output returned from Gemini" });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error.message || "Failed to communicate with Gemini" });
    }
  });

  // Vite development vs. production static assets middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FiberDev Studio Server booted on http://localhost:${PORT}`);
  });
}

startServer();
