import React from 'react';
import Tile from './Tile';
import './Grid.css';

const Grid: React.FC = () => {
  return (
    <div className="grid">
      <Tile />
      <Tile />
      <Tile />
      <Tile />
      <Tile />
      <Tile />
    </div>
  );
};

export default Grid;
