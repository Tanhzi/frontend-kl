import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthCommon.css';

function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: email, 2: OTP, 3: new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  // Bước 1: Gửi mã xác nhận
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setMessage(''); // Xoá message cũ

    if (!email) {
      setMessage('Vui lòng nhập email của bạn.');
      return;
    }

    setIsSubmitting(true);

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
      setIsSubmitting(false);
    }
  };

  // Bước 2: Xác minh OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setMessage(''); // Xoá message cũ

    if (!otp.trim()) {
      setMessage('Vui lòng nhập mã xác nhận.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setMessage('Mã xác nhận hợp lệ. Vui lòng nhập mật khẩu mới.');
        setStep(3);
        setMessage(''); // Xoá message trước khi sang bước 3
      } else {
        setMessage(data.message || 'Mã xác nhận không hợp lệ hoặc đã hết hạn.');
      }
    } catch (error) {
      console.error('Lỗi xác minh OTP:', error);
      setMessage('Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bước 3: Đặt lại mật khẩu
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage(''); // Xoá message cũ ngay lập tức

    if (newPassword !== confirmPassword) {
      setMessage('Mật khẩu mới và xác nhận không khớp.');
      return;
    }
    if (newPassword.length < 6) {
      setMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ✅ GỬI ĐỦ 4 TRƯỜNG ĐỂ LARAVEL VALIDATE `confirmed` THÀNH CÔNG
        body: JSON.stringify({
          email,
          otp,
          password: newPassword,
          password_confirmation: confirmPassword, // ← BẮT BUỘC CHO RULE `confirmed`
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setMessage('Đổi mật khẩu thành công! Đang chuyển hướng...');
        setTimeout(() => navigate('/'), 1000);
      } else {
        setMessage(data.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Lỗi đặt lại mật khẩu:', error);
      setMessage('Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
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
        <div className={`message ${message.includes('thất bại') || message.includes('không hợp lệ') || message.includes('không khớp') || message.includes('hết hạn') ? 'error' : 'success'}`}>
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
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email"
              disabled={isSubmitting}
            />
          </div>
          <button type="submit" className="auth-button" disabled={isSubmitting}>
            {isSubmitting ? 'Đang gửi...' : 'GỬI MÃ XÁC NHẬN'}
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
              disabled={isSubmitting}
            />
          </div>
          <button type="submit" className="auth-button" disabled={isSubmitting}>
            {isSubmitting ? 'Đang xác minh...' : 'XÁC NHẬN MÃ'}
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => setStep(1)}
            style={{ marginTop: '12px', fontSize: '15px', fontWeight: '500' }}
          >
            ← Gửi lại mã
          </button>
        </form>
      )}

      {step === 3 && (
        <form className="auth-form" onSubmit={handleResetPassword}>
          <div className="input-group">
            <span className="icon">🔒</span>
            <input
              type="password"
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              aria-label="Mật khẩu mới"
              disabled={isSubmitting}
            />
          </div>
          <div className="input-group">
            <span className="icon">✅</span>
            <input
              type="password"
              placeholder="Xác nhận mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-label="Xác nhận mật khẩu"
              disabled={isSubmitting}
            />
          </div>
          <button type="submit" className="auth-button" disabled={isSubmitting}>
            {isSubmitting ? 'Đang đổi...' : 'ĐẶT MẬT KHẨU MỚI'}
          </button>
        </form>
      )}

      <div className="auth-links">
        <button className="link-button" onClick={() => navigate('/')}>
          ← Quay lại đăng nhập
        </button>
      </div>
    </div>
  );
}

export default ForgotPassword;