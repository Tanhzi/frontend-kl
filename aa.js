// electron-main.js
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';

// Import SerialPort và WebSocketServer từ thư viện tương ứng
import { SerialPort } from 'serialport/dist/index.js';
import { WebSocketServer } from 'ws';

// Thiết lập __dirname cho ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đường dẫn tuyệt đối đến file exe (để đăng ký chạy cùng Windows)
const exePath = path.join(__dirname, 'release', 'win-unpacked', 'dslrBooth.exe');
app.setLoginItemSettings({
  openAtLogin: true,
  path: exePath
});

// Hàm tạo cửa sổ chính của ứng dụng
function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    webPreferences: {
      // Nếu bạn cần sử dụng Node integration trong renderer, lưu ý an toàn
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // 👈 CHO PHÉP GỌI HTTP API — KHÔNG BỊ CHẶN
    }
  });
  
  // Tải file index.html từ thư mục dist
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  // Mở DevTools nếu cần debug
  // win.webContents.openDevTools({ mode: 'detach' });
}
// --- Khởi chạy ứng dụng Electron ---
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Đóng ứng dụng khi tất cả cửa sổ được đóng (trừ macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


// --- PHẦN XỬ LÝ MÁY IN ---
// Xử lý in ảnh - phương pháp PowerShell sử dụng System.Drawing cho kết quả in tốt hơn
ipcMain.on('print-image', async (event, options) => {
  try {
    const { image, printer, orientation, copies, paper, scalePercent = 98 } = options;
    
    console.log(`Nhận yêu cầu in với máy in: ${printer}, orientation: ${orientation}, copies: ${copies}, paper: ${paper}, scale: ${scalePercent}%`);
    
    // Xử lý ảnh base64 và lưu thành file tạm
    let imageData = image;
    if (image && image.startsWith('data:image')) {
      imageData = image.split(';base64,').pop();
    }
    
    if (!imageData) {
      event.reply('print-error', 'Không có dữ liệu hình ảnh');
      return;
    }
    
    const tempDir = os.tmpdir();
    const tempImagePath = path.join(tempDir, `print-image-${Date.now()}.png`);
    
    // Lưu ảnh vào file tạm
    fs.writeFileSync(tempImagePath, Buffer.from(imageData, 'base64'));
    
    // Xác định nếu cần in 2 ảnh trên một tờ giấy
    const isSplitPaper = paper === '6x4-Split (6x2 2 prints)';
    
    // Tạo PowerShell script đúng cú pháp với chức năng thu nhỏ ảnh
    const psPrintCommand = `
    Add-Type -AssemblyName System.Drawing
    
    # Thông số in
    $printerName = "${printer}"
    $imagePath = "${tempImagePath.replace(/\\/g, '\\\\')}"
    $isLandscape = ${orientation === 'Landscape' ? '$true' : '$false'}
    $copies = ${copies}
    $paperType = "${paper}"
    $isSplit = ${isSplitPaper ? '$true' : '$false'}
    $scalePercent = ${scalePercent} # Tỷ lệ thu nhỏ (%)
    
    # Tải ảnh
    $image = [System.Drawing.Image]::FromFile($imagePath)
    
    # Tạo đối tượng PrintDocument
    $pd = New-Object System.Drawing.Printing.PrintDocument
    $pd.PrinterSettings.PrinterName = $printerName
    $pd.DefaultPageSettings.Landscape = $isLandscape
    $pd.PrinterSettings.Copies = $copies
    
    # Đặt kích thước giấy
    if ($paperType -ne "") {
        $paperSizes = $pd.PrinterSettings.PaperSizes
        foreach ($paperSize in $paperSizes) {
            if ($paperSize.PaperName -eq $paperType -or ($isSplit -and $paperSize.PaperName -eq "6x4")) {
                $pd.DefaultPageSettings.PaperSize = $paperSize
                break
            }
        }
    }
    
    # Xử lý sự kiện in với tỉ lệ thu nhỏ
    $printPage = {
        param($sender, $e)

        
        # Lưu kích thước gốc
        $originalWidth = $image.Width
        $originalHeight = $image.Height
        
        if ($isSplit) {
if ($isLandscape) {
    # Landscape: chia theo chiều dọc (trên/dưới) với hiệu ứng đè
    $pageWidth = [double]$e.PageBounds.Width
    $pageHeight = [double]$e.PageBounds.Height / 2
    
    # Tính kích thước mới dựa vào tỷ lệ và giữ nguyên tỷ lệ ảnh
    $scaleFactor = [double]$scalePercent / 100.0
    $newWidth = [double]$pageWidth * $scaleFactor
    $newHeight = [double]$pageHeight * $scaleFactor
    
    # Căn giữa ảnh
    $x = [int](($pageWidth - $newWidth) / 2)
    $y = [int](($pageHeight - $newHeight) / 2)
    $destWidth = [int]$newWidth
    $destHeight = [int]$newHeight
    
    # Vẽ ảnh thứ nhất - nửa trên
    $e.Graphics.DrawImage($image, $x, $y, $destWidth, $destHeight)
    
    # Tính toán vị trí cho ảnh thứ hai (để đè lên 10% của ảnh thứ nhất)
    $overlapPercent = 3
    $overlapPixels = [int]($destHeight * $overlapPercent / 100)
    $yBottom = [int]($pageHeight) - $overlapPixels + $y
    
    # Vẽ ảnh thứ hai - nửa dưới (đè lên một phần ảnh thứ nhất)
    $e.Graphics.DrawImage($image, $x, $yBottom, $destWidth, $destHeight)
} 
else {
    # Portrait: chia theo chiều ngang (trái/phải) với hiệu ứng đè
    $pageWidth = [double]$e.PageBounds.Width / 2
    $pageHeight = [double]$e.PageBounds.Height
    
    # Tính kích thước mới dựa vào tỷ lệ và giữ nguyên tỷ lệ ảnh
    $scaleFactor = [double]$scalePercent / 100.0
    $newWidth = [double]$pageWidth * $scaleFactor
    $newHeight = [double]$pageHeight * $scaleFactor
    
    # Căn giữa ảnh
    $x = [int](($pageWidth - $newWidth) / 2)
    $y = [int](($pageHeight - $newHeight) / 2)
    $destWidth = [int]$newWidth
    $destHeight = [int]$newHeight
    
    # Vẽ ảnh thứ nhất - bên trái
    $e.Graphics.DrawImage($image, $x, $y, $destWidth, $destHeight)
    
    # Tính toán vị trí cho ảnh thứ hai (để đè lên 10% của ảnh thứ nhất)
    $overlapPercent = 3
    $overlapPixels = [int]($destWidth * $overlapPercent / 100)
    $xRight = [int]($pageWidth) - $overlapPixels + $x
    
    # Vẽ ảnh thứ hai - bên phải (đè lên một phần ảnh thứ nhất)
    $e.Graphics.DrawImage($image, $xRight, $y, $destWidth, $destHeight)
}
        } 
        else {
            # In ảnh bình thường - một ảnh trên một tờ với tỷ lệ thu nhỏ
            $pageWidth = [double]$e.PageBounds.Width
            $pageHeight = [double]$e.PageBounds.Height
            
            # Tính kích thước mới dựa vào tỷ lệ và giữ nguyên tỷ lệ ảnh
            $scaleFactor = [double]$scalePercent / 100.0
            $newWidth = [double]$pageWidth * $scaleFactor
            $newHeight = [double]$pageHeight * $scaleFactor
            
            # Để giữ tỷ lệ ảnh, kiểm tra xem chiều nào là giới hạn
            $widthRatio = [double]$newWidth / $originalWidth
            $heightRatio = [double]$newHeight / $originalHeight
            $ratio = [Math]::Min($widthRatio, $heightRatio)
            
            $finalWidth = [int]($originalWidth * $ratio)
            $finalHeight = [int]($originalHeight * $ratio)
            
            # Căn giữa ảnh trong trang
            $x = [int](($pageWidth - $finalWidth) / 2)
            $y = [int](($pageHeight - $finalHeight) / 2)
            
            # Vẽ ảnh đã thu nhỏ và căn giữa
            $e.Graphics.DrawImage($image, $x, $y, $finalWidth, $finalHeight)
        }
    }
    
    # Đăng ký sự kiện PrintPage
    $pd.add_PrintPage($printPage)
    
    # Thực hiện in
    try {
        $pd.Print()
        Write-Output "In thành công"
    } 
    catch {
        Write-Error "Lỗi khi in: $_"
        exit 1
    } 
    finally {
        # Dọn dẹp
        $image.Dispose()
        $pd.Dispose()
        Remove-Item -Path $imagePath -ErrorAction SilentlyContinue
    }`;
    
    // Tạo file PowerShell script tạm thời
    const psScriptPath = path.join(tempDir, `print-script-${Date.now()}.ps1`);
    fs.writeFileSync(psScriptPath, psPrintCommand);
    
    // Thực thi PowerShell script
    exec(`powershell -ExecutionPolicy Bypass -File "${psScriptPath}"`, (error, stdout, stderr) => {
      // Xóa file script
      try {
        fs.unlinkSync(psScriptPath);
      } catch (e) {
        console.error('Lỗi khi xóa file script:', e);
      }
      
      if (error) {
        console.error(`Lỗi khi in: ${error}`);
        event.reply('print-error', error.message);
        return;
      }
      
      console.log('In thành công');
      event.reply('print-complete', 'In thành công');
    });
    
  } catch (error) {
    console.error('Print error:', error);
    event.reply('print-error', `Lỗi: ${error.message}`);
  }
});

// Xử lý khi muốn liệt kê các máy in có sẵn
ipcMain.on('list-printers', (event) => {
  const printers = event.sender.getPrinters();
  event.reply('printers-list', printers);
});

// --- PHẦN XỬ LÝ WEBSOCKET SERVER ---
// Tạo WebSocket Server trên cổng 8088
const wss = new WebSocketServer({ port: 8088 }, () => {
  console.log('WebSocket Server đang chạy trên cổng 8088');
});

// Xử lý kết nối WebSocket
wss.on('connection', (ws) => {
  console.log('Client kết nối thành công!');
  
  // Xử lý tin nhắn từ client
  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      
      // Kiểm tra loại tin nhắn
      if (parsedMessage.type === 'print-request') {
        // Gọi lại phương thức in với dữ liệu từ WebSocket
        handlePrintRequest(ws, parsedMessage.data);
      }
    } catch (error) {
      console.error('Lỗi khi xử lý tin nhắn:', error);
      ws.send(JSON.stringify({
        type: 'print-error',
        error: 'Lỗi xử lý: ' + error.message
      }));
    }
  });
});

// Hàm xử lý yêu cầu in từ WebSocket
function handlePrintRequest(ws, data) {
  try {
    const { image, printer, orientation, copies, paper, scalePercent = 98 } = data;

    console.log(`Nhận yêu cầu in với máy in: ${printer}, orientation: ${orientation}, copies: ${copies}, paper: ${paper}, scale: ${scalePercent}%`);
    
    // Xử lý ảnh base64 và lưu thành file tạm
    let imageData = image;
    if (image && image.startsWith('data:image')) {
      imageData = image.split(';base64,').pop();
    }
    
    if (!imageData) {
      ws.send(JSON.stringify({
        type: 'print-error',
        error: 'Không có dữ liệu hình ảnh'
      }));
      return;
    }
    
    const tempDir = os.tmpdir();
    const tempImagePath = path.join(tempDir, `print-image-${Date.now()}.png`);
    
    // Lưu ảnh vào file tạm
    fs.writeFileSync(tempImagePath, Buffer.from(imageData, 'base64'));
    
    // Xác định nếu cần in 2 ảnh trên một tờ giấy
    const isSplitPaper = paper === '6x4-Split (6x2 2 prints)';
    
    // Tạo PowerShell script giống như ở trên
    const psPrintCommand = `
    Add-Type -AssemblyName System.Drawing
    
    # Thông số in
    $printerName = "${printer}"
    $imagePath = "${tempImagePath.replace(/\\/g, '\\\\')}"
    $isLandscape = ${orientation === 'Landscape' ? '$true' : '$false'}
    $copies = ${copies}
    $paperType = "${paper}"
    $isSplit = ${isSplitPaper ? '$true' : '$false'}
    $scalePercent = ${scalePercent} # Tỷ lệ thu nhỏ (%)
    
    # Tải ảnh
    $image = [System.Drawing.Image]::FromFile($imagePath)
    
    # Tạo đối tượng PrintDocument
    $pd = New-Object System.Drawing.Printing.PrintDocument
    $pd.PrinterSettings.PrinterName = $printerName
    $pd.DefaultPageSettings.Landscape = $isLandscape
    $pd.PrinterSettings.Copies = $copies
    
    # Đặt kích thước giấy
    if ($paperType -ne "") {
        $paperSizes = $pd.PrinterSettings.PaperSizes
        foreach ($paperSize in $paperSizes) {
            if ($paperSize.PaperName -eq $paperType -or ($isSplit -and $paperSize.PaperName -eq "6x4")) {
                $pd.DefaultPageSettings.PaperSize = $paperSize
                break
            }
        }
    }
    
    # Xử lý sự kiện in với tỉ lệ thu nhỏ
    $printPage = {
        param($sender, $e)

        
        # Lưu kích thước gốc
        $originalWidth = $image.Width
        $originalHeight = $image.Height
        
        if ($isSplit) {
if ($isLandscape) {
    # Landscape: chia theo chiều dọc (trên/dưới) với hiệu ứng đè
    $pageWidth = [double]$e.PageBounds.Width
    $pageHeight = [double]$e.PageBounds.Height / 2
    
    # Tính kích thước mới dựa vào tỷ lệ và giữ nguyên tỷ lệ ảnh
    $scaleFactor = [double]$scalePercent / 100.0
    $newWidth = [double]$pageWidth * $scaleFactor
    $newHeight = [double]$pageHeight * $scaleFactor
    
    # Căn giữa ảnh
    $x = [int](($pageWidth - $newWidth) / 2)
    $y = [int](($pageHeight - $newHeight) / 2)
    $destWidth = [int]$newWidth
    $destHeight = [int]$newHeight
    
    # Vẽ ảnh thứ nhất - nửa trên
    $e.Graphics.DrawImage($image, $x, $y, $destWidth, $destHeight)
    
    # Tính toán vị trí cho ảnh thứ hai (để đè lên 10% của ảnh thứ nhất)
    $overlapPercent = 3
    $overlapPixels = [int]($destHeight * $overlapPercent / 100)
    $yBottom = [int]($pageHeight) - $overlapPixels + $y
    
    # Vẽ ảnh thứ hai - nửa dưới (đè lên một phần ảnh thứ nhất)
    $e.Graphics.DrawImage($image, $x, $yBottom, $destWidth, $destHeight)
} 
else {
    # Portrait: chia theo chiều ngang (trái/phải) với hiệu ứng đè
    $pageWidth = [double]$e.PageBounds.Width / 2
    $pageHeight = [double]$e.PageBounds.Height
    
    # Tính kích thước mới dựa vào tỷ lệ và giữ nguyên tỷ lệ ảnh
    $scaleFactor = [double]$scalePercent / 100.0
    $newWidth = [double]$pageWidth * $scaleFactor
    $newHeight = [double]$pageHeight * $scaleFactor
    
    # Căn giữa ảnh
    $x = [int](($pageWidth - $newWidth) / 2)
    $y = [int](($pageHeight - $newHeight) / 2)
    $destWidth = [int]$newWidth
    $destHeight = [int]$newHeight
    
    # Vẽ ảnh thứ nhất - bên trái
    $e.Graphics.DrawImage($image, $x, $y, $destWidth, $destHeight)
    
    # Tính toán vị trí cho ảnh thứ hai (để đè lên 10% của ảnh thứ nhất)
    $overlapPercent = 3
    $overlapPixels = [int]($destWidth * $overlapPercent / 100)
    $xRight = [int]($pageWidth) - $overlapPixels + $x
    
    # Vẽ ảnh thứ hai - bên phải (đè lên một phần ảnh thứ nhất)
    $e.Graphics.DrawImage($image, $xRight, $y, $destWidth, $destHeight)
}
        } 
        else {
            # In ảnh bình thường - một ảnh trên một tờ với tỷ lệ thu nhỏ
            $pageWidth = [double]$e.PageBounds.Width
            $pageHeight = [double]$e.PageBounds.Height
            
            # Tính kích thước mới dựa vào tỷ lệ và giữ nguyên tỷ lệ ảnh
            $scaleFactor = [double]$scalePercent / 100.0
            $newWidth = [double]$pageWidth * $scaleFactor
            $newHeight = [double]$pageHeight * $scaleFactor
            
            # Để giữ tỷ lệ ảnh, kiểm tra xem chiều nào là giới hạn
            $widthRatio = [double]$newWidth / $originalWidth
            $heightRatio = [double]$newHeight / $originalHeight
            $ratio = [Math]::Min($widthRatio, $heightRatio)
            
            $finalWidth = [int]($originalWidth * $ratio)
            $finalHeight = [int]($originalHeight * $ratio)
            
            # Căn giữa ảnh trong trang
            $x = [int](($pageWidth - $finalWidth) / 2)
            $y = [int](($pageHeight - $finalHeight) / 2)
            
            # Vẽ ảnh đã thu nhỏ và căn giữa
            $e.Graphics.DrawImage($image, $x, $y, $finalWidth, $finalHeight)
        }
    }
    
    # Đăng ký sự kiện PrintPage
    $pd.add_PrintPage($printPage)
    
    # Thực hiện in
    try {
        $pd.Print()
        Write-Output "In thành công"
    } 
    catch {
        Write-Error "Lỗi khi in: $_"
        exit 1
    } 
    finally {
        # Dọn dẹp
        $image.Dispose()
        $pd.Dispose()
        Remove-Item -Path $imagePath -ErrorAction SilentlyContinue
    }`;
    
    // Tạo file PowerShell script tạm thời
    const psScriptPath = path.join(tempDir, `print-script-${Date.now()}.ps1`);
    fs.writeFileSync(psScriptPath, psPrintCommand);
    
    // Thực thi PowerShell script
    exec(`powershell -ExecutionPolicy Bypass -File "${psScriptPath}"`, (error, stdout, stderr) => {
      // Xóa file script
      try {
        fs.unlinkSync(psScriptPath);
      } catch (e) {
        console.error('Lỗi khi xóa file script:', e);
      }
      
      if (error) {
        console.error(`Lỗi khi in: ${error}`);
        ws.send(JSON.stringify({
          type: 'print-error',
          error: error.message
        }));
        return;
      }
      
      console.log('In thành công');
      ws.send(JSON.stringify({
        type: 'print-complete',
        status: 'In thành công'
      }));
    });
    
  } catch (error) {
    console.error('Lỗi xử lý in:', error);
    ws.send(JSON.stringify({
      type: 'print-error',
      error: error.message
    }));
  }
}

// --- PHẦN KẾT NỐI MÁY ĐỌC TIỀN ---
// Cấu hình COM Port và baud rate
const portName = 'COM1';
const baudRate = 9600;

// Khởi tạo SerialPort
const port = new SerialPort({ path: portName, baudRate: baudRate }, (err) => {
  if (err) {
    return console.error('Lỗi khi mở cổng:', err.message);
  }
  console.log(`Đã mở cổng ${portName} với baud rate ${baudRate}`);
});

// Mapping deposit codes (ASCII 'A', 'B', 'C', 'D')
const depositMap = {
  'A': 10000,  // Ký tự 'A' cho 10.000 VNĐ
  'B': 20000,  // Ký tự 'B' cho 20.000 VNĐ
  'C': 50000,  // Ký tự 'C' cho 50.000 VNĐ
  'D': 100000, // Ký tự 'D' cho 100.000 VNĐ
};

// Lệnh stack để nuốt tiền (ví dụ: 0x02, thay đổi theo giao thức thực tế)
const stackCommand = Buffer.from([0x02]);

// Biến debounce để tránh xử lý lặp lại quá nhanh
let lastDepositTime = 0;
const debounceDelay = 900; // 1 giây, điều chỉnh theo yêu cầu

// Xử lý dữ liệu nhận được từ máy đọc tiền
port.on('data', (data) => {
  // Chuyển Buffer sang chuỗi ASCII
  const dataStr = data.toString('ascii');
  
  // Lặp qua từng ký tự trong chuỗi
  for (let char of dataStr) {
    // Nếu ký tự là A, B, C hoặc D thì xử lý deposit
    if (depositMap.hasOwnProperty(char)) {
      const now = Date.now();
      // Debounce: chỉ xử lý nếu cách lần xử lý trước hơn debounceDelay
      if (now - lastDepositTime < debounceDelay) {
        continue;
      }
      lastDepositTime = now;
      
      const depositValue = depositMap[char];
      
      // Gửi lệnh stack để nuốt tiền
      port.write(stackCommand, (err) => {
        if (err) {
          console.error('Lỗi khi gửi lệnh stack:', err.message);
        } else {
          console.log('Đã gửi lệnh stack:', stackCommand.toString('hex'));
        }
      });
      
      // Gửi dữ liệu mệnh giá đến các client qua WebSocket
      wss.clients.forEach(client => {
        if (client.readyState === 1) { // 1 tương ứng với OPEN
          client.send(JSON.stringify({ 
            type: 'deposit',
            deposit: depositValue 
          }));
        }
      });
    }
  }
});

// Khi cổng COM mở, bắt đầu gửi lệnh Poll (0x3E) mỗi 200ms
port.on('open', () => {
  console.log('Cổng COM đã sẵn sàng, bắt đầu gửi lệnh Poll...');
  setInterval(() => {
    const pollCmd = Buffer.from([0x3e]);
    port.write(pollCmd, (err) => {
      if (err) {
        console.error('Lỗi khi gửi lệnh Poll:', err.message);
      }
    });
  }, 200);
});

// Xử lý lỗi của cổng COM
port.on('error', (err) => {
  console.error('Lỗi cổng COM:', err.message);
});

console.log('Máy chủ đã khởi động. Đang chờ kết nối...');