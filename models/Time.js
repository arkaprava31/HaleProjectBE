const mongoose = require('mongoose');

const timeSchema = new mongoose.Schema({

  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  time: [
    {
      date: {
        type: Date,
        required: true
      },
      projects: [
        {
          projectCode: {
            type: String,
            required: true
          },
          hours: {
            type: Number,
            required: true
          }
        }
      ],
    }
  ],
  comment:{
    type:String,
  }
});

const Time = mongoose.model('Time', timeSchema);

module.exports = Time;