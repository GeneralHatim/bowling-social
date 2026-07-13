require('dotenv').config();
const path = require('path');
const app = require('./app');

if (process.env.NODE_ENV === 'production') {
  const express = require('express');
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;

// Export for Vercel serverless
module.exports = app;

// Listen when run directly
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
