// src/Appclien.jsx
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Chatbot from '../../components/Chatbot';
import Lottie from 'lottie-react';
import './Appclien.css';

function Appclien() {
  const navigate = useNavigate();
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [isGlobalBackground, setIsGlobalBackground] = useState(false);
  const [logoImage, setLogoImage] = useState('/logo.jpg'); // fallback local
  const [notes, setNotes] = useState([
    'Máy sẽ chụp tự động sau mỗi 10s',
    'Nếu là lần đầu đến với Memory booth\nHãy liên hệ nhân viên để được hỗ trợ',
    'Máy sẽ không trả lại tiền thừa, hãy liên hệ chúng mình để đổi tiền nhé!'
  ]);

  const [showWelcomeBot, setShowWelcomeBot] = useState(true);
  const [robotLottie, setRobotLottie] = useState(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);

  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const [auth, setAuth] = useState(getAuth());
  const { id, id_admin, id_topic } = auth || {};

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (!id) {
      navigate('/');
    }
  }, [id, navigate]);

  // Phím tắt đăng xuất
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

  // Load Lottie chào mừng
  useEffect(() => {
    fetch('/lotties/Robotsayshello.json')
      .then((res) => {
        if (!res.ok) throw new Error('Không tìm thấy file Lottie');
        return res.json();
      })
      .then((json) => setRobotLottie(json))
      .catch((err) => {
        console.error('Lỗi khi tải animation robot:', err);
        setShowWelcomeBot(false);
      });
  }, []);

  // Fullscreen logic
  const checkFullscreen = () => {
    const isFull = !!(document.fullscreenElement || 
      document.webkitFullscreenElement || 
      document.mozFullScreenElement || 
      document.msFullscreenElement);
    setIsFullscreen(isFull);
    setShowFullscreenPrompt(!isFull);
  };

  const requestFullscreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      checkFullscreen();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    checkFullscreen(); // Kiểm tra ban đầu

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

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

  // Xử lý ảnh background, logo, ghi chú từ dữ liệu sự kiện
  useEffect(() => {
    if (!eventData || eventData.status === 'error') return;

    // Background
    if (eventData.background) {
      const fullBgUrl = eventData.background.startsWith('http')
        ? eventData.background
        : `${eventData.background}`;
      setBackgroundImage(fullBgUrl);
      setIsGlobalBackground(eventData.ev_back === 2);
    } else {
      setBackgroundImage(null);
      setIsGlobalBackground(false);
    }

    // Logo
    if (eventData.logo && eventData.ev_logo === 1) {
      const fullLogoUrl = eventData.logo.startsWith('http')
        ? eventData.logo
        : `${eventData.logo}`;
      setLogoImage(fullLogoUrl);
    } else {
      setLogoImage('/logo.jpg');
    }

    // Notes
    if (eventData.notes && eventData.ev_note === 1) {
      setNotes([
        eventData.notes.note1 || '',
        eventData.notes.note2 || '',
        eventData.notes.note3 || '',
      ].filter(Boolean));
    }
  }, [eventData]);

  if (isLoading) {
    return <div className="app-container">Đang tải...</div>;
  }

  if (error) {
    console.error('Lỗi khi tải dữ liệu event:', error);
  }

  const handleClick = () => {
    navigate('/Crecuts');
  };

  return (
    <div 
      className="app-container" 
      style={backgroundImage ? { 
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: isGlobalBackground ? 'fixed' : 'scroll'
      } : {}}
    >
      {/* Nội dung chính chỉ hiển thị khi đã fullscreen */}
      {isFullscreen && (
        <>
          <div className="logo-container">
            <img 
              src={logoImage} 
              alt="Memory Booth Logo" 
              className="logo"
              onError={(e) => {
                e.target.src = '/logo.jpg';
              }}
            />
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

          <Chatbot />

          {showWelcomeBot && robotLottie && (
            <div
              className="welcome-bot-overlay"
              onClick={() => setShowWelcomeBot(false)}
            >
              <div className="welcome-bot-bubble-container">
                <div className="speech-bubble">
                  <p className="welcome-message">
                    Có gì thắc mắc nhấn vào icon ở góc dưới bên phải để hỏi mình nhé =))
                  </p>
                </div>
                <div className="robot-lottie-wrapper">
                  <Lottie
                    animationData={robotLottie}
                    loop
                    autoplay
                    style={{ width: '720px', height: '720px' }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Fullscreen prompt overlay */}
      {showFullscreenPrompt && !isFullscreen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            color: 'white',
            textAlign: 'center',
            fontSize: '20px',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          <div>
            <h2 style={{ margin: '0 0 16px', fontSize: '28px' }}>Vui lòng mở toàn màn hình</h2>
            <p style={{ margin: '0 0 20px', lineHeight: 1.5 }}>
              Ấn <strong>F11</strong> hoặc nhấn nút bên dưới để trải nghiệm tốt nhất.
            </p>
<button
  onClick={requestFullscreen}
  style={{
    padding: '12px 24px',
    fontSize: '18px',
    backgroundColor: '#e91e63',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  }}
>
  Mở toàn màn hình
</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appclien;