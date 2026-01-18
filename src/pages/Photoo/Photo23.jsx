import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Photo.css';
import Chatbot from '../../components/Chatbot';
import { useCountdown } from "../../contexts/CountdownContext";

function Photo() {
  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const [auth, setAuth] = useState(getAuth());
  const { id_admin } = auth || {};

  const [shootCountdown, setShootCountdown] = useState(0); // đếm ngược trước mỗi lần chụp
  const [photoIndex, setPhotoIndex] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [flash, setFlash] = useState(false);
  const [isMirror, setIsMirror] = useState(false);
  
  const [initialTime, setInitialTime] = useState(5);
  const [subsequentTime, setSubsequentTime] = useState(8);
  const [isStarted, setIsStarted] = useState(false);
  const [maxPhotos, setMaxPhotos] = useState(8);
  const [isRetaking, setIsRetaking] = useState(false);
  const [retakeIndex, setRetakeIndex] = useState(null);
  
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

  const getCropDimensions = (cutValue, videoWidth, videoHeight) => {
    const cutNum = Number(cutValue);
    let targetAspectRatio;
    switch (cutNum) {
      case 3: targetAspectRatio = 276 / 220; break;
      case 41: targetAspectRatio = 276 / 195; break;
      case 42: targetAspectRatio = 260 / 330; break;
      case 6: targetAspectRatio = 280 / 240; break;
      default: targetAspectRatio = 1;
    }

    const videoAspectRatio = videoWidth / videoHeight;
    let cropWidth, cropHeight, cropX, cropY;

    if (videoAspectRatio > targetAspectRatio) {
      cropHeight = videoHeight;
      cropWidth = Math.round(cropHeight * targetAspectRatio);
      cropX = Math.round((videoWidth - cropWidth) / 2);
      cropY = 0;
    } else {
      cropWidth = videoWidth;
      cropHeight = Math.round(cropWidth / targetAspectRatio);
      cropX = 0;
      cropY = Math.round((videoHeight - cropHeight) / 2);
    }
    return { cropWidth, cropHeight, cropX, cropY };
  };

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

    setPreviewCrop({
      x: offsetX + cropX * scaleX,
      y: offsetY + cropY * scaleY,
      width: cropWidth * scaleX,
      height: cropHeight * scaleY,
    });
  };

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

  // Setup camera với độ phân giải cao
  useEffect(() => {
    let mounted = true;

    const setupCamera = async () => {
      let stream = null;
      const tryConstraints = [
        { audio: false, video: { facingMode: 'user', width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 30 } } },
        { audio: false, video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } } },
        { audio: false, video: { facingMode: 'user' } },
      ];

      for (const constraints of tryConstraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (!mounted) return;
          break;
        } catch (err) {
          console.warn('Thử độ phân giải thất bại:', constraints, err);
        }
      }

      if (!stream) {
        console.error('Không thể truy cập camera.');
        return;
      }

      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings();
        console.log('✅ Camera resolution thực tế:', settings.width, 'x', settings.height);
        if ('ImageCapture' in window) {
          imageCaptureRef.current = new window.ImageCapture(track);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const handleLoaded = () => {
          videoRef.current.play().catch(() => {});
          updatePreviewCrop();
        };
        videoRef.current.addEventListener('loadedmetadata', handleLoaded, { once: true });
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

  // Đếm ngược và chụp ảnh
  useEffect(() => {
    if (!isStarted || photoIndex > maxPhotos) return;

    const currentTime = photoIndex === 1 ? initialTime : subsequentTime;
    setShootCountdown(currentTime);

    const shootTimer = setTimeout(() => {
      handleTakePhoto();
    }, currentTime * 1000);

    const interval = setInterval(() => {
      setShootCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearTimeout(shootTimer);
      clearInterval(interval);
    };
  }, [photoIndex, isStarted, maxPhotos, initialTime, subsequentTime]);

  // ✅ HIỆU ỨNG CHUYỂN TRANG KHI CHỤP ĐỦ ẢNH
  useEffect(() => {
    if (photoIndex > maxPhotos) {
      setTimeout(() => {
        if (isRetaking) {
          const newPhoto = photos[0];
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
              size,
              cut,
              selectedFrame,
              selectedFrameId,
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
    }
  }, [photoIndex, maxPhotos, isRetaking, photos, navigate]);

  const handleTakePhoto = async () => {
    if (!streamRef.current || !videoRef.current || photoIndex > maxPhotos) return;

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

    const { cropWidth, cropHeight, cropX, cropY } = getCropDimensions(cut, videoWidth, videoHeight);

    const canvas = canvasRef.current;
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, cropWidth, cropHeight);
    ctx.save();

    if (isMirror) {
      ctx.translate(cropWidth, 0);
      ctx.scale(-1, 1);
    }

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
          cropX * scaleX,
          cropY * scaleY,
          cropWidth * scaleX,
          cropHeight * scaleY,
          0,
          0,
          cropWidth,
          cropHeight
        );
        ctx.restore();

        canvas.toBlob((croppedBlob) => {
          if (croppedBlob) {
            blobToDataURL(croppedBlob).then(applyCapturedPhoto);
          }
        }, 'image/png');
        return;
      } catch (err) {
        console.warn('ImageCapture lỗi, dùng fallback:', err);
      }
    }

    // Fallback
    ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    ctx.restore();

    canvas.toBlob((blob) => {
      if (blob) {
        blobToDataURL(blob).then(applyCapturedPhoto);
      }
    }, 'image/png');
  };

  const applyCapturedPhoto = (dataUrl) => {
    setPhotos((prev) => [...prev, dataUrl]);
    setPhotoIndex((prev) => prev + 1);
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    setTimeout(() => {
      if (photosContainerRef.current?.lastElementChild) {
        photosContainerRef.current.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 50);
  };

  const handleScreenClick = () => {
    if (!isStarted) setIsStarted(true);
  };

  const getCurrentPhotoDisplay = () => {
    return photoIndex <= maxPhotos ? `${photoIndex}/${maxPhotos}` : 'Hoàn thành!';
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
      
      {/* Countdown tổng (góc trên) */}
      <div className="countdown">⌛: {formattedCountdown}</div>

      <canvas ref={canvasRef} className="d-none" />

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
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
            }}
          />
        </div>
      )}

      {flash && <div className="flash-overlay-fullscreen" />}

      {!isStarted && (
        <div className="camera-icon-overlay">
          <div className="camera-icon">
            <i className="fas fa-camera" />
            <p>Nhấn vào màn hình để bắt đầu chụp</p>
          </div>
        </div>
      )}

      {isStarted && photoIndex <= maxPhotos && (
        <div className="countdown-center">
          <div className="countdown-number-large">{shootCountdown}</div>
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