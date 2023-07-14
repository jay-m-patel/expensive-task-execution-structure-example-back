import { Server as HttpServer } from "http"
import { Server as SocketServer } from "socket.io";
import debug from "debug";
import { helpersErrorHandler } from "./errorHandlers";
import { initSocketFailed } from "../lang/socket/errors";

const debugLog = debug("socket.ts");
const errorLog = debug("socket.ts:error");

export interface Task {
    id: string,
    clientId: string,
    msg: string,
    isDone: boolean,
}
  
export const initSocket = (httpServer: HttpServer) => {
    try {
        debugLog("in initSocket");
        const io = new SocketServer(httpServer, {
            cors: {
                origin: process.env.CLIENT_URL,     // http://localhost:3000
            }
        });

        io.on("connection", socket => {
            const ioConnectionDebugLog = debugLog.extend("io-connection");
            ioConnectionDebugLog("socket connected:", socket.id);
            ioConnectionDebugLog("io.engine.clientsCount:", io.engine.clientsCount);

            socket.emit("connection-acknowledgement", "hi client!");

            socket.on("join-personal-room", (clientId: string) => {
                const joinPersonalRoomDebugLog = ioConnectionDebugLog.extend("join-personal-room");
                const joinPersonalRoomErrorLog = ioConnectionDebugLog.extend("join-personal-room:error");
                if(clientId) {
                    socket.join(clientId);
                    joinPersonalRoomDebugLog(`${socket.id} joined ${clientId} room`);
                } else {
                    joinPersonalRoomErrorLog(`${socket.id} didn't find clientId to join!`);
                    // Handle the error!
                }
            })

            socket.on("execute-expensive-task", (task: Task) => {
                const executeExpensiveTaskDebugLog = ioConnectionDebugLog.extend("execute-expensive-task");
                executeExpensiveTaskDebugLog("task:", task);

                socket.nsp.to(task.clientId).emit("append-new-task", task);

                setTimeout(
                    () => {
                        task.isDone = true;
                        executeExpensiveTaskDebugLog("done task:", task);

                        // socket.emit("expensive-task-executed", task);   // responding to the same socket id.
                        // socket.to(clientId).emit("expensive-task-executed", task);   // broadcasting to the client specific socket room.
                        socket.nsp.to(task.clientId).emit("expensive-task-executed", task);  // emitting(including self!) to the client specific room.
                    }, 
                    Math.random()*10000,
                );
            });
        });
    } catch(err) {
        helpersErrorHandler(err, initSocketFailed, errorLog);
    }
} 