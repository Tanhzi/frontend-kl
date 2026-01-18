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
// ===========================================================================
  // 1. THUẬT TOÁN TÌM VÙNG TRONG SUỐT & TẠO MASK (CHÍNH XÁC TỪNG PIXEL)
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
    // Dùng bước nhỏ (1) để tạo Mask mịn màng nhất, thay vì 2
    const step = 1; 

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        if (visited[y * width + x]) continue;
        
        const idx = getIdx(x, y);
        const alpha = data[idx + 3];

        if (alpha < 50) {
          // Khởi tạo các biến thống kê
          let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
          let count = 0;
          let minX = width, maxX = 0, minY = height, maxY = 0;
          
          // Mảng lưu tọa độ pixel để tạo Mask sau này
          const pixels = []; 
          
          const queue = [{x, y}];
          visited[y * width + x] = 1;

          while (queue.length > 0) {
            const p = queue.pop();
            const px = p.x; 
            const py = p.y;
            
            // Lưu lại pixel để vẽ mask
            pixels.push({x: px, y: py});

            // Tính toán PCA
            sumX += px; sumY += py;
            sumXX += px * px; sumYY += py * py;
            sumXY += px * py;
            count++;

            // Tính toán AABB
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;

            const neighbors = [
              {nx: px + 1, ny: py}, {nx: px - 1, ny: py},
              {nx: px, ny: py + 1}, {nx: px, ny: py - 1}
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

          if (count > 500 && (maxX - minX) > 20) {
             // 1. TÍNH TOÁN GÓC NGHIÊNG (PCA)
             const meanX = sumX / count;
             const meanY = sumY / count;
             const varX = (sumXX / count) - (meanX * meanX);
             const varY = (sumYY / count) - (meanY * meanY);
             const covXY = (sumXY / count) - (meanX * meanY);

             const delta = varX - varY;
             const rotationRad = 0.5 * Math.atan2(2 * covXY, delta);
             
             const discrimination = Math.sqrt(delta * delta + 4 * covXY * covXY);
             const lambda1 = 0.5 * (varX + varY + discrimination);
             const lambda2 = 0.5 * (varX + varY - discrimination);
             const pcaWidth = Math.sqrt(Math.abs(lambda1) * 12); 
             const pcaHeight = Math.sqrt(Math.abs(lambda2) * 12);

             const degree = rotationRad * (180 / Math.PI);
             const absDeg = Math.abs(degree);
             const isStraight = absDeg < 10 || Math.abs(absDeg - 90) < 10 || Math.abs(absDeg - 180) < 10;

             // 2. TẠO MASK CANVAS (Quan trọng)
             // Tạo một canvas nhỏ chỉ chứa đúng hình dạng cái lỗ
             const maskW = maxX - minX + 1;
             const maskH = maxY - minY + 1;
             const maskCanvas = document.createElement('canvas');
             maskCanvas.width = maskW;
             maskCanvas.height = maskH;
             const maskCtx = maskCanvas.getContext('2d');
             
             // Tạo ImageData để vẽ pixel nhanh
             const maskImgData = maskCtx.createImageData(maskW, maskH);
             const mData = maskImgData.data;

             // Tô màu đen (hoặc bất kỳ màu nào) vào những chỗ là lỗ
             for (let p of pixels) {
                 // Chuyển tọa độ toàn cục về tọa độ cục bộ của mask
                 const lx = p.x - minX;
                 const ly = p.y - minY;
                 const idx = (ly * maskW + lx) * 4;
                 mData[idx] = 0;     // R
                 mData[idx + 1] = 0; // G
                 mData[idx + 2] = 0; // B
                 mData[idx + 3] = 255; // Alpha = 255 (Đục)
             }
             maskCtx.putImageData(maskImgData, 0, 0);

             slots.push({
               centerX: meanX,
               centerY: meanY,
               rotation: isStraight ? 0 : rotationRad, 
               realWidth: pcaWidth,
               realHeight: pcaHeight,
               
               aabbX: minX, 
               aabbY: minY,
               aabbWidth: maskW,
               aabbHeight: maskH,
               
               isStraight: isStraight,
               mask: maskCanvas // <--- Lưu cái khuôn này lại để dùng lúc vẽ
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
  // 2. HÀM VẼ (DÙNG MASKING - KHÔNG LO ĐÈ ẢNH)
  // ===========================================================================
  const drawCompositeHighRes = async (canvasWidth, canvasHeight, frameObj) => {
    // 1. Tạo Canvas chính để chứa kết quả cuối cùng
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvasWidth;
    finalCanvas.height = canvasHeight;
    const finalCtx = finalCanvas.getContext('2d');

    const frameImg = await loadImage(frameObj.frame);
    let slotsToDraw = detectTransparentSlots(frameImg, canvasWidth, canvasHeight);
    
    const safeSelectedSlots = selectedSlots || [];
    const userImages = await Promise.all(safeSelectedSlots.map(s => s && s.photo ? loadImage(s.photo) : null));

    // --- BƯỚC 1: VẼ TỪNG Ô ẢNH LÊN MỘT LAYER RIÊNG RỒI GỘP VÀO ---
    // Ta vẽ thẳng lên finalCtx nhưng dùng Mask để chặn vùng vẽ
    
    slotsToDraw.forEach((slotInfo, idx) => {
        if (idx >= safeSelectedSlots.length || !userImages[idx]) return;
        
        const userImg = userImages[idx];
        const userSlotData = safeSelectedSlots[idx];

        // Tạo một canvas tạm thời (Layer) cho mỗi slot
        // Lý do: source-in ảnh hưởng toàn cục, nên cần làm riêng từng cái
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = canvasWidth;
        layerCanvas.height = canvasHeight;
        const layerCtx = layerCanvas.getContext('2d');

        // A. VẼ MASK (KHUÔN ĐÚC)
        // Vẽ đúng vị trí AABB
        layerCtx.drawImage(slotInfo.mask, slotInfo.aabbX, slotInfo.aabbY);

        // B. BẬT CHẾ ĐỘ 'source-in'
        // Chỉ những pixel nào vẽ sau lệnh này mà nằm TRÊN pixel của Mask mới được hiển thị
        layerCtx.globalCompositeOperation = 'source-in';

        // C. VẼ ẢNH NGƯỜI DÙNG
        let baseW, baseH;
        if (slotInfo.isStraight) {
            baseW = slotInfo.aabbWidth;
            baseH = slotInfo.aabbHeight;
        } else {
            baseW = slotInfo.realWidth;
            baseH = slotInfo.realHeight;
        }

        // --- BÂY GIỜ BẠN CÓ THỂ EXPAND THOẢI MÁI ---
        // Thậm chí 20-30% cũng không sao, vì nó chỉ hiện thị trong vùng Mask thôi
        const expandRatio = 0.2; // Tăng to lên để bao phủ hết góc nghiêng
        
        const targetW = baseW * (1 + expandRatio);
        const targetH = baseH * (1 + expandRatio);
        
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

        layerCtx.save();
        // Dời bút về tâm hình (để xoay)
        const cx = slotInfo.isStraight ? (slotInfo.aabbX + slotInfo.aabbWidth/2) : slotInfo.centerX;
        const cy = slotInfo.isStraight ? (slotInfo.aabbY + slotInfo.aabbHeight/2) : slotInfo.centerY;
        
        layerCtx.translate(cx, cy);
        layerCtx.rotate(slotInfo.rotation);
        
        if (userSlotData.flip) layerCtx.scale(-1, 1);
        
        // Vẽ ảnh căn giữa tâm
        layerCtx.drawImage(userImg, -drawW/2, -drawH/2, drawW, drawH);
        layerCtx.restore();

        // D. VẼ LAYER NÀY VÀO CANVAS CHÍNH
        finalCtx.drawImage(layerCanvas, 0, 0);
    });

    // --- BƯỚC 2: VẼ STICKER ---
    // (Sticker vẽ đè lên ảnh người dùng nhưng nằm dưới khung, hoặc nằm trong vùng aabb)
    // Code sticker giữ nguyên, vẽ trực tiếp lên finalCtx
    for (let idx = 0; idx < slotsToDraw.length; idx++) {
        if (idx >= safeSelectedSlots.length) continue;
        const slotInfo = slotsToDraw[idx];
        const stickers = imageStickers ? imageStickers[idx] : [];
        if (stickers && stickers.length > 0) {
            finalCtx.save();
            finalCtx.beginPath();
            finalCtx.rect(slotInfo.aabbX, slotInfo.aabbY, slotInfo.aabbWidth, slotInfo.aabbHeight);
            finalCtx.clip();
            for (const sticker of stickers) {
               // ... (Giữ nguyên logic vẽ sticker cũ của bạn) ...
               if (sticker.x >= 5 && sticker.x <= 95 && sticker.y >= 5 && sticker.y <= 95) {
                    try {
                        const sImg = await loadImage(sticker.src);
                        const sX = slotInfo.aabbX + (sticker.x / 100) * slotInfo.aabbWidth;
                        const sY = slotInfo.aabbY + (sticker.y / 100) * slotInfo.aabbHeight;
                        finalCtx.translate(sX, sY);
                        finalCtx.rotate((sticker.rotation * Math.PI) / 180);
                        const baseSize = Math.min(slotInfo.aabbWidth, slotInfo.aabbHeight) * 0.25; 
                        const finalSize = baseSize * sticker.scale; 
                        finalCtx.drawImage(sImg, -finalSize/2, -finalSize/2, finalSize, finalSize);
                        finalCtx.translate(-sX, -sY);
                    } catch (e) { }
               }
            }
            finalCtx.restore();
        }
    }

    // --- BƯỚC 3: VẼ KHUNG LÊN TRÊN CÙNG ---
    // Để che đi các vết răng cưa nếu có
    finalCtx.drawImage(frameImg, 0, 0, canvasWidth, canvasHeight);

    return finalCanvas;
  };

// ===========================================================================
// 3. GENERATE VÀ RENDER (ĐÃ TỐI ƯU ĐỘ PHÂN GIẢI CAO 600 DPI)
// ===========================================================================
const generateFinalImage = async () => {
    if (!currentPreviewFrameId || framesList.length === 0) return null;
    const frameObj = framesList.find(f => f.id === currentPreviewFrameId);
    if (!frameObj || !frameObj.frame) return null;

    // TỐI ƯU: Tăng gấp đôi độ phân giải so với code cũ
    // Code cũ: 1200x1800 (300 DPI) -> Mới: 2400x3600 (600 DPI)
    // Máy in HiTi P525L sẽ in đẹp hơn khi nguồn vào nét hơn.
    let w = 2400; 
    let h = 3600;

    // Cut 3 (Strip ngang): Tăng từ 1800x600 lên 3600x1200
    if (cut === "3") { w = 3600; h = 1200; }
    // Cut 41 (Strip dọc): Tăng từ 600x1800 lên 1200x3600
    else if (cut === "41") { w = 1200; h = 3600; }
    
    // Lưu ý: Cut 6 và 42 dùng khổ default (w, h) hoặc bạn có thể custom thêm
    // Ví dụ Cut 6 ngang:
    if (cut === "6") { w = 2400; h = 3600; } // Giữ tỉ lệ 2:3

    try {
      const finalCanvas = await drawCompositeHighRes(w, h, frameObj);
      // Xuất ra PNG để không bị nén (quan trọng)
      return finalCanvas.toDataURL('image/png'); 
    } catch (e) {
      console.error("Generate Error:", e);
      return null;
    }
};

// ... (code còn lại giữ nguyên)

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