import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Photo.css';
import { useCountdown } from "../../contexts/CountdownContext";

function Photo() {
  //Lấy thông tin từ auth
  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const [auth, setAuth] = useState(getAuth());
  const { id_admin } = auth;

  const [countdown2, setCountdown] = useState(5);
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

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const imageCaptureRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { size, cut, id_admin: idAdmin, id_topic: idTopic, selectedFrame, price, retakeIndex: incomingRetakeIndex, currentPhotos: incomingCurrentPhotos, currentSelectedSlots: incomingCurrentSelectedSlots, currentAppliedFilters: incomingCurrentAppliedFilters } = location.state || {};

  const blobToDataURL = (blob) => new Promise((resolve, reject) => {
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

  

  const getCropDimensions = (cutValue, videoWidth, videoHeight) => {
    const cutNum = Number(cutValue);
    let targetAspectRatio;
    
    switch (cutNum) {
      case 3:
        targetAspectRatio = 276 / 220;
        break;
      case 41:
        targetAspectRatio = 276 / 195;
        break;
      case 42:
        targetAspectRatio = 260 / 330;
        break;
      case 6:
        targetAspectRatio = 280 / 240;
        break;
      default:
        targetAspectRatio = 1;
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

    cropWidth = Math.min(cropWidth, videoWidth);
    cropHeight = Math.min(cropHeight, videoHeight);
    cropX = Math.max(0, Math.min(cropX, videoWidth - cropWidth));
    cropY = Math.max(0, Math.min(cropY, videoHeight - cropHeight));

    return { cropWidth, cropHeight, cropX, cropY };
  };

  // UseEffect chạy một lần khi mount để xử lý retake hoặc normal
  useEffect(() => {
    const { retakeIndex: locRetakeIndex, currentPhotos: locCurrentPhotos, currentSelectedSlots: locCurrentSelectedSlots, currentAppliedFilters: locCurrentAppliedFilters } = location.state || {};
    if (locRetakeIndex !== undefined && locCurrentPhotos) {
      setIsRetaking(true);
      setRetakeIndex(locRetakeIndex);
      setCurrentPhotosState(locCurrentPhotos);
      setCurrentSelectedSlotsState(locCurrentSelectedSlots || []);
      setCurrentAppliedFiltersState(locCurrentAppliedFilters || {});
      setPhotos([]);
      setPhotoIndex(1);
      setMaxPhotos(1);
      setIsStarted(true); // Tự động bắt đầu cho retake
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
  }, []); // Chạy một lần khi mount


  useEffect(() => {
    if (!id_admin) return;
    fetch(`${import.meta.env.VITE_API_BASE_URL}/camera/basic?id_admin=${id_admin}`)
      .then(res => res.json())
      .then(data => {
        if (!data) return;
        setInitialTime(Number(data.time1) || 5);
        setSubsequentTime(Number(data.time2) || 8);
        setIsMirror(Number(data.mirror) === 1);
      })
      .catch(err => console.error('Lỗi khi lấy cấu hình:', err));
  }, [id_admin]);

  useEffect(() => {
    let mounted = true;

    const setupCamera = async () => {
      try {
        const constraints = {
          audio: false,
          video: {
            facingMode: 'user',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          }
        };

        let stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!mounted) return;
        streamRef.current = stream;

        try {
          const track = stream.getVideoTracks()[0];
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
          const loadedMetadata = () => {
            videoRef.current.play().catch(() => {});
          };
          videoRef.current.addEventListener('loadedmetadata', loadedMetadata, { once: true });
        }
      } catch (err) {
        console.error('Lỗi khi truy cập camera (ý định HD):', err);
        try {
          const fallback = await navigator.mediaDevices.getUserMedia({ video: true });
          if (!mounted) return;
          streamRef.current = fallback;
          try {
            const track = fallback.getVideoTracks()[0];
            if (track && 'ImageCapture' in window) imageCaptureRef.current = new window.ImageCapture(track);
            else imageCaptureRef.current = null;
          } catch (e) {
            imageCaptureRef.current = null;
          }
          if (videoRef.current) {
            videoRef.current.srcObject = fallback;
            videoRef.current.play().catch(() => {});
          }
        } catch (e2) {
          console.error('Không thể truy cập camera (fallback):', e2);
        }
      }
    };

    setupCamera();

    const handleBeforeUnload = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      mounted = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      imageCaptureRef.current = null;
    };
  }, []);

  // UseEffect xử lý khi hoàn thành chụp (retake hoặc normal)
  useEffect(() => {
    if (!isStarted) return;

    if (photoIndex > maxPhotos) {
      setTimeout(() => {
        if (isRetaking) {
          const newPhoto = photos[0]; // Chỉ một ảnh mới
          const updatedPhotos = [...currentPhotosState];
          updatedPhotos[retakeIndex] = newPhoto;
          const updatedSlots = [...currentSelectedSlotsState];
          if (updatedSlots[retakeIndex]) {
            updatedSlots[retakeIndex] = { ...updatedSlots[retakeIndex], photo: newPhoto }; // Giữ flip
          }
          const updatedFilters = { ...currentAppliedFiltersState }; // Giữ filter
          navigate('/Selphoto', { 
            state: { 
              photos: updatedPhotos, 
              size, 
              cut, 
              selectedFrame, 
              price,
              selectedSlots: updatedSlots,
              appliedFilters: updatedFilters
            } 
          });
        } else {
          // Normal: Tạo initial slots và filters
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
              price,
              selectedSlots: initialSlots,
              appliedFilters: initialFilters
            } 
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
  }, [photoIndex, isStarted, maxPhotos, initialTime, subsequentTime, photos, navigate, size, cut, selectedFrame, price, isRetaking, retakeIndex, currentPhotosState, currentSelectedSlotsState, currentAppliedFiltersState]);

  useEffect(() => {
    if (!isStarted) return;

    if (photoIndex <= maxPhotos) {
      const interval = setInterval(() => {
        setCountdown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isStarted, photoIndex, maxPhotos]);

    // Countdown tự động chuyển trang
  const { formattedCountdown } = useCountdown();

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

    if (!videoWidth || !videoHeight) {
      console.error('Không lấy được kích thước video để chụp');
      return;
    }

    const { cropWidth, cropHeight, cropX, cropY } = getCropDimensions(cut, videoWidth, videoHeight);

    if (imageCaptureRef.current) {
      try {
        const blob = await imageCaptureRef.current.takePhoto();
        
        const img = new Image();
        const imgDataUrl = await blobToDataURL(blob);
        
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = imgDataUrl;
        });

        const canvas = canvasRef.current;
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, cropWidth, cropHeight);
        ctx.save();

        if (isMirror) {
          ctx.translate(cropWidth, 0);
          ctx.scale(-1, 1);
        }

        const scaleX = img.width / videoWidth;
        const scaleY = img.height / videoHeight;

        ctx.drawImage(
          img,
          cropX * scaleX, cropY * scaleY, cropWidth * scaleX, cropHeight * scaleY,
          0, 0, cropWidth, cropHeight
        );
        ctx.restore();

        canvas.toBlob(async (croppedBlob) => {
          if (!croppedBlob) return;
          const croppedDataUrl = await blobToDataURL(croppedBlob);
          applyCapturedPhoto(croppedDataUrl);
        }, 'image/jpeg', 0.92);

        return;
      } catch (err) {
        console.warn('ImageCapture lỗi, fallback canvas:', err);
      }
    }

    const canvas = canvasRef.current;
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, cropWidth, cropHeight);
    ctx.save();

    if (isMirror) {
      ctx.translate(cropWidth, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    ctx.restore();

    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error('Canvas toBlob trả về null');
        return;
      }
      try {
        const dataUrl = await blobToDataURL(blob);
        applyCapturedPhoto(dataUrl);
      } catch (e) {
        console.error('Lỗi chuyển blob->dataURL:', e);
      }
    }, 'image/jpeg', 0.92);
  };

  const applyCapturedPhoto = (dataUrl) => {
    setPhotos(prev => [...prev, dataUrl]);
    setPhotoIndex(prev => prev + 1);

    setFlash(true);
    setTimeout(() => setFlash(false), 200);
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
          playsInline
          muted
          autoPlay
        />

        <canvas ref={canvasRef} className="d-none" />

        {flash && <div className="flash-overlay-fullscreen" />}
      </div>

      {!isStarted && (
        <div className="camera-icon-overlay">
          <div className="camera-icon">
            <i className="fas fa-camera" style={{ fontSize: '80px', color: 'white' }} />
            <p style={{ color: 'white', fontSize: '24px', marginTop: '20px' }}>
              Nhấn vào màn hình để bắt đầu chụp
            </p>
          </div>
        </div>
      )}

      {isStarted && (photoIndex <= maxPhotos) && (
        <div className="countdown-center">
          <div className="countdown-number-large">{countdown2}</div>
        </div>
      )}

      <div className="photo-counter-top-right">{getCurrentPhotoDisplay()}</div>

      {photos.length > 0 && (
        <div className="captured-photos-column">
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
    </div>
  );
}

export default Photo;