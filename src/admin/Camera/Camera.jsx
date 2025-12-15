import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import './Camera.css';

const Camera = () => {
    const location = useLocation();
    const getAuth = () => {
        const saved = localStorage.getItem('auth');
        return saved ? JSON.parse(saved) : null;
    };

    const [auth, setAuth] = useState(getAuth());
    const { id: idAdmin, username } = auth || {};

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

    // Khởi tạo state với dữ liệu mặc định
    const [settings, setSettings] = useState({
        isVideoOn: true,
        isMirrorOn: true,
        timeImage1: '',
        timeImage2: '',
        timeRun: '',
    });

    // Fetch dữ liệu khi component mount
    useEffect(() => {
        if (!idAdmin) return; // tránh gọi API nếu chưa có idAdmin

        fetch(`${import.meta.env.VITE_API_BASE_URL}/camera?id_admin=${idAdmin}`)
            .then(response => response.json())
            .then(data => {
                setSettings({
                    isVideoOn: data.video === 1,
                    isMirrorOn: data.mirror === 1,
                    timeImage1: data.time1 || '',
                    timeImage2: data.time2 || '',
                    timeRun: data.time_run || '',
                });
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    }, [idAdmin]);

    // Hàm xử lý input chỉ cho nhập số
    const handleNumberInputChange = (key) => (e) => {
        let value = e.target.value;
        // Chỉ giữ lại ký tự số (0–9), cho phép để trống
        value = value.replace(/[^0-9]/g, '');
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    // Hàm xử lý toggle cho checkbox "Tạo video"
    const handleToggleVideo = () => {
        setSettings(prev => ({ ...prev, isVideoOn: !prev.isVideoOn }));
    };

    // Hàm xử lý toggle cho checkbox "Màn hình gương"
    const handleToggleMirror = () => {
        setSettings(prev => ({ ...prev, isMirrorOn: !prev.isMirrorOn }));
    };

    // Hàm gửi dữ liệu cập nhật qua API
    const handleSaveChanges = () => {
        const postData = {
            id_admin: idAdmin,
            time1: settings.timeImage1,
            time2: settings.timeImage2,
            video: settings.isVideoOn ? 1 : 0,
            mirror: settings.isMirrorOn ? 1 : 0,
            time_run: settings.timeRun,
        };

        fetch(`${import.meta.env.VITE_API_BASE_URL}/camera`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(postData),
        })
            .then(response => response.json())
            .then(data => {
                console.log('Update response:', data);
                if (data.status === 'success') {
                    alert('Cập nhật thành công!');
                } else {
                    alert('Lỗi: ' + (data.message || 'Không thể lưu cài đặt'));
                }
            })
            .catch(error => {
                console.error('Error updating data:', error);
                alert('Có lỗi xảy ra khi lưu dữ liệu.');
            });
    };

    return (
        <>
            <Navbar
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={toggleSidebar}
                id={idAdmin}
                username={username}
            />
            <div className={`camera-main-container ${sidebarCollapsed ? 'camera-sidebar-collapsed' : ''}`}>
                <h1 className="camera-settings-title">THIẾT LẬP MÁY ẢNH</h1>

                <div className="camera-settings-content">
                    {/* Vùng Live View */}
                    <div className="camera-live-view">
                        MÀN HÌNH LIVE VIEW
                    </div>

                    {/* Vùng cấu hình */}
                    <div className="camera-settings-panel">
                        <h2>Thời gian chụp</h2>
                        <div className="camera-time-inputs">
                            <div className="camera-time-input">
                                <label>Ảnh 1</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="Giây"
                                    value={settings.timeImage1}
                                    onChange={handleNumberInputChange('timeImage1')}
                                />
                            </div>
                            <div className="camera-time-input">
                                <label>Ảnh sau</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="Giây"
                                    value={settings.timeImage2}
                                    onChange={handleNumberInputChange('timeImage2')}
                                />
                            </div>
                        </div>

                        <div className="camera-toggle-video">
                            <label>Tạo video</label>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={settings.isVideoOn}
                                    onChange={handleToggleVideo}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>

                        <div className="camera-toggle-video">
                            <label>Màn hình gương</label>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={settings.isMirrorOn}
                                    onChange={handleToggleMirror}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>

                        <div className="camera-time-input">
                            <label>Thời gian chụp</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="Giây"
                                value={settings.timeRun}
                                onChange={handleNumberInputChange('timeRun')}
                            />
                        </div>

                        <button className="camera-save-button" onClick={handleSaveChanges}>
                            Lưu thay đổi
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Camera;