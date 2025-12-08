import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Frame.css';
import { useCountdown } from "../../contexts/CountdownContext";
import Chatbot from '../../components/Chatbot';

function Frame() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    photos,
    compositeImage,
    size,
    cut,
    selectedFrameId: initialSelectedFrameId,
  } = location.state || {};

  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };
  const [auth] = useState(getAuth());
  const { id_admin, id_topic } = auth || {};

  const [latestPaymentId, setLatestPaymentId] = useState(null);
  const [framesList, setFramesList] = useState([]);
  const [currentPreviewFrameId, setCurrentPreviewFrameId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [frameTypes, setFrameTypes] = useState(['all']);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const { formattedCountdown, countdown } = useCountdown();

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

  // === 1. FETCH FRAMES ===
  useEffect(() => {
    if (!id_admin || !id_topic || !cut) return;

    const fetchFrames = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/frames?id_admin=${id_admin}&id_topic=${id_topic}&cuts=${cut}`
        );
        const result = await response.json();

        if (result.status === 'success' && result.data) {
          const processed = result.data
            .filter(f => f.frame)
            .map(f => {
              const fullFrameUrl = f.frame.startsWith('http')
                ? f.frame
                : `${import.meta.env.VITE_API_BASE_URL}${f.frame}`;

              return {
                ...f,
                frame: fullFrameUrl,
                type: f.type || 'default'
              };
            });

          setFramesList(processed);
          setFrameTypes(['all', ...new Set(processed.map(f => f.type))]);
        }
      } catch (error) {
        console.error("Fetch frames error:", error);
        setFramesList([]);
      }
    };

    fetchFrames();
  }, [id_admin, id_topic, cut]);

  // === 2. KHỞI TẠO KHUNG XEM TRƯỚC ===
  useEffect(() => {
    if (framesList.length === 0) return;

    let frameIdToUse = null;

    if (initialSelectedFrameId !== undefined) {
      const exists = framesList.some(f => f.id === initialSelectedFrameId);
      if (exists) {
        frameIdToUse = initialSelectedFrameId;
        const frame = framesList.find(f => f.id === initialSelectedFrameId);
        setSelectedType(frame.type || 'all');
      }
    }

    if (frameIdToUse === null && framesList.length > 0) {
      frameIdToUse = framesList[0].id;
      setSelectedType(framesList[0].type || 'all');
    }

    setCurrentPreviewFrameId(frameIdToUse);
  }, [framesList, initialSelectedFrameId]);

  const filteredFrames = selectedType === 'all'
    ? framesList
    : framesList.filter(frame => frame.type === selectedType);

  useEffect(() => {
    if (!id_admin) return;
    fetch(`${import.meta.env.VITE_API_BASE_URL}/get-new-id?id_admin=${id_admin}`)
      .then(res => res.json())
      .then(data => {
        if (data?.id) setLatestPaymentId(data.id);
      })
      .catch(err => console.error('Lỗi lấy id thanh toán:', err));
  }, [id_admin]);

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Load image failed'));
      img.src = src;
    });
  };

  const createPreviewImage = async () => {
    if (!compositeImage || !currentPreviewFrameId || framesList.length === 0) {
      setPreviewImage(null);
      return;
    }

    const frame = framesList.find(f => f.id === currentPreviewFrameId);
    if (!frame?.frame) {
      setPreviewImage(null);
      return;
    }

    try {
      const baseImg = await loadImage(compositeImage);
      const frameImg = await loadImage(frame.frame);

      let w = size?.width || baseImg.width;
      let h = size?.height || baseImg.height;
      if (cut === "42" || cut === "6") {
        w = 1200; h = 1800;
      } else if (cut === "3") {
        w = 1800; h = 600;
      } else if (cut === "41") {
        w = 600; h = 1800;
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // ✅ VẼ ẢNH COMPOSITE MỘT LẦN DUY NHẤT — KHÔNG PHÂN BIỆT CUT
      ctx.drawImage(baseImg, 0, 0, w, h);
      ctx.drawImage(frameImg, 0, 0, w, h);

      setPreviewImage(canvas.toDataURL('image/png'));
    } catch (error) {
      console.error("Preview error:", error);
      setPreviewImage(null);
    }
  };

  useEffect(() => {
    createPreviewImage();
  }, [compositeImage, currentPreviewFrameId, framesList, cut, size]);

  const navigateToQr = async () => {
    if (!compositeImage || !currentPreviewFrameId) return;
    const frame = framesList.find(f => f.id === currentPreviewFrameId);
    if (!frame) return;

    try {
      const baseImg = await loadImage(compositeImage);
      const frameImg = await loadImage(frame.frame);

      let w = size?.width || baseImg.width;
      let h = size?.height || baseImg.height;
      if (cut === "42" || cut === "6") {
        w = 1200; h = 1800;
      } else if (cut === "3") {
        w = 1800; h = 600;
      } else if (cut === "41") {
        w = 600; h = 1800;
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // ✅ VẼ ẢNH COMPOSITE MỘT LẦN DUY NHẤT — KHÔNG PHÂN BIỆT CUT
      ctx.drawImage(baseImg, 0, 0, w, h);
      ctx.drawImage(frameImg, 0, 0, w, h);

      navigate('/Qr', {
        state: {
          id_pay: latestPaymentId,
          id_frame: frame.id,
          photos,
          finalImage: canvas.toDataURL('image/png'),
          size,
          cut
        }
      });
    } catch (error) {
      console.error("QR navigation error:", error);
    }
  };

  useEffect(() => {
    if (countdown === 0 && compositeImage && currentPreviewFrameId) {
      const exists = framesList.some(f => f.id === currentPreviewFrameId);
      if (exists) navigateToQr();
    }
  }, [countdown, compositeImage, currentPreviewFrameId, framesList]);

  const handleContinue = () => {
    navigateToQr();
  };

  const handleSelectFrame = () => {
    setIsSelectionMode(true);
  };

  const handlePreviewFrame = (frameId) => {
    setCurrentPreviewFrameId(frameId);
  };

  return (
    <div className="frame-container">
      <div className="countdown">
        ⌛: {formattedCountdown}
      </div>

      <h2 className="touch-to-crecuts pt-5">
        {isSelectionMode
          ? "VUI LÒNG CHỌN KHUNG ẢNH BẠN MUỐN IN"
          : "KHUNG ẢNH ĐÃ ĐƯỢC ÁP DỤNG"}
      </h2>

      <div className="frame-content pt-5">
        <div className="col-left">
          {previewImage ? (
            <div className="image-wrapper">
<img
  src={previewImage}
  alt="Preview"
  className="composite-image"
/>
            </div>
          ) : (
            <div className="no-image">Đang tạo ảnh xem trước...</div>
          )}
        </div>

        <div className="col-right">
          {!isSelectionMode ? (
            <div className="result-mode">
              <div className="current-frame-info">
                <h3>Khung ảnh hiện tại:</h3>
                {currentPreviewFrameId ? (
                  (() => {
                    const frame = framesList.find(f => f.id === currentPreviewFrameId);
                    return frame?.frame ? (
                      <>
                        <div className="current-frame-preview">
                          <img
                            src={frame.frame}
                            alt="Current"
                            className="current-frame-image"
                            onError={(e) => {
                              e.target.style.opacity = '0.5';
                            }}
                          />
                        </div>
                        <p>Loại khung: {frame.type || 'Default'}</p>
                      </>
                    ) : (
                      <div>Khung không hợp lệ</div>
                    );
                  })()
                ) : (
                  <div>Chưa có khung ảnh</div>
                )}
              </div>
              <button className="select-frame-btn" onClick={handleSelectFrame}>
                CHỌN LẠI KHUNG ẢNH
              </button>
            </div>
          ) : (
            <div className="selection-mode">
              <div className="frame-tabs">
                {frameTypes.map((type) => (
                  <button
                    key={type}
                    className={`tab ${selectedType === type ? 'active' : ''}`}
                    onClick={() => setSelectedType(type)}
                  >
                    {type === 'all' ? 'TẤT CẢ' : (type || 'DEFAULT').toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="frame-thumbnails">
                {filteredFrames.length === 0 ? (
                  <div className="no-frames">Đang tải khung ảnh...</div>
                ) : (
                  <div className="thumbnails-wrapper">
                    {filteredFrames.map((frame) => {
                      if (!frame?.frame) return null;
                      return (
                        <img
                          key={frame.id}
                          src={frame.frame}
                          alt={`Frame ${frame.id}`}
                          className={`thumbnail ${frame.id === currentPreviewFrameId ? 'selected' : ''}`}
                          onClick={() => handlePreviewFrame(frame.id)}
                          onError={(e) => {
                            e.target.style.opacity = '0.3';
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="frame-footer pb-5">
        <button
          className="continue-btn"
          onClick={handleContinue}
          disabled={!currentPreviewFrameId || !previewImage}
        >
          TIẾP TỤC
        </button>
      </div>
      <Chatbot />
    </div>
  );
}

export default Frame;