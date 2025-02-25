import React, { useRef, useEffect, useState } from "react";
import Hls from "hls.js";
import { Typography, Chip, Box, Stack, Collapse, Button, Avatar, IconButton } from "@mui/material";
import { motion } from "framer-motion";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";

const VideoPlayer = ({
  streamKey,
  title = "Live Stream Demo",
  tags = ["Live", "Demo", "Streaming", "HLS"],
  description = "To address the issues and improve the video player, I'll provide an updated version of your VideoPlayer component. This version includes fixes for the flickering duration button, ensures the GO LIVE button doesn't pause the video, and adds a more professional and modern design with additional features like tags and a description outside the video component.",
  channelName = "Streamer Channel",
  avatarUrl = "https://via.placeholder.com/50",
}) => {
  const videoRef = useRef(null);
  const [resolution, setResolution] = useState("Loading...");
  const [isBehind, setIsBehind] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState("none");

  useEffect(() => {
    const video = videoRef.current;
    const streamURL = `http://localhost:8000/live/${streamKey}/index.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(streamURL);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => console.error("Playback error:", err));
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level];
        if (level && level.width && level.height) {
          setResolution(`${level.width}x${level.height}`);
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamURL;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch((err) => console.error("Playback error:", err));
        setResolution(`${video.videoWidth}x${video.videoHeight}`);
      });
    }

    const checkLiveStatus = () => {
      if (video.seekable.length > 0) {
        const liveEdge = video.seekable.end(0);
        setIsBehind(video.currentTime < liveEdge - 3);
      }
    };

    video.addEventListener("timeupdate", checkLiveStatus);

    return () => {
      video.removeEventListener("timeupdate", checkLiveStatus);
    };
  }, [streamKey]);

  const togglePlayPause = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <Box maxWidth="800px" margin="0 auto" fontFamily="Arial, sans-serif">
      {/* Video Player */}
      <Box position="relative" borderRadius="10px" overflow="hidden" boxShadow={3}>
        <video
          ref={videoRef}
          controls
          autoPlay
          style={{ width: "100%", display: "block" }}
          onClick={togglePlayPause}
        />
      </Box>

      {/* Channel Info and Actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Box mt={2} display="flex" alignItems="center" gap={2}>
          <Avatar src={avatarUrl} alt={channelName} />
          <Box flexGrow={1}>
            <Typography variant="h6" fontWeight="bold">
              {channelName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>

          {/* Subscribe Button */}
          <Button
            size="small"
            variant={subscribed ? "outlined" : "contained"}
            sx={{
              textTransform: "none",
              fontWeight: "bold",
              px: 2,
              transition: "0.3s",
              bgcolor: subscribed ? "transparent" : "primary.main",
              color: subscribed ? "primary.main" : "white",
              borderColor: "primary.main",
              "&:hover": {
                bgcolor: subscribed ? "transparent" : "primary.dark",
                borderColor: subscribed ? "primary.dark" : "primary.dark",
                color: subscribed ? "primary.dark" : "white",
              },
            }}
            onClick={() => setSubscribed(!subscribed)}
          >
            {subscribed ? "Subscribed" : "Subscribe"}
          </Button>

          {/* Notification Icon (Only if Subscribed) */}
          {subscribed && (
            <IconButton
              onClick={() =>
                setNotificationStatus(
                  notificationStatus === "all"
                    ? "mute"
                    : notificationStatus === "mute"
                    ? "none"
                    : "all"
                )
              }
              sx={{
                transition: "0.3s",
                "&:hover": {
                  bgcolor: "rgba(0, 0, 0, 0.1)",
                },
              }}
            >
              {notificationStatus === "all" ? (
                <NotificationsActiveIcon color="primary" />
              ) : notificationStatus === "mute" ? (
                <NotificationsOffIcon />
              ) : (
                <NotificationsNoneIcon />
              )}
            </IconButton>
          )}
        </Box>

        {/* Description with Collapse */}
        <Box mt={2}>
          <Collapse in={expanded} collapsedSize={50}>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Collapse>
          <Button
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ mt: 1, color: "primary.main", fontWeight: "bold" }}
          >
            {expanded ? "Show Less" : "Show More"}
          </Button>
        </Box>

        {/* Tags */}
        <Stack direction="row" spacing={1} flexWrap="wrap" mt={2}>
          {tags?.map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              variant="outlined"
              size="small"
              sx={{
                mb: 1,
                transition: "0.3s",
                "&:hover": {
                  bgcolor: "primary.main",
                  color: "white",
                },
              }}
            />
          ))}
        </Stack>
      </motion.div>
    </Box>
  );
};

export default VideoPlayer;