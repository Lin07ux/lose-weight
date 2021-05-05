const { promisify } = require("util");
const client = require("redis").createClient(6379, 'redis', { prefix: 'lose:weight:' });
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const hsetAsync = promisify(client.hset).bind(client);
const hdelAsync = promisify(client.hdel).bind(client);
const hgetallAsync = promisify(client.hgetall).bind(client);
const incrAsync = promisify(client.incr).bind(client);

const START_KEY = 'start';
const USER_HASH = 'users';
const USER_NEXT_KEY = 'user:next:key';

module.exports = {
    start,
    isStarted,
    addUser,
    deleteUser,
    updateUser,
    getAllUsers,
}

function start() {
    return setAsync(START_KEY, 1);
}

function isStarted() {
    return getAsync(START_KEY).then(value => !!value && value > 0).catch(error => {
        console.log(error.message);
        return false;
    });
}

function addUser(user) {
    let key = '';

    return incrAsync(USER_NEXT_KEY).then(value => {
        key = '' + value;
        
        return hsetAsync(USER_HASH, key, JSON.stringify(user))
    }).then(() => key, error => console.log(error.message))
}

function deleteUser(key) {
    return hdelAsync(USER_HASH, key);
}

function updateUser(key, user) {
    return hsetAsync(USER_HASH, key, JSON.stringify(user)).then(() => key).catch(error => console.log(error.message))
}

function getAllUsers() {
    return hgetallAsync(USER_HASH).catch(error => {
        console.log(error.message);
    }).then(users => {
        users = users || {};
        
        for (key in users) {
            users[key] = JSON.parse(users[key])
        }

        return users;
    })
}
