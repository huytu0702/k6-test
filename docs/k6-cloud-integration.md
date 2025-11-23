# K6 Cloud Integration Guide

## Tổng quan

K6 Cloud là một nền tảng SaaS chính thức từ Grafana Labs cho phép bạn:
- Chạy tests từ nhiều vị trí địa lý khác nhau
- Lưu trữ và phân tích kết quả test lịch sử
- Visualize metrics real-time với dashboard đẹp mắt
- So sánh kết quả giữa các lần chạy test
- Tích hợp CI/CD dễ dàng

## Cài đặt và Cấu hình

### 1. Đăng ký K6 Cloud Account

1. Truy cập: https://app.k6.io/account/register
2. Đăng ký tài khoản miễn phí (Free tier: 50 VUh/month)
3. Xác nhận email

### 2. Lấy API Token

```bash
# Đăng nhập vào K6 Cloud qua CLI
k6 login cloud

# Hoặc lấy token từ web UI:
# Settings > API Token > Generate New Token
```

### 3. Cấu hình Token

**Option 1: Environment Variable**
```bash
# Windows PowerShell
$env:K6_CLOUD_TOKEN="your-token-here"

# Windows CMD
set K6_CLOUD_TOKEN=your-token-here

# Linux/Mac
export K6_CLOUD_TOKEN=your-token-here
```

**Option 2: Config File**
```bash
# Tạo file ~/.k6/config.json
{
  "collectors": {
    "cloud": {
      "token": "your-token-here"
    }
  }
}
```

## Chạy Tests trên K6 Cloud

### Cách 1: Streaming Results (Hybrid)

Test chạy trên máy local, kết quả được stream lên cloud:

```bash
# Basic streaming
k6 run --out cloud scripts/load-test.js

# Với project name và tags
k6 run --out cloud \
  --tag project=petstore \
  --tag environment=staging \
  scripts/load-test.js
```

**Ưu điểm:**
- Miễn phí (không tốn VUh)
- Kiểm soát hoàn toàn môi trường test
- Real-time visualization trên cloud

**Nhược điểm:**
- Giới hạn bởi tài nguyên máy local
- Không thể test từ nhiều vị trí địa lý

### Cách 2: Cloud Execution

Test chạy hoàn toàn trên K6 Cloud infrastructure:

```bash
# Upload và chạy trên cloud
k6 cloud scripts/load-test.js

# Với cấu hình chi tiết
k6 cloud --vus 100 --duration 10m scripts/load-test.js
```

**Ưu điểm:**
- Không giới hạn tài nguyên
- Distributed load testing từ nhiều zones
- Scaling tự động

**Nhược điểm:**
- Tốn VUh (Virtual User hours)
- Phải upload script lên cloud

### Cách 3: Cloud Zones (Distributed Testing)

Chạy test từ nhiều vị trí địa lý:

```javascript
// Thêm vào script
export let options = {
  ext: {
    loadimpact: {
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 50 },
        'amazon:ie:dublin': { loadZone: 'amazon:ie:dublin', percent: 30 },
        'amazon:sg:singapore': { loadZone: 'amazon:sg:singapore', percent: 20 },
      },
    },
  },
  stages: [
    { duration: '5m', target: 100 },
  ],
};
```

## Script Configuration cho Cloud

### Thêm Cloud Options

```javascript
export let options = {
  // Test configuration
  stages: [
    { duration: '2m', target: 20 },
    { duration: '5m', target: 20 },
    { duration: '2m', target: 0 },
  ],

  // Cloud-specific options
  ext: {
    loadimpact: {
      projectID: 12345,
      name: 'Petstore Load Test',
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 },
      },
      note: 'Testing with 20 VUs for 9 minutes',
    },
  },

  // Thresholds
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.05'],
  },
};
```

### Tagging cho Organization

```javascript
export let options = {
  tags: {
    project: 'petstore',
    environment: 'production',
    team: 'qa',
    version: '1.0.0',
  },
};
```

## Monitoring trên K6 Cloud Dashboard

### Dashboard Features

1. **Real-time Metrics**
   - VUs over time
   - Request rate
   - Response time percentiles
   - Error rate

2. **Performance Insights**
   - Automatic anomaly detection
   - Performance comparisons
   - Threshold violations

3. **Analysis Tools**
   - URL grouping
   - Tag filtering
   - Custom metric visualization

### URL để xem kết quả

Sau khi chạy test, K6 sẽ in ra URL:

```
execution: cloud
     output: https://app.k6.io/runs/123456
```

## Best Practices

### 1. Sử dụng Tags hiệu quả

```javascript
export default function() {
  http.get('https://petstore.swagger.io/v2/pet/1', {
    tags: {
      endpoint: 'pet',
      operation: 'get',
      critical: 'true',
    },
  });
}
```

### 2. Project Organization

```bash
# Tạo project trên cloud
k6 cloud create project "Petstore Performance Tests"

# Link local tests với project
export K6_CLOUD_PROJECT_ID=12345
```

### 3. Scheduled Tests

Tạo scheduled tests qua Web UI:
1. Upload script lên cloud
2. Vào Test > Schedule
3. Cấu hình cron schedule
4. Enable notifications

### 4. Notifications

Cấu hình alerts:
1. Project Settings > Notifications
2. Thêm webhook/email endpoints
3. Chọn trigger conditions:
   - Test failed
   - Threshold violated
   - Test completed

## Cost Management

### Free Tier Limits

- 50 VUh (Virtual User hours) per month
- 5 team members
- 30 day data retention

### VUh Calculation

```
VUh = Virtual Users × Test Duration (hours)

Ví dụ:
- 10 VUs × 1 hour = 10 VUh
- 100 VUs × 30 minutes = 50 VUh
- 50 VUs × 10 minutes = 8.33 VUh
```

### Tips để tiết kiệm VUh

1. **Phát triển với local execution**
   ```bash
   k6 run scripts/load-test.js  # Free
   ```

2. **Stream results khi test nhỏ**
   ```bash
   k6 run --out cloud scripts/load-test.js  # Free
   ```

3. **Chỉ dùng cloud execution cho production tests**
   ```bash
   k6 cloud scripts/load-test.js  # Tốn VUh
   ```

## Tích hợp CI/CD

### GitHub Actions

```yaml
name: K6 Cloud Performance Test

on:
  schedule:
    - cron: '0 0 * * *'  # Daily
  workflow_dispatch:

jobs:
  performance-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install K6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz
          sudo cp k6-v0.47.0-linux-amd64/k6 /usr/local/bin

      - name: Run K6 Cloud Test
        env:
          K6_CLOUD_TOKEN: ${{ secrets.K6_CLOUD_TOKEN }}
        run: |
          k6 cloud scripts/load-test.js
```

### Jenkins

```groovy
pipeline {
    agent any

    environment {
        K6_CLOUD_TOKEN = credentials('k6-cloud-token')
    }

    stages {
        stage('Performance Test') {
            steps {
                sh 'k6 cloud scripts/load-test.js'
            }
        }
    }
}
```

## Alternative: Self-hosted Monitoring

Nếu không muốn dùng K6 Cloud, có thể setup monitoring stack riêng:

### InfluxDB + Grafana

```bash
# Start InfluxDB
docker run -d -p 8086:8086 influxdb:1.8

# Create database
curl -XPOST 'http://localhost:8086/query' --data-urlencode 'q=CREATE DATABASE k6'

# Run test with InfluxDB output
k6 run --out influxdb=http://localhost:8086/k6 scripts/load-test.js
```

### Prometheus Remote Write

```bash
# Install Prometheus Remote Write extension
# Then run:
k6 run --out experimental-prometheus-rw scripts/load-test.js
```

### Grafana Dashboard

1. Import K6 dashboard: https://grafana.com/grafana/dashboards/2587
2. Configure InfluxDB data source
3. View real-time metrics

## Kết luận

K6 Cloud là giải pháp tốt nhất cho:
- ✅ Teams cần collaboration
- ✅ Distributed load testing
- ✅ Historical trend analysis
- ✅ CI/CD integration
- ✅ Easy setup, zero infrastructure

Nhưng nếu bạn:
- ❌ Có ngân sách hạn chế
- ❌ Cần full control
- ❌ Có security constraints

Thì nên xem xét self-hosted monitoring với InfluxDB + Grafana.

## Resources

- K6 Cloud Docs: https://k6.io/docs/cloud/
- Pricing: https://k6.io/pricing/
- Dashboard Examples: https://app.k6.io/public
- Community Forum: https://community.k6.io/
