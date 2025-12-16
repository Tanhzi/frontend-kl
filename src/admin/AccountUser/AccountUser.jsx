// src/admin/Page/AccountUser/AccountUser.jsx
import React, { useEffect, useState, useRef } from 'react';
import Navbar from '../../components/Navbar';
import './AccountUser.css'; // hoặc import './ContentChat.css' nếu muốn dùng chung

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
  const [roleFilter, setRoleFilter] = useState(''); // '', 'staff', 'user'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Danh sách chủ đề (events)
  const [topics, setTopics] = useState([]);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    id_topic: '',
    role: '0', // '0' = người dùng, '1' = nhân viên
    id_admin: id_admin || ''
  });

  // === XÓA HÀNG LOẠT ===
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAllGlobal, setSelectAllGlobal] = useState(false);

  const itemsPerPage = 10;
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const roleFilterRef = useRef(null);

  // -----------------------------------------------------------------
  // FETCH USERS
  const fetchUsers = async (page = 1) => {
    if (!id_admin) return;
    setLoading(true);
    try {
      let url = `${API_URL}/users?id_admin=${id_admin}&page=${page}&limit=${itemsPerPage}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (roleFilter) url += `&role_filter=${encodeURIComponent(roleFilter)}`;

      const res = await fetch(url);
      const data = await res.json();
      setUsers(data.data || []);
      setTotalPages(data.total_pages || 1);
      setTotalUsers(data.total || 0);
      setCurrentPage(page);

      if (selectAllGlobal && data.data) {
        const currentIds = data.data.map(u => u.id);
        setSelectedIds(prev => [...new Set([...prev, ...currentIds])]);
      }
    } catch (err) {
      console.error(err);
      alert('Không tải được danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  // FETCH TOPICS (EVENTS)
  const fetchTopics = async () => {
    if (!id_admin) return;
    try {
      const res = await fetch(`${API_URL}/events-admin/${id_admin}`);
      const data = await res.json();
      if (data.success) {
        setTopics(data.data || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách chủ đề:', err);
      alert('Không tải được danh sách chủ đề!');
    }
  };

  useEffect(() => {
    if (id_admin) {
      fetchUsers(1);
      fetchTopics();
    }
  }, [id_admin]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(1), 400);
    return () => clearTimeout(timer);
  }, [searchTerm, roleFilter]);

  // Click outside role filter
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (roleFilterRef.current && !roleFilterRef.current.contains(e.target)) {
        roleFilterRef.current.querySelector('.contentchat-filter-menu')?.classList.remove('show');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // -----------------------------------------------------------------
  // CHỌN TẤT CẢ
  const toggleSelectAllGlobal = async () => {
    if (selectAllGlobal) {
      setSelectedIds([]);
      setSelectAllGlobal(false);
    } else {
      if (totalUsers === 0) {
        alert('Không có tài khoản nào để chọn!');
        return;
      }
      setLoading(true);
      try {
        let allIds = [];
        for (let page = 1; page <= totalPages; page++) {
          let url = `${API_URL}/users?id_admin=${id_admin}&page=${page}&limit=1000`;
          if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
          if (roleFilter) url += `&role_filter=${encodeURIComponent(roleFilter)}`;

          const res = await fetch(url);
          const data = await res.json();
          if (data.data?.length) {
            allIds = allIds.concat(data.data.map(u => u.id));
          }
        }
        setSelectedIds(allIds);
        setSelectAllGlobal(true);
        alert(`Đã chọn tất cả ${allIds.length} tài khoản!`);
      } catch (err) {
        alert('Lỗi khi chọn tất cả!');
      } finally {
        setLoading(false);
        fetchUsers(currentPage);
      }
    }
  };

  const toggleSelectId = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return alert('Vui lòng chọn ít nhất 1 tài khoản để xóa!');
    if (!confirm(`Xóa vĩnh viễn ${selectedIds.length} tài khoản đã chọn?\nHành động này không thể hoàn tác!`)) return;

    try {
      await Promise.all(
        selectedIds.map(id =>
          fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_admin })
          })
        )
      );
      alert(`Đã xóa thành công ${selectedIds.length} tài khoản!`);
      setSelectedIds([]);
      setSelectAllGlobal(false);
      fetchUsers(currentPage);
    } catch (err) {
      alert('Lỗi xóa hàng loạt!');
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) fetchUsers(page);
  };

  const openAddModal = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      id_topic: '',
      role: '0',
      id_admin: id_admin
    });
    setShowAddModal(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username || '',
      email: user.email || '',
      password: '',
      id_topic: user.id_topic || '',
      role: String(user.role),
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

    if (!formData.username || !formData.email) {
      alert('Vui lòng nhập đầy đủ username và email!');
      return;
    }
    if (!isEdit && !formData.password) {
      alert('Vui lòng nhập mật khẩu!');
      return;
    }

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
        fetchUsers(currentPage);
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
        fetchUsers(currentPage);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert('Lỗi xóa');
    }
  };

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  const isCurrentPageFullySelected = users.length > 0 && users.every(u => selectedIds.includes(u.id));

  const getRoleLabel = (role) => {
    return role === 0 ? 'Người dùng' : 'Nhân viên';
  };

  // 🔑 HÀM TRA CỨU TÊN CHỦ ĐỀ TỪ ID
  const getTopicName = (topicId) => {
    if (!topicId) return '—';
    const topic = topics.find(t => String(t.id) === String(topicId));
    return topic ? topic.name : `ID: ${topicId}`;
  };

  // -----------------------------------------------------------------
  return (
    <div className="contentchat-root">
      <Navbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} id={id_admin} username={adminName} />

      <div className="contentchat-scroll-container">
        <div className={`contentchat-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="contentchat-header">
            <h2 className="contentchat-title">QUẢN LÝ TÀI KHOÀN</h2>
          </div>

          <div className="contentchat-controls">
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

            <div className="searchFilterContent">
              <div className="contentchat-search">
                <i className="bi bi-search"></i>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo username, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="contentchat-filter-wrapper" ref={roleFilterRef}>
                <button
                  className="filter-toggle-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    const menu = e.currentTarget.nextElementSibling;
                    menu?.classList.toggle('show');
                  }}
                >
                  <i className="bi bi-funnel"></i>
                </button>
                <div className="contentchat-filter-menu">
                  <button
                    className={!roleFilter ? 'active' : ''}
                    onClick={() => {
                      setRoleFilter('');
                      roleFilterRef.current.querySelector('.contentchat-filter-menu')?.classList.remove('show');
                    }}
                  >
                    Tất cả
                  </button>
                  <button
                    className={roleFilter === 'staff' ? 'active' : ''}
                    onClick={() => {
                      setRoleFilter('staff');
                      roleFilterRef.current.querySelector('.contentchat-filter-menu')?.classList.remove('show');
                    }}
                  >
                    Nhân viên
                  </button>
                  <button
                    className={roleFilter === 'user' ? 'active' : ''}
                    onClick={() => {
                      setRoleFilter('user');
                      roleFilterRef.current.querySelector('.contentchat-filter-menu')?.classList.remove('show');
                    }}
                  >
                    Người dùng
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="contentchat-table-wrapper">
            <table className="contentchat-table">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectAllGlobal || isCurrentPageFullySelected}
                      onChange={toggleSelectAllGlobal}
                      className="custom-checkbox"
                    />
                  </th>
                  <th>STT</th>
                  <th>USERNAME</th>
                  <th>EMAIL</th>
                  <th>SỰ KIỆN</th> {/* ← ĐÃ ĐỔI TÊN CỘT */}
                  <th>VAI TRÒ</th>
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
                    <tr key={user.id} className={selectedIds.includes(user.id) ? 'selected-row' : ''}>
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
                      <td>{getTopicName(user.id_topic)}</td> {/* ← HIỂN THỊ TÊN CHỦ ĐỀ */}
                      <td>{getRoleLabel(user.role)}</td>
                      <td className="contentchat-actions">
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

          <div className="contentchat-pagination">
            <span>
              Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{' '}
              {Math.min(currentPage * itemsPerPage, totalUsers)} trên {totalUsers} tài khoản
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

      {/* Modal Thêm */}
      {showAddModal && (
        <div className="contentchat-modal-overlay" onClick={closeModals}>
          <div className="contentchat-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Thêm Người dùng mới</h3>
            <div className="form-group">
              <label>USERNAME <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>EMAIL <span style={{ color: 'red' }}>*</span></label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>PASSWORD <span style={{ color: 'red' }}>*</span></label>
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>SỰ KIỆN</label>
              <select
                value={formData.id_topic}
                onChange={e => setFormData({ ...formData, id_topic: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', border: '2px solid #f48fb1', borderRadius: '12px', fontSize: '15px' }}
              >
                <option value="">-- Chọn sự kiện --</option>
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>VAI TRÒ <span style={{ color: 'red' }}>*</span></label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', border: '2px solid #f48fb1', borderRadius: '12px', fontSize: '15px' }}
              >
                <option value="0">Người dùng</option>
                <option value="1">Nhân viên</option>
              </select>
            </div>
            <div className="modal-buttons">
              <button type="button" className="cancel" onClick={closeModals}>Hủy</button>
              <button type="button" className="submit" onClick={() => handleSubmit(false)}>Thêm</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa */}
      {showEditModal && (
        <div className="contentchat-modal-overlay" onClick={closeModals}>
          <div className="contentchat-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Sửa Tài khoản</h3>
            <div className="form-group">
              <label>USERNAME <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>EMAIL <span style={{ color: 'red' }}>*</span></label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>PASSWORD</label>
              <input
                type="password"
                placeholder="Để trống nếu không đổi"
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>SỰ KIỆN</label>
              <select
                value={formData.id_topic}
                onChange={e => setFormData({ ...formData, id_topic: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', border: '2px solid #f48fb1', borderRadius: '12px', fontSize: '15px' }}
              >
                <option value="">-- Chọn sự kiện --</option>
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>VAI TRÒ <span style={{ color: 'red' }}>*</span></label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', border: '2px solid #f48fb1', borderRadius: '12px', fontSize: '15px' }}
              >
                <option value="0">Người dùng</option>
                <option value="1">Nhân viên</option>
              </select>
            </div>
            <div className="modal-buttons">
              <button type="button" className="cancel" onClick={closeModals}>Hủy</button>
              <button type="button" className="submit" onClick={() => handleSubmit(true)}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xóa */}
      {showDeleteModal && (
        <div className="contentchat-modal-overlay" onClick={closeModals}>
          <div className="contentchat-modal-content delete" onClick={e => e.stopPropagation()}>
            <h3>Xóa Tài khoản</h3>
            <p>Xác nhận xóa <strong>{selectedUser?.username}</strong>?</p>
            <div className="modal-buttons">
              <button type="button" className="cancel" onClick={closeModals}>Hủy</button>
              <button type="button" className="submit" onClick={handleDelete}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountUser;