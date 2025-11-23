# KẾ HOẠCH ÁP DỤNG K6 CHO DỰ ÁN PETSTORE API

## Tổng quan
Dự án: Áp dụng K6 để kiểm thử hiệu năng cho Petstore API (https://petstore.swagger.io/)
Mục tiêu: Thực hiện đầy đủ các mục trong báo cáo Chương 4

---

## PHASE 1: CHUẨN BỊ & THIẾT LẬP
**Thời gian ước tính: 1-2 giờ**

### 4.1 Tổng quan về bối cảnh dự án
**Mục tiêu:**
- Giới thiệu về Petstore API (Swagger demo)
- Xác định các endpoints cần test: `/pet`, `/store`, `/user`
- Đặt ra mục tiêu kiểm thử hiệu năng

**Deliverables:**
- [ ] Tài liệu mô tả API endpoints
- [ ] Danh sách các use cases cần test
- [ ] Mục tiêu hiệu năng (response time, throughput, error rate)

**Nội dung chi tiết:**
```
- API Base URL: https://petstore.swagger.io/v2
- Endpoints chính:
  + GET /pet/{petId} - Lấy thông tin pet
  + POST /pet - Tạo pet mới
  + PUT /pet - Cập nhật pet
  + DELETE /pet/{petId} - Xóa pet
  + GET /store/inventory - Lấy inventory
  + POST /store/order - Tạo order
  + GET /user/{username} - Lấy thông tin user
```

---

### 4.2.1 Cài đặt K6
**Mục tiêu:**
- Cài đặt K6 trên môi trường Windows
- Verify installation thành công

**Các bước thực hiện:**
1. Tải K6 từ trang chính thức
   ```powershell
   # Option 1: Chocolatey
   choco install k6

   # Option 2: Scoop
   scoop install k6

   # Option 3: Download MSI installer
   # https://github.com/grafana/k6/releases
   ```

2. Kiểm tra cài đặt
   ```bash
   k6 version
   ```

**Deliverables:**
- [ ] K6 đã được cài đặt
- [ ] Screenshot kết quả `k6 version`
- [ ] Hướng dẫn cài đặt trong báo cáo

---

### 4.2.2 Cấu trúc project và tổ chức test scripts
**Mục tiêu:**
- Tạo cấu trúc thư mục rõ ràng, dễ quản lý
- Tổ chức files theo best practices

**Cấu trúc thư mục đề xuất:**
```
k6-test/
├── scripts/
│   ├── load-test.js          # Load testing
│   ├── stress-test.js        # Stress testing
│   ├── spike-test.js         # Spike testing
│   └── advanced/
│       ├── auth-test.js      # Authentication testing
│       ├── workflow-test.js  # API workflows
│       └── data-driven.js    # Data-driven testing
├── data/
│   ├── pets.json             # Test data cho pets
│   └── users.json            # Test data cho users
├── utils/
│   ├── config.js             # Cấu hình chung
│   └── helpers.js            # Helper functions
├── results/
│   └── .gitkeep              # Thư mục chứa kết quả test
├── docs/
│   └── report.md             # Báo cáo chi tiết
├── .github/
│   └── workflows/
│       └── k6-ci.yml         # GitHub Actions workflow
└── README.md
```

**Deliverables:**
- [ ] Tạo cấu trúc thư mục
- [ ] File README.md mô tả project
- [ ] File .gitignore phù hợp

---

## PHASE 2: XÂY DỰNG TEST SCENARIOS CƠ BẢN
**Thời gian ước tính: 3-4 giờ**

### 4.3.1 Load Testing - Kiểm thử với tải thông thường
**Mục tiêu:**
- Kiểm tra hệ thống hoạt động như thế nào với tải bình thường
- Xác định baseline performance

**Kịch bản:**
```javascript
// load-test.js
export let options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 10 },   // Stay at 10 users
    { duration: '2m', target: 20 },   // Ramp up to 20 users
    { duration: '5m', target: 20 },   // Stay at 20 users
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
};
```

**Test cases:**
- GET /pet/{petId} - 50% traffic
- POST /pet - 30% traffic
- GET /store/inventory - 20% traffic

**Deliverables:**
- [ ] Script load-test.js
- [ ] Kết quả chạy test (metrics, screenshots)
- [ ] Phân tích kết quả trong báo cáo

---

### 4.3.2 Stress Testing - Kiểm thử với tải vượt ngưỡng
**Mục tiêu:**
- Tìm giới hạn của hệ thống
- Quan sát hành vi khi quá tải

**Kịch bản:**
```javascript
// stress-test.js
export let options = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp up
    { duration: '5m', target: 20 },   // Stay
    { duration: '2m', target: 50 },   // Increase
    { duration: '5m', target: 50 },   // Stay
    { duration: '2m', target: 100 },  // Push to limit
    { duration: '5m', target: 100 },  // Stay at limit
    { duration: '3m', target: 0 },    // Ramp down
  ],
};
```

**Deliverables:**
- [ ] Script stress-test.js
- [ ] Kết quả và breaking point
- [ ] Phân tích độ ổn định

---

### 4.3.3 Spike Testing - Kiểm thử với tải đột biến
**Mục tiêu:**
- Kiểm tra phản ứng của hệ thống với traffic đột ngột tăng
- Đánh giá khả năng auto-scaling

**Kịch bản:**
```javascript
// spike-test.js
export let options = {
  stages: [
    { duration: '1m', target: 10 },    // Normal load
    { duration: '30s', target: 200 },  // Spike!
    { duration: '3m', target: 200 },   // Stay high
    { duration: '1m', target: 10 },    // Back to normal
    { duration: '2m', target: 0 },     // Ramp down
  ],
};
```

**Deliverables:**
- [ ] Script spike-test.js
- [ ] Kết quả spike test
- [ ] Phân tích recovery time

---

## PHASE 3: CÁC TIÊU CHÍ VÀ METRICS
**Thời gian ước tính: 2-3 giờ**

### 4.4 Cấu hình Checks và Thresholds

#### 4.4.1 Định nghĩa tiêu chí thành công
**Checks cần implement:**
```javascript
check(response, {
  'status is 200': (r) => r.status === 200,
  'response time < 500ms': (r) => r.timings.duration < 500,
  'body contains expected data': (r) => r.json().hasOwnProperty('id'),
  'no error message': (r) => !r.json().hasOwnProperty('error'),
});
```

**Deliverables:**
- [ ] Danh sách checks cho từng endpoint
- [ ] Code mẫu trong scripts
- [ ] Giải thích trong báo cáo

---

#### 4.4.2 Thiết lập ngưỡng cảnh báo
**Thresholds cần thiết lập:**
```javascript
export let options = {
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.05'],     // Error rate < 5%
    'http_reqs': ['rate>50'],              // Throughput > 50 rps
    'checks': ['rate>0.95'],               // 95% checks pass
  },
};
```

**Deliverables:**
- [ ] Thresholds cho từng loại test
- [ ] Giải thích ý nghĩa từng threshold
- [ ] Ví dụ khi threshold fail

---

### 4.5 Thu thập và phân tích Metrics

#### 4.5.1 Built-in Metrics
**Metrics cần thu thập:**
- `http_req_duration` - Response time
- `http_req_failed` - Error rate
- `http_reqs` - Request rate (throughput)
- `vus` - Virtual users
- `iterations` - Số lần chạy script

**Deliverables:**
- [ ] Bảng mô tả các metrics
- [ ] Ví dụ kết quả metrics
- [ ] Cách đọc và phân tích

---

#### 4.5.2 Custom Metrics và Tags
**Custom metrics ví dụ:**
```javascript
import { Trend, Counter } from 'k6/metrics';

let petCreationTime = new Trend('pet_creation_duration');
let petCreationErrors = new Counter('pet_creation_errors');

// Sử dụng tags để phân loại
http.get('https://petstore.swagger.io/v2/pet/1', {
  tags: { endpoint: 'get_pet', critical: 'true' }
});
```

**Deliverables:**
- [ ] Custom metrics cho business logic
- [ ] Tag strategy
- [ ] Code examples

---

#### 4.5.3 Xuất kết quả sang các định dạng
**Output formats:**
```bash
# JSON output
k6 run --out json=results/load-test.json load-test.js

# HTML report
k6 run --out html=results/report.html load-test.js

# CSV output
k6 run --out csv=results/metrics.csv load-test.js

# Multiple outputs
k6 run --out json=results/test.json --out html=results/report.html load-test.js
```

**Deliverables:**
- [ ] Kết quả export ở nhiều định dạng
- [ ] Hướng dẫn đọc từng loại output
- [ ] Screenshots dashboard/reports

---

## PHASE 4: KỊCH BẢN KIỂM THỬ NÂNG CAO
**Thời gian ước tính: 3-4 giờ**

### 4.6.1 Authentication và Session handling
**Mục tiêu:**
- Test với API key authentication
- Quản lý session/token

**Ví dụ implementation:**
```javascript
export default function() {
  const params = {
    headers: {
      'api_key': 'special-key',  // Petstore API key
      'Content-Type': 'application/json',
    },
  };

  let response = http.get(`${BASE_URL}/pet/1`, params);
  check(response, { 'authenticated': (r) => r.status === 200 });
}
```

**Deliverables:**
- [ ] Script auth-test.js
- [ ] Test với và không có auth
- [ ] Phân tích kết quả

---

### 4.6.2 Parameterization và Data-driven testing
**Mục tiêu:**
- Sử dụng data từ file JSON
- Random/dynamic data generation

**Implementation:**
```javascript
import { SharedArray } from 'k6/data';

const pets = new SharedArray('pets', function() {
  return JSON.parse(open('./data/pets.json')).pets;
});

export default function() {
  const pet = pets[Math.floor(Math.random() * pets.length)];

  let response = http.post(`${BASE_URL}/pet`, JSON.stringify(pet), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

**Deliverables:**
- [ ] File data/pets.json với test data
- [ ] Script data-driven.js
- [ ] Kết quả với nhiều scenarios

---

### 4.6.3 Test API workflows phức tạp
**Mục tiêu:**
- Test chuỗi API calls liên tiếp
- Simulate user journey

**Workflow ví dụ:**
```javascript
export default function() {
  // 1. Create new pet
  let newPet = { id: randomId(), name: 'Doggo', status: 'available' };
  let createRes = http.post(`${BASE_URL}/pet`, JSON.stringify(newPet));

  // 2. Get the created pet
  let petId = createRes.json().id;
  let getRes = http.get(`${BASE_URL}/pet/${petId}`);

  // 3. Update pet status
  newPet.status = 'sold';
  let updateRes = http.put(`${BASE_URL}/pet`, JSON.stringify(newPet));

  // 4. Delete pet
  let deleteRes = http.del(`${BASE_URL}/pet/${petId}`);

  // Verify workflow
  check(deleteRes, { 'workflow completed': (r) => r.status === 200 });
}
```

**Deliverables:**
- [ ] Script workflow-test.js
- [ ] Ít nhất 2-3 workflows khác nhau
- [ ] Phân tích end-to-end performance

---

## PHASE 5: TỰ ĐỘNG HÓA VÀ MONITORING
**Thời gian ước tính: 2-3 giờ**
---

### 4.8 Monitoring và Alerting

#### 4.8.1 Kết nối K6 với Grafana/Prometheus
**Mục tiêu:**
- Real-time monitoring
- Historical data analysis

**Options:**
```bash
# K6 Cloud (easiest)
k6 cloud run load-test.js

# InfluxDB + Grafana
k6 run --out influxdb=http://localhost:8086/k6 load-test.js

# Prometheus Remote Write
k6 run --out experimental-prometheus-rw load-test.js
```

**Deliverables:**
- [ ] Setup InfluxDB hoặc K6 Cloud
- [ ] Kết quả real-time monitoring
- [ ] Screenshots dashboards

---

#### 4.8.2 Thiết lập dashboard và cảnh báo
**Mục tiêu:**
- Dashboard trực quan
- Alerts khi vượt threshold

**Dashboard components:**
- Response time trends
- Error rate graph
- Throughput chart
- Virtual users over time
- Top slowest endpoints

**Deliverables:**
- [ ] Grafana dashboard JSON
- [ ] Screenshots dashboard
- [ ] Alert rules configuration

---

## TIMELINE TỔNG THỂ

| Phase | Thời gian | Mục | Trạng thái |
|-------|-----------|-----|------------|
| Phase 1 | 1-2 giờ | 4.1 - 4.2 | ⬜ Pending |
| Phase 2 | 3-4 giờ | 4.3 | ⬜ Pending |
| Phase 3 | 2-3 giờ | 4.4 - 4.5 | ⬜ Pending |
| Phase 4 | 3-4 giờ | 4.6 | ⬜ Pending |
| Phase 5 | 2-3 giờ | 4.7 - 4.8 | ⬜ Pending |

**Tổng thời gian ước tính: 11-16 giờ**

---

## CHECKLIST HOÀN THÀNH

### Documentation
- [ ] Tài liệu tổng quan dự án
- [ ] Hướng dẫn cài đặt chi tiết
- [ ] README.md đầy đủ
- [ ] Báo cáo kết quả chi tiết

### Code & Scripts
- [ ] load-test.js
- [ ] stress-test.js
- [ ] spike-test.js
- [ ] auth-test.js
- [ ] data-driven.js
- [ ] workflow-test.js
- [ ] Test data files (JSON)
- [ ] Helper utilities

### Results & Analysis
- [ ] Kết quả 3 loại test cơ bản
- [ ] Metrics analysis
- [ ] Performance reports (JSON/HTML)
- [ ] Screenshots dashboards

### Monitoring
- [ ] Monitoring setup
- [ ] Dashboard configuration
- [ ] Alert rules

### Báo cáo cuối cùng
- [ ] Đầy đủ 11 mục (4.1 - 4.8.2)
- [ ] Code examples rõ ràng
- [ ] Screenshots minh họa
- [ ] Kết luận và khuyến nghị

---

## GHI CHÚ

**API Endpoints sử dụng:**
- Base URL: https://petstore.swagger.io/v2
- API Key: `special-key` (demo key)
- Swagger UI: https://petstore.swagger.io/

**Best Practices:**
- Luôn sử dụng checks để validate responses
- Set reasonable thresholds
- Organize code theo modules
- Comment code đầy đủ
- Version control tất cả scripts
- Document tất cả findings

**Lưu ý khi test:**
- Petstore là demo API, có rate limiting
- Không spam quá nhiều requests
- Test từ từ, tăng dần load
- Lưu kết quả mỗi lần chạy
