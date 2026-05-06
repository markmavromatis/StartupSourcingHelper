import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";
import { Startup } from "@/app/types";
import { readFileSync } from "fs";
import { join } from "path";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const startup: Startup = await request.json();

    // Read template PDF
    const templatePath = join(process.cwd(), "template", "default_template.pdf");
    const templateBytes = readFileSync(templatePath);

    // Load template PDF
    const pdfDoc = await PDFDocument.load(templateBytes);
    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();

    // Fill template with startup data
    await fillTemplateWithData(pdfDoc, page, startup, width, height);

    // Serialize PDF to bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // Set up response headers for PDF download
    const filename = `${startup.companyName.replace(/\s+/g, "_")}_metadata.pdf`;
    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });

    return new NextResponse(pdfBuffer, {
      headers,
      status: 200,
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function fillTemplateWithData(pdfDoc: any, page: any, startup: Startup, width: number, height: number) {
  const margin = 40;
  const lineHeight = 14;
  const fontSize = 9;
  let y = height - margin;

  // Helper to wrap and draw text
  const drawWrappedText = (
    text: string,
    size: number,
    color = rgb(0, 0, 0),
    maxWidth?: number
  ) => {
    const lines: string[] = [];
    if (maxWidth) {
      const words = text.split(" ");
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const estimatedWidth = testLine.length * (size * 0.5);
        if (estimatedWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
    } else {
      lines.push(text);
    }

    for (const line of lines) {
      page.drawText(line, {
        x: margin,
        y,
        size,
        color,
      });
      y -= lineHeight;
    }

    return y;
  };

  // Title
  page.drawText(startup.companyName, {
    x: margin,
    y,
    size: 20,
    color: rgb(0, 0, 0),
  });
  y -= 28;

  // Short description
  y = drawWrappedText(
    startup.shortDescription,
    11,
    rgb(80 / 255, 80 / 255, 80 / 255),
    width - margin * 2
  );
  y -= 12;

  // Divider line
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(200 / 255, 200 / 255, 200 / 255),
  });
  y -= 15;

  // Key information section
  page.drawText("KEY INFORMATION", {
    x: margin,
    y,
    size: 10,
    color: rgb(0, 0, 0),
  });
  y -= 14;

  const infoData = [
    ["Company Name", startup.companyName],
    ["HQ Location", startup.hq],
    ["Founding Year", startup.foundingYear?.toString() || "—"],
    ["Employees", startup.employees || "—"],
    ["Date Added", startup.addedDate],
    ["Website", startup.websiteUrl || "—"],
    ["Video URL", startup.videoUrl || "—"],
  ];

  for (const [label, value] of infoData) {
    page.drawText(label + ":", {
      x: margin,
      y,
      size: 9,
      color: rgb(60 / 255, 60 / 255, 60 / 255),
    });

    page.drawText(value, {
      x: margin + 120,
      y,
      size: 9,
      color: rgb(0, 0, 0),
    });

    y -= lineHeight;
  }

  y -= 8;

  // Tags section
  if (startup.tags.length > 0) {
    page.drawText("TAGS", {
      x: margin,
      y,
      size: 10,
      color: rgb(0, 0, 0),
    });
    y -= 14;

    y = drawWrappedText(
      startup.tags.join(" • "),
      9,
      rgb(80 / 255, 80 / 255, 80 / 255),
      width - margin * 2
    );
    y -= 8;
  }

  // Description section
  page.drawText("ABOUT", {
    x: margin,
    y,
    size: 10,
    color: rgb(0, 0, 0),
  });
  y -= 14;

  y = drawWrappedText(startup.longDescription, fontSize, rgb(0, 0, 0), width - margin * 2);

  // Footer
  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(200 / 255, 200 / 255, 200 / 255),
  });
  y -= 12;

  const now = new Date();
  const timestamp = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  page.drawText(`Generated on ${timestamp} • Startup Sourcing Helper`, {
    x: margin,
    y,
    size: 8,
    color: rgb(120 / 255, 120 / 255, 120 / 255),
  });
}
