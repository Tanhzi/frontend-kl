import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './SelPhoto.css';
import { useCountdown } from "../../contexts/CountdownContext";
import FilterSection from './components/FilterSection';
import StickerSection from './components/StickerSection';
import ImagePreview from './components/ImagePreview';
import FaceSwapSection from './components/FaceSwapSection';
import Chatbot from '../../components/Chatbot';
import Lottie from 'lottie-react';

const SelPhoto = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showWelcomeBot, setShowWelcomeBot] = useState(true);
  const [robotLottie, setRobotLottie] = useState(null);

  const { photos, cut, frameType, size, selectedFrameId, selectedFrame } = location.state || {
    photos: [],
    cut: '3',
    frameType: 'default',
    size: 'default'
  };

  // State cho tabs navigation
  const [activeTab, setActiveTab] = useState('filter'); // 'filter', 'sticker', 'faceswap', 'background'
  const [swappedCache, setSwappedCache] = useState({});

  // State cho các bộ lọc
  const filters = [
    { id: 'original', name: 'Gốc', filter: 'none' },
    { id: 'grayscale', name: 'Thanh xám', filter: 'grayscale(100%)' },
    { id: 'vibe', name: 'Vibe', filter: 'sepia(50%) saturate(150%) hue-rotate(15deg)' },
    { id: 'bright', name: 'Sáng', filter: 'brightness(120%) contrast(110%)' },
    { id: 'smooth', name: 'Mịn da', filter: 'blur(0.5px) brightness(105%) contrast(95%)' },
    { id: 'primer', name: 'Primer soda', filter: 'saturate(120%) contrast(110%) hue-rotate(10deg)' },
    { id: 'soly', name: 'Soly', filter: 'sepia(30%) saturate(130%) brightness(110%)' }
  ];

  // Khởi tạo số ô (slots) dựa theo cut
  const getInitialSlots = () => {
    if (cut === '3') return Array(3).fill(null);
    if (cut === '41') return Array(4).fill(null);
    if (cut === '42') return Array(4).fill(null);
    if (cut === '6') return Array(6).fill(null);
    return Array(4).fill(null);
  };

  const [selectedSlots, setSelectedSlots] = useState(getInitialSlots());
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState({});
  const [allSlotsFilled, setAllSlotsFilled] = useState(false);
  const [loading, setLoading] = useState(false);

  // State cho original images (để compare)
  const [originalImages, setOriginalImages] = useState({});

  // State cho stickers
  const [allStickers, setAllStickers] = useState([]);
  const [filteredStickers, setFilteredStickers] = useState([]);
  const [stickerTypes, setStickerTypes] = useState([]);
  const [selectedStickerType, setSelectedStickerType] = useState('all');
  const [showStickerTypeDropdown, setShowStickerTypeDropdown] = useState(false);
  const [loadingStickers, setLoadingStickers] = useState(true);

  // === STATE CHO BACKGROUND AI ===
  const [bgTemplates, setBgTemplates] = useState([]);       
  const [filteredBgTemplates, setFilteredBgTemplates] = useState([]); 
  const [bgCategories, setBgCategories] = useState([]);     
  const [selectedBgCategory, setSelectedBgCategory] = useState('all');
  const [loadingBgTemplates, setLoadingBgTemplates] = useState(false);
  const [selectedBgId, setSelectedBgId] = useState(null);   
  const [isProcessingBg, setIsProcessingBg] = useState(false); 
  const [bgCache, setBgCache] = useState({}); // Cache cho background: { [imgIdx]: { [templateId]: base64 } }

  // State cho stickers trên preview image (MỖI ẢNH CÓ STICKERS RIÊNG)
  const [imageStickers, setImageStickers] = useState({});
  const [selectedPreviewStickerId, setSelectedPreviewStickerId] = useState(null);

  // State cho FaceSwap (để tương lai)
  const [faceSwapData, setFaceSwapData] = useState({});

  // State cho BackgroundAI (để tương lai)
  const [backgroundAIData, setBackgroundAIData] = useState({});

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // === STATE CHO FACESWAP ===
  const [swapTemplates, setSwapTemplates] = useState([]);       // Dữ liệu gốc từ API
  const [filteredSwapTemplates, setFilteredSwapTemplates] = useState([]); // Dữ liệu sau khi filter
  const [swapCategories, setSwapCategories] = useState([]);     // Danh sách category
  const [selectedSwapCategory, setSelectedSwapCategory] = useState('all');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedSwapId, setSelectedSwapId] = useState(null);   // ID template đang chọn
  const [isProcessingSwap, setIsProcessingSwap] = useState(false); // Loading khi đang swap

  // Load Lottie chào mừng
  useEffect(() => {
    fetch('/lotties/Robotsayshello.json')
      .then((res) => {
        if (!res.ok) throw new Error('Không tìm thấy file Lottie');
        return res.json();
      })
      .then((json) => setRobotLottie(json))
      .catch((err) => {
        console.error('Lỗi khi tải animation robot:', err);
        setShowWelcomeBot(false);
      });
  }, []);

  // Close welcome bot after animation completes
  useEffect(() => {
    if (robotLottie) {
      const timer = setTimeout(() => {
        setShowWelcomeBot(false);
      }, 10000); // Hide after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [robotLottie]);

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

  // Tự động điền ảnh vào slots khi component mount
  useEffect(() => {
    if (photos && photos.length > 0) {
      const initialSlots = getInitialSlots();
      const filledSlots = initialSlots.map((_, index) => {
        if (index < photos.length) {
          return { photo: photos[index], flip: false };
        }
        return null;
      });
      setSelectedSlots(filledSlots);

      const initialFilters = {};
      filledSlots.forEach((slot, index) => {
        if (slot) {
          initialFilters[index] = 'original';
        }
      });
      setAppliedFilters(initialFilters);

      const initialOriginals = {};
      filledSlots.forEach((slot, index) => {
        if (slot) {
          initialOriginals[index] = slot.photo;
        }
      });
      setOriginalImages(initialOriginals);

      // Khởi tạo imageStickers cho mỗi ảnh
      const initialImageStickers = {};
      filledSlots.forEach((slot, index) => {
        if (slot) {
          initialImageStickers[index] = [];
        }
      });
      setImageStickers(initialImageStickers);
    }
  }, [photos, cut]);

  //
// === FETCH DỮ LIỆU FACESWAP VÀ BACKGROUND AI ===
  useEffect(() => {
    const fetchAITemplates = async () => {
      try {
        const authStr = localStorage.getItem('auth');
        let id_admin = '';
        if (authStr) { try { id_admin = JSON.parse(authStr).id_admin; } catch {} }
        
        setLoadingTemplates(true);
        setLoadingBgTemplates(true);

        // 1. Fetch Face Swap (type=swap hoặc mặc định)
        const swapUrl = `${API_URL}/ai-topics?id_admin=${id_admin}&type=swap`; // Giả định API hỗ trợ filter
        const bgUrl = `${API_URL}/ai-topics?id_admin=${id_admin}&type=background`;

        // Gọi song song 2 API
        const [swapRes, bgRes] = await Promise.all([
            fetch(swapUrl).catch(() => null),
            fetch(bgUrl).catch(() => null)
        ]);
        
        // Xử lý dữ liệu Face Swap
        if (swapRes && swapRes.ok) {
            const data = await swapRes.json();
            if (data.status === 'success') {
                setSwapTemplates(data.data || []);
                setFilteredSwapTemplates(data.data || []);
                const uniqueTopics = [...new Set(data.data.map(item => item.topic).filter(Boolean))];
                setSwapCategories(uniqueTopics || []);
                console.log('Swap categories:', uniqueTopics);
                console.log('Swap data:', data.data);
                console.log('Swap data keys:', Object.keys(data.data[0] || {}));
            }
        }

        // Xử lý dữ liệu Background AI
        if (bgRes && bgRes.ok) {
            const data = await bgRes.json();
            if (data.status === 'success') {
                setBgTemplates(data.data || []);
                setFilteredBgTemplates(data.data || []);
                const uniqueNames = [...new Set(data.data.map(item => item.name).filter(Boolean))];
                setBgCategories(uniqueNames || []);
                console.log('Background categories:', uniqueNames);
                console.log('Background data:', data.data);
                console.log('Background data keys:', Object.keys(data.data[0] || {}));
            }
        }

      } catch (error) {
        console.error('[ERROR] Lỗi tải AI Templates:', error);
      } finally {
        setLoadingTemplates(false);
        setLoadingBgTemplates(false);
      }
    };
    
    fetchAITemplates();
  }, []);

  // === FILTER CATEGORY CHO BACKGROUND ===
  useEffect(() => {
    if (selectedBgCategory === 'all') {
      setFilteredBgTemplates(bgTemplates);
    } else {
      setFilteredBgTemplates(bgTemplates.filter(t => t.type === selectedBgCategory || t.name === selectedBgCategory));
    }
  }, [selectedBgCategory, bgTemplates]);

    useEffect(() => {
    if (selectedSwapCategory === 'all') {
      setFilteredSwapTemplates(swapTemplates);
    } else {
      setFilteredSwapTemplates(swapTemplates.filter(t => t.topic === selectedSwapCategory));
    }
  }, [selectedSwapCategory, swapTemplates]);

// === HÀM HỖ TRỢ: CHUYỂN URL/BASE64 THÀNH FILE OBJECT ===
  // (Đảm bảo hàm này nằm trong component SelPhoto hoặc bên ngoài trước khi gọi)
  const urlToFile = async (url, filename, mimeType) => {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    return new File([buf], filename, { type: mimeType });
  };

  // === LOGIC THỰC HIỆN FACE SWAP (ĐÃ CẬP NHẬT) ===
  const handleFaceSwap = async (template) => {
    const currentSlot = selectedSlots[selectedImageIndex];
    
    // 1. Validate: Kiểm tra đã chọn ảnh chưa
    if (!currentSlot || !currentSlot.photo) {
      alert("Vui lòng chọn hoặc chụp ảnh trước khi Face Swap!");
      return;
    }
    
    // Nếu đang chọn lại chính template đó thì bỏ qua
    if (selectedSwapId === template.id) return;

    // 2. KIỂM TRA CACHE (Nếu đã làm rồi thì lấy lại kết quả cũ cho nhanh)
    if (swappedCache[selectedImageIndex] && swappedCache[selectedImageIndex][template.id]) {
      console.log('[CACHE] Lấy ảnh FaceSwap từ bộ nhớ đệm...');
      
      // Lưu ảnh gốc để restore sau này nếu chưa lưu
      if (!originalImages[selectedImageIndex]) {
        setOriginalImages(prev => ({
          ...prev,
          [selectedImageIndex]: currentSlot.photo
        }));
      }

      const cachedImage = swappedCache[selectedImageIndex][template.id];
      const updatedSlots = [...selectedSlots];
      updatedSlots[selectedImageIndex] = {
        ...updatedSlots[selectedImageIndex],
        photo: cachedImage
      };
      setSelectedSlots(updatedSlots);
      setSelectedSwapId(template.id);
      setAppliedFilters(prev => ({ ...prev, [selectedImageIndex]: 'original' }));
      return;
    }

    // 3. BẮT ĐẦU XỬ LÝ API
    try {
      setIsProcessingSwap(true);
      setSelectedSwapId(template.id);

      // --- BƯỚC A: CHUẨN BỊ ẢNH NGUỒN (ẢNH NGƯỜI DÙNG) ---
      let sourceFile;
      if (currentSlot.photo.startsWith('data:')) {
        // Xử lý nếu là Base64 (ảnh chụp trực tiếp)
        const arr = currentSlot.photo.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){ u8arr[n] = bstr.charCodeAt(n); }
        sourceFile = new File([u8arr], "source.jpg", {type: mime});
      } else {
        // Xử lý nếu là URL (ảnh upload)
        sourceFile = await urlToFile(currentSlot.photo, "source.jpg", "image/jpeg");
      }

      // --- BƯỚC B: XÁC ĐỊNH ẢNH ĐÍCH (TARGET) ---
      let targetFile;

      // KIỂM TRA: Template có prompt không?
      if (template.prompt && template.prompt.trim() !== "") {
          // === TRƯỜNG HỢP 1: CÓ PROMPT => TẠO ẢNH ĐÍCH MỚI BẰNG AI ===
          console.log('[FACESWAP] Đang tạo ảnh đích từ Prompt + Giới tính...');
          
          const genFormData = new FormData();
          genFormData.append('image', sourceFile); // Gửi ảnh gốc để AI check giới tính
          genFormData.append('prompt', template.prompt);

          // Gọi API Bridge (Port 5000)
          const genRes = await fetch('http://localhost:5000/user-generate-target', {
              method: 'POST',
              body: genFormData
          });
          
          const genData = await genRes.json();
          if (!genData.success) {
            throw new Error(genData.error || "Lỗi khi tạo ảnh đích (Gen AI)");
          }

          // Chuyển kết quả ảnh đích (Base64) thành File để chuẩn bị Swap
          // Lưu ý: genData.target_image là base64 trả về từ server
          const targetRes = await fetch(genData.target_image);
          const targetBlob = await targetRes.blob();
          targetFile = new File([targetBlob], "target_gen.jpg", { type: "image/jpeg" });

      } else {
          // === TRƯỜNG HỢP 2: KHÔNG PROMPT => DÙNG ẢNH TEMPLATE CÓ SẴN ===
          console.log('[FACESWAP] Sử dụng ảnh mẫu có sẵn làm đích...');
          targetFile = await urlToFile(template.illustration, "target_static.jpg", "image/jpeg");
      }

      // --- BƯỚC C: THỰC HIỆN FACE SWAP (GỘP) ---
      // (Dù là ảnh đích tự tạo hay ảnh mẫu thì đều chạy qua bước này)
      console.log('[FACESWAP] Đang thực hiện hoán đổi khuôn mặt...');

      const swapFormData = new FormData();
      swapFormData.append('source', sourceFile);
      swapFormData.append('target', targetFile);

      const response = await fetch('http://localhost:5000/face-swap', {
        method: 'POST',
        body: swapFormData
      });

      const data = await response.json();

      if (data.success && data.swapped_image) {
        // 1. Lưu ảnh gốc để có thể "Reset"
        let originalPhoto = originalImages[selectedImageIndex];
        if (!originalPhoto) {
          originalPhoto = currentSlot.photo;
          setOriginalImages(prev => ({
            ...prev,
            [selectedImageIndex]: originalPhoto
          }));
        }

        // 2. Cắt ảnh (Crop) cho đúng tỉ lệ khung hình
        const croppedImage = await cropImageToMatchOriginal(data.swapped_image, originalPhoto);

        // 3. Lưu vào Cache
        setSwappedCache(prev => ({
          ...prev,
          [selectedImageIndex]: {
            ...(prev[selectedImageIndex] || {}),
            [template.id]: croppedImage
          }
        }));

        // 4. Cập nhật Slot hiển thị
        const updatedSlots = [...selectedSlots];
        updatedSlots[selectedImageIndex] = {
          ...updatedSlots[selectedImageIndex],
          photo: croppedImage
        };
        setSelectedSlots(updatedSlots);
        
        // Reset filter về 'original' vì ảnh AI đã đẹp sẵn rồi
        setAppliedFilters(prev => ({ ...prev, [selectedImageIndex]: 'original' }));
        
      } else {
        throw new Error(data.error || "Lỗi không xác định từ Server FaceSwap");
      }

    } catch (error) {
      console.error('[FACESWAP ERROR]', error);
      alert(`Lỗi Face Swap: ${error.message}`);
      // Nếu lỗi thì bỏ chọn template để user có thể ấn lại
      setSelectedSwapId(null);
    } finally {
      setIsProcessingSwap(false);
    }
  };

  // === LOGIC THỰC HIỆN FACE SWAP ===
// === 1. HÀM CẮT ẢNH TỪ TÂM (CENTER CROP) ===
  const cropImageToMatchOriginal = async (swapResultBase64, originalPhotoUrl) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Load ảnh gốc để lấy tỉ lệ chuẩn
        const originalImg = await loadImage(originalPhotoUrl);
        const targetRatio = originalImg.width / originalImg.height;

        // Load ảnh kết quả từ Face Swap
        const swapImg = await loadImage(swapResultBase64);
        const currentRatio = swapImg.width / swapImg.height;

        // Tạo Canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Logic tính toán vùng cắt (Crop Center)
        let renderWidth, renderHeight, offsetX, offsetY;

        // Nếu ảnh kết quả "dài" hơn ảnh gốc (so với tỉ lệ) => Cắt bớt chiều ngang
        if (currentRatio > targetRatio) {
          renderHeight = swapImg.height;
          renderWidth = swapImg.height * targetRatio;
          offsetX = (swapImg.width - renderWidth) / 2;
          offsetY = 0;
        } 
        // Nếu ảnh kết quả "cao" hơn ảnh gốc => Cắt bớt chiều dọc
        else {
          renderWidth = swapImg.width;
          renderHeight = swapImg.width / targetRatio;
          offsetX = 0;
          offsetY = (swapImg.height - renderHeight) / 2;
        }

        // Set kích thước canvas bằng kích thước vùng cắt (để giữ độ nét cao nhất)
        canvas.width = renderWidth;
        canvas.height = renderHeight;

        // Vẽ ảnh đã cắt vào canvas
        ctx.drawImage(
          swapImg,
          offsetX, offsetY, renderWidth, renderHeight, // Source crop
          0, 0, renderWidth, renderHeight              // Destination
        );

        // Trả về base64
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (e) {
        console.error("Lỗi crop ảnh:", e);
        resolve(swapResultBase64); // Nếu lỗi thì trả về ảnh gốc chưa cắt
      }
    });
  };

// === LOGIC THỰC HIỆN BACKGROUND AI ===
// === LOGIC THỰC HIỆN BACKGROUND AI (ĐÃ SỬA) ===
  const handleBackgroundAI = async (template) => {
    const currentSlot = selectedSlots[selectedImageIndex];
    
    // 1. Validate: Phải có ảnh người trước
    if (!currentSlot || !currentSlot.photo) {
      alert("Vui lòng chọn hoặc chụp ảnh trước khi ghép nền!");
      return;
    }
    
    // Nếu click lại template đang chọn thì bỏ qua
    if (selectedBgId === template.id) return;

    // 2. KIỂM TRA CACHE (Nếu đã làm rồi thì lấy lại ngay)
    if (bgCache[selectedImageIndex] && bgCache[selectedImageIndex][template.id]) {
      console.log('[CACHE] Lấy ảnh Background từ bộ nhớ đệm...');
      
      // Lưu ảnh gốc nếu chưa lưu
      if (!originalImages[selectedImageIndex]) {
        setOriginalImages(prev => ({...prev, [selectedImageIndex]: currentSlot.photo}));
      }

      const cachedImage = bgCache[selectedImageIndex][template.id];
      
      // Cập nhật UI
      const updatedSlots = [...selectedSlots];
      updatedSlots[selectedImageIndex] = { ...updatedSlots[selectedImageIndex], photo: cachedImage };
      setSelectedSlots(updatedSlots);
      setSelectedBgId(template.id);
      setAppliedFilters(prev => ({ ...prev, [selectedImageIndex]: 'original' })); // Reset filter
      return;
    }

    // 3. GỌI API XỬ LÝ
    try {
      setIsProcessingBg(true); // Bật loading
      setSelectedBgId(template.id);

      // --- Bước A: Chuẩn bị file Foreground (Ảnh người dùng) ---
      let sourceFile;
      if (currentSlot.photo.startsWith('data:')) {
        // Nếu là ảnh chụp cam (base64) -> convert sang File
        const arr = currentSlot.photo.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){ u8arr[n] = bstr.charCodeAt(n); }
        sourceFile = new File([u8arr], "foreground.jpg", {type: mime});
      } else {
        // Nếu là ảnh upload (URL blob) -> convert sang File
        sourceFile = await urlToFile(currentSlot.photo, "foreground.jpg", "image/jpeg");
      }

      // --- Bước B: Chuẩn bị file Background (Ảnh mẫu) ---
      // template.illustration là URL của ảnh nền mẫu trên server/admin
      const targetFile = await urlToFile(template.illustration, "background.jpg", "image/jpeg");

      // --- Bước C: Gửi FormData ---
      const formData = new FormData();
      formData.append('foreground', sourceFile);
      formData.append('background', targetFile);

      console.log('[BG-AI] Đang gửi yêu cầu ghép nền...');
      
      // Gọi về Bridge Server (Localhost:5000)
      const response = await fetch('http://localhost:5000/background-ai', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success && data.result_image) {
        // 1. Lưu ảnh gốc để restore sau này
        let originalPhoto = originalImages[selectedImageIndex];
        if (!originalPhoto) {
          originalPhoto = currentSlot.photo;
          setOriginalImages(prev => ({ ...prev, [selectedImageIndex]: originalPhoto }));
        }

        // 2. CẮT ẢNH (CROP) CHO ĐÚNG TỈ LỆ KHUNG HÌNH
        // (Dùng lại hàm cropImageToMatchOriginal của phần FaceSwap)
        const croppedImage = await cropImageToMatchOriginal(data.result_image, originalPhoto);

        // 3. LƯU CACHE
        setBgCache(prev => ({
          ...prev,
          [selectedImageIndex]: {
            ...(prev[selectedImageIndex] || {}),
            [template.id]: croppedImage
          }
        }));

        // 4. HIỂN THỊ LÊN SLOT
        const updatedSlots = [...selectedSlots];
        updatedSlots[selectedImageIndex] = { ...updatedSlots[selectedImageIndex], photo: croppedImage };
        setSelectedSlots(updatedSlots);
        
        // Reset filter về original để ảnh đẹp nhất
        setAppliedFilters(prev => ({ ...prev, [selectedImageIndex]: 'original' }));
        
      } else {
        throw new Error(data.error || "Lỗi xử lý từ Server");
      }

    } catch (error) {
      console.error('[BG-AI ERROR]', error);
      alert(`Lỗi ghép nền: ${error.message}`);
      setSelectedBgId(null); // Bỏ chọn nếu lỗi
    } finally {
      setIsProcessingBg(false); // Tắt loading
    }
  };
  
  // Logic Reset chung cho cả FaceSwap và Background
  const handleResetAI = () => {
     if (!originalImages[selectedImageIndex]) return;

     const updatedSlots = [...selectedSlots];
     updatedSlots[selectedImageIndex] = {
         ...updatedSlots[selectedImageIndex],
         photo: originalImages[selectedImageIndex]
     };
     setSelectedSlots(updatedSlots);
     
     // Reset cả 2 selection
     setSelectedSwapId(null); 
     setSelectedBgId(null);
  };

  // === LOGIC RESET VỀ ẢNH GỐC ===
  const handleResetSwap = () => {
     if (!originalImages[selectedImageIndex]) return;

     // Khôi phục ảnh gốc
     const updatedSlots = [...selectedSlots];
     updatedSlots[selectedImageIndex] = {
         ...updatedSlots[selectedImageIndex],
         photo: originalImages[selectedImageIndex]
     };
     setSelectedSlots(updatedSlots);
     
     setSelectedSwapId(null); // Bỏ chọn template
  };

  // Fetch stickers từ API với proper error handling
  useEffect(() => {
    const fetchStickers = async () => {
      try {
        setLoadingStickers(true);

        const authStr = localStorage.getItem('auth');
        console.log('[DEBUG] Auth from localStorage:', authStr);

        if (!authStr) {
          console.error('[ERROR] Không tìm thấy auth trong localStorage');
          setLoadingStickers(false);
          return;
        }

        let auth;
        try {
          auth = JSON.parse(authStr);
        } catch (e) {
          console.error('[ERROR] Parse auth JSON thất bại');
          setLoadingStickers(false);
          return;
        }

        const id_admin = auth.id_admin;

        if (!id_admin) {
          console.error('[ERROR] Không tìm thấy id_admin trong auth');
          setLoadingStickers(false);
          return;
        }

        console.log('[DEBUG] Using id_admin:', id_admin);

        const url = `${API_URL}/stickers?id_admin=${id_admin}&limit=1000`;
        console.log('[DEBUG] Fetching stickers from:', url);

        const response = await fetch(url);
        console.log('[DEBUG] Response status:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('[DEBUG] Response data:', data);

        if (data.status === 'success') {
          console.log('[SUCCESS] Loaded', data.data?.length || 0, 'stickers');
          setAllStickers(data.data || []);
          setFilteredStickers(data.data || []);

          const types = [...new Set((data.data || []).map(s => s.type).filter(Boolean))];
          console.log('[DEBUG] Sticker types:', types);
          setStickerTypes(types.length > 0 ? types : []);
        } else {
          console.error('[ERROR] API returned error:', data.message || 'Unknown');
          setAllStickers([]);
          setFilteredStickers([]);
        }
      } catch (error) {
        console.error('[ERROR] Lỗi tải stickers:', error);
        setAllStickers([]);
        setFilteredStickers([]);
      } finally {
        setLoadingStickers(false);
      }
    };

    fetchStickers();
  }, []);

  // Lọc stickers theo loại
  useEffect(() => {
    if (selectedStickerType === 'all') {
      setFilteredStickers(allStickers);
    } else {
      setFilteredStickers(allStickers.filter(s => s.type === selectedStickerType));
    }
  }, [selectedStickerType, allStickers]);

  // Hàm load ảnh (hỗ trợ crossOrigin)
  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  };

  // Hàm tạo ảnh tổng hợp (composite image) - THÊM STICKERS
  const generateCompositeImage = async (images, cutValue) => {
    let compositeWidth, compositeHeight, positions, imageWidth, imageHeight;

    if (cutValue === '42') {
      compositeWidth = 600;
      compositeHeight = 900;
      const paddingLeft = 5;
      const paddingTop = 30;
      const paddingRight = 5;
      const paddingBottom = 120;
      const gap = 1;
      imageWidth = (compositeWidth - paddingLeft - paddingRight - gap) / 2;
      imageHeight = (compositeHeight - paddingTop - paddingBottom - gap) / 2;
      positions = [
        { x: paddingLeft, y: paddingTop },
        { x: paddingLeft + imageWidth + gap, y: paddingTop },
        { x: paddingLeft, y: paddingTop + imageHeight + gap },
        { x: paddingLeft + imageWidth + gap, y: paddingTop + imageHeight + gap }
      ];
      positions = positions.slice(0, images.length);
    }
    else if (cutValue === '41') {
      compositeWidth = 300;
      compositeHeight = 900;
      const paddingLeft = 12;
      const paddingTop = 25;
      const paddingRight = 12;
      const paddingBottom = 90;
      const gap = 10;
      imageWidth = compositeWidth - paddingLeft - paddingRight;
      imageHeight = (compositeHeight - paddingTop - paddingBottom - 3 * gap) / 4;
      positions = [];
      for (let i = 0; i < 4; i++) {
        positions.push({ x: paddingLeft, y: paddingTop + i * (imageHeight + gap) });
      }
      positions = positions.slice(0, images.length);
    }
    else if (cutValue === '3') {
      compositeWidth = 900;
      compositeHeight = 300;
      const paddingLeft = 25;
      const paddingTop = 40;
      const paddingRight = 25;
      const paddingBottom = 40;
      const gap = 11;
      imageWidth = 276;
      imageHeight = 220;
      positions = [
        { x: paddingLeft, y: paddingTop },
        { x: paddingLeft + imageWidth + gap, y: paddingTop },
        { x: paddingLeft + 2 * (imageWidth + gap), y: paddingTop }
      ];
      positions = positions.slice(0, images.length);
    }
    else if (cutValue === '6') {
      compositeWidth = 600;
      compositeHeight = 900;
      const paddingLeft = 10;
      const paddingRight = 20;
      const paddingTop = 24;
      const paddingBottom = 120;
      const gap = 1;
      imageWidth = (compositeWidth - paddingLeft - paddingRight - gap) / 2;
      imageHeight = (compositeHeight - paddingTop - paddingBottom - 2 * gap) / 3;
      positions = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
          const x = paddingLeft + col * (imageWidth + gap);
          const y = paddingTop + row * (imageHeight + gap);
          positions.push({ x, y });
        }
      }
      positions = positions.slice(0, images.length);
    }
    else {
      compositeWidth = 800;
      compositeHeight = 600;
      const count = images.length;
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const spacing = 10;
      imageWidth = (compositeWidth - spacing * (cols + 1)) / cols;
      imageHeight = (compositeHeight - spacing * (rows + 1)) / rows;
      positions = [];
      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = spacing + col * (imageWidth + spacing);
        const y = spacing + row * (imageHeight + spacing);
        positions.push({ x, y });
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = compositeWidth;
    canvas.height = compositeHeight;
    const ctx = canvas.getContext('2d');

    const loadedImages = await Promise.all(images.map(item => loadImage(item.photo)));

    // Vẽ ảnh + filter
    images.forEach((item, idx) => {
      const pos = positions[idx];
      const img = loadedImages[idx];

      const filterValue = filters.find(f => f.id === appliedFilters[idx])?.filter || 'none';
      ctx.filter = filterValue;

      if (item.flip) {
        ctx.save();
        ctx.translate(pos.x + imageWidth, pos.y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
        ctx.restore();
      } else {
        ctx.drawImage(img, pos.x, pos.y, imageWidth, imageHeight);
      }

      ctx.filter = 'none';
    });

    // VẼ STICKERS LÊN TỪNG ẢNH - CHỈ VẼ STICKER HỢP LỆ TRONG VÙNG ẢNH
    for (let idx = 0; idx < images.length; idx++) {
      const pos = positions[idx];
      const stickers = imageStickers[idx] || [];

      for (const sticker of stickers) {
        // Chỉ vẽ sticker nếu nó nằm trong vùng ảnh hợp lệ (5-95%)
        if (sticker.x >= 5 && sticker.x <= 95 && sticker.y >= 5 && sticker.y <= 95) {
          try {
            const stickerImg = await loadImage(sticker.src);

            ctx.save();

            // Tính toán vị trí thực tế trên canvas
            const stickerX = pos.x + (sticker.x / 100) * imageWidth;
            const stickerY = pos.y + (sticker.y / 100) * imageHeight;

            ctx.translate(stickerX, stickerY);
            ctx.rotate((sticker.rotation * Math.PI) / 180);
            ctx.scale(sticker.scale, sticker.scale);

            const stickerSize = 60; // Kích thước sticker cơ bản
            ctx.drawImage(
              stickerImg,
              -stickerSize / 2,
              -stickerSize / 2,
              stickerSize,
              stickerSize
            );

            ctx.restore();
          } catch (error) {
            console.error('[ERROR] Failed to load sticker:', sticker.src, error);
          }
        } else {
          console.log('[WARNING] Sticker outside valid area, skipping:', sticker);
        }
      }
    }

    return canvas.toDataURL('image/png');
  };

  const { formattedCountdown } = useCountdown();
  const { countdown } = useCountdown();

  const navigateToFrame = async (finalSlotsOverride = null) => {
    let finalSlots = finalSlotsOverride || [...selectedSlots];

    if (finalSlots.some(slot => slot === null)) {
      const used = new Set(finalSlots.filter(Boolean).map(item => item.photo));
      for (let i = 0; i < finalSlots.length; i++) {
        if (!finalSlots[i]) {
          const photoToUse = photos.find(photo => !used.has(photo));
          if (photoToUse) {
            finalSlots[i] = { photo: photoToUse, flip: false };
            used.add(photoToUse);
          }
        }
      }
    }

    try {
      const compositeImage = await generateCompositeImage(finalSlots, cut);
      navigate('/Frame', {
        state: {
          photos,
          compositeImage,
          frameType: location.state?.frameType,
          size,
          cut,
          selectedSlots: finalSlots,
          selectedFrameId: selectedFrameId,
          selectedFrame: selectedFrame,
          imageStickers: imageStickers // TRUYỀN STICKERS THEO TỪNG ẢNH
        }
      });
    } catch (error) {
      console.error("Lỗi tạo ảnh tổng hợp:", error);
    }
  };

  const handleContinue = () => {
    // Validate tất cả stickers trước khi tiếp tục
    const cleanedStickers = {};
    Object.keys(imageStickers).forEach(imgIndex => {
      const stickers = imageStickers[imgIndex] || [];
      cleanedStickers[imgIndex] = stickers.filter(s =>
        s.x >= 5 && s.x <= 95 && s.y >= 5 && s.y <= 95
      );
    });

    // Cập nhật state với stickers đã clean
    setImageStickers(cleanedStickers);

    // Đợi một chút để state cập nhật
    setTimeout(() => {
      navigateToFrame();
    }, 100);
  };

  useEffect(() => {
    if (countdown === 0) {
      // Validate tất cả stickers trước khi auto navigate
      const cleanedStickers = {};
      Object.keys(imageStickers).forEach(imgIndex => {
        const stickers = imageStickers[imgIndex] || [];
        cleanedStickers[imgIndex] = stickers.filter(s =>
          s.x >= 5 && s.x <= 95 && s.y >= 5 && s.y <= 95
        );
      });

      setImageStickers(cleanedStickers);

      setTimeout(() => {
        navigateToFrame();
      }, 100);
    }
  }, [countdown]);

  useEffect(() => {
    const areAllSlotsFilled = selectedSlots.every(slot => slot !== null);
    setAllSlotsFilled(areAllSlotsFilled);
  }, [selectedSlots]);

  const handleFlipImage = (index) => {
    const updatedSlots = [...selectedSlots];
    if (updatedSlots[index]) {
      updatedSlots[index] = { ...updatedSlots[index], flip: !updatedSlots[index].flip };
      setSelectedSlots(updatedSlots);
    }
  };

  const handleRetakePhoto = (index) => {
    navigate('/photo', {
      state: {
        size,
        cut,
        retakeIndex: index,
        currentPhotos: photos,
        selectedSlots: selectedSlots,
        selectedFrameId: selectedFrameId,
        selectedFrame: selectedFrame
      }
    });
  };

  const handleApplyFilter = (filterId) => {
    setAppliedFilters(prev => ({
      ...prev,
      [selectedImageIndex]: filterId
    }));
  };

// === HÀM KHÔI PHỤC ẢNH GỐC (ĐÃ SỬA) ===
  const handleResetToDefault = (index) => {
    // 1. Kiểm tra xem có ảnh gốc đã lưu cho slot này chưa
    if (!originalImages[index]) {
        console.warn(`Không tìm thấy ảnh gốc cho slot ${index}`);
        return;
    }

    // 2. Khôi phục lại ảnh nguồn (src) trong selectedSlots
    const updatedSlots = [...selectedSlots];
    // Giữ lại các thuộc tính khác (ví dụ: flip), chỉ thay đổi photo về gốc
    updatedSlots[index] = {
      ...updatedSlots[index],
      photo: originalImages[index] // Lấy lại từ kho lưu trữ ảnh gốc
    };
    setSelectedSlots(updatedSlots);

    // 3. Đặt lại bộ lọc CSS về 'original' (như code cũ)
    setAppliedFilters(prev => ({
      ...prev,
      [index]: 'original'
    }));

    // (Tùy chọn) Nếu đang ở tab FaceSwap và đang chọn template, có thể bỏ chọn
    if (activeTab === 'faceswap') {
        setSelectedSwapId(null);
    }
    
    // (Tùy chọn) Nếu bạn muốn nút khôi phục xóa luôn cả stickers đã thêm, bỏ comment dòng dưới:
    // setImageStickers(prev => ({ ...prev, [index]: [] }));
  };

  const handleEnhanceImage = async (index) => {
    const slot = selectedSlots[index];
    if (!slot) return;

    setLoading(true);

    try {
      let blob;
      let mimeString;

      if (slot.photo.startsWith('data:')) {
        const parts = slot.photo.split(',');
        mimeString = parts[0].split(':')[1].split(';')[0];
        const base64 = parts[1];
        const byteString = atob(base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        blob = new Blob([ab], { type: mimeString });
      } else {
        const response = await fetch(slot.photo);
        blob = await response.blob();
        mimeString = response.headers.get('content-type') || 'image/jpeg';
      }

      const ext = mimeString === 'image/jpeg' ? '.jpg' : '.png';
      const filename = `photo_${index}${ext}`;
      const file = new File([blob], filename, { type: mimeString });

      const formData = new FormData();
      formData.append('image', file);

      console.log('[DEBUG] Sending image to LOCAL AI server...');

      const res = await fetch('http://localhost:5000/enhance', {
        method: 'POST',
        body: formData,
      });

      console.log('[DEBUG] Response status:', res.status);

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('[ERROR] Non-JSON response from AI server:', text.substring(0, 500));
        throw new Error('Server AI trả về lỗi: ' + (text.substring(0, 200) || 'Không xác định'));
      }

      const data = await res.json();
      console.log('[DEBUG] AI server response:', data);

      if (res.ok && data.success) {
        if (!originalImages[index]) {
          setOriginalImages(prev => ({
            ...prev,
            [index]: slot.photo
          }));
        }

        const updated = [...selectedSlots];
        updated[index] = {
          ...updated[index],
          photo: data.enhanced_image
        };
        setSelectedSlots(updated);

        setAppliedFilters(prev => ({ ...prev, [index]: 'original' }));

        console.log('[SUCCESS] Image enhanced successfully');
        alert('✅ Ảnh đã được làm nét!');

      } else {
        throw new Error(data.error || data.message || 'Làm nét thất bại');
      }

    } catch (err) {
      console.error('[ERROR] Enhance failed:', err);
      alert('❌ Lỗi làm nét ảnh: ' + (err.message || 'Không xác định'));
    } finally {
      setLoading(false);
    }
  };

  // THÊM STICKER VÀO ẢNH HIỆN TẠI - ĐẶT Ở GIỮA ẢNH + VALIDATE STICKER CŨ
  const handleAddStickerToPreview = (sticker) => {
    // Validate sticker cũ trước khi thêm sticker mới
    if (selectedPreviewStickerId) {
      validateAndCleanSticker(selectedPreviewStickerId);
    }

    const newSticker = {
      id: Date.now() + Math.random(),
      src: sticker.sticker,
      x: 50, // Đặt ở giữa ảnh
      y: 50, // Đặt ở giữa ảnh
      scale: 1,
      rotation: 0
    };

    setImageStickers(prev => ({
      ...prev,
      [selectedImageIndex]: [...(prev[selectedImageIndex] || []), newSticker]
    }));

    setSelectedPreviewStickerId(newSticker.id);
  };

  const handleStickerClick = (sticker) => {
    // Validate và xóa tất cả stickers không hợp lệ trước khi thêm mới
    const currentStickers = imageStickers[selectedImageIndex] || [];
    const validStickers = currentStickers.filter(s =>
      s.x >= 5 && s.x <= 95 && s.y >= 5 && s.y <= 95
    );

    if (validStickers.length < currentStickers.length) {
      console.log('[INFO] Removing', currentStickers.length - validStickers.length, 'invalid stickers before adding new one');
      setImageStickers(prev => ({
        ...prev,
        [selectedImageIndex]: validStickers
      }));
    }

    // Sau đó mới thêm sticker mới
    setTimeout(() => {
      handleAddStickerToPreview(sticker);
    }, 50);
  };

  // XỬ LÝ DI CHUYỂN STICKER - VALIDATE REAL-TIME, XÓA NGAY KHI RA NGOÀI
  // XỬ LÝ DI CHUYỂN STICKER - VALIDATE REAL-TIME, XÓA NGAY KHI RA NGOÀI
  const handlePreviewStickerDragStart = (e, stickerId) => {
    e.preventDefault();
    e.stopPropagation();

    // Tìm ảnh THỰC TẾ - không phải container
    let imageElement = null;
    const clickedElement = e.currentTarget;

    // Tìm IMG tag gần nhất
    const parentSlot = clickedElement.closest('.slot');
    if (parentSlot) {
      imageElement = parentSlot.querySelector('img[alt^="Slot"]');
    } else {
      const previewContainer = clickedElement.closest('.selected-image-preview');
      if (previewContainer) {
        imageElement = previewContainer.querySelector('img[alt="Preview"]') ||
          previewContainer.querySelector('img[alt="Enhanced"]') ||
          previewContainer.querySelector('img[alt="Original"]');
      }
    }

    if (!imageElement) {
      console.error('[ERROR] Cannot find image element');
      return;
    }

    const sticker = (imageStickers[selectedImageIndex] || []).find(s => s.id === stickerId);
    if (!sticker) return;

    // Lấy kích thước ẢNH THỰC TẾ (không phải container)
    const imgRect = imageElement.getBoundingClientRect();

    // QUAN TRỌNG: Tính offset nếu ảnh nhỏ hơn container (contain)
    const natWidth = imageElement.naturalWidth;
    const natHeight = imageElement.naturalHeight;

    if (natWidth === 0 || natHeight === 0) {
      console.error('[ERROR] Image not loaded yet');
      return;
    }

    const natRatio = natWidth / natHeight;
    const displayRatio = imgRect.width / imgRect.height;

    let actualImgLeft = imgRect.left;
    let actualImgTop = imgRect.top;
    let actualImgWidth = imgRect.width;
    let actualImgHeight = imgRect.height;

    // Nếu ảnh có lề trắng (object-fit: contain)
    if (Math.abs(natRatio - displayRatio) > 0.01) {
      if (natRatio > displayRatio) {
        // Ảnh rộng hơn → có lề trên/dưới
        actualImgHeight = imgRect.width / natRatio;
        actualImgTop = imgRect.top + (imgRect.height - actualImgHeight) / 2;
      } else {
        // Ảnh cao hơn → có lề trái/phải
        actualImgWidth = imgRect.height * natRatio;
        actualImgLeft = imgRect.left + (imgRect.width - actualImgWidth) / 2;
      }
    }

    // Vùng hợp lệ 5-95%
    const margin = 0.05;
    const validLeft = actualImgLeft + actualImgWidth * margin;
    const validRight = actualImgLeft + actualImgWidth * (1 - margin);
    const validTop = actualImgTop + actualImgHeight * margin;
    const validBottom = actualImgTop + actualImgHeight * (1 - margin);

    const handleMove = (moveEvent) => {
      moveEvent.preventDefault();

      const currentX = moveEvent.type.includes('mouse') ? moveEvent.clientX : moveEvent.touches[0].clientX;
      const currentY = moveEvent.type.includes('mouse') ? moveEvent.clientY : moveEvent.touches[0].clientY;

      // Kiểm tra có trong vùng hợp lệ không
      const isInside = currentX >= validLeft && currentX <= validRight &&
        currentY >= validTop && currentY <= validBottom;

      if (!isInside) {
        // XÓA NGAY khi ra ngoài
        console.log('[DELETE] Sticker outside valid area');
        setImageStickers(prev => ({
          ...prev,
          [selectedImageIndex]: (prev[selectedImageIndex] || []).filter(s => s.id !== stickerId)
        }));
        setSelectedPreviewStickerId(null);
        handleEnd();
        return;
      }

      // Tính % theo ảnh thực tế
      const relativeX = currentX - actualImgLeft;
      const relativeY = currentY - actualImgTop;
      const percentX = Math.max(5, Math.min(95, (relativeX / actualImgWidth) * 100));
      const percentY = Math.max(5, Math.min(95, (relativeY / actualImgHeight) * 100));

      setImageStickers(prev => ({
        ...prev,
        [selectedImageIndex]: (prev[selectedImageIndex] || []).map(s =>
          s.id === stickerId ? { ...s, x: percentX, y: percentY } : s
        )
      }));
    };

    const handleEnd = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  };

  // PHÓNG TO/THU NHỎ STICKER
  const handlePreviewStickerScale = (stickerId, delta) => {
    setImageStickers(prev => ({
      ...prev,
      [selectedImageIndex]: (prev[selectedImageIndex] || []).map(s =>
        s.id === stickerId
          ? { ...s, scale: Math.max(0.3, Math.min(3, s.scale + delta)) }
          : s
      )
    }));
  };
  // XOAY STICKER
  const handlePreviewStickerRotate = (stickerId, delta) => {
    setImageStickers(prev => ({
      ...prev,
      [selectedImageIndex]: (prev[selectedImageIndex] || []).map(s =>
        s.id === stickerId
          ? { ...s, rotation: (s.rotation + delta) % 360 }
          : s
      )
    }));
  };
  // XÓA STICKER
  const handleDeletePreviewSticker = (stickerId) => {
    setImageStickers(prev => ({
      ...prev,
      [selectedImageIndex]: (prev[selectedImageIndex] || []).filter(s => s.id !== stickerId)
    }));
    if (selectedPreviewStickerId === stickerId) {
      setSelectedPreviewStickerId(null);
    }
  };
  // Thêm useEffect để validate real-time khi imageStickers thay đổi
  useEffect(() => {
    // Kiểm tra và xóa stickers không hợp lệ ngay lập tức
    const currentStickers = imageStickers[selectedImageIndex] || [];
    const invalidStickers = currentStickers.filter(s =>
      s.x < 5 || s.x > 95 || s.y < 5 || s.y > 95
    );
    if (invalidStickers.length > 0) {
      console.log('[REAL-TIME VALIDATE] Found', invalidStickers.length, 'invalid stickers - removing now');
      const validStickers = currentStickers.filter(s =>
        s.x >= 5 && s.x <= 95 && s.y >= 5 && s.y <= 95
      );

      setImageStickers(prev => ({
        ...prev,
        [selectedImageIndex]: validStickers
      }));

      // Nếu sticker đang chọn bị xóa, deselect
      if (selectedPreviewStickerId && invalidStickers.some(s => s.id === selectedPreviewStickerId)) {
        setSelectedPreviewStickerId(null);
      }
    }
  }, [imageStickers, selectedImageIndex]);
  // Thêm useEffect để validate khi chuyển ảnh
  useEffect(() => {
    // Validate sticker cũ khi chuyển sang ảnh khác
    if (selectedPreviewStickerId) {
      const prevImageStickers = Object.keys(imageStickers);
      prevImageStickers.forEach(imgIndex => {
        const imgIdx = parseInt(imgIndex);
        if (imgIdx !== selectedImageIndex) {
          const stickers = imageStickers[imgIdx] || [];
          const invalidStickers = stickers.filter(s =>
            s.x < 5 || s.x > 95 || s.y < 5 || s.y > 95
          );
          if (invalidStickers.length > 0) {
            console.log('[INFO] Cleaning invalid stickers from image', imgIdx);
            setImageStickers(prev => ({
              ...prev,
              [imgIdx]: stickers.filter(s =>
                s.x >= 5 && s.x <= 95 && s.y >= 5 && s.y <= 95
              )
            }));
          }
        }
      });

      // Reset selection khi chuyển ảnh
      setSelectedPreviewStickerId(null);
    }
  }, [selectedImageIndex]);
  // XÁC NHẬN STICKER - ẨN CÁC NÚT ĐIỀU KHIỂN + VALIDATE
  // XÁC NHẬN STICKER - KIỂM TRA VÀ XÓA NẾU TRÀN VIỀN
  const handleStickerConfirm = () => {
    if (!selectedPreviewStickerId) {
      return;
    }

    const sticker = (imageStickers[selectedImageIndex] || []).find(s => s.id === selectedPreviewStickerId);

    if (sticker) {
      // KIỂM TRA TRÀN VIỀN (phải nằm trong 5-95%)
      if (sticker.x < 5 || sticker.x > 95 || sticker.y < 5 || sticker.y > 95) {
        // XÓA STICKER TRÀN VIỀN
        setImageStickers(prev => ({
          ...prev,
          [selectedImageIndex]: (prev[selectedImageIndex] || []).filter(s => s.id !== selectedPreviewStickerId)
        }));

        // HIỂN THỊ THÔNG BÁO
        alert('⚠️ Sticker bị tràn viền! Vui lòng đặt lại sticker trong khung ảnh.');

        setSelectedPreviewStickerId(null);
        return;
      }
    }

    // NẾU HỢP LỆ → DESELECT
    setSelectedPreviewStickerId(null);
  };
  // VALIDATE VÀ XÓA STICKER KHÔNG HỢP LỆ
  const validateAndCleanSticker = (stickerId) => {
    const sticker = (imageStickers[selectedImageIndex] || []).find(s => s.id === stickerId);
    if (sticker) {
      // Kiểm tra vị trí hợp lệ (5-95%)
      if (sticker.x < 5 || sticker.x > 95 || sticker.y < 5 || sticker.y > 95) {
        console.log('[INFO] Removing invalid sticker at position:', sticker.x, sticker.y);
        setImageStickers(prev => ({
          ...prev,
          [selectedImageIndex]: (prev[selectedImageIndex] || []).filter(s => s.id !== stickerId)
        }));
      }
    }
  };
  const handleStickerSelect = (stickerId) => {
    // Validate sticker cũ trước khi chọn sticker mới
    if (selectedPreviewStickerId && selectedPreviewStickerId !== stickerId) {
      validateAndCleanSticker(selectedPreviewStickerId);
    }
    setSelectedPreviewStickerId(stickerId);
  };
  // Handler cho tab navigation
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
const renderSlotItem = (slot, index) => {
    let slotWidth, slotHeight;
    // Quy định kích thước slot theo layout
    switch (cut) {
      case '3':
        slotWidth = '280px';
        slotHeight = '220px';
        break;
      case '41':
        slotWidth = '240px';
        slotHeight = '170px';
        break;
      case '42':
        slotWidth = '260px';
        slotHeight = '320px';
        break;
      case '6':
        slotWidth = '220px';
        slotHeight = '185px';
        break;
      default:
        slotWidth = '250px';
        slotHeight = '250px';
    }

    // --- TÍNH TOÁN TỈ LỆ SCALE ---
    // Lấy chiều cao của slot dưới dạng số (ví dụ '220px' -> 220)
    const slotHeightNum = parseInt(slotHeight);
    // Chiều cao chuẩn của ảnh bên ImagePreview (đã fix cứng là 320px trong code trước)
    const previewBaseHeight = 320;
    
    // Tỉ lệ thu nhỏ của sticker = Chiều cao Thumbnail / Chiều cao Preview
    // Ví dụ: Nếu thumbnail cao 160px, preview cao 320px -> Sticker sẽ nhỏ đi 0.5 lần
    const stickerScaleRatio = slotHeightNum / previewBaseHeight;

    const thumbSlotStyle = {
      width: slotWidth,
      height: slotHeight,
      margin: '10px',
      border: selectedImageIndex === index ? '3px solid #fda4af' : '2px solid #ddd',
      borderRadius: '10px',
      boxShadow: selectedImageIndex === index
        ? '0 4px 12px rgba(250, 162, 253, 0.3)'
        : '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      backgroundColor: '#fff',
      display: 'flex', // Flex để căn giữa ảnh trong slot
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden' 
    };

    const currentFilter = appliedFilters[index] ?
      filters.find(f => f.id === appliedFilters[index])?.filter : 'none';

    const thumbStickers = imageStickers[index] || [];

    return (
      <div className="slot-container" key={index}>
        <div
          className="slot"
          style={thumbSlotStyle}
          onClick={() => setSelectedImageIndex(index)}
        >
          {slot ? (
            // Wrapper này quan trọng: Nó sẽ co lại (fit-content) ôm sát lấy ảnh
            // Giúp toạ độ sticker left/top % chính xác theo ảnh
            <div 
              className="position-relative" 
              style={{ 
                width: 'fit-content', 
                height: 'fit-content',
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'flex' // Loại bỏ khoảng trắng thừa của img inline
              }}
            >
              <img
                src={slot.photo}
                alt={`Slot ${index}`}
                style={{
                  // Ảnh sẽ tự co để vừa slot nhưng vẫn giữ tỉ lệ gốc
                  maxWidth: '100%', 
                  maxHeight: slotHeight, // Giới hạn chiều cao bằng slot
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  transform: slot.flip ? 'scaleX(-1)' : 'none',
                  filter: currentFilter,
                  borderRadius: '8px',
                  display: 'block'
                }}
              />

              {/* Render Sticker với tỉ lệ động đã tính */}
              {thumbStickers.map(sticker => (
                <img
                  key={sticker.id}
                  src={sticker.src}
                  alt="Sticker"
                  style={{
                    position: 'absolute',
                    left: `${sticker.x}%`,
                    top: `${sticker.y}%`,
                    // Áp dụng stickerScaleRatio thay vì số 0.4 cứng nhắc
                    transform: `translate(-50%, -50%) scale(${sticker.scale * stickerScaleRatio}) rotate(${sticker.rotation}deg)`,
                    width: '60px',
                    height: '60px',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                    zIndex: 3
                  }}
                />
              ))}

              {/* Các nút chức năng (Giữ nguyên vị trí tuyệt đối theo Slot hay theo Ảnh tuỳ bạn chọn) */}
              {/* Ở đây tôi để chúng absolute theo wrapper ảnh để nó bám góc ảnh cho đẹp */}
              
              {/* Nút Chụp lại */}
              <div style={{ position: 'absolute', top: '5px', left: '5px', zIndex: 10 }}>
                 <button
                  className="btn btn-sm btn-warning d-flex align-items-center justify-content-center p-0"
                  style={{ width: '32px', height: '32px' }} // Thu nhỏ nút chút cho thumbnail gọn
                  title="Chụp lại"
                  onClick={(e) => { e.stopPropagation(); handleRetakePhoto(index); }}
                >
                  <img src="icon-camera.png" alt="" style={{ width: '16px', height: '16px' }} />
                </button>
              </div>

               {/* Nút Lật ảnh */}
              <div style={{ position: 'absolute', bottom: '5px', right: '5px', zIndex: 10 }}>
                <button
                  className="btn btn-light"
                  onClick={(e) => { e.stopPropagation(); handleFlipImage(index); }}
                  style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <img src="icon-flip.png" alt="" style={{ width: '16px', height: '16px' }} />
                </button>
              </div>

               {/* Nút Khôi phục */}
              <div style={{ position: 'absolute', top: '5px', right: '5px', zIndex: 10 }}>
                <button
                  className="btn btn-light"
                  onClick={(e) => { e.stopPropagation(); handleResetToDefault(index); }}
                  style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <img src="icon-review.png" alt="" style={{ width: '16px', height: '16px' }} />
                </button>
              </div>

               {/* Nút Làm nét */}
              <div style={{ position: 'absolute', bottom: '5px', left: '5px', zIndex: 10 }}>
                <button
                  className="btn btn-sm d-flex align-items-center justify-content-center p-0"
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: '#fda4af', border: 'none', color: 'white',
                    opacity: loading ? 0.6 : 1
                  }}
                  onClick={(e) => { e.stopPropagation(); handleEnhanceImage(index); }}
                  disabled={loading}
                >
                  {loading ? '⏳' : '✨'}
                </button>
              </div>

            </div>
          ) : (
            <div
              className="placeholder-slot"
              style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa', color: '#6c757d', border: '2px dashed #ddd', borderRadius: '8px' }}
            >
              Chọn ảnh
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSlots = () => {
    switch (cut) {
      case '3':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '15px',
            width: '100%',
            height: '100%',
            padding: '20px',
            position: 'relative'
          }}>
            {selectedSlots.map((slot, index) => renderSlotItem(slot, index))}
          </div>
        );
      case '41':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            height: '100%',
            padding: '20px',
            position: 'relative'
          }}>
            {selectedSlots.map((slot, index) => renderSlotItem(slot, index))}
          </div>
        );
      case '42':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '15px',
            width: '100%',
            height: '100%',
            padding: '20px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', gap: '15px' }}>
              {selectedSlots.slice(0, 2).map((slot, index) => renderSlotItem(slot, index))}
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
              {selectedSlots.slice(2, 4).map((slot, index) => renderSlotItem(slot, index + 2))}
            </div>
          </div>
        );
      case '6':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            height: '100%',
            padding: '20px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              {selectedSlots.slice(0, 2).map((slot, index) => renderSlotItem(slot, index))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {selectedSlots.slice(2, 4).map((slot, index) => renderSlotItem(slot, index + 2))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {selectedSlots.slice(4, 6).map((slot, index) => renderSlotItem(slot, index + 4))}
            </div>
          </div>
        );
      default:
        return (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '15px',
            justifyContent: 'center',
            alignItems: 'flex-start',
            height: '100%',
            padding: '20px',
            overflowY: 'auto',
            position: 'relative'
          }}>
            {selectedSlots.map((slot, index) => renderSlotItem(slot, index))}
          </div>
        );
    }
  };
  const hasEnhancedImage = originalImages[selectedImageIndex] &&
    selectedSlots[selectedImageIndex]?.photo !== originalImages[selectedImageIndex];
  return (
    <div className="vh-100">
      {showWelcomeBot && robotLottie && (
            <div
              className="welcome-bot-overlay"
              onClick={() => setShowWelcomeBot(false)}
            >
              <div className="welcome-bot-bubble-container">
                <div className="speech-bubble">
                  <p className="welcome-message">
                    Chúng mình có các chức năng như bộ lọc, sticker, chỉnh sửa ảnh bằng AI, bản hảy thử nhé!
                  </p>
                </div>
                <div className="robot-lottie-wrapper">
                  <Lottie
                    animationData={robotLottie}
                    loop
                    autoplay
                    style={{ width: '720px', height: '720px' }}
                  />
                </div>
              </div>
            </div>
      )}
      <div className="countdown">
        ⌛: {formattedCountdown}
      </div>
      {/* === THÊM LOADING OVERLAY CHO TOÀN BỘ MÀN HÌNH === */}
{(isProcessingSwap || isProcessingBg) && (
        <div className="global-loading-overlay">
           <div className="loading-content">
              <div className="spinner-border text-light" style={{width: '3rem', height: '3rem'}} role="status"></div>
              <h4 className="mt-3 text-white">
                {isProcessingSwap ? "Đang xử lý Face Swap..." : "Đang xử lý Background AI..."}
              </h4>
              <p className="text-white-50">Vui lòng đợi trong giây lát</p>
           </div>
        </div>
      )}
      <div className="row h-100">
        <div className="col-md-7 d-flex flex-column justify-content-center align-items-center"
          style={{
            backgroundColor: 'transparent',
            minHeight: '100vh',
            borderRight: '1px solid #dee2e6'
          }}>
          <div className="w-100 h-100 d-flex justify-content-center align-items-center">
            {renderSlots()}
          </div>
        </div>
        <div className="col-md-5 d-flex flex-column p-4" style={{ height: '100vh', overflow: 'auto' }}>
          {/* TABS NAVIGATION */}
          <div className="tabs-navigation">
            <button
              className={`tab-button ${activeTab === 'filter' ? 'active' : ''}`}
              onClick={() => handleTabChange('filter')}
            >
              🎨 Chọn bộ lọc
            </button>
            <button
              className={`tab-button ${activeTab === 'sticker' ? 'active' : ''}`}
              onClick={() => handleTabChange('sticker')}
            >
              ✨ Chọn sticker
            </button>
            <button
              className={`tab-button ${activeTab === 'faceswap' ? 'active' : ''}`}
              onClick={() => handleTabChange('faceswap')}
            >
              😎 FaceSwap
            </button>
            <button
              className={`tab-button ${activeTab === 'background' ? 'active' : ''}`}
              onClick={() => handleTabChange('background')}
            >
              🌈 BackgroundAI
            </button>
          </div>

          {/* IMAGE PREVIEW - HIỂN THỊ CHO TẤT CẢ TABS */}
          <ImagePreview
            selectedSlot={selectedSlots[selectedImageIndex]}
            selectedImageIndex={selectedImageIndex}
            hasEnhancedImage={hasEnhancedImage}
            originalImage={originalImages[selectedImageIndex]}
            filters={filters}
            appliedFilters={appliedFilters}
            previewStickers={imageStickers[selectedImageIndex] || []}
            selectedPreviewStickerId={selectedPreviewStickerId}
            onStickerDragStart={handlePreviewStickerDragStart}
            onStickerScale={handlePreviewStickerScale}
            onStickerRotate={handlePreviewStickerRotate}
            onStickerDelete={handleDeletePreviewSticker}
            onStickerSelect={handleStickerSelect}
            onStickerConfirm={handleStickerConfirm}
          />

          {/* TAB CONTENT */}
          <div className="tab-content mt-3">
            {/* FILTER TAB */}
            <div className={`tab-section ${activeTab === 'filter' ? 'active' : ''}`}>
              <FilterSection
                filters={filters}
                appliedFilters={appliedFilters}
                selectedImageIndex={selectedImageIndex}
                onApplyFilter={handleApplyFilter}
              />
            </div>

            {/* STICKER TAB */}
            <div className={`tab-section ${activeTab === 'sticker' ? 'active' : ''}`}>
              <StickerSection
                filteredStickers={filteredStickers}
                loadingStickers={loadingStickers}
                stickerTypes={stickerTypes}
                selectedStickerType={selectedStickerType}
                showStickerTypeDropdown={showStickerTypeDropdown}
                onStickerClick={handleStickerClick}
                onStickerTypeChange={(type) => {
                  setSelectedStickerType(type);
                  setShowStickerTypeDropdown(false);
                }}
                onToggleDropdown={() => setShowStickerTypeDropdown(!showStickerTypeDropdown)}
              />
            </div>

{/* FACESWAP TAB */}
             <div className={`tab-section ${activeTab === 'faceswap' ? 'active' : ''}`}>
               <FaceSwapSection 
                  swapTemplates={filteredSwapTemplates}
                  loadingTemplates={loadingTemplates}
                  selectedSwapId={selectedSwapId}
                  filterCategories={swapCategories}
                  selectedCategory={selectedSwapCategory}
                  onSelectTemplate={handleFaceSwap}
                  onCategoryChange={setSelectedSwapCategory}
                  onResetSwap={handleResetAI} // Dùng hàm reset chung
               />
            </div>

            {/* BACKGROUNDAI TAB - CẬP NHẬT MỚI */}
            <div className={`tab-section ${activeTab === 'background' ? 'active' : ''}`}>
               {/* Tái sử dụng component FaceSwapSection vì giao diện giống hệt */}
               <FaceSwapSection 
                  swapTemplates={filteredBgTemplates}
                  loadingTemplates={loadingBgTemplates}
                  selectedSwapId={selectedBgId}
                  filterCategories={bgCategories}
                  selectedCategory={selectedBgCategory}
                  onSelectTemplate={handleBackgroundAI}
                  onCategoryChange={setSelectedBgCategory}
                  onResetSwap={handleResetAI}
               />
            </div>
          </div>

          {/* CONTINUE BUTTON */}
          <div className="mt-4">
            <button
              className="btn btn-success w-100"
              onClick={handleContinue}
            >
              Tiếp tục
            </button>
          </div>
        </div>
      </div>
      <Chatbot />
    </div>
  );
};
export default SelPhoto;