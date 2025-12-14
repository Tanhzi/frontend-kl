import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './ImagePreview.css';

const ImagePreview = ({
  selectedSlot,
  selectedImageIndex,
  hasEnhancedImage,
  originalImage,
  filters,
  appliedFilters,
  previewStickers,
  selectedPreviewStickerId,
  onStickerDragStart,
  onStickerScale,
  onStickerRotate,
  onStickerDelete,
  onStickerSelect,
  onStickerConfirm
}) => {
  const sliderRef = useRef(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleSliderMouseDown = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleSliderMouseUp = () => { setIsDragging(false); };
  const handleSliderTouchStart = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleSliderTouchEnd = () => { setIsDragging(false); };

  const handleSliderMouseMove = (e) => {
    if (!isDragging || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleSliderTouchMove = (e) => {
    if (!isDragging || !sliderRef.current) return;
    const touch = e.touches[0];
    const rect = sliderRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleSliderMouseMove);
      document.addEventListener('mouseup', handleSliderMouseUp);
      document.addEventListener('touchmove', handleSliderTouchMove);
      document.addEventListener('touchend', handleSliderTouchEnd);
    } else {
      document.removeEventListener('mousemove', handleSliderMouseMove);
      document.removeEventListener('mouseup', handleSliderMouseUp);
      document.removeEventListener('touchmove', handleSliderTouchMove);
      document.removeEventListener('touchend', handleSliderTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleSliderMouseMove);
      document.removeEventListener('mouseup', handleSliderMouseUp);
      document.removeEventListener('touchmove', handleSliderTouchMove);
      document.removeEventListener('touchend', handleSliderTouchEnd);
    };
  }, [isDragging]);

 const renderPreviewStickers = () => {
  return (
    <>
      {previewStickers
        .filter(sticker => {
          // CHỈ HIỂN THỊ STICKER HỢP LỆ (5-95%)
          return sticker.x >= 5 && sticker.x <= 95 && sticker.y >= 5 && sticker.y <= 95;
        })
        .map(sticker => {
          const isSelected = selectedPreviewStickerId === sticker.id;
          return (
            <div
              key={sticker.id}
              className={`placed-sticker ${isSelected ? 'selected' : ''}`}
              style={{
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                transform: `translate(-50%, -50%)`,
                cursor: 'move',
                zIndex: isSelected ? 1000 : 100,
                transition: isSelected ? 'none' : 'all 0.2s ease',
                position: 'absolute'
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onStickerSelect(sticker.id);
                onStickerDragStart(e, sticker.id);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                onStickerSelect(sticker.id);
                onStickerDragStart(e, sticker.id);
              }}
            >
              <img
                src={sticker.src}
                alt="Sticker"
                style={{
                  width: '60px',
                  height: '60px',
                  objectFit: 'contain',
                  transform: `scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
                  transition: 'transform 0.1s ease',
                  pointerEvents: 'none'
                }}
              />
              {isSelected && (
                <div className="sticker-controls">
                  <button className="sticker-control-btn zoom-in" onClick={(e) => { e.stopPropagation(); onStickerScale(sticker.id, 0.1); }}>+</button>
                  <button className="sticker-control-btn delete" onClick={(e) => { e.stopPropagation(); onStickerDelete(sticker.id); }}>✕</button>
                  <button className="sticker-control-btn zoom-out" onClick={(e) => { e.stopPropagation(); onStickerScale(sticker.id, -0.1); }}>−</button>
                  <button className="sticker-control-btn rotate-ccw" onClick={(e) => { e.stopPropagation(); onStickerRotate(sticker.id, -15); }}>↺</button>
                  <button className="sticker-control-btn confirm" onClick={(e) => { e.stopPropagation(); onStickerConfirm(); }}>✓</button>
                  <button className="sticker-control-btn rotate-cw" onClick={(e) => { e.stopPropagation(); onStickerRotate(sticker.id, 15); }}>↻</button>
                </div>
              )}
            </div>
          );
        })}
    </>
  );
};

  if (!selectedSlot) return null;

  const commonImageStyle = {
    height: '320px',
    width: 'auto',
    maxWidth: '100%',
    objectFit: 'contain',
    display: 'block',
    filter: filters.find(f => f.id === appliedFilters[selectedImageIndex])?.filter || 'none',
    transform: selectedSlot.flip ? 'scaleX(-1)' : 'none',
    borderRadius: '8px'
  };

  return (
    <div className="selected-image-preview d-flex justify-content-center align-items-center bg-light rounded pt-3 pb-3" style={{ minHeight: '350px' }}>
      {hasEnhancedImage ? (
        <div
          ref={sliderRef}
          className="compare-slider-container"
          onMouseDown={handleSliderMouseDown}
          onTouchStart={handleSliderTouchStart}
          style={{
            position: 'relative',
            width: 'fit-content',
            display: 'inline-block',
            userSelect: 'none'
          }}
        >
          <img
            src={originalImage}
            alt="Original"
            style={commonImageStyle}
            draggable={false}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
              transition: isDragging ? 'none' : 'clip-path 0.1s ease'
            }}
          >
            <img
              src={selectedSlot.photo}
              alt="Enhanced"
              style={commonImageStyle}
              draggable={false}
            />
          </div>
          <div className="compare-slider-divider" style={{ left: `${sliderPosition}%` }}>
            <div className="compare-slider-handle">
              <div className="compare-slider-arrows">
                <div className="compare-slider-arrow-left" />
                <div className="compare-slider-arrow-right" />
              </div>
            </div>
          </div>
          <div className="compare-label compare-label-original">TRƯỚC</div>
          <div className="compare-label compare-label-enhanced">SAU</div>

          {renderPreviewStickers()}
        </div>
      ) : (
        <div style={{
          position: 'relative',
          width: 'fit-content',
          display: 'inline-block'
        }}>
          <img
            src={selectedSlot.photo}
            alt="Preview"
            style={commonImageStyle}
            draggable={false}
          />
          {renderPreviewStickers()}
        </div>
      )}
    </div>
  );
};

ImagePreview.propTypes = {
  selectedSlot: PropTypes.object,
  selectedImageIndex: PropTypes.number.isRequired,
  hasEnhancedImage: PropTypes.bool,
  originalImage: PropTypes.string,
  filters: PropTypes.array,
  appliedFilters: PropTypes.array,
  previewStickers: PropTypes.array,
  selectedPreviewStickerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onStickerDragStart: PropTypes.func,
  onStickerScale: PropTypes.func,
  onStickerRotate: PropTypes.func,
  onStickerDelete: PropTypes.func,
  onStickerSelect: PropTypes.func,
  onStickerConfirm: PropTypes.func
};

export default ImagePreview;