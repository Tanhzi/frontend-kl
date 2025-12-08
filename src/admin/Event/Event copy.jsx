import React, { useState, useEffect, useMemo } from "react";
import { FaPlus, FaEdit, FaTrash, FaUpload, FaFileAlt, FaChevronDown } from "react-icons/fa";
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

    const [noteApply, setNoteApply] = useState("cancel"); // Mặc định là "cancel"

    const [showAddForm, setShowAddForm] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [showTextForm, setShowTextForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [eventName, setEventName] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [eventIdToEdit, setEventIdToEdit] = useState(null);
    const [showLogoUploadForm, setShowLogoUploadForm] = useState(false);
    const [filterOption, setFilterOption] = useState("none");
    // === Thêm state phân trang ===
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);

    // Lấy dữ liệu ghi chú từ Laravel API
    useEffect(() => {
        if (!id_admin) return;
        fetch(`${import.meta.env.VITE_API_BASE_URL}/event-notes?id_admin=${id_admin}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setNotes(data);
                } else if (data.status === "error") {
                    console.error("Error fetching notes:", data.message);
                }
            })
            .catch(error => console.error("Error fetching notes:", error));
    }, [id_admin]);

    useEffect(() => {
        if (id_admin) {
            refreshEvents();
            refreshUsers();
        }
    }, [id_admin]);

    const refreshEvents = () => {
        fetch(`${import.meta.env.VITE_API_BASE_URL}/events-admin?id_admin=${id_admin}`)
            .then((res) => res.json())
            .then((data) => {
                // 👇 Kiểm tra cấu trúc phản hồi từ API
                if (Array.isArray(data)) {
                    setEvents(data);
                } else if (data && Array.isArray(data.data)) {
                    // Nếu API trả về { data: [...] }
                    setEvents(data.data);
                } else {
                    // Nếu không phải mảng, gán mảng rỗng và log cảnh báo
                    console.warn("Unexpected events API response:", data);
                    setEvents([]);
                }
            })
            .catch((error) => {
                console.error("Error fetching events:", error);
                setEvents([]); // fallback an toàn
            });
    };

    const refreshUsers = () => {
        fetch(`${import.meta.env.VITE_API_BASE_URL}/users-admin?id_admin=${id_admin}`)
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

        fetch(`${import.meta.env.VITE_API_BASE_URL}/events-admin/${currentNote.id}/note?id_admin=${id_admin}`, {
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
        // if (!logoFile) {
        //     alert("Vui lòng chọn logo!");
        //     return;
        // }

        const formData = new FormData();
        formData.append("logo", logoFile);
        formData.append("apply", logoApplyOption);

        fetch(`${import.meta.env.VITE_API_BASE_URL}/events-admin/${selectedEvent.id}/logo?id_admin=${id_admin}`, {
            method: "POST",
            body: formData
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.status === "success") {
                    alert("Cập nhật logo thành công!");
                    refreshEvents(); // ✅ Refresh để cập nhật ev_logo
                } else {
                    alert("Lỗi: " + data.message);
                }
            })
            .catch((error) => {
                console.error("Error updating logo:", error);
                alert("Có lỗi khi cập nhật logo.");
            });

        setShowLogoUploadForm(false);
    };

    // Hàm tạo event mới
    const handleAddEvent = () => {
        if (!eventName || !eventDate) {
            alert("Vui lòng nhập tên và ngày của sự kiện!");
            return;
        }

        // Gửi dưới dạng JSON
        const payload = {
            name: eventName,
            date: eventDate,
            apply: selectedUsers // mảng số nguyên
        };

        fetch(`${import.meta.env.VITE_API_BASE_URL}/events-admin?id_admin=${id_admin}`, {
            method: "POST",
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

                alert("Tạo mới sự kiện thành công!");
                const newEventId = data.id;

                // Cập nhật id_topic cho user
                if (selectedUsers.length > 0) {
                    try {
                        await Promise.all(
                            selectedUsers.map(userId => {
                                return fetch(
                                    `${import.meta.env.VITE_API_BASE_URL}/users-admin/${userId}?id_admin=${id_admin}`,
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

        fetch(`${import.meta.env.VITE_API_BASE_URL}/events-admin/${eventIdToEdit}?id_admin=${id_admin}`, {
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
                                    `${import.meta.env.VITE_API_BASE_URL}/users-admin/${userId}?id_admin=${id_admin}`,
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

        fetch(`${import.meta.env.VITE_API_BASE_URL}/events-admin/${id}?id_admin=${id_admin}`, {
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

    const handleOpenNoteModal = (eventId) => {
        const noteObj = notes.find(note => note.id === eventId) || {
            id: eventId,
            note1: "",
            note2: "",
            note3: ""
        };
        setCurrentNote(noteObj);
        setShowTextForm(true);
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
        // if (!backgroundFile) {
        //     alert("Vui lòng chọn ảnh!");
        //     return;
        // }

        const formData = new FormData();
        formData.append("background", backgroundFile);
        formData.append("apply", bgApplyOption);

        fetch(`${import.meta.env.VITE_API_BASE_URL}/events-admin/${selectedEvent.id}/background?id_admin=${id_admin}`, {
            method: "POST",
            body: formData
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.status === "success") {
                    alert("Cập nhật ảnh nền thành công!");
                    refreshEvents(); // ✅ Refresh để cập nhật ev_back
                } else {
                    alert("Lỗi: " + data.message);
                }
            })
            .catch((error) => {
                console.error("Error updating background image:", error);
                alert("Có lỗi khi cập nhật ảnh nền.");
            });

        setShowUploadForm(false);
    };

    const filteredEvents = events.filter((event) => {
        if (filterOption === "day") {
            const today = new Date().toISOString().split("T")[0];
            return event.date === today;
        } else if (filterOption === "month") {
            const currentMonth = new Date().toISOString().slice(0, 7);
            return event.date.startsWith(currentMonth);
        }
        return true;
    });

    // === Cập nhật logic lọc & tìm kiếm ===
    const filteredAndSearchedEvents = useMemo(() => {
        const source = Array.isArray(events) ? events : [];
        let result = [...events];

        // Lọc theo ngày/tháng
        if (filterOption === "day") {
            const today = new Date().toISOString().split("T")[0];
            result = result.filter(event => event.date === today);
        } else if (filterOption === "month") {
            const currentMonth = new Date().toISOString().slice(0, 7);
            result = result.filter(event => event.date.startsWith(currentMonth));
        }

        // Tìm kiếm theo ID, tên, ngày
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            result = result.filter(event =>
                String(event.id).includes(term) ||
                event.name.toLowerCase().includes(term) ||
                event.date.includes(term) // ngày dạng "YYYY-MM-DD", nên có thể tìm "2025", "05", v.v.
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

    return (
        <>
            <Navbar
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={toggleSidebar}
                id={id_admin}
                username={username}
            />

            <div className={`event-main-container ${sidebarCollapsed ? 'event-sidebar-collapsed' : ''}`}>
                <div className="event-header">
                    <div className="event-title-container">
                        <h2 className="event-title">SỰ KIỆN</h2>
                    </div>

                    <div className="event-search">
                    <div className="event-filter">
                        <button
                            className="event-filter-btn"
                            onClick={() =>
                                setFilterOption(filterOption === "none" ? "show" : "none")
                            }
                        >
                            <FaChevronDown />
                        </button>
                        {filterOption === "show" && (
                            <div className="filter-options">
                                <button className="filter-btn" onClick={() => setFilterOption("day")}>
                                    Lọc theo ngày
                                </button>
                                <button className="filter-btn" onClick={() => setFilterOption("month")}>
                                    Lọc theo tháng
                                </button>
                            </div>
                        )}
                    </div>
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo id, tên, ngày"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button
                            className="event-add-btn"
                            onClick={() => {
                                setShowAddForm(true);
                                setEventIdToEdit(null);
                                setEventName("");
                                setEventDate("");
                                setSelectedUsers([]);
                            }}
                            title="Thêm sự kiện mới"
                        >
                            <FaPlus />
                            <span style={{ marginLeft: '8px' }}>Thêm Sự Kiện</span>
                        </button>
                    </div>
                </div>

                <div className="event-table-wrapper">
                    <table className="event-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Tên</th>
                                <th>Ngày</th>
                                <th>Ảnh nền</th>
                                <th>Logo</th>
                                <th>Ghi chú</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedEvents.map((event) => (
                                <tr key={event.id}>
                                    <td>{event.id}</td>
                                    <td>{event.name}</td>
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
                                    <td>
                                        <button
                                            className="event-icon-btn"
                                            onClick={() => {
                                                setShowAddForm(true);
                                                setEventIdToEdit(event.id);
                                                setEventName(event.name);
                                                setEventDate(event.date);
                                                const appliedUsers = Array.isArray(event.apply) ? event.apply : [];
                                                setSelectedUsers(appliedUsers);
                                            }}
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            className="event-icon-btn"
                                            onClick={() => handleDeleteEvent(event.id)}
                                        >
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Phân trang */}
                {totalPages > 1 && (
                    <div className="event-pagination">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="event-pagination-btn"
                        >
                        <i className="fa-solid fa-arrow-left"></i>
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => goToPage(i + 1)}
                                className={`event-pagination-btn ${currentPage === i + 1 ? 'event-pagination-active' : ''
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="event-pagination-btn"
                        >
                        <i className="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                )}
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
            {showUploadForm && (
                <div className="event-modal-overlay" onClick={() => setShowUploadForm(false)}>
                    <div className="event-modal-content" onClick={e => e.stopPropagation()}>
                        <h3>Tải Ảnh Nền</h3>
                        <input type="file" onChange={handleBackgroundFileChange} accept="image/*" />
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
            {showLogoUploadForm && (
                <div className="event-modal-overlay" onClick={() => setShowLogoUploadForm(false)}>
                    <div className="event-modal-content" onClick={e => e.stopPropagation()}>
                        <h3>Tải Logo</h3>
                        <input type="file" onChange={(e) => setLogoFile(e.target.files[0])} accept="image/*" />
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