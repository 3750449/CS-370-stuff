import React, { useState } from 'react';
import './SearchBar.css';

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');

  return (
    <div className="search-bar-container">
      <input
        type="text"
        placeholder="Search..."
        className="search-input"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div className="search-bar-controls">
        <div className="filter-container">
          <label htmlFor="filter">Filter By:</label>
          <select
            id="filter"
            className="filter-select"
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
          >
            <option value="all">All</option>
            <option value="topic">Topic</option>
            <option value="author">Author</option>
          </select>
        </div>
        <div className="sort-container">
          <label htmlFor="sort">Sort By:</label>
          <select
            id="sort"
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="relevance">Relevance</option>
            <option value="popularity">Popularity</option>
            <option value="age">Age</option>
          </select>
        </div>
      </div>
      <button className="search-button">Search</button>
    </div>
  );
};

export default SearchBar;
