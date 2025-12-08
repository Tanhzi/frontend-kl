// CountdownContext.js

import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';

const CountdownContext = createContext();

export const useCountdown = () => useContext(CountdownContext);

export const CountdownProvider = ({ children }) => {
  const [countdown, setCountdown] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false); // 👈 mới: kiểm soát việc đếm hay không
  const timerRef = useRef();

  // 1. Chỉ fetch và lưu, KHÔNG đếm
  const initializeCountdown = async (id_admin) => {
    if (!id_admin) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/camera?id_admin=${id_admin}`);
      const data = await response.json();

      if (data && data.time_run && /^[0-5][0-9]:[0-5][0-9]$/.test(data.time_run)) {
        const [minutes, seconds] = data.time_run.split(':').map(Number);
        const totalSeconds = minutes * 60 + seconds;
        setCountdown(totalSeconds);
        localStorage.setItem('globalCountdown', totalSeconds.toString());
        setIsInitialized(true);
        setIsRunning(false); // chưa chạy
      } else {
        console.warn('time_run không hợp lệ:', data?.time_run);
        resetCountdown();
      }
    } catch (err) {
      console.error('Lỗi khi lấy time_run:', err);
      resetCountdown();
    }
  };

  // 2. Bắt đầu đếm ngược (gọi từ Beframe)
  const startCountdown = () => {
    if (isInitialized && countdown > 0) {
      setIsRunning(true);
    }
  };

  const resetCountdown = () => {
    setCountdown(null);
    localStorage.removeItem('globalCountdown');
    setIsInitialized(false);
    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Khôi phục từ localStorage khi mount
  useEffect(() => {
    const saved = localStorage.getItem('globalCountdown');
    if (saved) {
      const num = parseInt(saved, 10);
      if (!isNaN(num) && num >= 0) {
        setCountdown(num);
        setIsInitialized(true);
        // ⚠️ KHÔNG tự động setIsRunning(true) ở đây
      }
    }
  }, []);

  // ✅ ĐẾM NGƯỢC — chỉ khi isRunning = true
  useEffect(() => {
    if (!isRunning || countdown === null || countdown <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (countdown === 0) {
        setIsRunning(false);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setIsRunning(false);
          return 0;
        }
        const newValue = prev - 1;
        localStorage.setItem('globalCountdown', newValue.toString());
        return newValue;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, countdown]); // 👈 phụ thuộc isRunning, không phải isInitialized

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
        startCountdown, // 👈 xuất hàm mới
        resetCountdown,
        isInitialized,
        isRunning
      }}
    >
      {children}
    </CountdownContext.Provider>
  );
};