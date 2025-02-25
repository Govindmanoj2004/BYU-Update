import React from 'react';
import { Box, Typography, Avatar, TextField, Button } from '@mui/material';
import { motion } from 'framer-motion';

const comments = [
  {
    id: 1,
    author: 'John Doe',
    avatar: 'https://i.pravatar.cc/150?img=1',
    text: 'This is a great video!',
    timestamp: '2 hours ago',
  },
  {
    id: 2,
    author: 'Jane Smith',
    avatar: 'https://i.pravatar.cc/150?img=2',
    text: 'I learned a lot from this. Thanks!',
    timestamp: '3 hours ago',
  },
  {
    id: 3,
    author: 'Alice Johnson',
    avatar: 'https://i.pravatar.cc/150?img=3',
    text: 'Can you make a tutorial on this topic?',
    timestamp: '1 day ago',
  },
];

const Comment = ({ author, avatar, text, timestamp }) => (
  <Box display="flex" alignItems="flex-start" mb={2}>
    <Avatar alt={author} src={avatar} />
    <Box ml={2}>
      <Typography variant="subtitle2" fontWeight="bold">
        {author}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {text}
      </Typography>
      <Typography variant="caption" color="textSecondary">
        {timestamp}
      </Typography>
    </Box>
  </Box>
);

const Comments = () => {
  const [newComment, setNewComment] = React.useState('');

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      // Handle comment submission (e.g., send to backend)
      console.log('New Comment:', newComment);
      setNewComment('');
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{marginBottom:'20px'}}>
        Comments
      </Typography>
      <Box mb={3}>
        {comments.map((comment) => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Comment {...comment} />
          </motion.div>
        ))}
      </Box>
      <Box component="form" onSubmit={handleCommentSubmit}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          multiline
          rows={2}
        />
        <Box mt={1} display="flex" justifyContent="flex-end">
          <Button type="submit" variant="contained" color="primary">
            Comment
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Comments;