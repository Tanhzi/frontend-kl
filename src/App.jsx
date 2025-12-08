import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './pages/Login/AuthCommon.css';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(''); // 👈 Dùng để hiển thị lỗi trên UI
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Reset lỗi trước mỗi lần đăng nhập

    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ tên người dùng và mật khẩu.');
      return;
    }

    try {
      const url = `${import.meta.env.VITE_API_BASE_URL}/login`;
      console.log('Đang gọi API đăng nhập:', { url, username });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      // ❗ Trường hợp server không trả về JSON hợp lệ
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Lỗi parse JSON từ response:', jsonError, await response.text());
        setError('Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại sau.');
        return;
      }

      console.log('Phản hồi từ server:', data);

      if (response.ok && data.status === 'success') {
        const auth = {
          id: data.id,
          username: data.username,
          email: data.email,
          role: data.role,
          id_admin: data.id_admin || '',
          id_topic: data.id_topic || '',
        };

        localStorage.setItem('auth', JSON.stringify(auth));

        if (data.role === 1) {
          navigate('/Admin');
        } else {
          navigate('/Appclien');
        }
      } else {
        // ❗ Lỗi từ backend (status !== 'success')
        const errorMsg = data.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
        setError(errorMsg);
        console.warn('Lỗi đăng nhập từ server:', errorMsg);
      }
    } catch (networkError) {
      console.error('Lỗi mạng hoặc kết nối API:', networkError);
      setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
    }
  };

  return (
    <div className={`login-container ${isLoading ? 'fade-in' : ''}`}>
      <div className="login-header">
        <img src="./logo.jpg" alt="Logo" className="login-logo" />
        <div className="login-title">
          <h2>ĐĂNG NHẬP 💖</h2>
        </div>
      </div>

      <div className="login-form">
        {/* Hiển thị lỗi chung */}
        {error && (
          <div className="error-message" style={{
            color: 'red',
            backgroundColor: '#ffe6e6',
            padding: '8px',
            borderRadius: '4px',
            marginBottom: '12px',
            textAlign: 'center',
            border: '1px solid #ffcccc'
          }}>
            {error}
          </div>
        )}

        <div className="input-group">
          <span className="icon">📧</span>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-label="Username"
          />
        </div>

        <div className="input-group">
          <span className="icon">🔒</span>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Mật khẩu"
          />
        </div>

        <button
          className="login-button"
          onClick={handleLogin}
          aria-label="Đăng nhập"
          disabled={isLoading} // Tắt nút nếu đang loading animation
        >
          ĐĂNG NHẬP
        </button>
      </div>

      <div className="auth-links">
        <button className="link-button" onClick={() => navigate('/ForgotPassword')}>
          Quên mật khẩu? →
        </button>
      </div>
    </div>
  );
}

export default App;