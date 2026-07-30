import { io } from 'socket.io-client';

// Backend portun 3000 olduğu için oraya bağlanıyoruz
const URL = 'http://localhost:3000'; 

export const socket = io(URL, {
  autoConnect: true,
});