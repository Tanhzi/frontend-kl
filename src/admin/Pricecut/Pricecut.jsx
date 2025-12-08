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
                            soLuong: sizeSmall[i],
                            soTien: sizeSmall[i + 1] ?? ''
                        });
                    }
                    setEditedPairDataSmall(tempSmall);

                    // Khổ lớn
                    const sizeBig = Array.isArray(result.size2) ? result.size2 : [];
                    const tempBig = [];
                    for (let i = 0; i < sizeBig.length; i += 2) {
                        tempBig.push({
                            soLuong: sizeBig[i],
                            soTien: sizeBig[i + 1] ?? ''
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
    };

    const handleUpdate = () => {
        // Chuyển đổi thành mảng phẳng: [sl1, tien1, sl2, tien2, ...]
        const flatSizeSmall = editedPairDataSmall.reduce((acc, item) => {
            acc.push(item.soLuong, item.soTien);
            return acc;
        }, []);

        const flatSizeBig = editedPairDataBig.reduce((acc, item) => {
            acc.push(item.soLuong, item.soTien);
            return acc;
        }, []);

        const payload = {
            id_admin: id_admin,
            size1: flatSizeSmall,
            size2: flatSizeBig
            // KHÔNG gửi text1, text2 nữa
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
            })
            .catch(error => {
                console.error('Error updating data:', error);
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
                                <th>Số lượng</th>
                                <th>Số tiền</th>
                                {/* ĐÃ XÓA cột "Ghi chú" */}
                            </tr>
                        </thead>
                        <tbody>
                            {pairData && pairData.length > 0 ? (
                                pairData.map((item, index) => (
                                    <tr key={index}>
                                        <td>
                                            <input
                                                type="text"
                                                value={item.soLuong}
                                                onChange={(e) => handleChange(index, 'soLuong', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={item.soTien}
                                                onChange={(e) => handleChange(index, 'soTien', e.target.value)}
                                            />
                                        </td>
                                        {/* KHÔNG CÓ ô input cho ghiChu */}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="2" className="pricecut-loading">Đang tải dữ liệu...</td>
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