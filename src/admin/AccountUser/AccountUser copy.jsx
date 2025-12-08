// src/admin/Page/AccountUser/AccountUser.jsx – PHIÊN BẢN HOÀN CHỈNH NHẤT
import React, { useEffect, useState } from 'react';
import Navbar from '../../../components/Navbar';
import './AccountUser.css';

const AccountUser = () => {
  const [auth] = useState(() => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  });
  const { id: id_admin, username: adminName } = auth || {};

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    username: '', email: '', password: '', id_topic: '', id_admin: id_admin || ''
  });

  const itemsPerPage = 10;

  const fetchUsers = async (page = 1, search = '') => {
    if (!id_admin) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/users?id_admin=${id_admin}&page=${page}&search=${encodeURIComponent(search)}&limit=${itemsPerPage}`
      );
      if (!res.ok) throw new Error('Lỗi mạng');
      const data = await res.json();
      setUsers(data.data || []);
      setTotalPages(data.total_pages || 1);
      setCurrentPage(page);
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
      ? `${import.meta.env.VITE_API_BASE_URL}/users/${selectedUser.id}`
      : `${import.meta.env.VITE_API_BASE_URL}/users`;

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
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/${selectedUser.id}`, {
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

  return (
    <div className="accountuser-root">
      <Navbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} id={id_admin} username={adminName} />

      <div className={`accountuser-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="accountuser-header">
          <h2 className="accountuser-title">Quản lý tài khoản người dùng</h2>
        </div>

        <div className="accountuser-controls">
          <div className="accountuser-search">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="accountuser-add-btn" onClick={openAddModal}>
            <i className="bi bi-plus-lg"></i> Thêm Người dùng mới
          </button>
        </div>

        <div className="accountuser-table-wrapper">
          <table className="accountuser-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>USERNAME</th>
                <th>EMAIL</th>
                <th>ID_TOPIC</th>
                <th>ID_ADMIN</th>
                <th>HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center">Đang tải...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="6" className="text-center">Không có dữ liệu</td></tr>
              ) : (
                users.map((user, index) => (
                  <tr key={user.id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.id_topic || '-'}</td>
                    <td>{user.id_admin}</td>
                    <td className="accountuser-actions">
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

        <div className="accountuser-pagination">
          <span>Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, users.length + (currentPage - 1) * itemsPerPage)} trên {totalPages * itemsPerPage} tài khoản</span>
          <div className="pagination-buttons">
                <button 
                    onClick={() => handlePageChange(currentPage - 1)} 
                    disabled={currentPage === 1}
                    className="pagination-btn"
                >
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
                
                <button 
                    onClick={() => handlePageChange(currentPage + 1)} 
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                >
                    <i className="bi bi-chevron-right"></i>
                </button>
            </div>
        </div>
      </div>

      {/* Modal Thêm */}
      {showAddModal && (
        <div className="accountuser-modal-overlay" onClick={closeModals}>
          <div className="accountuser-modal" onClick={e => e.stopPropagation()}>
            <h3>Thêm Người dùng mới</h3>
            <div className="modal-field"><label>USERNAME *</label><input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></div>
            <div className="modal-field"><label>EMAIL *</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            <div className="modal-field"><label>PASSWORD *</label><input type="password" onChange={e => setFormData({...formData, password: e.target.value})} /></div>
            <div className="modal-field"><label>ID_TOPIC</label><input type="text" value={formData.id_topic} onChange={e => setFormData({...formData, id_topic: e.target.value})} /></div>
            <div className="modal-field"><label>ID_ADMIN</label><input type="text" value={formData.id_admin} readOnly /></div>
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={closeModals}>Hủy</button>
              <button className="save-btn" onClick={() => handleSubmit(false)}>Thêm</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa */}
      {showEditModal && (
        <div className="accountuser-modal-overlay" onClick={closeModals}>
          <div className="accountuser-modal" onClick={e => e.stopPropagation()}>
            <h3>Sửa Tài khoản</h3>
            <div className="modal-field"><label>USERNAME</label><input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></div>
            <div className="modal-field"><label>EMAIL</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            <div className="modal-field"><label>PASSWORD</label><input type="password" placeholder="Để trống nếu không đổi" onChange={e => setFormData({...formData, password: e.target.value})} /></div>
            <div className="modal-field"><label>ID_TOPIC</label><input type="text" value={formData.id_topic} onChange={e => setFormData({...formData, id_topic: e.target.value})} /></div>
            <div className="modal-field"><label>ID_ADMIN</label><input type="text" value={formData.id_admin} readOnly /></div>
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={closeModals}>Hủy</button>
              <button className="save-btn" onClick={() => handleSubmit(true)}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xóa */}
      {showDeleteModal && (
        <div className="accountuser-modal-overlay" onClick={closeModals}>
          <div className="accountuser-modal delete" onClick={e => e.stopPropagation()}>
            <h3>Xóa Tài khoản</h3>
            <p>Xác nhận xóa <strong>{selectedUser?.username}</strong>?</p>
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={closeModals}>Hủy</button>
              <button className="delete-confirm-btn" onClick={handleDelete}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountUser;