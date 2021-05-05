const { Server } = require("socket.io");
const redisClient = require('./redis.js');
const token = 'f837170b13901fd6f33d33928515635b';

let users = {}
let isStarted = false; // 初始化活动开始状态

module.exports = async function initSocketIo (httpServer) {
  const io = new Server(httpServer, { path: '/server' });

  users = await redisClient.getAllUsers();
  isStarted = await redisClient.isStarted();

  io.on('connection', socket => {
    const isMaster = socket.handshake.query.token === token;

    socket.emit('init', isMaster, isStarted, users);

    // 开始活动
    socket.on('start', async () => {
      if (! isStarted && ! await redisClient.start()) {
        socket.emit('error', '开始活动失败')
      } else {
        isStarted = true;
        io.emit('start');
      }
    });

    // 更新体重
    socket.on('weight', async (key, weight) => {
      if (! users[key]) {
        socket.emit('error', '用户不存在');
      }

      if (weight < 1) {
        socket.emit('error', '体重数值不正确');
      }

      let weightType = isStarted ? 'newWeight' : 'oldWeight';
      let user = Object.assign({}, users[key], { [weightType]: weight });

      if (await redisClient.updateUser(key, user)) {
        io.emit('user-update', key, users[key] = user);
      } else {
        socket.emit('error', '更新体重数据失败');
      }
    });

    if (isMaster) {
      // 添加用户
      socket.on('user-add', async (name, oldWeight) => {
        if (isStarted) {
          return socket.emit('error', '活动已开始，不可添加或更新用户信息');
        }

        let user = { name, oldWeight, newWeight: 0 };
        let key = await redisClient.addUser(user);
        
        if (key) {
          io.emit('user', key, users[key] = user);
        } else {
          socket.emit('error', '添加用户失败');
        }
      });

      // 更新用户
      socket.on('user-update', async (key, name, oldWeight) => {
        if (isStarted) {
          return socket.emit('error', '活动已开始，不可添加或更新用户信息')
        }

        if (! users[key]) {
          return socket.emit('error', '用户不存在，无法更新')
        }

        const user = Object.assign({}, users[key], { name, oldWeight });
        if (await redisClient.updateUser(key, user)) {
          io.emit('user-update', key, users[key] = user);
        } else {
          socket.emit('error', '用户信息更新失败')
        }
      });

      // 删除用户
      socket.on('user-delete', async key => {
        if (isStarted) {
          return socket.emit('error', '活动已开始，不可删除用户');
        }

        if (users[key]) {
          if (! await redisClient.deleteUser(key)) {
            return socket.emit('error', '删除用户失败');
          }

          delete users[key];
        }
        
        io.emit('user-update', key);
      });
    }
  });
};
