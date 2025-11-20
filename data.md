## Sample API Payloads

### Create Problem

```json
{
  "endpoint": "http://localhost:3000/api/v1/problems",
  "method": "POST",
  "payload": {
    "title": "Find the Factorial!",
    "description": "Given a non-negative integer n, return the factorial of n.",
    "difficulty": "easy",
    "testCases": [
      { "input": "5", "output": "120" },
      { "input": "0", "output": "1" },
      { "input": "3", "output": "6" }
    ],
    "codeStubs": [
      {
        "language": "PYTHON",
        "startSnippet": "",
        "endSnippet": "if __name__ == \"__main__\":\n\tn = int(input())\n\tsolution = Solution()\n\tresult = solution.factorial(n)\n\tprint(result)",
        "userSnippet": "class Solution:\n\tdef factorial(self, n):\n\t\t# your code here\n\t\tpass"
      },
      {
        "language": "JAVA",
        "startSnippet": "import java.util.Scanner;",
        "endSnippet": "public class Main {\n\tpublic static void main(String[] args) {\n\t\tScanner scanner = new Scanner(System.in);\n\t\tint n = scanner.nextInt();\n\t\tSolution solution = new Solution();\n\t\tint result = solution.factorial(n);\n\t\tSystem.out.println(result);\n\t\tscanner.close();\n\t}\n}",
        "userSnippet": "class Solution {\n\tpublic int factorial(int n) {\n\t\t// your code here\n\t}\n}"
      },
      {
        "language": "CPP",
        "startSnippet": "#include <iostream>\nusing namespace std;",
        "endSnippet": "int main() {\n\tint n;\n\tcin >> n;\n\tSolution solution;\n\tint result = solution.factorial(n);\n\tcout << result << endl;\n\treturn 0;\n};",
        "userSnippet": "class Solution {\npublic:\n\tint factorial(int n) {\n\t\t// your code here\n\t}\n};"
      }
    ],
    "editorial": "Use a simple loop or recursion."
  }
}
```

### Submit Solution

```json
{
  "endpoint": "http://localhost:4000/api/v1/submission",
  "method": "POST",
  "payload": {
    "userId": "user123",
    "problemId": "<problem_id_from_above>",
    "code": "class Solution:\n\tdef factorial(self, n):\n\t\tif n == 0 or n == 1:\n\t\t\treturn 1\n\t\treturn n * self.factorial(n - 1)",
    "language": "PYTHON"
  }
}
```

### API Endpoints

**Problem Service** (port 3000)
```
POST   /api/v1/problems
GET    /api/v1/problems
GET    /api/v1/problems/:id
DELETE /api/v1/problems/:id
PATCH  /api/v1/problems/:id
```

**Submission Service** (port 4000)
```
POST   /api/v1/submission
GET    /api/v1/submission/:userId
GET    /metrics
GET    /health
```
