module.exports = {
  region: 'us-east-1',
  handler: 'index.handler',
  role: "arn:aws:iam::710331364289:role/api_lambda_dynamo",
  functionName: 'carport-users',
  timeout: 3,
  memorySize: 128,
  publish: true, // default: false,
  runtime: 'nodejs 4.3'
}