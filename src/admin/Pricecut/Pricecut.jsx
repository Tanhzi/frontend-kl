import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import './Pricecut.css';

const Pricecut = () => {
    const getAuth = () => {
        const saved = localStorage.getItem('auth');
        return saved ? JSON.parse(saved) : null;
    };

    const [auth, setAuth] = useState(getAuth());
    const { id: id_admin, username } = auth || {};
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);
    const [data, setData] = useState(null);
    const [selectedSize, setSelectedSize] = useState('small');
    const [editedPairDataSmall, setEditedPairDataSmall] = useState([]);
    const [editedPairDataBig, setEditedPairDataBig] = useState([]);
    const [errors, setErrors] = useState({}); // { index: "message" }

    // Hàm validate số tiền
    const validateSoTien = (value) => {
        if (value === '') return ''; // Cho phép trống (hoặc bạn có thể bắt buộc)
        const num = Number(value);
        if (isNaN(num)) return 'Vui lòng nhập số hợp lệ';
        if (num < 10000) return 'Số tiền phải ≥ 10.000';
        if (num % 10000 !== 0) return 'Số tiền phải chia hết cho 10.000';
        return '';
    };

    useEffect(() => {
        if (!id_admin) return;

        fetch(`${import.meta.env.VITE_API_BASE_URL}/size?id_admin=${id_admin}`)
            .then((response) => response.json())
            .then((result) => {
                setData(result);
                if (result) {
                    // Khổ nhỏ
                    const sizeSmall = Array.isArray(result.size1) ? result.size1 : [];
                    const tempSmall = [];
                    for (let i = 0; i < sizeSmall.length; i += 2) {
                        tempSmall.push({
                            soLuong: sizeSmall[i]?.toString() || '',
                            soTien: (sizeSmall[i + 1] ?? '').toString() || ''
                        });
                    }
                    setEditedPairDataSmall(tempSmall);

                    // Khổ lớn
                    const sizeBig = Array.isArray(result.size2) ? result.size2 : [];
                    const tempBig = [];
                    for (let i = 0; i < sizeBig.length; i += 2) {
                        tempBig.push({
                            soLuong: sizeBig[i]?.toString() || '',
                            soTien: (sizeBig[i + 1] ?? '').toString() || ''
                        });
                    }
                    setEditedPairDataBig(tempBig);
                }
            })
            .catch((error) => console.error('Error fetching data:', error));
    }, [id_admin]);

    const pairData = selectedSize === 'small' ? editedPairDataSmall : editedPairDataBig;

    const handleChange = (index, field, value) => {
        if (selectedSize === 'small') {
            const newData = [...editedPairDataSmall];
            newData[index] = { ...newData[index], [field]: value };
            setEditedPairDataSmall(newData);
        } else {
            const newData = [...editedPairDataBig];
            newData[index] = { ...newData[index], [field]: value };
            setEditedPairDataBig(newData);
        }

        // Xóa lỗi khi người dùng sửa
        if (errors[index]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[index];
                return newErrors;
            });
        }
    };

    const handleUpdate = () => {
        const currentData = selectedSize === 'small' ? editedPairDataSmall : editedPairDataBig;
        const newErrors = {};

        let hasError = false;
        currentData.forEach((item, index) => {
            const errorMsg = validateSoTien(item.soTien);
            if (errorMsg) {
                newErrors[index] = errorMsg;
                hasError = true;
            }
        });

        if (hasError) {
            setErrors(newErrors);
            alert('Vui lòng sửa các lỗi trước khi lưu!');
            return;
        }

        // Chuyển đổi thành mảng phẳng: [sl1, tien1, sl2, tien2, ...]
        const flatSizeSmall = editedPairDataSmall.map(item => [
            item.soLuong === '' ? 0 : parseInt(item.soLuong, 10),
            item.soTien === '' ? 0 : parseInt(item.soTien, 10)
        ]).flat();

        const flatSizeBig = editedPairDataBig.map(item => [
            item.soLuong === '' ? 0 : parseInt(item.soLuong, 10),
            item.soTien === '' ? 0 : parseInt(item.soTien, 10)
        ]).flat();

        const payload = {
            id_admin: id_admin,
            size1: flatSizeSmall,
            size2: flatSizeBig
        };

        fetch(`${import.meta.env.VITE_API_BASE_URL}/size`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
            .then(response => response.json())
            .then(result => {
                console.log('Update successful:', result);
                alert('Cập nhật thành công!');
                setErrors({}); // Xóa lỗi sau khi lưu thành công
            })
            .catch(error => {
                console.error('Error updating data:', error);
                alert('Có lỗi khi cập nhật dữ liệu.');
            });
    };

    return (
        <>
            <Navbar
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={toggleSidebar}
                id={id_admin}
                username={username}
            />
            <div className={`pricecut-main-container ${sidebarCollapsed ? 'pricecut-sidebar-collapsed' : ''}`}>
                <div className="pricecut-header-section">
                    <h2 className="pricecut-heading">THIẾT LẬP GIÁ TIỀN</h2>
                    <select
                        className="pricecut-size-select"
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                    >
                        <option value="small">Khổ nhỏ</option>
                        <option value="big">Khổ lớn</option>
                    </select>
                </div>

                <div className='pricecut-table-wrapper'>
                    <table className="pricecut-table">
                        <thead>
                            <tr>
                                <th>Số lượng ảnh</th>
                                <th>Số tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pairData && pairData.length > 0 ? (
                                pairData.map((item, index) => (
                                    <tr key={index}>
                                        <td>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="\d*"
                                                value={item.soLuong}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (/^\d*$/.test(val)) {
                                                        handleChange(index, 'soLuong', val);
                                                    }
                                                }}
                                                onWheel={(e) => e.target.blur()}
                                                placeholder="0"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="\d*"
                                                value={item.soTien}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (/^\d*$/.test(val)) {
                                                        handleChange(index, 'soTien', val);
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    const errorMsg = validateSoTien(e.target.value);
                                                    if (errorMsg) {
                                                        setErrors(prev => ({ ...prev, [index]: errorMsg }));
                                                    }
                                                }}
                                                onWheel={(e) => e.target.blur()}
                                                placeholder="VD: 50000"
                                                className={errors[index] ? 'pricecut-input-error' : ''}
                                            />
                                            {errors[index] && (
                                                <div className="pricecut-error-message">{errors[index]}</div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="2" className="pricecut-loading">
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <button className="pricecut-update-btn" onClick={handleUpdate}>
                    Cập nhật
                </button>
            </div>
        </>
    );
};

export default Pricecut;