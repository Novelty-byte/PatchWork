import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.jsx';
import StatusPage, { Layout, NotFoundView } from './pages/StatusPage.jsx';
import ManagerPage from './pages/ManagerPage.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/status/:id" element={<StatusPage />} />
        <Route path="/report/:id" element={<StatusPage />} />
        <Route path="/dashboard" element={<ManagerPage />} />
        <Route path="/manager" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Layout><NotFoundView /></Layout>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
