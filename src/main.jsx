// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createHashRouter, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';

// Layout
import RootLayout from './components/RootLayout';
import AdminLayout from './layouts/AdminLayout';

// Pages - Auth
import App from './App'; // Trang đăng nhập
import Register from './pages/Login/Register';
import ForgotPassword from './pages/Login/ForgotPassword';
import ChangePassword from './pages/Login/ChangePassword';

// Pages - Client flow
import Appclien from './pages/Appclien/Appclien';
import Choose from './pages/Choose/Choose';
import Crecuts from './pages/Crecuts/Crecuts';
import Selphoto from './pages/Selphoto/Selphoto';
import Photo from './pages/Photoo/Photo';
import Frame from './pages/Frame/Frame';
import Beframe from './pages/Beframe/Beframe';
import Qr from './pages/Qrcode/Qr';
import Discount from './pages/Discount/Discount';
import Process from './pages/Process/Process';
import Download from './pages/Download/Download';

// Admin
import Appadmin from './admin/App/Appadmin';
import Event from './admin/Event/Event';
import Promotion from './admin/Promotion/Promotion';
import Manageqr from './admin/ManageQR/Manageqr';
import Revenue from './admin/Revenue/Revenue';
import Camera from './admin/Camera/Camera';
import Pricecut from './admin/Pricecut/Pricecut';
import FrameAD from './admin/FrameAD/FrameAD';
import AccountUser from './admin/AccountUser/AccountUser';
import Rating from './admin/Rating/Rating';
import Sticker from './admin/Sticker/Sticker';
import AiTopic from './admin/AiTopic/AiTopic';
import ContentChat from './admin/ContentChat/ContentChat';

// ================================
// Error Boundary Component
// ================================
function ErrorPage() {
  const error = useRouteError();
  console.error('React Router Error:', error);

  let errorMessage = 'Đã xảy ra lỗi không xác định.';

  if (isRouteErrorResponse(error)) {
    errorMessage = `${error.status} ${error.statusText}`;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>❌ Có lỗi xảy ra!</h2>
      <p>{errorMessage}</p>
      <button onClick={() => window.location.reload()}>Tải lại trang</button>
    </div>
  );
}

// ================================
// Cấu hình React Query
// ================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 phút
      gcTime: 10 * 60 * 1000,   // 10 phút
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ================================
// Cấu hình Router
// ================================
const router = createHashRouter([
  // Auth routes (không cần layout? hoặc bạn có thể giữ RootLayout)
  {
    path: '/',
    element: (
      <RootLayout>
        <App />
      </RootLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Register',
    element: (
      <RootLayout>
        <Register />
      </RootLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/ForgotPassword',
    element: (
      <RootLayout>
        <ForgotPassword />
      </RootLayout>
    ),
    errorElement: <ErrorPage />,
  },

  {
    path: '/ChangePassword',
    element: (
      <RootLayout>
        <ChangePassword />
      </RootLayout>
    ),
    errorElement: <ErrorPage />,
  },

  // Client app routes
  {
    path: '/Appclien',
    element: (
      <RootLayout>
        <Appclien />
      </RootLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Choose',
    element: (
      <RootLayout>
        <Choose />
      </RootLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Crecuts',
    element: (
      <RootLayout>
        <Crecuts />
      </RootLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Selphoto',
    element: (
      <RootLayout>
        <Selphoto />
      </RootLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Photo',
    element: (
      <RootLayout>
        <Photo />
      </RootLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Frame',
    element: (
      <RootLayout>
        <Frame />
      </RootLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Beframe',
    element: (
      <RootLayout>
        <Beframe />
      </RootLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Qr',
    element: (
      <RootLayout>
        <Qr />
      </RootLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Discount',
    element: (
      <RootLayout>
        <Discount />
      </RootLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Process',
    element: (
      <RootLayout>
        <Process />
      </RootLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Download',
    element: (
      <RootLayout>
        <Download />
      </RootLayout>
    ),
    errorElement: <ErrorPage />,
  },

  // Admin route — quan trọng nhất
  {
    path: '/Admin',
    element: (
      <AdminLayout>
        <Appadmin />
      </AdminLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Event',
    element: (
      <AdminLayout>
        <Event />
      </AdminLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Promotion',
    element: (
      <AdminLayout>
        <Promotion />
      </AdminLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/ManageQR',
    element: (
      <AdminLayout>
        <Manageqr />
      </AdminLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Revenue',
    element: (
      <AdminLayout>
        <Revenue />
      </AdminLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Camera',
    element: (
      <AdminLayout>
        <Camera />
      </AdminLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Pricecut',
    element: (
      <AdminLayout>
        <Pricecut />
      </AdminLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/FrameAD',
    element: (
      <AdminLayout>
        <FrameAD />
      </AdminLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/AccountUser',
    element: (
      <AdminLayout>
        <AccountUser />
      </AdminLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Rating',
    element: (
      <AdminLayout>
        <Rating />
      </AdminLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/Sticker',
    element: (
      <AdminLayout>
        <Sticker />
      </AdminLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/ContentChat',
    element: (
      <AdminLayout>
        <ContentChat />
      </AdminLayout>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/AiTopic',
    element: (
      <AdminLayout>
        <AiTopic />
      </AdminLayout>
    ),
    errorElement: <ErrorPage />,
  },

]);

// ================================
// Render ứng dụng
// ================================
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);