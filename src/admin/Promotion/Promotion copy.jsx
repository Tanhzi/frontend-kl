import React, { useState, useEffect, useMemo } from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';
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
    const [auth, setAuth] = useState(getAuth());
    const { id: id_admin, username } = auth || {};

    // Form state
    const [discount, setDiscount] = useState({
        startDate: '',
        endDate: '',
        value: '',
        quantity: ''
    });

    // === Phân trang ===
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Fetch discounts
    const fetchDiscounts = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/get-promotion?admin_id=${id_admin}`);
            const data = await response.json();
            setDiscounts(data);
        } catch (error) {
            console.error("Failed to fetch discounts:", error);
        }
    };

    useEffect(() => {
        fetchDiscounts();
    }, [id_admin]);

    const getStatus = (startDate, endDate) => {
        const today = new Date().toISOString().split('T')[0];
        if (today >= startDate && today <= endDate) return 'Đang diễn ra';
        if (today < startDate) return 'Sắp diễn ra';
        return 'Đã diễn ra';
    };

    // Lọc + tìm kiếm
    const filteredDiscounts = useMemo(() => {
        return discounts.filter(d => {
            const matchesSearch = !searchTerm ||
                d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.startDate.includes(searchTerm) ||
                d.endDate.includes(searchTerm) ||
                d.value.toString().includes(searchTerm) ||
                d.quantity.toString().includes(searchTerm);

            const matchesFilter = filter === 'all' || getStatus(d.startDate, d.endDate) === filter;
            return matchesSearch && matchesFilter;
        });
    }, [discounts, searchTerm, filter]);

    // Phân trang
    const totalPages = Math.ceil(filteredDiscounts.length / ITEMS_PER_PAGE);
    const paginatedDiscounts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredDiscounts.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredDiscounts, currentPage]);

    // Reset trang khi tìm kiếm/lọc thay đổi
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filter]);

    // === Các hàm xử lý (giữ nguyên logic cũ) ===
    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xoá mã này?")) return;
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/de-promotion/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                setDiscounts(prev => prev.filter(d => d.id !== id));
            } else {
                const data = await response.json();
                console.error("Error deleting discount:", data.message);
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
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/add-promotion`, {
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
            console.error('Error creating discount:', error);
        }
    };

    const handleEdit = async (updatedDiscount) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/promotion/${updatedDiscount.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedDiscount),
            });

            const result = await response.json();
            if (result.status === 'success') {
                setDiscounts(discounts.map(d => d.id === updatedDiscount.id ? { ...d, ...updatedDiscount } : d));
                alert('Cập nhật thành công!');
                onClose();
            } else {
                alert(result.message || 'Lỗi khi cập nhật mã giảm giá.');
            }
        } catch (error) {
            alert('Lỗi khi cập nhật mã giảm giá.');
            console.error('Error updating discount:', error);
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
        setDiscount({ startDate: '', endDate: '', value: '', quantity: '' });
    };

    useEffect(() => {
        if (currentDiscount) {
            setDiscount({
                startDate: currentDiscount.startDate,
                endDate: currentDiscount.endDate,
                value: currentDiscount.value,
                quantity: currentDiscount.quantity
            });
        }
    }, [currentDiscount]);

    // === Pagination helpers ===
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    return (
        <>
            <Navbar
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={toggleSidebar}
                id={id_admin}
                username={username}
            />
            <div className={`promotion-main-container ${sidebarCollapsed ? 'promotion-sidebar-collapsed' : ''}`}>
                <div className='promotion-gap'>
                    <h2 className='promotion-title'>Khuyến mãi</h2>
                </div>
                <div className="promotion-discount-header">

                    <div className="promotion-actions">
                        <button
                            className="promotion-add-discount-button"
                            onClick={() => {
                                setShowForm(true);
                                setCurrentDiscount(null);
                            }}
                        >
                            Thêm mã giảm giá
                        </button>
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo mã, ngày, giá trị hoặc số lượng"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                            <option value="all">Tất cả</option>
                            <option value="Đang diễn ra">Đang diễn ra</option>
                            <option value="Sắp diễn ra">Sắp diễn ra</option>
                            <option value="Đã diễn ra">Đã diễn ra</option>
                        </select>
                    </div>
                </div>

                <div className="promotion-table-wrapper">

                    {error && <div className="promotion-error-message">{error}</div>}
                    <table className="promotion-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Mã giảm giá</th>
                                <th>Ngày bắt đầu</th>
                                <th>Ngày kết thúc</th>
                                <th>Giá trị giảm</th>
                                <th>Số lượng</th>
                                <th>Còn lại</th>
                                <th>Trạng thái</th>
                                <th>Tùy chọn</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedDiscounts.length > 0 ? (
                                paginatedDiscounts.map(d => (
                                    <tr key={d.id}>
                                        <td>{d.id}</td>
                                        <td>{d.code}</td>
                                        <td>{d.startDate}</td>
                                        <td>{d.endDate}</td>
                                        <td>{d.value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</td>
                                        <td>{d.quantity}</td>
                                        <td>{d.quantity - d.count_quantity}</td>
                                        <td>{getStatus(d.startDate, d.endDate)}</td>
                                        <td>
                                            <button
                                                className="promotion-btn promotion-btn-frame"
                                                onClick={() => {
                                                    setShowForm(true);
                                                    setCurrentDiscount(d);
                                                }}
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                className="promotion-btn promotion-btn-qr"
                                                onClick={() => handleDelete(d.id)}
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="promotion-no-data">Không có dữ liệu.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div>
                    {/* Phân trang */}
                    {totalPages > 1 && (
                        <div className="promotion-pagination">
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="promotion-pagination-btn"
                            >
                            <i className="fa-solid fa-arrow-left"></i>
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => goToPage(i + 1)}
                                    className={`promotion-pagination-btn ${currentPage === i + 1 ? 'promotion-pagination-active' : ''
                                        }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="promotion-pagination-btn"
                            >
                            <i className="fa-solid fa-arrow-right"></i>
                            </button>
                        </div>
                    )}
                </div>

                {/* Modal form */}
                {/* Thay đoạn modal cũ bằng */}
                {showForm && (
                    <div className="promotion-modal-overlay" onClick={onClose}>
                        <div className="promotion-discount-modal" onClick={e => e.stopPropagation()}>
                            <h3>{currentDiscount ? "Chỉnh sửa giảm giá" : "Tạo mã giảm giá"}</h3>
                            <div className="promotion-form-group">
                                <label>Ngày bắt đầu:</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={discount.startDate}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="promotion-form-group">
                                <label>Ngày kết thúc:</label>
                                <input
                                    type="date"
                                    name="endDate"
                                    value={discount.endDate}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="promotion-form-group">
                                <label>Nhập số tiền giảm:</label>
                                <input
                                    type="number"
                                    name="value"
                                    value={discount.value}
                                    onChange={handleChange}
                                    placeholder="Nhập số tiền giảm"
                                />
                            </div>
                            <div className="promotion-form-group">
                                <label>Số mã:</label>
                                <input
                                    type="number"
                                    name="quantity"
                                    value={discount.quantity}
                                    onChange={handleChange}
                                    min="1"
                                    placeholder="Số mã"
                                />
                            </div>
                            <div className="modal-buttons">
                                <button className="cancel-btn" onClick={onClose}>Hủy</button>
                                <button className="save-btn" onClick={onSave}>
                                    {currentDiscount ? 'Lưu' : 'Tạo'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Promotion;