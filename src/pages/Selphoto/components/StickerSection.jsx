import React from 'react';
import PropTypes from 'prop-types';
import './StickerSection.css';

const StickerSection = ({ 
  filteredStickers, 
  loadingStickers, 
  stickerTypes, 
  selectedStickerType, 
  showStickerTypeDropdown,
  onStickerClick,
  onStickerTypeChange,
  onToggleDropdown
}) => {
  return (
    <div className="sticker-section mt-4">
      <div className="sticker-header">
        <h4 className="mb-3 text-center">Chọn sticker</h4>
        <div className="sticker-type-filter">
          <button
            className="sticker-filter-toggle"
            onClick={onToggleDropdown}
          >
            {selectedStickerType === 'all' ? 'Tất cả' : selectedStickerType}
            <span className={`dropdown-arrow ${showStickerTypeDropdown ? 'open' : ''}`}>▼</span>
          </button>
          {showStickerTypeDropdown && (
            <div className="sticker-type-dropdown">
              <button
                className={selectedStickerType === 'all' ? 'active' : ''}
                onClick={() => onStickerTypeChange('all')}
              >
                Tất cả
              </button>
              {stickerTypes.map(type => (
                <button
                  key={type}
                  className={selectedStickerType === type ? 'active' : ''}
                  onClick={() => onStickerTypeChange(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="sticker-grid">
        {loadingStickers ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
          </div>
        ) : filteredStickers.length === 0 ? (
          <div className="text-center py-4 text-muted">
            Không có sticker nào
          </div>
        ) : (
          filteredStickers.map(sticker => (
            <div
              key={sticker.id}
              className="sticker-item"
              onClick={() => onStickerClick(sticker)}
            >
              <img src={sticker.sticker} alt={sticker.type} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

StickerSection.propTypes = {
  filteredStickers: PropTypes.array.isRequired,
  loadingStickers: PropTypes.bool,
  stickerTypes: PropTypes.array,
  selectedStickerType: PropTypes.string,
  showStickerTypeDropdown: PropTypes.bool,
  onStickerClick: PropTypes.func,
  onStickerTypeChange: PropTypes.func,
  onToggleDropdown: PropTypes.func
};

StickerSection.defaultProps = {
  filteredStickers: [],
  loadingStickers: false,
  stickerTypes: [],
  selectedStickerType: 'all',
  showStickerTypeDropdown: false,
  onStickerClick: () => {},
  onStickerTypeChange: () => {},
  onToggleDropdown: () => {}
};

export default StickerSection;