import React, { useEffect, useState, useRef } from 'react';
import Navbar from '../../components/Navbar';
import './AiTopic.css';

const AiTopic = () => {
  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const [auth] = useState(getAuth());
  const { id_admin, username: adminName } = auth || {};

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // --- STATE DỮ LIỆU & PHÂN TRANG (CLIENT SIDE) ---
  const [allTopics, setAllTopics] = useState([]); // Dữ liệu gốc từ API
  const [displayedTopics, setDisplayedTopics] = useState([]); // Dữ liệu hiển thị sau khi lọc/phân trang
  const [loading, setLoading] = useState(true);

  // Bộ lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [uniqueTopics, setUniqueTopics] = useState([]);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Checkbox & Xóa
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Modal & Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);

  // Form State
  // mode: 'upload' (tải ảnh từ máy) | 'generate' (nhập prompt tạo ảnh)
  const [formData, setFormData] = useState({
    name: '', topic: '', type: 'swap', status: 'Đang hoạt động',
    illustration: null, // File object (sẽ gửi lên server)
    prompt: '', 
    mode: 'upload',
    previewUrl: null, // Để hiển thị ảnh preview
    isGenerating: false // Loading khi đang tạo ảnh
  });

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const filterWrapperRef = useRef(null);

  // 1. LẤY DỮ LIỆU (GET ALL)
  const fetchAllTopics = async () => {
    if (!id_admin) return;
    setLoading(true);
    try {
      // Backend chỉ trả về tất cả data, không filter
      const res = await fetch(`${API_URL}/ai-topics?id_admin=${id_admin}`);
      const data = await res.json();
      
      if (data.status === 'success') {
        const topics = data.data || [];
        setAllTopics(topics);

        // Trích xuất danh sách Topic duy nhất để làm bộ lọc
        const uTopics = [...new Set(topics.map(t => t.topic).filter(Boolean))].sort();
        setUniqueTopics(uTopics);
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTopics();
  }, [id_admin]);

  // 2. XỬ LÝ LỌC & PHÂN TRANG (CLIENT SIDE)
  useEffect(() => {
    let result = [...allTopics];

    // a. Tìm kiếm
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(t => 
        (t.name && t.name.toLowerCase().includes(lowerSearch)) ||
        (t.topic && t.topic.toLowerCase().includes(lowerSearch))
      );
    }

    // b. Lọc theo Topic
    if (filterTopic && filterTopic !== 'all') {
      result = result.filter(t => t.topic === filterTopic);
    }

    // c. Tính toán phân trang
    setTotalItems(result.length);
    const totalPg = Math.ceil(result.length / itemsPerPage) || 1;
    setTotalPages(totalPg);
    
    // Reset về trang 1 nếu search thay đổi mà trang hiện tại vượt quá
    if (currentPage > totalPg) setCurrentPage(1);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = result.slice(startIndex, startIndex + itemsPerPage);
    
    setDisplayedTopics(paginatedData);
    
    // Reset checkbox khi data thay đổi (để an toàn)
    // setSelectAll(false);
    // setSelectedIds([]); 

  }, [allTopics, searchTerm, filterTopic, currentPage]);


// 3. HÀM TẠO ẢNH TỪ PROMPT (ĐÃ SỬA)
  const handleGenerateImage = async () => {
    if (!formData.prompt) return alert("Vui lòng nhập prompt!");
    
    setFormData(prev => ({ ...prev, isGenerating: true }));
    try {
      // Gọi Bridge Server (Localhost:5000)
      const res = await fetch('http://localhost:5000/admin-generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: formData.prompt })
      });
      
      const data = await res.json();
      
      if (!data.success) {
          throw new Error(data.error || "Lỗi server");
      }

      const generatedImageBase64 = data.image; // Dạng "data:image/jpeg;base64,..."

      // CHUYỂN BASE64 THÀNH FILE OBJECT ĐỂ UPLOAD LÊN DB
      const resBlob = await fetch(generatedImageBase64);
      const blob = await resBlob.blob();
      const file = new File([blob], "ai_generated_admin.jpg", { type: "image/jpeg" });

      setFormData(prev => ({
        ...prev,
        illustration: file, // Lưu file vào state để submit
        previewUrl: generatedImageBase64, // Hiển thị UI
        isGenerating: false
      }));

    } catch (error) {
      console.error(error);
      alert("Lỗi tạo ảnh: " + error.message);
      setFormData(prev => ({ ...prev, isGenerating: false }));
    }
  };
  // --- HANDLERS KHÁC ---
  const handlePageChange = (p) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      setSelectedIds(displayedTopics.map(t => t.id));
      setSelectAll(true);
    }
  };

  const toggleSelectId = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const resetForm = () => {
    setFormData({
      name: '', topic: '', type: 'swap', status: 'Đang hoạt động',
      illustration: null, prompt: '', mode: 'upload', previewUrl: null, isGenerating: false
    });
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (topic) => {
    setSelectedTopic(topic);
    setFormData({
      name: topic.name,
      topic: topic.topic || '',
      type: topic.type || 'swap',
      status: topic.status,
      illustration: null, // Reset file vì ta chưa chọn file mới
      prompt: topic.prompt || '',
      mode: topic.prompt ? 'generate' : 'upload', // Nếu có prompt cũ thì default tab prompt
      previewUrl: topic.illustration, // Hiển thị ảnh cũ
      isGenerating: false
    });
    setShowEditModal(true);
  };

  const handleSubmit = async (e, isUpdate = false) => {
    e.preventDefault();
    
    // Nếu đang mode upload mà chưa có ảnh (và là thêm mới)
    if (!isUpdate && formData.mode === 'upload' && !formData.illustration) {
        return alert("Vui lòng chọn ảnh!");
    }
    // Nếu đang mode generate mà chưa tạo ảnh
    if (formData.mode === 'generate' && !formData.illustration && !isUpdate) {
        return alert("Vui lòng nhấn 'Tạo ảnh' trước khi lưu!");
    }

    const payload = new FormData();
    if (isUpdate) payload.append('_method', 'PUT');
    
    payload.append('id_admin', id_admin);
    payload.append('name', formData.name);
    payload.append('topic', formData.topic);
    payload.append('type', formData.type);
    payload.append('status', formData.status);
    
    // Gửi prompt nếu có
    if (formData.prompt) payload.append('prompt', formData.prompt);

    // Gửi file ảnh (nếu có: user upload hoặc AI generate xong đã convert thành file)
    if (formData.illustration) {
        payload.append('illustration', formData.illustration);
    }

    const url = isUpdate ? `${API_URL}/ai-topics/${selectedTopic.id}` : `${API_URL}/ai-topics`;

    try {
      const res = await fetch(url, { method: 'POST', body: payload });
      const result = await res.json();
      
      if (result.status === 'success') {
        alert(result.message);
        setShowAddModal(false);
        setShowEditModal(false);
        fetchAllTopics(); // Reload lại toàn bộ list
      } else {
        alert(result.message || 'Lỗi xảy ra');
      }
    } catch (err) {
      alert('Lỗi mạng!');
    }
  };

  const handleDeleteBatch = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Xóa ${selectedIds.length} mục?`)) return;
    
    try {
      await Promise.all(selectedIds.map(id => fetch(`${API_URL}/ai-topics/${id}`, { method: 'DELETE' })));
      setSelectedIds([]);
      setSelectAll(false);
      fetchAllTopics();
    } catch (e) { alert('Lỗi xóa'); }
  };

  // --- RENDER ---
  return (
    <div className="aitopic-root">
      <Navbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} id={id_admin} username={adminName} />

      <div className="aitopic-scroll-container">
        <div className={`aitopic-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="aitopic-header">
            <h2 className="aitopic-title">QUẢN LÝ HIỆU ỨNG AI</h2>
          </div>

          <div className="aitopic-controls">
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <button className="btn-pink" onClick={openAddModal}><i className="bi bi-plus-lg"></i> Thêm mới</button>
              <button className={`btn-pink batch-delete-btn ${selectedIds.length === 0 ? 'disabled' : ''}`} onClick={handleDeleteBatch}>
                Xóa {selectedIds.length} mục
              </button>
            </div>

            <div className="searchFillter">
              <div className="aitopic-search">
                <i className="bi bi-search"></i>
                <input type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
              </div>

              <div className="aitopic-filter-wrapper" ref={filterWrapperRef}>
                <button className="filter-toggle-btn" onClick={e => e.currentTarget.nextElementSibling.classList.toggle('show')}>
                  <i className="bi bi-funnel"></i>
                </button>
                <div className="aitopic-filter-menu">
                  <button className={!filterTopic ? 'active' : ''} onClick={() => setFilterTopic('')}>Tất cả</button>
                  {uniqueTopics.map(n => (
                    <button key={n} className={filterTopic === n ? 'active' : ''} onClick={() => setFilterTopic(n)}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="aitopic-table-wrapper">
            <table className="aitopic-table">
              <thead>
                <tr>
                  <th style={{width:'40px'}}><input type="checkbox" checked={selectAll} onChange={toggleSelectAll} /></th>
                  <th>STT</th>
                  <th>TÊN</th>
                  <th>CHỦ ĐỀ</th>
                  <th>LOẠI</th>
                  <th style={{textAlign:'center'}}>MINH HỌA</th>
                  <th style={{textAlign:'center'}}>TRẠNG THÁI</th>
                  <th style={{textAlign:'center'}}>HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan="8" className="text-center">Đang tải...</td></tr> : 
                 displayedTopics.length === 0 ? <tr><td colSpan="8" className="text-center">Không tìm thấy dữ liệu</td></tr> :
                 displayedTopics.map((t, i) => (
                   <tr key={t.id} className={selectedIds.includes(t.id) ? 'selected-row' : ''}>
                     <td><input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSelectId(t.id)} /></td>
                     <td>{(currentPage - 1) * itemsPerPage + i + 1}</td>
                     <td>
                        <div style={{fontWeight:'bold'}}>{t.name}</div>
                        {t.prompt && <small style={{color:'#666', fontSize:'11px'}}>Prompt: {t.prompt.substring(0, 20)}...</small>}
                     </td>
                     <td>{t.topic}</td>
                     <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                     <td style={{textAlign:'center'}}>
                        {t.illustration && <img src={t.illustration} alt="" className="aitopic-thumb" />}
                     </td>
                     <td style={{textAlign:'center'}}>{t.status}</td>
                     <td className='stickerpro-actions'>
                       <button className="edit-btn" onClick={() => openEditModal(t)}><i className="bi bi-pencil"></i></button>
                       <button className="delete-btn" onClick={async() => { if(confirm('Xóa?')) { await fetch(`${API_URL}/ai-topics/${t.id}`, {method:'DELETE'}); fetchAllTopics(); } }}><i className="bi bi-trash"></i></button>
                     </td>
                   </tr>
                 ))
                }
              </tbody>
            </table>
          </div>

          {/* PHÂN TRANG UI */}
          <div className="aitopic-pagination">
             <span>Tổng: {totalItems} Hiệu ứng</span>
             <div className="pagination-buttons">
               <button disabled={currentPage===1} onClick={()=>handlePageChange(currentPage-1)}>«</button>
               {Array.from({length: totalPages}, (_, i) => i + 1).map(p => (
                 <button key={p} className={currentPage===p?'active':''} onClick={()=>handlePageChange(p)}>{p}</button>
               ))}
               <button disabled={currentPage===totalPages} onClick={()=>handlePageChange(currentPage+1)}>»</button>
             </div>
          </div>
        </div>
      </div>

      {/* MODAL FORM (Dùng chung cho Add và Edit chỉ đổi tiêu đề/hàm submit) */}
      {(showAddModal || showEditModal) && (
        <div className="aitopic-modal-overlay" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
          <div className="aitopic-modal-content" onClick={e => e.stopPropagation()}>
            <h3>{showAddModal ? 'Thêm Mới' : 'Cập Nhật'}</h3>
            <form onSubmit={e => handleSubmit(e, showEditModal)}>
              <div className="form-group">
                <label>Tên hiệu ứng</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-row" style={{display:'flex', gap:'10px'}}>
                  <div className="form-group" style={{flex:1}}>
                    <label>Chủ đề</label>
                    <input type="text" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                  </div>
                  <div className="form-group" style={{flex:1}}>
                    <label>Type</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                      <option value="swap">Swap Face</option>
                      <option value="background">Background</option>
                    </select>
                  </div>
              </div>

              <div className="form-group">
                <label>Hình ảnh</label>
                <div style={{display:'flex', gap:'15px', marginBottom:'10px'}}>
                   <label><input type="radio" checked={formData.mode === 'upload'} onChange={() => setFormData({...formData, mode: 'upload'})} /> Tải lên</label>
                   <label><input type="radio" checked={formData.mode === 'generate'} onChange={() => setFormData({...formData, mode: 'generate'})} /> AI Generate</label>
                </div>

                {formData.mode === 'upload' ? (
                   <input type="file" onChange={e => {
                       if(e.target.files[0]) {
                           setFormData({
                               ...formData, 
                               illustration: e.target.files[0], 
                               previewUrl: URL.createObjectURL(e.target.files[0]),
                               prompt: '' // Clear prompt nếu chọn upload
                           });
                       }
                   }} />
                ) : (
                   <div>
                       <textarea placeholder="Nhập prompt..." rows="3" value={formData.prompt} onChange={e => setFormData({...formData, prompt: e.target.value})} />
                       <button type="button" className="btn-pink" style={{marginTop:'5px', width:'100%'}} onClick={handleGenerateImage} disabled={formData.isGenerating}>
                           {formData.isGenerating ? 'Đang tạo...' : 'Tạo ảnh ngay'}
                       </button>
                   </div>
                )}

                {/* Preview Ảnh */}
                {formData.previewUrl && (
                    <div style={{marginTop:'10px', textAlign:'center'}}>
                        <img src={formData.previewUrl} alt="Preview" style={{maxHeight:'150px', borderRadius:'8px', border:'1px solid #ddd'}} />
                    </div>
                )}
              </div>

              <div className="form-group">
                <label>Trạng thái</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option>Đang hoạt động</option>
                  <option>Không hoạt động</option>
                </select>
              </div>

              <div className="modal-buttons">
                 <button type="button" className="cancel" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>Hủy</button>
                 <button type="submit" className="submit" disabled={formData.isGenerating}>Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AiTopic;