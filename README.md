# Collaborative ReactFlow with Yjs

A real-time collaborative flow diagram editor built with React, ReactFlow, and Yjs.

## Features

- 🚀 **Real-time collaboration** - Multiple users can edit simultaneously
- 🎨 **Custom nodes and edges** - Beautiful, flexible node connections
- 📱 **Responsive panels** - Sidebar, controls, and status indicators
- 🔄 **Undo/Redo** - Collaborative history management
- 👥 **User awareness** - See other users' cursors and presence
- 🔗 **Flexible connections** - Multiple connection points per node

## Getting Started

```bash
npm install
npm start
```

## Collaboration Setup

### Option 1: Using Docker (Recommended)

Run the local signaling server using Docker Compose:

```bash
# Start the signaling server
docker-compose up -d yjs-signaling

# Optional: Start with monitoring dashboard
docker-compose --profile monitor up -d

# View logs
docker-compose logs -f yjs-signaling

# Stop the server
docker-compose down
```

**Monitoring Dashboard**: Visit `http://localhost:8080` to monitor the signaling server.

### Option 2: Manual Setup

Install and run y-websocket manually:

```bash
# Install y-websocket globally
npm install -g y-websocket

# Run local signaling server
HOST=localhost PORT=4444 npx y-websocket
```

### Option 3: Public Servers

The app automatically falls back to public signaling servers:

- `wss://signaling.yjs.dev`
- `wss://demos.yjs.dev`

## Testing Collaboration

1. **Start the signaling server** (using Docker or manual setup)
2. **Open the app** in multiple browser tabs
3. **Drag nodes** from the sidebar
4. **Connect nodes** with edges
5. **Move your mouse** to see cursors
6. **Watch real-time synchronization**

## Architecture

- **Frontend**: React + ReactFlow
- **Collaboration**: Yjs + y-webrtc
- **Signaling Server**: y-websocket (Docker)
- **State Management**: Custom Yjs store
- **Styling**: Inline styles + CSS-in-JS

## Docker Services

### Signaling Server (`yjs-signaling`)

- **Port**: 4444
- **Health Check**: Automatic
- **Restart Policy**: Unless stopped
- **Data Persistence**: Named volume

### Monitor Dashboard (`yjs-monitor`)

- **Port**: 8080
- **Profile**: `monitor` (optional)
- **Features**: Connection testing, uptime monitoring

## Troubleshooting

### Docker Issues:

```bash
# Check if containers are running
docker-compose ps

# View detailed logs
docker-compose logs yjs-signaling

# Restart services
docker-compose restart
```

### "Can't connect to WSS" errors:

- **Start Docker signaling server**: `docker-compose up -d yjs-signaling`
- **Check container status**: `docker-compose ps`
- **Test connection**: Visit `http://localhost:8080` (with monitor profile)
- **Check firewall settings** - Ensure port 4444 is accessible

### Nodes not syncing:

- **Verify signaling server** is running on port 4444
- **Check browser console** for Yjs connection logs
- **Open multiple tabs** and test locally first
- **Restart containers** if needed

### Performance issues:

- **Use local Docker server** for best performance
- **Monitor dashboard** shows connection status
- **Limit concurrent connections** if needed

## Development

### File Structure

```
├── docker-compose.yml          # Docker services
├── Dockerfile.signaling        # Signaling server container
├── monitor/                    # Monitoring dashboard
│   └── index.html
├── src/
│   ├── components/
│   │   ├── CollaborativeFlow.tsx
│   │   ├── CustomNode.tsx
│   │   ├── CustomEdge.tsx
│   │   └── Sidebar.tsx
│   ├── hooks/
│   │   └── useYjsStore.ts      # Yjs collaboration logic
│   └── types/
│       └── awareness.ts        # Type definitions
```

### Environment Variables

- `HOST`: Signaling server host (default: 0.0.0.0)
- `PORT`: Signaling server port (default: 4444)
- `NODE_ENV`: Environment (default: production)

## License

MIT
# react-flow-collaboration
