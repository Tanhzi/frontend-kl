import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Frame.css';
import { useCountdown } from "../../contexts/CountdownContext";
import Chatbot from '../../components/Chatbot';

function Frame() {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. LẤY THÊM selectedSlots VÀ imageStickers ĐỂ RENDER LẠI CHẤT LƯỢNG CAO
  const {
    photos,
    compositeImage, // Ta sẽ dùng cái này làm backup, nhưng ưu tiên vẽ lại từ selectedSlots
    size,
    cut,
    selectedFrameId: initialSelectedFrameId,
    selectedSlots,   // Dữ liệu ảnh gốc + flip
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

  // === HÀM VẼ ẢNH ĐỘ NÉT CAO (QUAN TRỌNG) ===
  const drawCompositeHighRes = async (canvasWidth, canvasHeight) => {
    // 1. Xác định kích thước và vị trí dựa trên layout (cut)
    // Tính toán lại tỷ lệ theo canvasWidth/Height mới thay vì fix cứng pixel
    let positions = [];
    let imageWidth, imageHeight;

    // Cấu hình padding/gap theo tỷ lệ phần trăm hoặc pixel đã scale
    // Giả sử canvasWidth là chuẩn (ví dụ 1200px)
    // Ta scale các thông số từ SelPhoto (vốn dùng base 600px) lên gấp đôi hoặc theo tỷ lệ
    
    // Hàm helper tính toán layout
    const calculateLayout = () => {
        const W = canvasWidth;
        const H = canvasHeight;
        
        if (cut === '42') { // 2 cột, 2 hàng
            const paddingX = W * (5/600); // Tỷ lệ dựa trên code cũ: padding 5px trên tổng rộng 600
            const paddingY = H * (30/900);
            const gap = W * (1/600);
            const bottomArea = H * (120/900);
            
            imageWidth = (W - paddingX*2 - gap) / 2;
            imageHeight = (H - paddingY - bottomArea - gap) / 2;
            
            return [
                { x: paddingX, y: paddingY },
                { x: paddingX + imageWidth + gap, y: paddingY },
                { x: paddingX, y: paddingY + imageHeight + gap },
                { x: paddingX + imageWidth + gap, y: paddingY + imageHeight + gap }
            ];
        } 
        else if (cut === '41') { // 1 cột, 4 hàng (dải dọc)
            const paddingX = W * (12/300);
            const paddingY = H * (25/900);
            const gap = H * (10/900);
            const bottomArea = H * (90/900);

            imageWidth = W - paddingX * 2;
            imageHeight = (H - paddingY - bottomArea - gap * 3) / 4;
            
            let pos = [];
            for(let i=0; i<4; i++) {
                pos.push({ x: paddingX, y: paddingY + i * (imageHeight + gap) });
            }
            return pos;
        }
        else if (cut === '3') { // 3 cột, 1 hàng (dải ngang)
             const paddingX = W * (25/900);
             const paddingY = H * (40/300);
             const gap = W * (11/900);
             const bottomArea = H * (40/300); // padding bottom trong code cũ là 40

             // Code cũ: W=900, ImgW=276. Tỷ lệ = 276/900
             imageWidth = (W - paddingX*2 - gap*2) / 3;
             // Code cũ: H=300, ImgH=220.
             imageHeight = H - paddingY - bottomArea; 
             
             return [
                 { x: paddingX, y: paddingY },
                 { x: paddingX + imageWidth + gap, y: paddingY },
                 { x: paddingX + imageWidth*2 + gap*2, y: paddingY }
             ];
        }
        else if (cut === '6') { // 2 cột, 3 hàng
            const paddingX = W * (10/600);
            const paddingY = H * (24/900);
            const gap = W * (1/600);
            const bottomArea = H * (120/900);

            imageWidth = (W - paddingX*2 - gap) / 2;
            imageHeight = (H - paddingY - bottomArea - gap*2) / 3;

            let pos = [];
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 2; col++) {
                    const x = paddingX + col * (imageWidth + gap);
                    const y = paddingY + row * (imageHeight + gap);
                    pos.push({ x, y });
                }
            }
            return pos;
        }
        return [];
    };

    positions = calculateLayout();

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // Nếu không có selectedSlots (trường hợp hiếm), fallback dùng compositeImage cũ
    if (!selectedSlots || selectedSlots.length === 0) {
        if (compositeImage) {
            const baseImg = await loadImage(compositeImage);
            ctx.drawImage(baseImg, 0, 0, canvasWidth, canvasHeight);
        }
        return canvas;
    }

    // Load tất cả ảnh con
    // Lưu ý: selectedSlots chứa { photo: 'url...', flip: boolean }
    const imagesToDraw = selectedSlots.slice(0, positions.length); // Chỉ lấy đủ số lượng slot
    const loadedImages = await Promise.all(imagesToDraw.map(s => s && s.photo ? loadImage(s.photo) : null));

    // Vẽ từng ảnh
    imagesToDraw.forEach((slot, idx) => {
        if (!slot || !loadedImages[idx]) return;
        
        const img = loadedImages[idx];
        const pos = positions[idx];

        ctx.save(); // Lưu trạng thái
        
        // Xử lý Flip
        if (slot.flip) {
            ctx.translate(pos.x + imageWidth, pos.y);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
        } else {
            ctx.drawImage(img, pos.x, pos.y, imageWidth, imageHeight);
        }
        
        ctx.restore(); // Khôi phục trạng thái
    });

    // Vẽ Stickers (Nếu có)
    if (imageStickers) {
        for (let idx = 0; idx < positions.length; idx++) {
            const pos = positions[idx];
            const stickers = imageStickers[idx] || [];

            for (const sticker of stickers) {
                // Chỉ vẽ sticker hợp lệ
                if (sticker.x >= 5 && sticker.x <= 95 && sticker.y >= 5 && sticker.y <= 95) {
                    try {
                        const stickerImg = await loadImage(sticker.src);
                        ctx.save();
                        
                        // Tính vị trí tuyệt đối trên canvas to
                        const stickerX = pos.x + (sticker.x / 100) * imageWidth;
                        const stickerY = pos.y + (sticker.y / 100) * imageHeight;

                        ctx.translate(stickerX, stickerY);
                        ctx.rotate((sticker.rotation * Math.PI) / 180);
                        
                        // Scale sticker tương ứng với độ phân giải canvas
                        // Giả sử size chuẩn ở màn hình edit là PreviewHeight = 320px
                        // Ta cần tính tỷ lệ scale của canvas hiện tại so với preview
                        // Tuy nhiên, đơn giản hơn là fix kích thước sticker theo tỷ lệ chiều cao ảnh
                        const baseStickerSize = imageHeight * 0.25; // Sticker chiếm khoảng 25% chiều cao ảnh
                        const finalScale = sticker.scale * (baseStickerSize / 60); // 60 là base size ở SelPhoto

                        ctx.drawImage(stickerImg, -30 * finalScale, -30 * finalScale, 60 * finalScale, 60 * finalScale);
                        
                        ctx.restore();
                    } catch (e) { console.error('Lỗi vẽ sticker:', e); }
                }
            }
        }
    }

    return canvas;
  };

  const createPreviewImage = async () => {
    if (!currentPreviewFrameId || framesList.length === 0) {
      setPreviewImage(null);
      return;
    }

    const frame = framesList.find(f => f.id === currentPreviewFrameId);
    if (!frame?.frame) {
      setPreviewImage(null);
      return;
    }

    try {
      // Xác định kích thước canvas chất lượng cao
      // Ta dùng kích thước lớn hơn (ví dụ gấp 2 hoặc 3 lần so với hiển thị web)
      let w = 1200; 
      let h = 1800;
      
      if (cut === "42" || cut === "6") {
        w = 1200; h = 1800;
      } else if (cut === "3") {
        w = 1800; h = 600;
      } else if (cut === "41") {
        w = 600; h = 1800;
      }

      // BƯỚC 1: TẠO LỚP ẢNH GỐC (HIGH RES)
      const compositeCanvas = await drawCompositeHighRes(w, h);

      // BƯỚC 2: VẼ KHUNG LÊN TRÊN
      const frameImg = await loadImage(frame.frame);
      const ctx = compositeCanvas.getContext('2d');
      ctx.drawImage(frameImg, 0, 0, w, h);

      setPreviewImage(compositeCanvas.toDataURL('image/png'));
    } catch (error) {
      console.error("Preview error:", error);
      setPreviewImage(null);
    }
  };

  useEffect(() => {
    createPreviewImage();
  }, [compositeImage, currentPreviewFrameId, framesList, cut, selectedSlots, imageStickers]);

  const navigateToQr = async () => {
    if (!currentPreviewFrameId) return;
    const frame = framesList.find(f => f.id === currentPreviewFrameId);
    if (!frame) return;

    try {
      // TẠO ẢNH CUỐI CÙNG (LOGIC GIỐNG HỆT PREVIEW NHƯNG CHẮC CHẮN LÀ FULL SIZE)
      let w = 1200; 
      let h = 1800;
      if (cut === "3") { w = 1800; h = 600; }
      else if (cut === "41") { w = 600; h = 1800; }

      const compositeCanvas = await drawCompositeHighRes(w, h);
      const frameImg = await loadImage(frame.frame);
      const ctx = compositeCanvas.getContext('2d');
      ctx.drawImage(frameImg, 0, 0, w, h);

      navigate('/Qr', {
        state: {
          id_pay: latestPaymentId,
          id_frame: frame.id,
          photos,
          // Gửi ảnh HD sang trang QR/In
          finalImage: compositeCanvas.toDataURL('image/png'), 
          size,
          cut
        }
      });
    } catch (error) {
      console.error("QR navigation error:", error);
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
                style={{ imageRendering: 'high-quality' }} // CSS hint cho trình duyệt
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