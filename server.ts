import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsing middleware
  app.use(express.json());

  // API Route: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Route: Proxy URL fetcher to bypass CORS and auto-convert Google Sheets links
  app.get("/api/fetch-link", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing 'url' query parameter" });
    }

    try {
      let fetchUrl = targetUrl.trim();

      // Step 2: Auto-convert Google Sheets view link to a CSV export link
      // Pattern: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=xxxxx
      // or similar standard paths
      if (fetchUrl.includes("docs.google.com/spreadsheets/")) {
        const matches = fetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (matches && matches[1]) {
          const spreadsheetId = matches[1];
          let gidParam = "";
          const gidMatch = fetchUrl.match(/[#&?]gid=([0-9]+)/);
          if (gidMatch && gidMatch[1]) {
            gidParam = `&gid=${gidMatch[1]}`;
          }
          fetchUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv${gidParam}`;
          console.log(`Auto-converted Google Sheets URL to: ${fetchUrl}`);
        }
      }

      console.log(`Fetching proxy URL: ${fetchUrl}`);
      const response = await fetch(fetchUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch remote URL: ${response.statusText} (${response.status})`);
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream";
      const buffer = await response.arrayBuffer();

      // Send content type and body buffer
      res.setHeader("Content-Type", contentType);
      // Try to pass content disposition if present
      const contentDisp = response.headers.get("content-disposition");
      if (contentDisp) {
        res.setHeader("Content-Disposition", contentDisp);
      }

      res.send(Buffer.from(buffer));
    } catch (error: any) {
      console.error("Error fetching URL:", error);
      res.status(500).json({
        error: "Failed to fetch link",
        details: error.message || String(error),
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server mounted as middleware");
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production assets from /dist");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
