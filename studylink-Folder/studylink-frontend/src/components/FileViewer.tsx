import React, { useState, useEffect } from 'react';
import './FileViewer.css';

// Full-screen detail view: fetches metadata/preview and exposes bookmark/delete/class navigation controls.
interface FileViewerProps {
  fileId: number;
  onClose: () => void;
  onClassClick?: (classId: number) => void;
  onBookmarkClick?: () => void;
}

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

const FileViewer: React.FC<FileViewerProps> = ({ fileId, onClose, onClassClick, onBookmarkClick }) => {
  const [file, setFile] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function checkBookmark() {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch('/api/files/bookmarks', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const bookmarks = await res.json();
          setIsBookmarked(bookmarks.some((b: FileData) => b.id === fileId));
        }
      } catch (err) {
        console.error('Error checking bookmark:', err);
      }
    }
    
    checkBookmark();
  }, [fileId]);

  useEffect(() => {
    async function fetchFile() {
      try {
        // Get file metadata first
        const metaRes = await fetch(`/api/files`);
        if (metaRes.ok) {
          const files = await metaRes.json();
          const fileData = files.find((f: FileData) => f.id === fileId);
          if (fileData) {
            setFile(fileData);
            // Check if current user is the owner
            const token = localStorage.getItem('token');
            if (token && fileData.ownerId) {
              try {
                // Decode JWT to get user email
                const parts = token.split('.');
                if (parts.length !== 3) {
                  setIsOwner(false);
                  return;
                }
                const payload = JSON.parse(atob(parts[1]));
                setIsOwner(payload.email === fileData.ownerId || payload.id === fileData.ownerId);
              } catch (err) {
                console.error('Error decoding JWT token:', err);
                setIsOwner(false);
              }
            }
          }
        }
        
        // Create blob URL for preview
        const res = await fetch(`/api/files/${fileId}/preview`);
        if (!res.ok) {
          throw new Error('Failed to fetch file');
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setFileUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    }

    fetchFile();

    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileId]);

  async function handleDownload() {
    try {
      const res = await fetch(`/api/files/${fileId}`);
      if (!res.ok) throw new Error('Download failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file?.originalName || 'file';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download file');
    }
  }

  async function handleSave() {
    const token = localStorage.getItem('token');
    if (!token) {
      if (onBookmarkClick) {
        onBookmarkClick();
      }
      return;
    }

    try {
      if (isBookmarked) {
        // Unbookmark
        const res = await fetch(`/api/files/${fileId}/bookmark`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok || res.status === 204) {
          setIsBookmarked(false);
        }
      } else {
        // Bookmark
        const res = await fetch(`/api/files/${fileId}/bookmark`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setIsBookmarked(true);
        }
      }
    } catch (err) {
      console.error('Bookmark error:', err);
      alert('Failed to update bookmark');
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${file?.originalName}"?`)) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to delete files');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok || res.status === 204) {
        alert('File deleted successfully');
        onClose();
      } else {
        const data = await res.json();
        if (res.status === 403) {
          alert('You can only delete files you uploaded');
        } else {
          alert(data.error || 'Failed to delete file');
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete file');
    } finally {
      setIsDeleting(false);
    }
  }

  function formatFileSize(bytes: string): string {
    const numBytes = parseInt(bytes, 10);
    if (numBytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(numBytes) / Math.log(k));
    return Math.round((numBytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  if (loading) {
    return (
      <div className="file-viewer-page">
        <div className="file-viewer-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-viewer-page">
        <div className="file-viewer-error">Error: {error}</div>
        <button className="file-viewer-back-btn" onClick={onClose}>
          ← Back
        </button>
      </div>
    );
  }

  const isPdf = file?.fileType === 'application/pdf' || file?.originalName.toLowerCase().endsWith('.pdf');
  const isImage = file?.fileType?.startsWith('image/');

  return (
    <div className="file-viewer-page">
      <div className="file-viewer-header-section">
        <div className="file-viewer-header-content">
          <h1 className="file-viewer-document-title">{file?.originalName || 'File'}</h1>
          
          <div className="file-viewer-metadata">
            {file?.class && (
              <div className="file-viewer-meta-item">
                <span className="file-viewer-meta-label">Course:</span>
                <span 
                  className="file-viewer-meta-value clickable-course"
                  onClick={() => onClassClick && onClassClick(file.class!.id)}
                >
                  {file.class.subject} {file.class.catalog} - {file.class.title}
                </span>
              </div>
            )}
            <div className="file-viewer-meta-item">
              <span className="file-viewer-meta-label">Uploaded:</span>
              <span className="file-viewer-meta-value">
                {file?.uploadedAt && new Date(file.uploadedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="file-viewer-meta-item">
              <span className="file-viewer-meta-label">Size:</span>
              <span className="file-viewer-meta-value">{file && formatFileSize(file.size)}</span>
            </div>
          </div>
          
          <div className="file-viewer-actions-bar">
            <button 
              className={`file-viewer-save-btn ${isBookmarked ? 'saved' : ''}`}
              onClick={handleSave}
              title={isBookmarked ? 'Remove from saved' : 'Save to bookmarks'}
            >
              {isBookmarked ? '⭐ Saved' : '☆ Save'}
            </button>
            <button className="file-viewer-download-btn" onClick={handleDownload}>
              Download
            </button>
            {isOwner && (
              <button 
                className="file-viewer-delete-btn" 
                onClick={handleDelete}
                disabled={isDeleting}
                title="Delete this file"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            <button className="file-viewer-back-btn" onClick={onClose}>
              ← Back
            </button>
          </div>
        </div>
      </div>
      
      <div className="file-viewer-content-section">
        {isPdf ? (
          <iframe
            src={`/api/files/${fileId}/preview`}
            className="file-viewer-iframe"
            title={file?.originalName}
          />
        ) : isImage ? (
          <div className="file-viewer-image-container">
            <img src={fileUrl || ''} alt={file?.originalName} className="file-viewer-image" />
          </div>
        ) : (
          <iframe
            src={fileUrl || ''}
            className="file-viewer-iframe"
            title={file?.originalName}
          />
        )}
      </div>
    </div>
  );
};

export default FileViewer;
