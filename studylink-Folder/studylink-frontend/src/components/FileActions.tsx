import React, { useRef, useState, useEffect } from 'react';
import './FileActions.css';

export default function FileActions() {
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [error, setError] = useState<string>("")
    const fileInputRef = useRef<HTMLInputElement>(null)
    const modalRef = useRef<HTMLDivElement>(null)
    const uploadButtonRef = useRef<HTMLButtonElement>(null)

    function openModal() {
        setError("")
        setShowUploadModal(true)
    }

    function closeModal() {
        setShowUploadModal(false)
        uploadButtonRef.current?.focus() // return focus
    }

    function handleChooseFile() {
        // Programmatically opens the hidden file chooser
        fileInputRef.current?.click()
    }

    function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (file) {
            console.log("User selected file:", file)
            closeModal()  // close popup
        }
    }

    // -----------------------
    // Accessibility: ESC closes modal
    // -----------------------
    useEffect(() => {
        if (!showUploadModal) return

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") closeModal()
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [showUploadModal])

    // -----------------------
    // Accessibility: Focus trap + autofocus on modal open
    // -----------------------
    useEffect(() => {
        if (!showUploadModal || !modalRef.current) return

        const modalEl = modalRef.current
        const focusable = modalEl.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        function trapFocus(e: KeyboardEvent) {
            if (e.key !== "Tab") return

            // SHIFT+TAB
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault()
                last.focus()
            }
            // TAB
            else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault()
                first.focus()
            }
        }
        window.addEventListener("keydown", trapFocus)
        first.focus()

        return () => {
            window.removeEventListener("keydown", trapFocus)
        }
    }, [showUploadModal])

    return (
        <div className="file-actions">

            <button
                className="action-btn"
                onClick={openModal}
                ref={uploadButtonRef}
            >
                Upload
            </button>

            <button className="action-btn">
                Download
            </button>

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.doc,.docx,.txt,.png,.jpeg"
                style={{ display: 'none' }}
                onChange={handleFileSelected}
            />

            {/* Small pop-up modal */}
            {showUploadModal && (
                <div className="upload-modal" onClick={() => closeModal()}>
                    <div
                        className="upload-modal-content"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="upload-title"
                        ref={modalRef}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 id="upload-title">Select a file to upload</h3>

                        {error && <div className="error-box">{error}</div>}

                        <button onClick={handleChooseFile}>Choose File</button>
                        <button onClick={closeModal}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    )
}