# LinkLens InfoSec Portal

## Quick Start

### Prerequisites
- Node.js (v14+)
- npm (v6+)
- Java 11+ (for ZAP)
- OWASP ZAP installed at ~/zap/ZAP_2.15.0/

### Starting the Application

1. **Make scripts executable** (first time only):
   ```bash
   chmod +x start-all.sh stop-all.sh
   ```

2. **Start all services**:
   ```bash
   ./start-all.sh
   ```
   This will start:
   - ZAP on port 8080
   - Backend on port 5001
   - Frontend on port 3000

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001
   - ZAP API: http://localhost:8080

4. **Stop all services** when done:
   ```bash
   ./stop-all.sh
   ```

## Troubleshooting

### Common Issues

#### Port Conflicts
If you get `EADDRINUSE` errors, check which ports are in use:
```bash
lsof -i :3000 -i :5001 -i :8080
```

#### ZAP Not Starting
Check the ZAP logs:
```bash
tail -f zap.log
```

#### Frontend Not Connecting to Backend
1. Verify the backend is running:
   ```bash
   curl http://localhost:5001/api/zap/health
   ```
   Should return: `{"ok":true,"version":"2.15.0",...}`

2. Check the frontend proxy in `client/package.json`:
   ```json
   {
     "proxy": "http://localhost:5001"
   }
   ```

## Development

### Directory Structure
```
infosec-portal/
├── client/           # React frontend
├── server/           # Node.js backend
├── start-all.sh      # Start all services
├── stop-all.sh       # Stop all services
├── backend.log      # Backend logs
├── frontend.log     # Frontend logs
└── zap.log          # ZAP logs
```

### Environment Variables

#### Backend
- `PORT=5001` - Backend server port
- `ZAP_API_URL=http://localhost:8080` - ZAP API URL
- `ZAP_API_KEY=` - ZAP API key (empty for no key)

### Logs
View logs in real-time:
```bash
# Backend logs
tail -f backend.log

# Frontend logs
tail -f frontend.log

# ZAP logs
tail -f zap.log
```

## Reset Everything

1. Stop all services:
   ```bash
   ./stop-all.sh
   ```

2. Clear logs:
   ```bash
   rm -f *.log
   ```

3. Start fresh:
   ```bash
   ./start-all.sh
   ```

## Support
For issues, please check the logs and verify all services are running on their respective ports.
