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
  const [isStarted, setIsStarted] = useState(false); // Trạng thái bắt đầu chụp
  const [lastCapturedPhoto, setLastCapturedPhoto] = useState(null); // Ảnh vừa chụp
  const [maxPhotos, setMaxPhotos] = useState(8); // Số ảnh tối đa dựa trên cut
  const [isRetaking, setIsRetaking] = useState(false); // Có đang chụp lại không
  const [retakeIndex, setRetakeIndex] = useState(null); // Vị trí ảnh cần chụp lại
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // Lấy state từ App.jsx hoặc SelPhoto.jsx
  const location = useLocation();
  const { size, cut, retakeIndex: retakeIdx, currentPhotos, selectedSlots } = location.state || {};

  const streamRef = useRef(null);
  
  // Tính số ảnh tối đa dựa trên cut
  const getMaxPhotos = (cutValue) => {
    const cutNum = Number(cutValue);
    if (cutNum === 3) return 3;
    if (cutNum === 41 || cutNum === 42) return 4;
    if (cutNum === 6) return 6;
    return 8; // Mặc định
  };

  // Khởi tạo state dựa trên việc có đang chụp lại hay không
  useEffect(() => {
    const maxPhotoCount = getMaxPhotos(cut);
    setMaxPhotos(maxPhotoCount);

    if (retakeIdx !== undefined && currentPhotos) {
      // Đang chụp lại ảnh cụ thể
      setIsRetaking(true);
      setRetakeIndex(retakeIdx);
      setPhotos([...currentPhotos]);
      setPhotoIndex(retakeIdx + 1); // Chỉ số ảnh cần chụp lại (1-based)
      setIsStarted(true); // Bắt đầu luôn khi chụp lại
    } else {
      // Chụp ảnh bình thường từ đầu
      setIsRetaking(false);
      setRetakeIndex(null);
      setPhotos([]);
      setPhotoIndex(1);
      setIsStarted(false);
    }
  }, [cut, retakeIdx, currentPhotos]);

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

  // Tự động chụp ảnh theo thời gian cấu hình (chỉ khi đã bắt đầu)
  useEffect(() => {
    if (!isStarted) return;

    if (isRetaking) {
      // Nếu đang chụp lại, chỉ chụp 1 ảnh rồi quay về SelPhoto
      if (photoIndex > retakeIndex + 1) {
        navigate('/Selphoto', { state: { photos, size, cut } });
        return;
      }
    } else {
      // Chụp bình thường, kiểm tra số ảnh tối đa
      if (photoIndex > maxPhotos) {
        navigate('/Selphoto', { state: { photos, size, cut } });
        return;
      }
    }
    
    // Ảnh thứ 1 sử dụng initialTime, các ảnh thứ 2+ sử dụng subsequentTime
    const currentTime = photoIndex === 1 ? initialTime : subsequentTime;
    setCountdown(currentTime);
    const captureTimer = setTimeout(() => {
      handleTakePhoto();
    }, currentTime * 1000);

    return () => clearTimeout(captureTimer);
  }, [photoIndex, navigate, photos, size, cut, initialTime, subsequentTime, isStarted, maxPhotos, isRetaking, retakeIndex]);

  // Đồng hồ đếm ngược (chỉ khi đã bắt đầu)
  useEffect(() => {
    if (!isStarted) return;
    
    let shouldCount = false;
    if (isRetaking) {
      shouldCount = photoIndex <= retakeIndex + 1;
    } else {
      shouldCount = photoIndex <= maxPhotos;
    }
    
    if (!shouldCount) return;
    
    const interval = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [photoIndex, isStarted, maxPhotos, isRetaking, retakeIndex]);

  const handleTakePhoto = () => {
    if (!streamRef.current) return;
    
    // Kiểm tra điều kiện dừng
    if (isRetaking && photoIndex > retakeIndex + 1) return;
    if (!isRetaking && photoIndex > maxPhotos) return;
    
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
    
    if (isRetaking) {
      // Thay thế ảnh tại vị trí retakeIndex
      const updatedPhotos = [...photos];
      updatedPhotos[retakeIndex] = dataUrl;
      setPhotos(updatedPhotos);
    } else {
      // Thêm ảnh mới vào cuối danh sách
      setPhotos(prev => [...prev, dataUrl]);
    }
    
    setLastCapturedPhoto(dataUrl); // Lưu ảnh vừa chụp
    setPhotoIndex(prev => prev + 1);
    
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
  };

  // Xử lý khi nhấn vào màn hình để bắt đầu chụp
  const handleScreenClick = () => {
    if (!isStarted) {
      setIsStarted(true);
    }
  };

  // Hiển thị số ảnh hiện tại
  const getCurrentPhotoDisplay = () => {
    if (isRetaking) {
      return `Chụp lại ảnh ${retakeIndex + 1}`;
    } else {
      if (photoIndex <= maxPhotos) {
        return `${photoIndex}/${maxPhotos}`;
      } else {
        return 'Hoàn thành!';
      }
    }
  };

  return (
    <div className="photo-container" onClick={handleScreenClick}>
      {/* Live view toàn màn hình */}
      <div className="live-view-fullscreen">
        <video
          ref={videoRef}
          className="video-stream-fullscreen"
          style={{
            width: '100vw',
            height: '100vh',
            transform: isMirror ? 'scaleX(-1)' : 'none',
            objectFit: 'cover',
            display: 'block'
          }}
        />
        <canvas ref={canvasRef} className="d-none" />
        {flash && <div className="flash-overlay-fullscreen" />}
      </div>

      {/* Icon camera ban đầu (hiển thị khi chưa bắt đầu) */}
      {!isStarted && (
        <div className="camera-icon-overlay">
          <div className="camera-icon">
            <i className="fas fa-camera" style={{ fontSize: '80px', color: 'white' }}></i>
            <p style={{ color: 'white', fontSize: '24px', marginTop: '20px' }}>
              {isRetaking ? 'Nhấn để chụp lại ảnh' : 'Nhấn vào màn hình để bắt đầu chụp'}
            </p>
          </div>
        </div>
      )}

      {/* Đếm số ở giữa màn hình (hiển thị khi đã bắt đầu) */}
      {isStarted && (
        (isRetaking ? photoIndex <= retakeIndex + 1 : photoIndex <= maxPhotos) && (
          <div className="countdown-center">
            <div className="countdown-number-large">{countdown}</div>
          </div>
        )
      )}

      {/* Số ảnh ở góc trên bên phải */}
      <div className="photo-counter-top-right">
        {getCurrentPhotoDisplay()}
      </div>

      {/* Hiển thị ảnh vừa chụp ở góc trên bên phải */}
      {lastCapturedPhoto && (
        <div className="last-photo-preview">
          <img 
            src={lastCapturedPhoto} 
            alt="Ảnh vừa chụp" 
            style={{
              width: '120px',
              height: '120px',
              objectFit: 'cover',
              borderRadius: '8px',
              border: '2px solid white'
            }}
          />
        </div>
      )}
    </div>
  );
}

export default Photo;

