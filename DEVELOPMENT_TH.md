# คู่มือการพัฒนา

**ภาษา:** [English](DEVELOPMENT.md) | [ไทย (Thai)](#คู่มือการพัฒนา)

เอกสารทางเทคนิคสำหรับนักพัฒนาที่ทำงานกับส่วนขยาย Download Shuttle Link

## ภาพรวมโดยย่อ

**ส่วนขยายนี้ทำอะไร:**
1. ตรวจสอบการดาวน์โหลดของเบราว์เซอร์
2. ดักจับไฟล์ชนิดที่รองรับ
3. แสดงป๊อปอัปพร้อมรายละเอียดการดาวน์โหลด
4. ส่ง URL ไปยังแอป Download Shuttle ผ่าน protocol `downloadshuttle://`

**เทคโนโลยีที่ใช้:**
- Vanilla JavaScript (ES6+)
- Chrome Extension Manifest V3
- ไม่มีเครื่องมือ build ไม่มี dependencies

---

## สถาปัตยกรรม

```
ผู้ใช้คลิกลิงก์ดาวน์โหลด
      ↓
content.js (Content Script)
  • ตรวจจับสถานะปุ่ม Alt
  • ส่งสถานะข้ามไปยัง background
      ↓
Browser Download Event
      ↓
background.js (Service Worker)
  • ตรวจจับการดาวน์โหลด (async listener)
  • ตรวจสอบสถานะข้ามจาก storage
  • ถ้าข้าม → อนุญาตให้เบราว์เซอร์ดาวน์โหลด
  • ถ้าไม่ข้าม → ตรวจสอบชนิดไฟล์
      ↓
[ถ้าถูกดักจับ]
  • ยกเลิกการดาวน์โหลดของเบราว์เซอร์
  • เปิดหน้าต่างป๊อปอัป
      ↓
popup.html + popup.js
  • แสดง URL ดาวน์โหลด
  • สองปุ่ม: "ส่งไปแอป" | "ดาวน์โหลดผ่านเบราว์เซอร์"
  • ผู้ใช้คลิกหนึ่งในนั้น
      ↓
ตัวเลือก 1: Download Shuttle    ตัวเลือก 2: ดาวน์โหลดผ่านเบราว์เซอร์
  เรียก protocol handler            กลับไปใช้ดาวน์โหลดปกติ
  downloadshuttle://add/URL         ใช้ chrome.downloads API
      ↓
แอป Download Shuttle
  รับ URL และดาวน์โหลด
```

## โครงสร้างโปรเจกต์

```
Download Shuttle Link/
├── manifest.json          # การตั้งค่าและสิทธิ์ของส่วนขยาย
├── background.js          # Service worker (ตรวจสอบการดาวน์โหลด)
├── content.js             # Content script (ติดตามสถานะคีย์บอร์ด)
├── popup.html             # UI ของป๊อปอัป
├── popup.js               # ตรรกะของป๊อปอัป
├── icons/                 # ไอคอนส่วนขยาย
├── README_TH.md           # เอกสารสำหรับผู้ใช้
└── DEVELOPMENT_TH.md      # ไฟล์นี้
```

### คำอธิบายไฟล์สำคัญ

**`background.js`** - Service Worker
- รับฟังการดาวน์โหลดผ่าน `chrome.downloads.onCreated` (async listener)
- ตรวจสอบสถานะข้ามจาก `chrome.storage.local` ก่อนดักจับ
- ตรวจสอบว่าควรดักจับชนิดไฟล์หรือไม่ (จากนามสกุลหรือ MIME type)
- ยกเลิกการดาวน์โหลดของเบราว์เซอร์ด้วย `chrome.downloads.cancel()`
- เปิดหน้าต่างป๊อปอัปด้วย `chrome.windows.create()`
- เก็บข้อมูลการดาวน์โหลดใน `chrome.storage.local`
- จัดการข้อความจาก content script และ popup

**`content.js`** - Content Script
- ทำงานบนทุกหน้าเพื่อติดตามสถานะคีย์บอร์ด
- ตรวจจับการกดปุ่ม Alt (Option) และการปล่อย
- ส่งสถานะข้ามไปยัง background ผ่าน `chrome.runtime.sendMessage()`
- จับสถานะคีย์บอร์ดเมื่อคลิกเพื่อความแม่นยำ
- ไม่สามารถเข้าถึง `chrome.storage` โดยตรง (ต้องใช้ messaging)

**`popup.js`** - ตรรกะของป๊อปอัป
- อ่านการดาวน์โหลดที่รอจาก storage
- แสดง URL ดาวน์โหลดใน UI
- จัดการสองปุ่ม:
  - **ส่งไปยัง Download Shuttle:** สร้าง protocol URL ทริกเกอร์ผ่านแท็ก `<a>`
  - **ดาวน์โหลดผ่านเบราว์เซอร์:** ส่งข้อความไปยัง background เพื่อดาวน์โหลดผ่านเบราว์เซอร์

**`popup.html`** - UI
- พื้นหลังแบบ gradient เรียบง่าย
- แสดง URL ดาวน์โหลด
- ปุ่มการกระทำสองปุ่ม
- ปิดอัตโนมัติหลังสำเร็จ

**`manifest.json`** - การตั้งค่า
- สิทธิ์: `downloads`, `notifications`, `storage`
- Content scripts: รัน `content.js` บนทุก URL
- ใช้ Manifest V3 (service worker ไม่ใช่ background page)

---

## กลยุทธ์ Storage: `chrome.storage.session`

### ทำไมใช้ Session Storage?

เราใช้ `chrome.storage.session` ในการเก็บการดาวน์โหลดที่รอดำเนิน แทนที่จะใช้ `chrome.storage.local` เหตุผลคือ:

**ข้อดีของ `chrome.storage.session`:**
- ✅ **ล้างข้อมูลอัตโนมัติเมื่อเบราว์เซอร์ปิด** - ไม่มีข้อมูลเก่าค้างอยู่
- ✅ **เหมาะสำหรับข้อมูลชั่วคราว** - การดาวน์โหลดที่รอเป็นข้อมูลระยะสั้น
- ✅ **ป้องกันป๊อปอัปค้าง** - แก้ปัญหาที่ "ป๊อปอัปเปิดเมื่อ restart browser"
- ✅ **Lifecycle ของ extension** - ล้างเมื่อ extension ปิด

**ปัญหาที่เราแก้ไข:**
```
ก่อน: เบราว์เซอร์ปิดโดยดาวน์โหลดยังไม่ส่ง → เบราว์เซอร์เปิดใหม่ → ป๊อปอัปเปิด (ข้อมูลค้าง)
หลัง: เบราว์เซอร์ปิดโดยดาวน์โหลดยังไม่ส่ง → เบราว์เซอร์เปิดใหม่ → ไม่มีป๊อปอัป (session ล้างแล้ว)
```

### วิธีการทำงาน

1. **ตรวจสอบการดาวน์โหลด** → เก็บใน `chrome.storage.session` พร้อม timestamp
   ```javascript
   await chrome.storage.session.set({
     pendingDownload: {
       urls: validLinks,
       protocolUrl: protocolUrl,
       timestamp: Date.now()
     }
   });
   ```

2. **เปิดป๊อปอัป** → ตรวจสอบอายุของการดาวน์โหลดที่รอ
   ```javascript
   const age = Date.now() - data.timestamp;
   if (age > 5 * 60 * 1000) {
     // เก่าเกิน 5 นาที ปิดและล้าง
     cleanupPendingDownload();
     window.close();
   }
   ```

3. **ผู้ใช้ปิดป๊อปอัป** → ล้างทันที
   ```javascript
   window.addEventListener('beforeunload', () => {
     if (!actionCompleted) {
       chrome.storage.session.remove(['pendingDownload']);
     }
   });
   ```

4. **ไม่มีการกระทำเป็นเวลา 5 นาที** → ปิดและล้างอัตโนมัติ
   ```javascript
   setTimeout(() => {
     if (!actionCompleted) {
       cleanupPendingDownload();
       window.close();
     }
   }, 5 * 60 * 1000);
   ```

5. **เบราว์เซอร์ปิด** → Session storage ล้างอัตโนมัติ
   - Chrome ล้าง session storage ทั้งหมดอัตโนมัติ

### การย้ายจาก `chrome.storage.local`

ถ้าอัปเดตจากเวอร์ชันเก่า ไม่ต้องย้ายข้อมูล เพราะ:
- ข้อมูลเก่า `local` storage จะไม่ถูกอ่าน (เราตรวจสอบ `session` เท่านั้น)
- Session storage แยกจาก local storage อย่างสิ้นเชิน
- ข้อมูลเก่าจะถูกละเว้นตามธรรมชาติในที่สุด

---

## วิธีการทำงานของ Protocol Handler

### รูปแบบ Protocol
```
downloadshuttle://add/<ENCODED_JSON_ARRAY>
```

### ตัวอย่าง
```javascript
// 1. เริ่มด้วย URL
const urls = ["https://example.com/file.zip"];

// 2. แปลงเป็น JSON และ encode
const content = encodeURIComponent(JSON.stringify(urls));
// ผลลัพธ์: %5B%22https%3A%2F%2Fexample.com%2Ffile.zip%22%5D

// 3. สร้าง protocol URL
const protocolUrl = `downloadshuttle://add/${content}`;
// ผลลัพธ์: downloadshuttle://add/%5B%22https%3A%2F%2Fexample.com%2Ffile.zip%22%5D

// 4. ตั้งเป็น href ของลิงก์
link.href = protocolUrl;

// 5. เมื่อผู้ใช้คลิกลิงก์ เบราว์เซอร์จะเรียกแอป Download Shuttle
```

### ทำไมต้องให้ผู้ใช้คลิก

**ความปลอดภัยของเบราว์เซอร์:** ส่วนขยายไม่สามารถเรียก custom protocols อัตโนมัติได้ ผู้ใช้ต้องคลิกลิงก์เพื่อ:
- ป้องกันส่วนขยายที่เป็นอันตรายจากการเปิดแอปโดยไม่ได้รับอนุญาต
- ให้ผู้ใช้ควบคุมการเปิดแอปภายนอก
- ปฏิบัติตามกฎเดียวกับหน้าเว็บทั่วไป

**วิธีแก้ของเรา:** ใช้แท็ก `<a href="...">` จริงๆ ที่ผู้ใช้คลิก

---

## การตั้งค่าสำหรับการพัฒนา

### ข้อกำหนดเบื้องต้น
- เบราว์เซอร์ Chrome หรือ Edge
- แอป Download Shuttle ติดตั้งแล้ว
- โปรแกรมแก้ไขข้อความ

### การติดตั้ง
1. โคลนโปรเจกต์
2. เปิด `chrome://extensions/`
3. เปิด "โหมดผู้พัฒนา"
4. คลิก "โหลดส่วนขยายที่แกะแล้ว"
5. เลือกโฟลเดอร์ส่วนขยาย

### การทำการเปลี่ยนแปลง
1. แก้ไขไฟล์ใดก็ได้
2. ไปที่ `chrome://extensions/`
3. คลิกไอคอนรีโหลดที่ส่วนขยาย
4. ทดสอบการเปลี่ยนแปลงของคุณ

**ไม่ต้อง build!** JavaScript แท้ ไม่มี dependencies

---

## การทดสอบ

### ขั้นตอนการทดสอบด้วยตนเอง
1. หาลิงก์ทดสอบ (เช่น VLC: `https://get.videolan.org/vlc/3.0.21/macosx/vlc-3.0.21-arm64.dmg`)
2. คลิกลิงก์
3. ป๊อปอัปควรปรากฏ
4. คลิก "ส่งไปยัง Download Shuttle"
5. แอป Download Shuttle ควรเปิด

### การ Debug

**คอนโซลของ Background script:**
- ไปที่ `chrome://extensions/`
- หาส่วนขยาย → คลิก "service worker"
- คอนโซลแสดงล็อก: `[Download Shuttle Link] ...`

**คอนโซลของ Popup:**
- เมื่อป๊อปอัปเปิด คลิกขวา → ตรวจสอบ
- แท็บคอนโซลแสดงล็อกของป๊อปอัป

**ทดสอบ protocol ด้วยตนเอง:**
```javascript
// ในคอนโซลของเบราว์เซอร์ (F12)
window.location.href = 'downloadshuttle://add/%5B%22https%3A%2F%2Fexample.com%2Ftest.zip%22%5D';
// ควรเปิดแอป Download Shuttle
```

### ปัญหาที่พบบ่อย

| ปัญหา | สาเหตุ | วิธีแก้ |
|-------|-------|---------|
| CSP violation | Inline script | ย้าย JS ไปยังไฟล์ภายนอก |
| Protocol ไม่ทำงาน | Encode ซ้ำสองครั้ง | ตรวจสอบ encoding (ครั้งเดียวเท่านั้น) |
| ป๊อปอัปขออนุญาตซ้ำๆ | ผู้ใช้ไม่คลิก "อนุญาตเสมอ" | คลิก "อนุญาตเสมอ" ไม่ใช่ "อนุญาต" |
| การดาวน์โหลดไม่ถูกดักจับ | ชนิดไฟล์ไม่อยู่ในรายการ | เพิ่มเข้า array `FILE_EXTENSIONS` |
| ป๊อปอัปปรากฏหลัง restart | ข้อมูลเก่าค้างใน storage | แล้วแก้แล้ว (ใช้ session storage) |
| ป๊อปอัปไม่ปิดเอง | ผู้ใช้ไม่ได้ทำการกระทำ | รอ 5 นาที + ปิด popup เมื่อปิดหน้าต่าง |

---

## แนวทางการเขียนโค้ด

### JavaScript
```javascript
// ✅ ใช้ฟีเจอร์ ES6+
const urls = ['https://example.com/file.zip'];
const shouldIntercept = url => FILE_EXTENSIONS.some(ext => url.endsWith(ext));

// ✅ เพิ่ม JSDoc comments
/**
 * ตรวจสอบว่าควรดักจับ URL ตามนามสกุลไฟล์หรือไม่
 * @param {string} url - URL การดาวน์โหลด
 * @returns {boolean} True ถ้าควรดักจับ
 */
function shouldInterceptByExtension(url) {
  // ...
}

// ✅ ชื่อตัวแปรที่บอกความหมาย
const browserDownloadIds = new Set();
const FILE_EXTENSIONS = ['.zip', '.rar', '.7z'];

// ✅ Console logs ที่มี prefix
console.log('[Download Shuttle Link] Intercepting:', url);
```

### HTML/CSS
- ใช้ HTML elements ตามความหมาย
- เก็บ styles แบบ inline ใน popup.html (ไม่ต้องใช้ CSS ภายนอกสำหรับป๊อปอัปเล็กๆ)
- การออกแบบ responsive ที่เหมาะกับมือถือ

---

## การตัดสินใจออกแบบที่สำคัญ

### ทำไมใช้หน้าต่างป๊อปอัปแทนแท็บ?

**การออกแบบเก่า:** เปิดแท็บใหม่
**การออกแบบใหม่:** เปิดหน้าต่างป๊อปอัป
**เหตุผล:** รบกวนน้อยกว่า UX ที่สะอาดกว่า ปิดอัตโนมัติได้ดี

### ทำไมมีสองปุ่ม?

**ปุ่ม 1:** ส่งไปยัง Download Shuttle (การกระทำหลัก)
**ปุ่ม 2:** ดาวน์โหลดผ่านเบราว์เซอร์ (ทางเลือกสำรอง)
**เหตุผล:** ถ้าแอป Download Shuttle ไม่ได้ติดตั้งหรือไม่ทำงาน ผู้ใช้มีทางออก

### ทำไมใช้ chrome.storage.local?

**ความต้องการ:** ส่งข้อมูลการดาวน์โหลดจาก background ไปยัง popup
**ทางเลือกอื่น:** URL hash (วิธีเก่า)
**ตัวเลือก:** Storage สะอาดกว่า รองรับหลาย URL ไม่มีปัญหา encoding

### ทำไมต้องใช้ Session Storage แทน Local Storage?

**ปัญหา:** การดาวน์โหลดที่รอเก็บใน `chrome.storage.local` อาจคงอยู่หลังจากเบราว์เซอร์ restart
**สถานการณ์:** ผู้ใช้ปิดเบราว์เซอร์โดยไม่ส่งการดาวน์โหลด → เบราว์เซอร์เปิดใหม่ → ป๊อปอัปเก่าปรากฏขึ้น

**วิธีแก้:** ใช้ `chrome.storage.session`
- ล้างอัตโนมัติเมื่อเบราว์เซอร์ปิด
- ล้างเมื่อ extension ถูกโหลดใหม่
- เหมาะสำหรับข้อมูลชั่วคราวเช่นการดาวน์โหลดที่รอ
- ป้องกันปัญหาข้อมูลเก่าอย่างสมบูรณ์

**มาตรการความปลอดภัยเพิ่มเติม:**
- ล้างอัตโนมัติหลัง 5 นาที ถ้าผู้ใช้ทิ้งป๊อปอัปไว้
- ล้างเมื่อป๊อปอัปปิด (ผู้ใช้กด X หรือ ESC)
- ตรวจสอบ timestamp เมื่อเปิดป๊อปอัป - ถ้าเก่าเกิน 5 นาที ปิดอัตโนมัติ

### ทำไมต้องติดตาม Browser Download IDs?

**ปัญหา:** เมื่อผู้ใช้คลิก "ดาวน์โหลดผ่านเบราว์เซอร์" background script จะดักจับมันอีกครั้ง
**วิธีแก้:** เก็บ download IDs ใน `browserDownloadIds` Set ข้ามไปในตัวดักจับ

### ทำไมใช้ Async Listener สำหรับการดาวน์โหลด?

```javascript
// ❌ แบบ Synchronous (วิธีเก่า)
chrome.downloads.onCreated.addListener((downloadItem) => {
  // ไม่สามารถ await การทำงานกับ storage
});

// ✅ แบบ Asynchronous (วิธีปัจจุบัน)
chrome.downloads.onCreated.addListener(async (downloadItem) => {
  const data = await chrome.storage.local.get(['bypassInterception']);
  // ตอนนี้เราสามารถตรวจสอบสถานะข้ามก่อนดักจับ
});
```

**เหตุผล:** ต้องอ่านสถานะข้ามจาก storage ก่อนตัดสินใจดักจับ async/await ทำให้สะอาดและอ่านง่าย

### ทำไม Content Script ไม่สามารถเข้าถึง chrome.storage โดยตรง?

**ข้อจำกัดของ Manifest V3:** Content scripts ทำงานใน isolated context
**วิธีแก้:** ใช้ message passing ผ่าน `chrome.runtime.sendMessage()`

**ขั้นตอนการสื่อสาร:**
```javascript
// content.js (isolated context)
chrome.runtime.sendMessage({ action: 'setBypass', bypass: true });

// background.js (extension context)
chrome.runtime.onMessage.addListener((message) => {
  chrome.storage.local.set({ bypassInterception: message.bypass });
});
```

### ทำไมใช้ปุ่ม Alt แทน Cmd/Shift?

**ทดสอบ keyboard shortcuts:**
- ❌ **Cmd + คลิก** → เปิดลิงก์ในแท็บใหม่ (ขัดแย้ง)
- ❌ **Shift + คลิก** → เปิดลิงก์ในหน้าต่างใหม่ (ขัดแย้ง)
- ❌ **Cmd + Alt + คลิก** → เปิดในแท็บใหม่ (Cmd มีความสำคัญกว่า)
- ✅ **Alt + คลิก** → ไม่มีการกระทำเริ่มต้นของเบราว์เซอร์ (สมบูรณ์แบบ!)

**การใช้งาน:** ตรวจสอบเฉพาะ Alt โดยไม่มี modifiers อื่น:
```javascript
if (event.altKey && !event.metaKey && !event.shiftKey && !event.ctrlKey)
```

### ทำไม Timeout 2 วินาทีสำหรับสถานะข้าม?

**ปัญหา:** สถานะข้ามอาจยังทำงานอยู่โดยไม่ตั้งใจ
**วิธีแก้:** ยอมรับการข้ามเฉพาะถ้าตั้งค่าไว้ภายใน 2 วินาทีก่อนเริ่มดาวน์โหลด

```javascript
const timeSinceClick = Date.now() - lastClickTime;
if (bypassInterception && timeSinceClick < 2000) {
  // การข้ามยังใหม่ ยอมรับมัน
}
```

**ป้องกัน:** สถานะข้ามที่เก่าจากการส่งผลกระทบต่อการดาวน์โหลดที่ไม่เกี่ยวข้อง

---

## การมีส่วนร่วม

### วิธีการมีส่วนร่วม
1. Fork repository
2. สร้าง feature branch: `git checkout -b feature/my-feature`
3. ทำการเปลี่ยนแปลงของคุณ
4. ทดสอบอย่างละเอียด (ลองหลายชนิดไฟล์)
5. อัปเดตเอกสารถ้าจำเป็น
6. ส่ง pull request

### รายงานบั๊ก
รวม:
- เวอร์ชันของเบราว์เซอร์ (Chrome/Edge)
- เวอร์ชันของส่วนขยาย
- ขั้นตอนการทำซ้ำ
- Console logs (background + popup)
- ภาพหน้าจอถ้ามี

---

## ความปลอดภัยและความเป็นส่วนตัว

### คำอธิบายสิทธิ์
```json
{
  "downloads":      // ตรวจสอบและยกเลิกการดาวน์โหลด
  "notifications":  // แสดงข้อความแสดงข้อผิดพลาด
  "storage":        // เก็บการดาวน์โหลดที่รออยู่
}
```

### ไม่มีการเก็บข้อมูล
- ❌ ไม่มีคำขอเครือข่ายภายนอก
- ❌ ไม่มีการติดตามหรือวิเคราะห์
- ❌ ไม่มีข้อมูลผู้ใช้ถูกเก็บถาวร
- ✅ การประมวลผลทั้งหมดอยู่ในเครื่อง
- ✅ สื่อสารกับแอป Download Shuttle ผ่าน protocol เท่านั้น

### วิธีที่ผู้ใช้สามารถตรวจสอบ
1. เปิด `chrome://extensions/`
2. หาส่วนขยาย → ดูไฟล์ซอร์ส
3. เช็คแท็บ Network (F12) - ไม่มีคำขอภายนอก
4. ตรวจสอบสิทธิ์ใน `manifest.json`

---

## สัญญาอนุญาต

MIT License - ดูไฟล์ LICENSE

---

## มีคำถาม?

เปิด issue บน GitHub หรือติดต่อผู้ดูแลโปรเจกต์
