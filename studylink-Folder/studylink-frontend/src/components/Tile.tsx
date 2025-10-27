import React from 'react';
import './Tile.css';

const Tile: React.FC = () => {
  return (
    <div className="tile">
      <div className="tile-header">
        <span className="tile-topic">Topic: Placeholder</span>
        <span className="tile-age">4 hours ago</span>
      </div>
      <h3 className="tile-title">Placeholder Title</h3>
      <p className="tile-content">
        This is a placeholder for the main content of the study guide or notes. It can be a summary, a key concept, or a question.
      </p>
      <div className="tile-footer">
        <span className="tile-popularity">Popularity: 123</span>
      </div>
    </div>
  );
};

export default Tile;
