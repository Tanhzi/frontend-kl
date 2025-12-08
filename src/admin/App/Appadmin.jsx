import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Appadmin.css';
import Navbar from '../../components/Navbar';
import ApexCharts from 'apexcharts';

const Appadmin = () => {
  const navigate = useNavigate();

  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const [auth, setAuth] = useState(getAuth());
  const { id, username } = auth || {}; 

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [machineCount, setMachineCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [totalIncome, setTotalIncome] = useState('0 VND');
  const chartRef = useRef(null);
  const chartContainerRef = useRef(null);


  // === FETCH FUNCTIONS ===

  const fetchMachineCount = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/count?id_admin=${id}`);
      if (!res.ok) return setMachineCount(0);
      const data = await res.json();
      setMachineCount(data.total_customers ?? 0);
    } catch (error) {
      console.error('Lỗi lấy số máy:', error);
      setMachineCount(0); // fallback
    }
  };

  const fetchServiceData = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/sum-price?id_admin=${id}`);
      if (!res.ok) {
        setCustomerCount(0);
        setTotalIncome('0 VND');
        return;
      }
      const data = await res.json();
      setCustomerCount(data.total_customers ?? 0);
      const income = data.total_income ?? 0;
      setTotalIncome(Number(income).toLocaleString('vi-VN') + ' VND');
    } catch (error) {
      console.error('Lỗi lấy dữ liệu dịch vụ:', error);
      setCustomerCount(0);
      setTotalIncome('0 VND');
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/price?id_admin=${id}`);
      if (!res.ok) return; // không vẽ chart nếu lỗi

      const data = await res.json();

      // 👇 Kiểm tra nghiêm ngặt: phải là mảng
      if (!Array.isArray(data) || data.length === 0) {
        // Có thể clear chart hoặc giữ nguyên — ở đây ta không render gì
        if (chartRef.current) chartRef.current.destroy();
        return;
      }

      const sorted = [...data].sort((a, b) => {
        if (a.year === b.year) return a.month - b.month;
        return a.year - b.year;
      });

      const categories = sorted.map((item) =>
        `${item.year}-${String(item.month).padStart(2, '0')}`
      );
      const revenueData = sorted.map((item) => Number(item.total_revenue) || 0);
      const series = [{ name: 'Doanh thu', data: revenueData }];

      renderChart(categories, series);
    } catch (error) {
      console.error('Lỗi lấy dữ liệu biểu đồ:', error);
      if (chartRef.current) chartRef.current.destroy();
    }
  };

  const renderChart = (categories, series) => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const options = {
      chart: { type: 'line', height: 350, animations: { enabled: false } },
      stroke: { curve: 'smooth' },
      series,
      xaxis: { categories },
      title: {
        text: 'Doanh thu các tháng',
        align: 'center',
        style: { color: '#d81b60' },
      },
      yaxis: {
        title: { text: 'Doanh thu' },
        labels: {
          formatter: (val) => val.toLocaleString('vi-VN'),
        },
      },
      tooltip: {
        y: {
          formatter: (value) => value.toLocaleString('vi-VN') + ' VND',
        },
      },
      colors: ['#d81b60'],
    };

    chartRef.current = new ApexCharts(chartContainerRef.current, options);
    chartRef.current.render();
  };

  useEffect(() => {
    if (id) {
      fetchMachineCount();
      fetchServiceData();
      fetchData();
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [id]);

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

return (
  <>
    <Navbar
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={toggleSidebar}
      id={id}
      username={username}
    />

    <div className={`appadmin-main-container ${sidebarCollapsed ? 'appadmin-sidebar-collapsed' : ''}`}>
      <div className="appadmin-title">
        <h2 className="appadmin-overview-title">TỔNG QUAN</h2>
      </div>

      <div className="appadmin-stats-row">
        <div className="appadmin-stat-card">
          <div className="appadmin-card-box">
            <div className="appadmin-card-content">
              <div className="appadmin-widget-data">
                <div className="appadmin-machine-count">{machineCount}</div>
                <div className="appadmin-label">Số máy</div>
              </div>
              <div className="appadmin-widget-icon">
                <div className="appadmin-icon appadmin-icon-machine">
                  <i className="icon-copy bi bi-emoji-smile-fill" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="appadmin-stat-card">
          <div className="appadmin-card-box">
            <div className="appadmin-card-content">
              <div className="appadmin-widget-data">
                <div className="appadmin-customer-count">{customerCount}</div>
                <div className="appadmin-label">Số khách hàng</div>
              </div>
              <div className="appadmin-widget-icon">
                <div className="appadmin-icon appadmin-icon-customer">
                  <i className="icon-copy fa fa-users" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="appadmin-stat-card">
          <div className="appadmin-card-box">
            <div className="appadmin-card-content">
              <div className="appadmin-widget-data">
                <div className="appadmin-income">{totalIncome}</div>
                <div className="appadmin-label">Tổng thu nhập</div>
              </div>
              <div className="appadmin-widget-icon">
                <div className="appadmin-icon appadmin-icon-income">
                  <i className="icon-copy fa fa-money" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="appadmin-chart-box">
        <h4 className="appadmin-chart-title">Biểu đồ doanh thu hàng tháng</h4>
        <div ref={chartContainerRef} className="appadmin-chart-container" />
      </div>
    </div>
  </>
);
};

export default Appadmin;