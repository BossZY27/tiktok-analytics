# TikTok Analytics Dashboard

Dashboard สำหรับรวบรวมและดูสถิติ TikTok หลายบัญชี รองรับการนำเข้า CSV/XLSX, กรองช่วงวันที่, รวมผลรายวัน และควบคุมสิทธิ์ผู้ใช้ด้วย role

> สถานะ: มีโค้ดเว็บและ data workflow สำหรับรันบนเครื่อง การเชื่อม TikTok OAuth และ browser automation ต้องใช้บัญชีทดสอบกับค่าตั้งค่าของผู้ใช้งานเอง งานปรับปรุงเอกสารนี้ไม่เปิด browser profile, ไม่ดาวน์โหลดข้อมูลจริง และไม่เรียกบริการ AI แบบเสียเงิน

## ความสามารถที่ตรวจสอบได้จากโค้ด

- สมัครและเข้าสู่ระบบด้วย email/password ผ่าน NextAuth Credentials
- สิทธิ์ `ADMIN`, `EDITOR` และ `VIEWER`
- จัดการหลาย TikTok account และ soft delete/restore
- นำเข้าไฟล์ `.csv`, `.xlsx` หรือ `.xls` แล้ว upsert สถิติรายวัน
- แสดงยอดวิว ไลก์ คอมเมนต์ แชร์ การเข้าชมโปรไฟล์ และข้อมูลแบบรวมหลายบัญชี
- เลือกช่วงวันที่สำหรับ dashboard
- ขอ AI analysis ผ่าน OpenRouter; เมื่อไม่มี key ระบบคืนคำอธิบายแบบ demo อย่างชัดเจน
- มี Playwright workflow สำหรับเปิด TikTok Studio, export analytics และส่งไฟล์เข้าระบบผ่าน endpoint ที่ตรวจ `BOT_SECRET`

## Workflow

```mermaid
flowchart LR
    A[CSV/XLSX จาก TikTok Analytics] --> B[ตรวจชนิดไฟล์และสิทธิ์]
    B --> C[แปลงชื่อคอลัมน์และวันที่]
    C --> D[Upsert DailyMetric ใน PostgreSQL]
    D --> E[API รวมข้อมูลตามบัญชีและช่วงวันที่]
    E --> F[Dashboard และกราฟ]
    F --> G[AI analysis แบบเลือกใช้]
    H[Playwright bot บนเครื่อง] -. ทางเลือก .-> A
```

## ตัวอย่างข้อมูลนำเข้า

ข้อมูลนี้เป็นข้อมูลสังเคราะห์สำหรับอธิบาย schema เท่านั้น

```csv
Date,Video Views,Profile Views,Likes,Comments,Shares
September 01,1200,95,180,12,24
September 02,1450,110,220,18,31
```

ตัวนำเข้ารองรับชื่อคอลัมน์ภาษาอังกฤษตามตัวอย่าง และรับค่า `year` แยกต่างหากเพื่อประกอบวันที่

ตัวอย่างรูปแบบ response จาก metrics API (ค่าด้านล่างเป็นข้อมูลสังเคราะห์):

```json
{
  "account": { "id": "demo-account", "handle": "@demo" },
  "summary": {
    "totalViews": 2650,
    "totalLikes": 400,
    "totalComments": 30,
    "totalShares": 55,
    "totalProfileViews": 205
  },
  "metrics": [
    { "date": "2026-09-01", "views": 1200, "likes": 180 }
  ]
}
```

## เทคโนโลยี

- Next.js 16, React 19 และ TypeScript
- NextAuth Credentials และ bcrypt
- Prisma 7 กับ PostgreSQL
- Recharts
- Papa Parse และ SheetJS
- Playwright สำหรับ local browser automation
- OpenRouter สำหรับ AI analysis แบบเลือกใช้

## ติดตั้งเว็บบนเครื่อง

ต้องมี Node.js, npm และ PostgreSQL ก่อนเริ่ม

```powershell
git clone https://github.com/BossZY27/tiktok-analytics.git
cd tiktok-analytics
npm install
Copy-Item .env.example .env
```

ตั้งค่าอย่างน้อย:

```dotenv
DATABASE_URL=postgresql://user:password@localhost:5432/tiktok_analytics
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace_with_a_long_random_value
BOT_SECRET=replace_with_a_different_long_random_value
```

สร้าง schema แล้วเริ่มระบบ:

```powershell
npm run db:push
npm run dev
```

เปิด `http://localhost:3000` แล้วสมัครผู้ใช้ผ่านหน้าเว็บ โค้ดปัจจุบันกำหนดผู้สมัครใหม่เป็น `ADMIN` ชั่วคราว จึงควรใช้เฉพาะสภาพแวดล้อมทดสอบและแก้นโยบาย role ก่อนเปิดให้บุคคลอื่นสมัคร

> `npm run db:seed` สร้างบัญชีตัวอย่างด้วยค่าที่กำหนดไว้ใน `prisma/seed.ts` จึงไม่ควรใช้ใน production โดยไม่ตรวจและเปลี่ยนข้อมูลก่อน

## Environment variables

| ตัวแปร | ใช้โดย | จำเป็นเมื่อ |
|---|---|---|
| `DATABASE_URL` | Prisma/PostgreSQL | รันเว็บและคำสั่งฐานข้อมูล |
| `NEXTAUTH_URL` | NextAuth และ OAuth callback | รันเว็บ |
| `NEXTAUTH_SECRET` | NextAuth JWT | รันระบบล็อกอิน |
| `BOT_SECRET` | browser bot และ `/api/sync-bot` | ใช้ automated sync |
| `BOT_TARGET_HANDLE` | browser bot | สั่ง sync บัญชีเฉพาะ |
| `BOT_TARGET_PROFILE` | browser bot | ระบุ Edge profile ที่ใช้ทดสอบ |
| `OPENROUTER_API_KEY` | AI analysis | ใช้ AI จริงแทน demo mode |
| `AI_MODEL` | AI analysis | เปลี่ยนโมเดล OpenRouter |
| `TIKTOK_CLIENT_KEY` | TikTok OAuth | เปิด OAuth |
| `TIKTOK_CLIENT_SECRET` | TikTok OAuth callback | เปิด OAuth |

Google OAuth variables ที่พบในโค้ดเป็นเพียง comment สำหรับงานในอนาคต จึงยังไม่ใช่ขั้นตอนติดตั้งของระบบปัจจุบัน

## Local browser automation

โค้ด `scripts/bot-studio.ts` ใช้ Edge profile บน Windows และเปิด browser แบบเห็นหน้าจอ จึงควรใช้เฉพาะบัญชีทดสอบที่เจ้าของอนุญาต พร้อมปิดหน้าต่าง Edge อื่นที่ใช้ profile เดียวกันก่อนรัน

```powershell
npx tsx scripts/bot-studio.ts
```

ข้อควรระวัง:

- bot อาศัยข้อความและโครงสร้างหน้า TikTok Studio ซึ่งอาจเปลี่ยนได้
- script สามารถ export ข้อมูลจากบัญชีที่ล็อกอินอยู่จริง ห้ามรันกับบัญชี production โดยไม่ได้รับอนุญาต
- หากทำงานผิดพลาด script อาจสร้างภาพ debug ใน `scripts/`; ตรวจว่าไม่มีข้อมูลส่วนบุคคลก่อนเผยแพร่

## ตรวจคุณภาพ

```powershell
npm run lint
npm run build
```

การ build ต้องมี `DATABASE_URL` ที่ Prisma อ่านได้ ส่วน integration test ของ OAuth, Playwright และ OpenRouter ต้องใช้บริการภายนอก จึงควรแยกจากการตรวจเอกสารและ static checks

## ข้อจำกัดที่ทราบ

- selector ใน browser automation ผูกกับหน้า TikTok Studio ปัจจุบัน
- การนำเข้าใช้ชื่อคอลัมน์ที่กำหนดใน route; export format ที่เปลี่ยนอาจต้องปรับ mapping
- route สมัครสมาชิกกำหนดผู้ใช้ใหม่เป็น `ADMIN` ชั่วคราว จึงยังไม่ปลอดภัยสำหรับระบบที่เปิดสมัครสาธารณะ
- ยังไม่มี automated test suite สำหรับ API และ browser workflow
- repository อาจมีไฟล์ export, log หรือ debug จากการทดลองเดิม ควรตรวจและล้างข้อมูลจริงออกจาก Git history ก่อนนำเสนอแบบสาธารณะ
