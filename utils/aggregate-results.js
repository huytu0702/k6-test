/**
 * Aggregate K6 Test Results
 * Combines multiple test results into a comprehensive report
 */

const fs = require('fs');
const path = require('path');

// Configuration
const RESULTS_DIR = path.join(__dirname, '../results');
const OUTPUT_FILE = path.join(RESULTS_DIR, 'aggregated-report.json');
const HTML_OUTPUT = path.join(RESULTS_DIR, 'monitoring-dashboard.html');

/**
 * Read all JSON result files
 */
function readResultFiles() {
  const files = fs.readdirSync(RESULTS_DIR);
  const jsonFiles = files.filter(f => f.endsWith('-result.json'));

  const results = {};

  jsonFiles.forEach(file => {
    try {
      const content = fs.readFileSync(path.join(RESULTS_DIR, file), 'utf-8');
      // Don't parse JSON here - pass raw content to parseK6Output

      // Extract test name from filename
      const testName = file.replace('-result.json', '');
      results[testName] = parseK6Output(content);
    } catch (error) {
      console.error(`Error reading ${file}:`, error.message);
    }
  });

  return results;
}

/**
 * Parse K6 NDJSON output format
 */
function parseK6Output(data) {
  const metrics = {
    duration: 0,
    totalRequests: 0,
    failedRequests: 0,
    requestRate: 0,
    responseTime: {
      min: 0,
      avg: 0,
      max: 0,
      med: 0,
      p90: 0,
      p95: 0,
      p99: 0,
    },
    errorRate: 0,
    checksPassRate: 0,
    vusMax: 0,
    dataTransferred: 0,
  };

  // K6 outputs metrics as newline-delimited JSON (NDJSON)
  const lines = data.split('\n').filter(l => l.trim());

  // Collect all metric points for aggregation
  const metricPoints = {
    http_req_duration: [],
    http_reqs: 0,
    http_req_failed: 0,
    checks_passed: 0,
    checks_failed: 0,
    vus_max: 0,
    data_received: 0,
  };

  lines.forEach(line => {
    try {
      const entry = JSON.parse(line);

      // Process Point type entries (actual measurements)
      if (entry.type === 'Point') {
        const metricName = entry.metric;
        const value = entry.data.value;
        const tags = entry.data.tags || {};

        switch (metricName) {
          case 'http_reqs':
            metricPoints.http_reqs += value;
            break;

          case 'http_req_duration':
            metricPoints.http_req_duration.push(value);
            break;

          case 'http_req_failed':
            if (value === 1) {
              metricPoints.http_req_failed++;
            }
            break;

          case 'checks':
            if (value === 1) {
              metricPoints.checks_passed++;
            } else {
              metricPoints.checks_failed++;
            }
            break;

          case 'vus_max':
            metricPoints.vus_max = Math.max(metricPoints.vus_max, value);
            break;

          case 'data_received':
            metricPoints.data_received += value;
            break;
        }
      }
    } catch (e) {
      // Skip invalid lines
    }
  });

  // Calculate aggregated metrics
  if (metricPoints.http_req_duration.length > 0) {
    const sorted = metricPoints.http_req_duration.sort((a, b) => a - b);
    const len = sorted.length;

    metrics.responseTime.min = sorted[0];
    metrics.responseTime.max = sorted[len - 1];
    metrics.responseTime.avg = sorted.reduce((a, b) => a + b, 0) / len;
    metrics.responseTime.med = sorted[Math.floor(len / 2)];
    metrics.responseTime.p90 = sorted[Math.floor(len * 0.90)];
    metrics.responseTime.p95 = sorted[Math.floor(len * 0.95)];
    metrics.responseTime.p99 = sorted[Math.floor(len * 0.99)];
  }

  metrics.totalRequests = metricPoints.http_reqs;
  metrics.failedRequests = metricPoints.http_req_failed;
  metrics.errorRate = metrics.totalRequests > 0
    ? (metricPoints.http_req_failed / metrics.totalRequests) * 100
    : 0;

  const totalChecks = metricPoints.checks_passed + metricPoints.checks_failed;
  metrics.checksPassRate = totalChecks > 0
    ? (metricPoints.checks_passed / totalChecks) * 100
    : 100;

  metrics.vusMax = metricPoints.vus_max;
  metrics.dataTransferred = metricPoints.data_received;

  // Estimate request rate (rough approximation)
  // Would need duration info from the data for accurate rate
  metrics.requestRate = metrics.totalRequests / 60; // Assume 1 minute for now

  return metrics;
}

/**
 * Calculate aggregate statistics
 */
function calculateAggregates(results) {
  const testNames = Object.keys(results);

  if (testNames.length === 0) {
    return null;
  }

  const aggregates = {
    totalTests: testNames.length,
    totalRequests: 0,
    totalFailedRequests: 0,
    avgErrorRate: 0,
    avgResponseTime: 0,
    avgChecksPassRate: 0,
    maxVus: 0,
    totalDataTransferred: 0,
    tests: {},
  };

  testNames.forEach(name => {
    const test = results[name];

    aggregates.totalRequests += test.totalRequests;
    aggregates.totalFailedRequests += test.failedRequests;
    aggregates.avgErrorRate += test.errorRate;
    aggregates.avgResponseTime += test.responseTime.avg || 0;
    aggregates.avgChecksPassRate += test.checksPassRate;
    aggregates.maxVus = Math.max(aggregates.maxVus, test.vusMax);
    aggregates.totalDataTransferred += test.dataTransferred;

    aggregates.tests[name] = test;
  });

  // Calculate averages
  aggregates.avgErrorRate /= testNames.length;
  aggregates.avgResponseTime /= testNames.length;
  aggregates.avgChecksPassRate /= testNames.length;

  return aggregates;
}

/**
 * Generate comparison table
 */
function generateComparison(results) {
  const comparison = [];

  Object.keys(results).forEach(testName => {
    const test = results[testName];

    comparison.push({
      test: testName,
      requests: test.totalRequests,
      errors: test.failedRequests,
      errorRate: `${test.errorRate.toFixed(2)}%`,
      avgResponseTime: `${test.responseTime.avg.toFixed(2)}ms`,
      p95ResponseTime: `${test.responseTime.p95.toFixed(2)}ms`,
      checksPassRate: `${test.checksPassRate.toFixed(2)}%`,
      maxVUs: test.vusMax,
      throughput: `${test.requestRate.toFixed(2)} req/s`,
    });
  });

  return comparison;
}

/**
 * Identify performance issues
 */
function identifyIssues(results) {
  const issues = [];

  Object.keys(results).forEach(testName => {
    const test = results[testName];

    // High error rate
    if (test.errorRate > 5) {
      issues.push({
        severity: 'HIGH',
        test: testName,
        issue: 'High Error Rate',
        value: `${test.errorRate.toFixed(2)}%`,
        threshold: '5%',
      });
    }

    // Slow response time
    if (test.responseTime.avg > 1000) {
      issues.push({
        severity: 'MEDIUM',
        test: testName,
        issue: 'Slow Average Response Time',
        value: `${test.responseTime.avg.toFixed(2)}ms`,
        threshold: '1000ms',
      });
    }

    // Very slow P95
    if (test.responseTime.p95 > 2000) {
      issues.push({
        severity: 'MEDIUM',
        test: testName,
        issue: 'Slow P95 Response Time',
        value: `${test.responseTime.p95.toFixed(2)}ms`,
        threshold: '2000ms',
      });
    }

    // Low checks pass rate
    if (test.checksPassRate < 90) {
      issues.push({
        severity: 'HIGH',
        test: testName,
        issue: 'Low Checks Pass Rate',
        value: `${test.checksPassRate.toFixed(2)}%`,
        threshold: '90%',
      });
    }

    // Low throughput
    if (test.requestRate < 10) {
      issues.push({
        severity: 'LOW',
        test: testName,
        issue: 'Low Throughput',
        value: `${test.requestRate.toFixed(2)} req/s`,
        threshold: '10 req/s',
      });
    }
  });

  return issues;
}

/**
 * Generate HTML dashboard
 */
function generateHTMLDashboard(aggregates, comparison, issues) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K6 Performance Monitoring Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      color: #333;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
      text-align: center;
    }

    .header h1 {
      color: #667eea;
      font-size: 2.5em;
      margin-bottom: 10px;
    }

    .header .timestamp {
      color: #666;
      font-size: 0.9em;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }

    .stat-card {
      background: white;
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-5px);
    }

    .stat-card .label {
      font-size: 0.9em;
      color: #666;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .stat-card .value {
      font-size: 2.5em;
      font-weight: bold;
      color: #667eea;
    }

    .stat-card .unit {
      font-size: 0.5em;
      color: #999;
      margin-left: 5px;
    }

    .section {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
    }

    .section h2 {
      color: #667eea;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #f0f0f0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #f0f0f0;
    }

    th {
      background: #f8f9fa;
      color: #667eea;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.85em;
    }

    tr:hover {
      background: #f8f9fa;
    }

    .issue-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 600;
    }

    .issue-HIGH {
      background: #fee;
      color: #c33;
    }

    .issue-MEDIUM {
      background: #ffeaa7;
      color: #d63031;
    }

    .issue-LOW {
      background: #dfe6e9;
      color: #2d3436;
    }

    .success {
      color: #00b894;
      font-weight: bold;
    }

    .warning {
      color: #fdcb6e;
      font-weight: bold;
    }

    .error {
      color: #d63031;
      font-weight: bold;
    }

    .no-issues {
      text-align: center;
      padding: 40px;
      color: #00b894;
      font-size: 1.2em;
    }

    .chart-container {
      margin: 20px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .footer {
      text-align: center;
      color: white;
      margin-top: 30px;
      padding: 20px;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 K6 Performance Monitoring Dashboard</h1>
      <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">Total Tests</div>
        <div class="value">${aggregates.totalTests}</div>
      </div>
      <div class="stat-card">
        <div class="label">Total Requests</div>
        <div class="value">${aggregates.totalRequests.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="label">Avg Response Time</div>
        <div class="value">${aggregates.avgResponseTime.toFixed(0)}<span class="unit">ms</span></div>
      </div>
      <div class="stat-card">
        <div class="label">Avg Error Rate</div>
        <div class="value ${aggregates.avgErrorRate > 5 ? 'error' : 'success'}">${aggregates.avgErrorRate.toFixed(2)}<span class="unit">%</span></div>
      </div>
      <div class="stat-card">
        <div class="label">Avg Checks Pass Rate</div>
        <div class="value ${aggregates.avgChecksPassRate < 90 ? 'warning' : 'success'}">${aggregates.avgChecksPassRate.toFixed(1)}<span class="unit">%</span></div>
      </div>
      <div class="stat-card">
        <div class="label">Max Virtual Users</div>
        <div class="value">${aggregates.maxVus}</div>
      </div>
    </div>

    <div class="section">
      <h2>📊 Test Results Comparison</h2>
      <table>
        <thead>
          <tr>
            <th>Test Name</th>
            <th>Requests</th>
            <th>Error Rate</th>
            <th>Avg Response</th>
            <th>P95 Response</th>
            <th>Checks Pass</th>
            <th>Max VUs</th>
            <th>Throughput</th>
          </tr>
        </thead>
        <tbody>
          ${comparison.map(row => `
            <tr>
              <td><strong>${row.test}</strong></td>
              <td>${row.requests.toLocaleString()}</td>
              <td class="${parseFloat(row.errorRate) > 5 ? 'error' : 'success'}">${row.errorRate}</td>
              <td>${row.avgResponseTime}</td>
              <td>${row.p95ResponseTime}</td>
              <td class="${parseFloat(row.checksPassRate) < 90 ? 'warning' : 'success'}">${row.checksPassRate}</td>
              <td>${row.maxVUs}</td>
              <td>${row.throughput}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>⚠️ Issues & Alerts</h2>
      ${issues.length === 0 ?
        '<div class="no-issues">✅ No issues detected! All tests performing within acceptable thresholds.</div>' :
        `<table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>Test</th>
              <th>Issue</th>
              <th>Current Value</th>
              <th>Threshold</th>
            </tr>
          </thead>
          <tbody>
            ${issues.map(issue => `
              <tr>
                <td><span class="issue-badge issue-${issue.severity}">${issue.severity}</span></td>
                <td>${issue.test}</td>
                <td>${issue.issue}</td>
                <td><strong>${issue.value}</strong></td>
                <td>${issue.threshold}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
      }
    </div>

    <div class="footer">
      <p>K6 Performance Testing Dashboard | Petstore API Performance Monitoring</p>
      <p>Powered by K6 + Custom Monitoring Solution</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

/**
 * Main execution
 */
function main() {
  console.log('📊 Aggregating K6 test results...\n');

  // Read all result files
  const results = readResultFiles();

  if (Object.keys(results).length === 0) {
    console.log('❌ No result files found in results directory');
    return;
  }

  console.log(`✅ Found ${Object.keys(results).length} test results\n`);

  // Calculate aggregates
  const aggregates = calculateAggregates(results);

  // Generate comparison
  const comparison = generateComparison(results);

  // Identify issues
  const issues = identifyIssues(results);

  // Create final report
  const report = {
    generatedAt: new Date().toISOString(),
    summary: aggregates,
    comparison: comparison,
    issues: issues,
    rawData: results,
  };

  // Save JSON report
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
  console.log(`✅ JSON report saved to: ${OUTPUT_FILE}`);

  // Generate and save HTML dashboard
  const html = generateHTMLDashboard(aggregates, comparison, issues);
  fs.writeFileSync(HTML_OUTPUT, html);
  console.log(`✅ HTML dashboard saved to: ${HTML_OUTPUT}`);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${aggregates.totalTests}`);
  console.log(`Total Requests: ${aggregates.totalRequests.toLocaleString()}`);
  console.log(`Avg Response Time: ${aggregates.avgResponseTime.toFixed(2)}ms`);
  console.log(`Avg Error Rate: ${aggregates.avgErrorRate.toFixed(2)}%`);
  console.log(`Avg Checks Pass Rate: ${aggregates.avgChecksPassRate.toFixed(2)}%`);
  console.log(`Issues Found: ${issues.length}`);

  if (issues.length > 0) {
    console.log('\n⚠️  ISSUES DETECTED:');
    issues.forEach(issue => {
      console.log(`  [${issue.severity}] ${issue.test}: ${issue.issue}`);
    });
  } else {
    console.log('\n✅ No issues detected!');
  }

  console.log('\n' + '='.repeat(60));
}

// Run
if (require.main === module) {
  main();
}

module.exports = {
  readResultFiles,
  calculateAggregates,
  generateComparison,
  identifyIssues,
  generateHTMLDashboard,
};
