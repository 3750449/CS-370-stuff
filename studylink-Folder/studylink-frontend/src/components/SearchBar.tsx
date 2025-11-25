import { useState, useEffect, useRef } from 'react';
import './SearchBar.css';

// Shared search + class filter surface for pages that mirror the homepage filtering experience.
interface Class {
  id: number;
  subject: string;
  catalog: string;
  title: string;
  csNumber: string;
}

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  classFilter: string[];
  onClassFilterChange: (classIds: string[]) => void;
  showNoClassOption?: boolean;
}

const SearchBar = ({
  searchTerm,
  onSearchChange,
  classFilter,
  onClassFilterChange,
  showNoClassOption = true,
}: SearchBarProps) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set(classFilter));
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [showAllFilters, setShowAllFilters] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [panelTopOffset, setPanelTopOffset] = useState(0);

  // Fetch classes for filter list
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

  // Sync local search term with parent
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  // Sync filter set when parent changes
  useEffect(() => {
    setSelectedClassIds(new Set(classFilter));
  }, [classFilter]);

  // measure wrapper height to position panel below active filters
  useEffect(() => {
    function updatePanelOffset() {
      if (wrapperRef.current) {
        setPanelTopOffset(wrapperRef.current.offsetHeight);
      }
    }
    updatePanelOffset();
    window.addEventListener('resize', updatePanelOffset);
    return () => window.removeEventListener('resize', updatePanelOffset);
  }, []);

  useEffect(() => {
    if (!showFilterPanel) return;
    if (wrapperRef.current) {
      setPanelTopOffset(wrapperRef.current.offsetHeight);
    }
  }, [showFilterPanel, selectedClassIds, showAllFilters]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setLocalSearchTerm(value);
    onSearchChange(value);
  }

  function handleClassToggle(classId: string) {
    const next = new Set(selectedClassIds);
    if (next.has(classId)) {
      next.delete(classId);
    } else {
      next.add(classId);
    }
    setSelectedClassIds(next);
    onClassFilterChange(Array.from(next));
  }

  function handleClearFilters() {
    setLocalSearchTerm('');
    setSelectedClassIds(new Set());
    setClassSearchTerm('');
    setShowAllFilters(false);
    onSearchChange('');
    onClassFilterChange([]);
  }

  const hasActiveFilters = localSearchTerm.trim().length > 0 || selectedClassIds.size > 0;

  const filteredClasses = classes.filter((cls) => {
    const normalizedSearch = classSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) return true;
    const compactSearch = normalizedSearch.replace(/\s+/g, '');

    const subject = (cls.subject || '').toLowerCase();
    const catalog = (cls.catalog || '').toLowerCase();
    const title = (cls.title || '').toLowerCase();
    const csNumber = (cls.csNumber || '').toLowerCase();
    const combined = [subject, catalog, title, csNumber].filter(Boolean).join(' ').trim();
    const combinedCompact = combined.replace(/\s+/g, '');

    return (
      subject.includes(normalizedSearch) ||
      catalog.includes(normalizedSearch) ||
      title.includes(normalizedSearch) ||
      csNumber.includes(normalizedSearch) ||
      combined.includes(normalizedSearch) ||
      (!!compactSearch && combinedCompact.includes(compactSearch))
    );
  });

  return (
    <div className="search-bar-wrapper" ref={wrapperRef}>
      <div className="search-bar-container">
        <div className="search-bar-controls">
          <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search for notes using name or class name..."
            className="search-input"
            value={localSearchTerm}
            onChange={handleSearchChange}
          />
          <button
            className={`filter-icon-btn ${selectedClassIds.size > 0 ? 'active' : ''}`}
            onClick={() => setShowFilterPanel((prev) => !prev)}
            title="Filters"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 5h14M5 10h10M7 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          </div>
          {hasActiveFilters && (
            <button
              className="page-clear-filters-btn"
              onClick={handleClearFilters}
              title="Clear all filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {selectedClassIds.size > 0 && (
        <div className="page-active-filters">
          <div className="active-filters-content">
            <div className="selected-filters">
              {Array.from(selectedClassIds)
                .slice(0, showAllFilters ? selectedClassIds.size : 3)
                .map((classId) => {
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
                  const cls = classes.find((c) => c.id.toString() === classId);
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

      {showFilterPanel && (
        <div
          className="filter-panel page-filter-panel"
          style={{ top: `${panelTopOffset + 8}px` }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="filter-panel-content">
            <div className="filter-panel-header">
              <h3>Filters</h3>
              <button
                className="close-filter-btn"
                onClick={() => setShowFilterPanel(false)}
                aria-label="Close filters"
              >
                ×
              </button>
            </div>
            <div className="filter-panel-body">
              <div className="filter-group">
                <label htmlFor="page-class-search">Search Classes:</label>
                <input
                  id="page-class-search"
                  type="text"
                  placeholder="Search classes..."
                  className="class-search-input"
                  value={classSearchTerm}
                  onChange={(e) => setClassSearchTerm(e.target.value)}
                />
                <div className="class-filter-list">
                  {showNoClassOption && (
                    <label className="class-filter-item">
                      <input
                        type="checkbox"
                        checked={selectedClassIds.has('no-class')}
                        onChange={() => handleClassToggle('no-class')}
                      />
                      <span className="class-filter-label">No class associated</span>
                    </label>
                  )}
                  {filteredClasses.map((cls) => {
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
                          {cls.subject} {cls.catalog} -{' '}
                          {cls.title.length > 50 ? `${cls.title.substring(0, 50)}...` : cls.title}
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
    </div>
  );
};

export default SearchBar;
