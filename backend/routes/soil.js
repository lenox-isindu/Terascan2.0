import express from 'express';

const router = express.Router();

// POST /api/soil/analysis - Save soil analysis (we'll implement this later)
router.post('/analysis', async (req, res) => {
  try {
    const { lat, lng, analysisData } = req.body;
    
    console.log('💾 Soil analysis save request:', { lat, lng });
    
    // For now, just acknowledge receipt
    // We'll integrate Supabase server-side later
    res.json({
      success: true,
      message: 'Soil analysis received (storage coming soon)',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Soil analysis save error:', error);
    res.status(500).json({ error: 'Failed to save soil analysis' });
  }
});

// GET /api/soil/history - Get analysis history (coming soon)
router.get('/history', async (req, res) => {
  res.json({
    message: 'Soil analysis history endpoint - coming soon',
    data: []
  });
});

export default router;