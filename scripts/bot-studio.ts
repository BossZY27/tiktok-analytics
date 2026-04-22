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
  console.log(`\n🚀 [${accountHandle}] Starting sync using profile: ${profileDir}...`);

  // 1. เริ่มต้น Browser โดยใช้ Profile เดิมของคุณบอส
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    channel: "msedge",
    headless: false, // แสดงหน้าจอให้คุณบอสเห็นการทำงาน
    args: [`--profile-directory=${profileDir}`],
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    // 2. ไปที่หน้า Analytics ของ TikTok Studio
    console.log(`🔗 Navigating to TikTok Studio Analytics...`);
    await page.goto("https://www.tiktok.com/tiktokstudio/analytics", { waitUntil: "domcontentloaded", timeout: 60000 });

    // 3. รอให้ข้อมูลสถิติโหลดเสร็จ (หาปุ่ม Export)
    console.log(`⏳ Waiting for stats to load and Export button to appear...`);
    
    // ค้นหาปุ่มโดยใช้ Role และ Name (ทนทานต่อการเปลี่ยนโครงสร้างเว็บ)
    const exportButton = page.getByRole("button", { name: /export|download|ดาวน์โหลด|ส่งออก/i });
    await exportButton.waitFor({ state: "visible", timeout: 30000 });

    // 4. เตรียมรับไฟล์ดาวน์โหลด (จัดการ Modal ที่เด้งขึ้นมา)
    console.log(`🖱️ Clicking initial Download button...`);
    await exportButton.click();

    console.log(`🔘 Selecting CSV format in modal...`);
    // ค้นหาคลิกที่ข้อความ CSV หรือ Radio button ของ CSV
    await page.getByText("CSV", { exact: true }).click();

    console.log(`📥 Clicking final Download button in modal...`);
    await page.waitForTimeout(2000);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      // ใช้การค้นหาจากข้อความโดยตรง (จะช่วยให้เจอปุ่มแม้ไม่ใช่แท็ก button)
      page.getByText(/^Download$/).last().click({ force: true })
    ]);

    const zipPath = path.join(__dirname, `temp_${accountHandle.replace("@", "")}.zip`);
    await download.saveAs(zipPath);
    console.log(`✅ Downloaded ZIP to: ${zipPath}`);

    // === ขั้นตอนพิเศษ: แกะซิปเพื่อเอาไฟล์ CSV ===
    console.log(`📦 Unzipping to extract Overview.csv...`);
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();
    
    // ค้นหาไฟล์ Overview.csv ในซิป
    const csvEntry = zipEntries.find(entry => entry.entryName.toLowerCase().includes("overview.csv"));
    
    if (!csvEntry) {
      throw new Error("Could not find Overview.csv inside the downloaded ZIP file.");
    }

    const csvContent = csvEntry.getData();
    const tempCsvPath = path.join(__dirname, `temp_data_${accountHandle.replace("@", "")}.csv`);
    fs.writeFileSync(tempCsvPath, csvContent);
    console.log(`📄 Extracted CSV to: ${tempCsvPath}`);

    // 5. ส่งข้อมูลเข้า API ของเรา
    console.log(`📤 Sending data to Dashboard API...`);
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

    console.log(`✨ API Response: ${response.data.message}`);

    // ลบไฟล์ชั่วคราว
    fs.unlinkSync(zipPath);
    fs.unlinkSync(tempCsvPath);

  } catch (error: any) {
    if (error.response) {
      console.error(`❌ API Error Logging:`, error.response.data);
    }
    console.error(`❌ Error syncing ${accountHandle}:`, error.message);
    const debugPath = path.join(__dirname, `debug_${accountHandle.replace("@", "")}.png`);
    await page.screenshot({ path: debugPath });
    console.log(`📸 Debug screenshot saved to: ${debugPath}`);
  } finally {
    await context.close();
    console.log(`🏁 [${accountHandle}] Sync finished.`);
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
