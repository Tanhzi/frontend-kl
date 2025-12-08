// src/admin/Page/Rating/Rating.jsx
import React, { useEffect, useState, useRef } from 'react';
import Navbar from '../../components/Navbar';
import './Rating.css';

const Rating = () => {
  const [auth] = useState(() => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  });
  const { id: id_admin, username: adminName } = auth || {};

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(null);

  // LỌC
  const [filterType, setFilterType] = useState('all'); // 'all', 'today', 'month'
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef(null);

  const itemsPerPage = 10;

  // -----------------------------------------------------------------
  // FETCH
  const fetchRatings = async (page = 1, search = '', filter = 'all') => {
    if (!id_admin) return;
    setLoading(true);
    try {
      let url = `${import.meta.env.VITE_API_BASE_URL}/ratings?page=${page}&limit=${itemsPerPage}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filter === 'today') url += `&filter=today`;
      if (filter === 'month') url += `&filter=month`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Lỗi tải dữ liệu');
      const data = await res.json();
      setRatings(data.data || []);
      setTotalPages(data.total_pages || 1);
      setCurrentPage(page);
    } catch (err) {
      console.error(err);
      alert('Không tải được đánh giá');
    } finally {
      setLoading(false);
    }
  };

  // Load lần đầu + khi filter thay đổi
  useEffect(() => {
    fetchRatings(1, searchTerm, filterType);
  }, [id_admin, filterType]);

  // Tìm kiếm debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchRatings(1, searchTerm, filterType);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Đóng menu khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterMenu(false);
      }
    };
    if (showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterMenu]);

  // -----------------------------------------------------------------
  // XÓA
  const openDeleteModal = (rating) => {
    setSelectedRating(rating);
    setShowDeleteModal(true);
  };
  const closeModal = () => {
    setShowDeleteModal(false);
    setSelectedRating(null);
  };
  const handleDelete = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/ratings/${selectedRating.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.status === 'success') {
        alert('Xóa đánh giá thành công!');
        closeModal();
        fetchRatings(currentPage, searchTerm, filterType);
      } else {
        alert(result.message || 'Xóa thất bại');
      }
    } catch (err) {
      alert('Lỗi kết nối server');
    }
  };

  // -----------------------------------------------------------------
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  // FORMAT DATE - XỬ LÝ TIMEZONE ĐÚNG
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
      // Parse datetime từ database (format: YYYY-MM-DD HH:mm:ss)
      // Database lưu theo giờ địa phương (Asia/Ho_Chi_Minh)
      
      // Tách date và time
      const parts = dateString.replace('T', ' ').split(' ');
      if (parts.length < 2) return '-';
      
      const [datePart, timePart] = parts;
      const [year, month, day] = datePart.split('-');
      const [hour, minute, second] = timePart.split(':');
      
      // Format: DD/MM/YYYY HH:mm
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  };

  const renderStars = (value) => '★'.repeat(value) + '☆'.repeat(5 - value);

  const handleFilterSelect = (type) => {
    setFilterType(type);
    setShowFilterMenu(false);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      fetchRatings(page, searchTerm, filterType);
    }
  };

  // -----------------------------------------------------------------
  return (
    <div className="admin-rating-root">
      <Navbar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        id={id_admin}
        username={adminName}
      />

      <div className={`admin-rating-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="admin-rating-header">
          <h2 className="admin-rating-title">Quản lý đánh giá khách hàng</h2>
        </div>

        {/* CONTROLS */}
        <div className="admin-rating-controls">
          {/* SEARCH */}
          <div className="admin-rating-search">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Tìm theo tên hoặc bình luận..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* FILTER */}
          <div className="admin-rating-filter-wrapper" ref={filterRef}>
            <button
              className="admin-filter-toggle-btn"
              onClick={() => setShowFilterMenu((prev) => !prev)}
              title="Lọc theo thời gian"
            >
              <i className="bi bi-funnel"></i>
            </button>

            {showFilterMenu && (
              <div className="admin-filter-menu">
                <button
                  className={filterType === 'all' ? 'active' : ''}
                  onClick={() => handleFilterSelect('all')}
                >
                  Tất cả
                </button>
                <button
                  className={filterType === 'today' ? 'active' : ''}
                  onClick={() => handleFilterSelect('today')}
                >
                  Hôm nay
                </button>
                <button
                  className={filterType === 'month' ? 'active' : ''}
                  onClick={() => handleFilterSelect('month')}
                >
                  Tháng này
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TABLE */}
        <div className="admin-rating-table-wrapper">
          <table className="admin-rating-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>TÊN KHÁCH</th>
                <th>CHẤT LƯỢNG</th>
                <th>MƯỢT MÀ</th>
                <th>ẢNH ĐẸP</th>
                <th>DỊCH VỤ</th>
                <th>BÌNH LUẬN</th>
                <th>THỜI GIAN</th>
                <th>HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center">
                    Đang tải...
                  </td>
                </tr>
              ) : ratings.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center">
                    Chưa có đánh giá nào
                  </td>
                </tr>
              ) : (
                ratings.map((rating, index) => (
                  <tr key={rating.id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>
                      <strong>{rating.name}</strong>
                    </td>
                    <td>
                      <span className="admin-stars-gold">{renderStars(rating.quality)}</span>
                    </td>
                    <td>
                      <span className="admin-stars-gold">{renderStars(rating.smoothness)}</span>
                    </td>
                    <td>
                      <span className="admin-stars-gold">{renderStars(rating.photo)}</span>
                    </td>
                    <td>
                      <span className="admin-stars-gold">{renderStars(rating.service)}</span>
                    </td>
                    <td className="admin-comment-cell">{rating.comment || '-'}</td>
                    <td>{formatDate(rating.created_at)}</td>
                    <td className="admin-rating-actions">
                      <button onClick={() => openDeleteModal(rating)} className="admin-delete-btn">
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="admin-rating-pagination">
          <span>
            Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{' '}
            {Math.min(currentPage * itemsPerPage, ratings.length + (currentPage - 1) * itemsPerPage)} trên{' '}
            {totalPages * itemsPerPage} đánh giá
          </span>
          <div className="admin-pagination-buttons">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
              <i className="bi bi-chevron-left"></i>
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => handlePageChange(i + 1)}
                className={currentPage === i + 1 ? 'active' : ''}
              >
                {i + 1}
              </button>
            ))}
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="admin-rating-modal-overlay" onClick={closeModal}>
          <div className="admin-rating-modal delete" onClick={(e) => e.stopPropagation()}>
            <h3>Xóa đánh giá</h3>
            <p>
              Bạn có chắc chắn muốn xóa đánh giá của <strong>{selectedRating?.name}</strong>?
            </p>
            <div className="admin-modal-buttons">
              <button className="admin-cancel-btn" onClick={closeModal}>
                Hủy
              </button>
              <button className="admin-delete-confirm-btn" onClick={handleDelete}>
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rating;