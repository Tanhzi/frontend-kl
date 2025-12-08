import React from 'react';
import PropTypes from 'prop-types';
import './FilterSection.css';

const FilterSection = ({ filters, appliedFilters, selectedImageIndex, onApplyFilter }) => {
  return (
    <div className="filters-container mb-3">
      {Array.from({ length: Math.ceil(filters.length / 3) }).map((_, rowIndex) => {
        const startIndex = rowIndex * 3;
        const rowFilters = filters.slice(startIndex, startIndex + 3);
        const displayFilters = [...rowFilters, ...Array(3 - rowFilters.length).fill(null)];

        return (
          <div key={rowIndex} className="d-flex justify-content-between mb-2" style={{ gap: '10px' }}>
            {displayFilters.map((filter, colIndex) =>
              <div key={filter?.id || `empty-${colIndex}`} style={{ flex: 1, minWidth: 0 }}>
                {filter ? (
                  <button
                    className={`btn filter-btn w-100 ${appliedFilters[selectedImageIndex] === filter.id ? 'btn-primary active' : 'btn-outline-primary'}`}
                    onClick={() => onApplyFilter(filter.id)}
                  >
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {filter.name}
                    </span>
                  </button>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

FilterSection.propTypes = {
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired
    })
  ).isRequired,
  appliedFilters: PropTypes.array.isRequired,
  selectedImageIndex: PropTypes.number.isRequired,
  onApplyFilter: PropTypes.func.isRequired
};

export default FilterSection;