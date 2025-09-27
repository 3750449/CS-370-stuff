import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import "./index.css";

import { useEffect, useMemo, useState } from "react";

type Note = {
  id: number;
  title: string;
  course: string;
  content: string;
  createdAt: string; // matches what your API returns
};

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");

  // Fetch once on load
  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE || "";
    fetch(`${base}/api/notes`)
      .then((r) => r.json())
      .then(setNotes)
      .catch((err) => console.error("Failed to load notes", err));
  }, []);

  // Client-side filter: title, course, or content contains the query (case-insensitive)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.course.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
    );
  }, [notes, query]);

  return (
    <div className="page">
      <header className="site-header">
        <div className="container">
          <h1>StudyLink</h1>
          <nav className="nav">
            <a href="#home">Home</a>
            <a href="#notes">Notes</a>
            <a href="#about">About</a>
          </nav>
        </div>
      </header>

      <main>
        <section id="home" className="hero">
          <div className="container">
            <h2>Connect, Share, and Succeed</h2>
            <p>Find study partners and share reliable notes.</p>
            <a className="btn" href="#notes">Get Started</a>
          </div>
        </section>

        <section id="notes" className="notes container">
          <h2>Class Notes</h2>

          {/* Search box */}
          <input
            className="input"
            placeholder="Search notes… (title, course, content)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: "100%", maxWidth: 480, margin: "8px 0", padding: "8px" }}
          />

          {/* Results */}
          {filtered.length === 0 ? (
            <p>No notes match “{query}”.</p>
          ) : (

<ul style={{ listStyle: "none", paddingLeft: 0 }}>
  {filtered.map((n) => (
    <li key={n.id} className="result-box">
      <h3>{n.title}</h3>
      <small>
        {n.course} • {new Date(n.createdAt).toLocaleString()}
      </small>
      <p>{n.content}</p>
    </li>
  ))}
</ul>

          )}
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <small>© {new Date().getFullYear()} StudyLink</small>
        </div>
      </footer>
    </div>
  );
}
