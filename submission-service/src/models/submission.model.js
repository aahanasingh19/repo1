// Deprecated: Submission storage has been migrated from MongoDB to PostgreSQL.
// See repositories/SubmissionRepository.js for the PostgreSQL implementation.
// This file is retained for reference only.

const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, "User Id is required"],
  },
  problemId: {
    type: String,
    required: [true, "Problem Id is required"],
  },
  code: {
    type: String,
    required: [true, "Code is required"],
  },
  language: {
    type: String,
    enum: ["CPP", "JAVA", "PYTHON"],
    required: [true, "Language is required"],
  },
  status: {
    type: String,
    enum: ["PENDING", "SUCCESS", "RE", "TLE", "WA", "MLE", "UNKNOWN"],
    default: "PENDING",
    required: [true, "Status is empty"],
  },
});

const Submission = mongoose.model("Submissions", submissionSchema);
module.exports = Submission;
