import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ sidebarCollapsed, onToggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const getAuth = () => {
    // Lấy thông tin auth, bao gồm cả 'role'
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const auth = getAuth();
  // Destructure 'role'
  const { id, username, role } = auth || {};
  
  // Xác định vai trò: role === 2 là Admin, role === 1 là Staff
  const isAdmin = role === 2;
  const isStaff = role === 1;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const goTo = (path) => {
    navigate(path, { state: { id, username } });
  };

  // Các hàm điều hướng (giữ nguyên)
  const NotificationHome = () => goTo('/Admin');
  const NotificationEvent = () => goTo('/Event');
  const NotificationPromotion = () => goTo('/Promotion');
  const NotificationManageqr = () => goTo('/ManageQR');
  const NotificationFrameAD = () => goTo('/FrameAD');
  const NotificationPricecut = () => goTo('/Pricecut');
  const NotificationCamera = () => goTo('/Camera');
  const NotificationRevenue = () => goTo('/Revenue');
  const NotificationRating = () => goTo('/Rating');
  const NotificationContentChat = () => goTo('/ContentChat'); // Mục này thiếu ở code bạn cung cấp cho Staff
  const NotificationAccountUser = () => goTo('/AccountUser');
  const NotificationSettings = () => goTo('/Sticker'); // Quản lí sticker
  const NotificationSticker = () => goTo('/AiTopic'); // Quản lí hiệu ứng AI

  const toggleSettings = (e) => {
    e.preventDefault();
    setSettingsOpen(!settingsOpen);
  };

  const toggleUserDropdown = (e) => {
    e.preventDefault();
    setUserDropdownOpen(!userDropdownOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownOpen && !event.target.closest('.user-info-dropdown')) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userDropdownOpen]);

  const handleLogout = () => {
    localStorage.removeItem('auth');
    navigate('/', { replace: true });
  };
  
  // --- Hàm Render Menu Sidebar Dựa Trên Vai Trò ---
  const renderSidebarMenu = () => {
    if (isStaff) {
      // Staff chỉ được vào ManageQR (theo logic bạn cung cấp)
      return (
        <ul id="accordion-menu">
          <li>
            <a
              onClick={NotificationManageqr}
              className={currentPath === '/ManageQR' ? 'active' : ''}
            >
              <span className="micon bi bi-qr-code" />
              <span className="mtext">Quản lí mã QR</span>
            </a>
          </li>
        <li>
          <a onClick={NotificationSettings} className={currentPath === '/Sticker' ? 'active' : ''}>
            <span className="micon bi bi-stickies" />
            <span className="mtext">Quản lí sticker</span>
          </a>
        </li>
        <li>
          <a onClick={NotificationSticker} className={currentPath === '/AiTopic' ? 'active' : ''}>
            <span className="micon bi bi-lightning-fill" />
            <span className="mtext">Quản lí hiệu ứng AI</span>
          </a>
        </li>
        <li>
          <a onClick={NotificationFrameAD} className={currentPath === '/FrameAD' ? 'active' : ''}>
            <span className='micon bi bi-images me-2'></span>
            <span className="mtext">Thiết lập khung ảnh</span>
          </a>
        </li>
        </ul>
      );
    }

    // Admin (hoặc người dùng không có role): hiển thị đầy đủ
    // Lưu ý: Tôi giả định nếu không có role hoặc role khác 1, 2 thì hiển thị menu đầy đủ (Admin)
    // Nếu muốn chỉ Admin (role=2) thấy, bạn có thể thay 'return (...)' bằng 'if (isAdmin) { return (...) }'
    return (
      <ul id="accordion-menu">
        <li>
          <a onClick={NotificationHome} className={currentPath === '/Admin' ? 'active' : ''}>
            <span className="micon bi bi-house" />
            <span className="mtext">Tổng quan</span>
          </a>
        </li>
        <li>
          <a onClick={NotificationEvent} className={currentPath === '/Event' ? 'active' : ''}>
            <span className="micon bi bi-calendar-event" />
            <span className="mtext">Quản lí background</span>
          </a>
        </li>
        <li>
          <a onClick={NotificationPromotion} className={currentPath === '/Promotion' ? 'active' : ''}>
            <span className="micon bi bi-percent" />
            <span className="mtext">Quản lí mã khuyến mãi</span>
          </a>
        </li>
        <li>
          <a onClick={NotificationManageqr} className={currentPath === '/ManageQR' ? 'active' : ''}>
            <span className="micon bi bi-qr-code" />
            <span className="mtext">Quản lí mã QR</span>
          </a>
        </li>
        <li>
          <a onClick={NotificationContentChat} className={currentPath === '/ContentChat' ? 'active' : ''}>
            <span className="micon bi bi-chat" />
            <span className="mtext">Quản lí Chat</span>
          </a>
        </li>
        <li>
          <a onClick={NotificationAccountUser} className={currentPath === '/AccountUser' ? 'active' : ''}>
            <span className="micon bi bi-people" />
            <span className="mtext">Quản lí tài khoản</span>
          </a>
        </li>
        <li>
          <a onClick={NotificationRating} className={currentPath === '/Rating' ? 'active' : ''}>
            <span className="micon bi bi-star-fill" />
            <span className="mtext">Quản lí đánh giá</span>
          </a>
        </li>
        <li>
          <a onClick={NotificationSettings} className={currentPath === '/Sticker' ? 'active' : ''}>
            <span className="micon bi bi-stickies" />
            <span className="mtext">Quản lí sticker</span>
          </a>
        </li>
        <li>
          <a onClick={NotificationSticker} className={currentPath === '/AiTopic' ? 'active' : ''}>
            <span className="micon bi bi-lightning-fill" />
            <span className="mtext">Quản lí hiệu ứng AI</span>
          </a>
        </li>
        <li className={`dropdown ${settingsOpen ? 'open' : ''}`}>
          <a
            href="#"
            className={`dropdown-toggle ${
              ['/FrameAD', '/Pricecut', '/Camera'].includes(currentPath) ? 'active' : ''
            }`}
            onClick={toggleSettings}
          >
            <span className="micon bi bi-gear" />
            <span className="mtext">Quản lí thiết lập</span>
          </a>
          <ul className="submenu">
            <li>
              <a className="px-5" onClick={NotificationFrameAD}>
                <i className="bi bi-images me-2" /> Thiết lập khung ảnh
              </a>
            </li>
            <li>
              <a className="px-5" onClick={NotificationPricecut}>
                <i className="bi bi-cash-coin me-2" /> Thiết lập giá tiền
              </a>
            </li>
            <li>
              <a className="px-5" onClick={NotificationCamera}>
                <i className="bi bi-camera-fill me-2" /> Thiết lập máy ảnh
              </a>
            </li>
          </ul>
        </li>
        <li>
          <a onClick={NotificationRevenue} className={currentPath === '/Revenue' ? 'active' : ''}>
            <span className="micon bi bi-bar-chart-line" />
            <span className="mtext">Quản lí doanh thu</span>
          </a>
        </li>
      </ul>
    );
  };
  // --- Kết thúc Hàm Render Menu Sidebar ---

  return (
    <>
      <div className={`header-white sidebar-light ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className={`header ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="header-left">
            <div className="menu-icon bi bi-list" onClick={onToggleSidebar} />
          </div>
          <div className="header-right">
            <div className="user-info-dropdown">
              <div className={`dropdown ${userDropdownOpen ? 'show' : ''}`}>
                <a
                  className="dropdown-toggle"
                  href="#"
                  role="button"
                  onClick={toggleUserDropdown}
                >
                  <span className="user-icon">
                    <i className="bi bi-person-fill" />
                  </span>
                  <span className="user-name">Xin chào {username || 'admin'}</span>
                </a>
                <div className={`dropdown-menu dropdown-menu-right ${userDropdownOpen ? 'show' : ''}`}>
                  {/* Đổi mật khẩu */}
                  <a
                    onClick={() => {
                      setUserDropdownOpen(false);
                      navigate('/ChangePassword');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <i className="bi bi-key" /> Đổi mật khẩu
                  </a>

                  {/* Quên mật khẩu */}
                  <a
                    onClick={() => {
                      setUserDropdownOpen(false);
                      navigate('/ForgotPassword');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <i className="bi bi-question-circle" /> Quên mật khẩu?
                  </a>

                  {/* Đăng xuất */}
                  <a
                    onClick={() => {
                      setUserDropdownOpen(false);
                      handleLogout();
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <i className="bi bi-box-arrow-right" /> Đăng xuất
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`left-side-bar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="brand-logo">
            <a>
              <img
                src="/logo.jpg"
                alt="Logo"
                style={{
                  width: '85px',
                  height: '85px',
                  display: 'block',
                  margin: '0 auto',
                }}
              />
            </a>
          </div>

          <div className="menu-block customscroll">
            <div className="sidebar-menu">
              {/* Gọi hàm renderSidebarMenu để hiển thị menu theo vai trò */}
              {renderSidebarMenu()} 
            </div>
          </div>
        </div>
        <div className="mobile-menu-overlay" />
      </div>
    </>
  );
};

export default Navbar;