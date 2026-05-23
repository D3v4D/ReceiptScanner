package com.d3v4d.receiptscanner.dto.response

import java.math.BigDecimal

data class ReceiptResponseDTO(
    val id: Long,
    val sourceScanId: Long?,
    val storeName: String,
    val storeAddress: String,
    val storeTaxNumber: String,
    val storeChain: String,
    val purchaseDateTime: String,
    val total: BigDecimal,
    val paymentMethod: String,
    val currency: String,
    val lines: List<ReceiptLineResponseDTO>,
)
