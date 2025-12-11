const getProblemDetails = require("../apis/problems.api.js");
const CreationError = require("../errors/CreationError.js");
const BadRequest = require("../errors/BadRequest.js");
const SubmissionProducer = require("../producers/submission.queue.js");
const NotFound = require("../errors/NotFound.js");

class SubmissionService {
  constructor(submissionRepository) {
    this.submissionRepository = submissionRepository;
  }

  async addSubmission(submissionPayload) {
    const problemId = submissionPayload.problemId;
    const problemData = await getProblemDetails(problemId);

    const langCodeStub = problemData.data.codeStubs.find(
      (codeStub) =>
        codeStub.language.toLowerCase() ===
        submissionPayload.language.toLowerCase()
    );

    if (!langCodeStub) {
      throw new BadRequest(
        "language",
        `Unsupported language: ${submissionPayload.language}`
      );
    }

    submissionPayload.language = submissionPayload.language.toUpperCase();

    // Combine user code with start/end snippets for complete executable
    submissionPayload.code =
      langCodeStub.startSnippet +
      "\n" +
      submissionPayload.code +
      "\n" +
      langCodeStub.endSnippet;

    // Store in PostgreSQL with atomically updated user stats
    const submission = await this.submissionRepository.createSubmission(
      submissionPayload
    );
    if (!submission) {
      throw new CreationError("Failed to create a new submission");
    }

    const inputCases = problemData.data.testCases.map(
      (testCase) => testCase.input
    );
    const outputCases = problemData.data.testCases.map(
      (testCase) => testCase.output
    );

    // Add to BullMQ queue for async processing by executor service
    await SubmissionProducer({
      [submission.id]: {
        code: submission.code,
        language: submission.language,
        inputCase: inputCases,
        outputCase: outputCases,
        userId: submission.user_id,
        submissionId: submission.id,
      },
    });

    return submission;
  }

  async updateSubmissionStatus(submissionId, status, response) {
    const result = await this.submissionRepository.updateSubmissionStatus(
      submissionId,
      status,
      response
    );
    if (!result) {
      throw new BadRequest(
        "updateSubmissionStatus",
        `Failed to update status for submission: ${submissionId}`
      );
    }
    console.log(`Updated submission status: ${submissionId} -> ${status}`);
  }

  async getSubmissions(userId) {
    const response = await this.submissionRepository.getSubmissions(userId);
    return response || [];
  }
}

module.exports = SubmissionService;
