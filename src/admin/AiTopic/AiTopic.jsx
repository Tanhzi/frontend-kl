import React, { useEffect, useState, useRef } from 'react';
import Navbar from '../../components/Navbar';
import './AiTopic.css';

const AiTopic = () => {
  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const [auth] = useState(getAuth());
  const { id: id_admin, username: adminName } = auth || {};

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterName, setFilterName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTopics, setTotalTopics] = useState(0);
  const [uniqueNames, setUniqueNames] = useState([]);

  // XÓA HÀNG LOẠT
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAllGlobal, setSelectAllGlobal] = useState(false);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [addForm, setAddForm] = useState({
    name: '', type: '', status: 'Đang hoạt động', illustration: null, prompt: '', usePrompt: false
  });
  const [editForm, setEditForm] = useState({
    name: '', type: '', status: 'Đang hoạt động', illustration: null, prompt: '', usePrompt: false
  });

  const itemsPerPage = 10;
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const filterWrapperRef = useRef(null);

  const fetchTopics = async (page = 1) => {
    if (!id_admin) return;
    setLoading(true);
    try {
      let url = `${API_URL}/ai-topics?id_admin=${id_admin}&page=${page}&limit=${itemsPerPage}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filterName && filterName !== 'all') url += `&filter_name=${encodeURIComponent(filterName)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'success') {
        setTopics(data.data || []);
        setUniqueNames(data.unique_names || []);
        setTotalPages(data.total_pages || 1);
        setTotalTopics(data.total || 0);
        setCurrentPage(page);

        // Cập nhật checkbox khi có chọn toàn cục
        if (selectAllGlobal) {
          const currentIds = data.data.map(t => t.id);
          setSelectedIds(prev => [...new Set([...prev, ...currentIds])]);
        }
      }
    } catch (err) {
      alert('Lỗi tải chủ đề AI!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id_admin) fetchTopics(1);
  }, [id_admin]);

  useEffect(() => {
    const timer = setTimeout(() => fetchTopics(1), 400);
    return () => clearTimeout(timer);
  }, [searchTerm, filterName]);

  // Click outside filter
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterWrapperRef.current && !filterWrapperRef.current.contains(e.target)) {
        filterWrapperRef.current.querySelector('.aitopic-filter-menu')?.classList.remove('show');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) fetchTopics(page);
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
          let url = `${API_URL}/ai-topics?id_admin=${id_admin}&page=${page}&limit=1000`;
          if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
          if (filterName && filterName !== 'all') url += `&filter_name=${encodeURIComponent(filterName)}`;

          const res = await fetch(url);
          const data = await res.json();
          if (data.status === 'success') {
            allIds = allIds.concat(data.data.map(t => t.id));
          }
        }
        setSelectedIds(allIds);
        setSelectAllGlobal(true);
        alert(`Đã chọn tất cả ${allIds.length} chủ đề!`);
      } catch (err) {
        alert('Lỗi khi chọn tất cả!');
      } finally {
        setLoading(false);
        fetchTopics(currentPage);
      }
    }
  };

  const toggleSelectId = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return alert('Vui lòng chọn ít nhất 1 chủ đề!');
    if (!confirm(`Xóa vĩnh viễn ${selectedIds.length} chủ đề đã chọn?`)) return;

    try {
      await Promise.all(selectedIds.map(id => fetch(`${API_URL}/ai-topics/${id}`, { method: 'DELETE' })));
      alert(`Đã xóa thành công ${selectedIds.length} chủ đề!`);
      setSelectedIds([]);
      setSelectAllGlobal(false);
      fetchTopics(currentPage);
    } catch (err) {
      alert('Lỗi xóa hàng loạt!');
    }
  };

  const openAddModal = () => {
    setAddForm({ name: '', type: '', status: 'Đang hoạt động', illustration: null, prompt: '', usePrompt: false });
    setShowAddModal(true);
  };

  const openEditModal = (topic) => {
    setSelectedTopic(topic);
    setEditForm({
      name: topic.name,
      type: topic.type || '',
      status: topic.status,
      illustration: null,
      prompt: topic.is_prompt ? topic.illustration : '',
      usePrompt: topic.is_prompt
    });
    setShowEditModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.name) return alert('Tên chủ đề không được để trống!');

    const formData = new FormData();
    formData.append('id_admin', id_admin);
    formData.append('name', addForm.name);
    formData.append('type', addForm.type);
    formData.append('status', addForm.status);

    if (addForm.usePrompt && addForm.prompt) {
      formData.append('prompt', addForm.prompt);
    } else if (addForm.illustration) {
      formData.append('illustration', addForm.illustration);
    }

    try {
      const res = await fetch(`${API_URL}/ai-topics`, { method: 'POST', body: formData });
      const result = await res.json();
      alert(result.message || 'Thêm thành công!');
      setShowAddModal(false);
      fetchTopics(currentPage);
    } catch (err) {
      alert('Lỗi mạng!');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('_method', 'PUT');
    if (editForm.name !== selectedTopic.name) formData.append('name', editForm.name);
    if (editForm.type !== (selectedTopic.type || '')) formData.append('type', editForm.type);
    if (editForm.status !== selectedTopic.status) formData.append('status', editForm.status);

    if (editForm.usePrompt && editForm.prompt) {
      formData.append('prompt', editForm.prompt);
    } else if (editForm.illustration) {
      formData.append('illustration', editForm.illustration);
    }

    try {
      const res = await fetch(`${API_URL}/ai-topics/${selectedTopic.id}`, { method: 'POST', body: formData });
      const result = await res.json();
      alert(result.message || 'Cập nhật thành công!');
      setShowEditModal(false);
      fetchTopics(currentPage);
    } catch (err) {
      alert('Lỗi!');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa vĩnh viễn chủ đề này?')) return;

    try {
      await fetch(`${API_URL}/ai-topics/${id}`, { method: 'DELETE' });
      alert('Xóa thành công!');
      fetchTopics(currentPage);
    } catch (err) {
      alert('Lỗi xóa!');
    }
  };

  const closeAllModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedTopic(null);
  };

  const isCurrentPageFullySelected = topics.length > 0 && topics.every(t => selectedIds.includes(t.id));

  return (
    <div className="aitopic-root">
      <Navbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(prev => !prev)} id={id_admin} username={adminName} />

      <div className="aitopic-scroll-container">
        <div className={`aitopic-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="aitopic-header">
            <h2 className="aitopic-title">QUẢN LÝ HIỆU ỨNG AI</h2>
          </div>

          <div className="aitopic-controls">
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <button className="btn-pink" onClick={openAddModal}><i className="bi bi-plus-lg"></i>Thêm chủ đề AI</button>
              <button className={`btn-pink batch-delete-btn ${selectedIds.length === 0 ? 'disabled' : ''}`} onClick={handleBatchDelete}>
                Xóa {selectedIds.length > 0 ? selectedIds.length : 'nhiều chủ đề AI'}
              </button>
            </div>

            <div className="searchFillter">
              <div className="aitopic-search">
                <i className="bi bi-search"></i>
                <input type="text" placeholder="Tìm tên hoặc loại..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>

              <div className="aitopic-filter-wrapper" ref={filterWrapperRef}>
                <button className="filter-toggle-btn" onClick={e => e.currentTarget.nextElementSibling.classList.toggle('show')}>
                  <i className="bi bi-funnel"></i>
                </button>
                <div className="aitopic-filter-menu">
                  <button className={!filterName ? 'active' : ''} onClick={() => setFilterName('')}>Tất cả tên</button>
                  {uniqueNames.map(n => (
                    <button key={n} className={filterName === n ? 'active' : ''} onClick={() => setFilterName(n)}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="aitopic-table-wrapper">
            <table className="aitopic-table">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>
                    <input type="checkbox" checked={selectAllGlobal || isCurrentPageFullySelected} onChange={toggleSelectAllGlobal} className="custom-checkbox" title={selectAllGlobal ? "Bỏ chọn tất cả" : "Chọn tất cả chủ đề"} />
                  </th>
                  <th>STT</th>
                  <th>TÊN</th>
                  <th>CHỦ ĐỀ</th>
                  <th style={{ textAlign: 'center' }}>MINH HỌA</th>
                  <th style={{ textAlign: 'center' }}>TRẠNG THÁI</th>
                  <th style={{ textAlign: 'center' }}>HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center' }}>Đang tải...</td></tr>
                ) : topics.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center' }}>Chưa có chủ đề AI</td></tr>
                ) : (
                  topics.map((t, i) => (
                    <tr key={t.id} className={selectedIds.includes(t.id) ? 'selected-row' : ''}>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSelectId(t.id)} className="custom-checkbox" />
                      </td>
                      <td>{(currentPage - 1) * 10 + i + 1}</td>
                      <td>{t.name}</td>
                      <td>{t.type || '—'}</td>
                      <td style={{ textAlign: 'center', padding: '12px 0' }}>
                        {t.is_prompt ? (
                          <span style={{ color: '#d81b60', fontWeight: '600', fontSize: '13px', padding: '8px 12px', background: '#fce4ec', borderRadius: '8px' }}>Prompt</span>
                        ) : t.illustration ? (
                          <img src={t.illustration} alt="ill" className="aitopic-thumb" />
                        ) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>{t.status}</td>
                      <td className="aitopic-actions" style={{ textAlign: 'center' }}>
                        <button onClick={() => openEditModal(t)} className="edit-btn"><i className="bi bi-pencil"></i></button>
                        <button onClick={() => handleDelete(t.id)} className="delete-btn"><i className="bi bi-trash"></i></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="aitopic-pagination">
            <span>Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalTopics)} trên {totalTopics} chủ đề</span>
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
        <div className="aitopic-modal-overlay" onClick={closeAllModals}>
          <div className="aitopic-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Thêm chủ đề AI mới</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label>Tên chủ đề <span style={{color:'red'}}>*</span></label>
                <input type="text" value={addForm.name} onChange={e => setAddForm(prev => ({...prev, name: e.target.value}))} required />
              </div>
              <div className="form-group">
                <label>Loại / Chủ đề</label>
                <input type="text" placeholder="VD: Phim ảnh, Halloween..." value={addForm.type} onChange={e => setAddForm(prev => ({...prev, type: e.target.value}))} />
              </div>
              <div className="form-group">
                <label>Trạng thái</label>
                <select value={addForm.status} onChange={e => setAddForm(prev => ({...prev, status: e.target.value}))}>
                  <option>Đang hoạt động</option>
                  <option>Không hoạt động</option>
                </select>
              </div>
              <div className="form-group">
                <label>Minh họa</label>
                <div style={{display:'flex', gap:'20px', marginTop:'10px'}}>
                  <label style={{cursor:'pointer'}}>
                    <input type="radio" checked={!addForm.usePrompt} onChange={() => setAddForm(prev => ({...prev, usePrompt: false, prompt: ''}))} />
                    <span style={{marginLeft:'8px'}}>Tải lên ảnh minh họa</span>
                  </label>
                  <label style={{cursor:'pointer'}}>
                    <input type="radio" checked={addForm.usePrompt} onChange={() => setAddForm(prev => ({...prev, usePrompt: true, illustration: null}))} />
                    <span style={{marginLeft:'8px'}}>Nhập Prompt</span>
                  </label>
                </div>
                {!addForm.usePrompt ? (
                  <input type="file" accept="image/*" onChange={e => e.target.files[0] && setAddForm(prev => ({...prev, illustration: e.target.files[0]}))} />
                ) : (
                  <textarea rows="6" placeholder="Nhập prompt chi tiết để AI tạo hình theo chủ đề..." value={addForm.prompt} onChange={e => setAddForm(prev => ({...prev, prompt: e.target.value}))} />
                )}
                {addForm.illustration && <small style={{color:'#d81b60'}}>Đã chọn: {addForm.illustration.name}</small>}
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={closeAllModals} className="cancel">Hủy</button>
                <button type="submit" className="submit">Thêm chủ đề</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL SỬA ==================== */}
      {showEditModal && selectedTopic && (
        <div className="aitopic-modal-overlay" onClick={closeAllModals}>
          <div className="aitopic-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Sửa chủ đề AI</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Tên chủ đề</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm(prev => ({...prev, name: e.target.value}))} required />
              </div>
              <div className="form-group">
                <label>Loại / Chủ đề</label>
                <input type="text" value={editForm.type} onChange={e => setEditForm(prev => ({...prev, type: e.target.value}))} />
              </div>
              <div className="form-group">
                <label>Trạng thái</label>
                <select value={editForm.status} onChange={e => setEditForm(prev => ({...prev, status: e.target.value}))}>
                  <option>Đang hoạt động</option>
                  <option>Không hoạt động</option>
                </select>
              </div>
              <div className="form-group">
                <label>Minh họa</label>
                <div style={{display:'flex', gap:'20px', marginBottom:'10px'}}>
                  <label style={{cursor:'pointer'}}>
                    <input type="radio" checked={!editForm.usePrompt} onChange={() => setEditForm(prev => ({...prev, usePrompt: false, prompt: ''}))} />
                    <span style={{marginLeft:'8px'}}>Thay ảnh mới</span>
                  </label>
                  <label style={{cursor:'pointer'}}>
                    <input type="radio" checked={editForm.usePrompt} onChange={() => setEditForm(prev => ({...prev, usePrompt: true, illustration: null}))} />
                    <span style={{marginLeft:'8px'}}>Dùng Prompt</span>
                  </label>
                </div>
                {!editForm.usePrompt ? (
                  <input type="file" accept="image/*" onChange={e => e.target.files[0] && setEditForm(prev => ({...prev, illustration: e.target.files[0]}))} />
                ) : (
                  <textarea rows="6" value={editForm.prompt} onChange={e => setEditForm(prev => ({...prev, prompt: e.target.value}))} />
                )}
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

export default AiTopic;