import { useMemo, useState } from "react";
import "./App.css";

const initialPosts = [
  {
    id: "1",
    creator: "belfast_creator",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    imageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900&h=900&fit=crop",
    title: "Belfast Night Lights",
    caption: "A creator upload showing a city evening view.",
    location: "Belfast",
    peoplePresent: ["Alex", "Sam"],
    tags: ["city", "night", "lights"],
    likes: 128,
    liked: false,
    comments: ["Beautiful shot!", "Great colours."],
    ratings: [5, 4, 5]
  },
  {
    id: "2",
    creator: "nature_gallery",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&h=900&fit=crop",
    title: "Nature View",
    caption: "A peaceful outdoor image for consumer users to view and rate.",
    location: "Northern Ireland",
    peoplePresent: ["Maya"],
    tags: ["nature", "green", "travel"],
    likes: 245,
    liked: false,
    comments: ["Looks amazing!", "I want to visit this place."],
    ratings: [5, 5, 4]
  },
  {
    id: "3",
    creator: "travel_creator",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&h=900&fit=crop",
    title: "Ocean Mood",
    caption: "Photo shared by a creator account with searchable metadata.",
    location: "Portrush",
    peoplePresent: ["Creator User"],
    tags: ["sea", "beach", "travel"],
    likes: 312,
    liked: false,
    comments: ["Very clean image.", "Nice upload."],
    ratings: [4, 5, 5]
  }
];

function getAverageRating(ratings) {
  if (!ratings.length) return "No ratings";
  const average = ratings.reduce((total, value) => total + value, 0) / ratings.length;
  return average.toFixed(1);
}

function App() {
  const [posts, setPosts] = useState(initialPosts);
  const [view, setView] = useState("feed");
  const [search, setSearch] = useState("");

  const [newPost, setNewPost] = useState({
    title: "",
    caption: "",
    location: "",
    peoplePresent: "",
    imageUrl: ""
  });

  const filteredPosts = useMemo(() => {
    const query = search.toLowerCase();

    return posts.filter((post) => {
      return (
        post.title.toLowerCase().includes(query) ||
        post.caption.toLowerCase().includes(query) ||
        post.location.toLowerCase().includes(query) ||
        post.creator.toLowerCase().includes(query) ||
        post.tags.join(" ").toLowerCase().includes(query) ||
        post.peoplePresent.join(" ").toLowerCase().includes(query)
      );
    });
  }, [posts, search]);

  function likePost(id) {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === id
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked ? post.likes - 1 : post.likes + 1
            }
          : post
      )
    );
  }

  function addComment(id) {
    const comment = window.prompt("Enter your comment:");

    if (!comment) return;

    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === id
          ? {
              ...post,
              comments: [...post.comments, comment]
            }
          : post
      )
    );
  }

  function ratePost(id, rating) {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === id
          ? {
              ...post,
              ratings: [...post.ratings, rating]
            }
          : post
      )
    );
  }

  function handleUpload(event) {
    event.preventDefault();

    if (!newPost.title || !newPost.caption || !newPost.location || !newPost.imageUrl) {
      alert("Please complete title, caption, location, and image URL.");
      return;
    }

    const uploadedPost = {
      id: Date.now().toString(),
      creator: "creator_demo",
      avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop",
      imageUrl: newPost.imageUrl,
      title: newPost.title,
      caption: newPost.caption,
      location: newPost.location,
      peoplePresent: newPost.peoplePresent
        .split(",")
        .map((person) => person.trim())
        .filter(Boolean),
      tags: ["creator-upload", "cw2"],
      likes: 0,
      liked: false,
      comments: [],
      ratings: []
    };

    setPosts([uploadedPost, ...posts]);

    setNewPost({
      title: "",
      caption: "",
      location: "",
      peoplePresent: "",
      imageUrl: ""
    });

    setView("feed");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={() => setView("feed")}>
          <div className="brand-icon">◎</div>
          <h1>PhotoGram CW2</h1>
        </div>

        <div className="search-box">
          <span>⌕</span>
          <input
            type="text"
            placeholder="Search photos, locations, tags..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <nav>
          <button onClick={() => setView("feed")}>Home</button>
          <button onClick={() => setView("consumer")}>Explore</button>
          <button onClick={() => setView("creator")} className="primary-nav">
            Creator
          </button>
        </nav>
      </header>

      <main className="layout">
        <aside className="left-panel">
          <div className="profile-card">
            <img
              src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&h=120&fit=crop"
              alt="creator profile"
            />
            <h2>creator_demo</h2>
            <p>Creator account</p>
          </div>

          <div className="menu-card">
            <button onClick={() => setView("feed")}>🏠 Feed</button>
            <button onClick={() => setView("consumer")}>🔎 Consumer View</button>
            <button onClick={() => setView("creator")}>⬆️ Creator Upload</button>
            <button onClick={() => alert("Login and roles will be connected using Azure authentication later.")}>
              🔐 Login / Roles
            </button>
          </div>

          <div className="cloud-card">
            <h3>Azure Backend</h3>
            <p>React frontend</p>
            <p>Express REST API</p>
            <p>Azure App Service</p>
            <p>Blob Storage planned</p>
            <p>Cosmos DB planned</p>
          </div>
        </aside>

        <section className="main-panel">
          <div className="stories">
            {posts.map((post) => (
              <div className="story" key={post.id}>
                <img src={post.avatar} alt={post.creator} />
                <span>{post.creator}</span>
              </div>
            ))}
          </div>

          {view === "creator" && (
            <section className="creator-view">
              <div className="section-heading">
                <p>Creator view</p>
                <h2>Upload a photo with metadata</h2>
                <span>
                  Only creator users should upload content. This demo form represents the protected
                  creator dashboard.
                </span>
              </div>

              <form className="upload-form" onSubmit={handleUpload}>
                <label>
                  Title
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(event) =>
                      setNewPost({ ...newPost, title: event.target.value })
                    }
                    placeholder="Example: Belfast Sunset"
                  />
                </label>

                <label>
                  Caption
                  <textarea
                    value={newPost.caption}
                    onChange={(event) =>
                      setNewPost({ ...newPost, caption: event.target.value })
                    }
                    placeholder="Write a caption..."
                  />
                </label>

                <label>
                  Location
                  <input
                    type="text"
                    value={newPost.location}
                    onChange={(event) =>
                      setNewPost({ ...newPost, location: event.target.value })
                    }
                    placeholder="Example: Belfast"
                  />
                </label>

                <label>
                  People present
                  <input
                    type="text"
                    value={newPost.peoplePresent}
                    onChange={(event) =>
                      setNewPost({ ...newPost, peoplePresent: event.target.value })
                    }
                    placeholder="Example: Alex, Sam"
                  />
                </label>

                <label>
                  Image URL
                  <input
                    type="text"
                    value={newPost.imageUrl}
                    onChange={(event) =>
                      setNewPost({ ...newPost, imageUrl: event.target.value })
                    }
                    placeholder="Paste an image URL for demo upload"
                  />
                </label>

                <button type="submit">Upload photo</button>
              </form>
            </section>
          )}

          {view === "consumer" && (
            <section className="consumer-view">
              <div className="section-heading">
                <p>Consumer view</p>
                <h2>Search, view, comment, and rate photos</h2>
                <span>
                  Consumer users can interact with photo content but cannot upload images.
                </span>
              </div>

              <div className="explore-grid">
                {filteredPosts.map((post) => (
                  <div className="explore-card" key={post.id}>
                    <img src={post.imageUrl} alt={post.title} />
                    <div>
                      <h3>{post.title}</h3>
                      <p>{post.location}</p>
                      <span>⭐ {getAverageRating(post.ratings)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {view === "feed" && (
            <section className="feed">
              {filteredPosts.map((post) => (
                <article className="post" key={post.id}>
                  <div className="post-header">
                    <div className="creator-info">
                      <img src={post.avatar} alt={post.creator} />
                      <div>
                        <h3>{post.creator}</h3>
                        <span>{post.location}</span>
                      </div>
                    </div>
                    <button className="dots">•••</button>
                  </div>

                  <img className="post-image" src={post.imageUrl} alt={post.title} />

                  <div className="post-actions">
                    <button onClick={() => likePost(post.id)}>
                      {post.liked ? "❤️" : "🤍"}
                    </button>
                    <button onClick={() => addComment(post.id)}>💬</button>
                    <button onClick={() => ratePost(post.id, 5)}>⭐ Rate 5</button>
                  </div>

                  <div className="post-body">
                    <strong>{post.likes} likes</strong>
                    <p>
                      <b>{post.creator}</b> {post.caption}
                    </p>

                    <div className="metadata">
                      <span>Title: {post.title}</span>
                      <span>Location: {post.location}</span>
                      <span>People: {post.peoplePresent.join(", ") || "None"}</span>
                      <span>Rating: ⭐ {getAverageRating(post.ratings)}</span>
                    </div>

                    <div className="tags">
                      {post.tags.map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>

                    <div className="comments">
                      {post.comments.map((comment, index) => (
                        <p key={index}>
                          <b>consumer_user</b> {comment}
                        </p>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </section>

        <aside className="right-panel">
          <div className="suggestion-card">
            <h3>Project evidence</h3>
            <p>Live Azure App Service deployment</p>
            <p>REST endpoint: /api/health</p>
            <p>REST endpoint: /api/images</p>
            <p>GitHub Actions CI/CD</p>
          </div>

          <div className="suggestion-card">
            <h3>Advanced features to add next</h3>
            <p>Azure Blob Storage uploads</p>
            <p>Cosmos DB metadata</p>
            <p>Authentication and roles</p>
            <p>Azure AI Vision tags</p>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
