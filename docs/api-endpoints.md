# Petstore API Endpoints - Chi tiết

## Tổng quan

**Base URL**: `https://petstore.swagger.io/v2`
**API Key**: `special-key`
**Swagger UI**: https://petstore.swagger.io/

## Endpoints chính được test

### 1. Pet Operations

#### GET /pet/{petId}
- **Mục đích**: Lấy thông tin chi tiết của một pet
- **Method**: GET
- **Path**: `/pet/{petId}`
- **Parameters**:
  - `petId` (path, required): ID của pet
- **Response**: 200 OK
- **Use case**: Chiếm 50% traffic trong load test

#### POST /pet
- **Mục đích**: Tạo pet mới
- **Method**: POST
- **Path**: `/pet`
- **Body**: Pet object
- **Response**: 200 OK
- **Use case**: Chiếm 30% traffic trong load test

#### PUT /pet
- **Mục đích**: Cập nhật thông tin pet
- **Method**: PUT
- **Path**: `/pet`
- **Body**: Pet object (phải có ID)
- **Response**: 200 OK
- **Use case**: Test trong workflow scenarios

#### DELETE /pet/{petId}
- **Mục đích**: Xóa pet
- **Method**: DELETE
- **Path**: `/pet/{petId}`
- **Parameters**:
  - `petId` (path, required): ID của pet
- **Response**: 200 OK
- **Use case**: Test trong workflow scenarios

### 2. Store Operations

#### GET /store/inventory
- **Mục đích**: Lấy thông tin inventory
- **Method**: GET
- **Path**: `/store/inventory`
- **Response**: 200 OK
- **Use case**: Chiếm 20% traffic trong load test

#### POST /store/order
- **Mục đích**: Tạo order mới
- **Method**: POST
- **Path**: `/store/order`
- **Body**: Order object
- **Response**: 200 OK
- **Use case**: Test trong advanced scenarios

### 3. User Operations

#### GET /user/{username}
- **Mục đích**: Lấy thông tin user
- **Method**: GET
- **Path**: `/user/{username}`
- **Parameters**:
  - `username` (path, required): Username
- **Response**: 200 OK
- **Use case**: Test authentication scenarios

## Pet Object Structure

```json
{
  "id": 10001,
  "name": "Buddy",
  "status": "available",
  "category": {
    "id": 1,
    "name": "Dogs"
  },
  "photoUrls": ["https://example.com/photo.jpg"],
  "tags": [
    {
      "id": 1,
      "name": "friendly"
    }
  ]
}
```

## Mục tiêu kiểm thử

### Response Time
- **p50**: < 200ms
- **p95**: < 500ms
- **p99**: < 1000ms

### Throughput
- **Minimum**: 10 requests/second
- **Target**: 50 requests/second
- **Maximum**: 100+ requests/second

### Error Rate
- **Maximum**: 5%
- **Target**: < 1%

### Availability
- **Target**: 99.9% uptime during tests
