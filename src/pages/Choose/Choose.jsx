import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Chatbot from '../../components/Chatbot';
import './Choose.css';

const Choose = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Nhận dữ liệu từ qr.jsx (bao gồm compositeImage, qrImage và qrGif nếu có)
  const { compositeImage, qrImage, size, cut } = location.state || {};

  // State cho countdown và chuyển trang tự động
  const [countdown, setCountdown] = useState(50);
  const [autoTriggered, setAutoTriggered] = useState(false);
  // State cho trạng thái in
  const [printStatus, setPrintStatus] = useState(null);

  // Ref để đảm bảo in chỉ gọi 1 lần
  const printTriggeredRef = useRef(false);

  // ✅ Áp dụng background từ localStorage nếu có
  useEffect(() => {
    const savedBackground = localStorage.getItem('backgroundImage');
    if (savedBackground) {
      document.body.style.backgroundImage = `url(${savedBackground})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
    }

    // Cleanup khi rời khỏi trang
    return () => {
      document.body.style.backgroundImage = 'none';
    };
  }, []);
  // Giảm countdown mỗi giây
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Khi countdown về 0, tự động gọi handleFinish
  useEffect(() => {
    if (countdown === 0 && !autoTriggered) {
      setAutoTriggered(true);
      handleFinish();
    }
  }, [countdown, autoTriggered]);

  // Effect in ảnh chỉ 1 lần
  useEffect(() => {
    // Nếu đã in hoặc thiếu dữ liệu, không thực hiện
    if (printTriggeredRef.current) return;
    if (!compositeImage || !size || cut == null) {
      setPrintStatus('Thiếu thông tin để in');
      return;
    }

    // Đánh dấu đã thực hiện in
    printTriggeredRef.current = true;

    // Thiết lập in
    const printer = 'HiTi P525L';
    const orientation = [3].includes(parseInt(cut)) ? 'Landscape' : 'Portrait';
    const copies = size;
    const paper = [3, 41].includes(parseInt(cut)) ? '6x4-Split (6x2 2 prints)' : '6x4/152×100mm';

    setPrintStatus('Đang chuẩn bị in...');

    try {
      const ws = new WebSocket('ws://localhost:8088');
      ws.onopen = () => {
        console.log('Kết nối WebSocket thành công');
        ws.send(JSON.stringify({
          type: 'print-request',
          data: { image: compositeImage, printer, orientation, copies, paper }
        }));
        setPrintStatus('Đã gửi yêu cầu in');
      };
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'print-complete') {
          setPrintStatus('In thành công');
        } else if (message.type === 'print-error') {
          setPrintStatus('Lỗi in: ' + message.error);
        }
      };
      ws.onerror = (error) => {
        console.error('Lỗi WebSocket:', error);
        setPrintStatus('Lỗi kết nối: Không thể gửi yêu cầu in');
      };
    } catch (error) {
      console.error('Lỗi khi gửi yêu cầu in:', error);
      setPrintStatus('Lỗi: ' + error.message);
    }
  }, [compositeImage, size, cut]);

  // Khi nhấn nút "KẾT THÚC", chuyển về trang chính
  const handleFinish = () => {
    navigate('/Download');
  };

  // Thử in lại nếu có lỗi
  const handleRetryPrint = () => {
    printTriggeredRef.current = false;
    setPrintStatus('Đang thử in lại...');
  };

  return (
    <div className="choose-container">
      <h1 className="touch-to-crecuts pt-5">Ảnh đang được in</h1>
      <div className='countdown'>
        ⌛: {countdown}
      </div>
      {printStatus && (
        <div style={{
          position: 'absolute', top: '50px', left: '10px',
          fontSize: '16px', background: '#fff', padding: '5px',
          borderRadius: '5px', zIndex: 1000
        }}>
          {printStatus}
          {printStatus.includes('Lỗi') && (
            <button onClick={handleRetryPrint} style={{
              marginLeft: '10px', padding: '3px 8px',
              background: '#4CAF50', color: 'white', border: 'none',
              borderRadius: '3px', cursor: 'pointer'
            }}>Thử lại</button>
          )}
        </div>
      )}
      <div className="choose-image-row">
        {qrImage ? (
          <>
            <img src={compositeImage} alt="Ảnh chính" className="choose-left" />
            <div className="choose-middle mx-5">
              <img src={qrImage} alt="QR Code cho ảnh" />
              <div className="qr-label">QR Code Ảnh</div>
            </div>
          </>
        ) : (
          <img src={compositeImage} alt="Ảnh chính" className="choose-centered" />
        )}
      </div>
      <div className="d-flex justify-content-center">
        <button className="continue-btn" onClick={handleFinish}>Đánh Giá</button>
      </div>
      <Chatbot />
    </div>

  );
};

export default Choose;
