import React from 'react';
import './Header.css';

const Header: React.FC = () => {
  return (
    <nav className="main-nav">
      <a href="#">Log In</a>
      <a href="#">Create Account</a>
      <a href="#">About Us</a>
    </nav>
  );
};

export default Header;
