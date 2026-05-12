module.exports = (io) => {
  io.on('connection', (socket) => {
    socket.on('watch_doctor', (doctorId) => {
      socket.join(`doctor_${doctorId}`);
    });
  });
};
