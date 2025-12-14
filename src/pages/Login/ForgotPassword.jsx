import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthCommon.css';

function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: email, 2: OTP, 3: new password
  const [email, setEmail] = useState('');
  const [isEmailLocked, setIsEmailLocked] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 👇 Thêm trạng thái cho ẩn/hiện mật khẩu
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const navigate = useNavigate();


  const handleSendOtp = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!email) {
      setMessage('Vui lòng nhập email của bạn.');
      return;
    }

    setIsSendingOtp(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setMessage('Mã xác nhận đã được gửi đến email của bạn.');
        setStep(2);
      } else {
        setMessage(data.message || 'Gửi yêu cầu thất bại. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Lỗi gửi mã:', error);
      setMessage('Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const resendOtp = async () => {
    setMessage('');
    setIsSendingOtp(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setMessage('Mã xác nhận mới đã được gửi đến email của bạn.');
      } else {
        setMessage(data.message || 'Gửi lại thất bại. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Lỗi gửi lại mã:', error);
      setMessage('Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!otp.trim()) {
      setMessage('Vui lòng nhập mã xác nhận.');
      return;
    }

    setIsVerifyingOtp(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setMessage('');
        setStep(3);
      } else {
        setMessage(data.message || 'Mã xác nhận không hợp lệ hoặc đã hết hạn.');
      }
    } catch (error) {
      console.error('Lỗi xác minh OTP:', error);
      setMessage('Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('Mật khẩu mới và xác nhận không khớp.');
      return;
    }
    if (newPassword.length < 6) {
      setMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setIsResettingPassword(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setMessage('Đổi mật khẩu thành công! Đang chuyển hướng...');
        setTimeout(() => navigate('/'), 500);
      } else {
        setMessage(data.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Lỗi đặt lại mật khẩu:', error);
      setMessage('Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className={`auth-container ${isLoading ? 'fade-in' : ''}`}>
      <div className="auth-header">
        <img src="./logo.jpg" alt="Logo" className="auth-logo" />
        <div className="auth-title">
          {step === 1 && <h2>QUÊN MẬT KHẨU? 💘</h2>}
          {step === 2 && <h2>NHẬP MÃ XÁC NHẬN</h2>}
          {step === 3 && <h2>ĐẶT MẬT KHẨU MỚI</h2>}
        </div>
      </div>

      {message && (
        <div className={`message ${
          message.includes('thất bại') ||
          message.includes('không hợp lệ') ||
          message.includes('không khớp') ||
          message.includes('hết hạn') ||
          message.includes('không chính xác')
            ? 'error'
            : 'success'
        }`}>
          {message}
        </div>
      )}

      {step === 1 && (
        <form className="auth-form" onSubmit={handleSendOtp}>
          <div className="input-group">
            <span className="icon">📧</span>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => !isEmailLocked && setEmail(e.target.value)}
              aria-label="Email"
              disabled={isSendingOtp}
              readOnly={isEmailLocked}
            />
          </div>
          <button
            type="submit"
            className="auth-button"
            disabled={isSendingOtp || !email}
          >
            {isSendingOtp ? 'Đang gửi...' : 'GỬI MÃ XÁC NHẬN'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form className="auth-form" onSubmit={handleVerifyOtp}>
          <div className="input-group">
            <span className="icon">🔢</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Mã xác nhận (6 chữ số)"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              aria-label="Mã xác nhận"
              maxLength={6}
              disabled={isVerifyingOtp || isSendingOtp}
            />
          </div>
          <button
            type="submit"
            className="auth-button"
            disabled={isVerifyingOtp}
          >
            {isVerifyingOtp ? 'Đang xác minh...' : 'XÁC NHẬN MÃ'}
          </button>
          <button
            type="button"
            className="link-button"
            onClick={resendOtp}
            disabled={isSendingOtp}
            style={{ marginTop: '12px', fontSize: '15px', fontWeight: '500' }}
          >
            {isSendingOtp ? 'Đang gửi lại...' : '← Gửi lại mã'}
          </button>
        </form>
      )}

      {/* BƯỚC 3: ĐẶT LẠI MẬT KHẨU — CẬP NHẬT Ở ĐÂY */}
      {step === 3 && (
        <form className="auth-form" onSubmit={handleResetPassword}>
          {/* Mật khẩu mới */}
          <div className="input-group" style={{ position: 'relative' }}>
            <span className="icon">🔒</span>
            <input
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              aria-label="Mật khẩu mới"
              disabled={isResettingPassword}
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

          {/* Xác nhận mật khẩu */}
          <div className="input-group" style={{ position: 'relative' }}>
            <span className="icon">✅</span>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Xác nhận mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-label="Xác nhận mật khẩu"
              disabled={isResettingPassword}
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

          <button
            type="submit"
            className="auth-button"
            disabled={isResettingPassword}
          >
            {isResettingPassword ? 'Đang đổi...' : 'ĐẶT MẬT KHẨU MỚI'}
          </button>
        </form>
      )}

      <div className="auth-links">
        <button className="link-button" onClick={() => navigate(-1)}>
          {'← Quay lại'}
        </button>
      </div>
    </div>
  );
}

export default ForgotPassword;