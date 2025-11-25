import React, { useState, useEffect } from 'react';
import './Tile.css';

// Tile renders a single file card with preview/bookmark/delete affordances reused across pages.
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

interface TileProps {
  file: FileData;
  onUnbookmark?: () => void;
  onViewFile?: (fileId: number) => void;
  onClassClick?: (classId: number) => void;
  onBookmarkClick?: () => void;
  showBookmarkButton?: boolean;
  onDelete?: (fileId: number) => Promise<void> | void;
  isDeleting?: boolean;
}

const Tile: React.FC<TileProps> = ({ 
  file, 
  onUnbookmark, 
  onViewFile, 
  onClassClick, 
  onBookmarkClick,
  showBookmarkButton = true,
  onDelete,
  isDeleting = false
}) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [textPreview, setTextPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!showBookmarkButton) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    // Check if file is bookmarked
    async function checkBookmark() {
      try {
        const res = await fetch('/api/files/bookmarks', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const bookmarks = await res.json();
          setIsBookmarked(bookmarks.some((b: FileData) => b.id === file.id));
        }
      } catch (err) {
        console.error('Error checking bookmark:', err);
      }
    }

    checkBookmark();
  }, [file.id, showBookmarkButton]);

  // Generate preview for images, text files, and PDFs
  useEffect(() => {
    // More robust PDF detection - check fileType and filename
    const fileTypeLower = (file.fileType || '').toLowerCase();
    const fileNameLower = (file.originalName || '').toLowerCase();
    
    const isImage = fileTypeLower.startsWith('image/');
    const isPdf = fileTypeLower === 'application/pdf' || 
                  fileTypeLower.includes('pdf') ||
                  fileNameLower.endsWith('.pdf');
    const isText = fileTypeLower.includes('text') || 
                   fileTypeLower === 'application/json' ||
                   fileNameLower.endsWith('.txt') ||
                   fileNameLower.endsWith('.md') ||
                   fileNameLower.endsWith('.js') ||
                   fileNameLower.endsWith('.ts') ||
                   fileNameLower.endsWith('.tsx') ||
                   fileNameLower.endsWith('.jsx') ||
                   fileNameLower.endsWith('.css') ||
                   fileNameLower.endsWith('.html') ||
                   fileNameLower.endsWith('.json');

    if (!isImage && !isText && !isPdf) {
      setPreviewUrl(null);
      setTextPreview(null);
      setPreviewError(false);
      setPreviewLoading(false);
      return;
    }
    
    // For PDFs, we don't need to load anything - just show iframe
    if (isPdf) {
      setPreviewLoading(false);
      return;
    }

    let objectUrl: string | null = null;
    
    async function loadPreview() {
      setPreviewLoading(true);
      setPreviewError(false);
      try {
        // Use preview endpoint for inline display (no download headers)
        const res = await fetch(`/api/files/${file.id}/preview`);
        if (res.ok) {
          if (isImage) {
            // Handle image preview
            const blob = await res.blob();
            if (blob.type.startsWith('image/')) {
              objectUrl = URL.createObjectURL(blob);
              setPreviewUrl(objectUrl);
            } else {
              setPreviewError(true);
            }
          } else if (isPdf) {
            // PDFs use iframe directly - no need to load here
            setPreviewLoading(false);
            return;
          } else if (isText) {
            // Handle text preview
            const text = await res.text();
            // Show first 10 lines or first 500 characters, whichever is shorter
            const lines = text.split('\n').slice(0, 10);
            const preview = lines.join('\n');
            if (preview.length > 500) {
              setTextPreview(preview.substring(0, 500) + '...');
            } else {
              setTextPreview(preview);
            }
          }
        } else {
          setPreviewError(true);
        }
      } catch (err) {
        console.error('Error loading preview:', err);
        setPreviewError(true);
      } finally {
        setPreviewLoading(false);
      }
    }
    
    loadPreview();
    
    // Cleanup: revoke object URL when component unmounts or file changes
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file.id, file.fileType, file.originalName]);

  // Format file size
  function formatFileSize(bytes: string): string {
    const numBytes = parseInt(bytes, 10);
    if (numBytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(numBytes) / Math.log(k));
    return Math.round((numBytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // Format date
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  async function handleDownload() {
    try {
      const res = await fetch(`/api/files/${file.id}`);
      if (!res.ok) throw new Error('Download failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download file');
    }
  }

  async function handleBookmark() {
    if (!showBookmarkButton) return;
    const token = localStorage.getItem('token');
    if (!token) {
      if (onBookmarkClick) {
        onBookmarkClick();
      } else {
        alert('Please log in to bookmark files');
      }
      return;
    }

    try {
      if (isBookmarked) {
        // Unbookmark
        const res = await fetch(`/api/files/${file.id}/bookmark`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok || res.status === 204) {
          setIsBookmarked(false);
          // Call callback if provided (e.g., to remove from bookmarks page)
          if (onUnbookmark) {
            onUnbookmark();
          }
          window.dispatchEvent(new CustomEvent('bookmark-updated', {
            detail: { fileId: file.id, bookmarked: false }
          }));
        }
      } else {
        // Bookmark
        const res = await fetch(`/api/files/${file.id}/bookmark`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setIsBookmarked(true);
          window.dispatchEvent(new CustomEvent('bookmark-updated', {
            detail: { fileId: file.id, bookmarked: true }
          }));
        }
      }
    } catch (err) {
      console.error('Bookmark error:', err);
      alert('Failed to update bookmark');
    }
  }

  function handleDeleteClick() {
    if (!onDelete) return;
    onDelete(file.id);
  }


  return (
    <div className="tile">
      <div className="tile-header">
        {file.class ? (
          <span 
            className="tile-class clickable-class-code"
            onClick={() => onClassClick && onClassClick(file.class!.id)}
            title={`View all ${file.class.subject} ${file.class.catalog} notes`}
          >
            {file.class.subject} {file.class.catalog}
          </span>
        ) : (
          <span className="tile-class">No class</span>
        )}
        <span className="tile-age">{formatDate(file.uploadedAt)}</span>
      </div>
      
      {/* File Preview */}
      {previewLoading ? (
        <div className="tile-preview-placeholder">
          <div className="tile-loading">Loading preview...</div>
        </div>
      ) : previewUrl && !previewError ? (
        <div className="tile-preview">
          <img 
            src={previewUrl} 
            alt={file.originalName} 
            className="tile-preview-image"
            onError={() => setPreviewError(true)}
          />
        </div>
      ) : (file.fileType === 'application/pdf' || file.originalName.toLowerCase().endsWith('.pdf')) ? (
        <div className="tile-preview">
          <iframe
            src={`/api/files/${file.id}/preview#page=1&zoom=page-width&toolbar=0&navpanes=0`}
            className="tile-preview-pdf"
            title={`Preview of ${file.originalName}`}
          />
        </div>
      ) : textPreview ? (
        <div className="tile-preview-text">
          <pre className="tile-text-content">{textPreview}</pre>
        </div>
      ) : (
        <div className="tile-preview-placeholder">
          <div className="tile-file-icon">
            {file.fileType.includes('pdf') ? '📄' : 
             file.fileType.includes('image') ? '🖼️' :
             file.fileType.includes('text') ? '📝' : '📎'}
          </div>
        </div>
      )}
      
      <h3 
        className="tile-title clickable-title" 
        title={file.originalName}
        onClick={() => {
          if (onViewFile) {
            onViewFile(file.id);
          } else {
            window.open(`/api/files/${file.id}`, '_blank');
          }
        }}
      >
        {file.originalName.length > 50 
          ? file.originalName.substring(0, 50) + '...' 
          : file.originalName}
      </h3>
      
      {file.class && (
        <p className="tile-class-title">
          {file.class.title}
        </p>
      )}
      
      <div className="tile-footer">
        <span className="tile-size">{formatFileSize(file.size)}</span>
        <div className="tile-actions">
          <button 
            className="tile-action-btn download-btn" 
            onClick={handleDownload}
            title="Download"
          >
            Download
          </button>
          {showBookmarkButton && (
            <button 
              className={`tile-action-btn ${isBookmarked ? 'bookmarked' : ''}`}
              onClick={handleBookmark}
              title={isBookmarked ? 'Unbookmark' : 'Bookmark'}
            >
              {isBookmarked ? '⭐' : '☆'}
            </button>
          )}
          {onDelete && (
            <button 
              className="tile-action-btn delete-btn"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              title="Delete this file"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tile;
