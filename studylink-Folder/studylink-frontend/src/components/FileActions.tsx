import React, { useRef, useState } from 'react'
import './FileActions.css'

export default function FileActions() {
    const [showUploadModal, setShowUploadModal] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    function handleChooseFile() {
        // Programmatically opens the hidden file chooser
        fileInputRef.current?.click()
    }

    function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (file) {
            console.log("User selected file:", file)
            setShowUploadModal(false)  // close popup
        }
    }

    return (
        <div className="file-actions">

            <button
                className="action-btn"
                onClick={() => setShowUploadModal(true)}
            >
                Upload
            </button>

            <button
                className="action-btn"
                onClick={() => console.log("Download clicked")}
            >
                Download
            </button>

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileSelected}
            />

            {/* Small pop-up modal */}
            {showUploadModal && (
                <div className="upload-modal">
                    <div className="upload-modal-content">
                        <h3>Select a file to upload</h3>
                        <button onClick={handleChooseFile}>Choose File</button>
                        <button onClick={() => setShowUploadModal(false)}>Cancel</button>
                    </div>
                </div>
            )}

        </div>
    )
}