import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Frame.css';
import { useCountdown } from "../../contexts/CountdownContext";
import Chatbot from '../../components/Chatbot';

function Frame() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    photos,
    size,
    cut,
    selectedFrameId: initialSelectedFrameId,
    selectedSlots,   
    imageStickers    
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

  useEffect(() => {
    const savedBackground = localStorage.getItem('backgroundImage');
    if (savedBackground) {
      document.body.style.backgroundImage = `url(${savedBackground})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
    }
    return () => { document.body.style.backgroundImage = 'none'; };
  }, []);

  // === FETCH FRAMES ===
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
              return { ...f, frame: fullFrameUrl, type: f.type || 'default' };
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

  // === KHỞI TẠO FRAME ===
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
      .then(data => { if (data?.id) setLatestPaymentId(data.id); })
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

  // ===========================================================================
  // 1. THUẬT TOÁN TÌM VÙNG TRONG SUỐT (GIỮ NGUYÊN)
  // ===========================================================================
  const detectTransparentSlots = (frameImg, width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    ctx.drawImage(frameImg, 0, 0, width, height);
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const visited = new Uint8Array(width * height);
    const slots = [];

    const getIdx = (x, y) => (y * width + x) * 4;

    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const idx = getIdx(x, y);
        const alpha = data[idx + 3];

        if (alpha < 50 && visited[y * width + x] === 0) {
          let minX = width, maxX = 0, minY = height, maxY = 0;
          const queue = [{x, y}];
          visited[y * width + x] = 1;
          let pixelCount = 0;

          while (queue.length > 0) {
            const p = queue.pop();
            const px = p.x;
            const py = p.y;
            pixelCount++;

            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;

            const neighbors = [
              {nx: px + 4, ny: py}, {nx: px - 4, ny: py},
              {nx: px, ny: py + 4}, {nx: px, ny: py - 4}
            ];

            for (let n of neighbors) {
              if (n.nx >= 0 && n.nx < width && n.ny >= 0 && n.ny < height) {
                const nIdx = n.ny * width + n.nx;
                if (visited[nIdx] === 0) {
                  const currentAlpha = data[getIdx(n.nx, n.ny) + 3];
                  if (currentAlpha < 50) {
                     visited[nIdx] = 1;
                     queue.push({x: n.nx, y: n.ny});
                  }
                }
              }
            }
          }

          if (pixelCount > 100 && (maxX - minX) > 50 && (maxY - minY) > 50) {
             slots.push({
               x: minX, y: minY,
               width: maxX - minX,
               height: maxY - minY,
               centerX: (minX + maxX) / 2,
               centerY: (minY + maxY) / 2
             });
          }
        }
      }
    }

    slots.sort((a, b) => {
      const yDiff = Math.abs(a.centerY - b.centerY);
      if (yDiff > 100) return a.centerY - b.centerY;
      return a.centerX - b.centerX;
    });

    return slots;
  };

  // ===========================================================================
// ===========================================================================
  // 2. HÀM VẼ THÔNG MINH (ĐÃ SỬA: MỞ RỘNG VÙNG CẮT 1%)
  // ===========================================================================
  const drawCompositeHighRes = async (canvasWidth, canvasHeight, frameObj) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // Load Frame
    const frameImg = await loadImage(frameObj.frame);

    // TÌM CÁC VÙNG TRONG SUỐT (Detection giữ nguyên)
    let slotsToDraw = detectTransparentSlots(frameImg, canvasWidth, canvasHeight);

    // Fallback nếu không tìm thấy lỗ
    if (slotsToDraw.length === 0) {
       console.warn("Không tìm thấy vùng trong suốt, dùng fallback.");
       // ... (Logic fallback nếu cần)
    }

    // Load tất cả ảnh User
    const userImages = await Promise.all(selectedSlots.map(s => s && s.photo ? loadImage(s.photo) : null));

    // --- BƯỚC 1: VẼ ẢNH USER VÀO CÁC Ô (LAYER DƯỚI) ---
    slotsToDraw.forEach((slotInfo, idx) => {
        if (idx >= selectedSlots.length || !userImages[idx]) return;
        
        const userImg = userImages[idx];
        const userSlotData = selectedSlots[idx];

        // === [FIX LOGIC] MỞ RỘNG VÙNG CẮT RA 2% ===
        // Thay vì chỉ scale ảnh, ta định nghĩa lại "Vùng Đích" (Target Area) to hơn slot gốc
        const expandRatio = 0.02; // 2% cho chắc chắn (bạn có thể chỉnh về 0.02)
        const expandW = slotInfo.width * expandRatio;
        const expandH = slotInfo.height * expandRatio;

        // Tọa độ và kích thước mới (Lùi x, y lại và tăng width, height lên)
        const targetX = slotInfo.x - expandW;
        const targetY = slotInfo.y - expandH;
        const targetW = slotInfo.width + (expandW * 2);
        const targetH = slotInfo.height + (expandH * 2);

        // Tính toán tỷ lệ dựa trên VÙNG ĐÍCH MỚI (đã mở rộng)
        const targetRatio = targetW / targetH;
        const imgRatio = userImg.width / userImg.height;
        
        let drawW, drawH, drawX, drawY;

        // Logic Object-fit: COVER (Lấp đầy vùng đích mới)
        if (imgRatio > targetRatio) { 
          // Ảnh dài hơn vùng đích -> Lấy theo chiều cao vùng đích
          drawH = targetH;
          drawW = targetH * imgRatio;
          // Căn giữa theo chiều ngang
          drawX = targetX - (drawW - targetW) / 2;
          drawY = targetY;
        } else {
          // Ảnh cao hơn vùng đích -> Lấy theo chiều rộng vùng đích
          drawW = targetW;
          drawH = targetW / imgRatio;
          // Căn giữa theo chiều dọc
          drawX = targetX;
          drawY = targetY - (drawH - targetH) / 2;
        }

        ctx.save();
        
        // === CẮT (CLIP) THEO VÙNG MỞ RỘNG ===
        // Ta cho phép vẽ tràn ra ngoài slot gốc 1%, 
        // để đảm bảo frame đè lên sẽ không thấy kẽ hở.
        // Tuy nhiên vẫn phải clip theo targetW/H để ảnh này không lấn sang ảnh bên cạnh quá nhiều.
        ctx.beginPath();
        ctx.rect(targetX, targetY, targetW, targetH);
        ctx.clip();

        if (userSlotData.flip) {
            // Flip thì translate về tâm của vùng vẽ mới
            ctx.translate(drawX + drawW/2, drawY + drawH/2);
            ctx.scale(-1, 1);
            ctx.drawImage(userImg, -drawW/2, -drawH/2, drawW, drawH);
        } else {
            ctx.drawImage(userImg, drawX, drawY, drawW, drawH);
        }
        
        ctx.restore();
    });
    
    // --- BƯỚC 2: VẼ STICKER (LAYER GIỮA) ---
    for (let idx = 0; idx < slotsToDraw.length; idx++) {
        if (idx >= selectedSlots.length) continue;
        const slotInfo = slotsToDraw[idx];
        const stickers = imageStickers ? imageStickers[idx] : [];
        
        if (stickers && stickers.length > 0) {
            ctx.save();
            // Sticker vẫn nên nằm gọn trong slot gốc để tránh bị frame che mất các chi tiết quan trọng
            // Hoặc bạn có thể dùng targetX/Y nếu muốn sticker cũng tràn viền. 
            // Ở đây tôi giữ slot gốc cho an toàn.
            ctx.beginPath();
            ctx.rect(slotInfo.x, slotInfo.y, slotInfo.width, slotInfo.height);
            ctx.clip();

            for (const sticker of stickers) {
                if (sticker.x >= 5 && sticker.x <= 95 && sticker.y >= 5 && sticker.y <= 95) {
                    try {
                        const sImg = await loadImage(sticker.src);
                        const sX = slotInfo.x + (sticker.x / 100) * slotInfo.width;
                        const sY = slotInfo.y + (sticker.y / 100) * slotInfo.height;

                        ctx.translate(sX, sY);
                        ctx.rotate((sticker.rotation * Math.PI) / 180);
                        
                        const baseSize = slotInfo.height * 0.25;
                        const finalSize = baseSize * sticker.scale; 

                        ctx.drawImage(sImg, -finalSize/2, -finalSize/2, finalSize, finalSize);
                        ctx.translate(-sX, -sY);
                    } catch (e) { console.error("Lỗi vẽ sticker", e); }
                }
            }
            ctx.restore();
        }
    }

    // --- BƯỚC 3: VẼ KHUNG ĐÈ LÊN TRÊN CÙNG (LAYER TRÊN) ---
    // Frame sẽ che đi phần rìa 1.5% mà ta vừa vẽ tràn ra.
    ctx.drawImage(frameImg, 0, 0, canvasWidth, canvasHeight);

    return canvas;
  };

  // ===========================================================================
  // 3. GENERATE VÀ RENDER (GIỮ NGUYÊN LOGIC GỌI HÀM)
  // ===========================================================================
  const generateFinalImage = async () => {
    if (!currentPreviewFrameId || framesList.length === 0) return null;
    const frameObj = framesList.find(f => f.id === currentPreviewFrameId);
    if (!frameObj || !frameObj.frame) return null;

    let w = 1200; 
    let h = 1800;
    if (cut === "3") { w = 1800; h = 600; }
    else if (cut === "41") { w = 600; h = 1800; }

    try {
      const finalCanvas = await drawCompositeHighRes(w, h, frameObj);
      return finalCanvas.toDataURL('image/png');
    } catch (e) {
      console.error("Generate Error:", e);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    const runPreview = async () => {
        const url = await generateFinalImage();
        if (isMounted && url) {
            setPreviewImage(url);
        }
    };
    runPreview();
    return () => { isMounted = false; };
  }, [currentPreviewFrameId, framesList, cut, selectedSlots, imageStickers]);

  const navigateToQr = async () => {
    const frameObj = framesList.find(f => f.id === currentPreviewFrameId);
    const url = await generateFinalImage();
    
    if (url && frameObj) {
        navigate('/Qr', {
            state: {
              id_pay: latestPaymentId,
              id_frame: frameObj.id,
              photos,
              finalImage: url, 
              size,
              cut
            }
        });
    }
  };

  useEffect(() => {
    if (countdown === 0 && currentPreviewFrameId) {
       navigateToQr();
    }
  }, [countdown, currentPreviewFrameId]);

  const handleContinue = () => navigateToQr();
  const handleSelectFrame = () => setIsSelectionMode(true);
  const handlePreviewFrame = (id) => setCurrentPreviewFrameId(id);

  return (
    <div className="frame-container">
      <div className="countdown">⌛: {formattedCountdown}</div>

      <h2 className="touch-to-crecuts pt-5">
        {isSelectionMode ? "VUI LÒNG CHỌN KHUNG ẢNH BẠN MUỐN IN" : "KHUNG ẢNH ĐÃ ĐƯỢC ÁP DỤNG"}
      </h2>

      <div className="frame-content pt-5">
        <div className="col-left">
          {previewImage ? (
            <div className="image-wrapper">
              <img src={previewImage} alt="Preview" className="composite-image" style={{ imageRendering: 'high-quality' }} />
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
                          <img src={frame.frame} alt="Current" className="current-frame-image" />
                        </div>
                        <p>Loại khung: {frame.type || 'Default'}</p>
                      </>
                    ) : (<div>Khung không hợp lệ</div>);
                  })()
                ) : (<div>Chưa có khung ảnh</div>)}
              </div>
              <button className="select-frame-btn" onClick={handleSelectFrame}>CHỌN LẠI KHUNG ẢNH</button>
            </div>
          ) : (
            <div className="selection-mode">
              <div className="frame-tabs">
                {frameTypes.map((type) => (
                  <button key={type} className={`tab ${selectedType === type ? 'active' : ''}`} onClick={() => setSelectedType(type)}>
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
                        <img key={frame.id} src={frame.frame} alt={`Frame ${frame.id}`} className={`thumbnail ${frame.id === currentPreviewFrameId ? 'selected' : ''}`} onClick={() => handlePreviewFrame(frame.id)} />
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
        <button className="continue-btn" onClick={handleContinue} disabled={!currentPreviewFrameId || !previewImage}>TIẾP TỤC</button>
      </div>
      <Chatbot />
    </div>
  );
}

export default Frame;