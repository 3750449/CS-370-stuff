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
                    <div className="page-content">
                        <h2>About StudyLink</h2>
                        <p>
                            StudyLink is a secure file-sharing platform designed for educational institutions. 
                            Our mission is to help students organize, share, and discover course materials efficiently.
                        </p>
                        <h3>Features</h3>
                        <ul>
                            <li>Upload and organize course files by class</li>
                            <li>Search and filter files by name or course</li>
                            <li>Bookmark important files for quick access</li>
                            <li>Secure authentication with .edu email addresses</li>
                        </ul>
                        <p>
                            StudyLink makes it easy to find and share study materials with your classmates.
                        </p>
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
