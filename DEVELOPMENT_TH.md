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
เบราว์เซอร์เริ่มดาวน์โหลด
      ↓
background.js — chrome.downloads.onCreated
  1. Sync gates: state เป็น in_progress? macOS? extension/MIME ตรงไหม?
  2. chrome.downloads.pause()  ← pause ทันที
  3. Track ลงใน heldDownloads Map แล้วเรียก decideDownload() แบบ async
      ↓
background.js — chrome.downloads.onDeterminingFilename
  • ถ้า download นี้ถูก track อยู่ (ยังตัดสินใจไม่เสร็จ):
      เก็บ callback suggest() ไว้แล้ว return true
      → defer dialog "Save As" ของ Chrome
      ↓
background.js — decideDownload() (async)
  1. เช็ค macOS (กัน race ตอนที่ cache เป็น null)
  2. Re-entry guard (URL อยู่ใน browserDownloadUrls?) → release
  3. กด Alt อยู่ไหม? → release
  4. ไม่ตรงทั้งหมด → intercept
      ↓
              ┌──── release ────┐         ┌──── intercept ────┐
              │ เรียก suggest() │         │ cancel + erase    │
              │ ที่เก็บไว้ แล้ว    │         │ (ไม่เรียก suggest  │
              │ resume()        │         │  เพราะ download    │
              │                 │         │  ถูกฆ่าทิ้ง)         │
              └─────────────────┘         │ เปิด popup        │
                                          └───────────────────┘
                                                  ↓
                                          popup.html + popup.js
                                          อ่าน pendingDownload จาก
                                          chrome.storage.session
                                          สองปุ่ม:
                                            ตัวเลือก 1: "📥 Download Shuttle App"
                                            ตัวเลือก 2: "🌐 Browser Download"
                                              ↓                          ↓
                                          <a href="downloadshuttle:    ส่ง message "browserDownload"
                                          //..."> คลิกของผู้ใช้จริง       ไป background. Background
                                          OS ส่ง URL ให้แอป             เพิ่ม URLs ใน browserDownloadUrls
                                          Download Shuttle              **ก่อน** แล้วค่อยเรียก
                                                                        chrome.downloads.download() —
                                                                        re-entry guard ปล่อยผ่าน
```

## โครงสร้างโปรเจกต์

```
DownloadShuttleLink-Chrome/
├── src/
│   ├── manifest.json     # การตั้งค่าและสิทธิ์ของส่วนขยาย
│   ├── background.js     # Service worker (ดักจับการดาวน์โหลด)
│   ├── content.js        # Content script (ติดตามสถานะปุ่ม Alt)
│   ├── popup.html        # UI ของป๊อปอัป
│   ├── popup.js          # ตรรกะของป๊อปอัป
│   └── icons/            # ไอคอนส่วนขยาย
├── README.md             # เอกสารผู้ใช้ (อังกฤษ)
├── README_TH.md          # เอกสารผู้ใช้ (ไทย)
├── DEVELOPMENT.md        # ไฟล์นี้ (อังกฤษ)
├── DEVELOPMENT_TH.md     # ไฟล์นี้ (ไทย)
└── privacy-policy.md     # นโยบายความเป็นส่วนตัว
```

**โหลด unpacked:** ชี้ Chrome ไปที่โฟลเดอร์ `src/` (ไม่ใช่ root ของ repo) เพราะ manifest อยู่ใน `src/`

### คำอธิบายไฟล์สำคัญ

**`background.js`** — Service Worker
- ใช้ listener สองตัวร่วมกัน:
  - `chrome.downloads.onCreated` — ผ่าน sync gates แล้ว `chrome.downloads.pause()` และเริ่ม `decideDownload()` แบบ async
  - `chrome.downloads.onDeterminingFilename` — defer dialog "Save As" ของ Chrome โดย return `true` และเก็บ `suggest` ไว้
- `decideDownload()` ตัดสินใจว่าจะดักจับโดยดูจาก macOS check, นามสกุลของ pathname, MIME type, ปุ่ม Alt, และ re-entry guard
- ถ้าดักจับ: `chrome.downloads.cancel` + `erase` + เปิด popup ด้วย `chrome.windows.create`
- ถ้าปล่อย: เรียก `suggest()` ที่เก็บไว้แล้ว `chrome.downloads.resume`
- ทุก callback ของ `chrome.downloads.*` ใช้ `consumeLastError` เพื่อป้องกัน "Unchecked runtime.lastError" warning จาก race ทั่วไป
- รับ message `browserDownload` จาก popup

**`content.js`** — Content Script
- ทำงานบนทุกหน้าที่ `document_start`
- ติดตามสถานะปุ่ม Alt (Option) ในตัวแปร module-level
- ตอบ message `{ action: 'checkAltKey' }` จาก background
- ใช้ `chrome.runtime?.id` guard เพราะ runtime อาจ invalidate เมื่อ extension reload ขณะที่หน้าเดิมยังเปิดอยู่

**`popup.js`** — ตรรกะของป๊อปอัป
- อ่าน `pendingDownload` จาก `chrome.storage.session`
- ปิดอัตโนมัติถ้า entry เก่าเกิน 5 นาที
- ปิดอัตโนมัติทันทีถ้าไม่มี entry (หมายความว่า popup ถูก browser restore ตอน restart)
- ผูกปุ่มสองอัน ปุ่มเริ่มเป็น `disabled` และเปิดใช้งานหลังจากโหลด storage เท่านั้น

**`popup.html`** — UI
- พื้นหลังแบบ gradient, inline styles
- ปุ่มสองอัน เริ่มต้นด้วย `disabled`
- ปุ่ม "Download Shuttle App" อยู่ใน `<a id="sendLink">` เพื่อให้การคลิก trigger custom protocol ได้

**`manifest.json`** — การตั้งค่า
- Manifest V3 (service worker)
- Permissions: `downloads`, `storage`
- Host permissions: `http://*/*`, `https://*/*` (สำหรับ content script)

---

## Invariants ที่กระจายข้ามไฟล์

กฎเหล่านี้กระจายข้ามไฟล์และง่ายที่จะพลาดโดยไม่ตั้งใจ

### 1. ใช้ session storage เท่านั้น ห้ามใช้ local

ทั้ง `pendingDownload` และ `browserDownloadUrls` อยู่ใน `chrome.storage.session` ไม่ใช่ `chrome.storage.local` เพราะ session storage จะถูกล้างอัตโนมัติเมื่อปิด browser → ป้องกัน popup ค้างเปิดขึ้นมาในการเปิด browser ครั้งถัดไป

### 2. Re-entry guard ใช้ URL และเก็บใน storage

เมื่อผู้ใช้กดปุ่ม "Browser Download" บน popup background ต้อง:
1. เพิ่ม URLs เข้า `chrome.storage.session` ใต้คีย์ `browserDownloadUrls` **ก่อน**
2. ค่อยเรียก `chrome.downloads.download()`

ถ้า guard อยู่ใน memory อย่างเดียว → service worker อาจถูก kill ระหว่าง step 2 กับ `onCreated` event ที่จะเกิดในภายหลัง → guard หายไป → extension จะดักจับการดาวน์โหลดของตัวเอง → loop ไม่จบ

ถ้า guard ใช้ download ID → `onCreated` event อาจ fire ก่อน callback ของ `download()` คืนค่า ID มา → race condition อีกแบบหนึ่ง

### 3. Pause ก่อนใน `onCreated` แล้วค่อยตัดสินใจแบบ async

ต้อง `chrome.downloads.pause()` ทันทีใน `onCreated` listener — แบบ sync ก่อนทุก await การ pause ทันทีตอนสร้าง download ทำงานเชื่อถือได้สูง และการ cancel กับ download ที่ paused อยู่ก็เชื่อถือได้เช่นกัน ฟังก์ชัน async `decideDownload()` จะทำงานต่อใน background แล้วเลือก cancel (intercept) หรือ resume (release)

อย่าย้าย cancel ไปไว้ใน sync path ของ `onCreated` — มันต้องเกิดหลังจากตัดสินใจแบบ async แล้ว

### 4. Defer dialog "Save As" ผ่าน `onDeterminingFilename`

Browser ที่ตั้งค่า "Ask where to save each file before downloading" จะแสดง dialog Save As ระหว่างขั้นตอน determining filename เพื่อกัน dialog ตอนดักจับ:

1. ใน `onDeterminingFilename` ค้นหา download ใน `heldDownloads` ถ้าเจอ (ยังตัดสินใจไม่เสร็จ) ให้เก็บ callback `suggest` ไว้บน entry แล้ว `return true` — จะ defer dialog
2. ถ้าดักจับ `cancel` จะฆ่า download; **อย่าเรียก `suggest` ที่เก็บไว้เด็ดขาด**
3. ถ้าปล่อย เรียก `suggest()` ที่เก็บไว้ **ก่อน** แล้วค่อย `resume()` — ลำดับสำคัญ

### 5. macOS-only กรณีอื่นต้องเฉยๆ

แอป Download Shuttle มีเฉพาะบน macOS เท่านั้น เรียก `chrome.runtime.getPlatformInfo()` หนึ่งครั้งตอน module load แล้ว cache ผลลัพธ์ไว้ใน `isMacOS` Sync gate ของ `onCreated` จะ bail ทันทีถ้า `isMacOS === false`; `decideDownload()` ก็ await `checkIsMacOS()` อีกครั้งเพื่อกัน race ตอนแรกที่ cache ยังเป็น `null`

### 6. ต้อง consume `chrome.runtime.lastError` เสมอ

ทุก callback ของ `chrome.downloads.*` ส่ง helper `consumeLastError` (หรืออ่าน `chrome.runtime.lastError` แบบ inline) ถ้าไม่ทำ race ทั่วไป (download เสร็จก่อน cancel/pause/resume ของเรา) จะกลายเป็น warning "Unchecked runtime.lastError" ใน console

### 7. ใช้ Alt อย่างเดียวสำหรับ bypass

`event.altKey && !event.metaKey && !event.shiftKey && !event.ctrlKey` เพราะ Cmd/Shift/Ctrl ขัดกับ default ของลิงก์บน macOS (เปิดแท็บใหม่, หน้าต่างใหม่ ฯลฯ)

### 8. การคลิก `downloadshuttle://` บน popup ต้องเป็นคลิกของผู้ใช้จริง

Browser ห้าม extension navigate ไป custom-protocol URL แบบ programmatic Popup ใช้ `<a href="downloadshuttle://...">` แล้วปล่อยให้การคลิก anchor ตามธรรมชาติเป็นตัวเรียก protocol

---

## Storage Keys

ทั้งหมดอยู่ใน `chrome.storage.session`

| Key | Type | Set โดย | Read โดย | จุดประสงค์ |
|-----|------|---------|----------|-----------|
| `pendingDownload` | `{ urls, protocolUrl, timestamp }` | background (ก่อนเปิด popup) | popup (ตอน startup) | ส่งข้อมูล download ที่ถูกดักจับมาให้ popup |
| `browserDownloadUrls` | `string[]` | background (ก่อน `chrome.downloads.download`) | background (ใน `onCreated`) | Re-entry guard — URLs ที่เราเริ่มดาวน์โหลดเองและห้ามดักจับซ้ำ |

---

## วิธีการทำงานของ Protocol Handler

### รูปแบบ Protocol

```
downloadshuttle://add/<ENCODED_JSON_ARRAY>
```

### ตัวอย่าง

```javascript
const urls = ['https://example.com/file.zip'];

// JSON-encode ก่อน แล้ว URL-encode 1 ครั้ง
const payload = encodeURIComponent(JSON.stringify(urls));
// payload === '%5B%22https%3A%2F%2Fexample.com%2Ffile.zip%22%5D'

const protocolUrl = 'downloadshuttle://add/' + payload;
link.href = protocolUrl;
// เมื่อผู้ใช้คลิกลิงก์ OS จะส่งให้แอป Download Shuttle
```

### ทำไมต้องให้ผู้ใช้คลิก

ความปลอดภัยของ browser: extension เรียก custom protocol แบบ programmatic ไม่ได้ ทางเดียวที่จะเรียก `downloadshuttle://` ได้คือคลิกลิงก์จริง เราใช้ element `<a>` แล้วเซ็ต `href` ก่อนที่จะเกิดการคลิก

---

## การเพิ่มชนิดไฟล์ใหม่

แก้ไฟล์ [src/background.js](src/background.js):

- `FILE_EXTENSIONS` — match กับ pathname ของ URL (lowercase) ใส่จุดนำหน้าด้วย เช่น `'.zip'`
- `MIME_TYPES` — match กับ `downloadItem.mime` (lowercase)

ถ้า **ตัวใดตัวหนึ่ง** match → ดักจับ

หลีกเลี่ยง `application/octet-stream` เพราะ server หลายเจ้าใช้เป็น fallback สำหรับไฟล์ binary ที่ไม่รู้จัก → จะดักจับมั่วเกินไป

---

## การตั้งค่าสำหรับการพัฒนา

### ข้อกำหนดเบื้องต้น
- เบราว์เซอร์ Chrome หรือ Edge
- แอป Download Shuttle ติดตั้งแล้ว (สำหรับการทดสอบ end-to-end)
- โปรแกรมแก้ไขข้อความใดก็ได้

### การติดตั้ง
1. โคลนโปรเจกต์
2. เปิด `chrome://extensions/`
3. เปิด **โหมดผู้พัฒนา**
4. คลิก **โหลดส่วนขยายที่แกะแล้ว**
5. เลือกโฟลเดอร์ `src/`

### การทำการเปลี่ยนแปลง
1. แก้ไฟล์ใดก็ได้ใน `src/`
2. ไป `chrome://extensions/`
3. คลิกไอคอนรีโหลดที่ส่วนขยาย
4. ทดสอบการเปลี่ยนแปลง

**ไม่ต้อง build** เพราะเป็น vanilla JS ไม่มี dependencies

---

## การ Debug

**คอนโซลของ Background script:**
- `chrome://extensions/` → หาส่วนขยาย → คลิก "service worker"
- ล็อกมี prefix `[Download Shuttle Link] ...`

**คอนโซลของ Popup:**
- คลิกขวาที่ popup → Inspect

**ทดสอบ protocol ด้วยตนเอง:**
```javascript
// ใน DevTools console ของหน้าใดก็ได้
window.location.href = 'downloadshuttle://add/%5B%22https%3A%2F%2Fexample.com%2Ftest.zip%22%5D';
```

### ปัญหาที่พบบ่อย

| ปัญหา | สาเหตุ | วิธีแก้ |
|-------|-------|---------|
| Protocol ไม่ทำงาน | Encode ซ้ำสองครั้ง | Encode ครั้งเดียวด้วย `encodeURIComponent(JSON.stringify(urls))` |
| ป๊อปอัปขออนุญาตทุกครั้ง | ผู้ใช้คลิก "Allow" ไม่ใช่ "Always allow" | คลิก "Always allow" |
| การดาวน์โหลดไม่ถูกดักจับ | ชนิดไฟล์ไม่อยู่ในรายการ | เพิ่มเข้า `FILE_EXTENSIONS` หรือ `MIME_TYPES` |
| Extension ดักจับ fallback download ตัวเอง | ไม่ได้ set guard ก่อน `download()` | ต้อง `await addBrowserDownloadUrls(urls)` ก่อน `chrome.downloads.download()` เสมอ |
| ป๊อปอัปเปิดเองหลัง restart browser | เก็บใน `chrome.storage.local` | ต้องใช้ `chrome.storage.session` |
| Content script error หลัง reload extension | Context ที่ค้างในหน้าเก่า | ใช้ `chrome.runtime?.id` guard ก่อนเรียก chrome API |

---

## การตัดสินใจออกแบบที่สำคัญ

### ทำไมใช้หน้าต่างป๊อปอัปแทนแท็บ?

รบกวนน้อยกว่า, UX สะอาดกว่า, ปิดอัตโนมัติได้ง่าย ถ้าเป็นแท็บจะค้างอยู่ใน tab list จนกว่าผู้ใช้จะเห็น

### ทำไมมีสองปุ่ม?

Protocol Download Shuttle อาจล้มเหลวเงียบๆ ได้ — แอปอาจไม่ติดตั้ง หรือผู้ใช้อาจ dismiss prompt ขออนุญาตของ OS ปุ่ม "Browser Download" เป็นทางหนีไฟ

### ทำไมใช้ `chrome.storage.session` แทน `chrome.storage.local`?

`local` คงอยู่ข้าม browser restart ถ้าผู้ใช้ปิด browser โดยไม่ได้จัดการ download ที่ค้าง → popup จะเปิดมาในการ launch ครั้งถัดไปพร้อมข้อมูลเก่า `session` ล้างเมื่อปิด browser ซึ่งตรงกับที่เราต้องการสำหรับ transient handoff data

### ทำไม re-entry guard เก็บ URLs (ไม่ใช่ download IDs) ใน storage (ไม่ใช่ memory)?

มี 2 failure mode ที่วิธี URL-in-storage หลีกเลี่ยงได้:

1. **In-memory + ID:** `chrome.downloads.onCreated` อาจ fire ก่อน callback ของ `chrome.downloads.download` จะคืนค่า download ID มา → guard ยังไม่ทันถูก set → เราดักจับ download ของตัวเอง
2. **In-memory + URL:** Race เดิม + MV3 service workers ถูก kill เมื่อ idle (~30 วินาที) → Set หายไปตอน restart

URL-in-session-storage ถูก set ก่อนเรียก `download()` และอยู่รอด worker restart

### ทำไมต้อง pause ใน `onCreated` แล้วตัดสินใจแบบ async?

การตัดสินใจดักจับต้องใช้สถานะปุ่ม Alt ซึ่งต้อง await message round-trip ไปยัง content script แต่ `onCreated` ต้องทำงานแบบ sync เพื่อ pause download ก่อนที่มันจะเดินหน้า จึงแยกสองส่วนนี้ออกจากกัน:

```javascript
chrome.downloads.onCreated.addListener(function (downloadItem) {
  // ...sync gates...
  heldDownloads.set(downloadItem.id, { suggest: null });
  chrome.downloads.pause(downloadItem.id, consumeLastError); // sync, ทันที
  decideDownload(downloadItem);                              // async, await Alt key ฯลฯ
});
```

`onCreated` pause ทันที จากนั้น `decideDownload()` ค่อย await `isAltKeyPressed()` พร้อมเช็ค macOS/re-entry ก่อนจะ cancel (ดักจับ) หรือ resume (ปล่อยผ่าน) ถ้าตัดสินใจในตัว listener เลยจะต้องบล็อกการ pause หรือไม่ก็ตัดสินใจโดยไม่รู้ว่ากด Alt อยู่ไหม

### ทำไม content script ใช้ messaging แทนการเข้าถึง `chrome.storage` ตรงๆ?

Content script *เข้าถึง* `chrome.storage` ได้ แต่ write/read round-trip ช้าเกินไปสำหรับคำถาม "Alt ตอนนี้กดอยู่ไหม?" Direct messaging ให้ background ได้สถานะ live ตอนตัดสินใจ

หมายเหตุ: content script ใช้ message-passing API ร่วมกับ extension ได้ แต่รันใน isolated JS world แยกจาก script ของหน้าเพจ

### ทำไมใช้ Alt แทน Cmd/Shift/Ctrl สำหรับ bypass?

ทดสอบบน macOS Chrome:

- **Cmd + คลิก** → เปิดแท็บใหม่ (ขัด)
- **Shift + คลิก** → เปิดหน้าต่างใหม่ (ขัด)
- **Ctrl + คลิก** → เปิด context menu (ขัด)
- **Alt + คลิก** → ไม่มี default action (สะอาด)

---

## การมีส่วนร่วม

1. Fork repository
2. สร้าง feature branch: `git checkout -b feature/my-feature`
3. แก้ไขโค้ด
4. ทดสอบให้ละเอียด (หลายชนิดไฟล์, ทั้งกดและไม่กด Alt, ทั้งที่ Shuttle app เปิดและไม่เปิด)
5. อัปเดตเอกสารถ้าพฤติกรรมที่ผู้ใช้เห็นหรือ invariants เปลี่ยน
6. ส่ง pull request

### รายงานบั๊ก

ใส่ข้อมูลนี้:
- เวอร์ชัน browser (Chrome/Edge)
- เวอร์ชัน extension (จาก `manifest.json`)
- ขั้นตอนการทำซ้ำ
- Background + popup console logs
- Screenshot ถ้ามี

---

## ความปลอดภัยและความเป็นส่วนตัว

### คำอธิบาย Permissions

```json
{
  "downloads":  // ตรวจสอบ, ยกเลิก, และลบ downloads
  "storage"     // ส่ง pending downloads ระหว่าง background และ popup
                // (session-scoped — ล้างเมื่อปิด browser)
}
```

บวกกับ host permissions บน `http://*/*` และ `https://*/*` เพื่อให้ content script ฟังปุ่ม Alt บนทุกหน้า

### ไม่มีการเก็บข้อมูล

- ไม่มี request ออกเครือข่าย
- ไม่มี tracking หรือ analytics
- ไม่มีข้อมูลคงอยู่นอก session ของ browser ปัจจุบัน
- ประมวลผลทั้งหมดในเครื่อง คุยกับ Download Shuttle ผ่าน OS protocol handler เท่านั้น

### ผู้ใช้ตรวจสอบได้อย่างไร

1. `chrome://extensions/` → หา extension → ดูไฟล์ source
2. DevTools Network tab — ไม่มี request ออก
3. ดู permissions ใน `manifest.json`

---

## สัญญาอนุญาต

MIT License — ใช้ ดัดแปลง และเผยแพร่ได้อย่างเสรี

---

## มีคำถาม?

เปิด issue บน GitHub หรือติดต่อผู้ดูแลโปรเจกต์
