import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Header.css';
import LinkLogo from '../assets/logo-link.svg';

// Central navigation bar: owns the search input, filter chips/panel, and auth-aware nav buttons.
type PageName = 'home' | 'about' | 'account' | 'upload' | 'bookmarks' | 'my-uploads'

interface HeaderProps {
    onNavigate: (page: PageName) => void;
    searchTerm?: string;
    onSearchChange?: (term: string) => void;
    classFilter?: string[];
    onClassFilterChange?: (classIds: string[]) => void;
    showSearch?: boolean;
}

interface Class {
    id: number;
    subject: string;
    catalog: string;
    title: string;
    csNumber: string;
}

const Header: React.FC<HeaderProps> = ({ 
    onNavigate, 
    searchTerm = '', 
    onSearchChange,
    classFilter = [],
    onClassFilterChange,
    showSearch = false
}) => {
    const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
    const [classes, setClasses] = useState<Class[]>([]);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [classSearchTerm, setClassSearchTerm] = useState('');
    const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set(classFilter));
    const [showAllFilters, setShowAllFilters] = useState(false);
    const headerRef = useRef<HTMLElement | null>(null);
    const activeFiltersBarRef = useRef<HTMLDivElement | null>(null);
    const [headerHeight, setHeaderHeight] = useState(73);
    const [filterPanelTop, setFilterPanelTop] = useState(73);
    
    const isAuthenticated = !!localStorage.getItem('token');
    
    // Fetch classes for filter
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
        if (showSearch) {
            fetchClasses();
        }
    }, [showSearch]);
    
    // Sync local search term
    useEffect(() => {
        setLocalSearchTerm(searchTerm);
    }, [searchTerm]);
    
    // Sync selected class IDs
    useEffect(() => {
        setSelectedClassIds(new Set(classFilter));
    }, [classFilter]);
    
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLocalSearchTerm(value);
        if (onSearchChange) {
            onSearchChange(value);
        }
    };
    
    const handleClassToggle = (classId: string) => {
        const newSelected = new Set(selectedClassIds);
        if (newSelected.has(classId)) {
            newSelected.delete(classId);
        } else {
            newSelected.add(classId);
        }
        setSelectedClassIds(newSelected);
        if (onClassFilterChange) {
            onClassFilterChange(Array.from(newSelected));
        }
    };
    
    const handleClearFilters = () => {
        setLocalSearchTerm('');
        setSelectedClassIds(new Set());
        if (onSearchChange) {
            onSearchChange('');
        }
        if (onClassFilterChange) {
            onClassFilterChange([]);
        }
    };
    
    const hasActiveFilters = Boolean(localSearchTerm) || selectedClassIds.size > 0;

    // Measure the header + chip bar so the floating filter drawer always sits right beneath them.
    const updateFilterPanelPosition = useCallback(() => {
        const headerHeightValue = headerRef.current?.offsetHeight ?? 0;
        const filtersHeightValue = showSearch && hasActiveFilters
            ? (activeFiltersBarRef.current?.offsetHeight ?? 0)
            : 0;
        setHeaderHeight(headerHeightValue);
        setFilterPanelTop(headerHeightValue + filtersHeightValue);
    }, [showSearch, hasActiveFilters]);

    useEffect(() => {
        updateFilterPanelPosition();
        window.addEventListener('resize', updateFilterPanelPosition);
        return () => window.removeEventListener('resize', updateFilterPanelPosition);
    }, [updateFilterPanelPosition, selectedClassIds.size, showAllFilters]);
    
    const handleBookmarksClick = () => {
        if (!isAuthenticated) {
            alert('Please log in to view your bookmarks');
            onNavigate('account');
            return;
        }
        onNavigate('bookmarks');
    };

    const handleMyUploadsClick = () => {
        if (!isAuthenticated) {
            alert('Please log in to view your uploads');
            onNavigate('account');
            return;
        }
        onNavigate('my-uploads');
    };
    
    const handleLogout = () => {
        if (confirm('Are you sure you want to log out?')) {
            localStorage.removeItem('token');
            // Force page reload to update authentication state
            window.location.href = '/';
        }
    };
    
    return (
        <>
            <header className="main-header" ref={headerRef}>
                <div className="header-content">
                    <h1 
                            className="site-title" 
                            onClick={() => {
                                if (typeof onNavigate === 'function') {
                                    const event = new CustomEvent('clear-home-filters');
                                    window.dispatchEvent(event);
                                    onNavigate('home');
                                }
                            }}
                          >
                        <img src={LinkLogo} alt="" aria-hidden="true" className="site-title-icon" />
                        <span className="site-title-text">StudyLink</span>
                    </h1>
                    
                    {showSearch && (
                        <div className="header-search-container">
                            <div className="header-search-wrapper">
                                <input
                                    type="text"
                                    placeholder="Search for notes using name or class name..."
                                    className="header-search-input"
                                    value={localSearchTerm}
                                    onChange={handleSearchChange}
                                />
                                <button 
                                    className={`filter-icon-btn ${hasActiveFilters ? 'active' : ''}`}
                                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                                    title="Filters"
                                >
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 5h14M5 10h10M7 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                </button>
                            </div>
                            {hasActiveFilters && (
                                <button 
                                    className="clear-filters-btn"
                                    onClick={handleClearFilters}
                                    title="Clear all filters and show all notes"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    )}
                    
        <nav className="main-nav">
                        <button onClick={() => onNavigate('upload')} className="upload-nav-btn">
                            <span className="nav-button-icon" aria-hidden>⬆</span>
                            <span>Upload</span>
                        </button>
                        {isAuthenticated && (
                            <button onClick={handleBookmarksClick}>Bookmarks</button>
                        )}
                        {isAuthenticated && (
                            <button onClick={handleMyUploadsClick}>My Uploads</button>
                        )}
                        <button onClick={() => onNavigate('account')}>
                            {isAuthenticated ? 'Account' : 'Log In / Create Account'}
                        </button>
                        <button onClick={() => onNavigate('about')}>About Us</button>
            {isAuthenticated && (
                            <button onClick={handleLogout} className="logout-nav-btn">Log Out</button>
                        )}
                    </nav>
                </div>
            </header>
            
            {showSearch && hasActiveFilters && selectedClassIds.size > 0 && (
                <div
                    className="active-filters-bar"
                    ref={activeFiltersBarRef}
                    style={{ top: headerHeight }}
                >
                    <div className="active-filters-content">
                        <div className="selected-filters">
                            {Array.from(selectedClassIds)
                                .slice(0, showAllFilters ? selectedClassIds.size : 3)
                                .map(classId => {
                                    if (classId === 'no-class') {
                                        return (
                                            <span key={classId} className="filter-tag">
                                                No class associated
                                                <button
                                                    className="filter-tag-remove"
                                                    onClick={() => handleClassToggle(classId)}
                                                    title="Remove filter"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        );
                                    }
                                    const cls = classes.find(c => c.id.toString() === classId);
                                    return cls ? (
                                        <span key={classId} className="filter-tag">
                                            {cls.subject} {cls.catalog}
                                            <button
                                                className="filter-tag-remove"
                                                onClick={() => handleClassToggle(classId)}
                                                title="Remove filter"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ) : null;
                                })}
                            {selectedClassIds.size > 3 && !showAllFilters && (
                                <button
                                    className="filter-more-btn"
                                    onClick={() => setShowAllFilters(true)}
                                    title={`Show ${selectedClassIds.size - 3} more filters`}
                                >
                                    +{selectedClassIds.size - 3} more
                                </button>
                            )}
                            {showAllFilters && selectedClassIds.size > 3 && (
                                <button
                                    className="filter-less-btn"
                                    onClick={() => setShowAllFilters(false)}
                                    title="Show fewer filters"
                                >
                                    Show less
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {showSearch && showFilterPanel && (
                <div
                    className="filter-panel"
                    style={{
                        top: filterPanelTop,
                        maxHeight: `calc(100vh - ${filterPanelTop}px)`
                    }}
                >
                    <div className="filter-panel-content">
                        <div className="filter-panel-header">
                            <h3>Filters</h3>
                            <button 
                                className="close-filter-btn"
                                onClick={() => setShowFilterPanel(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="filter-panel-body">
                            <div className="filter-group">
                                <label htmlFor="header-class-search">Search Classes:</label>
                                <input
                                    id="header-class-search"
                                    type="text"
                                    placeholder="Search classes..."
                                    className="class-search-input"
                                    value={classSearchTerm}
                                    onChange={(e) => setClassSearchTerm(e.target.value)}
                                />
                                <div className="class-filter-list">
                                    <label className="class-filter-item">
                                        <input
                                            type="checkbox"
                                            checked={selectedClassIds.has('no-class')}
                                            onChange={() => {
                                                const newSelected = new Set(selectedClassIds);
                                                if (newSelected.has('no-class')) {
                                                    newSelected.delete('no-class');
                                                } else {
                                                    newSelected.add('no-class');
                                                }
                                                setSelectedClassIds(newSelected);
                                                if (onClassFilterChange) {
                                                    onClassFilterChange(Array.from(newSelected));
                                                }
                                            }}
                                        />
                                        <span className="class-filter-label">
                                            No class associated
                                        </span>
                                    </label>
                                    {classes
                                        .filter((cls) => {
                                            const normalizedSearch = classSearchTerm.trim().toLowerCase();
                                            if (!normalizedSearch) return true;
                                            const compactSearch = normalizedSearch.replace(/\s+/g, '');

                                            const subject = (cls.subject || '').toLowerCase();
                                            const catalog = (cls.catalog || '').toLowerCase();
                                            const title = (cls.title || '').toLowerCase();
                                            const csNumber = (cls.csNumber || '').toLowerCase();
                                            const combined = [subject, catalog, title, csNumber]
                                                .filter(Boolean)
                                                .join(' ')
                                                .trim();
                                            const combinedCompact = combined.replace(/\s+/g, '');

                                            return (
                                                subject.includes(normalizedSearch) ||
                                                catalog.includes(normalizedSearch) ||
                                                title.includes(normalizedSearch) ||
                                                csNumber.includes(normalizedSearch) ||
                                                combined.includes(normalizedSearch) ||
                                                (compactSearch && combinedCompact.includes(compactSearch))
                                            );
                                        })
                                        .map((cls) => {
                                            const classIdStr = cls.id.toString();
                                            const isSelected = selectedClassIds.has(classIdStr);
                                            return (
                                                <label key={cls.id} className="class-filter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleClassToggle(classIdStr)}
                                                    />
                                                    <span className="class-filter-label">
                                                        {cls.subject} {cls.catalog} - {cls.title.length > 50 ? cls.title.substring(0, 50) + '...' : cls.title}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Header