import "bootstrap/dist/css/bootstrap.min.css";
import { useState } from 'react'
import Header from './components/Header'
import AuthForm from './components/AuthForm'
import SearchBar from './components/SearchBar'
import Grid from './components/Grid'
import FileActions from "./components/FileActions";
import './App.css'

type PageName = 'home' | 'about' | 'account'

export default function App() {

    const [currentPage, setCurrentPage] = useState<PageName>('home')

    return (
        <div className="App">
            {/* Pass a function to Header so it can ask to change pages */}
            {currentPage !== 'account' && (
                <Header onNavigate={setCurrentPage} />
            )}

            {currentPage === 'home' && (
                <>
                    <SearchBar />
                    <FileActions />
                    <Grid />
                </>
            )}

            {currentPage === 'about' && (
                <div className="page about">
                    <h2>About StudyLink</h2>
                    <p>Some text describing what this site does.</p>
                </div>
            )}

            {currentPage === 'account' && (
                <div className="page account">
                    <AuthForm
                        onLoginSuccess={() => setCurrentPage('home')}
                    />
                </div>
            )}
        </div>
    )
}
