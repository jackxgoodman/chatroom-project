// Require the packages we will use:
var http = require("http"),
        socketio = require("socket.io"),
        fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
        // This callback runs when a new connection is made to our HTTP server.

        fs.readFile("client.html", function(err, data){
                // This callback runs when the client.html file has been read from the filesystem.

                if(err) return resp.writeHead(500);
                resp.writeHead(200);
                resp.end(data);
        });
});
app.listen(3456);


var chatrooms = {
                token: {
                        roomName: "tokenName",
                        password: "tokenPass",
                        creator: "tokenKey"
                }
        };
var users = {token:"token"};
        
// Do the Socket.IO magic:
var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
        // This callback runs when a new Socket.IO connection is established.

        socket.on('message_to_server', function(data) {
                // This callback runs when the server receives a new message from the client.
                
                //FIXME: check user and room
                
                //console.log("message: "+data["message"]); // log it to the Node.JS output
                io.sockets.emit("message_to_client",{chatroom: data.chatroom, username: data.username, message:data["message"], pmTo:data.pmTo, isCS:data.isCS, isSS:data.isSS, isAnon:data.isAnon}); // broadcast the message to other users
        });
        
        socket.on('logout', function(data) {
                var user = data.user;
                var found = false;
                for (var i = 0; i < Object.keys(users).length -1; i++) {
                        if (user == users[i].username) {
                                users[i] = {
                                        username: null,
                                        room: null
                                }
                        }
                }
                io.sockets.emit("room_users_updated", {userInfo:users});
        });
        
        socket.on('new_room', function(data) {
                var numRooms = Object.keys(chatrooms).length - 1;
                var newRoomKey = "room" + numRooms;

                chatrooms[newRoomKey] = {roomName: data.roomName, roomPass: data.password, creator: data.creator};
                
                io.sockets.emit("room_update", {rooms: chatrooms});
        });
        
        socket.on('join_room', function(data) {
                var roomUser = data.username;
                var password = data.password;
                var roomToJoin = data.roomName;
                var usersInRoom = {token:"token"};
                var count = 0;
                var insertKey = Object.keys(users).length - 1;
                var canJoin = true;
                var roomCreator;
                var foundRoom = false;
                

                for (var i= 0; i < Object.keys(users).length - 1; i++) {
                        if (users[i].username == data.username) {
                                insertKey = i;
                        }
                }
                for (var i = 0; i < Object.keys(chatrooms).length - 1; i++) {
                        var roomKey = "room" + i;
                        if (chatrooms[roomKey].roomName == roomToJoin) {
                                foundRoom = true;
                                if (chatrooms[roomKey].roomPass != password) {
                                        canJoin = false;
                                }
                                roomCreator = chatrooms[roomKey].creator;
                        }
                }
                if (!foundRoom) {
                        canJoin = false;
                }
                if (canJoin) {
                        users[insertKey] = {
                                username: roomUser,
                                room: roomToJoin
                        }
                        for (var i= 0; i < Object.keys(users).length - 1; i++) {
                                if (users[i].room == roomToJoin) {
                                        usersInRoom[count] = users[i].username;
                                        count++;
                                }
                        }
                        
                        io.sockets.emit("room_joined", {inRoom:usersInRoom, username:roomUser, room:roomToJoin, creator:roomCreator});
                } else {
                        io.sockets.emit("room_not_joined", {username: roomUser});
                }
                
        });
        
        socket.on('update_room_users', function() {
                io.sockets.emit("room_users_updated", {userInfo:users});
        });
        
        socket.on('login', function(data) {
                var user = data.username;
                var found = false;
                var rand = data.rand;
                for (var i = 0; i < Object.keys(users).length -1; i++) {
                        //console.log(user + " == " + users[i].username);
                        if (user == users[i].username) {
                                //console.log("names are same");
                                io.sockets.emit("login_failed", {username:user, rand:rand});
                                found = true;
                        }
                }
                if (!found) {
                        users[Object.keys(users).length - 1] = {
                                username: user,
                                room: null
                        };
                        io.sockets.emit("room_update", {rooms: chatrooms});
                }
                
        });
        
        socket.on("kick_user", function(data) {
                for (var i= 0; i < Object.keys(users).length - 1; i++) {
                        if (users[i].username == data.username) {
                                insertKey = i;
                        }
                }
                if (users[insertKey].room == data.currentRoom) {
                        users[insertKey] = {
                                username: data.username,
                                room: null
                        }
                }
                io.sockets.emit("user_kicked", {username:data.username, room:data.room});
        });
        
});
