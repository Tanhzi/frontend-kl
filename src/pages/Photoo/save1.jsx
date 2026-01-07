import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Photo.css';
import Chatbot from '../../components/Chatbot';
import { useCountdown } from "../../contexts/CountdownContext";

function Photo() {
  // --- 1. CONFIG & STATE ---
  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const [auth] = useState(getAuth());
  const { id_admin } = auth || {};

  const [countdown2, setCountdown] = useState(5);
  const [photoIndex, setPhotoIndex] = useState(1);
  const [photos, setPhotos] = useState([]); // Lưu dạng Blob URL để nhẹ DOM
  const [flash, setFlash] = useState(false);
  const [isMirror, setIsMirror] = useState(false); // Mirror preview
  
  // Settings thời gian
  const [initialTime, setInitialTime] = useState(5);
  const [subsequentTime, setSubsequentTime] = useState(8);
  
  const [isStarted, setIsStarted] = useState(true);
  const [maxPhotos, setMaxPhotos] = useState(8);
  const [isRetaking, setIsRetaking] = useState(false);
  const [retakeIndex, setRetakeIndex] = useState(null);
  
  // State phục vụ Retake
  const [currentPhotosState, setCurrentPhotosState] = useState([]);
  const [currentSelectedSlotsState, setCurrentSelectedSlotsState] = useState([]);
  const [currentAppliedFiltersState, setCurrentAppliedFiltersState] = useState({});

  const [previewCrop, setPreviewCrop] = useState(null);
  const photosContainerRef = useRef(null);

  // Refs phần cứng
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const imageCaptureRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  
  // Lấy dữ liệu từ trang trước
  const {
    size, cut, selectedFrame, selectedFrameId, price,
    retakeIndex: incomingRetakeIndex,
    currentPhotos: incomingCurrentPhotos,
    currentSelectedSlots: incomingCurrentSelectedSlots,
    currentAppliedFilters: incomingCurrentAppliedFilters
  } = location.state || {};

  // --- 2. HELPER FUNCTIONS ---

  // Chuyển Blob sang Base64 (Dùng khi cần lưu/gửi đi)
  const blobToDataURL = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const getMaxPhotos = (cutValue) => {
    const cutNum = Number(cutValue);
    if (cutNum === 3) return 3;
    if (cutNum === 41 || cutNum === 42) return 4;
    if (cutNum === 6) return 6;
    return 8;
  };

  const { formattedCountdown, countdown } = useCountdown();

  // --- 3. EFFECTS: NAVIGATION & INIT ---

  useEffect(() => {
    if (countdown === 0) navigate('/Appclien');
  }, [countdown, navigate]);

  // Thiết lập số lượng ảnh và trạng thái Retake
  useEffect(() => {
    if (incomingRetakeIndex !== undefined && incomingCurrentPhotos) {
      setIsRetaking(true);
      setRetakeIndex(incomingRetakeIndex);
      setCurrentPhotosState(incomingCurrentPhotos);
      setCurrentSelectedSlotsState(incomingCurrentSelectedSlots || []);
      setCurrentAppliedFiltersState(incomingCurrentAppliedFilters || {});
      setPhotos([]);
      setPhotoIndex(1);
      setMaxPhotos(1);
      setIsStarted(true);
    } else {
      setIsRetaking(false);
      setRetakeIndex(null);
      setCurrentPhotosState([]);
      setCurrentSelectedSlotsState([]);
      setCurrentAppliedFiltersState({});
      setMaxPhotos(getMaxPhotos(cut));
      setPhotos([]);
      setPhotoIndex(1);
      setIsStarted(false);
    }
  }, [incomingRetakeIndex, incomingCurrentPhotos, cut]);

  // Lấy cấu hình từ Server (Time & Mirror)
  useEffect(() => {
    if (!id_admin) return;
    fetch(`${import.meta.env.VITE_API_BASE_URL}/camera/basic?id_admin=${id_admin}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data) return;
        setInitialTime(Number(data.time1) || 5);
        setSubsequentTime(Number(data.time2) || 8);
        // Lưu ý: Mirror ở đây chỉ nên áp dụng cho Preview (người dùng nhìn thấy).
        // Ảnh chụp ra thường nên là ảnh thuận (không mirror) trừ khi khách yêu cầu.
        setIsMirror(Number(data.mirror) === 1);
      })
      .catch((err) => console.error('Lỗi lấy cấu hình:', err));
  }, [id_admin]);

  // --- 4. CAMERA SETUP (OPTIMIZED) ---
  
  useEffect(() => {
    let mounted = true;

    const setupCamera = async () => {
      try {
        // Ưu tiên 4K -> 2K -> FHD
        const constraints = {
          audio: false,
          video: {
            facingMode: 'user',
            width: { ideal: 3840 },
            height: { ideal: 2160 },
            frameRate: { ideal: 30 },
          },
        };

        let stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!mounted) return;
        streamRef.current = stream;

        // Cấu hình ImageCapture và Advanced Settings
        const track = stream.getVideoTracks()[0];
        if (track) {
          const settings = track.getSettings();
          console.log(`📸 Camera Active: ${settings.width}x${settings.height}`);
          
          if ('ImageCapture' in window) {
            imageCaptureRef.current = new window.ImageCapture(track);
          }

          // TỐI ƯU THÊM: Cố gắng tắt tự động điều chỉnh ánh sáng nếu bị nháy
          // (Chỉ hoạt động với camera hỗ trợ)
          try {
            const capabilities = track.getCapabilities();
            const advancedConstraints = {};
            if (capabilities.whiteBalanceMode && capabilities.whiteBalanceMode.includes('continuous')) {
               advancedConstraints.whiteBalanceMode = 'continuous';
            }
            if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
               advancedConstraints.exposureMode = 'continuous';
            }
            if (Object.keys(advancedConstraints).length > 0) {
              await track.applyConstraints({ advanced: [advancedConstraints] });
            }
          } catch (e) {
            console.warn('Không thể set advanced constraints', e);
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(e => console.log("Play error:", e));
            updatePreviewCrop();
          };
        }
      } catch (err) {
        console.error('Lỗi camera chính, thử fallback:', err);
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1920 }, height: { ideal: 1080 } } 
          });
          if (!mounted) return;
          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.play();
          }
        } catch (e2) {
          console.error('Không thể mở camera:', e2);
        }
      }
    };

    setupCamera();

    const cleanup = () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      imageCaptureRef.current = null;
    };

    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, [cut]);

  // --- 5. CROP LOGIC ---

  const getCropDimensions = (cutValue, videoWidth, videoHeight) => {
    const cutNum = Number(cutValue);
    let targetAspectRatio = 1;

    switch (cutNum) {
      case 3: targetAspectRatio = 276 / 220; break;
      case 41: targetAspectRatio = 276 / 195; break;
      case 42: targetAspectRatio = 260 / 330; break;
      case 6: targetAspectRatio = 280 / 240; break;
      default: targetAspectRatio = 1;
    }

    const videoAR = videoWidth / videoHeight;
    let w, h, x, y;

    if (videoAR > targetAspectRatio) {
      h = videoHeight;
      w = Math.round(h * targetAspectRatio);
      x = Math.round((videoWidth - w) / 2);
      y = 0;
    } else {
      w = videoWidth;
      h = Math.round(w / targetAspectRatio);
      x = 0;
      y = Math.round((videoHeight - h) / 2);
    }
    return { cropWidth: w, cropHeight: h, cropX: x, cropY: y };
  };

  const updatePreviewCrop = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const { cropWidth, cropHeight, cropX, cropY } = getCropDimensions(cut, video.videoWidth, video.videoHeight);
    
    // Tính toán hiển thị khung crop trên màn hình (CSS calculation)
    // Giữ nguyên logic tính toán hiển thị của bạn ở đây vì nó phụ thuộc vào CSS layout
    const containerW = window.innerWidth;
    const containerH = window.innerHeight;
    const videoAR = video.videoWidth / video.videoHeight;
    const containerAR = containerW / containerH;
    
    let displayW, displayH, offX, offY;
    
    if (videoAR > containerAR) {
        displayW = containerW;
        displayH = containerW / videoAR;
        offX = 0;
        offY = (containerH - displayH) / 2;
    } else {
        displayH = containerH;
        displayW = containerH * videoAR;
        offY = 0;
        offX = (containerW - displayW) / 2;
    }
    
    const scaleX = displayW / video.videoWidth;
    const scaleY = displayH / video.videoHeight;
    
    setPreviewCrop({
      x: offX + cropX * scaleX,
      y: offY + cropY * scaleY,
      width: cropWidth * scaleX,
      height: cropHeight * scaleY
    });
  };

  // --- 6. SHOOTING LOGIC ---

  // Xử lý chuyển trang sau khi chụp xong
  useEffect(() => {
    if (!isStarted) return;

    if (photoIndex > maxPhotos) {
      setTimeout(() => {
        // Logic điều hướng giữ nguyên như cũ
        const finalPhotos = photos; // Ở đây photos là mảng dataUrl
        
        if (isRetaking) {
          const newPhoto = finalPhotos[0];
          const updatedPhotos = [...currentPhotosState];
          updatedPhotos[retakeIndex] = newPhoto;
          
          const updatedSlots = [...currentSelectedSlotsState];
          if (updatedSlots[retakeIndex]) {
            updatedSlots[retakeIndex] = { ...updatedSlots[retakeIndex], photo: newPhoto, flip: false };
          }
          
          const updatedFilters = { ...currentAppliedFiltersState };
          updatedFilters[retakeIndex] = 'original';

          navigate('/Selphoto', {
            state: {
              photos: updatedPhotos,
              selectedSlots: updatedSlots,
              appliedFilters: updatedFilters,
              size, cut, selectedFrame, selectedFrameId, price
            },
          });
        } else {
          const initialSlots = finalPhotos.map(p => ({ photo: p, flip: false }));
          const initialFilters = {};
          finalPhotos.forEach((_, i) => initialFilters[i] = 'original');
          
          navigate('/Selphoto', {
            state: {
              photos: finalPhotos,
              selectedSlots: initialSlots,
              appliedFilters: initialFilters,
              size, cut, selectedFrame, selectedFrameId, price
            },
          });
        }
      }, 1500);
      return;
    }

    // Đếm ngược chụp
    const currentTime = photoIndex === 1 ? initialTime : subsequentTime;
    setCountdown(currentTime);
    const timer = setTimeout(() => handleTakePhoto(), currentTime * 1000);
    return () => clearTimeout(timer);
  }, [photoIndex, isStarted, maxPhotos, initialTime, subsequentTime, photos]); // Dependencies tối giản

  // Đếm ngược UI
  useEffect(() => {
    if (!isStarted || photoIndex > maxPhotos) return;
    const interval = setInterval(() => {
      setCountdown(p => (p > 0 ? p - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isStarted, photoIndex, maxPhotos]);


  const handleTakePhoto = async () => {
    if (!videoRef.current || photoIndex > maxPhotos) return;

    const video = videoRef.current;
    const vW = video.videoWidth;
    const vH = video.videoHeight;

    if (!vW || !vH) return;

    const { cropWidth, cropHeight, cropX, cropY } = getCropDimensions(cut, vW, vH);
    
    const canvas = canvasRef.current;
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext('2d');

    // Tối ưu chất lượng vẽ
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.clearRect(0, 0, cropWidth, cropHeight);
    ctx.save();

    // Xử lý Mirror (Lưu ý: Nếu muốn ảnh in ra đúng chiều chữ thì KHÔNG nên mirror ở đây, 
    // trừ khi isMirror thực sự ám chỉ việc lật ảnh đầu ra)
    if (isMirror) {
      ctx.translate(cropWidth, 0);
      ctx.scale(-1, 1);
    }

    try {
      // Cách 1: Dùng ImageCapture (Chất lượng cao nhất)
      if (imageCaptureRef.current) {
        const blob = await imageCaptureRef.current.takePhoto();
        const imgBitmap = await createImageBitmap(blob); // Hiệu năng tốt hơn new Image()
        
        const scaleX = imgBitmap.width / vW;
        const scaleY = imgBitmap.height / vH;

        ctx.drawImage(
          imgBitmap,
          cropX * scaleX, cropY * scaleY,
          cropWidth * scaleX, cropHeight * scaleY,
          0, 0,
          cropWidth, cropHeight
        );
        imgBitmap.close(); // Giải phóng bộ nhớ
      } 
      // Cách 2: Fallback chụp từ video feed
      else {
        ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      }
    } catch (err) {
      console.warn("Lỗi chụp ảnh, fallback video:", err);
      ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    }
    
    ctx.restore();

    // Xuất ảnh JPEG Quality 1.0 (Tốt nhất)
    // Nếu muốn nhẹ hơn có thể để 0.95
    const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
    
    // Play sound (nếu có file âm thanh)
    // const audio = new Audio('/shutter.mp3'); audio.play();

    applyCapturedPhoto(dataUrl);
  };

  const applyCapturedPhoto = (dataUrl) => {
    setPhotos(prev => [...prev, dataUrl]);
    setPhotoIndex(prev => prev + 1);
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    
    // Auto scroll
    setTimeout(() => {
      photosContainerRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 50);
  };

  const handleScreenClick = () => {
    if (!isStarted) setIsStarted(true);
  };

  return (
    <div className="photo-container" onClick={handleScreenClick}>
      <video
        ref={videoRef}
        className={`video-stream-fullscreen ${isMirror ? 'video-mirror' : ''}`}
        playsInline muted autoPlay
      />
      
      <div className="countdown">⌛: {formattedCountdown}</div>
      <canvas ref={canvasRef} className="d-none" />

      {/* Mask Overlay */}
      {previewCrop && (
        <div className="crop-mask-overlay">
             {/* ... Giữ nguyên phần render mask của bạn ... */}
             {/* Để ngắn gọn tôi không paste lại phần div mask-bar, dùng lại logic cũ là ổn */}
             <div className="crop-outline"
                style={{
                  left: `${previewCrop.x}px`, top: `${previewCrop.y}px`,
                  width: `${previewCrop.width}px`, height: `${previewCrop.height}px`,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)'
                }}
             />
        </div>
      )}

      {flash && <div className="flash-overlay-fullscreen" />}

      {!isStarted && (
        <div className="camera-icon-overlay">
          <div className="camera-icon"><i className="fas fa-camera" /><p>Chạm màn hình để bắt đầu</p></div>
        </div>
      )}

      {isStarted && photoIndex <= maxPhotos && (
        <div className="countdown-center">
          <div className="countdown-number-large">{countdown2}</div>
        </div>
      )}

      <div className="photo-counter-top-right">
        {photoIndex <= maxPhotos ? `${photoIndex}/${maxPhotos}` : 'Hoàn thành!'}
      </div>

      {photos.length > 0 && (
        <div className="captured-photos-column" ref={photosContainerRef}>
          <div className="captured-photos-title">Ảnh ({photos.length}/{maxPhotos})</div>
          {photos.map((p, i) => (
            <img key={i} src={p} alt={`pic-${i}`} className="captured-photo-item" />
          ))}
        </div>
      )}
      <Chatbot />
    </div>
  );
}

export default Photo;