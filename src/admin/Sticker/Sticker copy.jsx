// src/admin/Page/Sticker/Sticker.jsx
import React, { useEffect, useState, useRef } from 'react';
import Navbar from '../../components/Navbar';
import './Sticker.css';

const Sticker = () => {
  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };
  const [auth] = useState(getAuth());
  const { id: id_admin, username: adminName } = auth || {};

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stickers, setStickers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [uniqueTypes, setUniqueTypes] = useState([]);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [addForm, setAddForm] = useState({ id_topic: '', type: '', files: [] });
  const [editFormData, setEditFormData] = useState({ id_topic: '', type: '', file: null });

  const itemsPerPage = 10;
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Ref để đóng filter khi click ngoài
  const filterWrapperRef = useRef(null);

  const fetchStickers = async (page = 1) => {
    if (!id_admin) return;
    setLoading(true);
    try {
      let url = `${API_URL}/stickers?id_admin=${id_admin}&page=${page}&limit=${itemsPerPage}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filterType && filterType !== 'all') url += `&filter_type=${encodeURIComponent(filterType)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'success') {
        setStickers(data.data || []);
        setTotalPages(data.total_pages || 1);
        setCurrentPage(page);
        const types = [...new Set(data.data.map(s => s.type).filter(Boolean))].sort();
        setUniqueTypes(types);
      }
    } catch (err) {
      alert('Lỗi tải sticker!');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_URL}/events?id_admin=${id_admin}`);
      const data = await res.json();
      setEvents(data.data || []);
    } catch (err) {
      setEvents([]);
    }
  };

  useEffect(() => {
    if (id_admin) {
      fetchStickers(1);
      fetchEvents();
    }
  }, [id_admin]);

  useEffect(() => {
    const timer = setTimeout(() => fetchStickers(1), 400);
    return () => clearTimeout(timer);
  }, [searchTerm, filterType]);

  // Đóng filter menu khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterWrapperRef.current && !filterWrapperRef.current.contains(e.target)) {
        filterWrapperRef.current.querySelector('.stickerpro-filter-menu')?.classList.remove('show');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) fetchStickers(page);
  };

  const openAddModal = () => {
    setAddForm({ id_topic: '', type: '', files: [] });
    setShowAddModal(true);
  };

  const handleFilesChange = (e) => {
    setAddForm(prev => ({ ...prev, files: Array.from(e.target.files) }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (addForm.files.length === 0) return alert('Chọn ít nhất 1 file!');
    const formData = new FormData();
    formData.append('id_admin', id_admin);
    if (addForm.id_topic) formData.append('id_topic', addForm.id_topic);
    if (addForm.type) formData.append('type', addForm.type);
    addForm.files.forEach(f => formData.append('stickers[]', f));

    try {
      const res = await fetch(`${API_URL}/stickers`, { method: 'POST', body: formData });
      const result = await res.json();
      alert(result.message || 'Thành công!');
      setShowAddModal(false);
      fetchStickers(currentPage);
    } catch (err) {
      alert('Lỗi mạng!');
    }
  };

  const openEditModal = (sticker) => {
    setSelectedSticker(sticker);
    setEditFormData({
      id_topic: String(sticker.id_topic || ''),
      type: sticker.type || '',
      file: null
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('_method', 'PUT');
    if (editFormData.id_topic !== String(selectedSticker.id_topic || '')) formData.append('id_topic', editFormData.id_topic);
    if (editFormData.type !== selectedSticker.type) formData.append('type', editFormData.type);
    if (editFormData.file) formData.append('sticker', editFormData.file);

    try {
      const res = await fetch(`${API_URL}/stickers/${selectedSticker.id}`, {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      alert(result.message || 'Cập nhật thành công!');
      setShowEditModal(false);
      fetchStickers(currentPage);
    } catch (err) {
      alert('Lỗi!');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa vĩnh viễn sticker này?')) return;
    try {
      const res = await fetch(`${API_URL}/stickers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Xóa thành công!');
        fetchStickers(currentPage);
      }
    } catch (err) {
      alert('Lỗi xóa!');
    }
  };

  const closeAllModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedSticker(null);
  };

  return (
    <div className="stickerpro-root">
      <Navbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(prev => !prev)} id={id_admin} username={adminName} />

      <div className="stickerpro-scroll-container">
        <div className={`stickerpro-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="stickerpro-header">
            <h2 className="stickerpro-title">Quản lý Sticker</h2>
          </div>

          <div className="stickerpro-controls">
            <button className="btn-pink" onClick={openAddModal}>+ Thêm sticker</button>

            <div className='searchFillter'>
                <div className="stickerpro-search">
                <i className="bi bi-search"></i>
                <input
                    type="text"
                    placeholder="Tìm theo loại hoặc chủ đề..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                </div>

            {/* NÚT LỌC ĐƯA XUỐNG CUỐI HÀNG */}
                <div className="stickerpro-filter-wrapper" ref={filterWrapperRef}>
                    <button
                        className="filter-toggle-btn"
                        onClick={(e) => e.currentTarget.nextElementSibling.classList.toggle('show')}
                    >
                        <i className="bi bi-funnel"></i>
                    </button>
                    <div className="stickerpro-filter-menu">
                        <button className={!filterType ? 'active' : ''} onClick={() => setFilterType('')}>
                        Tất cả loại
                        </button>
                        {uniqueTypes.map(t => (
                        <button key={t} className={filterType === t ? 'active' : ''} onClick={() => setFilterType(t)}>
                            {t}
                        </button>
                        ))}
                    </div>
                </div>
            </div>
          </div>

          {/* BẢNG */}
          <div className="stickerpro-table-wrapper">
            <table className="stickerpro-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Sticker</th>
                  <th>Chủ đề</th>
                  <th>Loại/Nhóm</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{textAlign:'center'}}>Đang tải...</td></tr>
                ) : stickers.length === 0 ? (
                  <tr><td colSpan="5" style={{textAlign:'center'}}>Chưa có sticker</td></tr>
                ) : (
                  stickers.map((s, i) => (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedSticker(s.id === selectedSticker?.id ? null : s)}
                      className={s.id === selectedSticker?.id ? 'selected-row' : ''}
                    >
                      <td>{(currentPage-1)*10 + i + 1}</td>
                      <td><img src={s.sticker} alt="" className="stickerpro-thumb" /></td>
                      <td>{s.event_name || '—'}</td>
                      <td>{s.type || '—'}</td>
                      <td className="stickerpro-actions">
                        <button onClick={(e) => {e.stopPropagation(); openEditModal(s)}} className="edit-btn">
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button onClick={(e) => {e.stopPropagation(); handleDelete(s.id)}} className="delete-btn">
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PHÂN TRANG */}
          <div className="stickerpro-pagination">
            <span>
              Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{' '}
              {Math.min(currentPage * itemsPerPage, (currentPage - 1) * itemsPerPage + stickers.length)} trên{' '}
              {totalPages * itemsPerPage} sticker
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
      </div>

      {/* MODAL THÊM & SỬA – giữ nguyên 100% */}
      {showAddModal && (
        <div className="stickerpro-modal-overlay" onClick={closeAllModals}>
          <div className="stickerpro-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Thêm nhiều sticker cùng lúc</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label>Chủ đề sự kiện (tùy chọn)</label>
                <select value={addForm.id_topic} onChange={e => setAddForm(prev => ({ ...prev, id_topic: e.target.value }))}>
                  <option value="">— Không chọn —</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Nhóm / Loại sticker (tùy chọn)</label>
                <input type="text" placeholder="VD: Cute, Halloween..." value={addForm.type} onChange={e => setAddForm(prev => ({ ...prev, type: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Chọn nhiều file sticker *</label>
                <input type="file" multiple accept="image/*" onChange={handleFilesChange} required />
                {addForm.files.length > 0 && <small style={{color:'#d81b60',fontWeight:600}}>Đã chọn {addForm.files.length} file</small>}
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={closeAllModals} className="cancel">Hủy</button>
                <button type="submit" className="submit">Thêm tất cả sticker</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedSticker && (
        <div className="stickerpro-modal-overlay" onClick={closeAllModals}>
          <div className="stickerpro-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Sửa sticker</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Chủ đề sự kiện</label>
                <select value={editFormData.id_topic} onChange={e => setEditFormData(prev => ({ ...prev, id_topic: e.target.value }))}>
                  <option value="">— Không chọn —</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Nhóm / Loại sticker</label>
                <input type="text" value={editFormData.type} onChange={e => setEditFormData(prev => ({ ...prev, type: e.target.value }))} placeholder="VD: Cute..." />
              </div>
              <div className="form-group">
                <label>Thay ảnh mới (để trống nếu không đổi)</label>
                <input type="file" accept="image/*" onChange={e => e.target.files[0] && setEditFormData(prev => ({ ...prev, file: e.target.files[0] }))} />
                {editFormData.file && <small style={{color:'#d81b60'}}>Đã chọn: {editFormData.file.name}</small>}
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={closeAllModals} className="cancel">Hủy</button>
                <button type="submit" className="submit">Cập nhật</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sticker;

/* chạy ổn rồi nhưng chưa update css 
với cả xóa hàng loạt */