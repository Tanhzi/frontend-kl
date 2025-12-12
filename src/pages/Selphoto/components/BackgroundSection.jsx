import React from 'react';
import PropTypes from 'prop-types';
// Tận dụng CSS của faceswap vì cấu trúc giống hệt nhau
import './FaceSwapSection.css'; 

const BackgroundSection = ({ 
  backgrounds,          // Danh sách ảnh nền
  loading,              // Trạng thái loading API
  selectedBgId,         // ID nền đang chọn
  filterCategories,     // Danh mục (nếu có)
  selectedCategory,
  isProcessing,         // Đang gọi AI xử lý
  onSelectBackground,   // Hàm chọn nền
  onCategoryChange,
  onReset               // Hàm reset về gốc
}) => {

  return (
    <div className="faceswap-section mt-4">
      {/* HEADER & FILTER */}
      <div className="faceswap-header">
        <h4 className="mb-3 text-center">Chọn bối cảnh AI</h4>
        
        {filterCategories.length > 0 && (
          <div className="faceswap-categories">
            <button 
              className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => onCategoryChange('all')}
            >
              Tất cả
            </button>
            {filterCategories.map((cat, index) => (
              <button
                key={index}
                className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => onCategoryChange(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GRID ẢNH */}
      <div className="faceswap-grid-container">
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
          </div>
        ) : (
          <div className="faceswap-grid">
            {/* Nút Mặc định (Không áp dụng) */}
            <div 
              className={`faceswap-item no-effect ${!selectedBgId ? 'selected' : ''}`}
              onClick={onReset}
            >
              <div className="no-effect-icon">🚫</div>
              <span>Gốc</span>
            </div>

            {/* Danh sách Backgrounds */}
            {backgrounds.map(item => (
              <div
                key={item.id}
                className={`faceswap-item ${selectedBgId === item.id ? 'selected' : ''}`}
                onClick={() => !isProcessing && onSelectBackground(item)}
              >
                <img src={item.illustration} alt={item.name} loading="lazy" />
                <div className="item-name">{item.name}</div>
                
                {selectedBgId === item.id && isProcessing && (
                  <div className="processing-overlay">
                    <div className="spinner-border spinner-border-sm text-light" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="processing-status text-center mt-2 text-primary">
          <span className="spinner-grow spinner-grow-sm me-2"></span>
          Đang tách nền và ghép cảnh...
        </div>
      )}
    </div>
  );
};

BackgroundSection.propTypes = {
  backgrounds: PropTypes.array,
  loading: PropTypes.bool,
  selectedBgId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  filterCategories: PropTypes.array,
  selectedCategory: PropTypes.string,
  isProcessing: PropTypes.bool,
  onSelectBackground: PropTypes.func,
  onCategoryChange: PropTypes.func,
  onReset: PropTypes.func
};

BackgroundSection.defaultProps = {
  backgrounds: [],
  loading: false,
  filterCategories: [],
  selectedCategory: 'all',
  isProcessing: false,
  onSelectBackground: () => {},
  onCategoryChange: () => {},
  onReset: () => {}
};

export default BackgroundSection;