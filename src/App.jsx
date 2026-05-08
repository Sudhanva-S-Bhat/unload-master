import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Records from './pages/Records';
import AddRecord from './pages/AddRecord';

function ProtectedRoute({ children }) {
  const user = localStorage.getItem('currentUser');
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout user={currentUser} />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="records" element={<Records />} />
        <Route path="add-record" element={<AddRecord />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
