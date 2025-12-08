// src/admin/Page/AccountUser/AccountUser.jsx
import React, { useEffect, useState, useRef } from 'react';
import Navbar from '../../components/Navbar';
import './AccountUser.css';

const AccountUser = () => {
  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const [auth] = useState(getAuth());
  const { id: id_admin, username: adminName } = auth || {};

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    username: '', email: '', password: '', id_topic: '', id_admin: id_admin || ''
  });

  // === XÓA HÀNG LOẠT ===
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAllGlobal, setSelectAllGlobal] = useState(false);

  const itemsPerPage = 10;
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // -----------------------------------------------------------------
  // FETCH
  const fetchUsers = async (page = 1, search = '') => {
    if (!id_admin) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/users?id_admin=${id_admin}&page=${page}&search=${encodeURIComponent(search)}&limit=${itemsPerPage}`
      );
      const data = await res.json();
      setUsers(data.data || []);
      setTotalPages(data.total_pages || 1);
      setTotalUsers(data.total || 0);
      setCurrentPage(page);

      if (selectAllGlobal && data.data) {
        const currentIds = data.data.map(u => u.id);
        setSelectedIds(prev => {
          const set = new Set(prev);
          currentIds.forEach(id => set.add(id));
          return Array.from(set);
        });
      }
    } catch (err) {
      console.error(err);
      alert('Không tải được danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [id_admin]);

  useEffect(() => {
    const delay = setTimeout(() => fetchUsers(1, searchTerm), 400);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  // -----------------------------------------------------------------
  // CHỌN TẤT CẢ TOÀN CỤC
  const toggleSelectAllGlobal = async () => {
    if (selectAllGlobal) {
      setSelectedIds([]);
      setSelectAllGlobal(false);
      return;
    }

    if (totalUsers === 0) {
      alert('Không có tài khoản nào để chọn!');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/users?id_admin=${id_admin}&limit=${totalUsers}&page=1&search=${encodeURIComponent(searchTerm)}`
      );
      const data = await res.json();

      if (data.data && Array.isArray(data.data)) {
        const allIds = data.data.map(u => u.id);
        setSelectedIds(allIds);
        setSelectAllGlobal(true);
        alert(`Đã chọn tất cả ${allIds.length} tài khoản!`);
      } else {
        throw new Error('Dữ liệu không hợp lệ');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi khi chọn tất cả!');
    } finally {
      setLoading(false);
      fetchUsers(currentPage, searchTerm);
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
      alert('Vui lòng chọn ít nhất 1 tài khoản để xóa!');
      return;
    }
    if (!confirm(`Xóa vĩnh viễn ${selectedIds.length} tài khoản đã chọn?\nHành động này không thể hoàn tác!`)) return;

    setLoading(true);
    try {
      const promises = selectedIds.map(id =>
        fetch(`${API_URL}/users/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_admin })
        })
      );
      await Promise.all(promises);
      alert(`Đã xóa thành công ${selectedIds.length} tài khoản!`);
      setSelectedIds([]);
      setSelectAllGlobal(false);
      fetchUsers(currentPage, searchTerm);
    } catch (err) {
      alert('Có lỗi khi xóa hàng loạt!');
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------------
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) fetchUsers(page, searchTerm);
  };

  const openAddModal = () => {
    setFormData({ username: '', email: '', password: '', id_topic: '', id_admin: id_admin });
    setShowAddModal(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username || '',
      email: user.email || '',
      password: '',
      id_topic: user.id_topic || '',
      id_admin: user.id_admin || id_admin
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedUser(null);
  };

  const handleSubmit = async (isEdit = false) => {
    const url = isEdit
      ? `${API_URL}/users/${selectedUser.id}`
      : `${API_URL}/users`;

    try {
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await res.json();

      if (result.status === 'success') {
        alert(isEdit ? 'Cập nhật thành công!' : 'Thêm thành công!');
        closeModals();
        fetchUsers(currentPage, searchTerm);
      } else {
        alert(result.message || 'Lỗi hệ thống');
      }
    } catch (err) {
      alert('Lỗi kết nối server');
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API_URL}/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_admin })
      });
      const result = await res.json();
      if (result.status === 'success') {
        alert('Xóa thành công!');
        closeModals();
        fetchUsers(currentPage, searchTerm);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert('Lỗi xóa');
    }
  };

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  const isCurrentPageFullySelected = users.length > 0 && users.every(u => selectedIds.includes(u.id));

  // -----------------------------------------------------------------
  return (
    <div className="accountuserpro-root">
      <Navbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} id={id_admin} username={adminName} />

      <div className={`accountuserpro-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="accountuserpro-header">
          <h2 className="accountuserpro-title">QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG</h2>
        </div>

        <div className="accountuserpro-controls">
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button className="btn-pink" onClick={openAddModal}>
              <i className="bi bi-plus-lg"></i> Thêm người dùng
            </button>
            <button
              className={`btn-pink batch-delete-btn ${selectedIds.length === 0 ? 'disabled' : ''}`}
              onClick={handleBatchDelete}
            >
              Xóa {selectedIds.length > 0 ? selectedIds.length : 'nhiều tài khoản'}
            </button>
          </div>

          <div className="accountuserpro-search">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="accountuserpro-table-wrapper">
          <table className="accountuserpro-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectAllGlobal || isCurrentPageFullySelected}
                    onChange={toggleSelectAllGlobal}
                    className="custom-checkbox"
                    title={selectAllGlobal ? "Bỏ chọn tất cả" : "Chọn tất cả tài khoản ở mọi trang"}
                  />
                </th>
                <th>STT</th>
                <th>USERNAME</th>
                <th>EMAIL</th>
                <th>ID_TOPIC</th>
                <th>ID_ADMIN</th>
                <th style={{ textAlign: 'center' }}>HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>Đang tải...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>Không có dữ liệu</td></tr>
              ) : (
                users.map((user, index) => (
                  <tr
                    key={user.id}
                    className={selectedIds.includes(user.id) ? 'selected-row' : ''}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(user.id)}
                        onChange={() => toggleSelectId(user.id)}
                        className="custom-checkbox"
                      />
                    </td>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.id_topic || '—'}</td>
                    <td>{user.id_admin}</td>
                    <td className="accountuserpro-actions">
                      <button onClick={() => openEditModal(user)} className="edit-btn">
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button onClick={() => openDeleteModal(user)} className="delete-btn">
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="accountuserpro-pagination">
          <span>
            Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{' '}
            {Math.min(currentPage * itemsPerPage, (currentPage - 1) * itemsPerPage + users.length)} trên {totalUsers} tài khoản
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

      {/* Modal Thêm */}
      {showAddModal && (
        <div className="accountuserpro-modal-overlay" onClick={closeModals}>
          <div className="accountuserpro-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Thêm Người dùng mới</h3>
            <div className="modal-field"><label>USERNAME *</label><input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></div>
            <div className="modal-field"><label>EMAIL *</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            <div className="modal-field"><label>PASSWORD *</label><input type="password" onChange={e => setFormData({...formData, password: e.target.value})} /></div>
            <div className="modal-field"><label>ID_TOPIC</label><input type="text" value={formData.id_topic} onChange={e => setFormData({...formData, id_topic: e.target.value})} /></div>
            <div className="modal-field"><label>ID_ADMIN</label><input type="text" value={formData.id_admin} readOnly /></div>
            <div className="modal-buttons">
              <button className="cancel" onClick={closeModals}>Hủy</button>
              <button className="submit" onClick={() => handleSubmit(false)}>Thêm</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa */}
      {showEditModal && (
        <div className="accountuserpro-modal-overlay" onClick={closeModals}>
          <div className="accountuserpro-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Sửa Tài khoản</h3>
            <div className="modal-field"><label>USERNAME</label><input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></div>
            <div className="modal-field"><label>EMAIL</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            <div className="modal-field"><label>PASSWORD</label><input type="password" placeholder="Để trống nếu không đổi" onChange={e => setFormData({...formData, password: e.target.value})} /></div>
            <div className="modal-field"><label>ID_TOPIC</label><input type="text" value={formData.id_topic} onChange={e => setFormData({...formData, id_topic: e.target.value})} /></div>
            <div className="modal-field"><label>ID_ADMIN</label><input type="text" value={formData.id_admin} readOnly /></div>
            <div className="modal-buttons">
              <button className="cancel" onClick={closeModals}>Hủy</button>
              <button className="submit" onClick={() => handleSubmit(true)}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xóa */}
      {showDeleteModal && (
        <div className="accountuserpro-modal-overlay" onClick={closeModals}>
          <div className="accountuserpro-modal-content delete" onClick={e => e.stopPropagation()}>
            <h3>Xóa Tài khoản</h3>
            <p>Xác nhận xóa <strong>{selectedUser?.username}</strong>?</p>
            <div className="modal-buttons">
              <button className="cancel" onClick={closeModals}>Hủy</button>
              <button className="submit" onClick={handleDelete}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountUser;