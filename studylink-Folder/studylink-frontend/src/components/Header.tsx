import React from 'react';
import './Header.css';

type PageName = 'home' | 'about' | 'account'

interface HeaderProps {
    onNavigate: (page: PageName) => void
}

const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
    return (
        <nav className="main-nav">
            <button onClick={() => onNavigate('home')}>Home</button>
            <button onClick={() => onNavigate('account')}>Log In / Account</button>
            <button onClick={() => onNavigate('about')}>About Us</button>
        </nav>
    )
}

export default Header