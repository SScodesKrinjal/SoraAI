import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Validate critical environment variables at startup
    log("Starting server initialization...");
    
    // Check for required environment variables
    const requiredEnvVars = ['DATABASE_URL'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      log(`ERROR: Missing required environment variables: ${missingEnvVars.join(', ')}`);
      log("Server cannot start without DATABASE_URL");
      process.exit(1);
    }
    
    // Warn about optional environment variables
    if (!process.env.GEMINI_API_KEY) {
      log("WARNING: GEMINI_API_KEY not set - using heuristic fallback for video analysis");
    }
    
    if (!process.env.SESSION_SECRET) {
      log("WARNING: SESSION_SECRET not set - sessions may not persist correctly");
    }
    
    if (!process.env.PRIVATE_OBJECT_DIR) {
      log("WARNING: PRIVATE_OBJECT_DIR not set - object storage upload will use fallback");
    }
    
    log("Environment variables validated");

    const server = await registerRoutes(app);
    log("Routes registered successfully");

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      log(`Error handler caught: ${message}`);
      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      log("Setting up Vite for development mode");
      await setupVite(app, server);
    } else {
      log("Setting up static file serving for production mode");
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`✓ Server successfully started`);
      log(`✓ Listening on http://0.0.0.0:${port}`);
      log(`✓ Environment: ${app.get("env") || "production"}`);
    });
  } catch (error) {
    log(`FATAL ERROR during server startup:`);
    log(error instanceof Error ? error.message : String(error));
    log(error instanceof Error ? error.stack || "" : "");
    process.exit(1);
  }
})();
