import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ sidebarCollapsed, onToggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const auth = getAuth();
  const { id, username } = auth || {};

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const goTo = (path) => {
    navigate(path, { state: { id, username } });
  };

  const NotificationHome = () => goTo('/Admin');
  const NotificationEvent = () => goTo('/Event');
  const NotificationPromotion = () => goTo('/Promotion');
  const NotificationManageqr = () => goTo('/ManageQR');
  const NotificationFrameAD = () => goTo('/FrameAD');
  const NotificationPricecut = () => goTo('/Pricecut');
  const NotificationCamera = () => goTo('/Camera');
  const NotificationRevenue = () => goTo('/Revenue');
  const NotificationRating = () => goTo('/Rating');
  const NotificationContentChat = () => goTo('/ContentChat');
  const NotificationAccountUser = () => goTo('/AccountUser');
  const NotificationSettings = () => goTo('/Sticker');
  const NotificationSticker = () => goTo('/AiTopic');

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

    {/* Quên mật khẩu (dành cho cả khi đang đăng nhập – có thể dùng để khôi phục nếu quên) */}
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
            </div>
          </div>
        </div>
        <div className="mobile-menu-overlay" />
      </div>
    </>
  );
};

export default Navbar;