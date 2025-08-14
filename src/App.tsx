import { useState } from 'react';
import { Routes, Route } from 'react-router-dom'; // Import Routes and Route
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

// Define the NewPage component
function NewPage() {
  return (
    <div>
      <h2>This is the new page</h2>
      {/* Add content for your new page here */}
    </div>
  );
}

function App() {
  const [count, setCount] = useState(0)
 return (
    <Routes> {/* Use Routes to wrap your routes */}
      <Route path="/" element={ // Route for the home page
        <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
        </>
      } />
      <Route path="/new-page" element={<NewPage />} /> {/* Route for the new page */}
    </Routes>
  )
}

export default App
