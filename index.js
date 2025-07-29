app.post('/warp6', async (req, res) => {
    try {
        console.log('Received request with body:', req.body);
        const { dns, allowedIPs } = req.body;
        
        if (!dns || !allowedIPs) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required parameters: dns and allowedIPs' 
            });
        }

        const config = await generateWarpConfig(dns, allowedIPs);
        const content = Buffer.from(config).toString('base64');
        
        res.json({ 
            success: true, 
            content 
        });
    } catch (error) {
        console.error('Error in /warp6:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate config',
            error: error.message 
        });
    }
});
