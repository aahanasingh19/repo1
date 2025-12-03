export interface TestCase {
  input: string;
  output: string;
}

export interface TestCaseResult {
  input: string;
  expected: string;
  actual: string;
  status: string;
}

export interface ExecutionResult {
  overallStatus: string;
  results: TestCaseResult[];
}

export type ExecuteResType = {
  output: string;
  status: string;
};

export default interface ExecuteInterface {
  execute(
    code: string,
    inputTestCase: string,
    outputTestCase: string
  ): Promise<ExecuteResType>;
}
