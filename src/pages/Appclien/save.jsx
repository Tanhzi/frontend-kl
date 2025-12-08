// src/Appclien.jsx
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Chatbot from '../../components/Chatbot';
import './Appclien.css';

function Appclien() {
  // ✅ ——— TẤT CẢ HOOKS PHẢI Ở ĐẦU COMPONENT ———
  const navigate = useNavigate();

  const [backgroundImage, setBackgroundImage] = useState(null);
  const [isGlobalBackground, setIsGlobalBackground] = useState(false);
  const [logoImage, setLogoImage] = useState('logo.jpg');
  const [notes, setNotes] = useState([
    'Máy sẽ chụp tự động sau mỗi 10s',
    'Nếu là lần đầu đến với Memory booth\nHãy liên hệ nhân viên để được hỗ trợ',
    'Máy sẽ không trả lại tiền thừa, hãy liên hệ chúng mình để đổi tiền nhé!'
  ]);

  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const [auth, setAuth] = useState(getAuth());
  const { id, id_admin, id_topic } = auth || {};

  // 👇 State cho chatbot — PHẢI ĐƯA LÊN TRÊN, TRƯỚC MỌI RETURN
  const [isChatOpen, setIsChatOpen] = useState(false);

  // ——— LOGIC EFFECT & QUERY SAU ĐÓ ———

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (!id) {
      navigate('/');
    }
  }, [id, navigate]);

  // Xử lý phím tắt đăng xuất
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 't') {
        if (window.confirm('Bạn có muốn đăng xuất?')) {
          localStorage.removeItem('auth');
          navigate('/', { replace: true });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Fetch event data
  const { data: eventData, isLoading, error } = useQuery({
    queryKey: ['event', id_admin, id_topic],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/event-client?id_admin=${id_admin}&id_topic=${id_topic}`
      );
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    },
    enabled: !!id_admin && !!id_topic,
    staleTime: 5 * 60 * 1000,
  });

  // Cập nhật UI khi có dữ liệu
  useEffect(() => {
    if (eventData?.status === false) {
      // Background
      if (eventData.background) {
        const bgUrl = `data:image/jpeg;base64,${eventData.background}`;
        if (eventData.ev_back === 1) {
          setBackgroundImage(bgUrl);
          setIsGlobalBackground(false);
        } else if (eventData.ev_back === 2) {
          setBackgroundImage(bgUrl);
          setIsGlobalBackground(true);
        }
      }

      // Logo
      if (eventData.logo && eventData.ev_logo === 1) {
        setLogoImage(`data:image/jpeg;base64,${eventData.logo}`);
      }

      // Notes
      if (eventData.notes && eventData.ev_note === 1) {
        const newNotes = [
          eventData.notes.note1 || notes[0],
          eventData.notes.note2 || notes[1],
          eventData.notes.note3 || notes[2],
        ];
        setNotes(newNotes);
      }
    }
  }, [eventData, notes]);

  // ——— RETURN JSX (không có hook nào sau đây!) ———

  // Xử lý trạng thái tải và lỗi
  if (isLoading) {
    return <div className="app-container">Đang tải...</div>;
  }

  if (error) {
    console.error('Lỗi khi tải dữ liệu event:', error);
    // Có thể hiển thị UI lỗi nếu cần, nhưng KHÔNG gọi hook ở đây
  }

  const handleClick = () => {
    navigate('/Crecuts');
  };

  return (
    <div 
      className="app-container" 
      style={backgroundImage ? { 
        background: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: isGlobalBackground ? 'fixed' : 'scroll'
      } : {}}
    >
      <div className="logo-container">
        <img src={logoImage} alt="Memory Booth Logo" className="logo" />
      </div>
      
      <div className="clickable-section" onClick={handleClick}>
        <div className="title-container">
          <h1 className="touch-to-start">TOUCH TO START</h1>
          <h2 className="sub-title">CHẠM ĐỂ BẮT ĐẦU CHỤP</h2>
        </div>

        <div className="info-boxes d-flex">
          {notes.map((note, index) => (
            <div className="info-box" key={index}>
              <p className="truncated-text text1">{note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="instruction-container">
        <div className="instruction-row">
          <div className="instruction-box">
            <div className="icon-heart">
              <i className="fas fa-heart"></i>
              <span className="heart-number">1</span>
            </div>
            <p>KHÔNG VỨT PHỤ KIỆN XUỐNG ĐẤT KHI CHỤP</p>
          </div>
          <div className="instruction-box">
            <div className="icon-heart">
              <i className="fas fa-heart"></i>
              <span className="heart-number">2</span>
            </div>
            <p>VUI LÒNG BỒI THƯỜNG KHI LÀM HỎNG</p>
          </div>
          <div className="instruction-box">
            <div className="icon-heart">
              <i className="fas fa-heart"></i>
              <span className="heart-number">3</span>
            </div>
            <p>GIÚP CHÚNG MÌNH ĐẶT LẠI PHỤ KIỆN LÊN KỆ NHÉ</p>
          </div>
        </div>
        <h5 className="btn-thank-you">CHÚNG MÌNH XIN CẢM ƠN</h5>
      </div>

      {/* Nút mở chatbot */}
      <button
        className="floating-chat-btn"
        onClick={() => setIsChatOpen(true)}
        aria-label="Hỗ trợ AI"
      >
        💬
      </button>

      {/* Component chatbot */}
      <Chatbot 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </div>
  );
}

export default Appclien;