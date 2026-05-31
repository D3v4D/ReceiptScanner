classDiagram
    class UserEntity {
        Long id
        String username
        String email
        String password
    }

    class CategoryEntity {
        Long id
        String name
        String description
    }

    class ReceiptEntity {
        Long id
        Instant purchaseDateTime
        String currency
        BigDecimal total
        String paymentMethod
    }

    class ReceiptItemEntity {
        Long id
        String name
        BigDecimal quantity
        String unit
        BigDecimal unitPrice
        BigDecimal totalPrice
    }

    class StoreEntity {
        Long id
        String name
        String address
        String taxNumber
        String storeChain
    }

    class ReceiptImageEntity {
        Long id
        String contentType
        String fileName
        Long sizeBytes
        String sha256
        ByteArray imageData
        Instant createdAt
    }

    class ReceiptScanEntity {
        Long id
        String status
        String rawProviderResponse
        String normalizedPayload
        String ocrText
        String llmMeta
        int failedAttempts
        String errorMessage
        Instant createdAt
        Instant finalizedAt
    }

    class ReceiptScanStatus {
        <<enumeration>>
        DRAFT
        FINALIZED
        FAILED
    }

    %% Associations / relationships
    ReceiptEntity "1" -- "*" ReceiptItemEntity : lines
    ReceiptItemEntity --> ReceiptEntity : receipt
    ReceiptItemEntity --> CategoryEntity : category

    CategoryEntity --> UserEntity : user
    ReceiptEntity --> UserEntity : user
    ReceiptEntity --> StoreEntity : store

    ReceiptEntity "1" -- "0..1" ReceiptScanEntity : sourceScan
    ReceiptScanEntity "0..1" -- "1" ReceiptEntity : receipt

    ReceiptScanEntity --> ReceiptImageEntity : image
    ReceiptImageEntity --> UserEntity : user
    ReceiptScanEntity --> UserEntity : user

    ReceiptScanEntity --> ReceiptScanStatus : status