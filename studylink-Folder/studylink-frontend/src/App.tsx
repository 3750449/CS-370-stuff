import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import Grid from "./components/Grid";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import AuthForm from "./components/AuthForm";

export default function App() {
  return (
    <div className="page">
      <header className="site-header">
        <div className="container">
          <h1>StudyLink</h1>
          <Header />
        </div>
      </header>

      <main className="container" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
        <AuthForm />
        <SearchBar />
        <Grid />
      </main>

      <footer className="site-footer">
        <div className="container">
          <small>© {new Date().getFullYear()} StudyLink</small>
        </div>
      </footer>
    </div>
  );
}
