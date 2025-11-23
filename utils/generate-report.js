/**
 * Generate HTML report from K6 JSON results
 * Usage: node generate-report.js <input.json> <output.html>
 */

const fs = require('fs');
const path = require('path');

// Check command line arguments
if (process.argv.length < 4) {
  console.log('Usage: node generate-report.js <input.json> <output.html>');
  process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = process.argv[3];

// Read and parse NDJSON file
let parsedData = [];
try {
  const rawData = fs.readFileSync(inputFile, 'utf8');
  const lines = rawData.trim().split('\n');

  // Parse each line as JSON
  lines.forEach(line => {
    try {
      parsedData.push(JSON.parse(line));
    } catch (e) {
      console.error('Error parsing line:', line);
    }
  });

  console.log(`Parsed ${parsedData.length} lines from ${inputFile}`);
} catch (error) {
  console.error('Error reading JSON file:', error.message);
  process.exit(1);
}

// Helper function to aggregate metrics from NDJSON data
function aggregateMetrics(data) {
  const metrics = {};
  const timestamps = new Set();

  for (const item of data) {
    if (item.type === 'Point') {
      const name = item.metric;
      if (!metrics[name]) {
        metrics[name] = [];
      }
      metrics[name].push(item.data.value);
      timestamps.add(new Date(item.data.time).getTime());
    }
  }

  // Calculate test duration
  const timestampArray = Array.from(timestamps).sort();
  const testDuration = timestampArray.length > 1
    ? (timestampArray[timestampArray.length - 1] - timestampArray[0]) / 1000
    : 0;

  return { metrics, testDuration };
}

// Helper function to calculate statistics
function calculateStats(values) {
  if (values.length === 0) return { avg: 0, min: 0, max: 0, p50: 0, p90: 0, p95: 0, median: 0 };

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  return {
    avg: values.reduce((sum, val) => sum + val, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    p50: sorted[Math.floor(n * 0.5)],
    p90: sorted[Math.floor(n * 0.9)],
    p95: sorted[Math.floor(n * 0.95)],
    median: sorted[Math.floor(n / 2)]
  };
}

// Aggregate the metrics
const { metrics, testDuration } = aggregateMetrics(parsedData);

// Calculate summary statistics
const totalRequests = metrics['http_reqs'] ? metrics['http_reqs'].length : 0;
const failedRequests = metrics['http_req_failed'] ? metrics['http_req_failed'].reduce((sum, val) => sum + val, 0) : 0;
const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
const responseTimes = metrics['http_req_duration'] || [];
const avgResponseTime = responseTimes.length > 0
  ? responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length
  : 0;
const throughput = testDuration > 0 ? totalRequests / testDuration : 0;

// Calculate response time stats
const durationStats = metrics['http_req_duration'] ? calculateStats(metrics['http_req_duration']) : null;
const waitingStats = metrics['http_req_waiting'] ? calculateStats(metrics['http_req_waiting']) : null;
const blockedStats = metrics['http_req_blocked'] ? calculateStats(metrics['http_req_blocked']) : null;
const connectingStats = metrics['http_req_connecting'] ? calculateStats(metrics['http_req_connecting']) : null;

// Generate HTML report
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K6 Performance Test Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f7fa;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 30px;
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 10px;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
      margin-bottom: 15px;
      padding: 10px;
      background: #ecf0f1;
      border-left: 4px solid #3498db;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      border-radius: 8px;
      color: white;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .card.success {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    }
    .card.warning {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    .card.info {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
    .card-title {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .card-value {
      font-size: 32px;
      font-weight: bold;
    }
    .card-subtitle {
      font-size: 12px;
      opacity: 0.8;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    th {
      background: #34495e;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #ecf0f1;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .metric-name {
      font-weight: 600;
      color: #2c3e50;
    }
    .metric-value {
      color: #7f8c8d;
      font-family: 'Courier New', monospace;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      color: #95a5a6;
      font-size: 14px;
      padding-top: 20px;
      border-top: 1px solid #ecf0f1;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>K6 Performance Test Report</h1>
    <p style="color: #7f8c8d; margin-bottom: 20px;">Generated: ${new Date().toLocaleString()}</p>

    <div class="summary">
      <div class="card info">
        <div class="card-title">Total Requests</div>
        <div class="card-value">${totalRequests}</div>
        <div class="card-subtitle">HTTP Requests</div>
      </div>

      <div class="card ${errorRate < 5 ? 'success' : 'warning'}">
        <div class="card-title">Error Rate</div>
        <div class="card-value">${errorRate.toFixed(2)}%</div>
        <div class="card-subtitle">Failed Requests</div>
      </div>

      <div class="card success">
        <div class="card-title">Avg Response Time</div>
        <div class="card-value">${Math.round(avgResponseTime)}</div>
        <div class="card-subtitle">Milliseconds</div>
      </div>

      <div class="card">
        <div class="card-title">Throughput</div>
        <div class="card-value">${throughput.toFixed(2)}</div>
        <div class="card-subtitle">Requests/second</div>
      </div>
    </div>

    <h2>Response Time Metrics</h2>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Average</th>
          <th>Minimum</th>
          <th>Median</th>
          <th>P90</th>
          <th>P95</th>
          <th>Maximum</th>
        </tr>
      </thead>
      <tbody>
        ${generateResponseTimeRow('Request Duration', durationStats)}
        ${generateResponseTimeRow('Request Waiting', waitingStats)}
        ${generateResponseTimeRow('Request Blocked', blockedStats)}
        ${generateResponseTimeRow('Request Connecting', connectingStats)}
      </tbody>
    </table>

    <h2>All Metrics</h2>
    <table>
      <thead>
        <tr>
          <th>Metric Name</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        ${generateAllMetricsRows(metrics)}
      </tbody>
    </table>

    <div class="footer">
      <p>K6 Performance Testing Report</p>
      <p>Petstore API - https://petstore.swagger.io/v2</p>
    </div>
  </div>
</body>
</html>
`;

// Helper function to generate response time row
function generateResponseTimeRow(name, stats) {
  if (!stats) {
    return `
    <tr>
      <td class="metric-name">${name}</td>
      <td class="metric-value">0ms</td>
      <td class="metric-value">0ms</td>
      <td class="metric-value">0ms</td>
      <td class="metric-value">0ms</td>
      <td class="metric-value">0ms</td>
      <td class="metric-value">0ms</td>
    </tr>`;
  }

  return `
    <tr>
      <td class="metric-name">${name}</td>
      <td class="metric-value">${Math.round(stats.avg)}ms</td>
      <td class="metric-value">${Math.round(stats.min)}ms</td>
      <td class="metric-value">${Math.round(stats.median)}ms</td>
      <td class="metric-value">${Math.round(stats.p90)}ms</td>
      <td class="metric-value">${Math.round(stats.p95)}ms</td>
      <td class="metric-value">${Math.round(stats.max)}ms</td>
    </tr>`;
}

// Helper function to generate all metrics rows
function generateAllMetricsRows(metrics) {
  let rows = '';
  const metricNames = Object.keys(metrics);

  for (const metricName of metricNames) {
    const metricData = metrics[metricName];
    let value = '';

    if (Array.isArray(metricData) && metricData.length > 0) {
      // For counter metrics, show sum
      if (['http_reqs', 'iterations', 'data_sent', 'data_received'].includes(metricName)) {
        value = metricData.reduce((sum, val) => sum + val, 0);
      }
      // For gauge metrics, show last value
      else if (['vus', 'vus_max'].includes(metricName)) {
        value = metricData[metricData.length - 1];
      }
      // For rate metrics, show percentage
      else if (['http_req_failed', 'checks', 'errors'].includes(metricName)) {
        const rate = metricData.reduce((sum, val) => sum + val, 0) / metricData.length;
        value = `${(rate * 100).toFixed(2)}%`;
      }
      // For trend metrics, show average with ms
      else if (['http_req_duration', 'http_req_blocked', 'http_req_connecting', 'http_req_waiting',
                'http_req_receiving', 'http_req_sending', 'http_req_tls_handshaking',
                'iteration_duration', 'pet_get_duration', 'inventory_get_duration', 'pet_post_duration'].includes(metricName)) {
        const avg = metricData.reduce((sum, val) => sum + val, 0) / metricData.length;
        value = `${Math.round(avg)}ms`;
      }
      // Default: show average
      else {
        const avg = metricData.reduce((sum, val) => sum + val, 0) / metricData.length;
        value = Math.round(avg);
      }
    }

    rows += `
      <tr>
        <td class="metric-name">${metricName}</td>
        <td class="metric-value">${value}</td>
      </tr>`;
  }

  return rows;
}

// Write HTML file
try {
  fs.writeFileSync(outputFile, html);
  console.log(`Report generated successfully: ${outputFile}`);
  console.log(`Total requests: ${totalRequests}`);
  console.log(`Error rate: ${errorRate.toFixed(2)}%`);
  console.log(`Average response time: ${Math.round(avgResponseTime)}ms`);
} catch (error) {
  console.error('Error writing HTML file:', error.message);
  process.exit(1);
}
