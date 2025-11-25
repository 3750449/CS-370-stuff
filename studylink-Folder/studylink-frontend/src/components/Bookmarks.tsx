import React, { useState, useEffect, useCallback } from 'react';
import Tile from './Tile';
import SearchBar from './SearchBar';
import './Grid.css';

// Dedicated page for a user's bookmarks; mirrors My Uploads layout but sources data from /bookmarks.
interface FileData {
  id: number;
  originalName: string;
  size: string;
  fileType: string;
  uploadedAt: string;
  class: {
    id: number;
    subject: string;
    catalog: string;
    title: string;
    csNumber: string;
  } | null;
}

const Bookmarks: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string[]>([]);

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view your bookmarks');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/files/bookmarks', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        setError('Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to fetch bookmarks');
      }

      const data = await res.json();
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookmarks');
      console.error('Error fetching bookmarks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  useEffect(() => {
    function handleBookmarkUpdated(event: Event) {
      const customEvent = event as CustomEvent<{ fileId: number; bookmarked: boolean }>;
      const detail = customEvent.detail;
      if (!detail) return;

      if (detail.bookmarked) {
        fetchBookmarks();
      } else {
        setFiles(prev => prev.filter(f => f.id !== detail.fileId));
      }
    }

    window.addEventListener('bookmark-updated', handleBookmarkUpdated);
    return () => window.removeEventListener('bookmark-updated', handleBookmarkUpdated);
  }, [fetchBookmarks]);

  // Filter files based on search term and class filter
  const filteredFiles = files.filter(file => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const compactSearch = normalizedSearch.replace(/\s+/g, '');

    const combinedText = [
      file.originalName,
      file.class?.subject,
      file.class?.catalog,
      file.class?.title,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const combinedCompact = combinedText.replace(/\s+/g, '');

    const matchesSearch =
      !normalizedSearch ||
      combinedText.includes(normalizedSearch) ||
      (compactSearch ? combinedCompact.includes(compactSearch) : false);
    
    const matchesClass =
      classFilter.length === 0 ||
      classFilter.some(filterId => {
        if (filterId === 'no-class') {
          return !file.class;
        }
        return file.class && file.class.id.toString() === filterId;
      });
    
    return matchesSearch && matchesClass;
  });

  // Handle unbookmark - refresh the list
  const handleUnbookmark = async (fileId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`/api/files/${fileId}/bookmark`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok || res.status === 204) {
        // Remove from local state
        setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
      }
    } catch (err) {
      console.error('Error unbookmarking file:', err);
    }
  };

  if (loading) {
    return (
      <div className="grid-loading">
        <p>Loading bookmarks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid-error">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bookmarks-page">
      <SearchBar 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        classFilter={classFilter}
        onClassFilterChange={setClassFilter}
      />
      
      {filteredFiles.length === 0 ? (
        <div className="grid-empty">
          <div className="grid-empty-icon">⭐</div>
          <h3 className="grid-empty-title">No bookmarks yet</h3>
          <p className="grid-empty-message">
            {files.length === 0 
              ? "You haven't bookmarked any files yet. Start bookmarking files to see them here!"
              : "No bookmarks match your search criteria."}
          </p>
          {files.length === 0 && (
            <div className="grid-empty-actions">
              <button 
                className="grid-empty-action-btn primary" 
                onClick={() => window.location.href = '/'}
                title="Browse all files"
              >
                Browse all files
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid">
          {filteredFiles.map((file) => (
            <Tile 
              key={file.id} 
              file={file}
              onUnbookmark={() => handleUnbookmark(file.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Bookmarks;

