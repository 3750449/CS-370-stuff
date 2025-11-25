import { useState, useEffect } from 'react';
import './UploadPage.css';

// UploadPage drives the file submission flow, including auth gating, searchable class selection, and post-upload CTAs.

interface Class {
  id: number;
  subject: string;
  catalog: string;
  title: string;
  csNumber: string;
}

interface UploadPageProps {
  onUploadSuccess?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToMyUploads?: () => void;
  onNavigateHome?: () => void;
}

export default function UploadPage({ onUploadSuccess, onNavigateToLogin, onNavigateToMyUploads, onNavigateHome }: UploadPageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [classSearchTerm, setClassSearchTerm] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch('/api/classes');
        if (res.ok) {
          const data = await res.json();
          setClasses(data);
        }
      } catch (err) {
        console.error('Failed to fetch classes:', err);
      }
    }
    fetchClasses();
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        setMessage({ type: 'error', text: 'File size must be less than 50MB' });
        return;
      }
      setSelectedFile(file);
      // Set default filename to original filename
      setFileName(file.name);
      setMessage(null);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setMessage({ type: 'error', text: 'Please log in to upload files' });
      return;
    }

    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select a file to upload' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'Authentication required. Please log in.' });
        setUploading(false);
        return;
      }

      // Validate filename
      if (!fileName || fileName.trim() === '') {
        setMessage({ type: 'error', text: 'Please enter a file name' });
        setUploading(false);
        return;
      }

      // Create FormData for multipart/form-data upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('fileName', fileName.trim());
      
      // Add classId if selected
      if (selectedClassId) {
        formData.append('classId', selectedClassId);
      }

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data?.error || 'Upload failed' });
      } else {
        setMessage({ 
          type: 'success', 
          text: `File "${data.originalName}" uploaded successfully!` 
        });
        
        // Reset form
        setSelectedFile(null);
        setFileName('');
        setSelectedClassId('');
        if (e.target instanceof HTMLFormElement) {
          e.target.reset();
        }
        
        // Call success callback if provided
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  if (!isAuthenticated) {
    return (
      <div className="upload-page">
        <div className="upload-card">
          <h2>Upload File</h2>
          <div className="auth-required-message">
            <p>Please log in to upload files.</p>
            <div className="auth-action-buttons">
              {onNavigateToLogin && (
                <button 
                  type="button"
                  onClick={onNavigateToLogin}
                  className="login-link-button"
                >
                  Log In / Create Account
                </button>
              )}
              {onNavigateHome && (
                <button 
                  type="button"
                  onClick={onNavigateHome}
                  className="go-back-button"
                >
                  ← Go Back to Main Page
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-page">
      <div className="upload-card">
        <div className="upload-header">
          <h2>Upload File</h2>
          {onNavigateHome && (
            <button 
              type="button"
              onClick={onNavigateHome}
              className="go-back-button go-back-header"
            >
              ← Go Back
            </button>
          )}
        </div>
        <p className="upload-description">
          Upload course materials, notes, or study resources. Files can be associated with a specific course.
        </p>

        <form onSubmit={handleUpload} className="upload-form">
          {/* File Input */}
          <div className="form-group">
            <label htmlFor="file-input" className="file-label">
              Select File
            </label>
            <input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              className="file-input"
              required
            />
            {selectedFile && (
              <div className="file-info">
                <strong>Selected:</strong> {selectedFile.name}
                <br />
                <small>Size: {formatFileSize(selectedFile.size)}</small>
                <br />
                <small>Type: {selectedFile.type || 'Unknown'}</small>
              </div>
            )}
          </div>

          {/* File Name Input */}
          {selectedFile && (
            <div className="form-group">
              <label htmlFor="file-name-input" className="file-label">
                File Name (as it will be displayed)
              </label>
              <input
                id="file-name-input"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="file-input"
                placeholder="Enter file name"
                required
                maxLength={255}
              />
              <small className="file-name-hint">
                This name will be displayed to all users. You cannot change it after upload.
              </small>
            </div>
          )}

          {/* Course Selector (Optional) */}
          <div className="form-group">
            <label htmlFor="class-select" className="class-label">
              Associate with Course (Optional)
            </label>
            <input
              type="text"
              placeholder="Search for a course..."
              value={classSearchTerm}
              onChange={(e) => setClassSearchTerm(e.target.value)}
              className="class-search-input"
            />
            <div className="class-select-container">
              <div className="class-select-list">
                <label className="class-select-item">
                  <input
                    type="radio"
                    name="class-select"
                    value=""
                    checked={selectedClassId === ''}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                  />
                  <span className="class-select-label">-- No course association --</span>
                </label>
                {classes
                  .filter((cls) => {
                    if (!classSearchTerm) return true;
                    const searchLower = classSearchTerm.toLowerCase();
                    return (
                      cls.subject.toLowerCase().includes(searchLower) ||
                      cls.catalog.toLowerCase().includes(searchLower) ||
                      cls.title.toLowerCase().includes(searchLower) ||
                      cls.csNumber.toLowerCase().includes(searchLower)
                    );
                  })
                  .map((cls) => (
                    <label key={cls.id} className="class-select-item">
                      <input
                        type="radio"
                        name="class-select"
                        value={cls.id.toString()}
                        checked={selectedClassId === cls.id.toString()}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                      />
                      <span className="class-select-label">
                        {cls.subject} {cls.catalog} - {cls.title}
                      </span>
                    </label>
                  ))}
              </div>
            </div>
            {selectedClassId && (() => {
              const selectedClass = classes.find(c => c.id.toString() === selectedClassId);
              return selectedClass ? (
                <div className="selected-class-display">
                  Selected: {selectedClass.subject} {selectedClass.catalog} - {selectedClass.title}
                </div>
              ) : null;
            })()}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="upload-button"
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </form>

        {/* Message Display */}
        {message && (
          <div className={`message ${message.type}`}>
            <p>{message.text}</p>
            {message.type === 'success' && onNavigateToMyUploads && (
              <button
                type="button"
                onClick={onNavigateToMyUploads}
                className="view-uploads-link-btn"
              >
                See all your uploaded files →
              </button>
            )}
          </div>
        )}

        {/* Link to View All Uploads */}
        {onNavigateToMyUploads && (
          <div className="view-uploads-section">
            <p>
              <button
                type="button"
                onClick={onNavigateToMyUploads}
                className="view-uploads-link"
              >
                View all your uploaded files
              </button>
            </p>
          </div>
        )}

        {/* Upload Guidelines */}
        <div className="upload-guidelines">
          <h3>Upload Guidelines</h3>
          <ul>
            <li>Maximum file size: 50MB</li>
            <li>All file types are accepted</li>
            <li>Files are publicly accessible after upload</li>
            <li>You can delete your own files at any time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

