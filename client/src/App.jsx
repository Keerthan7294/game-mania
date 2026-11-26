import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Console from './console/Console.jsx';
import Controller from './controller/Controller.jsx';

function App() {
  return (
    <Routes>
      <Route path="/console" element={<Console />} />
      <Route path="/play" element={<Controller />} />
      <Route path="/" element={<Navigate to="/console" replace />} />
    </Routes>
  );
}

export default App;
