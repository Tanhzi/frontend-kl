import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Photo.css';
import Chatbot from '../../components/Chatbot';
import { useCountdown } from "../../contexts/CountdownContext";

function Photo() {
  // Lấy thông tin từ auth
  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const [auth, setAuth] = useState(getAuth());
  const { id_admin } = auth || {};

  const [countdown2, setCountdown] = useState(5);
  const [photoIndex, setPhotoIndex] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [flash, setFlash] = useState(false);
  const [isMirror, setIsMirror] = useState(false);
  
  // Settings mặc định
  const [initialTime, setInitialTime] = useState(5);
  const [subsequentTime, setSubsequentTime] = useState(8);
  
  const [isStarted, setIsStarted] = useState(true);
  const [maxPhotos, setMaxPhotos] = useState(8);
  const [isRetaking, setIsRetaking] = useState(false);
  const [retakeIndex, setRetakeIndex] = useState(null);
  
  // Lưu state cũ để back về
  const [currentPhotosState, setCurrentPhotosState] = useState([]);
  const [currentSelectedSlotsState, setCurrentSelectedSlotsState] = useState([]);
  const [currentAppliedFiltersState, setCurrentAppliedFiltersState] = useState({});

  const [previewCrop, setPreviewCrop] = useState(null);
  const photosContainerRef = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const imageCaptureRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const {
    size,
    cut,
    id_admin: idAdmin,
    id_topic: idTopic,
    selectedFrame,
    selectedFrameId,
    price,
    retakeIndex: incomingRetakeIndex,
    currentPhotos: incomingCurrentPhotos,
    currentSelectedSlots: incomingCurrentSelectedSlots,
    currentAppliedFilters: incomingCurrentAppliedFilters
  } = location.state || {};

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

  useEffect(() => {
    if (countdown === 0) {
      navigate('/Appclien');
    }
  }, [countdown, navigate]);

  // === [OPTIMIZED] TÍNH TOÁN CẮT ẢNH CHUẨN XÁC ===
  const getCropDimensions = (cutValue, videoWidth, videoHeight) => {
    const cutNum = Number(cutValue);
    let targetAspectRatio;

    // Tỉ lệ chuẩn pixel dựa trên logic render ở SelPhoto
    // Đảm bảo ảnh cắt ra vừa khít khung, không bị méo
    switch (cutNum) {
      case 3:
        targetAspectRatio = 276 / 220; // ~1.25
        break;
      case 41:
        targetAspectRatio = 276 / 195; // ~1.41
        break;
      case 42:
        targetAspectRatio = 260 / 330; // ~0.78 (Khung dọc)
        break;
      case 6:
        targetAspectRatio = 280 / 240; // ~1.16
        break;
      default:
        targetAspectRatio = 1; // Mặc định vuông
    }

    const videoAspectRatio = videoWidth / videoHeight;
    let cropWidth, cropHeight, cropX, cropY;

    // Logic: Cắt giữ nguyên chiều lớn nhất có thể (Max Resolution Crop)
    if (videoAspectRatio > targetAspectRatio) {
      // Video bè hơn khung -> Giữ full chiều cao, cắt bớt chiều rộng
      cropHeight = videoHeight;
      cropWidth = Math.round(cropHeight * targetAspectRatio);
      cropX = Math.round((videoWidth - cropWidth) / 2);
      cropY = 0;
    } else {
      // Video cao hơn khung -> Giữ full chiều rộng, cắt bớt chiều cao
      cropWidth = videoWidth;
      cropHeight = Math.round(cropWidth / targetAspectRatio);
      cropX = 0;
      cropY = Math.round((videoHeight - cropHeight) / 2);
    }

    return { cropWidth, cropHeight, cropX, cropY };
  };

  // Cập nhật khung preview trên màn hình (chỉ để hiển thị cho user thấy vùng sẽ chụp)
  const updatePreviewCrop = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight || !cut) return;

    const { cropWidth, cropHeight, cropX, cropY } = getCropDimensions(
      cut,
      video.videoWidth,
      video.videoHeight
    );

    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    const videoAspectRatio = video.videoWidth / video.videoHeight;
    const containerAspectRatio = containerWidth / containerHeight;

    let displayWidth, displayHeight, offsetX, offsetY;

    if (videoAspectRatio > containerAspectRatio) {
      displayWidth = containerWidth;
      displayHeight = containerWidth / videoAspectRatio;
      offsetX = 0;
      offsetY = (containerHeight - displayHeight) / 2;
    } else {
      displayHeight = containerHeight;
      displayWidth = containerHeight * videoAspectRatio;
      offsetY = 0;
      offsetX = (containerWidth - displayWidth) / 2;
    }

    const scaleX = displayWidth / video.videoWidth;
    const scaleY = displayHeight / video.videoHeight;

    const visibleWidth = cropWidth * scaleX;
    const visibleHeight = cropHeight * scaleY;
    const visibleX = offsetX + cropX * scaleX;
    const visibleY = offsetY + cropY * scaleY;

    setPreviewCrop({
      x: visibleX,
      y: visibleY,
      width: visibleWidth,
      height: visibleHeight,
    });
  };

  useEffect(() => {
    // Logic xử lý Retake hoặc New Session
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
      const maxPhotoCount = getMaxPhotos(cut);
      setMaxPhotos(maxPhotoCount);
      setPhotos([]);
      setPhotoIndex(1);
      setIsStarted(false);
    }
  }, [incomingRetakeIndex, incomingCurrentPhotos, cut]);

  useEffect(() => {
    if (!id_admin) return;
    fetch(`${import.meta.env.VITE_API_BASE_URL}/camera/basic?id_admin=${id_admin}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data) return;
        setInitialTime(Number(data.time1) || 5);
        setSubsequentTime(Number(data.time2) || 8);
        setIsMirror(Number(data.mirror) === 1);
      })
      .catch((err) => console.error('Lỗi khi lấy cấu hình:', err));
  }, [id_admin]);

  useEffect(() => {
    let mounted = true;

    const setupCamera = async () => {
      try {
        // === [OPTIMIZED] YÊU CẦU ĐỘ PHÂN GIẢI CAO NHẤT (4K hoặc Full HD) ===
        const constraints = {
          audio: false,
          video: {
            facingMode: 'user',
            width: { ideal: 3840 }, // Thử xin 4K
            height: { ideal: 2160 },
            frameRate: { ideal: 30 },
          },
        };

        let stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!mounted) return;
        streamRef.current = stream;

        try {
          const track = stream.getVideoTracks()[0];
          // Kiểm tra xem camera thực tế cấp độ phân giải bao nhiêu
          const settings = track.getSettings();
          console.log(`Camera Resolution: ${settings.width}x${settings.height}`);

          if (track && 'ImageCapture' in window) {
            imageCaptureRef.current = new window.ImageCapture(track);
          } else {
            imageCaptureRef.current = null;
          }
        } catch (e) {
          imageCaptureRef.current = null;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          const handleLoaded = () => {
            videoRef.current.play().catch(() => {});
            updatePreviewCrop();
          };
          videoRef.current.addEventListener('loadedmetadata', handleLoaded, { once: true });
        }
      } catch (err) {
        console.error('Lỗi khi truy cập camera (High Res):', err);
        // Fallback về cấu hình thường nếu 4K fail
        try {
          const fallback = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1920 }, height: { ideal: 1080 } } 
          });
          if (!mounted) return;
          streamRef.current = fallback;
          if (videoRef.current) {
            videoRef.current.srcObject = fallback;
            videoRef.current.play().catch(() => {});
            videoRef.current.addEventListener('loadedmetadata', updatePreviewCrop, { once: true });
          }
        } catch (e2) {
          console.error('Không thể truy cập camera (Fallback):', e2);
        }
      }
    };

    setupCamera();

    const handleBeforeUnload = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      mounted = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      imageCaptureRef.current = null;
    };
  }, [cut]);

  useEffect(() => {
    if (!isStarted) return;

    if (photoIndex > maxPhotos) {
      setTimeout(() => {
        if (isRetaking) {
          const newPhoto = photos[0];
          const updatedPhotos = [...currentPhotosState];
          updatedPhotos[retakeIndex] = newPhoto;
          const updatedSlots = [...currentSelectedSlotsState];
          // Cập nhật slot với ảnh mới, reset flip về false
          if (updatedSlots[retakeIndex]) {
            updatedSlots[retakeIndex] = { ...updatedSlots[retakeIndex], photo: newPhoto, flip: false };
          }
          const updatedFilters = { ...currentAppliedFiltersState };
          // Reset filter về original cho ảnh vừa chụp lại
          updatedFilters[retakeIndex] = 'original'; 

          navigate('/Selphoto', {
            state: {
              photos: updatedPhotos,
              size,
              cut,
              selectedFrame: selectedFrame,
              selectedFrameId: selectedFrameId,
              price,
              selectedSlots: updatedSlots,
              appliedFilters: updatedFilters,
            },
          });
        } else {
          const initialSlots = photos.map((photo, i) => ({ photo, flip: false }));
          const initialFilters = {};
          photos.forEach((_, i) => {
            initialFilters[i] = 'original';
          });
          navigate('/Selphoto', {
            state: {
              photos,
              size,
              cut,
              selectedFrame,
              selectedFrameId,
              price,
              selectedSlots: initialSlots,
              appliedFilters: initialFilters,
            },
          });
        }
      }, 1500);
      return;
    }

    const currentTime = photoIndex === 1 ? initialTime : subsequentTime;
    setCountdown(currentTime);
    const timer = setTimeout(() => {
      handleTakePhoto();
    }, currentTime * 1000);

    return () => clearTimeout(timer);
  }, [photoIndex, isStarted, maxPhotos, initialTime, subsequentTime, photos, navigate, size, cut, selectedFrame, selectedFrameId, price, isRetaking, retakeIndex]);

  useEffect(() => {
    if (!isStarted) return;
    if (photoIndex <= maxPhotos) {
      const interval = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isStarted, photoIndex, maxPhotos]);

  const handleTakePhoto = async () => {
    if (!streamRef.current || !videoRef.current) return;
    if (photoIndex > maxPhotos) return;

    const video = videoRef.current;
    let videoWidth = video.videoWidth;
    let videoHeight = video.videoHeight;

    if (!videoWidth || !videoHeight) {
      await new Promise((resolve) => {
        const onLoaded = () => {
          videoWidth = video.videoWidth;
          videoHeight = video.videoHeight;
          resolve();
        };
        video.addEventListener('loadedmetadata', onLoaded, { once: true });
        setTimeout(resolve, 500);
      });
    }

    // Lấy kích thước Crop dựa trên độ phân giải GỐC của Video
    const { cropWidth, cropHeight, cropX, cropY } = getCropDimensions(cut, videoWidth, videoHeight);

    const canvas = canvasRef.current;
    // Đặt kích thước canvas bằng đúng kích thước Crop Gốc (Rất lớn)
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext('2d');

    // === [OPTIMIZED] TĂNG CHẤT LƯỢNG VẼ CANVAS ===
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.clearRect(0, 0, cropWidth, cropHeight);
    ctx.save();

    if (isMirror) {
      ctx.translate(cropWidth, 0);
      ctx.scale(-1, 1);
    }

    // Ưu tiên dùng ImageCapture để chụp ảnh tĩnh độ nét cao
    if (imageCaptureRef.current) {
      try {
        const blob = await imageCaptureRef.current.takePhoto();
        const img = new Image();
        const imgDataUrl = await blobToDataURL(blob);

        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = imgDataUrl;
        });

        const scaleX = img.width / videoWidth;
        const scaleY = img.height / videoHeight;

        ctx.drawImage(
          img,
          cropX * scaleX, // Scale crop coordinates to match photo resolution
          cropY * scaleY,
          cropWidth * scaleX,
          cropHeight * scaleY,
          0,
          0,
          cropWidth,
          cropHeight
        );
        ctx.restore();

        // === [OPTIMIZED] XUẤT ẢNH JPEG CHẤT LƯỢNG 100% ===
        canvas.toBlob(async (croppedBlob) => {
          if (!croppedBlob) return;
          const croppedDataUrl = await blobToDataURL(croppedBlob);
          applyCapturedPhoto(croppedDataUrl);
        }, 'image/jpeg', 1.0); // 1.0 = Max Quality
        return;
      } catch (err) {
        console.warn('ImageCapture lỗi, dùng fallback canvas:', err);
      }
    }

    // Fallback: Chụp trực tiếp từ thẻ Video (Vẫn nét nếu stream 4K)
    ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    ctx.restore();

    // === [OPTIMIZED] XUẤT ẢNH JPEG CHẤT LƯỢNG 100% ===
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const dataUrl = await blobToDataURL(blob);
        applyCapturedPhoto(dataUrl);
      } catch (e) {
        console.error('Lỗi chuyển blob->dataURL:', e);
      }
    }, 'image/jpeg', 1.0); // 1.0 = Max Quality
  };

  const applyCapturedPhoto = (dataUrl) => {
    setPhotos((prev) => [...prev, dataUrl]);
    setPhotoIndex((prev) => prev + 1);
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    setTimeout(() => {
      if (photosContainerRef.current && photosContainerRef.current.lastElementChild) {
        photosContainerRef.current.lastElementChild.scrollIntoView({
          behavior: 'smooth',
          block: 'end'
        });
      }
    }, 50);
  };

  const handleScreenClick = () => {
    if (!isStarted) setIsStarted(true);
  };

  const getCurrentPhotoDisplay = () => {
    if (photoIndex <= maxPhotos) return `${photoIndex}/${maxPhotos}`;
    return 'Hoàn thành!';
  };

  return (
    <div className="photo-container" onClick={handleScreenClick}>
      <video
        ref={videoRef}
        className={`video-stream-fullscreen ${isMirror ? 'video-mirror' : ''}`}
        playsInline
        muted
        autoPlay
      />
      <div className="countdown">
        ⌛: {formattedCountdown}
      </div>

      <canvas ref={canvasRef} className="d-none" />

      {/* Hiển thị vùng đen che mờ (Mask) để user biết vùng nào sẽ được lấy */}
      {previewCrop && (
        <div className="crop-mask-overlay">
          <div className="mask-bar" style={{ top: 0, left: 0, right: 0, height: `${previewCrop.y}px` }} />
          <div className="mask-bar" style={{ bottom: 0, left: 0, right: 0, height: `${window.innerHeight - (previewCrop.y + previewCrop.height)}px` }} />
          <div className="mask-bar" style={{ top: `${previewCrop.y}px`, left: 0, width: `${previewCrop.x}px`, height: `${previewCrop.height}px` }} />
          <div className="mask-bar" style={{ top: `${previewCrop.y}px`, right: 0, width: `${window.innerWidth - (previewCrop.x + previewCrop.width)}px`, height: `${previewCrop.height}px` }} />
          
          <div
            className="crop-outline"
            style={{
              left: `${previewCrop.x}px`,
              top: `${previewCrop.y}px`,
              width: `${previewCrop.width}px`,
              height: `${previewCrop.height}px`,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)' // Làm tối vùng ngoài
            }}
          />
        </div>
      )}

      {flash && <div className="flash-overlay-fullscreen" />}

      {!isStarted ? (
        <div className="camera-icon-overlay">
          <div className="camera-icon">
            <i className="fas fa-camera" />
            <p>Nhấn vào màn hình để bắt đầu chụp</p>
          </div>
        </div>
      ) : null}

      {isStarted && photoIndex <= maxPhotos && (
        <div className="countdown-center">
          <div className="countdown-number-large">{countdown2}</div>
        </div>
      )}

      <div className="photo-counter-top-right">{getCurrentPhotoDisplay()}</div>

      {photos.length > 0 && (
        <div className="captured-photos-column" ref={photosContainerRef}>
          <div className="captured-photos-title">Ảnh đã chụp ({photos.length}/{maxPhotos})</div>
          {photos.map((photo, index) => (
            <img
              key={index}
              src={photo}
              alt={`Ảnh ${index + 1}`}
              className="captured-photo-item"
            />
          ))}
        </div>
      )}
      <Chatbot />
    </div>
  );
}

export default Photo;