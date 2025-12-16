import React, { useState, useEffect, useMemo, useRef } from "react";
import { FaPlus, FaUpload, FaFileAlt } from "react-icons/fa";
import Navbar from '../../components/Navbar';
import "./Event.css";

const Event = () => {
    const getAuth = () => {
        const saved = localStorage.getItem('auth');
        return saved ? JSON.parse(saved) : null;
    };

    const [auth, setAuth] = useState(getAuth());
    const { id: id_admin, username } = auth || {};

    // State cho danh sách sự kiện
    const [events, setEvents] = useState([]);
    // State lưu trữ dữ liệu ghi chú (mảng đối tượng)
    const [notes, setNotes] = useState([]);
    // State ghi chú hiện hành (để hiển thị trong modal)
    const [currentNote, setCurrentNote] = useState({
        id: null,
        note1: "",
        note2: "",
        note3: ""
    });

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);
    // State lưu file ảnh nền
    const [backgroundFile, setBackgroundFile] = useState(null);
    // State cho tùy chọn áp dụng (home, all-pages, cancel)
    const [bgApplyOption, setBgApplyOption] = useState("home");

    const [selectedEvent, setSelectedEvent] = useState(null);
    // State lưu file ảnh logo
    const [logoApplyOption, setLogoApplyOption] = useState("home");
    const [logoFile, setLogoFile] = useState(null);

    const [noteApply, setNoteApply] = useState("cancel");

    const [showAddForm, setShowAddForm] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [showTextForm, setShowTextForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [eventName, setEventName] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [eventIdToEdit, setEventIdToEdit] = useState(null);
    const [showLogoUploadForm, setShowLogoUploadForm] = useState(false);
    const [filterOption, setFilterOption] = useState("all");
    
    // === State phân trang ===
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);

    // === XÓA HÀNG LOẠT ===
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectAllGlobal, setSelectAllGlobal] = useState(false);

    const filterRef = useRef(null);
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    const API_URL = import.meta.env.VITE_API_BASE_URL;

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


// Lấy dữ liệu ghi chú từ Laravel API
const refreshNote = () => {
    if (!id_admin) return;
    fetch(`${API_URL}/event-notes?id_admin=${id_admin}`)
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                setNotes(data);
            } else if (data.status === "error") {
                console.error("Error fetching notes:", data.message);
            }
        })
        .catch(error => console.error("Error fetching notes:", error));
};

// Sử dụng useEffect để gọi refreshNote khi cần
useEffect(() => {
    if (id_admin) {
        refreshEvents();
        refreshUsers();
        refreshNote();
    }
}, [id_admin]);

const refreshEvents = () => {
    fetch(`${API_URL}/events-admin?id_admin=${id_admin}`)
        .then((res) => res.json())
        .then((data) => {
            let eventsData = [];
            if (Array.isArray(data)) {
                eventsData = data;
            } else if (data && Array.isArray(data.data)) {
                eventsData = data.data;
            } else {
                console.warn("Unexpected events API response:", data);
            }

            // ✅ SẮP XẾP THEO `id` TĂNG DẦN  (2 sắp xếp theo id)
            const sortedEvents = eventsData.sort((a, b) => a.id - b.id);
            setEvents(sortedEvents);
        })
        .catch((error) => {
            console.error("Error fetching events:", error);
            setEvents([]);
        });
};

    const refreshUsers = () => {
        fetch(`${API_URL}/users-admin?id_admin=${id_admin}`)
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setUsers(data);
                } else if (data && Array.isArray(data.data)) {
                    setUsers(data.data);
                } else {
                    console.warn("Unexpected users API response:", data);
                    setUsers([]);
                }
            })
            .catch((error) => {
                console.error("Error fetching users:", error);
                setUsers([]);
            });
    };

    // Hàm xử lý cập nhật ghi chú
    const handleSaveNote = () => {
        if (!currentNote.note1 && !currentNote.note2 && !currentNote.note3) {
            alert("Vui lòng nhập ít nhất một ghi chú!");
            return;
        }

        const noteFormData = new URLSearchParams();
        noteFormData.append("note1", currentNote.note1);
        noteFormData.append("note2", currentNote.note2);
        noteFormData.append("note3", currentNote.note3);
        noteFormData.append("ev_note", noteApply);

        fetch(`${API_URL}/events-admin/${currentNote.id}/note?id_admin=${id_admin}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: noteFormData.toString()
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.status === "success") {
                    alert("Ghi chú đã được cập nhật thành công!");
                    setShowTextForm(false);
                    refreshNote();
                } else {
                    alert("Lỗi: " + data.message);
                }
            })
            
            .catch((error) => {
                console.error("Error updating note:", error);
                alert("Có lỗi khi cập nhật ghi chú.");
            });
    };

    // Hàm tải ảnh logo
const handleSaveLogoImage = () => {
    if (!selectedEvent) {
        alert("Không có sự kiện được chọn!");
        return;
    }

    // Nếu KHÔNG có file mới, chỉ cập nhật `apply`
    if (!logoFile) {
        const formData = new URLSearchParams();
        formData.append("apply", logoApplyOption);

        fetch(`${API_URL}/events-admin/${selectedEvent.id}/logo?id_admin=${id_admin}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formData.toString()
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.status === "success") {
                    alert("Cập nhật tùy chọn logo thành công!");
                    refreshEvents();
                } else {
                    alert("Lỗi: " + data.message);
                }
            })
            .catch((error) => {
                console.error("Error updating logo apply:", error);
                alert("Có lỗi khi cập nhật tùy chọn.");
            });
    } else {
        // Có file mới → upload cả file và apply
        const formData = new FormData();
        formData.append("logo", logoFile);
        formData.append("apply", logoApplyOption);

        fetch(`${API_URL}/events-admin/${selectedEvent.id}/logo?id_admin=${id_admin}`, {
            method: "POST",
            body: formData
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.status === "success") {
                    alert("Cập nhật logo thành công!");
                    refreshEvents();
                } else {
                    alert("Lỗi: " + data.message);
                }
            })
            .catch((error) => {
                console.error("Error updating logo:", error);
                alert("Có lỗi khi cập nhật logo.");
            });
    }

    setShowLogoUploadForm(false);
    setLogoFile(null); // Reset sau khi lưu
};

    // Hàm tạo event mới
    const handleAddEvent = () => {
        if (!eventName || !eventDate) {
            alert("Vui lòng nhập tên và ngày của sự kiện!");
            return;
        }

        const payload = {
            name: eventName,
            date: eventDate,
            apply: selectedUsers
        };

// ✅ ĐÚNG: Gửi JSON
fetch(`${API_URL}/events-admin?id_admin=${id_admin}`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json", // ← QUAN TRỌNG
    },
    body: JSON.stringify({
        name: eventName,
        date: eventDate,
        apply: selectedUsers, // [1, 2, 3]
    })
})
            .then(res => res.json())
            .then(async data => {
                if (data.status !== "success") {
                    alert("Lỗi: " + data.message);
                    return;
                }

                alert("Tạo mới sự kiện thành công!");
                const newEventId = data.id;

                if (selectedUsers.length > 0) {
                    try {
                        await Promise.all(
                            selectedUsers.map(userId => {
                                return fetch(
                                    `${API_URL}/users-admin/${userId}?id_admin=${id_admin}`,
                                    {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ id_topic: newEventId })
                                    }
                                ).then(r => r.json());
                            })
                        );
                    } catch (err) {
                        console.error("Lỗi cập nhật users:", err);
                    }
                }

                refreshEvents();
                refreshUsers();
                setShowAddForm(false);
            })
            .catch(error => {
                console.error("Error creating event:", error);
                alert("Có lỗi khi tạo sự kiện.");
                setShowAddForm(false);
            });
    };

const handleSaveEvent = () => {
    if (!eventName || !eventDate || !eventIdToEdit) return;

    const payload = {
        name: eventName,
        date: eventDate,
        apply: selectedUsers
    };

    fetch(`${API_URL}/events-admin/${eventIdToEdit}?id_admin=${id_admin}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(async data => {
            if (data.status !== "success") {
                alert("Lỗi: " + data.message);
                return;
            }

            if (selectedUsers.length > 0) {
                try {
                    await Promise.all(
                        selectedUsers.map(userId => {
                            return fetch(
                                `${API_URL}/users-admin/${userId}?id_admin=${id_admin}`,
                                {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ id_topic: eventIdToEdit })
                                }
                            ).then(r => r.json());
                        })
                    );
                } catch (err) {
                    console.error("Lỗi cập nhật users:", err);
                }
            }

            // Thêm thông báo thành công ở đây
            alert("Cập nhật sự kiện thành công!");
            refreshEvents();
            refreshUsers();
            setShowAddForm(false);
        })
        .catch(err => {
            console.error("Error updating event:", err);
            alert("Có lỗi khi cập nhật sự kiện.");
        });
};

    const handleDeleteEvent = (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa sự kiện này không?")) return;

        fetch(`${API_URL}/events-admin/${id}?id_admin=${id_admin}`, {
            method: "DELETE"
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.status === "success") {
                    alert("Xóa sự kiện thành công!");
                    refreshEvents();
                } else {
                    alert("Lỗi: " + data.message);
                }
            })
            .catch((error) => {
                console.error("Error deleting event:", error);
                alert("Có lỗi khi xóa sự kiện.");
            });
    };

    const handleCurrentNoteChange = (field, value) => {
        setCurrentNote({ ...currentNote, [field]: value });
    };

    const handleBackgroundFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setBackgroundFile(file);
        }
    };

const handleSaveBackgroundImage = () => {
    if (!selectedEvent) {
        alert("Không có sự kiện được chọn!");
        return;
    }

    // Nếu KHÔNG có file mới, chỉ cập nhật `apply`
    if (!backgroundFile) {
        const formData = new URLSearchParams();
        formData.append("apply", bgApplyOption);

        fetch(`${API_URL}/events-admin/${selectedEvent.id}/background?id_admin=${id_admin}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formData.toString()
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.status === "success") {
                    alert("Cập nhật tùy chọn ảnh nền thành công!");
                    refreshEvents();
                } else {
                    alert("Lỗi: " + data.message);
                }
            })
            .catch((error) => {
                console.error("Error updating background apply:", error);
                alert("Có lỗi khi cập nhật tùy chọn.");
            });
    } else {
        // Có file mới → upload cả file và apply
        const formData = new FormData();
        formData.append("background", backgroundFile);
        formData.append("apply", bgApplyOption);

        fetch(`${API_URL}/events-admin/${selectedEvent.id}/background?id_admin=${id_admin}`, {
            method: "POST",
            body: formData
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.status === "success") {
                    alert("Cập nhật ảnh nền thành công!");
                    refreshEvents();
                } else {
                    alert("Lỗi: " + data.message);
                }
            })
            .catch((error) => {
                console.error("Error updating background image:", error);
                alert("Có lỗi khi cập nhật ảnh nền.");
            });
    }

    setShowUploadForm(false);
    setBackgroundFile(null); // Reset sau khi lưu
};

    // === Cập nhật logic lọc & tìm kiếm ===
    const filteredAndSearchedEvents = useMemo(() => {
        const source = Array.isArray(events) ? events : [];
        let result = [...source];

        // Lọc theo ngày/tháng
        if (filterOption === "day") {
            // Lọc theo ngày gần đây nhất
            if (result.length > 0) {
                // Sắp xếp theo ngày giảm dần
                const sorted = [...result].sort((a, b) => new Date(b.date) - new Date(a.date));
                // Lấy ngày gần nhất
                const latestDate = sorted[0].date;
                // Lọc tất cả sự kiện có cùng ngày gần nhất
                result = result.filter(event => event.date === latestDate);
            }
        }else if (filterOption === "month") {
    if (result.length === 0) {
        result = [];
    } else {
        // Tìm sự kiện có ngày lớn nhất (gần nhất theo thời gian)
        const latestEvent = result.reduce((prev, curr) =>
            new Date(curr.date) > new Date(prev.date) ? curr : prev
        );
        const latestMonth = latestEvent.date.slice(0, 7); // "YYYY-MM"
        result = result.filter(event => event.date.startsWith(latestMonth));
    }
}

        // Tìm kiếm theo ID, tên, ngày
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            result = result.filter(event =>
                String(event.id).includes(term) ||
                event.name.toLowerCase().includes(term) ||
                event.date.includes(term)
            );
        }

        return result;
    }, [events, filterOption, searchTerm]);

    // === Phân trang ===
    const totalPages = Math.ceil(filteredAndSearchedEvents.length / ITEMS_PER_PAGE);
    const paginatedEvents = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAndSearchedEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredAndSearchedEvents, currentPage]);

    // === Reset trang khi tìm kiếm/lọc thay đổi ===
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterOption]);

    // === Hàm điều hướng trang ===
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // === CHỌN TẤT CẢ TOÀN CỤC ===
    const toggleSelectAllGlobal = async () => {
        if (selectAllGlobal) {
            setSelectedIds([]);
            setSelectAllGlobal(false);
            return;
        }

        if (filteredAndSearchedEvents.length === 0) {
            alert('Không có sự kiện nào để chọn!');
            return;
        }

        const allIds = filteredAndSearchedEvents.map(e => e.id);
        setSelectedIds(allIds);
        setSelectAllGlobal(true);
        alert(`Đã chọn tất cả ${allIds.length} sự kiện!`);
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
            alert('Vui lòng chọn ít nhất 1 sự kiện để xóa!');
            return;
        }
        if (!confirm(`Xóa vĩnh viễn ${selectedIds.length} sự kiện đã chọn?\nHành động này không thể hoàn tác!`)) return;

        try {
            const promises = selectedIds.map(id =>
                fetch(`${API_URL}/events-admin/${id}?id_admin=${id_admin}`, { method: 'DELETE' })
            );
            await Promise.all(promises);
            alert(`Đã xóa thành công ${selectedIds.length} sự kiện!`);
            setSelectedIds([]);
            setSelectAllGlobal(false);
            refreshEvents();
        } catch (err) {
            alert('Có lỗi khi xóa hàng loạt!');
        }
    };

    const isCurrentPageFullySelected = paginatedEvents.length > 0 && paginatedEvents.every(e => selectedIds.includes(e.id));

    // Tính toán hiển thị trang
    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSearchedEvents.length);

    return (
        <>
            <Navbar
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={toggleSidebar}
                id={id_admin}
                username={username}
            />

            <div className="event-scroll-container">
                <div className={`event-main-container ${sidebarCollapsed ? 'event-sidebar-collapsed' : ''}`}>
                    <div className="event-header">
                        <h2 className="event-title">QUẢN LÝ SỰ KIỆN</h2>
                    </div>

                    <div className="event-controls">
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <button
                                className="event-btn-pink"
                                onClick={() => {
                                    setShowAddForm(true);
                                    setEventIdToEdit(null);
                                    setEventName("");
                                    setEventDate("");
                                    setSelectedUsers([]);
                                }}
                            >
                                <i className="bi bi-plus-lg"></i> Thêm sự kiện
                            </button>
                            <button
                                className={`event-btn-pink batch-delete-btn ${selectedIds.length === 0 ? 'disabled' : ''}`}
                                onClick={handleBatchDelete}
                            >
                                Xóa {selectedIds.length > 0 ? selectedIds.length : 'nhiều sự kiện'}
                            </button>
                        </div>

                        <div className="event-searchFillter">
                            <div className="event-search-box">
                                <i className="bi bi-search"></i>
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm theo tên, ngày..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="event-filter-wrapper" ref={filterRef}>
                                <button
                                    className="event-filter-toggle-btn"
                                    onClick={() => setShowFilterMenu(prev => !prev)}
                                >
                                    <i className="bi bi-funnel"></i>
                                </button>

                                <div className={`event-filter-menu ${showFilterMenu ? 'show' : ''}`}>
                                    <button className={filterOption === 'all' ? 'active' : ''} onClick={() => { setFilterOption('all'); setShowFilterMenu(false); }}>
                                        Tất cả
                                    </button>
                                    <button className={filterOption === 'day' ? 'active' : ''} onClick={() => { setFilterOption('day'); setShowFilterMenu(false); }}>
                                        Ngày gần nhất
                                    </button>
<button className={filterOption === 'month' ? 'active' : ''} onClick={() => { setFilterOption('month'); setShowFilterMenu(false); }}>
    Tháng gần nhất
</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="event-table-wrapper">
                        <table className="event-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '50px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectAllGlobal || isCurrentPageFullySelected}
                                            onChange={toggleSelectAllGlobal}
                                            className="event-custom-checkbox"
                                            title={selectAllGlobal ? "Bỏ chọn tất cả" : "Chọn tất cả sự kiện ở mọi trang"}
                                        />
                                    </th>
                                    <th>STT</th>
                                    <th>TÊN</th>
                                    <th>NGÀY</th>
                                    <th>ẢNH NỀN</th>
                                    <th>LOGO</th>
                                    <th>GHI CHÚ</th>
                                    <th style={{ textAlign: 'center' }}>HÀNH ĐỘNG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedEvents.length > 0 ? (
                                    paginatedEvents.map((event) => (
                                        <tr key={event.id} className={selectedIds.includes(event.id) ? 'selected-row' : ''}>
                                            <td style={{ textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(event.id)}
                                                    onChange={() => toggleSelectId(event.id)}
                                                    className="event-custom-checkbox"
                                                />
                                            </td>
                                            <td>{(currentPage - 1) * ITEMS_PER_PAGE + paginatedEvents.indexOf(event) + 1}</td>
                                            <td><strong>{event.name}</strong></td>
                                            <td>{event.date}</td>
                                            <td>
                                                <button
                                                    className="event-icon-btn"
                                                    onClick={() => {
                                                        setSelectedEvent(event);
                                                        setBgApplyOption(
                                                            event.ev_back === 1 ? "home" :
                                                                event.ev_back === 2 ? "all-pages" : "cancel"
                                                        );
                                                        setShowUploadForm(true);
                                                    }}
                                                >
                                                    <FaUpload />
                                                </button>
                                            </td>
                                            <td>
                                                <button
                                                    className="event-icon-btn"
                                                    onClick={() => {
                                                        setSelectedEvent(event);
                                                        setLogoApplyOption(event.ev_logo === 1 ? "home" : "cancel");
                                                        setShowLogoUploadForm(true);
                                                    }}
                                                >
                                                    <FaUpload />
                                                </button>
                                            </td>
                                            <td>
                                                <button
                                                    className="event-icon-btn"
                                                    onClick={() => {
                                                        setSelectedEvent(event);
                                                        const noteObj = notes.find(note => note.id === event.id) || {
                                                            id: event.id,
                                                            note1: "",
                                                            note2: "",
                                                            note3: ""
                                                        };
                                                        setCurrentNote(noteObj);
                                                        setNoteApply(event.ev_note === 1 ? "home" : "cancel");
                                                        setShowTextForm(true);
                                                    }}
                                                >
                                                    <FaFileAlt />
                                                </button>
                                            </td>
                                            <td className="event-actions">
                                                <button
                                                    onClick={() => {
                                                        setShowAddForm(true);
                                                        setEventIdToEdit(event.id);
                                                        setEventName(event.name);
                                                        setEventDate(event.date);
                                                        const appliedUsers = Array.isArray(event.apply) ? event.apply : [];
                                                        setSelectedUsers(appliedUsers);
                                                    }}
                                                    className="edit-btn"
                                                >
                                                    <i className="bi bi-pencil"></i>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteEvent(event.id)}
                                                    className="delete-btn"
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="8" style={{ textAlign: 'center' }}>Không có dữ liệu.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION BÊN DƯỚI */}
                    {filteredAndSearchedEvents.length > 0 && (
                        <div className="event-pagination">
                            <span>
                                Hiển thị {startItem} - {endItem} trên {filteredAndSearchedEvents.length} sự kiện
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

            {/* Modal thêm/sửa sự kiện */}
            {showAddForm && (
                <div className="event-modal-overlay" onClick={() => setShowAddForm(false)}>
                    <div className="event-modal-content" onClick={e => e.stopPropagation()}>
                        <h3>{eventIdToEdit ? "Chỉnh sửa Sự Kiện" : "Thêm Sự Kiện"}</h3>
                        <input
                            type="text"
                            placeholder="Tên sự kiện"
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                        />
                        <input
                            type="date"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                        />
                        <h3>Áp dụng cho</h3>
                        <div>
                            {users.map((user) => {
                                const isApplied = selectedUsers.includes(user.id);
                                return (
                                    <div key={user.id} style={{ marginBottom: '10px' }}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={isApplied}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedUsers([...selectedUsers, user.id]);
                                                    } else {
                                                        setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                                    }
                                                }}
                                            />
                                            <span style={{ marginLeft: '8px', color: isApplied ? '#d81b60' : '#424242' }}>
                                                {user.username}
                                            </span>
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="modal-buttons">
                            <button className="cancel-btn" onClick={() => setShowAddForm(false)}>Hủy</button>
                            <button
                                className="save-btn"
                                onClick={eventIdToEdit ? handleSaveEvent : handleAddEvent}
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal tải ảnh nền */}
{/* Modal tải ảnh nền */}
{showUploadForm && selectedEvent && (
// Trong modal background
<div className="event-modal-overlay" onClick={() => {
    setShowUploadForm(false);
    setBackgroundFile(null); // ← thêm dòng này
}}>
        <div className="event-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Tải Ảnh Nền</h3>

            {/* Hiển thị ảnh nền hiện tại nếu có */}
            {selectedEvent.background && (
                <div style={{ marginBottom: '15px' }}>
                    <p style={{ marginBottom: '5px', fontSize: '14px', color: '#666' }}>Ảnh nền hiện tại:</p>
                    <img
                        src={selectedEvent.background}
                        alt="Ảnh nền hiện tại"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}
                    />
                </div>
            )}

            <input
                type="file"
                onChange={handleBackgroundFileChange}
                accept="image/*"
                style={{ marginBottom: '15px' }}
            />

            <div className="checkbox-group">
                <label>
                    <input
                        type="radio"
                        name="apply"
                        value="home"
                        checked={bgApplyOption === "home"}
                        onChange={(e) => setBgApplyOption(e.target.value)}
                    />
                    <span className="radio-btn"></span> Áp dụng trang Home
                </label>
                <label>
                    <input
                        type="radio"
                        name="apply"
                        value="all-pages"
                        checked={bgApplyOption === "all-pages"}
                        onChange={(e) => setBgApplyOption(e.target.value)}
                    />
                    <span className="radio-btn"></span> Áp dụng all pages
                </label>
                <label>
                    <input
                        type="radio"
                        name="apply"
                        value="cancel"
                        checked={bgApplyOption === "cancel"}
                        onChange={(e) => setBgApplyOption(e.target.value)}
                    />
                    <span className="radio-btn"></span> Hủy áp dụng
                </label>
            </div>

            <div className="modal-buttons">
                <button className="cancel-btn" onClick={() => setShowUploadForm(false)}>Hủy</button>
                <button className="save-btn" onClick={handleSaveBackgroundImage}>Lưu</button>
            </div>
        </div>
    </div>
)}

            {/* Modal tải logo */}
{/* Modal tải logo */}
{showLogoUploadForm && selectedEvent && (
// Trong modal background
<div className="event-modal-overlay" onClick={() => {
    setShowUploadForm(false);
    setBackgroundFile(null); // ← thêm dòng này
}}>
        <div className="event-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Tải Logo</h3>

            {/* Hiển thị logo hiện tại nếu có */}
            {selectedEvent.logo && (
                <div style={{ marginBottom: '15px' }}>
                    <p style={{ marginBottom: '5px', fontSize: '14px', color: '#666' }}>Logo hiện tại:</p>
                    <img
                        src={selectedEvent.logo}
                        alt="Logo hiện tại"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '150px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}
                    />
                </div>
            )}

            <input
                type="file"
                onChange={(e) => setLogoFile(e.target.files[0])}
                accept="image/*"
                style={{ marginBottom: '15px' }}
            />

            <div className="checkbox-group">
                <label>
                    <input
                        type="radio"
                        name="applyLogo"
                        value="home"
                        checked={logoApplyOption === "home"}
                        onChange={(e) => setLogoApplyOption(e.target.value)}
                    />
                    <span className="radio-btn"></span> Áp dụng trang Home
                </label>
                <label>
                    <input
                        type="radio"
                        name="applyLogo"
                        value="cancel"
                        checked={logoApplyOption === "cancel"}
                        onChange={(e) => setLogoApplyOption(e.target.value)}
                    />
                    <span className="radio-btn"></span> Hủy áp dụng
                </label>
            </div>

            <div className="modal-buttons">
                <button className="cancel-btn" onClick={() => setShowLogoUploadForm(false)}>Hủy</button>
                <button className="save-btn" onClick={handleSaveLogoImage}>Lưu</button>
            </div>
        </div>
    </div>
)}

            {/* Modal tạo ghi chú */}
            {showTextForm && (
                <div className="event-modal-overlay" onClick={() => setShowTextForm(false)}>
                    <div className="event-modal-content" onClick={e => e.stopPropagation()}>
                        <h3>Tạo Ghi Chú</h3>
                        <input
                            type="text"
                            placeholder="Ghi chú 1"
                            value={currentNote.note1}
                            onChange={(e) => handleCurrentNoteChange("note1", e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Ghi chú 2"
                            value={currentNote.note2}
                            onChange={(e) => handleCurrentNoteChange("note2", e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Ghi chú 3"
                            value={currentNote.note3}
                            onChange={(e) => handleCurrentNoteChange("note3", e.target.value)}
                        />
                        <div className="checkbox-group">
                            <label>
                                <input
                                    type="radio"
                                    name="applyNote"
                                    value="home"
                                    checked={noteApply === "home"}
                                    onChange={(e) => setNoteApply(e.target.value)}
                                />
                                <span className="radio-btn"></span> Áp dụng trang Home
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name="applyNote"
                                    value="cancel"
                                    checked={noteApply === "cancel"}
                                    onChange={(e) => setNoteApply(e.target.value)}
                                />
                                <span className="radio-btn"></span> Hủy áp dụng
                            </label>
                        </div>
                        <div className="modal-buttons">
                            <button className="cancel-btn" onClick={() => setShowTextForm(false)}>Hủy</button>
                            <button className="save-btn" onClick={handleSaveNote}>Lưu</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Event;
                                  