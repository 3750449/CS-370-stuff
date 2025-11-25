import React, { useState, useEffect } from 'react';
import Tile from './Tile';
import './Grid.css';

// Fetches or renders provided files and centralizes empty/loading states for every grid-based view.
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

interface GridProps {
  searchTerm?: string;
  classFilter?: string[];
  onViewFile?: (fileId: number) => void;
  onClassClick?: (classId: number) => void;
  onBookmarkClick?: () => void;
  onClearFilters?: () => void;
  customFiles?: FileData[];
}

const Grid: React.FC<GridProps> = ({ searchTerm = '', classFilter = [], onViewFile, onClassClick, onBookmarkClick, onClearFilters, customFiles }) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classInfo, setClassInfo] = useState<{ subject: string; catalog: string; title: string } | null>(null);

  useEffect(() => {
    // If customFiles is provided, use them instead of fetching
    if (customFiles !== undefined) {
      setFiles(customFiles);
      setLoading(false);
      setError(null);
      return;
    }

    async function fetchFiles() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (searchTerm) {
          params.append('search', searchTerm);
        }
        if (classFilter.length > 0) {
          params.append('classId', classFilter.join(','));
        }
        
        const url = `/api/files${params.toString() ? `?${params.toString()}` : ''}`;
        const res = await fetch(url);
        
        if (!res.ok) {
          throw new Error('Failed to fetch files');
        }
        
        const data = await res.json();
        setFiles(data);
        
        // If filtering by a single class, get class info from first file
        if (classFilter.length === 1 && data.length > 0 && data[0].class) {
          setClassInfo({
            subject: data[0].class.subject,
            catalog: data[0].class.catalog,
            title: data[0].class.title
          });
        } else {
          setClassInfo(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load files');
        console.error('Error fetching files:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFiles();
  }, [searchTerm, classFilter, customFiles]);

  if (loading) {
    return (
      <div className="grid-loading">
        <p>Loading files...</p>
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

  if (files.length === 0) {
    const hasFilters = classFilter.length > 0 || searchTerm;
    
    return (
      <div className="grid-empty">
        <div className="grid-empty-icon">📚</div>
        {!hasFilters ? (
          <>
            <h3 className="grid-empty-title">No notes found</h3>
            <p className="grid-empty-message">
              It looks like no one has uploaded any notes yet. Be the first to share your study materials!
            </p>
          </>
        ) : (
          <>
            <h3 className="grid-empty-title">No notes found</h3>
            <p className="grid-empty-message">
              {classFilter.length > 0 && searchTerm
                ? "No notes match your search and selected classes."
                : classFilter.length > 0
                ? "No notes have been uploaded for the selected classes yet."
                : "No notes match your search."}
            </p>
            <div className="grid-empty-actions">
              {onClearFilters && (
                <button 
                  className="grid-empty-action-btn primary"
                  onClick={onClearFilters}
                >
                  Clear Filters
                </button>
              )}
              <p className="grid-empty-suggestion">
                Try {classFilter.length > 0 ? 'selecting different classes' : 'different search terms'} or{' '}
                {onClearFilters && (
                  <button 
                    className="grid-empty-link-btn"
                    onClick={onClearFilters}
                  >
                    browse all notes
                  </button>
                )}
              </p>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {classInfo && (
        <div className="class-filter-header">
          <div className="class-filter-breadcrumb">
            <span 
              className="breadcrumb-home"
              onClick={onClearFilters}
              title="Go back to all notes"
            >
              Home
            </span>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-class">{classInfo.subject} {classInfo.catalog}</span>
          </div>
          <div className="class-filter-title-section">
            <div className="class-filter-title-row">
              <h2>All {classInfo.subject} {classInfo.catalog} Notes</h2>
              {onClearFilters && (
                <button 
                  className="clear-class-filter-btn"
                  onClick={onClearFilters}
                  title="Show all notes"
                >
                  Show All Notes
                </button>
              )}
            </div>
            <p className="class-filter-subtitle">{classInfo.title}</p>
          </div>
        </div>
      )}
      <div className="grid">
        {files.map((file) => (
          <Tile 
            key={file.id} 
            file={file}
            onViewFile={onViewFile}
            onClassClick={onClassClick}
            onBookmarkClick={onBookmarkClick}
          />
        ))}
      </div>
    </>
  );
};

export default Grid;
