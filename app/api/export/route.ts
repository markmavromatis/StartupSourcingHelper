import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFPage, rgb } from "pdf-lib";
import { Startup } from "@/app/types";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const startup: Startup = await request.json();

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size in points

    // Generate PDF content
    await generatePDFContent(pdfDoc, page, startup);

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
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

async function generatePDFContent(
  pdfDoc: PDFDocument,
  page: PDFPage,
  startup: Startup
) {
  const { width, height } = page.getSize();
  const margin = 40;
  const lineHeight = 14;
  const fontSize = 9;
  let y = height - margin;

  // Helper function to wrap and draw text
  const drawWrappedText = (
    text: string,
    size: number,
    color = rgb(0, 0, 0),
    maxWidth?: number
  ) => {
    const lines: string[] = [];
    if (maxWidth) {
      // Simple word wrapping
      const words = text.split(" ");
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        // Estimate: roughly 2.4 characters per point at size 9
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
  y = drawWrappedText(startup.shortDescription, 11, rgb(80/255, 80/255, 80/255), width - margin * 2);
  y -= 12;

  // Divider line
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(200/255, 200/255, 200/255),
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
      color: rgb(60/255, 60/255, 60/255),
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

    y = drawWrappedText(startup.tags.join(" • "), 9, rgb(80/255, 80/255, 80/255), width - margin * 2);
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
    color: rgb(200/255, 200/255, 200/255),
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
    color: rgb(120/255, 120/255, 120/255),
  });
}
