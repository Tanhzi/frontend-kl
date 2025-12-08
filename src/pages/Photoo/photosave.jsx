import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Photo.css';

function Photo() {
  const id_admin = localStorage.getItem('id_admin');
  const [countdown, setCountdown] = useState(5);
  const [photoIndex, setPhotoIndex] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [flash, setFlash] = useState(false);
  const [isMirror, setIsMirror] = useState(false);
  const [initialTime, setInitialTime] = useState(5);
  const [subsequentTime, setSubsequentTime] = useState(8);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // Lấy state từ App.jsx
  const location = useLocation();
  const { size, cut } = location.state || {};

  const streamRef = useRef(null);
  
  // Tính tỉ lệ hiển thị dựa trên loại cắt (cut)
  const getAspectRatio = () => {
    const cutValue = Number(cut);
    const ratioMap = {
      3: 276 / 220 , // ~ 1.27:1
      41: 276 / 190, // ~ 1.48:1
      42: 260 / 330, // ~ 0.73:1
      6: 280 / 240,  // ~ 1.17:1
    };
    return ratioMap[cutValue] || 1; // Mặc định 1:1 nếu không tìm thấy
  };

  // Tính width tương ứng để giữ đúng tỉ lệ với height, nhưng có giới hạn tối đa
  const getVideoContainerStyle = () => {
    const aspectRatio = getAspectRatio();
    const baseHeight = '80vh';
    // Tính width dựa trên aspectRatio và height
    const width = `calc(80vh * ${aspectRatio})`;
    
    return {
      height: baseHeight,
      width: width,
      maxWidth: '60vw', // Thêm giới hạn tối đa cho chiều rộng
      overflow: 'hidden',
      position: 'relative',
      margin: '0 auto'
    };
  };

  // Lấy cấu hình từ backend (PHP)
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/get_photo.php?id_admin=${id_admin}`)
      .then(res => res.json())
      .then(data => {
        // Cập nhật thời gian chụp ảnh đầu và sau theo dữ liệu từ PHP
        setInitialTime(data.time1);
        setSubsequentTime(data.time2);
        // Cập nhật chế độ mirror (0: tắt, 1: bật)
        setIsMirror(data.mirror === 1);
      })
      .catch(err => console.error('Lỗi khi lấy cấu hình:', err));
  }, [id_admin]);

  // Hàm thiết lập stream từ camera chính (mặc định)
  useEffect(() => {
    let isMounted = true;
    
    const setupCamera = async () => {
      try {
        // Yêu cầu truy cập camera chính của máy với facingMode là 'user'
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        });
        if (isMounted) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        }
      } catch (err) {
        console.error('Lỗi khi truy cập camera với facingMode "user":', err);
        // Nếu gặp lỗi, thử fallback sang cấu hình mặc định
        try {
          const backupStream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (isMounted) {
            streamRef.current = backupStream;
            if (videoRef.current) {
              videoRef.current.srcObject = backupStream;
              videoRef.current.play();
            }
          }
        } catch (error) {
          console.error('Không thể truy cập camera:', error);
        }
      }
    };

    setupCamera();

    const handleBeforeUnload = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isMounted = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        console.log('Đã ngắt kết nối camera');
      }
    };
  }, []);

  // Tự động chụp ảnh theo thời gian cấu hình
  useEffect(() => {
    if (photoIndex > 8) {
      navigate('/Selphoto', { state: { photos, size, cut } });
      return;
    }
    // Ảnh thứ 1 sử dụng initialTime, các ảnh thứ 2-8 sử dụng subsequentTime
    const currentTime = photoIndex === 1 ? initialTime : subsequentTime;
    setCountdown(currentTime);
    const captureTimer = setTimeout(() => {
      handleTakePhoto();
    }, currentTime * 1000);

    return () => clearTimeout(captureTimer);
  }, [photoIndex, navigate, photos, size, cut, initialTime, subsequentTime]);

  // Đồng hồ đếm ngược
  useEffect(() => {
    if (photoIndex > 8) return;
    const interval = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [photoIndex]);

  const handleTakePhoto = () => {
    if (!streamRef.current || photoIndex > 8) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const video = videoRef.current;
    
    // Lấy kích thước gốc của video
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    // Xác định tỷ lệ chiều rộng/chiều cao cho từng loại cut
    const ratioMap = {
      3: 276 / 220,
      41: 276 / 195,
      42: 260 / 330,
      6: 280 / 240
    };
    const cutValue = Number(cut);
    let finalWidth, finalHeight;
    
    if (ratioMap[cutValue]) {
      // Tính toán kích thước ảnh cuối cùng dựa trên tỷ lệ
      const aspectRatio = ratioMap[cutValue];
      
      // Ưu tiên chiều cao tối đa
      finalHeight = videoHeight;
      finalWidth = videoHeight * aspectRatio;
      
      // Nếu chiều rộng vượt quá, điều chỉnh lại
      if (finalWidth > videoWidth) {
        finalWidth = videoWidth;
        finalHeight = videoWidth / aspectRatio;
      }
    } else {
      finalWidth = videoWidth;
      finalHeight = videoHeight;
    }
    
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    
    // Tính toán vùng crop ở giữa
    const cropX = Math.max((videoWidth - finalWidth) / 2, 0);
    const cropY = Math.max((videoHeight - finalHeight) / 2, 0);
    
    context.clearRect(0, 0, finalWidth, finalHeight);
    context.save();
    
    // Nếu bật chế độ mirror, lật ảnh ngang
    if (isMirror) {
      context.translate(finalWidth, 0);
      context.scale(-1, 1);
    }
    
    context.drawImage(
      video,
      cropX,
      cropY,
      finalWidth,
      finalHeight,
      0,
      0,
      finalWidth,
      finalHeight
    );
    
    context.restore();
    
    const dataUrl = canvas.toDataURL('image/png');
    console.log(`Ảnh ${photoIndex} đã chụp:`, dataUrl);
    
    setPhotos(prev => [...prev, dataUrl]);
    setPhotoIndex(prev => prev + 1);
    
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
  };

  return (
    <div className="container-fluid vh-100">
      {/* Sử dụng wrapper để giữ nguyên bố cục */}
      <div className="d-flex align-items-center justify-content-center h-100">
        <div className="row flex-nowrap w-100">
          {/* Hiển thị số ảnh - giữ cố định width */}
          <div className="col-auto d-flex align-items-center justify-content-center" style={{ width: '150px', minWidth: '150px' }}>
            <button className="photo-counter">
              {photoIndex <= 8 ? `${photoIndex}/8 Ảnh` : 'Chụp xong!'}
            </button>
          </div>

          {/* Phần camera - cho phép co giãn nhưng có giới hạn */}
          <div 
            className="col mx-2"
            style={{
              display: 'flex',
              alignItems: 'center', 
              justifyContent: 'center',
              minWidth: '300px'
            }}
          >
            <div className="position-relative" style={getVideoContainerStyle()}>
              <video
                ref={videoRef}
                className="video-stream"
                style={{
                  width: '100%',
                  height: '100%',
                  transform: isMirror ? 'scaleX(-1)' : 'none',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
              <canvas ref={canvasRef} className="d-none" />
              {flash && <div className="flash-overlay" />}
            </div>
          </div>

          {/* Đồng hồ đếm ngược - giữ cố định width */}
          <div className="col-auto d-flex align-items-center justify-content-center" style={{ width: '150px', minWidth: '150px' }}>
            <div className="countdown-clock">
              <div className="clock-icon">
                <i className="fas fa-clock"></i>
              </div>
              <span className="countdown-number">{countdown}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Photo;