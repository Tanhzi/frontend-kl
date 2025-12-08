// src/admin/Page/Promotion/Promotion.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Navbar from '../../components/Navbar';
import './Promotion.css';

const Promotion = () => {
    const [error, setError] = useState('');
    const [discounts, setDiscounts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [currentDiscount, setCurrentDiscount] = useState(null);

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

    const getAuth = () => {
        const saved = localStorage.getItem('auth');
        return saved ? JSON.parse(saved) : null;
    };
    const [auth] = useState(getAuth());
    const { id: id_admin, username } = auth || {};

    // Form state
    const [discount, setDiscount] = useState({
        startdate: '',
        enddate: '',
        value: '',
        quantity: ''
    });

    // === XÓA HÀNG LOẠT ===
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectAllGlobal, setSelectAllGlobal] = useState(false);
    const [totalDiscounts, setTotalDiscounts] = useState(0);

    // Phân trang - 10 ITEMS
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const filterRef = useRef(null);
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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

    // Fetch discounts
    const fetchDiscounts = async () => {
        if (!id_admin) return;
        try {
            const response = await fetch(`${API_URL}/get-promotion?admin_id=${id_admin}`);
            const data = await response.json();
            setDiscounts(data || []);
            setTotalDiscounts(data.length || 0);
        } catch (error) {
            console.error("Failed to fetch discounts:", error);
        }
    };

    useEffect(() => {
        fetchDiscounts();
    }, [id_admin]);

    // Logic trạng thái
    const getStatus = (startdate, enddate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const start = new Date(startdate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(enddate);
        end.setHours(23, 59, 59, 999);
        
        if (today >= start && today <= end) return 'Đang diễn ra';
        if (today < start) return 'Sắp diễn ra';
        return 'Đã diễn ra';
    };

    // Lọc + tìm kiếm
    const filteredDiscounts = useMemo(() => {
        return discounts.filter(d => {
            const matchesSearch = !searchTerm ||
                d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.startdate.includes(searchTerm) ||
                d.enddate.includes(searchTerm) ||
                d.value.toString().includes(searchTerm) ||
                d.quantity.toString().includes(searchTerm);

            const matchesFilter = filter === 'all' || getStatus(d.startdate, d.enddate) === filter;
            return matchesSearch && matchesFilter;
        });
    }, [discounts, searchTerm, filter]);

    const totalPages = Math.ceil(filteredDiscounts.length / ITEMS_PER_PAGE);
    const paginatedDiscounts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredDiscounts.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredDiscounts, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filter]);

    // === CHỌN TẤT CẢ TOÀN CỤC ===
    const toggleSelectAllGlobal = async () => {
        if (selectAllGlobal) {
            setSelectedIds([]);
            setSelectAllGlobal(false);
            return;
        }

        if (filteredDiscounts.length === 0) {
            alert('Không có mã giảm giá nào để chọn!');
            return;
        }

        const allIds = filteredDiscounts.map(d => d.id);
        setSelectedIds(allIds);
        setSelectAllGlobal(true);
        alert(`Đã chọn tất cả ${allIds.length} mã giảm giá!`);
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

    const handleBatchDelete = async () => {
        if (selectedIds.length === 0) {
            alert('Vui lòng chọn ít nhất 1 mã giảm giá để xóa!');
            return;
        }
        if (!confirm(`Xóa vĩnh viễn ${selectedIds.length} mã giảm giá đã chọn?\nHành động này không thể hoàn tác!`)) return;

        try {
            const promises = selectedIds.map(id =>
                fetch(`${API_URL}/de-promotion/${id}`, { method: 'DELETE' })
            );
            await Promise.all(promises);
            alert(`Đã xóa thành công ${selectedIds.length} mã giảm giá!`);
            setSelectedIds([]);
            setSelectAllGlobal(false);
            fetchDiscounts();
        } catch (err) {
            alert('Có lỗi khi xóa hàng loạt!');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xoá mã này?")) return;
        try {
            const response = await fetch(`${API_URL}/de-promotion/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setDiscounts(prev => prev.filter(d => d.id !== id));
            }
        } catch (error) {
            console.error("Error deleting discount:", error);
        }
    };

    const handleCreate = async (newDiscount) => {
        if (isNaN(newDiscount.value) || newDiscount.value <= 0) {
            alert('Giá trị giảm giá phải là một số hợp lệ và lớn hơn 0.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/add-promotion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newDiscount, id_admin }),
            });

            const result = await response.json();
            if (result.status === 'success') {
                fetchDiscounts();
                alert('Mã giảm giá đã được tạo thành công!');
                onClose();
            } else {
                alert(result.message || 'Có lỗi khi tạo mã giảm giá.');
            }
        } catch (error) {
            alert('Có lỗi khi tạo mã giảm giá.');
        }
    };

    const handleEdit = async (updatedDiscount) => {
        try {
            const response = await fetch(`${API_URL}/promotion/${updatedDiscount.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedDiscount),
            });

            const result = await response.json();
            if (result.status === 'success') {
                setDiscounts(prev => prev.map(d => d.id === updatedDiscount.id ? { ...d, ...updatedDiscount } : d));
                alert('Cập nhật thành công!');
                onClose();
            } else {
                alert(result.message || 'Lỗi khi cập nhật mã giảm giá.');
            }
        } catch (error) {
            alert('Lỗi khi cập nhật mã giảm giá.');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDiscount(prev => ({ ...prev, [name]: value }));
    };

    const onSave = () => {
        if (currentDiscount) {
            handleEdit({ ...currentDiscount, ...discount });
        } else {
            handleCreate(discount);
        }
    };

    const onClose = () => {
        setShowForm(false);
        setCurrentDiscount(null);
        setDiscount({ startdate: '', enddate: '', value: '', quantity: '' });
    };

    useEffect(() => {
        if (currentDiscount) {
            setDiscount({
                startdate: currentDiscount.startdate,
                enddate: currentDiscount.enddate,
                value: currentDiscount.value,
                quantity: currentDiscount.quantity
            });
        }
    }, [currentDiscount]);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    const isCurrentPageFullySelected = paginatedDiscounts.length > 0 && paginatedDiscounts.every(d => selectedIds.includes(d.id));

    // Tính toán hiển thị trang
    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredDiscounts.length);

    return (
        <div className="promotionpro-root">
            <Navbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} id={id_admin} username={username} />

            <div className="promotionpro-scroll-container">
                <div className={`promotionpro-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                    <div className="promotionpro-header">
                        <h2 className="promotionpro-title">QUẢN LÝ MÃ KHUYẾN MÃI</h2>
                    </div>

                    <div className="promotionpro-controls">
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <button className="btn-pink" onClick={() => { setShowForm(true); setCurrentDiscount(null); }}>
                               <i className="bi bi-plus-lg"></i>Thêm mã giảm giá
                            </button>
                            <button
                                className={`btn-pink batch-delete-btn ${selectedIds.length === 0 ? 'disabled' : ''}`}
                                onClick={handleBatchDelete}
                            >
                                Xóa {selectedIds.length > 0 ? selectedIds.length : 'nhiều mã'}
                            </button>
                        </div>

                        <div className="searchFillter">
                            <div className="promotionpro-search">
                                <i className="bi bi-search"></i>
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm mã, ngày, giá trị..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="promotionpro-filter-wrapper" ref={filterRef}>
                                <button
                                    className="filter-toggle-btn"
                                    onClick={() => setShowFilterMenu(prev => !prev)}
                                >
                                    <i className="bi bi-funnel"></i>
                                </button>

                                <div className={`promotionpro-filter-menu ${showFilterMenu ? 'show' : ''}`}>
                                    <button className={filter === 'all' ? 'active' : ''} onClick={() => { setFilter('all'); setShowFilterMenu(false); }}>
                                        Tất cả
                                    </button>
                                    <button className={filter === 'Đang diễn ra' ? 'active' : ''} onClick={() => { setFilter('Đang diễn ra'); setShowFilterMenu(false); }}>
                                        Đang diễn ra
                                    </button>
                                    <button className={filter === 'Sắp diễn ra' ? 'active' : ''} onClick={() => { setFilter('Sắp diễn ra'); setShowFilterMenu(false); }}>
                                        Sắp diễn ra
                                    </button>
                                    <button className={filter === 'Đã diễn ra' ? 'active' : ''} onClick={() => { setFilter('Đã diễn ra'); setShowFilterMenu(false); }}>
                                        Đã diễn ra
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="promotionpro-table-wrapper">
                        <table className="promotionpro-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '50px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectAllGlobal || isCurrentPageFullySelected}
                                            onChange={toggleSelectAllGlobal}
                                            className="custom-checkbox"
                                            title={selectAllGlobal ? "Bỏ chọn tất cả" : "Chọn tất cả mã ở mọi trang"}
                                        />
                                    </th>
                                    <th>STT</th>
                                    <th>MÃ GIẢM GIÁ</th>
                                    <th>NGÀY BẮT ĐẦU</th>
                                    <th>NGÀY KẾT THÚC</th>
                                    <th>GIÁ TRỊ</th>
                                    <th>SỐ LƯỢNG</th>
                                    <th>CÒN LẠI</th>
                                    <th>TRẠNG THÁI</th>
                                    <th style={{ textAlign: 'center' }}>HÀNH ĐỘNG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedDiscounts.length > 0 ? (
                                    paginatedDiscounts.map(d => (
                                        <tr key={d.id} className={selectedIds.includes(d.id) ? 'selected-row' : ''}>
                                            <td style={{ textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(d.id)}
                                                    onChange={() => toggleSelectId(d.id)}
                                                    className="custom-checkbox"
                                                />
                                            </td>
                                            <td>{d.id}</td>
                                            <td><strong>{d.code}</strong></td>
                                            <td>{d.startdate}</td>
                                            <td>{d.enddate}</td>
                                            <td>{d.value.toLocaleString('vi-VN')}đ</td>
                                            <td>{d.quantity}</td>
                                            <td>{d.quantity - d.count_quantity}</td>
                                            <td><span className={`status-${getStatus(d.startdate, d.enddate).toLowerCase().replace(/ /g, '-')}`}>
                                                {getStatus(d.startdate, d.enddate)}
                                            </span></td>
                                            <td className="promotionpro-actions">
                                                <button onClick={() => { setShowForm(true); setCurrentDiscount(d); }} className="edit-btn">
                                                    <i className="bi bi-pencil"></i>
                                                </button>
                                                <button onClick={() => handleDelete(d.id)} className="delete-btn">
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="10" style={{ textAlign: 'center' }}>Không có dữ liệu.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION BÊN DƯỚI */}
                    {filteredDiscounts.length > 0 && (
                        <div className="promotionpro-pagination">
                            <span>
                                Hiển thị {startItem} - {endItem} trên {filteredDiscounts.length} mã
                            </span>
                            <div className="pagination-buttons">
                                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>«</button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button key={i + 1} onClick={() => goToPage(i + 1)} className={currentPage === i + 1 ? 'active' : ''}>
                                        {i + 1}
                                    </button>
                                ))}
                                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>»</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showForm && (
                <div className="promotionpro-modal-overlay" onClick={onClose}>
                    <div className="promotionpro-modal-content" onClick={e => e.stopPropagation()}>
                        <h3>{currentDiscount ? "Chỉnh sửa mã giảm giá" : "Tạo mã giảm giá mới"}</h3>
                        <div className="modal-field">
                            <label>Ngày bắt đầu</label>
                            <input type="date" name="startdate" value={discount.startdate} onChange={handleChange} />
                        </div>
                        <div className="modal-field">
                            <label>Ngày kết thúc</label>
                            <input type="date" name="enddate" value={discount.enddate} onChange={handleChange} />
                        </div>
                        <div className="modal-field">
                            <label>Giá trị giảm (VNĐ)</label>
                            <input type="number" name="value" value={discount.value} onChange={handleChange} placeholder="VD: 50000" />
                        </div>
                        <div className="modal-field">
                            <label>Số lượng mã</label>
                            <input type="number" name="quantity" value={discount.quantity} onChange={handleChange} min="1" />
                        </div>
                        <div className="modal-buttons">
                            <button className="cancel" onClick={onClose}>Hủy</button>
                            <button className="submit" onClick={onSave}>
                                {currentDiscount ? 'Lưu thay đổi' : 'Tạo mã'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Promotion;