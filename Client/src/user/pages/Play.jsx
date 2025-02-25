import { Box, Grid } from "@mui/material";
import React from "react";
import Video from "../Components/Video/Video";
import Comments from "../Components/Comments/Comments";

const Play = () => {
  return (
    <Box sx={{ flexGrow: 1, p: 2, display: "flex", justifyContent: "center" }}>
      <Grid container spacing={2} maxWidth="900px">
        {/* Video Section */}
        <Grid item xs={12}>
          <Video />
        </Grid>

        {/* Comments Section */}
        <Grid item xs={12}>
          <Comments />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Play;
