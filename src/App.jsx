function App() {
  const samplePhotos = [
    {
      title: "City Sunset",
      caption: "A creator upload with title, caption and location metadata.",
      location: "Belfast",
      rating: "4.8"
    },
    {
      title: "Mountain Walk",
      caption: "Consumers can search, view, comment and rate photos.",
      location: "Scotland",
      rating: "4.5"
    },
    {
      title: "Beach Morning",
      caption: "Images will later be stored in Azure Blob Storage.",
      location: "Portrush",
      rating: "4.7"
    }
  ];

  return (
    <div className="page">
      <nav className="navbar">
        <div className="logo">PhotoShare CW2</div>
        <div className="navLinks">
          <a href="#features">Features</a>
          <a href="#creator">Creator</a>
          <a href="#consumer">Consumer</a>
          <a className="loginButton" href="/.auth/login/aad">Login</a>
        </div>
      </nav>

      <header className="hero">
        <div className="heroText">
          <p className="eyebrow">COM769 Coursework 2</p>
          <h1>Scalable Photo Sharing Web App</h1>
          <p>
            A simple cloud-native media distribution website where creator users
            upload photos and consumer users can search, view, comment and rate
            image content.
          </p>
          <div className="heroButtons">
            <a href="#consumer" className="primaryButton">Browse Photos</a>
            <a href="#creator" className="secondaryButton">Creator Dashboard</a>
          </div>
        </div>

        <div className="architectureCard">
          <h2>Azure Architecture</h2>
          <ul>
            <li>Azure Static Web Apps</li>
            <li>Azure Functions REST API</li>
            <li>Azure Blob Storage</li>
            <li>Azure Cosmos DB</li>
            <li>Authentication and roles</li>
          </ul>
        </div>
      </header>

      <main>
        <section id="features" className="section">
          <p className="eyebrow">Main Features</p>
          <h2>Designed for creators and consumers</h2>
          <div className="featureGrid">
            <div className="featureCard">
              <h3>Photo Upload</h3>
              <p>Creator users upload images with title, caption, location and people present.</p>
            </div>
            <div className="featureCard">
              <h3>Search and View</h3>
              <p>Consumer users browse images and search through image metadata.</p>
            </div>
            <div className="featureCard">
              <h3>Comments and Ratings</h3>
              <p>Consumers interact with uploaded photos using comments and star ratings.</p>
            </div>
          </div>
        </section>

        <section id="consumer" className="section lightSection">
          <p className="eyebrow">Consumer View</p>
          <h2>Sample photo feed</h2>
          <div className="photoGrid">
            {samplePhotos.map((photo, index) => (
              <article className="photoCard" key={photo.title}>
                <div className="photoPlaceholder">Photo {index + 1}</div>
                <div className="photoInfo">
                  <h3>{photo.title}</h3>
                  <p>{photo.caption}</p>
                  <span>{photo.location}</span>
                  <strong>★ {photo.rating}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="creator" className="section creatorSection">
          <div>
            <p className="eyebrow">Creator View</p>
            <h2>Upload photo metadata</h2>
            <p>
              This form is a frontend placeholder. Later, it will connect to Azure Functions,
              Blob Storage and Cosmos DB.
            </p>
          </div>
          <form className="uploadForm">
            <label>
              Photo title
              <input type="text" placeholder="e.g. Belfast Sunset" />
            </label>
            <label>
              Caption
              <textarea placeholder="Write a short photo caption"></textarea>
            </label>
            <label>
              Location
              <input type="text" placeholder="e.g. Belfast" />
            </label>
            <label>
              People present
              <input type="text" placeholder="e.g. Alex, Sam" />
            </label>
            <button type="button">Upload Placeholder</button>
          </form>
        </section>
      </main>

      <footer>
        <p>COM769 Coursework 2 — Azure PhotoShare Project</p>
      </footer>
    </div>
  );
}

export default App;
