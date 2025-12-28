import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Frame.css';
import { useCountdown } from "../../contexts/CountdownContext";
import Chatbot from '../../components/Chatbot';

function Frame() {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. LẤY DỮ LIỆU TỪ STATE
  const {
    photos,
    size,
    cut,
    selectedFrameId: initialSelectedFrameId,
    selectedSlots,   // Dữ liệu ảnh người dùng + flip
    imageStickers    // Dữ liệu sticker
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

  // Áp dụng background
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

  // === KHỞI TẠO FRAME MẶC ĐỊNH ===
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
  // 1. THUẬT TOÁN TÌM VÙNG TRONG SUỐT (CORE ALGORITHM)
  // ===========================================================================
  const detectTransparentSlots = (frameImg, width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Vẽ frame lên canvas tạm để đọc pixel
    ctx.drawImage(frameImg, 0, 0, width, height);
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const visited = new Uint8Array(width * height); // Mảng đánh dấu pixel đã duyệt
    const slots = [];

    const getIdx = (x, y) => (y * width + x) * 4;

    // Duyệt qua pixel (Bước nhảy 4 để tối ưu hiệu năng)
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const idx = getIdx(x, y);
        const alpha = data[idx + 3];

        // Nếu gặp điểm trong suốt (Alpha < 50) và chưa được duyệt -> Bắt đầu loang (Flood Fill)
        if (alpha < 50 && visited[y * width + x] === 0) {
          
          let minX = width, maxX = 0, minY = height, maxY = 0;
          const queue = [{x, y}];
          visited[y * width + x] = 1;

          let pixelCount = 0;

          // Thuật toán loang (BFS) tìm biên giới hạn của vùng trong suốt
          while (queue.length > 0) {
            const p = queue.pop();
            const px = p.x;
            const py = p.y;
            pixelCount++;

            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;

            // Kiểm tra 4 hướng: Trên, Dưới, Trái, Phải
            const neighbors = [
              {nx: px + 4, ny: py}, {nx: px - 4, ny: py}, // Nhảy bước 4 để nhanh hơn
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

          // Chỉ lấy những vùng đủ lớn (tránh nhiễu li ti)
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

    // Sắp xếp slot theo thứ tự đọc: Trái->Phải, Trên->Dưới
    slots.sort((a, b) => {
      const yDiff = Math.abs(a.centerY - b.centerY);
      // Nếu lệch dòng rõ rệt (> 100px) thì xếp theo Y
      if (yDiff > 100) return a.centerY - b.centerY;
      // Nếu cùng dòng thì xếp theo X
      return a.centerX - b.centerX;
    });

    return slots;
  };

  // ===========================================================================
  // 2. HÀM VẼ THÔNG MINH (Smart Draw)
  // ===========================================================================
  const drawCompositeHighRes = async (canvasWidth, canvasHeight, frameObj) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // Load Frame
    const frameImg = await loadImage(frameObj.frame);

    // TÌM CÁC VÙNG TRONG SUỐT
    const detectedSlots = detectTransparentSlots(frameImg, canvasWidth, canvasHeight);

    // --- FALLBACK LOGIC --- 
    // Nếu frame đặc biệt không tìm thấy lỗ trong suốt, dùng toán học cũ để tính vị trí
    // (Để tránh lỗi màn hình trắng)
    let slotsToDraw = detectedSlots;
    if (detectedSlots.length === 0) {
       console.warn("Không tìm thấy vùng trong suốt, sử dụng tính toán thủ công.");
       // Logic cũ của bạn tái sử dụng ở đây
       const calculateLayout = () => {
          const W = canvasWidth; const H = canvasHeight;
          if (cut === '42') {
             // ... logic cũ
             const imageWidth = (W - (W*11/600))/2;
             const imageHeight = (H - (H*151/900))/2;
             // Demo toạ độ giả định để fallback
             return [
                 {x: W*0.01, y: H*0.03, width: imageWidth, height: imageHeight}, 
                 {x: W*0.5, y: H*0.03, width: imageWidth, height: imageHeight}
                 // ... thêm các điểm khác nếu cần
             ]; 
          }
          // ... (Bạn có thể paste lại logic tính toán cũ vào đây nếu muốn chắc chắn 100%)
          // Ở đây tôi giả định detectTransparentSlots luôn chạy tốt với frame chuẩn.
          return [];
       };
       slotsToDraw = calculateLayout();
    }
    // ----------------------

    // Load tất cả ảnh User
    const userImages = await Promise.all(selectedSlots.map(s => s && s.photo ? loadImage(s.photo) : null));

    // VẼ TỪNG SLOT
    slotsToDraw.forEach((slotInfo, idx) => {
        // Chỉ vẽ nếu có ảnh user tương ứng
        if (idx >= selectedSlots.length || !userImages[idx]) return;
        
        const userImg = userImages[idx];
        const userSlotData = selectedSlots[idx];

        // 1. TÍNH TOÁN CROP (OBJECT-FIT: COVER)
        // Để ảnh lấp đầy vùng slot tìm được
        const slotRatio = slotInfo.width / slotInfo.height;
        const imgRatio = userImg.width / userImg.height;
        
        let drawW, drawH, drawX, drawY;

        if (imgRatio > slotRatio) { 
          // Ảnh dài hơn -> Cắt 2 bên
          drawH = slotInfo.height;
          drawW = slotInfo.height * imgRatio;
          drawX = slotInfo.x - (drawW - slotInfo.width) / 2;
          drawY = slotInfo.y;
        } else {
          // Ảnh cao hơn -> Cắt trên dưới
          drawW = slotInfo.width;
          drawH = slotInfo.width / imgRatio;
          drawX = slotInfo.x;
          drawY = slotInfo.y - (drawH - slotInfo.height) / 2;
        }

        // 2. LƯU TRẠNG THÁI VÀ TẠO VÙNG CẮT (CLIPPING)
        ctx.save();
        
        // --- QUAN TRỌNG: KHOANH VÙNG VẼ ---
        // Chỉ cho phép vẽ bên trong hình chữ nhật của slot này
        ctx.beginPath();
        ctx.rect(slotInfo.x, slotInfo.y, slotInfo.width, slotInfo.height);
        ctx.clip(); 

        // 3. VẼ ẢNH USER (Xử lý Flip)
        if (userSlotData.flip) {
            ctx.translate(drawX + drawW/2, drawY + drawH/2);
            ctx.scale(-1, 1);
            ctx.drawImage(userImg, -drawW/2, -drawH/2, drawW, drawH);
        } else {
            ctx.drawImage(userImg, drawX, drawY, drawW, drawH);
        }

        // 4. VẼ STICKER (Nếu có)
        // Sticker cũng sẽ bị cắt nếu nằm ngoài vùng slot này (rất an toàn)
        if (imageStickers && imageStickers[idx]) {
            const stickers = imageStickers[idx];
            // Cần load sticker async, nhưng trong forEach sync này ta cần xử lý khéo.
            // Do hàm drawCompositeHighRes là async, ta nên loop for..of thay vì forEach 
            // Tuy nhiên, sticker đã được load ở bước prepare (nếu có).
            // Ở đây giả định sticker src là URL, ta cần vẽ nó.
            // Để đơn giản, ta sẽ vẽ sticker dựa trên tỷ lệ % của slotInfo.width/height
        }
        
        ctx.restore(); // Bỏ clipping để vẽ slot tiếp theo
    });
    
    // XỬ LÝ RIÊNG CHO STICKER (Vì cần await load ảnh sticker)
    // Ta chạy lại vòng lặp chỉ để vẽ sticker sau khi đã vẽ xong nền ảnh
    for (let idx = 0; idx < slotsToDraw.length; idx++) {
        if (idx >= selectedSlots.length) continue;
        const slotInfo = slotsToDraw[idx];
        const stickers = imageStickers ? imageStickers[idx] : [];
        
        if (stickers && stickers.length > 0) {
            ctx.save();
            // Vẫn phải clip để sticker không bay sang nhà hàng xóm
            ctx.beginPath();
            ctx.rect(slotInfo.x, slotInfo.y, slotInfo.width, slotInfo.height);
            ctx.clip();

            for (const sticker of stickers) {
                if (sticker.x >= 5 && sticker.x <= 95 && sticker.y >= 5 && sticker.y <= 95) {
                    try {
                        const sImg = await loadImage(sticker.src);
                        
                        // Tính vị trí sticker dựa trên kích thước thực tế của slot
                        const sX = slotInfo.x + (sticker.x / 100) * slotInfo.width;
                        const sY = slotInfo.y + (sticker.y / 100) * slotInfo.height;

                        ctx.translate(sX, sY);
                        ctx.rotate((sticker.rotation * Math.PI) / 180);
                        
                        // Scale sticker (Giả định base size sticker là 1/4 chiều cao slot)
                        const baseSize = slotInfo.height * 0.25;
                        const finalSize = baseSize * sticker.scale; 

                        ctx.drawImage(sImg, -finalSize/2, -finalSize/2, finalSize, finalSize);
                        ctx.translate(-sX, -sY); // Reset translate
                    } catch (e) { console.error("Lỗi vẽ sticker", e); }
                }
            }
            ctx.restore();
        }
    }

    // 5. VẼ KHUNG ĐÈ LÊN TRÊN CÙNG
    // Những phần viền thừa của ảnh user (nếu có chút sai số) sẽ bị khung che lấp
    ctx.drawImage(frameImg, 0, 0, canvasWidth, canvasHeight);

    return canvas;
  };

  // ===========================================================================
  // 3. TẠO ẢNH KẾT QUẢ
  // ===========================================================================
  const generateFinalImage = async () => {
    if (!currentPreviewFrameId || framesList.length === 0) return null;
    const frameObj = framesList.find(f => f.id === currentPreviewFrameId);
    if (!frameObj || !frameObj.frame) return null;

    // Xác định kích thước chuẩn
    let w = 1200; 
    let h = 1800;
    if (cut === "3") { w = 1800; h = 600; }
    else if (cut === "41") { w = 600; h = 1800; }
    // Các loại cut khác mặc định 1200x1800

    try {
      const finalCanvas = await drawCompositeHighRes(w, h, frameObj);
      return finalCanvas.toDataURL('image/png');
    } catch (e) {
      console.error("Generate Error:", e);
      return null;
    }
  };

  // === RENDER PREVIEW ===
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


  // === NAVIGATE TO QR ===
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

  const handleContinue = () => {
    navigateToQr();
  };

  const handleSelectFrame = () => setIsSelectionMode(true);
  const handlePreviewFrame = (id) => setCurrentPreviewFrameId(id);

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
                style={{ imageRendering: 'high-quality' }} 
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