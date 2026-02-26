package com.d3v4d.receiptscanner.dto.request

data class ReceiptRequestDTO (
    val storeName: String,
    val storeAddress: String,
    val purchaseDateTime: String,
    val currency: String,
    val lines: List<ReceiptLineRequestDTO>,

    //TODO: make this safe
    val userId: Long,
)