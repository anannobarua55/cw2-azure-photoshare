import express from "express";
import path from "path";
import multer from "multer";
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

const storageConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const storageContainerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "photos";

const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
const cosmosKey = process.env.COSMOS_KEY;
const cosmosDatabaseName = process.env.COSMOS_DATABASE_NAME || "photoshare";
const cosmosContainerName = process.env.COSMOS_CONTAINER_NAME || "images";

let blobContainerClient = null;
let cosmosContainer = null;

if (storageConnectionString) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
  blobContainerClient = blobServiceClient.getContainerClient(storageContainerName);
}

if (cosmosEndpoint && cosmosKey) {
  const cosmosClient = new CosmosClient({
    endpoint: cosmosEndpoint,
    key: cosmosKey
  });

  cosmosContainer = cosmosClient
    .database(cosmosDatabaseName)
    .container(cosmosContainerName);
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "running",
    project: "CW2 PhotoShare Azure App",
    blobStorageConnected: Boolean(blobContainerClient),
    cosmosConnected: Boolean(cosmosContainer)
  });
});

app.get("/api/images", async (req, res) => {
  try {
    if (!cosmosContainer) {
      return res.status(500).json({
        error: "Cosmos DB is not configured"
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
      error: "Failed to load images",
      details: error.message
    });
  }
});

app.get("/api/images/:id/file", async (req, res) => {
  try {
    if (!cosmosContainer || !blobContainerClient) {
      return res.status(500).json({
        error: "Storage or Cosmos DB is not configured"
      });
    }

    const { resources } = await cosmosContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: req.params.id }]
      })
      .fetchAll();

    if (!resources.length) {
      return res.status(404).json({ error: "Image not found" });
    }

    const image = resources[0];
    const blobClient = blobContainerClient.getBlockBlobClient(image.blobName);
    const downloadResponse = await blobClient.download();

    res.setHeader("Content-Type", image.contentType || "image/jpeg");
    downloadResponse.readableStreamBody.pipe(res);
  } catch (error) {
    res.status(500).json({
      error: "Failed to load image file",
      details: error.message
    });
  }
});

app.post("/api/images", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Photo file is required"
      });
    }

    if (!cosmosContainer || !blobContainerClient) {
      return res.status(500).json({
        error: "Storage or Cosmos DB is not configured"
      });
    }

    const id = Date.now().toString();
    const blobName = `${id}-${req.file.originalname}`;

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
      creatorId: "creator_demo",
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
      error: "Failed to upload image",
      details: error.message
    });
  }
});

app.post("/api/images/:id/comments", async (req, res) => {
  try {
    const { resources } = await cosmosContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: req.params.id }]
      })
      .fetchAll();

    if (!resources.length) {
      return res.status(404).json({ error: "Image not found" });
    }

    const image = resources[0];

    image.comments = image.comments || [];
    image.comments.push({
      user: req.body.user || "consumer_user",
      text: req.body.text,
      createdAt: new Date().toISOString()
    });

    await cosmosContainer.item(image.id, image.creatorId).replace(image);

    res.status(201).json(image);
  } catch (error) {
    res.status(500).json({
      error: "Failed to add comment",
      details: error.message
    });
  }
});

app.post("/api/images/:id/ratings", async (req, res) => {
  try {
    const rating = Number(req.body.rating);

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: "Rating must be between 1 and 5"
      });
    }

    const { resources } = await cosmosContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: req.params.id }]
      })
      .fetchAll();

    if (!resources.length) {
      return res.status(404).json({ error: "Image not found" });
    }

    const image = resources[0];

    image.ratings = image.ratings || [];
    image.ratings.push(rating);

    await cosmosContainer.item(image.id, image.creatorId).replace(image);

    res.status(201).json(image);
  } catch (error) {
    res.status(500).json({
      error: "Failed to add rating",
      details: error.message
    });
  }
});

const distPath = path.join(__dirname, "dist");

app.use(express.static(distPath));

app.use((req, res) => {
  if (req.method === "GET") {
    res.sendFile(path.join(distPath, "index.html"));
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

app.listen(port, () => {
  console.log(`CW2 PhotoShare app running on port ${port}`);
});