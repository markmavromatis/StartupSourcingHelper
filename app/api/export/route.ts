import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFTextField } from "pdf-lib";
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

    // Get the form and fill fields
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    // Log available fields for debugging
    console.log("Available PDF fields:", fields.map(f => f.getName()));

    // Fill fields based on common naming conventions
    const fieldMapping: Record<string, string> = {
      companyName: startup.companyName,
      shortDescription: startup.shortDescription,
      longDescription: startup.longDescription,
      hq: startup.hq,
      foundingYear: startup.foundingYear?.toString() || "",
      employees: startup.employees,
      videoUrl: startup.videoUrl,
      addedDate: startup.addedDate,
      tags: startup.tags.join(", "),
      websiteUrl: startup.websiteUrl,
    };

    // Try to fill fields - attempt both exact matches and partial matches
    for (const field of fields) {
      const fieldName = field.getName();
      let filled = false;

      // Try exact match first
      if (fieldMapping[fieldName]) {
        try {
          if (field instanceof PDFTextField) {
            field.setText(fieldMapping[fieldName]);
            filled = true;
          }
        } catch (e) {
          console.warn(`Could not set text for field ${fieldName}:`, e);
        }
      }

      // Try case-insensitive and partial matching
      if (!filled) {
        const lowerFieldName = fieldName.toLowerCase();
        for (const [key, value] of Object.entries(fieldMapping)) {
          if (lowerFieldName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerFieldName)) {
            try {
              if (field instanceof PDFTextField) {
                field.setText(value);
              }
            } catch (e) {
              console.warn(`Could not set text for field ${fieldName}:`, e);
            }
            break;
          }
        }
      }
    }

    // Flatten the form to make fields non-editable
    form.flatten();

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
