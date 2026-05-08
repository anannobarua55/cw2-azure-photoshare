import { useEffect, useMemo, useState } from "react";
import "./App.css";

const demoPosts = [
  {
    id: "demo-1",
    creator: "belfast_creator",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    imageUrl:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900&h=900&fit=crop",
    title: "Belfast Night Lights",
    caption: "A city evening view shared by a creator.",
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
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&h=900&fit=crop",
    title: "Nature View",
    caption: "A peaceful outdoor image for consumers to view and rate.",
    location: "Northern Ireland",
    peoplePresent: ["Maya"],
    tags: ["nature", "green", "travel"],
    likes: 245,
    liked: false,
    comments: ["Looks amazing!", "I want to visit this place."],
    ratings: [5, 5, 4],
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
    avatar:
      "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop",
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
  const [posts, setPosts] = useState([]);
  const [view, setView] = useState("feed");
  const [authMode, setAuthMode] = useState("login");
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
    if (user) {
      loadPosts();
    } else {
      setPosts([]);
    }
  }, [user]);

  async function loadPosts() {
    try {
      setLoadingPosts(true);

      const response = await fetch("/api/images");

      if (!response.ok) {
        throw new Error("Could not load Azure images");
      }

      const azureImages = await response.json();
      const apiPosts = Array.isArray(azureImages)
        ? azureImages.map(normaliseApiPost)
        : [];

      setPosts([...apiPosts, ...demoPosts]);
    } catch (error) {
      console.log("Using demo posts only:", error.message);
      setPosts(demoPosts);
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
    setPosts([]);
    setView("feed");
    setAuthMode("login");
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
      alert("Please login first.");
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
      alert("Please login first.");
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

      alert("Photo uploaded successfully.");
      setView("feed");
    } catch (error) {
      alert("Upload error: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function deletePost(id) {
    if (!user || user.role !== "creator") {
      alert("Only creator users can delete posts.");
      return;
    }

    const targetPost = posts.find((post) => post.id === id);

    if (!targetPost) return;

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

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="brand-icon">◎</div>
            <h1>PhotoGram CW2</h1>
          </div>

          <p className="auth-subtitle">
            Login or register before accessing the photo feed.
          </p>

          <div className="auth-tabs">
            <button
              className={authMode === "login" ? "active" : ""}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              className={authMode === "register" ? "active" : ""}
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
          </div>

          {authMode === "login" && (
            <form className="auth-form" onSubmit={handleLogin}>
              <label>
                Email
                <input name="email" type="email" placeholder="Email address" required />
              </label>

              <label>
                Password
                <input name="password" type="password" placeholder="Password" required />
              </label>

              <button type="submit">Login</button>

              <div className="creator-login-note">
                <strong>Creator demo login</strong>
                <span>Email: creator@photoshare.com</span>
                <span>Password: Creator123!</span>
              </div>
            </form>
          )}

          {authMode === "register" && (
            <form className="auth-form" onSubmit={handleRegister}>
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

              <button type="submit">Register as User</button>

              <p className="auth-help">
                Registered users can view, search, comment, and rate. They cannot upload.
              </p>
            </form>
          )}
        </div>
      </div>
    );
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
          <button onClick={() => setView("feed")}>Feed</button>
          <button onClick={() => setView("consumer")}>Explore</button>

          {user.role === "creator" && (
            <button onClick={() => setView("creator")} className="primary-nav">
              Create Post
            </button>
          )}

          <button onClick={handleLogout}>Logout</button>
        </nav>
      </header>

      <main className="main-layout">
        <section className="feed-shell">
          <div className="user-strip">
            <div>
              <strong>{user.name}</strong>
              <span>{user.role} account</span>
            </div>

            {user.role === "consumer" && (
              <p>You can view, search, comment, and rate photos.</p>
            )}

            {user.role === "creator" && (
              <p>You can upload and manage photo posts.</p>
            )}
          </div>

          {loadingPosts && <p className="loading-text">Loading posts...</p>}

          {view === "creator" && user.role === "creator" && (
            <section className="creator-view">
              <div className="section-heading">
                <p>Creator view</p>
                <h2>Create a new post</h2>
                <span>
                  Upload a photo with title, caption, location, and people present.
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
                  {uploading ? "Uploading..." : "Upload Photo"}
                </button>
              </form>
            </section>
          )}

          {view === "consumer" && (
            <section className="consumer-view">
              <div className="section-heading">
                <p>Explore</p>
                <h2>Search and view photos</h2>
                <span>Users can view posts but cannot upload content.</span>
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

                    {user.role === "creator" && (
                      <button className="delete-btn" onClick={() => deletePost(post.id)}>
                        Delete
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
                    </div>

                    <div className="tags">
                      {post.tags.map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>

                    <div className="comments">
                      {post.comments.map((comment, index) => (
                        <p key={index}>
                          <b>
                            {typeof comment === "object"
                              ? comment.user
                              : "consumer_user"}
                          </b>{" "}
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
      </main>
    </div>
  );
}

export default App;