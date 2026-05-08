import { useEffect, useMemo, useState } from "react";
import "./App.css";

const initialPosts = [
  {
    id: "demo-1",
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
    ratings: [5, 4, 5],
    apiBacked: false
  },
  {
    id: "demo-2",
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
    ratings: [5, 5, 4],
    apiBacked: false
  },
  {
    id: "demo-3",
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
    ratings: [4, 5, 5],
    apiBacked: false
  }
];

function getAverageRating(ratings = []) {
  if (!ratings.length) return "No ratings";

  const values = ratings.map((rating) =>
    typeof rating === "object" ? Number(rating.value) : Number(rating)
  );

  const average = values.reduce((total, value) => total + value, 0) / values.length;
  return average.toFixed(1);
}

function normaliseApiPost(image) {
  return {
    id: image.id,
    creator: image.creatorName || image.creatorId || "creator_demo",
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop",
    imageUrl: image.imageUrl,
    title: image.title || "Untitled photo",
    caption: image.caption || "",
    location: image.location || "Unknown location",
    peoplePresent: image.peoplePresent || [],
    tags: image.tags || ["azure-storage"],
    likes: image.likes || 0,
    liked: false,
    comments: image.comments || [],
    ratings: image.ratings || [],
    apiBacked: true
  };
}

function App() {
  const [posts, setPosts] = useState(initialPosts);
  const [view, setView] = useState("feed");
  const [authView, setAuthView] = useState(null);
  const [search, setSearch] = useState("");
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("cw2-user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("cw2-token") || "";
  });

  const [newPost, setNewPost] = useState({
    title: "",
    caption: "",
    location: "",
    peoplePresent: "",
    photo: null
  });

  useEffect(() => {
    loadAzurePosts();
  }, []);

  async function loadAzurePosts() {
    try {
      setLoadingPosts(true);

      const response = await fetch("/api/images");

      if (!response.ok) {
        throw new Error("Could not load Azure images");
      }

      const azureImages = await response.json();
      const apiPosts = Array.isArray(azureImages) ? azureImages.map(normaliseApiPost) : [];

      setPosts([...apiPosts, ...initialPosts]);
    } catch (error) {
      console.log("Using demo posts only:", error.message);
    } finally {
      setLoadingPosts(false);
    }
  }

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

  async function handleLogin(event) {
    event.preventDefault();

    const formData = new FormData(event.target);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password")
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Login failed");
        return;
      }

      localStorage.setItem("cw2-token", data.token);
      localStorage.setItem("cw2-user", JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);
      setAuthView(null);
      setView("feed");
    } catch (error) {
      alert("Login error: " + error.message);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();

    const formData = new FormData(event.target);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password")
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Registration failed");
        return;
      }

      localStorage.setItem("cw2-token", data.token);
      localStorage.setItem("cw2-user", JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);
      setAuthView(null);
      setView("feed");
    } catch (error) {
      alert("Registration error: " + error.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem("cw2-token");
    localStorage.removeItem("cw2-user");

    setToken("");
    setUser(null);
    setAuthView(null);
    setView("feed");
  }

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

  async function addComment(id) {
    if (!user || !token) {
      alert("Please login or register before commenting.");
      setAuthView("login");
      return;
    }

    const commentText = window.prompt("Enter your comment:");

    if (!commentText) return;

    const targetPost = posts.find((post) => post.id === id);

    if (!targetPost) return;

    if (!targetPost.apiBacked) {
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === id
            ? {
                ...post,
                comments: [
                  ...post.comments,
                  {
                    user: user.name,
                    text: commentText
                  }
                ]
              }
            : post
        )
      );
      return;
    }

    try {
      const response = await fetch(`/api/images/${id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          text: commentText
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Comment could not be saved");
        return;
      }

      const updatedPost = normaliseApiPost(data);

      setPosts((currentPosts) =>
        currentPosts.map((post) => (post.id === id ? updatedPost : post))
      );
    } catch (error) {
      alert("Comment error: " + error.message);
    }
  }

  async function ratePost(id, rating) {
    if (!user || !token) {
      alert("Please login or register before rating.");
      setAuthView("login");
      return;
    }

    const targetPost = posts.find((post) => post.id === id);

    if (!targetPost) return;

    if (!targetPost.apiBacked) {
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === id
            ? {
                ...post,
                ratings: [
                  ...post.ratings,
                  {
                    user: user.email,
                    value: rating
                  }
                ]
              }
            : post
        )
      );
      return;
    }

    try {
      const response = await fetch(`/api/images/${id}/ratings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rating
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Rating could not be saved");
        return;
      }

      const updatedPost = normaliseApiPost(data);

      setPosts((currentPosts) =>
        currentPosts.map((post) => (post.id === id ? updatedPost : post))
      );
    } catch (error) {
      alert("Rating error: " + error.message);
    }
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!user || user.role !== "creator") {
      alert("Only creator users can upload photos.");
      setAuthView("login");
      return;
    }

    if (!newPost.title || !newPost.caption || !newPost.location || !newPost.photo) {
      alert("Please complete title, caption, location, and choose a photo file.");
      return;
    }

    const formData = new FormData();
    formData.append("title", newPost.title);
    formData.append("caption", newPost.caption);
    formData.append("location", newPost.location);
    formData.append("peoplePresent", newPost.peoplePresent);
    formData.append("photo", newPost.photo);

    try {
      setUploading(true);

      const response = await fetch("/api/images", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Upload failed");
        return;
      }

      const uploadedPost = normaliseApiPost(data);

      setPosts((currentPosts) => [uploadedPost, ...currentPosts]);

      setNewPost({
        title: "",
        caption: "",
        location: "",
        peoplePresent: "",
        photo: null
      });

      alert("Photo uploaded to Azure Blob Storage and metadata saved to Cosmos DB.");
      setView("feed");
    } catch (error) {
      alert("Upload error: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function deletePost(id) {
    const targetPost = posts.find((post) => post.id === id);

    if (!targetPost) return;

    if (!user || user.role !== "creator") {
      alert("Only creator users can delete posts.");
      return;
    }

    if (!window.confirm("Delete this post?")) return;

    if (!targetPost.apiBacked) {
      setPosts((currentPosts) => currentPosts.filter((post) => post.id !== id));
      return;
    }

    try {
      const response = await fetch(`/api/images/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Delete failed");
        return;
      }

      setPosts((currentPosts) => currentPosts.filter((post) => post.id !== id));
    } catch (error) {
      alert("Delete error: " + error.message);
    }
  }

  function showFeed() {
    setAuthView(null);
    setView("feed");
  }

  function showExplore() {
    setAuthView(null);
    setView("consumer");
  }

  function showCreator() {
    setAuthView(null);

    if (!user || user.role !== "creator") {
      alert("Please login as creator to create posts.");
      setAuthView("login");
      return;
    }

    setView("creator");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={showFeed}>
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
          <button onClick={showFeed}>Home</button>
          <button onClick={showExplore}>Explore</button>

          {user?.role === "creator" && (
            <button onClick={showCreator} className="primary-nav">
              Create Post
            </button>
          )}

          {!user && (
            <>
              <button onClick={() => setAuthView("login")}>Login</button>
              <button onClick={() => setAuthView("register")} className="primary-nav">
                Register
              </button>
            </>
          )}

          {user && <button onClick={handleLogout}>Logout ({user.role})</button>}
        </nav>
      </header>

      <main className="layout">
        <aside className="left-panel">
          <div className="profile-card">
            <img
              src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&h=120&fit=crop"
              alt="profile"
            />
            <h2>{user ? user.name : "guest_user"}</h2>
            <p>{user ? `${user.role} account` : "Not logged in"}</p>
          </div>

          <div className="menu-card">
            <button onClick={showFeed}>🏠 Feed</button>
            <button onClick={showExplore}>🔎 Consumer View</button>

            {user?.role === "creator" && (
              <button onClick={showCreator}>➕ Create Post</button>
            )}

            {!user && (
              <>
                <button onClick={() => setAuthView("login")}>🔐 Login</button>
                <button onClick={() => setAuthView("register")}>📝 Register</button>
              </>
            )}

            {user && <button onClick={handleLogout}>🚪 Logout</button>}
          </div>

          <div className="cloud-card">
            <h3>Azure Backend</h3>
            <p>React frontend</p>
            <p>Express REST API</p>
            <p>Azure App Service</p>
            <p>Blob Storage connected</p>
            <p>Cosmos DB connected</p>
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

          {loadingPosts && <p className="loading-text">Loading Azure posts...</p>}

          {authView === "login" && (
            <section className="creator-view">
              <div className="section-heading">
                <p>Login</p>
                <h2>Login to PhotoGram</h2>
                <span>
                  Consumers can view the feed. Creator users can upload and manage posts.
                </span>
              </div>

              <form className="upload-form" onSubmit={handleLogin}>
                <label>
                  Email
                  <input name="email" type="email" placeholder="Email address" required />
                </label>

                <label>
                  Password
                  <input name="password" type="password" placeholder="Password" required />
                </label>

                <button type="submit">Login</button>
              </form>

              <p>
                Creator demo login: <b>creator@photoshare.com</b> / <b>Creator123!</b>
              </p>
            </section>
          )}

          {authView === "register" && (
            <section className="creator-view">
              <div className="section-heading">
                <p>Register</p>
                <h2>Create consumer account</h2>
                <span>
                  Consumer users can view, search, comment and rate. They cannot upload photos.
                </span>
              </div>

              <form className="upload-form" onSubmit={handleRegister}>
                <label>
                  Name
                  <input name="name" type="text" placeholder="Your name" required />
                </label>

                <label>
                  Email
                  <input name="email" type="email" placeholder="Email address" required />
                </label>

                <label>
                  Password
                  <input name="password" type="password" placeholder="Password" required />
                </label>

                <button type="submit">Register</button>
              </form>
            </section>
          )}

          {!authView && view === "creator" && user?.role === "creator" && (
            <section className="creator-view">
              <div className="section-heading">
                <p>Creator view</p>
                <h2>Create a post with photo metadata</h2>
                <span>
                  Creator uploads are stored in Azure Blob Storage. Metadata is stored in Cosmos DB.
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
                  Photo file
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setNewPost({ ...newPost, photo: event.target.files[0] })
                    }
                  />
                </label>

                <button type="submit" disabled={uploading}>
                  {uploading ? "Uploading to Azure..." : "Upload photo"}
                </button>
              </form>
            </section>
          )}

          {!authView && view === "consumer" && (
            <section className="consumer-view">
              <div className="section-heading">
                <p>Consumer view</p>
                <h2>Search, view, comment, and rate photos</h2>
                <span>
                  Consumer users can view photo content but cannot upload images.
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

          {!authView && view === "feed" && (
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

                    {user?.role === "creator" && (
                      <button className="dots" onClick={() => deletePost(post.id)}>
                        🗑️
                      </button>
                    )}
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
                      <span>
                        Storage: {post.apiBacked ? "Azure Blob + Cosmos DB" : "Demo post"}
                      </span>
                    </div>

                    <div className="tags">
                      {post.tags.map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>

                    <div className="comments">
                      {post.comments.map((comment, index) => (
                        <p key={index}>
                          <b>{typeof comment === "object" ? comment.user : "consumer_user"}</b>{" "}
                          {typeof comment === "object" ? comment.text : comment}
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
            <h3>Advanced features</h3>
            <p>Azure Blob Storage uploads</p>
            <p>Cosmos DB metadata</p>
            <p>Login and registration</p>
            <p>Creator and consumer roles</p>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;