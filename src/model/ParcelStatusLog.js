const mongoose = require('mongoose');

const parcelStatusLogSchema = new mongoose.Schema({
  parcel_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parcel',
    required: true
  },
  status: {
    type: String,
    enum: ['RECEIVED', 'ON_BUS', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
    required: true
  },
  note: {
    type: String,
    default: ''
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ParcelStatusLog', parcelStatusLogSchema);