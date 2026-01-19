/**
 * FinanceFlow Backend - Server Entry Point
 */

require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║   🚀 FinanceFlow Backend Server                           ║');
    console.log('║                                                           ║');
    console.log(`║   Server running at: http://localhost:${PORT}               ║`);
    console.log(`║   Environment: ${process.env.NODE_ENV || 'development'}                           ║`);
    console.log('║                                                           ║');
    console.log('║   API Endpoints:                                          ║');
    console.log('║   • GET  /api/health        - Health check                ║');
    console.log('║   • GET  /api/clients       - List all clients            ║');
    console.log('║   • GET  /api/entries       - List finance entries        ║');
    console.log('║   • GET  /api/invoices      - List all invoices           ║');
    console.log('║   • GET  /api/settings      - Get all settings            ║');
    console.log('║   • GET  /api/analytics/*   - Analytics data              ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
});
