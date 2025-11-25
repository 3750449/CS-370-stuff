import React, { useState, useEffect } from 'react';
import Tile from './Tile';
import SearchBar from './SearchBar';
import './MyUploads.css';

// MyUploads mirrors the bookmarks grid but fetches /my-uploads, enabling delete actions and owner-only UI.
interface FileData {
  id: number;
  originalName: string;
  size: string;
  fileType: string;
  uploadedAt: string;
  ownerId?: string | null;
  class: {
    id: number;
    subject: string;
    catalog: string;
    title: string;
    csNumber: string;
  } | null;
}

interface MyUploadsProps {
  onViewFile?: (fileId: number) => void;
  onClassClick?: (classId: number) => void;
}

const MyUploads: React.FC<MyUploadsProps> = ({ onViewFile, onClassClick }) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    
    if (!token) {
      setError('Please log in to view your uploads');
      setLoading(false);
      return;
    }

    async function fetchMyUploads() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/files/my-uploads', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.status === 401) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setError('Session expired. Please log in again.');
          setLoading(false);
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to fetch your uploads');
        }

        const data = await res.json();
        setFiles(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load your uploads');
        console.error('Error fetching my uploads:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMyUploads();
  }, []);

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

  async function handleDelete(fileId: number) {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to delete files');
      return;
    }

    setDeletingIds(prev => new Set(prev).add(fileId));
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok || res.status === 204) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete file');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete file');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="my-uploads-page">
        <div className="my-uploads-error">
          <p>Please log in to view your uploads.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="my-uploads-page">
        <div className="my-uploads-loading">
          <p>Loading your uploads...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-uploads-page">
        <div className="my-uploads-error">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bookmarks-page my-uploads-page">
      <SearchBar 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        classFilter={classFilter}
        onClassFilterChange={setClassFilter}
      />

      {filteredFiles.length === 0 ? (
        <div className="grid-empty">
          <div className="grid-empty-icon">📂</div>
          <h3 className="grid-empty-title">No uploads yet</h3>
          <p className="grid-empty-message">
            {files.length === 0 
              ? 'You have not uploaded any files yet.'
              : 'No uploads match your search or class filter.'}
          </p>
        </div>
      ) : (
        <div className="grid">
          {filteredFiles.map((file) => (
            <Tile 
              key={file.id} 
              file={file}
              onViewFile={onViewFile}
              onClassClick={onClassClick}
              showBookmarkButton={false}
              onDelete={handleDelete}
              isDeleting={deletingIds.has(file.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyUploads;

