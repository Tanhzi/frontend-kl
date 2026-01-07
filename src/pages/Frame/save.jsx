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
  // 1. THUẬT TOÁN TÌM VÙNG TRONG SUỐT (FINAL STANDARD)
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
    const step = 2; // Quét chi tiết

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        if (visited[y * width + x]) continue;
        
        const idx = getIdx(x, y);
        const alpha = data[idx + 3];

        if (alpha < 50) {
          let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
          let count = 0;
          let minX = width, maxX = 0, minY = height, maxY = 0;
          
          const queue = [{x, y}];
          visited[y * width + x] = 1;

          while (queue.length > 0) {
            const p = queue.pop();
            const px = p.x; 
            const py = p.y;
            
            sumX += px; sumY += py;
            sumXX += px * px; sumYY += py * py;
            sumXY += px * py;
            count++;

            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;

            const neighbors = [
              {nx: px + step, ny: py}, {nx: px - step, ny: py},
              {nx: px, ny: py + step}, {nx: px, ny: py - step}
            ];

            for (let n of neighbors) {
              if (n.nx >= 0 && n.nx < width && n.ny >= 0 && n.ny < height) {
                const nIdx = n.ny * width + n.nx;
                if (!visited[nIdx]) {
                  const a = data[getIdx(n.nx, n.ny) + 3];
                  if (a < 50) {
                     visited[nIdx] = 1;
                     queue.push({x: n.nx, y: n.ny});
                  }
                }
              }
            }
          }

          if (count > 100 && (maxX - minX) > 20) {
             const meanX = sumX / count;
             const meanY = sumY / count;
             const varX = (sumXX / count) - (meanX * meanX);
             const varY = (sumYY / count) - (meanY * meanY);
             const covXY = (sumXY / count) - (meanX * meanY);

             const delta = varX - varY;
             const rotationRad = 0.5 * Math.atan2(2 * covXY, delta);
             
             const discrimination = Math.sqrt(delta * delta + 4 * covXY * covXY);
             const lambda1 = 0.5 * (varX + varY + discrimination); // Trục lớn
             const lambda2 = 0.5 * (varX + varY - discrimination); // Trục nhỏ
             const pcaWidth = Math.sqrt(Math.abs(lambda1) * 12); 
             const pcaHeight = Math.sqrt(Math.abs(lambda2) * 12);

             // --- LOGIC GÓC NGHIÊNG ---
             const degree = rotationRad * (180 / Math.PI);
             const absDeg = Math.abs(degree);
             // Ngưỡng 10 độ: Dưới 10 độ coi như thẳng
             const isStraight = absDeg < 10 || Math.abs(absDeg - 90) < 10 || Math.abs(absDeg - 180) < 10;

             slots.push({
               // Thông số dùng để xoay
               centerX: meanX,
               centerY: meanY,
               rotation: isStraight ? 0 : rotationRad, 
               realWidth: pcaWidth,
               realHeight: pcaHeight,
               
               // Thông số dùng để vẽ thẳng (AABB)
               aabbX: minX, 
               aabbY: minY,
               aabbWidth: maxX - minX,
               aabbHeight: maxY - minY,
               
               isStraight: isStraight
             });
          }
        }
      }
    }

    slots.sort((a, b) => {
      const yDiff = Math.abs(a.centerY - b.centerY);
      if (yDiff > 50) return a.centerY - b.centerY;
      return a.centerX - b.centerX;
    });

    return slots;
  };
// ===========================================================================
// ===========================================================================
  // 2. HÀM VẼ (FIX GAP: SCALE ẢNH LỚN HƠN VÙNG CHỌN)
  // ===========================================================================
  const drawCompositeHighRes = async (canvasWidth, canvasHeight, frameObj) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    const frameImg = await loadImage(frameObj.frame);
    let slotsToDraw = detectTransparentSlots(frameImg, canvasWidth, canvasHeight);
    
    // Kiểm tra null an toàn
    const safeSelectedSlots = selectedSlots || [];
    const userImages = await Promise.all(safeSelectedSlots.map(s => s && s.photo ? loadImage(s.photo) : null));

    // --- BƯỚC 1: VẼ ẢNH USER ---
    slotsToDraw.forEach((slotInfo, idx) => {
        if (idx >= safeSelectedSlots.length || !userImages[idx]) return;
        
        const userImg = userImages[idx];
        const userSlotData = safeSelectedSlots[idx];

        // --- CHIẾN THUẬT LẤP ĐẦY KHOẢNG TRẮNG ---
        let baseW, baseH;

        if (slotInfo.isStraight) {
            // Nếu là hình thẳng (hoặc đám mây/tim được ép thẳng):
            // Dùng kích thước hộp bao (AABB) để đảm bảo phủ kín từ trái sang phải
            baseW = slotInfo.aabbWidth;
            baseH = slotInfo.aabbHeight;
        } else {
            // Nếu là hình nghiêng:
            // Dùng kích thước PCA, nhưng lấy MAX giữa PCA và AABB*0.8 để tránh trường hợp PCA tính quá nhỏ
            baseW = Math.max(slotInfo.realWidth, slotInfo.aabbWidth * 0.8);
            baseH = Math.max(slotInfo.realHeight, slotInfo.aabbHeight * 0.8);
        }

        // QUAN TRỌNG: Mở rộng vùng vẽ thêm 20% (0.2)
        // Việc này đảm bảo ảnh luôn to hơn cái lỗ, bất kể xoay hay méo.
        // Phần thừa sẽ bị cắt bởi lệnh ctx.clip()
        const expandRatio = 0.2; 
        const targetW = baseW * (1 + expandRatio);
        const targetH = baseH * (1 + expandRatio);
        
        // Tính tỷ lệ COVER
        const targetRatio = targetW / targetH;
        const imgRatio = userImg.width / userImg.height;
        
        let drawW, drawH;
        if (imgRatio > targetRatio) { 
          drawH = targetH;
          drawW = targetH * imgRatio;
        } else {
          drawW = targetW;
          drawH = targetW / imgRatio;
        }

        ctx.save();
        
        // 1. Dời bút về tâm hình
        // Nếu thẳng thì dùng tâm hộp bao, nếu nghiêng dùng tâm PCA
        const cx = slotInfo.isStraight ? (slotInfo.aabbX + slotInfo.aabbWidth/2) : slotInfo.centerX;
        const cy = slotInfo.isStraight ? (slotInfo.aabbY + slotInfo.aabbHeight/2) : slotInfo.centerY;
        
        ctx.translate(cx, cy);
        ctx.rotate(slotInfo.rotation);

        // 2. Tạo đường cắt (Clip)
        ctx.beginPath();
        // Vẽ vùng cắt lớn hơn một chút để đảm bảo
        ctx.rect(-targetW / 2, -targetH / 2, targetW, targetH);
        ctx.clip();

        // 3. Vẽ ảnh
        const drawX = -drawW / 2; 
        const drawY = -drawH / 2;

        if (userSlotData.flip) {
            ctx.scale(-1, 1);
        }
        
        ctx.drawImage(userImg, drawX, drawY, drawW, drawH);
        
        ctx.restore();
    });
    
    // --- BƯỚC 2: VẼ STICKER (Dùng tọa độ AABB cho an toàn) ---
    for (let idx = 0; idx < slotsToDraw.length; idx++) {
        if (idx >= safeSelectedSlots.length) continue;
        const slotInfo = slotsToDraw[idx];
        const stickers = imageStickers ? imageStickers[idx] : [];
        
        if (stickers && stickers.length > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(slotInfo.aabbX, slotInfo.aabbY, slotInfo.aabbWidth, slotInfo.aabbHeight);
            ctx.clip();

            for (const sticker of stickers) {
                if (sticker.x >= 5 && sticker.x <= 95 && sticker.y >= 5 && sticker.y <= 95) {
                    try {
                        const sImg = await loadImage(sticker.src);
                        const sX = slotInfo.aabbX + (sticker.x / 100) * slotInfo.aabbWidth;
                        const sY = slotInfo.aabbY + (sticker.y / 100) * slotInfo.aabbHeight;

                        ctx.translate(sX, sY);
                        ctx.rotate((sticker.rotation * Math.PI) / 180);
                        
                        const baseSize = Math.min(slotInfo.aabbWidth, slotInfo.aabbHeight) * 0.25; 
                        const finalSize = baseSize * sticker.scale; 

                        ctx.drawImage(sImg, -finalSize/2, -finalSize/2, finalSize, finalSize);
                        ctx.translate(-sX, -sY);
                    } catch (e) { }
                }
            }
            ctx.restore();
        }
    }

    // --- BƯỚC 3: VẼ KHUNG ---
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