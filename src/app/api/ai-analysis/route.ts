// ============================================
// API: ส่งข้อมูล metrics ไปวิเคราะห์ด้วย AI (OpenRouter)
// POST /api/ai-analysis
// Body: { accountHandle, summary, metrics }
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบ session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "กรุณาล็อกอินก่อน" },
        { status: 401 }
      );
    }

    // รับข้อมูลที่ส่งมา
    const { accountHandle, summary, metrics } = await request.json();

    if (!accountHandle || !summary || !metrics) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามี API key หรือไม่
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      // ถ้าไม่มี API key ส่งข้อมูลตัวอย่างกลับ (demo mode)
      return NextResponse.json({
        analysis: generateDemoAnalysis(accountHandle, summary),
        model: "demo-mode",
        isDemo: true,
      });
    }

    // === ส่งข้อมูลไป OpenRouter API ===
    const prompt = buildAnalysisPrompt(accountHandle, summary, metrics);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
          "X-Title": "TikTok Analytics Dashboard",
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || "anthropic/claude-3.5-sonnet",
          messages: [
            {
              role: "system",
              content:
                "คุณเป็นผู้เชี่ยวชาญด้านการตลาดบน TikTok และการวิเคราะห์ข้อมูล Social Media โปรดให้คำแนะนำเป็นภาษาไทย อ่านง่าย และนำไปปฏิบัติได้จริง",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenRouter API error:", errorData);
      return NextResponse.json(
        { error: "ไม่สามารถเชื่อมต่อ AI ได้ กรุณาลองใหม่" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const analysis =
      data.choices?.[0]?.message?.content || "ไม่สามารถสร้างบทวิเคราะห์ได้";

    return NextResponse.json({
      analysis,
      model: data.model || "unknown",
      isDemo: false,
    });
  } catch (error) {
    console.error("AI Analysis error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการวิเคราะห์" },
      { status: 500 }
    );
  }
}

// === สร้าง Prompt สำหรับ AI ===
function buildAnalysisPrompt(
  accountHandle: string,
  summary: {
    totalRevenue: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
  },
  metrics: Array<{
    date: string;
    revenue: number;
    views: number;
    likes: number;
  }>
) {
  return `
วิเคราะห์ผลการดำเนินงานของบัญชี TikTok: ${accountHandle}

📊 สรุปภาพรวม (14 วันล่าสุด):
- รายได้รวม: ฿${summary.totalRevenue.toLocaleString()}
- ยอดวิวรวม: ${summary.totalViews.toLocaleString()}
- ยอดไลค์รวม: ${summary.totalLikes.toLocaleString()}
- ยอดคอมเมนต์รวม: ${summary.totalComments.toLocaleString()}
- ยอดแชร์รวม: ${summary.totalShares.toLocaleString()}

📈 ข้อมูลรายวัน:
${metrics.map((m) => `${m.date}: วิว ${m.views.toLocaleString()}, ไลค์ ${m.likes.toLocaleString()}, รายได้ ฿${m.revenue.toLocaleString()}`).join("\n")}

กรุณาวิเคราะห์:
1. 📈 แนวโน้มภาพรวม (เติบโตหรือลดลง?)
2. 💡 จุดแข็งและจุดที่ควรปรับปรุง
3. 🎯 กลยุทธ์ที่แนะนำ 3-5 ข้อ เพื่อเพิ่ม engagement
4. 📅 ช่วงเวลาที่เหมาะสำหรับโพสต์
5. 💰 แนวทางเพิ่มรายได้
`;
}

// === Demo Analysis (เมื่อไม่มี API key) ===
function generateDemoAnalysis(
  handle: string,
  summary: {
    totalRevenue: number;
    totalViews: number;
    totalLikes: number;
  }
) {
  const engagementRate =
    summary.totalViews > 0
      ? ((summary.totalLikes / summary.totalViews) * 100).toFixed(2)
      : "0";

  return `
# 📊 บทวิเคราะห์บัญชี ${handle}

## 📈 ภาพรวม
- **Engagement Rate**: ${engagementRate}%
- **รายได้เฉลี่ย/วัน**: ฿${(summary.totalRevenue / 14).toFixed(0)}
- **วิวเฉลี่ย/วัน**: ${(summary.totalViews / 14).toFixed(0)}

## 💡 ข้อสังเกต
1. Engagement Rate ${parseFloat(engagementRate) > 5 ? "อยู่ในเกณฑ์ดี" : "ควรปรับปรุง"} เมื่อเทียบกับค่าเฉลี่ย TikTok (3-6%)
2. ยอดวิวมีแนวโน้มที่ดี ควรรักษาความสม่ำเสมอในการโพสต์

## 🎯 คำแนะนำ
1. โพสต์ในช่วง 18:00-21:00 ที่มี engagement สูงสุด
2. ใช้ trending sounds เพื่อเพิ่ม reach
3. ตอบคอมเมนต์ภายใน 1 ชั่วโมงแรก
4. ทดลอง format วิดีโอ 15-30 วินาที
5. ใช้ hashtag mix ระหว่าง trending + niche

> ⚠️ นี่คือข้อมูลตัวอย่าง (Demo Mode) — ใส่ OPENROUTER_API_KEY เพื่อใช้ AI วิเคราะห์จริง
`;
}
