// src/components/RootLayout.jsx
import React from 'react';
import { CountdownProvider } from '../contexts/CountdownContext';

export default function RootLayout({ children }) {
  return <CountdownProvider>{children}</CountdownProvider>;
}


// import React from 'react';
// import { CountdownProvider } from '../contexts/CountdownContext';
// import ChatBotWidget from './ChatBotWidget'; // ✅ Thêm dòng này

// export default function RootLayout({ children }) {
//   return (
//     <CountdownProvider>
//       {children}
//       <ChatBotWidget /> {/* ✅ Chatbot hiển thị trên mọi trang */}
//     </CountdownProvider>
//   );
// }