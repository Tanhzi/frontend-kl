import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './SelPhoto.css';
import { useCountdown } from "../../contexts/CountdownContext";
import FilterSection from './components/FilterSection';
import StickerSection from './components/StickerSection';
import ImagePreview from './components/ImagePreview';
import FaceSwapSection from './components/FaceSwapSection';
import Chatbot from '../../components/Chatbot';

const SelPhoto = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // LẤY DỮ LIỆU TỪ NAVIGATE (Bao gồm dữ liệu từ trang Chụp lại gửi về)
  const { 
    photos, 
    cut, 
    frameType, 
    size, 
    selectedFrameId, 
    selectedFrame,
    // Lấy các dữ liệu bảo lưu (slots đã sửa, filters đã chọn)
    selectedSlots: incomingSlots, 
    appliedFilters: incomingFilters 
  } = location.state || {
    photos: [],
    cut: '3',
    frameType: 'default',
    size: 'default'
  };

  const [activeTab, setActiveTab] = useState('filter');
  const [swappedCache, setSwappedCache] = useState({});

  const filters = [
    { id: 'original', name: 'Gốc', filter: 'none' },
    { id: 'grayscale', name: 'Thanh xám', filter: 'grayscale(100%)' },
    { id: 'vibe', name: 'Vibe', filter: 'sepia(50%) saturate(150%) hue-rotate(15deg)' },
    { id: 'bright', name: 'Sáng', filter: 'brightness(120%) contrast(110%)' },
    { id: 'smooth', name: 'Mịn da', filter: 'blur(0.5px) brightness(105%) contrast(95%)' },
    { id: 'primer', name: 'Primer soda', filter: 'saturate(120%) contrast(110%) hue-rotate(10deg)' },
    { id: 'soly', name: 'Soly', filter: 'sepia(30%) saturate(130%) brightness(110%)' },
    { id: 'anime', name: 'Anime AI', filter: 'none', isAI: true } 
  ];

  // Khởi tạo số ô (slots)
  const getInitialSlots = () => {
    if (cut === '3') return Array(3).fill(null);
    if (cut === '41') return Array(4).fill(null);
    if (cut === '42') return Array(4).fill(null);
    if (cut === '6') return Array(6).fill(null);
    return Array(4).fill(null);
  };

  // === [FIX 1] KHỞI TẠO STATE THÔNG MINH ===
  // Nếu có incomingSlots (từ trang chụp lại về), dùng nó luôn. Nếu không mới tạo mảng rỗng.
  const [selectedSlots, setSelectedSlots] = useState(() => {
    if (incomingSlots && incomingSlots.length > 0) return incomingSlots;
    return getInitialSlots();
  });

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // === [FIX 2] KHỞI TẠO FILTER TỪ DỮ LIỆU CŨ ===
  const [appliedFilters, setAppliedFilters] = useState(() => {
    if (incomingFilters) return incomingFilters;
    return {};
  });

  const [allSlotsFilled, setAllSlotsFilled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Đang xử lý...');

  // State cho original images (để compare/reset)
  const [originalImages, setOriginalImages] = useState({});

  // Các state khác (Sticker, AI...) giữ nguyên
  const [allStickers, setAllStickers] = useState([]);
  const [filteredStickers, setFilteredStickers] = useState([]);
  const [stickerTypes, setStickerTypes] = useState([]);
  const [selectedStickerType, setSelectedStickerType] = useState('all');
  const [showStickerTypeDropdown, setShowStickerTypeDropdown] = useState(false);
  const [loadingStickers, setLoadingStickers] = useState(true);

  const [bgTemplates, setBgTemplates] = useState([]);       
  const [filteredBgTemplates, setFilteredBgTemplates] = useState([]); 
  const [bgCategories, setBgCategories] = useState([]);     
  const [selectedBgCategory, setSelectedBgCategory] = useState('all');
  const [loadingBgTemplates, setLoadingBgTemplates] = useState(false);
  const [selectedBgId, setSelectedBgId] = useState(null);   
  const [isProcessingBg, setIsProcessingBg] = useState(false); 
  const [bgCache, setBgCache] = useState({});

  const [imageStickers, setImageStickers] = useState({});
  const [selectedPreviewStickerId, setSelectedPreviewStickerId] = useState(null);

  const [swapTemplates, setSwapTemplates] = useState([]);       
  const [filteredSwapTemplates, setFilteredSwapTemplates] = useState([]); 
  const [swapCategories, setSwapCategories] = useState([]);     
  const [selectedSwapCategory, setSelectedSwapCategory] = useState('all');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedSwapId, setSelectedSwapId] = useState(null);   
  const [isProcessingSwap, setIsProcessingSwap] = useState(false); 

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const savedBackground = localStorage.getItem('backgroundImage');
    if (savedBackground) {
      document.body.style.backgroundImage = `url(${savedBackground})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
    }
    return () => {
      document.body.style.backgroundImage = 'none';
    };
  }, []);

  // === [FIX 3] USEEFFECT ĐIỀN ẢNH VÀO SLOT ===
  useEffect(() => {
    if (photos && photos.length > 0) {
      
      // KIỂM TRA: Nếu đang quay lại từ Retake (có incomingSlots),
      // thì CHỈ cập nhật lại danh sách ảnh gốc (originalImages) để dùng cho nút "Reset",
      // TUYỆT ĐỐI KHÔNG ghi đè selectedSlots (vì nó chứa ảnh đã edit).
      if (incomingSlots && incomingSlots.length > 0) {
        const initialOriginals = {};
        // Map lại ảnh gốc dựa trên index (để khi bấm reset thì về đúng ảnh chụp thô)
        const initialSlotsStructure = getInitialSlots();
        initialSlotsStructure.forEach((_, index) => {
           if (index < photos.length) {
               initialOriginals[index] = photos[index];
           }
        });
        setOriginalImages(initialOriginals);
        
        // Khởi tạo imageStickers rỗng nếu chưa có (vì sticker không được lưu trong logic hiện tại)
        const initialImageStickers = {};
        incomingSlots.forEach((slot, index) => {
            if (slot) initialImageStickers[index] = [];
        });
        setImageStickers(initialImageStickers);
        
        return; // <--- THOÁT NGAY, KHÔNG CHẠY LOGIC RESET BÊN DƯỚI
      }

      // === LOGIC CŨ (Chỉ chạy khi vào lần đầu, chưa edit gì) ===
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

      const initialImageStickers = {};
      filledSlots.forEach((slot, index) => {
        if (slot) {
          initialImageStickers[index] = [];
        }
      });
      setImageStickers(initialImageStickers);
    }
  }, [photos, cut]); 
  // Lưu ý: [photos] thay đổi khi retake xong, nhưng nhờ check "incomingSlots", 
  // ta ngăn chặn được việc reset.

  // ... (Phần còn lại của code Fetch API, Handle Filter, Handle Swap... giữ nguyên) ...
  
  // === FILTER CATEGORY CHO FACE SWAP ===
  useEffect(() => {
    if (selectedSwapCategory === 'all') {
      setFilteredSwapTemplates(swapTemplates);
    } else {
      setFilteredSwapTemplates(swapTemplates.filter(t => t.topic === selectedSwapCategory));
    }
  }, [selectedSwapCategory, swapTemplates]);

  // === FETCH DỮ LIỆU ===
  useEffect(() => {
    const fetchAITemplates = async () => {
      try {
        const authStr = localStorage.getItem('auth');
        let id_admin = '';
        let id_topic = '';
        if (authStr) { try { id_admin = JSON.parse(authStr).id_admin; } catch {} }
        if (authStr) { try { id_topic = JSON.parse(authStr).id_topic; } catch {} }
        
        setLoadingTemplates(true);
        setLoadingBgTemplates(true);

        const swapUrl = `${API_URL}/ai-topics?id_admin=${id_admin}&id_topic=${id_topic}&type=swap`;
        const bgUrl = `${API_URL}/ai-topics?id_admin=${id_admin}&id_topic=${id_topic}&type=background`;

        const [swapRes, bgRes] = await Promise.all([
            fetch(swapUrl).catch(() => null),
            fetch(bgUrl).catch(() => null)
        ]);
        
        if (swapRes && swapRes.ok) {
            const data = await swapRes.json();
            if (data.status === 'success') {
                setSwapTemplates(data.data || []);
                setFilteredSwapTemplates(data.data || []);
                const uniqueTopics = [...new Set(data.data.map(item => item.topic).filter(Boolean))];
                setSwapCategories(uniqueTopics || []);
            }
        }

        if (bgRes && bgRes.ok) {
            const data = await bgRes.json();
            if (data.status === 'success') {
                setBgTemplates(data.data || []);
                setFilteredBgTemplates(data.data || []);
                const uniqueNames = [...new Set(data.data.map(item => item.name).filter(Boolean))];
                setBgCategories(uniqueNames || []);
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

  useEffect(() => {
    if (selectedBgCategory === 'all') {
      setFilteredBgTemplates(bgTemplates);
    } else {
      setFilteredBgTemplates(bgTemplates.filter(t => t.type === selectedBgCategory || t.name === selectedBgCategory));
    }
  }, [selectedBgCategory, bgTemplates]);

  const urlToFile = async (url, filename, mimeType) => {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    return new File([buf], filename, { type: mimeType });
  };

  const cropImageToMatchOriginal = async (swapResultBase64, originalPhotoUrl) => {
    return new Promise(async (resolve, reject) => {
      try {
        const originalImg = await loadImage(originalPhotoUrl);
        const targetRatio = originalImg.width / originalImg.height;

        const swapImg = await loadImage(swapResultBase64);
        const currentRatio = swapImg.width / swapImg.height;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let renderWidth, renderHeight, offsetX, offsetY;

        if (currentRatio > targetRatio) {
          renderHeight = swapImg.height;
          renderWidth = swapImg.height * targetRatio;
          offsetX = (swapImg.width - renderWidth) / 2;
          offsetY = 0;
        } else {
          renderWidth = swapImg.width;
          renderHeight = swapImg.width / targetRatio;
          offsetX = 0;
          offsetY = (swapImg.height - renderHeight) / 2;
        }

        canvas.width = renderWidth;
        canvas.height = renderHeight;

        ctx.drawImage(
          swapImg,
          offsetX, offsetY, renderWidth, renderHeight, 
          0, 0, renderWidth, renderHeight              
        );

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (e) {
        console.error("Lỗi crop ảnh:", e);
        resolve(swapResultBase64);
      }
    });
  };

  // --- HÀM FACE SWAP ---
  const handleFaceSwap = async (template) => {
    const currentSlot = selectedSlots[selectedImageIndex];
    if (!currentSlot || !currentSlot.photo) {
      // alert("Vui lòng chọn hoặc chụp ảnh trước khi Face Swap!");
      return;
    }
    if (selectedSwapId === template.id) return;

    if (swappedCache[selectedImageIndex] && swappedCache[selectedImageIndex][template.id]) {
      if (!originalImages[selectedImageIndex]) {
        setOriginalImages(prev => ({ ...prev, [selectedImageIndex]: currentSlot.photo }));
      }
      const cachedImage = swappedCache[selectedImageIndex][template.id];
      const updatedSlots = [...selectedSlots];
      updatedSlots[selectedImageIndex] = { ...updatedSlots[selectedImageIndex], photo: cachedImage };
      setSelectedSlots(updatedSlots);
      setSelectedSwapId(template.id);
      setAppliedFilters(prev => ({ ...prev, [selectedImageIndex]: 'original' }));
      return;
    }

    try {
      setIsProcessingSwap(true);
      setSelectedSwapId(template.id);

      let sourceFile;
      if (currentSlot.photo.startsWith('data:')) {
        const arr = currentSlot.photo.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){ u8arr[n] = bstr.charCodeAt(n); }
        sourceFile = new File([u8arr], "source.jpg", {type: mime});
      } else {
        sourceFile = await urlToFile(currentSlot.photo, "source.jpg", "image/jpeg");
      }

      let targetFile;
      if (template.prompt && template.prompt.trim() !== "") {
          const genFormData = new FormData();
          genFormData.append('image', sourceFile); 
          genFormData.append('prompt', template.prompt);
const genRes = await fetch(`${API_URL}/ai/user-generate-target`, {
  method: 'POST',
  body: genFormData
});
          const genData = await genRes.json();
          if (!genData.success) throw new Error(genData.error || "Lỗi khi tạo ảnh đích (Gen AI)");
          const targetRes = await fetch(genData.target_image);
          const targetBlob = await targetRes.blob();
          targetFile = new File([targetBlob], "target_gen.jpg", { type: "image/jpeg" });
      } else {
          targetFile = await urlToFile(template.illustration, "target_static.jpg", "image/jpeg");
      }

      const swapFormData = new FormData();
      swapFormData.append('source', sourceFile);
      swapFormData.append('target', targetFile);

const response = await fetch(`${API_URL}/ai/face-swap`, {
  method: 'POST',
  body: swapFormData
});
      const data = await response.json();

      if (data.success && data.swapped_image) {
        let originalPhoto = originalImages[selectedImageIndex];
        if (!originalPhoto) {
          originalPhoto = currentSlot.photo;
          setOriginalImages(prev => ({ ...prev, [selectedImageIndex]: originalPhoto }));
        }
        const croppedImage = await cropImageToMatchOriginal(data.swapped_image, originalPhoto);

        setSwappedCache(prev => ({
          ...prev,
          [selectedImageIndex]: { ...(prev[selectedImageIndex] || {}), [template.id]: croppedImage }
        }));
        const updatedSlots = [...selectedSlots];
        updatedSlots[selectedImageIndex] = { ...updatedSlots[selectedImageIndex], photo: croppedImage };
        setSelectedSlots(updatedSlots);
        setAppliedFilters(prev => ({ ...prev, [selectedImageIndex]: 'original' }));
      } else {
        throw new Error(data.error || "Lỗi không xác định từ Server FaceSwap");
      }
    } catch (error) {
      console.error('[FACESWAP ERROR]', error);
      // alert(`Lỗi Face Swap: ${error.message}`);
      setSelectedSwapId(null);
    } finally {
      setIsProcessingSwap(false);
    }
  };

  // --- HÀM BACKGROUND AI ---
  const handleBackgroundAI = async (template) => {
    const currentSlot = selectedSlots[selectedImageIndex];
    if (!currentSlot || !currentSlot.photo) {
      // alert("Vui lòng chọn hoặc chụp ảnh trước!");
      return;
    }
    if (selectedBgId === template.id) return;

    if (bgCache[selectedImageIndex] && bgCache[selectedImageIndex][template.id]) {
      if (!originalImages[selectedImageIndex]) {
        setOriginalImages(prev => ({...prev, [selectedImageIndex]: currentSlot.photo}));
      }
      const cachedImage = bgCache[selectedImageIndex][template.id];
      const updatedSlots = [...selectedSlots];
      updatedSlots[selectedImageIndex] = { ...updatedSlots[selectedImageIndex], photo: cachedImage };
      setSelectedSlots(updatedSlots);
      setSelectedBgId(template.id);
      setAppliedFilters(prev => ({ ...prev, [selectedImageIndex]: 'original' }));
      return;
    }

    try {
      setIsProcessingBg(true);
      setSelectedBgId(template.id);

      let sourceFile;
      if (currentSlot.photo.startsWith('data:')) {
        const arr = currentSlot.photo.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){ u8arr[n] = bstr.charCodeAt(n); }
        sourceFile = new File([u8arr], "foreground.jpg", {type: mime});
      } else {
        sourceFile = await urlToFile(currentSlot.photo, "foreground.jpg", "image/jpeg");
      }
      const targetFile = await urlToFile(template.illustration, "background.jpg", "image/jpeg");

      const formData = new FormData();
      formData.append('foreground', sourceFile);
      formData.append('background', targetFile);

const response = await fetch(`${API_URL}/ai/background-ai`, {
  method: 'POST',
  body: formData
});
      const data = await response.json();

      if (data.success && data.result_image) {
        let originalPhoto = originalImages[selectedImageIndex];
        if (!originalPhoto) {
          originalPhoto = currentSlot.photo;
          setOriginalImages(prev => ({ ...prev, [selectedImageIndex]: originalPhoto }));
        }
        const croppedImage = await cropImageToMatchOriginal(data.result_image, originalPhoto);
        setBgCache(prev => ({
          ...prev,
          [selectedImageIndex]: { ...(prev[selectedImageIndex] || {}), [template.id]: croppedImage }
        }));
        const updatedSlots = [...selectedSlots];
        updatedSlots[selectedImageIndex] = { ...updatedSlots[selectedImageIndex], photo: croppedImage };
        setSelectedSlots(updatedSlots);
        setAppliedFilters(prev => ({ ...prev, [selectedImageIndex]: 'original' }));
      } else {
        throw new Error(data.error || "Lỗi server");
      }
    } catch (error) {
      console.error('[BG-AI ERROR]', error);
      // alert(`Lỗi: ${error.message}`);
      setSelectedBgId(null);
    } finally {
      setIsProcessingBg(false);
    }
  };
  
  const handleResetAI = () => {
     if (!originalImages[selectedImageIndex]) return;
     const updatedSlots = [...selectedSlots];
     updatedSlots[selectedImageIndex] = {
         ...updatedSlots[selectedImageIndex],
         photo: originalImages[selectedImageIndex]
     };
     setSelectedSlots(updatedSlots);
     setSelectedSwapId(null); 
     setSelectedBgId(null);
  };

  useEffect(() => {
    const fetchStickers = async () => {
      try {
        setLoadingStickers(true);
        const authStr = localStorage.getItem('auth');
        if (!authStr) return setLoadingStickers(false);
        const auth = JSON.parse(authStr);
        const url = `${API_URL}/stickers?id_admin=${auth.id_admin}&limit=1000`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.status === 'success') {
          setAllStickers(data.data || []);
          setFilteredStickers(data.data || []);
          const types = [...new Set((data.data || []).map(s => s.type).filter(Boolean))];
          setStickerTypes(types.length > 0 ? types : []);
        }
      } catch (error) {
        console.error('[ERROR] Lỗi tải stickers:', error);
      } finally {
        setLoadingStickers(false);
      }
    };
    fetchStickers();
  }, []);

  useEffect(() => {
    if (selectedStickerType === 'all') {
      setFilteredStickers(allStickers);
    } else {
      setFilteredStickers(allStickers.filter(s => s.type === selectedStickerType));
    }
  }, [selectedStickerType, allStickers]);

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  };

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

    for (let idx = 0; idx < images.length; idx++) {
      const pos = positions[idx];
      const stickers = imageStickers[idx] || [];

      for (const sticker of stickers) {
        if (sticker.x >= 5 && sticker.x <= 95 && sticker.y >= 5 && sticker.y <= 95) {
          try {
            const stickerImg = await loadImage(sticker.src);
            ctx.save();
            const stickerX = pos.x + (sticker.x / 100) * imageWidth;
            const stickerY = pos.y + (sticker.y / 100) * imageHeight;
            ctx.translate(stickerX, stickerY);
            ctx.rotate((sticker.rotation * Math.PI) / 180);
            ctx.scale(sticker.scale, sticker.scale);
            const stickerSize = 60; 
            ctx.drawImage(stickerImg, -stickerSize / 2, -stickerSize / 2, stickerSize, stickerSize);
            ctx.restore();
          } catch (error) {
            console.error('[ERROR] Failed to load sticker:', sticker.src, error);
          }
        }
      }
    }

    return canvas.toDataURL('image/png');
  };

  const { formattedCountdown, countdown } = useCountdown();

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
          imageStickers: imageStickers 
        }
      });
    } catch (error) {
      console.error("Lỗi tạo ảnh tổng hợp:", error);
    }
  };

  const handleContinue = () => {
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
  };

  useEffect(() => {
    if (countdown === 0) {
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
        currentSelectedSlots: selectedSlots,
        currentAppliedFilters: appliedFilters,
        selectedFrameId: selectedFrameId,
        selectedFrame: selectedFrame
      }
    });
  };

  const handleApplyFilter = async (filterId) => {
    if (filterId === 'anime') {
        const currentSlot = selectedSlots[selectedImageIndex];
        // if (!currentSlot || !currentSlot.photo) return alert("Vui lòng chọn ảnh trước!");

        if (swappedCache[selectedImageIndex] && swappedCache[selectedImageIndex]['anime']) {
            const cachedAnime = swappedCache[selectedImageIndex]['anime'];
            const updatedSlots = [...selectedSlots];
            updatedSlots[selectedImageIndex] = { ...updatedSlots[selectedImageIndex], photo: cachedAnime };
            setSelectedSlots(updatedSlots);
            setAppliedFilters(prev => ({ ...prev, [selectedImageIndex]: 'anime' }));
            return;
        }

        try {
            setLoadingMessage("Đang vẽ lại theo phong cách Anime...");
            setLoading(true); 
            
            let fileToSend;
            if (currentSlot.photo.startsWith('data:')) {
                const arr = currentSlot.photo.split(',');
                const mime = arr[0].match(/:(.*?);/)[1];
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while(n--){ u8arr[n] = bstr.charCodeAt(n); }
                fileToSend = new File([u8arr], "photo.jpg", {type: mime});
            } else {
                fileToSend = await urlToFile(currentSlot.photo, "photo.jpg", "image/jpeg");
            }

            const formData = new FormData();
            formData.append('image', fileToSend);

            console.log("Đang tạo ảnh Anime...");
const res = await fetch(`${API_URL}/ai/anime-style`, {
  method: 'POST',
  body: formData
});
            const data = await res.json();

            if (data.success) {
                if (!originalImages[selectedImageIndex]) {
                    setOriginalImages(prev => ({ ...prev, [selectedImageIndex]: currentSlot.photo }));
                }

                setSwappedCache(prev => ({
                    ...prev,
                    [selectedImageIndex]: {
                        ...(prev[selectedImageIndex] || {}),
                        'anime': data.anime_image
                    }
                }));

                const updatedSlots = [...selectedSlots];
                updatedSlots[selectedImageIndex] = { ...updatedSlots[selectedImageIndex], photo: data.anime_image };
                setSelectedSlots(updatedSlots);
                
                setAppliedFilters(prev => ({ ...prev, [selectedImageIndex]: 'anime' }));
            } else {
                // alert("Lỗi tạo ảnh Anime: " + data.error);
            }
        } catch (error) {
            console.error(error);
            // alert("Lỗi kết nối server!");
        } finally {
            setLoading(false);
        }

    } else {
        if (appliedFilters[selectedImageIndex] === 'anime' || appliedFilters[selectedImageIndex] === 'enhanced') {
             if (originalImages[selectedImageIndex]) {
                 const updatedSlots = [...selectedSlots];
                 updatedSlots[selectedImageIndex] = { 
                     ...updatedSlots[selectedImageIndex], 
                     photo: originalImages[selectedImageIndex] 
                 };
                 setSelectedSlots(updatedSlots);
             }
        }

        setAppliedFilters(prev => ({
            ...prev,
            [selectedImageIndex]: filterId
        }));
    }
  };

  const handleResetToDefault = (index) => {
    if (!originalImages[index]) {
        console.warn(`Không tìm thấy ảnh gốc cho slot ${index}`);
        return;
    }
    const updatedSlots = [...selectedSlots];
    updatedSlots[index] = {
      ...updatedSlots[index],
      photo: originalImages[index] 
    };
    setSelectedSlots(updatedSlots);
    setAppliedFilters(prev => ({
      ...prev,
      [index]: 'original'
    }));
    if (activeTab === 'faceswap') setSelectedSwapId(null);
  };

  const handleEnhanceImage = async (index) => {
    const slot = selectedSlots[index];
    if (!slot) return;
    
    setLoadingMessage("Đang tối ưu độ nét và khử nhiễu...");
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

const res = await fetch(`${API_URL}/ai/enhance`, {
  method: 'POST',
  body: formData
});

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error('Server AI trả về lỗi: ' + (text.substring(0, 200) || 'Không xác định'));
      }

      const data = await res.json();
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
        // alert('✅ Ảnh đã được tối ưu!');

      } else {
        throw new Error(data.error || data.message || 'Làm nét thất bại');
      }

    } catch (err) {
      console.error('[ERROR] Enhance failed:', err);
      // alert('❌ Lỗi làm nét ảnh: ' + (err.message || 'Không xác định'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddStickerToPreview = (sticker) => {
    if (selectedPreviewStickerId) {
      validateAndCleanSticker(selectedPreviewStickerId);
    }
    const newSticker = {
      id: Date.now() + Math.random(),
      src: sticker.sticker,
      x: 50, y: 50, scale: 1, rotation: 0
    };
    setImageStickers(prev => ({
      ...prev,
      [selectedImageIndex]: [...(prev[selectedImageIndex] || []), newSticker]
    }));
    setSelectedPreviewStickerId(newSticker.id);
  };

  const handleStickerClick = (sticker) => {
    const currentStickers = imageStickers[selectedImageIndex] || [];
    const validStickers = currentStickers.filter(s =>
      s.x >= 5 && s.x <= 95 && s.y >= 5 && s.y <= 95
    );

    if (validStickers.length < currentStickers.length) {
      setImageStickers(prev => ({
        ...prev,
        [selectedImageIndex]: validStickers
      }));
    }
    setTimeout(() => {
      handleAddStickerToPreview(sticker);
    }, 50);
  };

  const handlePreviewStickerDragStart = (e, stickerId) => {
    e.preventDefault();
    e.stopPropagation();

    let imageElement = null;
    const clickedElement = e.currentTarget;

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

    if (!imageElement) return;

    const sticker = (imageStickers[selectedImageIndex] || []).find(s => s.id === stickerId);
    if (!sticker) return;

    const imgRect = imageElement.getBoundingClientRect();
    const natWidth = imageElement.naturalWidth;
    const natHeight = imageElement.naturalHeight;

    if (natWidth === 0 || natHeight === 0) return;

    const natRatio = natWidth / natHeight;
    const displayRatio = imgRect.width / imgRect.height;

    let actualImgLeft = imgRect.left;
    let actualImgTop = imgRect.top;
    let actualImgWidth = imgRect.width;
    let actualImgHeight = imgRect.height;

    if (Math.abs(natRatio - displayRatio) > 0.01) {
      if (natRatio > displayRatio) {
        actualImgHeight = imgRect.width / natRatio;
        actualImgTop = imgRect.top + (imgRect.height - actualImgHeight) / 2;
      } else {
        actualImgWidth = imgRect.height * natRatio;
        actualImgLeft = imgRect.left + (imgRect.width - actualImgWidth) / 2;
      }
    }

    const margin = 0.05;
    const validLeft = actualImgLeft + actualImgWidth * margin;
    const validRight = actualImgLeft + actualImgWidth * (1 - margin);
    const validTop = actualImgTop + actualImgHeight * margin;
    const validBottom = actualImgTop + actualImgHeight * (1 - margin);

    const handleMove = (moveEvent) => {
      moveEvent.preventDefault();
      const currentX = moveEvent.type.includes('mouse') ? moveEvent.clientX : moveEvent.touches[0].clientX;
      const currentY = moveEvent.type.includes('mouse') ? moveEvent.clientY : moveEvent.touches[0].clientY;

      const isInside = currentX >= validLeft && currentX <= validRight &&
        currentY >= validTop && currentY <= validBottom;

      if (!isInside) {
        setImageStickers(prev => ({
          ...prev,
          [selectedImageIndex]: (prev[selectedImageIndex] || []).filter(s => s.id !== stickerId)
        }));
        setSelectedPreviewStickerId(null);
        handleEnd();
        return;
      }

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
  const handleDeletePreviewSticker = (stickerId) => {
    setImageStickers(prev => ({
      ...prev,
      [selectedImageIndex]: (prev[selectedImageIndex] || []).filter(s => s.id !== stickerId)
    }));
    if (selectedPreviewStickerId === stickerId) {
      setSelectedPreviewStickerId(null);
    }
  };
  
  useEffect(() => {
    const currentStickers = imageStickers[selectedImageIndex] || [];
    const invalidStickers = currentStickers.filter(s =>
      s.x < 5 || s.x > 95 || s.y < 5 || s.y > 95
    );
    if (invalidStickers.length > 0) {
      const validStickers = currentStickers.filter(s =>
        s.x >= 5 && s.x <= 95 && s.y >= 5 && s.y <= 95
      );
      setImageStickers(prev => ({
        ...prev,
        [selectedImageIndex]: validStickers
      }));
      if (selectedPreviewStickerId && invalidStickers.some(s => s.id === selectedPreviewStickerId)) {
        setSelectedPreviewStickerId(null);
      }
    }
  }, [imageStickers, selectedImageIndex]);

  useEffect(() => {
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
            setImageStickers(prev => ({
              ...prev,
              [imgIdx]: stickers.filter(s =>
                s.x >= 5 && s.x <= 95 && s.y >= 5 && s.y <= 95
              )
            }));
          }
        }
      });
      setSelectedPreviewStickerId(null);
    }
  }, [selectedImageIndex]);

  const handleStickerConfirm = () => {
    if (!selectedPreviewStickerId) return;
    const sticker = (imageStickers[selectedImageIndex] || []).find(s => s.id === selectedPreviewStickerId);
    if (sticker) {
      if (sticker.x < 5 || sticker.x > 95 || sticker.y < 5 || sticker.y > 95) {
        setImageStickers(prev => ({
          ...prev,
          [selectedImageIndex]: (prev[selectedImageIndex] || []).filter(s => s.id !== selectedPreviewStickerId)
        }));
        // alert('⚠️ Sticker bị tràn viền! Vui lòng đặt lại sticker trong khung ảnh.');
        setSelectedPreviewStickerId(null);
        return;
      }
    }
    setSelectedPreviewStickerId(null);
  };
  const validateAndCleanSticker = (stickerId) => {
    const sticker = (imageStickers[selectedImageIndex] || []).find(s => s.id === stickerId);
    if (sticker) {
      if (sticker.x < 5 || sticker.x > 95 || sticker.y < 5 || sticker.y > 95) {
        setImageStickers(prev => ({
          ...prev,
          [selectedImageIndex]: (prev[selectedImageIndex] || []).filter(s => s.id !== stickerId)
        }));
      }
    }
  };
  const handleStickerSelect = (stickerId) => {
    if (selectedPreviewStickerId && selectedPreviewStickerId !== stickerId) {
      validateAndCleanSticker(selectedPreviewStickerId);
    }
    setSelectedPreviewStickerId(stickerId);
  };
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const renderSlotItem = (slot, index) => {
    let slotWidth, slotHeight;
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

    const slotHeightNum = parseInt(slotHeight);
    const previewBaseHeight = 320;
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
      display: 'flex',
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
            <div 
              className="position-relative" 
              style={{ 
                width: 'fit-content', 
                height: 'fit-content',
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'flex' 
              }}
            >
              <img
                src={slot.photo}
                alt={`Slot ${index}`}
                style={{
                  maxWidth: '100%', 
                  maxHeight: slotHeight, 
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  transform: slot.flip ? 'scaleX(-1)' : 'none',
                  filter: currentFilter,
                  borderRadius: '8px',
                  display: 'block'
                }}
              />

              {thumbStickers.map(sticker => (
                <img
                  key={sticker.id}
                  src={sticker.src}
                  alt="Sticker"
                  style={{
                    position: 'absolute',
                    left: `${sticker.x}%`,
                    top: `${sticker.y}%`,
                    transform: `translate(-50%, -50%) scale(${sticker.scale * stickerScaleRatio}) rotate(${sticker.rotation}deg)`,
                    width: '60px',
                    height: '60px',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                    zIndex: 3
                  }}
                />
              ))}
              
              <div style={{ position: 'absolute', top: '5px', left: '5px', zIndex: 10 }}>
                 <button
                  className="btn btn-sm btn-warning d-flex align-items-center justify-content-center p-0"
                  style={{ width: '32px', height: '32px' }}
                  title="Chụp lại"
                  onClick={(e) => { e.stopPropagation(); handleRetakePhoto(index); }}
                >
                  <img src="icon-camera.png" alt="" style={{ width: '16px', height: '16px' }} />
                </button>
              </div>

              <div style={{ position: 'absolute', bottom: '5px', right: '5px', zIndex: 10 }}>
                <button
                  className="btn btn-light"
                  onClick={(e) => { e.stopPropagation(); handleFlipImage(index); }}
                  style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <img src="icon-flip.png" alt="" style={{ width: '16px', height: '16px' }} />
                </button>
              </div>

              <div style={{ position: 'absolute', top: '5px', right: '5px', zIndex: 10 }}>
                <button
                  className="btn btn-light"
                  onClick={(e) => { e.stopPropagation(); handleResetToDefault(index); }}
                  style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <img src="icon-review.png" alt="" style={{ width: '16px', height: '16px' }} />
                </button>
              </div>

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
            display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
            gap: '15px', width: '100%', height: '100%', padding: '20px', position: 'relative'
          }}>
            {selectedSlots.map((slot, index) => renderSlotItem(slot, index))}
          </div>
        );
      case '41':
        return (
          <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            gap: '12px', width: '100%', height: '100%', padding: '20px', position: 'relative'
          }}>
            {selectedSlots.map((slot, index) => renderSlotItem(slot, index))}
          </div>
        );
      case '42':
        return (
          <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            gap: '15px', width: '100%', height: '100%', padding: '20px', position: 'relative'
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
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            gap: '12px', width: '100%', height: '100%', padding: '20px', position: 'relative'
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
            display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center',
            alignItems: 'flex-start', height: '100%', padding: '20px', overflowY: 'auto', position: 'relative'
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
      <div className="countdown">
        ⌛: {formattedCountdown}
      </div>
      
      {(isProcessingSwap || isProcessingBg || loading) && (
        <div className="global-loading-overlay">
           <div className="loading-content">
              <div className="spinner-border text-light" style={{width: '3rem', height: '3rem'}} role="status"></div>
              <h4 className="mt-3 text-white">
                {isProcessingSwap ? "Đang xử lý Face Swap..." : 
                 isProcessingBg ? "Đang xử lý Background AI..." : 
                 loadingMessage}
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

          <div className="tab-content mt-3">
            <div className={`tab-section ${activeTab === 'filter' ? 'active' : ''}`}>
              <FilterSection
                filters={filters}
                appliedFilters={appliedFilters}
                selectedImageIndex={selectedImageIndex}
                onApplyFilter={handleApplyFilter}
              />
            </div>

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

             <div className={`tab-section ${activeTab === 'faceswap' ? 'active' : ''}`}>
               <FaceSwapSection 
                  swapTemplates={filteredSwapTemplates}
                  loadingTemplates={loadingTemplates}
                  selectedSwapId={selectedSwapId}
                  filterCategories={swapCategories}
                  selectedCategory={selectedSwapCategory}
                  onSelectTemplate={handleFaceSwap}
                  onCategoryChange={setSelectedSwapCategory}
                  onResetSwap={handleResetAI} 
                  // isProcessingSwap={isProcessingSwap}
               />
            </div>

            <div className={`tab-section ${activeTab === 'background' ? 'active' : ''}`}>
               <FaceSwapSection 
                  swapTemplates={filteredBgTemplates}
                  loadingTemplates={loadingBgTemplates}
                  selectedSwapId={selectedBgId}
                  filterCategories={bgCategories}
                  selectedCategory={selectedBgCategory}
                  onSelectTemplate={handleBackgroundAI}
                  onCategoryChange={setSelectedBgCategory}
                  onResetSwap={handleResetAI}
                  // isProcessingSwap={isProcessingBg} 
               />
            </div>
          </div>

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