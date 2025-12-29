import React, { useState, useEffect, useMemo, useRef } from 'react';
import Navbar from '../../components/Navbar';
import { FaEye } from 'react-icons/fa';
import './Manageqr.css';

// === MODALs giữ nguyên ===
const FrameImageModal = ({ isOpen, onClose, imageUrl }) => {
  if (!isOpen) return null;
  return (
    <div className="manageqr-modal-overlay" onClick={onClose}>
      <div className="manageqr-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="manageqr-modal-close-btn" onClick={onClose}>×</button>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Khung ảnh"
            className="manageqr-frame-image"
            onError={() => alert('Không hiển thị được ảnh khung. Định dạng không hợp lệ.')}
          />
        ) : (
          <p>Không có dữ liệu ảnh khung.</p>
        )}
      </div>
    </div>
  );
};

const QRModal = ({ isOpen, onClose, qrImage, qrLink }) => {
  if (!isOpen) return null;
  return (
    <div className="manageqr-modal-overlay" onClick={onClose}>
      <div className="manageqr-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="manageqr-modal-close-btn" onClick={onClose}>×</button>
        {qrImage ? (
          <img
            src={qrImage}
            alt="Mã QR"
            className="manageqr-qr-image"
            onError={() => alert('Không tải được mã QR.')}
          />
        ) : (
          <div className="manageqr-qr-placeholder">Đang tải QR...</div>
        )}
        {qrLink && (
          <div className="manageqr-qr-link">
            <p>
              Link: <a href={qrLink} target="_blank" rel="noopener noreferrer">{qrLink}</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// === Hàm render rows cho bảng đơn hàng ===
const renderOrderRows = (paginatedOrders, currentPage, ITEMS_PER_PAGE, handleViewFrame, handleViewQR) => {
  if (paginatedOrders.length === 0) {
    return (
      <tr>
        <td colSpan="5" className="manageqr-no-data">Không có dữ liệu.</td>
      </tr>
    );
  }

  return paginatedOrders.map((order, index) => (
    <tr key={order.id}>
      <td>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
      <td><strong>{order.discount_code || '—'}</strong></td>
      <td>{order.time}</td>
      <td>
        <button
          className="manageqr-btn manageqr-btn-frame"
          onClick={() => handleViewFrame(order.frame_id)}
          disabled={!order.frame_id}
        >
          <FaEye />
        </button>
      </td>
      <td>
        <button
          className="manageqr-btn manageqr-btn-qr"
          onClick={() => handleViewQR(order.qr_id)}
          disabled={!order.qr_id}
        >
          <FaEye />
        </button>
      </td>
    </tr>
  ));
};

// === Hàm render rows cho bảng top khung ảnh ===
const renderTopFramesRows = (topFrames) => {
  if (topFrames.length === 0) {
    return (
      <tr>
        <td colSpan="3" className="manageqr-no-data">Chưa có dữ liệu khung ảnh.</td>
      </tr>
    );
  }

  return topFrames.map((item, index) => (
    <tr key={item.id_frame}>
      <td>{index + 1}</td>
      <td>
        {item.frame ? (
          <img
            src={item.frame}
            alt={`Khung ${item.id_frame}`}
            className="manageqr-top-frame-preview"
            onError={(e) => {
              e.target.alt = 'Ảnh lỗi';
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <span className="manageqr-no-image">—</span>
        )}
      </td>
      <td>{item.usage_count}</td>
    </tr>
  ));
};

// === COMPONENT CHÍNH ===
const Manageqr = () => {
  // === Auth ===
  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };
  const [auth, setAuth] = useState(getAuth());
  const { id_admin, username } = auth || {};

  // === UI State ===
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  // === Dữ liệu đơn hàng ===
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // === Dữ liệu top khung ảnh ===
  const [topFrames, setTopFrames] = useState([]);
  const [loadingTopFrames, setLoadingTopFrames] = useState(true);

  // === Tìm kiếm & lọc ===
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  // === Phân trang - 10 ITEMS ===
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // === Modal states ===
  const [isFrameModalOpen, setIsFrameModalOpen] = useState(false);
  const [frameImageUrl, setFrameImageUrl] = useState('');

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [qrLink, setQrLink] = useState('');

  // === Filter menu ===
  const filterRef = useRef(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Đóng menu khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // === LẤY ĐƠN HÀNG ===
  const fetchOrders = async () => {
    if (!id_admin) {
      setLoading(false);
      setError('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/get-orders?id_admin=${id_admin}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Lỗi ${res.status}: ${text.substring(0, 100)}`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Dữ liệu không hợp lệ');
      setOrders(data);
      setError(null);
    } catch (err) {
      console.error('Lỗi tải đơn hàng:', err);
      setError('Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // === LẤY TOP KHUNG ẢNH ===
  const fetchTopFrames = async () => {
    if (!id_admin) {
      setLoadingTopFrames(false);
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/top-frames?id_admin=${id_admin}`);
      if (!res.ok) {
        const text = await res.text();
        console.error('Lỗi API top-frames:', text);
        throw new Error('Không thể tải top khung ảnh');
      }
      const data = await res.json();
      if (Array.isArray(data.data)) {
        setTopFrames(data.data);
      } else {
        setTopFrames([]);
      }
    } catch (err) {
      console.error('Lỗi khi tải top khung ảnh:', err);
      setTopFrames([]);
      alert('Không thể tải danh sách khung ảnh phổ biến.');
    } finally {
      setLoadingTopFrames(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchTopFrames();
  }, [id_admin]);

  // === LỌC & TÌM KIẾM ===
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (dateFilter === 'latest') {
      if (result.length > 0) {
        const latestDate = result.reduce((latest, order) => {
          const orderDate = new Date(order.time || 0);
          return orderDate > latest ? orderDate : latest;
        }, new Date(0));

        const latestDateStr = latestDate.toISOString().split('T')[0];
        result = result.filter(order => {
          const orderDateStr = (order.time || '').split(' ')[0];
          return orderDateStr === latestDateStr;
        });
      }
    } else if (dateFilter === 'month') {
      if (result.length === 0) {
        result = [];
      } else {
        const latestOrder = result.reduce((prev, curr) => {
          const prevTime = new Date(prev.time || 0);
          const currTime = new Date(curr.time || 0);
          return currTime > prevTime ? curr : prev;
        });

        const latestMonth = new Date(latestOrder.time).toISOString().slice(0, 7);
        result = result.filter(order => {
          if (!order.time) return false;
          const orderMonth = order.time.split(' ')[0].slice(0, 7);
          return orderMonth === latestMonth;
        });
      }
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(order =>
        String(order.id).includes(term) ||
        (order.discount_code || '').toLowerCase().includes(term) ||
        (order.time || '').toLowerCase().includes(term)
      );
    }

    return result;
  }, [orders, dateFilter, searchTerm]);

  // === PHÂN TRANG ===
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  // Reset về trang đầu khi lọc/thay đổi tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, searchTerm]);

  // === Handler ===
  const handleViewFrame = async (frameId) => {
    if (!frameId) {
      alert('Không có khung để hiển thị.');
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/frame-image?id=${frameId}`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Không tìm thấy khung ảnh: ${errorText}`);
      }
      const data = await res.json();
      if (data.image_url) {
        setFrameImageUrl(data.image_url);
        setIsFrameModalOpen(true);
      } else {
        alert('Dữ liệu khung ảnh trống.');
      }
    } catch (err) {
      console.error('Lỗi tải khung:', err);
      alert('Không thể tải khung ảnh: ' + err.message);
    }
  };

  const handleViewQR = async (qrId) => {
    if (!qrId) {
      alert('Không có mã QR để hiển thị.');
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/qr-image?id_qr=${qrId}`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Không tìm thấy mã QR: ${errorText}`);
      }
      const data = await res.json();
      if (data.qr_image_url) {
        setQrImageUrl(data.qr_image_url);
        setQrLink(data.qr_link || '');
        setIsQRModalOpen(true);
      } else {
        alert('Không có dữ liệu mã QR.');
      }
    } catch (err) {
      console.error('Lỗi tải QR:', err);
      alert('Không thể tải mã QR: ' + err.message);
    }
  };

  // === Pagination Controls ===
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length);

  return (
    <>
      <Navbar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        id={id_admin}
        username={username}
      />

      <div className="manageqr-scroll-container">
        <div className={`manageqr-main-container ${sidebarCollapsed ? 'manageqr-sidebar-collapsed' : ''}`}>
          <div className="manageqr-header">
            <h2 className="manageqr-title">QUẢN LÍ MÃ QR ẢNH KHÁCH HÀNG</h2>
          </div>

          <div className="manageqr-controls">
            <div className="manageqr-searchFillter">
              <div className="manageqr-search-box">
                <i className="bi bi-search"></i>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo ID, mã giảm giá, thời gian..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="manageqr-filter-wrapper" ref={filterRef}>
                <button
                  className="manageqr-filter-toggle-btn"
                  onClick={() => setShowFilterMenu((prev) => !prev)}
                >
                  <i className="bi bi-funnel"></i>
                </button>

                <div className={`manageqr-filter-menu ${showFilterMenu ? 'show' : ''}`}>
                  <button
                    className={dateFilter === 'all' ? 'active' : ''}
                    onClick={() => {
                      setDateFilter('all');
                      setShowFilterMenu(false);
                    }}
                  >
                    Tất cả
                  </button>
                  <button
                    className={dateFilter === 'latest' ? 'active' : ''}
                    onClick={() => {
                      setDateFilter('latest');
                      setShowFilterMenu(false);
                    }}
                  >
                    Ngày gần nhất
                  </button>
                  <button
                    className={dateFilter === 'month' ? 'active' : ''}
                    onClick={() => {
                      setDateFilter('month');
                      setShowFilterMenu(false);
                    }}
                  >
                    Tháng gần nhất
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && <div className="manageqr-error">{error}</div>}

          {/* GRID 2 CỘT */}
          <div className="manageqr-content-grid">
            {/* CỘT TRÁI: ĐƠN HÀNG */}
            <div className="manageqr-orders-section">
              {loading ? (
                <div className="manageqr-loading">Đang tải dữ liệu...</div>
              ) : (
                <>
                  <div className="manageqr-table-wrapper">
                    <table className="manageqr-order-table">
                      <thead>
                        <tr>
                          <th>STT</th>
                          <th>MÃ GIẢM GIÁ</th>
                          <th>THỜI GIAN</th>
                          <th>KHUNG ẢNH</th>
                          <th>MÃ QR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renderOrderRows(
                          paginatedOrders,
                          currentPage,
                          ITEMS_PER_PAGE,
                          handleViewFrame,
                          handleViewQR
                        )}
                      </tbody>
                    </table>
                  </div>

                  {filteredOrders.length > 0 && (
                    <div className="manageqr-pagination">
                      <span>
                        Hiển thị {startItem} - {endItem} trên {filteredOrders.length} đơn chụp
                      </span>
                      <div className="pagination-buttons">
                        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                          «
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => goToPage(i + 1)}
                            className={currentPage === i + 1 ? 'active' : ''}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          »
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* CỘT PHẢI: TOP KHUNG ẢNH */}
            <div className="manageqr-top-frames-section">
              <h3 className="manageqr-top-frames-title">Top 5 Khung Ảnh Phổ Biến</h3>
              {loadingTopFrames ? (
                <div className="manageqr-loading">Đang tải...</div>
              ) : (
                <div className="manageqr-top-frames-table-wrapper">
                  <table className="manageqr-top-frames-table">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Khung ảnh</th>
                        <th>Số lần chụp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderTopFramesRows(topFrames)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <FrameImageModal
        isOpen={isFrameModalOpen}
        onClose={() => {
          setIsFrameModalOpen(false);
          setFrameImageUrl('');
        }}
        imageUrl={frameImageUrl}
      />

      <QRModal
        isOpen={isQRModalOpen}
        onClose={() => {
          setIsQRModalOpen(false);
          setQrImageUrl('');
          setQrLink('');
        }}
        qrImage={qrImageUrl}
        qrLink={qrLink}
      />
    </>
  );
};

export default Manageqr;