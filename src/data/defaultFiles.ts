import { VirtualFile } from "../types";

export const defaultFiles: VirtualFile[] = [
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
  },
  {
    path: "frontend/index.html",
    name: "index.html",
    language: "html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Corven DApp Frontend</title>
  <link rel="stylesheet" href="./style.css" />
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">LIVE FRONTEND</div>
      <h1>CKB Contract Web Client</h1>
      <p>Interactive frontend application connected to your local CKB Devnet node & Fiber services.</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="label">Devnet Status</span>
        <span class="value online">Online (24ms)</span>
      </div>
      <div class="stat-card">
        <span class="label">Local Balance</span>
        <span class="value" id="wallet-balance">2,500.00 CKB</span>
      </div>
    </div>

    <div class="action-box">
      <button id="btn-interact" class="btn primary">Call hello-world Contract</button>
      <button id="btn-faucet" class="btn secondary">Claim 500 CKB Faucet</button>
    </div>

    <div class="terminal-log" id="console-output">
      [00:00:00] Frontend loaded. Ready to interact with CKB contracts.
    </div>
  </div>

  <script src="./app.js"></script>
</body>
</html>`
  },
  {
    path: "frontend/style.css",
    name: "style.css",
    language: "css",
    content: `body {
  margin: 0;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #101419;
  color: #e0e2ea;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  box-sizing: border-box;
}

.card {
  max-width: 580px;
  width: 100%;
  background: #1c2025;
  border: 1px solid #3c4a42;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  background: rgba(78, 222, 163, 0.1);
  border: 1px solid rgba(78, 222, 163, 0.3);
  color: #4edea3;
  font-family: monospace;
  font-size: 0.75rem;
  font-weight: bold;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

h1 {
  margin: 0 0 0.5rem;
  font-size: 1.4rem;
  color: #e0e2ea;
}

p {
  margin: 0 0 1.5rem;
  font-size: 0.85rem;
  color: #bbcabf;
  line-height: 1.5;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: #181c21;
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid #31353b;
}

.stat-card .label {
  display: block;
  font-size: 0.75rem;
  color: #86948a;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  font-family: monospace;
}

.stat-card .value {
  font-size: 1.1rem;
  font-weight: bold;
  font-family: monospace;
  color: #4cd7f6;
}

.stat-card .value.online {
  color: #4edea3;
}

.action-box {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
}

.btn:hover {
  opacity: 0.9;
}

.btn.primary {
  background: #4edea3;
  color: #003824;
}

.btn.secondary {
  background: #262a30;
  color: #e0e2ea;
  border: 1px solid #3c4a42;
}

.terminal-log {
  background: #0a0e13;
  border: 1px solid #31353b;
  border-radius: 8px;
  padding: 0.85rem;
  font-family: monospace;
  font-size: 0.75rem;
  color: #bbcabf;
  line-height: 1.6;
  max-height: 120px;
  overflow-y: auto;
}`
  },
  {
    path: "frontend/app.js",
    name: "app.js",
    language: "javascript",
    content: `// Corven Frontend Client
let currentBalance = 2500;

function logMessage(msg) {
  const time = new Date().toLocaleTimeString();
  const output = document.getElementById("console-output");
  if (output) {
    output.innerText += \`\\n[\${time}] \${msg}\`;
    output.scrollTop = output.scrollHeight;
  }
  console.log(msg);
}

document.getElementById("btn-interact")?.addEventListener("click", () => {
  logMessage("Calling smart contract via CKB RPC...");
  setTimeout(() => {
    logMessage("Tx verification passed! Cycles consumed: 8,420.");
  }, 400);
});

document.getElementById("btn-faucet")?.addEventListener("click", () => {
  currentBalance += 500;
  const balanceEl = document.getElementById("wallet-balance");
  if (balanceEl) balanceEl.innerText = \`\${currentBalance.toLocaleString()}.00 CKB\`;
  logMessage("Claimed 500 CKB from local Devnet faucet.");
});`
  }
];
