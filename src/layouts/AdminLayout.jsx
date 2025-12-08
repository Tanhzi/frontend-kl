// src/layouts/AdminLayout.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const auth = localStorage.getItem('auth');
    if (!auth) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const auth = JSON.parse(localStorage.getItem('auth') || 'null');

  if (!auth) {
    return null; // hoặc loading spinner
  }

  return <>{children}</>;
};

export default AdminLayout;