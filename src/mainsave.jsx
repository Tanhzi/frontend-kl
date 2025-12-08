// main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createHashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // 👈 Thêm dòng này
import './index.css';

// Import các component
import App from './App';
import Crecuts from './pages/Crecuts/Crecuts';
import Selphoto from './pages/Selphoto/Selphoto';
import Photo from './pages/Photoo/Photo';
import Frame from './pages/Frame/Frame';
import Qr from './pages/Qrcode/Qr';
import Choose from './pages/Choose/Choose';
import Discount from './pages/Discount/Discount';
import Process from './pages/Process/Process';
import Beframe from './pages/Beframe/Beframe';
import Download from './pages/Download/Download';
import Register from './pages/Login/Register';
import Appadmin from './admin/App/Appadmin';
import Appclien from './pages/Appclien/Appclien';
import ForgotPassword from './pages/Login/ForgotPassword';
import Navbar from './components/Navbar';


// Tạo QueryClient — cấu hình cache toàn cục
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 phút: dữ liệu "mới" trong 5 phút → không fetch lại
      gcTime: 10 * 60 * 1000,   // Giữ cache 10 phút sau khi component unmount
      refetchOnWindowFocus: false, // Không tự fetch lại khi quay lại tab
      retry: 1, // Thử lại 1 lần nếu lỗi
    },
  },
});

// Import RootLayout
import RootLayout from './components/RootLayout';

const router = createHashRouter([
  {
    path: "/",
    element: (
      <RootLayout>
        <App />
      </RootLayout>
    ),
  },
  {
    path: "/Appclien",
    element: (
      <RootLayout>
        <Appclien />
      </RootLayout>
    ),
  },
  {
    path: "/Download",
    element: (
      <RootLayout>
        <Download />
      </RootLayout>
    ),
  },
  {
    path: "/Photo",
    element: (
      <RootLayout>
        <Photo />
      </RootLayout>
    ),
  },
  {
    path: "/Selphoto",
    element: (
      <RootLayout>
        <Selphoto />
      </RootLayout>
    ),
  },
  {
    path: "/ForgotPassword",
    element: (
      <RootLayout>
        <ForgotPassword />
      </RootLayout>
    ),
  },
  {
    path: "/Register",
    element: (
      <RootLayout>
        <Register />
      </RootLayout>
    ),
  },
  {
    path: "/Frame",
    element: (
      <RootLayout>
        <Frame />
      </RootLayout>
    ),
  },
  {
    path: "/Crecuts",
    element: (
      <RootLayout>
        <Crecuts />
      </RootLayout>
    ),
  },
  {
    path: "/Qr",
    element: (
      <RootLayout>
        <Qr />
      </RootLayout>
    ),
  },
  {
    path: "/Choose",
    element: (
      <RootLayout>
        <Choose />
      </RootLayout>
    ),
  },
  {
    path: "/Discount",
    element: (
      <RootLayout>
        <Discount />
      </RootLayout>
    ),
  },
  {
    path: "/Process",
    element: (
      <RootLayout>
        <Process />
      </RootLayout>
    ),
  },
  {
    path: "/Beframe",
    element: (
      <RootLayout>
        <Beframe />
      </RootLayout>
    ),
  },
  {
    path: "/Admin",
    element: (
      <RootLayout>
        <Appadmin />
      </RootLayout>
    ),
  },
  {
    path: "/Navbar",
    element: (
      <RootLayout>
        <Navbar />
      </RootLayout>
    ),
  }

]);

// Render ứng dụng với QueryClientProvider
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}> {/* 👈 Bao bọc toàn bộ app */}
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);