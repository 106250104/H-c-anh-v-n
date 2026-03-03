import React from 'react';
import './App.css';

function App() {
  return (
    <div className="flex flex-col md:flex-row p-4 md:p-8">
      <header className="flex justify-between items-center pb-20">
        <h1 className="text-2xl md:text-3xl font-bold">My App</h1>
        <nav className="flex space-x-4">
          <a href="#" className="text-base md:text-lg">Home</a>
          <a href="#" className="text-base md:text-lg">About</a>
          <a href="#" className="text-base md:text-lg">Contact</a>
        </nav>
      </header>
      <main className="flex-grow p-4 md:p-8">
        <h2 className="text-lg md:text-xl">Welcome to my responsive app!</h2>
        <p className="text-base md:text-lg">This application adjusts its layout based on the screen size to provide a better user experience.</p>
      </main>
      <footer className="mt-4 md:mt-8 text-center">
        <p className="text-base md:text-lg">© 2026 My App, Inc.</p>
      </footer>
    </div>
  );
}

export default App;