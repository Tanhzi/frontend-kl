import React, { useEffect, useState, useRef } from 'react';
import Navbar from '../../components/Navbar';
import './ContentChat.css';

const ContentChat = () => {
  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const [auth] = useState(getAuth());
  const { id: id_admin, username: adminName } = auth || {};

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTitle, setFilterTitle] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContents, setTotalContents] = useState(0);
  const [uniqueTitles, setUniqueTitles] = useState([]);

  // XÓA HÀNG LOẠT
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAllGlobal, setSelectAllGlobal] = useState(false);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [addForm, setAddForm] = useState({
    title: '', content: ''
  });
  const [editForm, setEditForm] = useState({
    title: '', content: ''
  });

  const itemsPerPage = 10;
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const filterWrapperRef = useRef(null);

  const fetchContents = async (page = 1) => {
    if (!id_admin) return;
    setLoading(true);
    try {
      let url = `${API_URL}/content-chat?id_admin=${id_admin}&page=${page}&limit=${itemsPerPage}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filterTitle && filterTitle !== 'all') url += `&filter_title=${encodeURIComponent(filterTitle)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'success') {
        setContents(data.data || []);
        setUniqueTitles(data.unique_titles || []);
        setTotalPages(data.total_pages || 1);
        setTotalContents(data.total || 0);
        setCurrentPage(page);

        // Cập nhật checkbox khi có chọn toàn cục
        if (selectAllGlobal) {
          const currentIds = data.data.map(c => c.id);
          setSelectedIds(prev => [...new Set([...prev, ...currentIds])]);
        }
      }
    } catch (err) {
      alert('Lỗi tải nội dung chat!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id_admin) fetchContents(1);
  }, [id_admin]);

  useEffect(() => {
    const timer = setTimeout(() => fetchContents(1), 400);
    return () => clearTimeout(timer);
  }, [searchTerm, filterTitle]);

  // Click outside filter
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterWrapperRef.current && !filterWrapperRef.current.contains(e.target)) {
        filterWrapperRef.current.querySelector('.contentchat-filter-menu')?.classList.remove('show');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) fetchContents(page);
  };

  // CHỌN TẤT CẢ TRÊN TẤT CẢ CÁC TRANG
  const toggleSelectAllGlobal = async () => {
    if (selectAllGlobal) {
      setSelectedIds([]);
      setSelectAllGlobal(false);
    } else {
      setLoading(true);
      try {
        let allIds = [];
        for (let page = 1; page <= totalPages; page++) {
          let url = `${API_URL}/content-chat?id_admin=${id_admin}&page=${page}&limit=1000`;
          if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
          if (filterTitle && filterTitle !== 'all') url += `&filter_title=${encodeURIComponent(filterTitle)}`;

          const res = await fetch(url);
          const data = await res.json();
          if (data.status === 'success') {
            allIds = allIds.concat(data.data.map(c => c.id));
          }
        }
        setSelectedIds(allIds);
        setSelectAllGlobal(true);
        alert(`Đã chọn tất cả ${allIds.length} nội dung!`);
      } catch (err) {
        alert('Lỗi khi chọn tất cả!');
      } finally {
        setLoading(false);
        fetchContents(currentPage);
      }
    }
  };

  const toggleSelectId = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return alert('Vui lòng chọn ít nhất 1 nội dung!');
    if (!confirm(`Xóa vĩnh viễn ${selectedIds.length} nội dung đã chọn?`)) return;

    try {
      await Promise.all(selectedIds.map(id => fetch(`${API_URL}/content-chat/${id}`, { method: 'DELETE' })));
      alert(`Đã xóa thành công ${selectedIds.length} nội dung!`);
      setSelectedIds([]);
      setSelectAllGlobal(false);
      fetchContents(currentPage);
    } catch (err) {
      alert('Lỗi xóa hàng loạt!');
    }
  };

  const openAddModal = () => {
    setAddForm({ title: '', content: '' });
    setShowAddModal(true);
  };

  const openEditModal = (contentItem) => {
    setSelectedContent(contentItem);
    setEditForm({
      title: contentItem.title,
      content: contentItem.content
    });
    setShowEditModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.title || !addForm.content) return alert('Title và Content không được để trống!');

    try {
      const res = await fetch(`${API_URL}/content-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, id_admin })
      });
      const result = await res.json();
      alert(result.message || 'Thêm thành công!');
      setShowAddModal(false);
      fetchContents(currentPage);
    } catch (err) {
      alert('Lỗi mạng!');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.title || !editForm.content) return alert('Title và Content không được để trống!');

    try {
      const res = await fetch(`${API_URL}/content-chat/${selectedContent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const result = await res.json();
      alert(result.message || 'Cập nhật thành công!');
      setShowEditModal(false);
      fetchContents(currentPage);
    } catch (err) {
      alert('Lỗi!');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa vĩnh viễn nội dung này?')) return;

    try {
      await fetch(`${API_URL}/content-chat/${id}`, { method: 'DELETE' });
      alert('Xóa thành công!');
      fetchContents(currentPage);
    } catch (err) {
      alert('Lỗi xóa!');
    }
  };

  const closeAllModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedContent(null);
  };

  const isCurrentPageFullySelected = contents.length > 0 && contents.every(c => selectedIds.includes(c.id));

  // Hàm rút gọn content
  const truncateContent = (text, maxLength = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="contentchat-root">
      <Navbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(prev => !prev)} id={id_admin} username={adminName} />

      <div className="contentchat-scroll-container">
        <div className={`contentchat-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="contentchat-header">
            <h2 className="contentchat-title">QUẢN LÝ NỘI DUNG CHATBOT</h2>
          </div>

          <div className="contentchat-controls">
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <button className="btn-pink" onClick={openAddModal}><i className="bi bi-plus-lg"></i>Thêm nội dung</button>
              <button className={`btn-pink batch-delete-btn ${selectedIds.length === 0 ? 'disabled' : ''}`} onClick={handleBatchDelete}>
                Xóa {selectedIds.length > 0 ? selectedIds.length : 'nhiều nội dung'}
              </button>
            </div>

            <div className="searchFilterContent">
              <div className="contentchat-search">
                <i className="bi bi-search"></i>
                <input type="text" placeholder="Tìm title hoặc content..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>

              <div className="contentchat-filter-wrapper" ref={filterWrapperRef}>
                <button className="filter-toggle-btn" onClick={e => e.currentTarget.nextElementSibling.classList.toggle('show')}>
                  <i className="bi bi-funnel"></i>
                </button>
                <div className="contentchat-filter-menu">
                  <button className={!filterTitle ? 'active' : ''} onClick={() => setFilterTitle('')}>Tất cả title</button>
                  {uniqueTitles.map(t => (
                    <button key={t} className={filterTitle === t ? 'active' : ''} onClick={() => setFilterTitle(t)}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="contentchat-table-wrapper">
            <table className="contentchat-table">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>
                    <input type="checkbox" checked={selectAllGlobal || isCurrentPageFullySelected} onChange={toggleSelectAllGlobal} className="custom-checkbox" title={selectAllGlobal ? "Bỏ chọn tất cả" : "Chọn tất cả nội dung"} />
                  </th>
                  <th>STT</th>
                  <th>TITLE</th>
                  <th>CONTENT</th>
                  <th style={{ textAlign: 'center' }}>HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center' }}>Đang tải...</td></tr>
                ) : contents.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center' }}>Chưa có nội dung</td></tr>
                ) : (
                  contents.map((c, i) => (
                    <tr key={c.id} className={selectedIds.includes(c.id) ? 'selected-row' : ''}>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelectId(c.id)} className="custom-checkbox" />
                      </td>
                      <td>{(currentPage - 1) * 10 + i + 1}</td>
                      <td>{c.title}</td>
                      <td>{truncateContent(c.content)}</td>
                      <td className="contentchat-actions" style={{ textAlign: 'center' }}>
                        <button onClick={() => openEditModal(c)} className="edit-btn"><i className="bi bi-pencil"></i></button>
                        <button onClick={() => handleDelete(c.id)} className="delete-btn"><i className="bi bi-trash"></i></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="contentchat-pagination">
            <span>Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalContents)} trên {totalContents} nội dung</span>
            <div className="pagination-buttons">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>«</button>
              {[...Array(totalPages)].map((_, i) => (
                <button key={i + 1} onClick={() => handlePageChange(i + 1)} className={currentPage === i + 1 ? 'active' : ''}>{i + 1}</button>
              ))}
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>»</button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== MODAL THÊM ==================== */}
      {showAddModal && (
        <div className="contentchat-modal-overlay" onClick={closeAllModals}>
          <div className="contentchat-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Thêm nội dung chat mới</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label>Title <span style={{color:'red'}}>*</span></label>
                <input type="text" value={addForm.title} onChange={e => setAddForm(prev => ({...prev, title: e.target.value}))} required />
              </div>
              <div className="form-group">
                <label>Content <span style={{color:'red'}}>*</span></label>
                <textarea rows="10" value={addForm.content} onChange={e => setAddForm(prev => ({...prev, content: e.target.value}))} required />
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={closeAllModals} className="cancel">Hủy</button>
                <button type="submit" className="submit">Thêm nội dung</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL SỬA ==================== */}
      {showEditModal && selectedContent && (
        <div className="contentchat-modal-overlay" onClick={closeAllModals}>
          <div className="contentchat-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Sửa nội dung chat</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input type="text" value={editForm.title} onChange={e => setEditForm(prev => ({...prev, title: e.target.value}))} required />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea rows="10" value={editForm.content} onChange={e => setEditForm(prev => ({...prev, content: e.target.value}))} required />
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

export default ContentChat;