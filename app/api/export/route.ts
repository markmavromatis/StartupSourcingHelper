import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import PptxGenJs from "pptxgenjs";
import { Startup } from "@/app/types";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface PptConfig {
  theme: Record<string, string>;
  slides: Array<{
    type: string;
    title?: string;
    subtitle?: string;
    content?: string;
    fields?: Array<{ label: string; value: string }>;
    includeTags?: boolean;
    maxImages?: number;
  }>;
}

function replaceTemplateVars(text: string, startup: Startup): string {
  let result = text;

  // Create a map of all possible field names and their values
  const fieldMappings = [
    { patterns: ["companyName"], value: startup.companyName },
    { patterns: ["shortDescription"], value: startup.shortDescription },
    { patterns: ["longDescription", "description"], value: startup.longDescription },
    { patterns: ["hq"], value: startup.hq || "—" },
    { patterns: ["foundingYear"], value: startup.foundingYear?.toString() || "—" },
    { patterns: ["employees"], value: startup.employees || "—" },
    { patterns: ["addedDate"], value: startup.addedDate },
    { patterns: ["websiteUrl"], value: startup.websiteUrl || "" },
    { patterns: ["videoUrl"], value: startup.videoUrl || "" },
    { patterns: ["tags"], value: startup.tags.join(", ") },
  ];

  // Replace each field
  for (const mapping of fieldMappings) {
    for (const pattern of mapping.patterns) {
      // Match {{ pattern }} with any amount of whitespace
      const regex = new RegExp(`\\{\\{\\s*${pattern}\\s*\\}\\}`, "g");
      result = result.replace(regex, mapping.value);
    }
  }

  return result;
}

async function loadCustomTemplate(
  startup: Startup
): Promise<Buffer | null> {
  const templatePath = join(
    process.cwd(),
    "template",
    "custom_template.pptx"
  );

  if (!existsSync(templatePath)) {
    return null;
  }

  try {
    const templateBytes = readFileSync(templatePath);
    const zip = new JSZip();
    await zip.loadAsync(templateBytes);

    // Get the slide XML files
    const slideFiles = Object.keys(zip.files).filter(
      (f) => f.startsWith("ppt/slides/slide") && f.endsWith(".xml")
    );

    // Process each slide
    for (const slideFile of slideFiles) {
      let slideXml = await zip.files[slideFile].async("string");

      // Merge text nodes to handle split placeholders
      // Step 1: Remove XML tags between </a:t> and <a:t>
      slideXml = slideXml.replace(/<\/a:t>(?:\s|<[^>]+>)*<a:t>/g, "");

      // Step 2: Handle runs that only contain formatting - merge them too
      slideXml = slideXml.replace(/<\/a:r>\s*<a:r>\s*<a:rPr[^>]*\/>\s*<a:t>/g, "<a:t>");

      // Step 3: Remove empty runs
      slideXml = slideXml.replace(/<a:r>\s*<a:rPr[^>]*\/>\s*<\/a:r>/g, "");

      // Log what we're working with
      if (slideXml.includes("companyName")) {
        console.log("Processing slide with companyName placeholder");
      }

      // Replace text placeholders
      let updatedXml = replaceTemplateVars(slideXml, startup);

      zip.file(slideFile, updatedXml);
    }

    // Handle images - fetch and add them
    const images = startup.imageUrls.filter(Boolean).slice(0, 3);
    let imageCounter = 1;

    for (const imageUrl of images) {
      try {
        const imgResponse = await fetch(imageUrl);
        if (imgResponse.ok) {
          const arrayBuffer = await imgResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const ext = imageUrl.split(".").pop()?.toLowerCase() || "png";

          // Add image to media folder
          const mediaPath = `ppt/media/image${imageCounter}.${ext}`;
          zip.file(mediaPath, buffer);

          imageCounter++;
        }
      } catch (e) {
        console.warn(`Could not fetch image from ${imageUrl}:`, e);
      }
    }

    // Update [Content_Types].xml to include media types
    try {
      let contentTypesXml = await zip.files["[Content_Types].xml"].async(
        "string"
      );

      // Add PNG and JPG if not present
      if (!contentTypesXml.includes('Extension="png"')) {
        contentTypesXml = contentTypesXml.replace(
          "</Types>",
          '  <Default Extension="png" ContentType="image/png"/>\n</Types>'
        );
      }
      if (!contentTypesXml.includes('Extension="jpg"')) {
        contentTypesXml = contentTypesXml.replace(
          "</Types>",
          '  <Default Extension="jpg" ContentType="image/jpeg"/>\n</Types>'
        );
      }

      zip.file("[Content_Types].xml", contentTypesXml);
    } catch (e) {
      console.warn("Could not update [Content_Types].xml:", e);
    }

    // Generate the modified PPTX
    const modifiedPptx = await zip.generateAsync({ type: "arraybuffer" });
    return Buffer.from(modifiedPptx);
  } catch (error) {
    console.error("Error loading custom template:", error);
    return null;
  }
}

function addTitleBar(
  slide: any,
  pres: PptxGenJs,
  title: string,
  theme: Record<string, string>
) {
  slide.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: "100%",
    h: 0.8,
    fill: { color: theme.primary },
  });
  slide.addText(title, {
    x: 0.5,
    y: 0.15,
    w: 8.5,
    h: 0.5,
    fontSize: 32,
    bold: true,
    color: theme.white,
    align: "left",
  });
}

async function createPresentation(
  startup: Startup,
  config: PptConfig
): Promise<Buffer> {
  const pres = new PptxGenJs();
  const theme = config.theme;

  for (const slideDef of config.slides) {
    const slide = pres.addSlide();

    if (slideDef.type === "title") {
      addTitleBar(slide, pres, replaceTemplateVars(slideDef.title || "", startup), theme);
      slide.addText(replaceTemplateVars(slideDef.subtitle || "", startup), {
        x: 0.5,
        y: 1.2,
        w: 9,
        h: 1,
        fontSize: 18,
        color: theme.secondary,
        align: "left",
      });

      slide.addShape(pres.ShapeType.rect, {
        x: 0.5,
        y: 2.5,
        w: 9,
        h: 4,
        fill: { color: theme.light },
        line: { color: theme.primary, width: 2 },
      });
      slide.addText("Startup Metadata", {
        x: 0.5,
        y: 3.5,
        w: 9,
        h: 2,
        fontSize: 24,
        bold: true,
        color: theme.primary,
        align: "center",
        valign: "middle",
      });
    } else if (slideDef.type === "details") {
      addTitleBar(slide, pres, replaceTemplateVars(slideDef.title || "", startup), theme);

      let yPos = 1.2;
      if (slideDef.fields) {
        for (const field of slideDef.fields) {
          const value = replaceTemplateVars(field.value, startup);
          slide.addText(field.label, {
            x: 0.5,
            y: yPos,
            w: 2,
            h: 0.4,
            fontSize: 12,
            bold: true,
            color: theme.primary,
          });
          slide.addText(value, {
            x: 2.7,
            y: yPos,
            w: 6.3,
            h: 0.4,
            fontSize: 12,
            color: theme.darkText,
          });
          yPos += 0.6;
        }
      }

      if (slideDef.includeTags && startup.tags.length > 0) {
        slide.addText("Tags:", {
          x: 0.5,
          y: yPos,
          w: 2,
          h: 0.4,
          fontSize: 12,
          bold: true,
          color: theme.primary,
        });
        const tags = startup.tags.join(", ");
        slide.addText(tags, {
          x: 2.7,
          y: yPos,
          w: 6.3,
          h: 1,
          fontSize: 11,
          color: theme.darkText,
          wrap: true,
        });
      }
    } else if (slideDef.type === "description") {
      addTitleBar(slide, pres, replaceTemplateVars(slideDef.title || "", startup), theme);
      slide.addText(replaceTemplateVars(slideDef.content || "", startup), {
        x: 0.5,
        y: 1.2,
        w: 9,
        h: 5,
        fontSize: 12,
        color: theme.darkText,
        wrap: true,
        valign: "top",
      });
    } else if (slideDef.type === "images") {
      addTitleBar(slide, pres, replaceTemplateVars(slideDef.title || "", startup), theme);

      const maxImages = slideDef.maxImages || 3;
      const images = startup.imageUrls.filter(Boolean).slice(0, maxImages);

      if (images.length > 0) {
        const imageWidth = 2.5;
        const spacing = 0.3;
        const startX =
          (9.5 - images.length * imageWidth - (images.length - 1) * spacing) /
          2;

        for (let i = 0; i < images.length; i++) {
          try {
            const imgResponse = await fetch(images[i]);
            if (imgResponse.ok) {
              const arrayBuffer = await imgResponse.arrayBuffer();
              const base64 = Buffer.from(arrayBuffer).toString("base64");
              const ext = images[i]
                .split(".")
                .pop()
                ?.toLowerCase() || "png";
              const dataUrl = `data:image/${ext};base64,${base64}`;

              const xPos = startX + i * (imageWidth + spacing);
              slide.addImage({
                data: dataUrl,
                x: xPos,
                y: 1.2,
                w: imageWidth,
                h: 3.5,
              });

              const urlText =
                images[i].substring(0, 35) +
                (images[i].length > 35 ? "..." : "");
              slide.addText(urlText, {
                x: xPos,
                y: 4.8,
                w: imageWidth,
                h: 0.8,
                fontSize: 9,
                color: theme.primary,
                align: "center",
                wrap: true,
              });
            }
          } catch (e) {
            console.warn(`Could not fetch image ${i}:`, e);
          }
        }
      }
    } else if (slideDef.type === "additional") {
      addTitleBar(slide, pres, replaceTemplateVars(slideDef.title || "", startup), theme);

      let yPos = 1.2;
      if (slideDef.fields) {
        for (const field of slideDef.fields) {
          const value = replaceTemplateVars(field.value, startup);
          if (value) {
            slide.addText(field.label, {
              x: 0.5,
              y: yPos,
              w: 2,
              h: 0.4,
              fontSize: 12,
              bold: true,
              color: theme.primary,
            });
            slide.addText(value, {
              x: 2.7,
              y: yPos,
              w: 6.3,
              h: 0.4,
              fontSize: 11,
              color: theme.primary,
              underline: true,
            });
            yPos += 0.7;
          }
        }
      }
    }
  }

  const pptxBuffer = await pres.write({ outputType: "arraybuffer" });
  return Buffer.from(pptxBuffer);
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const startup: Startup = await request.json();

    // Try custom template first
    const customPptx = await loadCustomTemplate(startup);
    if (customPptx) {
      const filename = `${startup.companyName.replace(/\s+/g, "_")}_Profile.pptx`;
      const headers = new Headers({
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
      });

      return new NextResponse(customPptx, {
        headers,
        status: 200,
      });
    }

    // Fall back to programmatic generation with config
    const configPath = join(process.cwd(), "template", "ppt-config.json");
    const configData = readFileSync(configPath, "utf-8");
    const config: PptConfig = JSON.parse(configData);

    const pptxBuffer = await createPresentation(startup, config);

    const filename = `${startup.companyName.replace(/\s+/g, "_")}_metadata.pptx`;
    const headers = new Headers({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });

    return new NextResponse(pptxBuffer, {
      headers,
      status: 200,
    });
  } catch (error) {
    console.error("PPT generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PowerPoint",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
