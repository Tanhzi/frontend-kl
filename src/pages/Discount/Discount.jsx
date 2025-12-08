import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Chatbot from '../../components/Chatbot';
import './Discount.css';
import { useCountdown } from "../../contexts/CountdownContext";

function Discount() {
  const navigate = useNavigate();
  const location = useLocation();
  const { price, size, cut } = location.state || {};

  //Lấy thông tin từ auth
  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const [auth, setAuth] = useState(getAuth());

  const { id,id_admin } = auth;

  // Sử dụng number cho depositAmount để dễ tính toán
  const [depositAmount, setDepositAmount] = useState(0);
  const [discountCode, setDiscountCode] = useState('');
  const [discountValue, setDiscountValue] = useState(0);
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [focusedField, setFocusedField] = useState('');

  const { initializeCountdown } = useCountdown();

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

  // ✅ Gọi initialize khi vào Discount
  useEffect(() => {
    if (id_admin && initializeCountdown) {
      initializeCountdown(id_admin);
    }
  }, [id_admin, initializeCountdown]);

  const discountInputRef = useRef(null);

  // Kết nối tới WebSocket backend để nhận tiền từ server.js
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8088');

    ws.onopen = () => {
      console.log('✅ Kết nối WebSocket thành công.');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.deposit !== undefined) {
          setDepositAmount(prev => prev + data.deposit);
        }
      } catch (error) {
        console.error('❌ Lỗi parse dữ liệu từ WebSocket:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ Lỗi WebSocket:', error);
    };

    return () => ws.close();
  }, []);

  // Lấy danh sách mã giảm giá từ server
useEffect(() => {
  const fetchDiscounts = async () => {
    try {
      // 🔥 Gửi id_admin qua query string
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/discounts?id_admin=${id_admin}`);
      const data = await response.json();
      setAvailableDiscounts(data);
    } catch (error) {
      console.error("❌ Không thể tải mã giảm giá:", error);
    }
  };
  fetchDiscounts();
}, []);

  const parsePrice = (priceString) => {
    if (!priceString) return 0;
    return parseInt(priceString.replace(/\D/g, ''), 10);
  };

  // Giữ lại logic nhập mã giảm giá nếu cần
  const handleKeyPress = (value) => {
    if (focusedField === 'discountCode') {
      setDiscountCode(prev => prev + value);
    }
  };

  const handleBackspace = () => {
    if (focusedField === 'discountCode') {
      setDiscountCode(prev => prev.slice(0, -1));
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      alert('Vui lòng nhập mã giảm giá!');
      return;
    }
  
    try {
      // Gọi API để kiểm tra mã giảm giá mà không tăng count_quantity
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/discounts/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: discountCode,
          id_admin: id_admin, // Thay đổi id_admin theo yêu cầu
        })
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setDiscountValue(result.value);
        console.log(`✅ Đã áp dụng mã giảm giá: ${discountCode}`);
        
        // Kiểm tra xem sau khi áp dụng giảm giá, số tiền cần nạp có bằng 0 không
        const requiredAfterDiscount = parsePrice(price) - result.value;
        if (requiredAfterDiscount <= 0) {
          // Nếu số tiền cần nạp sau giảm giá <= 0, thực hiện lưu thông tin thanh toán và chuyển trang
          const success = await submitPaymentData(result.value);
          if (success) {
            navigate('/Beframe', { state: { size, cut } });
          }
        }
      } else {
        // Hiển thị thông báo lỗi
        alert(result.message || 'Không thể áp dụng mã giảm giá!');
        setDiscountCode('');
        setDiscountValue(0);
      }
    } catch (error) {
      console.error('❌ Lỗi khi áp dụng mã giảm giá:', error);
      alert('Có lỗi xảy ra khi áp dụng mã giảm giá');
      setDiscountCode('');
      setDiscountValue(0);
    }
  };

  // Tính số tiền cần nạp sau giảm giá
  const requiredAmount = parsePrice(price) - discountValue;
  const currentDeposit = depositAmount;

  // Hàm gửi dữ liệu thanh toán lên server
  const submitPaymentData = async (discountValueToUse = discountValue) => {
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const paymentData = {
        price: parsePrice(price),
        id_admin: id_admin,
        id_client: id,
        cuts: cut,
        date: currentDate,
        discount: discountValueToUse > 0 ? 1 : 0,
        discount_price: discountValueToUse,
        discount_code: discountCode,
      };

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/pays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Unknown error');
      }

      const result = await response.json();
      console.log('Payment data submitted successfully:', result);
      
      // Nếu có sử dụng mã giảm giá, cập nhật count_quantity
      if (discountCode && discountValueToUse > 0) {
        try {
          const discountResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/discounts/use`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              code: discountCode,
              id_admin: paymentData.id_admin  // Sử dụng cùng id_admin với thanh toán
            })
          });
          
          const discountResult = await discountResponse.json();
          
          if (discountResult.status !== 'success') {
            console.warn('Cảnh báo khi cập nhật mã giảm giá:', discountResult.message);
            // Không dừng luồng xử lý nếu cập nhật discount thất bại
          }
        } catch (discountError) {
          console.error('Lỗi khi cập nhật số lượng sử dụng mã giảm giá:', discountError);
          // Không dừng luồng xử lý nếu cập nhật discount thất bại
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error submitting payment data:', error);
      alert(`Lỗi khi lưu dữ liệu thanh toán: ${error.message}`);
      return false;
    }
  };

  // Khi số tiền deposit đủ, điều hướng sang trang Process
  useEffect(() => {
    if (currentDeposit >= requiredAmount && requiredAmount > 0) {
      console.log("✅ Đã nhận đủ tiền:", currentDeposit);
      submitPaymentData()
        .then(success => {
          if (success) {
            navigate('/Beframe', { state: { size, cut } });
          }
        });
    }
  }, [currentDeposit, requiredAmount, navigate, size, cut]);

  const handleDiscountFocus = () => {
    setFocusedField('discountCode');
  };

  return (
    <div className="discount-container">
      <div className="voucher-section">
        <label className="voucher-label">Voucher Code</label>
        <div className="voucher-input-wrapper">
          <input
            type="text"
            className="voucher-input"
            placeholder="Nhập mã Giảm giá..."
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            ref={discountInputRef}
            onFocus={handleDiscountFocus}
          />
          <button className="apply-discount" onClick={handleApplyDiscount}>
            Áp dụng
          </button>
        </div>

        <div className="payment-info">
          <p className="amount-needed">Số tiền cần nạp vào máy: {price}</p>
          <p className="discount-applied">Giảm giá: {discountValue} VNĐ</p>
          <p className="amount-remaining">
            Số tiền cần nạp sau giảm giá: {requiredAmount > 0 ? requiredAmount : 0} VNĐ
          </p>
        </div>

        <div className="payment-info1">
          <div className="deposit-input-wrapper">
            <p className="amount-paid">Số tiền đã nạp: {depositAmount} VNĐ</p>
            {/* Input hiển thị số tiền nạp từ server; không cho phép người dùng chỉnh sửa */}
            <input
              type="text"
              className="deposit-input"
              value={depositAmount}
              readOnly
              placeholder={requiredAmount > 0 ? requiredAmount : 0}
            />
          </div>
        </div>

        <button className="back-button" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left"></i> Quay lại
        </button>
      </div>

      <div className="keypad">
        {/* Bàn phím ảo chỉ dùng cho nhập mã giảm giá */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
          <button key={num} className="key" onClick={() => handleKeyPress(num)}>
            {num}
          </button>
        ))}
        <button className="key arrow" onClick={handleBackspace}>←</button>
      </div>
      <Chatbot />
    </div>
  );
}

export default Discount;