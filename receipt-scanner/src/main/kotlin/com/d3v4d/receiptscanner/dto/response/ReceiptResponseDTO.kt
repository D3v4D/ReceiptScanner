package com.d3v4d.receiptscanner.dto.response

data class ReceiptResponseDTO(
    val id: Long,
    val sourceScanId: Long?,
    val storeName: String,
    val purchaseDateTime: String,
    val currency: String,
    val lines: List<ReceiptLineResponseDTO>,
)
