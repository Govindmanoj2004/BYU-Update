const NodeMediaServer = require("node-media-server");
const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs").promises;
const path = require("path");
const { createServer } = require("http");
const winston = require("winston");
const cors = require("cors");

require("dotenv").config();

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "server.log" }),
    new winston.transports.Console(),
  ],
});

const app = express();
const port = process.env.PORT || 3000;
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

const config = {
  rtmp: {
    port: process.env.RTMP_PORT || 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },
  http: {
    port: process.env.HTTP_PORT || 8000,
    allow_origin: process.env.CORS_ORIGIN || "*",
    mediaroot: path.join(__dirname, "media"),
  },
  trans: {
    ffmpeg: process.env.FFMPEG_PATH || "ffmpeg",
    tasks: [
      {
        app: "live",
        ac: process.env.AUDIO_CODEC || "aac",
        vc: process.env.VIDEO_CODEC || "libx264",
        hls: true,
        hlsFlags:
          process.env.HLS_FLAGS ||
          "[hls_time=2:hls_list_size=4:hls_flags=delete_segments]",
      },
    ],
  },
  recording: {
    directory: process.env.RECORD_DIR || path.join(__dirname, "hls_recordings"),
    maxAge: process.env.RECORD_MAX_AGE || 24 * 60 * 60 * 1000,
  },
};

const RECORD_DIR = config.recording.directory;
(async () => {
  try {
    await fs.mkdir(RECORD_DIR, { recursive: true });
  } catch (err) {
    logger.error("Failed to create recording directory:", err);
  }
})();

const nms = new NodeMediaServer(config);
const streamStatus = {};
const activeRecordings = {};

nms.on("prePublish", (id, StreamPath) => {
  const streamKey = StreamPath.split("/").pop();
  streamStatus[streamKey] = "live";
  logger.info(`Stream started: ${streamKey}`);
});

nms.on("donePublish", (id, StreamPath) => {
  const streamKey = StreamPath.split("/").pop();
  streamStatus[streamKey] = "offline";
  logger.info(`Stream ended: ${streamKey}`);
});

nms.run();

const startRecording = async (streamKey) => {
  if (!streamKey || typeof streamKey !== "string") {
    throw new Error("Invalid stream key");
  }

  const sanitizedKey = streamKey.replace(/[^a-zA-Z0-9_-]/g, "");
  const streamPath = path.join(RECORD_DIR, sanitizedKey);
  await fs.mkdir(streamPath, { recursive: true });
  const filePath = path.join(streamPath, "index.m3u8");

  return new Promise((resolve, reject) => {
    const checkStream = spawn("ffprobe", [
      `rtmp://localhost:${config.rtmp.port}/live/${sanitizedKey}`,
    ]);

    checkStream.on("error", () =>
      reject(new Error("Stream verification failed"))
    );
    checkStream.on("close", (code) => {
      if (code !== 0) {
        reject(new Error("Stream not available"));
        return;
      }

      const ffmpeg = spawn(config.trans.ffmpeg, [
        "-i",
        `rtmp://localhost:${config.rtmp.port}/live/${sanitizedKey}`,
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-f",
        "hls",
        "-hls_time",
        "2",
        "-hls_list_size",
        "4",
        "-hls_flags",
        "delete_segments",
        filePath,
      ]);

      activeRecordings[sanitizedKey] = ffmpeg;

      ffmpeg.stderr.on("data", (data) => {
        logger.error(`FFmpeg error for ${sanitizedKey}: ${data}`);
      });

      ffmpeg.on("error", (err) => {
        logger.error(`FFmpeg process error for ${sanitizedKey}: ${err}`);
      });

      ffmpeg.on("close", (code) => {
        logger.info(
          `FFmpeg process for ${sanitizedKey} exited with code ${code}`
        );
        delete activeRecordings[sanitizedKey];
      });

      resolve(filePath);
    });
  });
};

const cleanupOldSegments = async () => {
  try {
    const dirs = await fs.readdir(RECORD_DIR);
    for (const dir of dirs) {
      const dirPath = path.join(RECORD_DIR, dir);
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        if (file.endsWith(".ts")) {
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);
          const age = Date.now() - stats.mtimeMs;
          if (age > config.recording.maxAge) {
            await fs.unlink(filePath);
            logger.info(`Cleaned up old segment: ${filePath}`);
          }
        }
      }
    }
  } catch (err) {
    logger.error("Cleanup error:", err);
  }
};
setInterval(cleanupOldSegments, 60 * 60 * 1000);

app.post("/api/start-recording", async (req, res) => {
  const { streamKey } = req.body;
  try {
    if (!streamKey) throw new Error("Stream key is required");
    if (activeRecordings[streamKey]) {
      return res.json({ message: "Recording already in progress" });
    }
    logger.info(`Starting recording for stream: ${streamKey}`);
    const filePath = await startRecording(streamKey);
    res.json({ message: "Recording started", filePath });
  } catch (error) {
    logger.error(`Start recording error: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/stop-recording", (req, res) => {
  const { streamKey } = req.body;
  const sanitizedKey = streamKey?.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!sanitizedKey || !activeRecordings[sanitizedKey]) {
    return res.status(400).json({ error: "Invalid stream key or not recording" });
  }
  activeRecordings[sanitizedKey].kill("SIGINT");
  logger.info(`Stopped recording for stream: ${sanitizedKey}`);
  res.json({ message: "Recording stopped" });
});

app.get("/api/videos", async (req, res) => {
  try {
    const files = await fs.readdir(RECORD_DIR);
    res.json({ videos: files });
  } catch (err) {
    logger.error("Failed to retrieve videos:", err);
    res.status(500).json({ error: "Failed to retrieve videos" });
  }
});

app.get("/api/stream-status/:streamKey", (req, res) => {
  const { streamKey } = req.params;
  const sanitizedKey = streamKey.replace(/[^a-zA-Z0-9_-]/g, "");
  res.json({ status: streamStatus[sanitizedKey] || "offline" });
});

app.use("/recordings", express.static(RECORD_DIR));

const httpServer = createServer(app);
httpServer.listen(port, () => {
  logger.info(`API server running at http://localhost:${port}`);
});

process.on("SIGINT", () => {
  logger.info("Shutting down server...");
  Object.keys(activeRecordings).forEach((streamKey) => {
    activeRecordings[streamKey].kill("SIGINT");
  });
  httpServer.close(() => {
    logger.info("Server shut down.");
    process.exit(0);
  });
});