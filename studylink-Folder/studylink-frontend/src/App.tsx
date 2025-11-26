import "bootstrap/dist/css/bootstrap.min.css";
import { useState, useEffect } from 'react'
import Header from './components/Header'
import AuthForm from './components/AuthForm'
import Grid from './components/Grid'
import UploadPage from './components/UploadPage';
import Bookmarks from './components/Bookmarks';
import FileViewer from './components/FileViewer';
import AuthModal from './components/AuthModal';
import MyUploads from './components/MyUploads';
import './App.css'

// App owns global navigation, filter state, and cross-page modals so every screen stays in sync.
type PageName = 'home' | 'about' | 'account' | 'upload' | 'bookmarks' | 'view' | 'my-uploads'

export default function App() {
    const [currentPage, setCurrentPage] = useState<PageName>('home')
    const [searchTerm, setSearchTerm] = useState('')
    const [classFilter, setClassFilter] = useState<string[]>([])
    const [viewingFileId, setViewingFileId] = useState<number | null>(null)
    const [showAuthModal, setShowAuthModal] = useState(false)

    const hasActiveFilters = classFilter.length > 0 || searchTerm.length > 0;

    useEffect(() => {
        function handleClearFilters() {
            setSearchTerm('');
            setClassFilter([]);
        }
        window.addEventListener('clear-home-filters', handleClearFilters);
        return () => window.removeEventListener('clear-home-filters', handleClearFilters);
    }, []);
    
    return (
        <div className={`App ${hasActiveFilters ? 'has-active-filters' : ''}`}>
            <Header 
                onNavigate={setCurrentPage}
                searchTerm={currentPage === 'home' ? searchTerm : undefined}
                onSearchChange={currentPage === 'home' ? setSearchTerm : undefined}
                classFilter={currentPage === 'home' ? classFilter : undefined}
                onClassFilterChange={currentPage === 'home' ? setClassFilter : undefined}
                showSearch={currentPage === 'home'}
            />

            {currentPage === 'home' && (
                <div className="home-page">
                    <div className="home-content">
                        {classFilter.length === 0 && !searchTerm && (
                            <div className="home-welcome">
                                <h2>Welcome to StudyLink</h2>
                                <p>
                                    Start browsing the notes below. Click on any note to view it, or{' '}
                                    {localStorage.getItem('token') ? (
                                        <button 
                                            className="inline-link-btn"
                                            onClick={() => setCurrentPage('upload')}
                                        >
                                            upload your own notes
                                        </button>
                                    ) : (
                                        <>
                                            <button 
                                                className="inline-link-btn"
                                                onClick={() => setCurrentPage('account')}
                                            >
                                                log in
                                            </button>
                                            {' '}to upload your own notes
                                        </>
                                    )}
                                    .
                                </p>
                            </div>
                        )}
                        <Grid 
                            searchTerm={searchTerm} 
                            classFilter={classFilter}
                            onViewFile={(fileId) => {
                                setViewingFileId(fileId);
                                setCurrentPage('view');
                            }}
                            onClassClick={(classId) => {
                                const classIdStr = classId.toString();
                                if (!classFilter.includes(classIdStr)) {
                                    setClassFilter([...classFilter, classIdStr]);
                                }
                                setCurrentPage('home');
                            }}
                            onBookmarkClick={() => setShowAuthModal(true)}
                            onClearFilters={() => {
                                setClassFilter([]);
                                setSearchTerm('');
                            }}
                        />
                    </div>
                </div>
            )}

            {currentPage === 'about' && (
                <div className="page about">
                    <div className="about-hero">
                        <h1>About StudyLink</h1>
                        <p className="about-hero-subtitle">
                            Empowering students to organize, share, and discover course materials efficiently
                        </p>
                    </div>
                    
                    <div className="page-content about-content">
                        <section className="about-section">
                            <h2>Our Mission</h2>
                            <p>
                                StudyLink is a secure file-sharing platform designed exclusively for educational institutions. 
                                We believe that learning should be collaborative and accessible. Our mission is to help students 
                                organize, share, and discover course materials efficiently, creating a vibrant community of 
                                knowledge sharing within academic institutions.
                            </p>
                        </section>

                        <section className="about-section">
                            <h2>Key Features</h2>
                            <div className="features-grid">
                                <div className="feature-card">
                                    <div className="feature-icon">📁</div>
                                    <h3>Organized File Management</h3>
                                    <p>Upload and organize course files by class, making it easy to find exactly what you need when you need it.</p>
                                </div>
                                <div className="feature-card">
                                    <div className="feature-icon">🔍</div>
                                    <h3>Powerful Search & Filter</h3>
                                    <p>Search files by name or filter by course to quickly locate study materials across all your classes.</p>
                                </div>
                                <div className="feature-card">
                                    <div className="feature-icon">⭐</div>
                                    <h3>Bookmark System</h3>
                                    <p>Save important files for quick access later. Build your personal library of essential study materials.</p>
                                </div>
                                <div className="feature-card">
                                    <div className="feature-icon">🔒</div>
                                    <h3>Secure & Exclusive</h3>
                                    <p>Restricted to .edu email addresses, ensuring a safe and trusted environment for academic collaboration.</p>
                                </div>
                            </div>
                        </section>

                        <section className="about-section">
                            <h2>How It Works</h2>
                            <div className="how-it-works">
                                <div className="step">
                                    <div className="step-number">1</div>
                                    <div className="step-content">
                                        <h3>Create Your Account</h3>
                                        <p>Sign up with your .edu email address to join the StudyLink community.</p>
                                    </div>
                                </div>
                                <div className="step">
                                    <div className="step-number">2</div>
                                    <div className="step-content">
                                        <h3>Upload Your Materials</h3>
                                        <p>Share your notes, study guides, and course materials with your classmates.</p>
                                    </div>
                                </div>
                                <div className="step">
                                    <div className="step-number">3</div>
                                    <div className="step-content">
                                        <h3>Discover & Learn</h3>
                                        <p>Browse, search, and bookmark files from other students to enhance your learning experience.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="about-section">
                            <h2>Why StudyLink?</h2>
                            <p>
                                StudyLink makes it easy to find and share study materials with your classmates. Whether you're 
                                looking for lecture notes, study guides, or practice problems, our platform connects you with 
                                the resources you need to succeed academically.
                            </p>
                        </section>

                        <section className="about-cta">
                            <h2>Ready to Get Started?</h2>
                            <p>Join StudyLink to enhance your learning experience. Now start browsing and add files!</p>
                            <div className="cta-buttons">
                                {localStorage.getItem('token') ? (
                                    <>
                                        <button 
                                            className="cta-button cta-primary"
                                            onClick={() => setCurrentPage('home')}
                                        >
                                            Start Browsing
                                        </button>
                                        <button 
                                            className="cta-button cta-secondary"
                                            onClick={() => setCurrentPage('upload')}
                                        >
                                            Upload Files
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button 
                                            className="cta-button cta-primary"
                                            onClick={() => setCurrentPage('account')}
                                        >
                                            Join StudyLink
                                        </button>
                                        <button 
                                            className="cta-button cta-secondary"
                                            onClick={() => setCurrentPage('home')}
                                        >
                                            Browse Files
                                        </button>
                                    </>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            )}

            {currentPage === 'bookmarks' && (
                <div className="page page-with-search bookmarks">
                    <h1 className="page-title">My Bookmarks</h1>
                    <Bookmarks />
                </div>
            )}

            {currentPage === 'account' && (
                <div className="page account">
                    <AuthForm
                        onLoginSuccess={() => setCurrentPage('home')}
                        onNavigateHome={() => setCurrentPage('home')}
                        onNavigateToBookmarks={() => setCurrentPage('bookmarks')}
                        onNavigateToMyUploads={() => setCurrentPage('my-uploads')}
                    />
                </div>
            )}

            {currentPage === 'my-uploads' && (
                <div className="page page-with-search my-uploads">
                    <h1 className="page-title">My Uploads</h1>
                    <MyUploads
                        onViewFile={(fileId) => {
                            setViewingFileId(fileId);
                            setCurrentPage('view');
                        }}
                        onClassClick={(classId) => {
                            setViewingFileId(null);
                            const classIdStr = classId.toString();
                            if (!classFilter.includes(classIdStr)) {
                                setClassFilter([...classFilter, classIdStr]);
                            }
                            setCurrentPage('home');
                        }}
                    />
                </div>
            )}

            {currentPage === 'upload' && (
                <div className="page upload">
                    <UploadPage 
                        onUploadSuccess={() => {
                            // Optionally navigate to home after successful upload
                            // setCurrentPage('home');
                        }}
                        onNavigateToLogin={() => setCurrentPage('account')}
                        onNavigateToMyUploads={() => setCurrentPage('my-uploads')}
                        onNavigateHome={() => setCurrentPage('home')}
                    />
                </div>
            )}
            
            {currentPage === 'view' && viewingFileId && (
                <FileViewer 
                    fileId={viewingFileId}
                    onClose={() => {
                        setViewingFileId(null);
                        setCurrentPage('home');
                    }}
                    onClassClick={(classId) => {
                        setViewingFileId(null);
                        const classIdStr = classId.toString();
                        if (!classFilter.includes(classIdStr)) {
                            setClassFilter([...classFilter, classIdStr]);
                        }
                        setCurrentPage('home');
                    }}
                    onBookmarkClick={() => setShowAuthModal(true)}
                />
            )}
            
            {showAuthModal && (
                <AuthModal
                    onClose={() => setShowAuthModal(false)}
                    onLoginSuccess={() => {
                        setShowAuthModal(false);
                        window.location.reload(); // Refresh to update auth state
                    }}
                />
            )}
        </div>
    )
}
