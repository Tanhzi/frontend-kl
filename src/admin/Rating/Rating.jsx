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
  const [totalRatings, setTotalRatings] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(null);

  // LỌC - Mặc định "Tất cả"
  const [filterType, setFilterType] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef(null);

  // XÓA HÀNG LOẠT
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAllGlobal, setSelectAllGlobal] = useState(false);

  const itemsPerPage = 10;
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // -----------------------------------------------------------------
  // FETCH ĐÁNH GIÁ
  const fetchRatings = async (page = 1, search = '', filter = 'all') => {
    if (!id_admin) return;
    setLoading(true);
    try {
      let url = `${API_URL}/ratings?page=${page}&limit=${itemsPerPage}&id_admin=${id_admin}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      
      // Gửi filter param đến backend
      if (filter === 'latest') url += `&filter=today`; // Backend hiểu "today" = ngày gần nhất
      if (filter === 'recent_month') url += `&filter=month`; // Backend hiểu "month" = tháng gần nhất

      const res = await fetch(url);
      const data = await res.json();

      setRatings(data.data || []);
      setTotalPages(data.total_pages || 1);
      setTotalRatings(data.total || 0);
      setCurrentPage(page);

      // Nếu đang ở trạng thái chọn tất cả → tự động tick các ô hiện tại
      if (selectAllGlobal && data.data) {
        const currentIds = data.data.map(r => r.id);
        setSelectedIds(prev => {
          const set = new Set(prev);
          currentIds.forEach(id => set.add(id));
          return Array.from(set);
        });
      }
    } catch (err) {
      console.error(err);
      alert('Không tải được đánh giá');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings(1, searchTerm, filterType);
  }, [id_admin, filterType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchRatings(1, searchTerm, filterType);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterMenu(false);
      }
    };
    if (showFilterMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterMenu]);

  // -----------------------------------------------------------------
  // CHỌN TẤT CẢ TOÀN CỤC
  const toggleSelectAllGlobal = async () => {
    if (selectAllGlobal) {
      setSelectedIds([]);
      setSelectAllGlobal(false);
      return;
    }

    if (totalRatings === 0) {
      alert('Không có đánh giá nào để chọn!');
      return;
    }

    setLoading(true);
    try {
let url = `${API_URL}/ratings?page=${page}&limit=${itemsPerPage}&id_admin=${id_admin}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filterType === 'latest') url += `&filter=today`;
      if (filterType === 'recent_month') url += `&filter=month`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Lỗi server');

      const data = await res.json();

      if (data.data && Array.isArray(data.data)) {
        const allIds = data.data.map(r => r.id);
        setSelectedIds(allIds);
        setSelectAllGlobal(true);
        alert(`Đã chọn tất cả ${allIds.length} đánh giá!`);
      } else {
        throw new Error('Dữ liệu không hợp lệ');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi khi chọn tất cả đánh giá!');
    } finally {
      setLoading(false);
      fetchRatings(currentPage, searchTerm, filterType);
    }
  };

  const toggleSelectId = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // XÓA HÀNG LOẠT
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 đánh giá để xóa!');
      return;
    }
    if (!confirm(`Xóa vĩnh viễn ${selectedIds.length} đánh giá đã chọn?\nHành động này không thể hoàn tác!`)) return;

    setLoading(true);
    try {
      const promises = selectedIds.map(id =>
        fetch(`${API_URL}/ratings/${id}`, { method: 'DELETE' })
      );
      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);
      if (failed.length === 0) {
        alert(`Đã xóa thành công ${selectedIds.length} đánh giá!`);
      } else {
        alert(`Xóa thành công ${selectedIds.length - failed.length}, thất bại ${failed.length}`);
      }
      setSelectedIds([]);
      setSelectAllGlobal(false);
      fetchRatings(currentPage, searchTerm, filterType);
    } catch (err) {
      alert('Có lỗi khi xóa hàng loạt!');
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------------
  // XÓA ĐƠN
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
      const res = await fetch(`${API_URL}/ratings/${selectedRating.id}`, { method: 'DELETE' });
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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const [datePart, timePart] = dateString.replace('T', ' ').split(' ');
      const [year, month, day] = datePart.split('-');
      const [hour, minute] = timePart.split(':');
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year} ${hour.padStart(2, '0')}:${minute}`;
    } catch {
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

  const isCurrentPageFullySelected = ratings.length > 0 && ratings.every(r => selectedIds.includes(r.id));

  // -----------------------------------------------------------------
  return (
    <div className="ratingpro-root">
      <Navbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} id={id_admin} username={adminName} />

      <div className={`ratingpro-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="ratingpro-header">
          <h2 className="ratingpro-title">QUẢN LÝ ĐÁNH GIÁ KHÁCH HÀNG</h2>
        </div>

        <div className="ratingpro-controls">
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button
              className={`btn-pink batch-delete-btn ${selectedIds.length === 0 ? 'disabled' : ''}`}
              onClick={handleBatchDelete}
            >
              Xóa {selectedIds.length > 0 ? selectedIds.length : 'nhiều đánh giá'}
            </button>
          </div>

          <div className='searchFillter'>
            <div className="ratingpro-search">
              <i className="bi bi-search"></i>
              <input
                type="text"
                placeholder="Tìm theo tên hoặc bình luận..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="ratingpro-filter-wrapper" ref={filterRef}>
              <button className="filter-toggle-btn" onClick={() => setShowFilterMenu(prev => !prev)}>
                <i className="bi bi-funnel"></i>
              </button>

              {showFilterMenu && (
                <div className="ratingpro-filter-menu">
                  <button 
                    className={filterType === 'all' ? 'active' : ''} 
                    onClick={() => handleFilterSelect('all')}
                  >
                    Tất cả
                  </button>
                  <button 
                    className={filterType === 'latest' ? 'active' : ''} 
                    onClick={() => handleFilterSelect('latest')}
                  >
                    Ngày gần nhất
                  </button>
                  <button 
                    className={filterType === 'recent_month' ? 'active' : ''} 
                    onClick={() => handleFilterSelect('recent_month')}
                  >
                    Tháng gần nhất
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="ratingpro-table-wrapper">
          <table className="ratingpro-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectAllGlobal || isCurrentPageFullySelected}
                    onChange={toggleSelectAllGlobal}
                    className="custom-checkbox"
                    title={selectAllGlobal ? "Bỏ chọn tất cả" : "Chọn tất cả đánh giá ở mọi trang"}
                  />
                </th>
                <th>STT</th>
                <th>TÊN KHÁCH</th>
                <th>CHẤT LƯỢNG</th>
                <th>MƯỢT MÀ</th>
                <th>ẢNH ĐẸP</th>
                <th>DỊCH VỤ</th>
                <th>BÌNH LUẬN</th>
                <th>THỜI GIAN</th>
                <th style={{ textAlign: 'center' }}>HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10" style={{ textAlign: 'center' }}>Đang tải...</td></tr>
              ) : ratings.length === 0 ? (
                <tr><td colSpan="10" style={{ textAlign: 'center' }}>Chưa có đánh giá nào</td></tr>
              ) : (
                ratings.map((rating, index) => (
                  <tr key={rating.id} className={selectedIds.includes(rating.id) ? 'selected-row' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(rating.id)}
                        onChange={() => toggleSelectId(rating.id)}
                        className="custom-checkbox"
                      />
                    </td>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td><strong>{rating.name}</strong></td>
                    <td><span className="ratingpro-stars">{renderStars(rating.quality)}</span></td>
                    <td><span className="ratingpro-stars">{renderStars(rating.smoothness)}</span></td>
                    <td><span className="ratingpro-stars">{renderStars(rating.photo)}</span></td>
                    <td><span className="ratingpro-stars">{renderStars(rating.service)}</span></td>
                    <td className="ratingpro-comment-cell">{rating.comment || '-'}</td>
                    <td>{formatDate(rating.created_at)}</td>
                    <td className="ratingpro-actions">
                      <button onClick={() => openDeleteModal(rating)} className="delete-btn">
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="ratingpro-pagination">
          <span>
            Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{' '}
            {Math.min(currentPage * itemsPerPage, (currentPage - 1) * itemsPerPage + ratings.length)} trên {totalRatings} đánh giá
          </span>
          <div className="pagination-buttons">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>«</button>
            {[...Array(totalPages)].map((_, i) => (
              <button key={i + 1} onClick={() => handlePageChange(i + 1)} className={currentPage === i + 1 ? 'active' : ''}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>»</button>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="ratingpro-modal-overlay" onClick={closeModal}>
          <div className="ratingpro-modal-content delete" onClick={e => e.stopPropagation()}>
            <h3>Xóa đánh giá</h3>
            <p>Bạn có chắc chắn muốn xóa đánh giá của <strong>{selectedRating?.name}</strong>?</p>
            <div className="modal-buttons">
              <button className="cancel" onClick={closeModal}>Hủy</button>
              <button className="submit" onClick={handleDelete}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rating;