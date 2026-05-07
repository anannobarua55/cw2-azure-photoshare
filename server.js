const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));

let images = [
  {
    id: "1",
    title: "City Lights",
    caption: "A creator photo shared on PhotoShare",
    location: "Belfast",
    peoplePresent: ["Creator User"],
    imageUrl: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e",
    creatorId: "creator-1",
    comments: [
      { user: "consumer1", text: "Great photo!" }
    ],
    ratings: [5, 4]
  },
  {
    id: "2",
    title: "Mountain View",
    caption: "Cloud-native media sharing example",
    location: "Northern Ireland",
    peoplePresent: ["Alex", "Sam"],
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    creatorId: "creator-1",
    comments: [],
    ratings: [5]
  }
];

app.get("/api/health", (req, res) => {
  res.json({
    status: "API is running",
    project: "CW2 Azure PhotoShare"
  });
});

app.get("/api/images", (req, res) => {
  const search = (req.query.search || "").toLowerCase();

  const results = images.filter((image) => {
    return (
      image.title.toLowerCase().includes(search) ||
      image.caption.toLowerCase().includes(search) ||
      image.location.toLowerCase().includes(search)
    );
  });

  res.json(results);
});

app.get("/api/images/:id", (req, res) => {
  const image = images.find((item) => item.id === req.params.id);

  if (!image) {
    return res.status(404).json({ error: "Image not found" });
  }

  const averageRating =
    image.ratings.length === 0
      ? 0
      : image.ratings.reduce((a, b) => a + b, 0) / image.ratings.length;

  res.json({
    ...image,
    averageRating
  });
});

app.post("/api/images", (req, res) => {
  const newImage = {
    id: Date.now().toString(),
    title: req.body.title,
    caption: req.body.caption,
    location: req.body.location,
    peoplePresent: req.body.peoplePresent || [],
    imageUrl: req.body.imageUrl,
    creatorId: "creator-demo",
    comments: [],
    ratings: []
  };

  images.push(newImage);
  res.status(201).json(newImage);
});

app.post("/api/images/:id/comments", (req, res) => {
  const image = images.find((item) => item.id === req.params.id);

  if (!image) {
    return res.status(404).json({ error: "Image not found" });
  }

  const comment = {
    user: req.body.user || "consumer-demo",
    text: req.body.text
  };

  image.comments.push(comment);
  res.status(201).json(comment);
});

app.post("/api/images/:id/ratings", (req, res) => {
  const image = images.find((item) => item.id === req.params.id);

  if (!image) {
    return res.status(404).json({ error: "Image not found" });
  }

  const rating = Number(req.body.rating);

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5" });
  }

  image.ratings.push(rating);

  const averageRating =
    image.ratings.reduce((a, b) => a + b, 0) / image.ratings.length;

  res.status(201).json({
    rating,
    averageRating
  });
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