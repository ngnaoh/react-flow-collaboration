#!/usr/bin/env node

import { WebSocketServer } from "ws";
import http from "http";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as map from "lib0/map";

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;
const wsReadyStateClosing = 2;
const wsReadyStateClosed = 3;

const pingTimeout = 30000;
const port = process.env.PORT || 4444;

// Store documents and connections
const docs = new Map();
const wsConnections = new Map(); // WebSocket connections for Yjs sync
const webrtcTopics = new Map(); // WebRTC signaling topics

// Statistics
let totalConnections = 0;
let totalMessages = 0;
let yjsUpdates = 0;
let webrtcMessages = 0;

/**
 * Get or create a Yjs document for a room
 * @param {string} docname
 * @returns {Y.Doc}
 */
const getYDoc = (docname) => {
  if (!docs.has(docname)) {
    const doc = new Y.Doc();
    doc.gc = false; // Disable garbage collection for persistence
    docs.set(docname, doc);

    // Log document changes
    doc.on("update", (update, origin) => {
      const timestamp = new Date().toISOString();
      console.log(`📝 [${timestamp}] Yjs UPDATE in "${docname}"`);
      console.log(`   📏 Update size: ${update.length} bytes`);
      console.log(`   🔄 Origin: ${origin || "unknown"}`);

      // Log document content
      const docData = getDocumentData(doc);
      const dataKeys = Object.keys(docData);
      if (dataKeys.length > 0) {
        console.log(`   🗂️  Document contains: ${dataKeys.join(", ")}`);
        dataKeys.forEach((key) => {
          if (docData[key] && typeof docData[key] === "object") {
            const itemCount = Array.isArray(docData[key])
              ? docData[key].length
              : Object.keys(docData[key]).length;
            console.log(`     - ${key}: ${itemCount} items`);
          }
        });
      }
      console.log("");
      yjsUpdates++;
    });

    console.log(`📄 Created new Yjs document: "${docname}"`);
  }
  return docs.get(docname);
};

/**
 * Get document data as JSON
 * @param {Y.Doc} doc
 * @returns {object}
 */
const getDocumentData = (doc) => {
  const data = {};

  doc.share.forEach((sharedType, key) => {
    if (sharedType instanceof Y.Map) {
      data[key] = {};
      sharedType.forEach((value, mapKey) => {
        data[key][mapKey] = value;
      });
    } else if (sharedType instanceof Y.Array) {
      data[key] = sharedType.toArray();
    } else if (sharedType instanceof Y.Text) {
      data[key] = sharedType.toString();
    } else {
      data[key] = sharedType.toJSON ? sharedType.toJSON() : sharedType;
    }
  });

  return data;
};

/**
 * Handle WebRTC signaling messages
 * @param {object} data
 * @param {string} topic
 * @param {number} receiverCount
 */
const handleWebRTCSignaling = (data, topic, receiverCount) => {
  if (!data || typeof data !== "object") {
    return false;
  }

  const timestamp = new Date().toISOString();

  if (data.type === "announce") {
    console.log(`📢 [${timestamp}] WebRTC ANNOUNCE in "${topic}"`);
    console.log(`   👤 Peer: ${data.from}`);
    console.log(`   🔄 Forwarded to ${receiverCount - 1} peers`);
    webrtcMessages++;

    // Create a document for this room to track potential data
    getYDoc(topic);
    return true;
  }

  if (data.type === "signal" && data.signal) {
    const signalType = data.signal.type;
    console.log(
      `🔗 [${timestamp}] WebRTC SIGNAL (${signalType.toUpperCase()}) in "${topic}"`
    );
    console.log(`   📤 From: ${data.from}`);
    console.log(`   📥 To: ${data.to}`);

    if (signalType === "offer") {
      console.log(`   🤝 Initiating WebRTC connection...`);
    } else if (signalType === "answer") {
      console.log(`   ✅ WebRTC connection being established...`);
    } else if (signalType === "candidate") {
      console.log(`   🧭 ICE candidate exchange (NAT traversal)`);
    }
    console.log(`   🔄 Forwarded to ${receiverCount - 1} peers`);
    webrtcMessages++;
    return true;
  }

  return false;
};

/**
 * Setup WebSocket connection for Yjs synchronization (optional monitoring)
 * @param {WebSocket} conn
 * @param {http.IncomingMessage} req
 */
const setupWSConnection = (conn, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const docname = url.pathname.slice(1).split("?")[0] || "default";

  conn.binaryType = "arraybuffer";

  // Get the document
  const doc = getYDoc(docname);
  const awareness = new awarenessProtocol.Awareness(doc);

  // Connection info
  totalConnections++;
  const connectionId = `ws_${totalConnections}`;
  const timestamp = new Date().toISOString();

  console.log(
    `🔌 [${timestamp}] NEW WEBSOCKET CONNECTION: ${connectionId} -> "${docname}"`
  );

  // Store connection info
  wsConnections.set(conn, { doc, awareness, docname, connectionId });

  // Send initial document state
  const state = Y.encodeStateAsUpdate(doc);
  if (state.length > 0) {
    conn.send(state);
  }

  // Handle incoming messages
  conn.on("message", (message) => {
    totalMessages++;
    const timestamp = new Date().toISOString();

    try {
      if (message instanceof ArrayBuffer || message instanceof Buffer) {
        // Raw Yjs update
        const update = new Uint8Array(message);
        console.log(`📝 [${timestamp}] RAW YJS UPDATE from ${connectionId}`);
        console.log(`   📏 Update size: ${update.length} bytes`);

        // Apply update to document
        Y.applyUpdate(doc, update);

        // Broadcast to other WebSocket connections
        wsConnections.forEach((otherConn, otherWs) => {
          if (
            otherConn.docname === docname &&
            otherWs !== conn &&
            otherWs.readyState === wsReadyStateOpen
          ) {
            otherWs.send(update);
          }
        });

        return;
      }

      // Try to parse as Yjs protocol message
      const decoder = decoding.createDecoder(new Uint8Array(message));
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case 0: // messageSync
          console.log(`🔄 [${timestamp}] SYNC MESSAGE from ${connectionId}`);
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, 0);
          syncProtocol.readSyncMessage(decoder, encoder, doc, null);
          if (encoding.length(encoder) > 1) {
            conn.send(encoding.toUint8Array(encoder));
          }
          break;

        case 1: // messageAwareness
          console.log(
            `👤 [${timestamp}] AWARENESS UPDATE from ${connectionId}`
          );
          awarenessProtocol.applyAwarenessUpdate(
            awareness,
            decoding.readVarUint8Array(decoder),
            conn
          );
          break;

        default:
          console.log(
            `❓ [${timestamp}] Unknown message type: ${messageType} from ${connectionId}`
          );
      }
    } catch (err) {
      console.error(
        `❌ [${timestamp}] Error processing message from ${connectionId}:`,
        err
      );
    }
  });

  // Handle connection close
  conn.on("close", () => {
    const timestamp = new Date().toISOString();
    console.log(
      `🔴 [${timestamp}] WEBSOCKET DISCONNECTED: ${connectionId} from "${docname}"`
    );

    awareness.destroy();
    wsConnections.delete(conn);
  });

  // Handle errors
  conn.on("error", (error) => {
    const timestamp = new Date().toISOString();
    console.error(
      `❌ [${timestamp}] WebSocket error for ${connectionId}:`,
      error
    );
  });

  // Broadcast updates to other WebSocket connections
  const broadcastUpdates = (update, origin) => {
    if (origin === conn) return; // Don't send back to sender

    wsConnections.forEach((otherConn, otherWs) => {
      if (
        otherConn.docname === docname &&
        otherWs !== conn &&
        otherWs.readyState === wsReadyStateOpen
      ) {
        otherWs.send(update);
      }
    });
  };

  const broadcastAwareness = (changedClients, origin) => {
    if (origin === conn) return; // Don't send back to sender

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 1); // messageAwareness
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
    );
    const message = encoding.toUint8Array(encoder);

    wsConnections.forEach((otherConn, otherWs) => {
      if (
        otherConn.docname === docname &&
        otherWs !== conn &&
        otherWs.readyState === wsReadyStateOpen
      ) {
        otherWs.send(message);
      }
    });
  };

  // Listen for document updates
  doc.on("update", broadcastUpdates);
  awareness.on("update", broadcastAwareness);

  // Ping/pong for connection health
  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      conn.close();
      clearInterval(pingInterval);
    } else {
      pongReceived = false;
      conn.ping();
    }
  }, pingTimeout);

  conn.on("pong", () => {
    pongReceived = true;
  });
};

/**
 * Handle WebRTC signaling connections
 * @param {WebSocket} conn
 */
const setupWebRTCSignaling = (conn) => {
  totalConnections++;
  const connectionId = `webrtc_${totalConnections}`;
  const timestamp = new Date().toISOString();

  console.log(
    `📡 [${timestamp}] NEW WEBRTC SIGNALING CONNECTION: ${connectionId}`
  );

  const subscribedTopics = new Set();
  let closed = false;

  // Ping/pong for connection health
  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      conn.close();
      clearInterval(pingInterval);
    } else {
      pongReceived = false;
      try {
        conn.ping();
      } catch (e) {
        conn.close();
      }
    }
  }, pingTimeout);

  conn.on("pong", () => {
    pongReceived = true;
  });

  conn.on("close", () => {
    const timestamp = new Date().toISOString();
    console.log(
      `🔴 [${timestamp}] WEBRTC SIGNALING DISCONNECTED: ${connectionId}`
    );

    subscribedTopics.forEach((topicName) => {
      const subs = webrtcTopics.get(topicName) || new Set();
      subs.delete(conn);
      if (subs.size === 0) {
        webrtcTopics.delete(topicName);
        console.log(
          `🗑️  [${timestamp}] WebRTC topic "${topicName}" removed (no subscribers)`
        );
      }
    });
    subscribedTopics.clear();
    closed = true;
  });

  conn.on("message", (message) => {
    if (typeof message === "string" || message instanceof Buffer) {
      message = JSON.parse(message);
    }

    if (message && message.type && !closed) {
      const timestamp = new Date().toISOString();

      switch (message.type) {
        case "subscribe":
          (message.topics || []).forEach((topicName) => {
            if (typeof topicName === "string") {
              const topic = map.setIfUndefined(
                webrtcTopics,
                topicName,
                () => new Set()
              );
              topic.add(conn);
              subscribedTopics.add(topicName);

              console.log(
                `📝 [${timestamp}] WEBRTC SUBSCRIBE: ${connectionId} -> "${topicName}"`
              );
              console.log(`   👥 Topic now has ${topic.size} subscribers`);
            }
          });
          break;

        case "unsubscribe":
          (message.topics || []).forEach((topicName) => {
            const subs = webrtcTopics.get(topicName);
            if (subs) {
              subs.delete(conn);
              console.log(
                `📝 [${timestamp}] WEBRTC UNSUBSCRIBE: ${connectionId} -> "${topicName}"`
              );
              console.log(`   👥 Topic now has ${subs.size} subscribers`);
            }
          });
          break;

        case "publish":
          if (message.topic) {
            const receivers = webrtcTopics.get(message.topic);
            if (receivers) {
              const isWebRTCSignaling = handleWebRTCSignaling(
                message.data,
                message.topic,
                receivers.size
              );

              // Forward message to all subscribers
              message.clients = receivers.size;
              receivers.forEach((receiver) => {
                if (!isWebRTCSignaling || receiver !== conn) {
                  try {
                    receiver.send(JSON.stringify(message));
                  } catch (e) {
                    receiver.close();
                  }
                }
              });
            }
          }
          break;

        case "ping":
          try {
            conn.send(JSON.stringify({ type: "pong" }));
          } catch (e) {
            conn.close();
          }
          break;
      }
    }
  });
};

// HTTP server for API endpoints
const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  // Set CORS headers
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.writeHead(200);
    response.end();
    return;
  }

  if (url.pathname === "/stats") {
    response.writeHead(200, { "Content-Type": "application/json" });
    const wsConnCount = wsConnections.size;
    const webrtcConnCount = Array.from(webrtcTopics.values()).reduce(
      (sum, set) => sum + set.size,
      0
    );

    response.end(
      JSON.stringify(
        {
          activeConnections: {
            websocket: wsConnCount,
            webrtc: webrtcConnCount,
            total: wsConnCount + webrtcConnCount,
          },
          totalConnections,
          activeDocuments: docs.size,
          totalMessages,
          yjsUpdates,
          webrtcMessages,
          documents: Array.from(docs.keys()),
          webrtcTopics: Array.from(webrtcTopics.keys()),
          connectionsPerDoc: Array.from(docs.keys()).map((docname) => ({
            docname,
            websocketConnections: Array.from(wsConnections.values()).filter(
              (c) => c.docname === docname
            ).length,
            webrtcConnections: webrtcTopics.get(docname)?.size || 0,
          })),
        },
        null,
        2
      )
    );
    return;
  }

  if (url.pathname === "/ydocs") {
    response.writeHead(200, { "Content-Type": "application/json" });
    const docsData = {};

    docs.forEach((doc, docname) => {
      docsData[docname] = {
        websocketConnections: Array.from(wsConnections.values()).filter(
          (c) => c.docname === docname
        ).length,
        webrtcConnections: webrtcTopics.get(docname)?.size || 0,
        data: getDocumentData(doc),
        lastModified: new Date().toISOString(),
      };
    });

    response.end(JSON.stringify(docsData, null, 2));
    return;
  }

  if (url.pathname.startsWith("/ydoc/")) {
    const docname = decodeURIComponent(url.pathname.slice(6));
    response.writeHead(200, { "Content-Type": "application/json" });

    if (docs.has(docname)) {
      const doc = docs.get(docname);
      const docData = {
        docname,
        websocketConnections: Array.from(wsConnections.values()).filter(
          (c) => c.docname === docname
        ).length,
        webrtcConnections: webrtcTopics.get(docname)?.size || 0,
        data: getDocumentData(doc),
        lastModified: new Date().toISOString(),
      };
      response.end(JSON.stringify(docData, null, 2));
    } else {
      response.end(
        JSON.stringify(
          {
            error: `Document "${docname}" not found`,
            availableDocuments: Array.from(docs.keys()),
          },
          null,
          2
        )
      );
    }
    return;
  }

  if (url.pathname.startsWith("/ydoc-binary/")) {
    const docname = decodeURIComponent(url.pathname.slice(13));

    if (docs.has(docname)) {
      const doc = docs.get(docname);
      const state = Y.encodeStateAsUpdate(doc);

      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${docname}-state.yjs"`,
      });
      response.end(Buffer.from(state));
    } else {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end(`Document "${docname}" not found`);
    }
    return;
  }

  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end(`Hybrid Yjs Server Ready

🔗 WebRTC Signaling: ws://localhost:${port} (for your existing setup)
🔌 WebSocket Sync: ws://localhost:${port}/[room-name] (optional monitoring)

HTTP endpoints:
  /stats - Server statistics
  /ydocs - All documents data
  /ydoc/[room-name] - Specific document data
  /ydoc-binary/[room-name] - Binary document state

Your WebRTC setup will work as before, but now the server can also track data!
`);
});

// WebSocket server
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  const handleAuth = (ws) => {
    // If URL has a path (like /room-name), it's WebSocket sync
    // If no path or just /, it's WebRTC signaling
    if (url.pathname && url.pathname !== "/") {
      setupWSConnection(ws, request);
    } else {
      setupWebRTCSignaling(ws);
    }
  };

  wss.handleUpgrade(request, socket, head, handleAuth);
});

server.listen(port, () => {
  console.log("🚀 Hybrid Yjs Server Started");
  console.log(`📡 Port: ${port}`);
  console.log(`🔗 WebRTC Signaling: ws://localhost:${port}`);
  console.log(`🔌 WebSocket Sync: ws://localhost:${port}/[room-name]`);
  console.log(`🌐 HTTP API: http://localhost:${port}/stats`);
  console.log(`📋 Ready for both WebRTC and WebSocket collaboration!\n`);
});

// Log server stats every 30 seconds
setInterval(() => {
  const wsConnCount = wsConnections.size;
  const webrtcConnCount = Array.from(webrtcTopics.values()).reduce(
    (sum, set) => sum + set.size,
    0
  );

  if (wsConnCount > 0 || webrtcConnCount > 0 || docs.size > 0) {
    console.log(`📊 [${new Date().toISOString()}] SERVER STATS:`);
    console.log(`   🔌 WebSocket connections: ${wsConnCount}`);
    console.log(`   🔗 WebRTC connections: ${webrtcConnCount}`);
    console.log(`   📂 Active documents: ${docs.size}`);
    console.log(`   💬 Total messages: ${totalMessages}`);
    console.log(`   📝 Yjs updates: ${yjsUpdates}`);
    console.log(`   📡 WebRTC messages: ${webrtcMessages}`);
    if (docs.size > 0) {
      console.log(`   📋 Documents: ${Array.from(docs.keys()).join(", ")}`);
    }
    console.log("");
  }
}, 30000);
