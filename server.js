import express from "express";
import path from "path";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import { BlobServiceClient } from "@azure/storage-blob";
import { CosmosClient } from "@azure/cosmos";

const app = express();
const port = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "10mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

// Azure Blob Storage settings
const storageConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const storageContainerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "photos";

// Cosmos DB settings
const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
const cosmosKey = process.env.COSMOS_KEY;
const cosmosDatabaseName = process.env.COSMOS_DATABASE_NAME || "photoshare";
const cosmosContainerName = process.env.COSMOS_CONTAINER_NAME || "images";
const cosmosUsersContainerName = process.env.COSMOS_USERS_CONTAINER_NAME || "users";

// Auth settings
const jwtSecret = process.env.JWT_SECRET || "local-dev-secret";
const creatorEmail = process.env.CREATOR_EMAIL || "creator@photoshare.com";
const creatorPassword = process.env.CREATOR_PASSWORD || "Creator123!";

let blobContainerClient = null;
let cosmosContainer = null;
let usersContainer = null;

if (storageConnectionString) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
  blobContainerClient = blobServiceClient.getContainerClient(storageContainerName);
}

if (cosmosEndpoint && cosmosKey) {
  const cosmosClient = new CosmosClient({
    endpoint: cosmosEndpoint,
    key: cosmosKey
  });

  const database = cosmosClient.database(cosmosDatabaseName);

  cosmosContainer = database.container(cosmosContainerName);
  usersContainer = database.container(cosmosUsersContainerName);
}

function createToken(user) {
  return jwt.sign(
    {
      email: user.email,
      name: user.name,
      role: user.role
    },
    jwtSecret,
    { expiresIn: "2h" }
  );
}

function getAuthUser(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  const token = header.replace("Bearer ", "");

  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getAuthUser(req);

  if (!user) {
    return res.status(401).json({
      error: "You must log in first."
    });
  }

  req.user = user;
  next();
}

function requireCreator(req, res, next) {
  const user = getAuthUser(req);

  if (!user) {
    return res.status(401).json({
      error: "You must log in first."
    });
  }

  if (user.role !== "creator") {
    return res.status(403).json({
      error: "Only creator users can upload or manage photos."
    });
  }

  req.user = user;
  next();
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "running",
    project: "CW2 PhotoShare Azure App",
    blobStorageConnected: Boolean(blobContainerClient),
    cosmosConnected: Boolean(cosmosContainer),
    usersContainerConnected: Boolean(usersContainer)
  });
});

// -------------------------
// AUTH ROUTES
// -------------------------

app.post("/api/auth/register", async (req, res) => {
  try {
    if (!usersContainer) {
      return res.status(500).json({
        error: "Users database is not configured."
      });
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Name, email, and password are required."
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (cleanEmail === creatorEmail.toLowerCase()) {
      return res.status(400).json({
        error: "This email is reserved for the creator account."
      });
    }

    const { resources } = await usersContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.email = @email",
        parameters: [{ name: "@email", value: cleanEmail }]
      })
      .fetchAll();

    if (resources.length > 0) {
      return res.status(400).json({
        error: "A user with this email already exists."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userDocument = {
      id: cleanEmail,
      email: cleanEmail,
      name,
      passwordHash,
      role: "consumer",
      createdAt: new Date().toISOString()
    };

    await usersContainer.items.create(userDocument);

    const safeUser = {
      email: userDocument.email,
      name: userDocument.name,
      role: userDocument.role
    };

    res.status(201).json({
      token: createToken(safeUser),
      user: safeUser
    });
  } catch (error) {
    res.status(500).json({
      error: "Registration failed.",
      details: error.message
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required."
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Creator account is controlled by App Service environment variables.
    if (
      cleanEmail === creatorEmail.toLowerCase() &&
      password === creatorPassword
    ) {
      const creatorUser = {
        email: creatorEmail,
        name: "creator_demo",
        role: "creator"
      };

      return res.json({
        token: createToken(creatorUser),
        user: creatorUser
      });
    }

    if (!usersContainer) {
      return res.status(500).json({
        error: "Users database is not configured."
      });
    }

    const { resources } = await usersContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.email = @email",
        parameters: [{ name: "@email", value: cleanEmail }]
      })
      .fetchAll();

    if (!resources.length) {
      return res.status(401).json({
        error: "Invalid email or password."
      });
    }

    const userDocument = resources[0];
    const passwordMatches = await bcrypt.compare(password, userDocument.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        error: "Invalid email or password."
      });
    }

    const safeUser = {
      email: userDocument.email,
      name: userDocument.name,
      role: userDocument.role
    };

    res.json({
      token: createToken(safeUser),
      user: safeUser
    });
  } catch (error) {
    res.status(500).json({
      error: "Login failed.",
      details: error.message
    });
  }
});

app.get("/api/auth/me", (req, res) => {
  const user = getAuthUser(req);

  if (!user) {
    return res.json({
      loggedIn: false
    });
  }

  res.json({
    loggedIn: true,
    user
  });
});

// -------------------------
// IMAGE ROUTES
// -------------------------

app.get("/api/images", async (req, res) => {
  try {
    if (!cosmosContainer) {
      return res.status(500).json({
        error: "Cosmos DB is not configured."
      });
    }

    const search = (req.query.search || "").toLowerCase();

    const { resources } = await cosmosContainer.items
      .query("SELECT * FROM c ORDER BY c.createdAt DESC")
      .fetchAll();

    const results = resources.filter((image) => {
      const searchableText = [
        image.title,
        image.caption,
        image.location,
        ...(image.peoplePresent || []),
        ...(image.tags || [])
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({
      error: "Failed to load images.",
      details: error.message
    });
  }
});

app.get("/api/images/:id", async (req, res) => {
  try {
    if (!cosmosContainer) {
      return res.status(500).json({
        error: "Cosmos DB is not configured."
      });
    }

    const { resources } = await cosmosContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: req.params.id }]
      })
      .fetchAll();

    if (!resources.length) {
      return res.status(404).json({
        error: "Image not found."
      });
    }

    res.json(resources[0]);
  } catch (error) {
    res.status(500).json({
      error: "Failed to load image.",
      details: error.message
    });
  }
});

app.get("/api/images/:id/file", async (req, res) => {
  try {
    if (!cosmosContainer || !blobContainerClient) {
      return res.status(500).json({
        error: "Storage or Cosmos DB is not configured."
      });
    }

    const { resources } = await cosmosContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: req.params.id }]
      })
      .fetchAll();

    if (!resources.length) {
      return res.status(404).json({
        error: "Image not found."
      });
    }

    const image = resources[0];
    const blobClient = blobContainerClient.getBlockBlobClient(image.blobName);
    const downloadResponse = await blobClient.download();

    res.setHeader("Content-Type", image.contentType || "image/jpeg");
    downloadResponse.readableStreamBody.pipe(res);
  } catch (error) {
    res.status(500).json({
      error: "Failed to load image file.",
      details: error.message
    });
  }
});

// Creator-only upload.
app.post("/api/images", requireCreator, upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Photo file is required."
      });
    }

    if (!cosmosContainer || !blobContainerClient) {
      return res.status(500).json({
        error: "Storage or Cosmos DB is not configured."
      });
    }

    const id = Date.now().toString();
    const safeOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blobName = `${id}-${safeOriginalName}`;

    const blobClient = blobContainerClient.getBlockBlobClient(blobName);

    await blobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: {
        blobContentType: req.file.mimetype
      }
    });

    const peoplePresent = req.body.peoplePresent
      ? req.body.peoplePresent
          .split(",")
          .map((person) => person.trim())
          .filter(Boolean)
      : [];

    const imageDocument = {
      id,
      creatorId: req.user.email,
      creatorName: req.user.name,
      title: req.body.title,
      caption: req.body.caption,
      location: req.body.location,
      peoplePresent,
      blobName,
      contentType: req.file.mimetype,
      imageUrl: `/api/images/${id}/file`,
      comments: [],
      ratings: [],
      tags: ["creator-upload", "azure-storage"],
      createdAt: new Date().toISOString()
    };

    await cosmosContainer.items.create(imageDocument);

    res.status(201).json(imageDocument);
  } catch (error) {
    res.status(500).json({
      error: "Failed to upload image.",
      details: error.message
    });
  }
});

// Creator-only metadata update.
app.put("/api/images/:id", requireCreator, async (req, res) => {
  try {
    const { resources } = await cosmosContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: req.params.id }]
      })
      .fetchAll();

    if (!resources.length) {
      return res.status(404).json({
        error: "Image not found."
      });
    }

    const image = resources[0];

    image.title = req.body.title ?? image.title;
    image.caption = req.body.caption ?? image.caption;
    image.location = req.body.location ?? image.location;

    if (typeof req.body.peoplePresent === "string") {
      image.peoplePresent = req.body.peoplePresent
        .split(",")
        .map((person) => person.trim())
        .filter(Boolean);
    }

    image.updatedAt = new Date().toISOString();

    await cosmosContainer.item(image.id, image.creatorId).replace(image);

    res.json(image);
  } catch (error) {
    res.status(500).json({
      error: "Failed to update image.",
      details: error.message
    });
  }
});

// Creator-only delete.
app.delete("/api/images/:id", requireCreator, async (req, res) => {
  try {
    const { resources } = await cosmosContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: req.params.id }]
      })
      .fetchAll();

    if (!resources.length) {
      return res.status(404).json({
        error: "Image not found."
      });
    }

    const image = resources[0];

    if (blobContainerClient && image.blobName) {
      const blobClient = blobContainerClient.getBlockBlobClient(image.blobName);
      await blobClient.deleteIfExists();
    }

    await cosmosContainer.item(image.id, image.creatorId).delete();

    res.json({
      message: "Image deleted successfully."
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete image.",
      details: error.message
    });
  }
});

// Logged-in users can comment.
app.post("/api/images/:id/comments", requireAuth, async (req, res) => {
  try {
    const { resources } = await cosmosContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: req.params.id }]
      })
      .fetchAll();

    if (!resources.length) {
      return res.status(404).json({
        error: "Image not found."
      });
    }

    const image = resources[0];

    image.comments = image.comments || [];
    image.comments.push({
      user: req.user.name || req.user.email,
      email: req.user.email,
      text: req.body.text,
      createdAt: new Date().toISOString()
    });

    await cosmosContainer.item(image.id, image.creatorId).replace(image);

    res.status(201).json(image);
  } catch (error) {
    res.status(500).json({
      error: "Failed to add comment.",
      details: error.message
    });
  }
});

// Logged-in users can rate.
app.post("/api/images/:id/ratings", requireAuth, async (req, res) => {
  try {
    const rating = Number(req.body.rating);

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: "Rating must be between 1 and 5."
      });
    }

    const { resources } = await cosmosContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: req.params.id }]
      })
      .fetchAll();

    if (!resources.length) {
      return res.status(404).json({
        error: "Image not found."
      });
    }

    const image = resources[0];

    image.ratings = image.ratings || [];
    image.ratings.push({
      user: req.user.email,
      value: rating,
      createdAt: new Date().toISOString()
    });

    await cosmosContainer.item(image.id, image.creatorId).replace(image);

    res.status(201).json(image);
  } catch (error) {
    res.status(500).json({
      error: "Failed to add rating.",
      details: error.message
    });
  }
});

// Serve React frontend.
const distPath = path.join(__dirname, "dist");

app.use(express.static(distPath));

app.use((req, res) => {
  if (req.method === "GET") {
    res.sendFile(path.join(distPath, "index.html"));
  } else {
    res.status(404).json({
      error: "Not found"
    });
  }
});

app.listen(port, () => {
  console.log(`CW2 PhotoShare app running on port ${port}`);
});