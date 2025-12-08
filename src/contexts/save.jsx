// src/contexts/CountdownContext.js
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

const CountdownContext = createContext();

export const useCountdown = () => useContext(CountdownContext);

export const CountdownProvider = ({ children }) => {
  const [countdown, setCountdown] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Khởi tạo lần đầu từ API
  const initializeCountdown = async (id_admin) => {
    if (!id_admin) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/get_camera.php?id_admin=${id_admin}`);
      const data = await response.json();

      if (data && data.time_run && /^[0-5][0-9]:[0-5][0-9]$/.test(data.time_run)) {
        const [minutes, seconds] = data.time_run.split(':').map(Number);
        const totalSeconds = minutes * 60 + seconds;
        setCountdown(totalSeconds);
        localStorage.setItem('globalCountdown', totalSeconds.toString());
        setIsInitialized(true);
      } else {
        console.warn('time_run không hợp lệ:', data?.time_run);
        resetCountdown();
      }
    } catch (err) {
      console.error('Lỗi khi lấy time_run:', err);
      resetCountdown();
    }
  };

  // Reset countdown
  const resetCountdown = () => {
    setCountdown(null);
    localStorage.removeItem('globalCountdown');
    setIsInitialized(false);
  };

  // Đồng bộ từ localStorage khi mount
  useEffect(() => {
    const saved = localStorage.getItem('globalCountdown');
    if (saved) {
      const num = parseInt(saved, 10);
      if (!isNaN(num) && num >= 0) {
        setCountdown(num);
        setIsInitialized(true);
      }
    }
  }, []);

  // ✅ ĐẾM NGƯỢC — CHỈ PHỤ THUỘC isInitialized và countdown > 0
  useEffect(() => {
    if (!isInitialized || countdown === null || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        const newValue = prev - 1;
        localStorage.setItem('globalCountdown', newValue.toString());
        return newValue;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, isInitialized]);

  // ✅ Chỉ cung cấp giá trị — không điều hướng
  const formattedCountdown = useMemo(() => {
    if (countdown === null) return '00:00';
    const mins = Math.floor(countdown / 60);
    const secs = countdown % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [countdown]);

  return (
    <CountdownContext.Provider
      value={{
        countdown,
        formattedCountdown,
        initializeCountdown,
        resetCountdown
      }}
    >
      {children}
    </CountdownContext.Provider>
  );
};