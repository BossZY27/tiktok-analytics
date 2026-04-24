import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import FormData from "form-data";
import axios from "axios";
import AdmZip from "adm-zip";
import "dotenv/config";

// --- การตั้งค่าบอท ---
const EDGE_USER_DATA = path.join(process.env.LOCALAPPDATA || "", "Microsoft/Edge/User Data");
const DASHBOARD_URL = "http://127.0.0.1:3000"; // บังคับใช้ Local สำหรับทดสอบในเครื่อง
const BOT_SECRET = process.env.BOT_SECRET || "";

/**
 * ฟังก์ชันหลักในการรันบอทหนึ่งโปรไฟล์
 * @param profileDir ชื่อโฟลเดอร์โปรไฟล์ (เช่น Default, Profile 1)
 * @param accountHandle ชื่อ TikTok ไอดี (เช่น @bosszy)
 */
async function syncTikTokStudio(profileDir: string, accountHandle: string) {
  console.log(`\n🚀 [${accountHandle}] เริ่มการทำงานด้วยโปรไฟล์: ${profileDir}...`);

  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    channel: "msedge",
    headless: false,
    args: [`--profile-directory=${profileDir}`],
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    // 1. ไปหน้า Analytics
    console.log(`🔗 กำลังไปที่หน้า TikTok Studio Analytics...`);
    await page.goto("https://www.tiktok.com/tiktokstudio/analytics", { 
      waitUntil: "load", 
      timeout: 90000 
    });

    // ตรวจสอบว่าล็อกอินหรือยัง
    if (page.url().includes("login")) {
      console.error("❌ บอทตรวจพบว่าโปรไฟล์นี้ไม่ได้ล็อกอิน TikTok ไว้ครับ");
      throw new Error("NOT_LOGGED_IN");
    }

    // --- ✨ ฟีเจอร์ใหม่: ด่านตรวจชื่อบัญชี (Account Verification) ---
    console.log(`🕵️‍♂️ กำลังตรวจสอบ @Handle ปัจจุบันในบราว์เซอร์...`);
    await page.waitForTimeout(3000); // รอ UI ตัวตนโหลดสักนิด

    // พยายามหาชื่อ Handle จาก UI (โดยปกติจะอยู่ที่มุมบนซ้ายหรือขวา)
    // เราจะใช้การส่องจาก Text ที่มีเครื่องหมาย @ นำหน้า
    const detectedHandle = await page.evaluate(() => {
      // ค้นหา Element ที่มีข้อความเริ่มด้วย @
      const elements = Array.from(document.querySelectorAll("div, span, p"));
      const handleEl = elements.find(el => el.textContent?.trim().startsWith("@"));
      return handleEl?.textContent?.trim() || "NOT_FOUND";
    });

    console.log(`🔍 ตรวจพบไอดี: ${detectedHandle}`);

    if (detectedHandle !== "NOT_FOUND") {
      const isMatch = detectedHandle.toLowerCase().includes(accountHandle.toLowerCase().replace("@", ""));
      if (!isMatch) {
         console.error(`⚠️ [ระวัง!] บัญชีที่เปิดอยู่คือ ${detectedHandle} แต่บอสสั่งให้ซิงค์บัญชี ${accountHandle}`);
         console.log("🛑 บอทขอหยุดทำงานเพื่อความปลอดภัยของข้อมูลครับ บอสช่วยสลับบัญชีใน Edge ให้ตรงกันก่อนนะ!");
         throw new Error("ACCOUNT_MISMATCH");
      }
      console.log("✅ ยืนยันตัวตนสำเร็จ! ชื่อบัญชีตรงกัน ลุยต่อได้ครับบอส");
    } else {
      console.log("⚠️ บอทหาชื่อ @Handle บนหน้าจอไม่เจอ แต่จะพยายามทำงานต่อด้วยความระมัดระวังครับ");
    }
    // ---------------------------------------------------------

    // 2. รอข้อมูลโหลด
    console.log(`⏳ กำลังรอสถิติในหน้าจอโหลด...`);
    await page.waitForTimeout(5000); // รอ UI นิ่งๆ สักนิด

    // 3. กดปุ่ม Export (หาทุกชื่อที่เป็นไปได้)
    console.log(`🖱️ กำลังหาปุ่ม Export/Download...`);
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), button:has-text("ดาวน์โหลด"), button:has-text("ส่งออก")').first();
    await exportButton.waitFor({ state: "visible", timeout: 45000 });
    await exportButton.click();

    // 4. เลือก CSV และดาวน์โหลด
    console.log(`🔘 เลือกดาวน์โหลดแบบ CSV...`);
    // ใช้การคลิกแบบเจาะจงข้อความและบังคับคลิก
    await page.getByText("CSV").first().click({ force: true });
    await page.waitForTimeout(1000);

    console.log(`📥 กดปุ่มดาวน์โหลดสุดท้าย...`);
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60000 }),
      page.locator('button:has-text("Download"), button:has-text("ดาวน์โหลด")').last().click({ force: true })
    ]);

    const zipPath = path.join(__dirname, `temp_${Date.now()}.zip`);
    await download.saveAs(zipPath);
    console.log(`✅ ดาวน์โหลดไฟล์สำเร็จ: ${zipPath}`);

    // 5. แกะไฟล์และส่งข้อมูล
    console.log(`📦 แกะซิปเพื่อนำข้อมูลเข้าฐานข้อมูล...`);
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();
    const csvEntry = zipEntries.find(entry => entry.entryName.toLowerCase().includes("overview.csv"));
    
    if (!csvEntry) throw new Error("ไม่เจอไฟล์ Overview.csv ในซิปครับ");

    const tempCsvPath = path.join(__dirname, `temp_data_${Date.now()}.csv`);
    fs.writeFileSync(tempCsvPath, csvEntry.getData());

    console.log(`📤 กำลังส่งข้อมูลรายได้และสถิติไปที่ Dashboard...`);
    const form = new FormData();
    form.append("file", fs.createReadStream(tempCsvPath));
    form.append("accountHandle", accountHandle);
    form.append("year", new Date().getFullYear().toString());

    const response = await axios.post(`${DASHBOARD_URL}/api/sync-bot`, form, {
      headers: {
        "x-bot-secret": BOT_SECRET,
        ...form.getHeaders(),
      },
    });

    console.log(`✨ สำเร็จ! หลังบ้านตอบกลับมาว่า: ${response.data.message}`);
    if (response.data.lastError) {
      console.error(`❌ รายงานปัญหาจากหลังบ้าน: ${response.data.lastError}`);
    }
    if (response.data.debug) {
      console.log(`🔍 ข้อมูลตัวอย่างที่ส่งไป:`, JSON.stringify(response.data.debug, null, 2));
    }

    // ล้างไฟล์ขยะ
    fs.unlinkSync(zipPath);
    fs.unlinkSync(tempCsvPath);

  } catch (error: any) {
    console.error(`❌ [${accountHandle}] เกิดข้อผิดพลาด:`, error.message);
    const debugPath = path.join(__dirname, `error_${Date.now()}.png`);
    await page.screenshot({ path: debugPath });
  } finally {
    await context.close();
    console.log(`🏁 จบการทำงานของบัญชี ${accountHandle}`);
  }
}

// --- ส่วนของการรันงาน (ปรับปรุงเพื่อให้รันผ่าน API ได้) ---
async function runAll() {
  if (!BOT_SECRET) {
    console.error("❌ Error: ไม่มี BOT_SECRET ในไฟล์ .env");
    process.exit(1);
  }

  // 1. ตรวจสอบว่ามีการส่ง "ใบสั่งงาน" มาจาก API หรือไม่
  const targetHandle = process.env.BOT_TARGET_HANDLE;
  const targetProfile = process.env.BOT_TARGET_PROFILE;

  if (targetHandle && targetProfile) {
    console.log(`🎯 [API Order] Syncing specific account: ${targetHandle} with profile: ${targetProfile}`);
    await syncTikTokStudio(targetProfile, targetHandle);
  } else {
    // 2. ถ้าไม่มีใบสั่ง (รันผ่าน Terminal ปกติ) ให้รันตามรายการปกติ
    console.log("📝 [Standard Run] No specific target, running default tasks...");
    const tasks = [
      ["Default", "_bpkm_"], 
    ];

    for (const [profile, handle] of tasks) {
      await syncTikTokStudio(profile, handle);
    }
  }
}

runAll().catch(err => console.error("Global Error:", err));
