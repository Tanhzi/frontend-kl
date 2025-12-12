import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthCommon.css';

function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const auth = getAuth();

  useEffect(() => {
    if (!auth) {
      navigate('/');
      return;
    }
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!oldPassword) {
      setMessage('Vui lòng nhập mật khẩu cũ.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Mật khẩu mới và xác nhận không khớp.');
      return;
    }
    if (newPassword.length < 6) {
      setMessage('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: auth.id,
          old_password: oldPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setMessage('Đổi mật khẩu thành công!');
        setTimeout(() => navigate('/'), 1500);
      } else {
        setMessage(data.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Lỗi đổi mật khẩu:', error);
      setMessage('Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!auth) return null;

  return (
    <div className={`auth-container ${isLoading ? 'fade-in' : ''}`}>
      <div className="auth-header">
        <img src="./logo.jpg" alt="Logo" className="auth-logo" />
        <div className="auth-title">
          <h2>ĐỔI MẬT KHẨU 🔑</h2>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('thất bại') || message.includes('không khớp') || message.includes('không chính xác') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

<form className="auth-form" onSubmit={handleChangePassword}>
  {/* Mật khẩu cũ */}
  <div className="input-group" style={{ position: 'relative' }}>
    <span className="icon">🗝️</span>
    <input
      type={showOldPassword ? 'text' : 'password'}
      placeholder="Mật khẩu cũ"
      value={oldPassword}
      onChange={(e) => setOldPassword(e.target.value)}
      aria-label="Mật khẩu cũ"
      disabled={isSubmitting}
      style={{ paddingRight: oldPassword ? '40px' : '14px' }} // thu nhỏ padding nếu không có nút
    />
    {oldPassword && (
      <button
        type="button"
        onClick={() => setShowOldPassword(!showOldPassword)}
        aria-label={showOldPassword ? 'Ẩn mật khẩu cũ' : 'Hiện mật khẩu cũ'}
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.2em',
          color: '#666',
          zIndex: 1,
        }}
      >
        {showOldPassword ? '🙈' : '👁️'}
      </button>
    )}
  </div>

  {/* Mật khẩu mới */}
  <div className="input-group" style={{ position: 'relative' }}>
    <span className="icon">🔒</span>
    <input
      type={showNewPassword ? 'text' : 'password'}
      placeholder="Mật khẩu mới"
      value={newPassword}
      onChange={(e) => setNewPassword(e.target.value)}
      aria-label="Mật khẩu mới"
      disabled={isSubmitting}
      style={{ paddingRight: newPassword ? '40px' : '14px' }}
    />
    {newPassword && (
      <button
        type="button"
        onClick={() => setShowNewPassword(!showNewPassword)}
        aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.2em',
          color: '#666',
          zIndex: 1,
        }}
      >
        {showNewPassword ? '🙈' : '👁️'}
      </button>
    )}
  </div>

  {/* Xác nhận mật khẩu mới */}
  <div className="input-group" style={{ position: 'relative' }}>
    <span className="icon">✅</span>
    <input
      type={showConfirmPassword ? 'text' : 'password'}
      placeholder="Xác nhận mật khẩu mới"
      value={confirmPassword}
      onChange={(e) => setConfirmPassword(e.target.value)}
      aria-label="Xác nhận mật khẩu mới"
      disabled={isSubmitting}
      style={{ paddingRight: confirmPassword ? '40px' : '14px' }}
    />
    {confirmPassword && (
      <button
        type="button"
        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
        aria-label={showConfirmPassword ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.2em',
          color: '#666',
          zIndex: 1,
        }}
      >
        {showConfirmPassword ? '🙈' : '👁️'}
      </button>
    )}
  </div>

  <button type="submit" className="auth-button" disabled={isSubmitting}>
    {isSubmitting ? 'Đang đổi...' : 'ĐỔI MẬT KHẨU'}
  </button>
</form>

      <div className="auth-links">
        <button className="link-button" onClick={() => navigate(-1)}>
          ← Quay lại
        </button>
      </div>
    </div>
  );
}

export default ChangePassword;